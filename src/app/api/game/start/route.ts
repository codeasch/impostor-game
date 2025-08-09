import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { pickRandomItems, shuffleArray } from '@/lib/utils';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

interface GameSettings {
  pack: string;
  mode: 'BLANK' | 'DECEPTION';
  timer_seconds?: number;
  impostor_count: number;
  clue_rounds: number;
}

async function loadWordPack(packId: string): Promise<any> {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const packPath = path.join(process.cwd(), 'public', 'packs', `${packId}.json`);
    const packData = fs.readFileSync(packPath, 'utf8');
    return JSON.parse(packData);
  } catch (error) {
    console.error('Error loading word pack:', error);
    // Fallback to basic words
    return {
      words: ['apple', 'car', 'book', 'chair', 'dog'],
      close_pairs: {}
    };
  }
}

function getCloseWord(crewWord: string, pack: any): string {
  // Try to get from close_pairs first
  if (pack.close_pairs && pack.close_pairs[crewWord]) {
    const closePairs = pack.close_pairs[crewWord];
    return closePairs[Math.floor(Math.random() * closePairs.length)];
  }
  
  // Fallback: pick a random different word
  const otherWords = pack.words.filter((w: string) => w !== crewWord);
  return otherWords[Math.floor(Math.random() * otherWords.length)];
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const payload = jwt.verify(token, JWT_SECRET) as any;
    const { player_id, room_code, is_host } = payload;

    if (!is_host) {
      return NextResponse.json({ error: 'Only host can start game' }, { status: 403 });
    }

    const settings: GameSettings = await request.json();

    // Validate settings and enforce fixed values
    if (!settings.pack || !settings.mode) {
      return NextResponse.json({ error: 'Invalid settings' }, { status: 400 });
    }
    
    // Force fixed values
    settings.impostor_count = 1;
    settings.clue_rounds = 1;

    // Get room and players
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('*')
      .eq('code', room_code)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const { data: players, error: playersError } = await supabaseAdmin
      .from('players')
      .select('*')
      .eq('room_code', room_code)
      .eq('connected', true);

    if (playersError || !players || players.length < 3) {
      return NextResponse.json({ error: 'Need at least 3 players' }, { status: 400 });
    }

    if (settings.impostor_count >= players.length) {
      return NextResponse.json({ error: 'Too many impostors for player count' }, { status: 400 });
    }

    // Load word pack
    const pack = await loadWordPack(settings.pack);
    const crewWord = pack.words[Math.floor(Math.random() * pack.words.length)];
    const impostorWord = settings.mode === 'DECEPTION' 
      ? getCloseWord(crewWord, pack) 
      : '?';

    // Create round
    const { data: round, error: roundError } = await supabaseAdmin
      .from('rounds')
      .insert({
        room_code,
        round_number: room.current_round + 1,
        pack: settings.pack,
        mode: settings.mode,
        impostor_count: settings.impostor_count,
        clue_rounds: settings.clue_rounds,
        timer_seconds: settings.timer_seconds,
        crew_word: crewWord,
      })
      .select()
      .single();

    if (roundError) {
      console.error('Error creating round:', roundError);
      return NextResponse.json({ error: 'Failed to create round' }, { status: 500 });
    }

    // Assign roles
    const shuffledPlayers = shuffleArray(players);
    const impostors = shuffledPlayers.slice(0, settings.impostor_count);
    const crewMembers = shuffledPlayers.slice(settings.impostor_count);

    const assignments = [
      ...impostors.map(player => ({
        round_id: round.id,
        player_id: player.id,
        role: 'IMPOSTOR',
        word_shown: impostorWord,
      })),
      ...crewMembers.map(player => ({
        round_id: round.id,
        player_id: player.id,
        role: 'INNOCENT',
        word_shown: crewWord,
      })),
    ];

    const { error: assignmentError } = await supabaseAdmin
      .from('assignments')
      .insert(assignments);

    if (assignmentError) {
      console.error('Error creating assignments:', assignmentError);
      return NextResponse.json({ error: 'Failed to assign roles' }, { status: 500 });
    }

    // Update room status
    const { error: updateError } = await supabaseAdmin
      .from('rooms')
      .update({ 
        status: 'REVEAL',
        current_round: room.current_round + 1 
      })
      .eq('code', room_code);

    if (updateError) {
      console.error('Error updating room status:', updateError);
      return NextResponse.json({ error: 'Failed to update room status' }, { status: 500 });
    }

    console.log(`Game started for room ${room_code}, round ${room.current_round + 1}`);
    return NextResponse.json({ success: true, roundId: round.id });
  } catch (error) {
    console.error('Error starting game:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
