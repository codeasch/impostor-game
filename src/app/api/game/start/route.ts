import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { shuffleArray } from '@/lib/utils';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

interface GameSettings {
  pack: string;
  mode: 'BLANK' | 'DECEPTION';
  timer_seconds?: number;
  impostor_count: number;
  clue_rounds: number;
}

function normalizeWord(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.toLowerCase();
}

function loadWordPack(packId: string): any {
  try {
    if (packId === 'random') {
      // Aggregate all packs
      const indexPath = path.join(process.cwd(), 'public', 'packs', 'index.json');
      const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8')) as Array<{ id: string }>;
      const uniqueWordsSet = new Set<string>();
      const aggregated: string[] = [];
      for (const meta of indexData) {
        if (!meta?.id || meta.id === 'random') continue;
        try {
          const pPath = path.join(process.cwd(), 'public', 'packs', `${meta.id}.json`);
          const pRaw = JSON.parse(fs.readFileSync(pPath, 'utf8'));
          for (const w of pRaw.words || []) {
            const normalized = normalizeWord(w);
            if (normalized && !uniqueWordsSet.has(normalized)) {
              uniqueWordsSet.add(normalized);
              aggregated.push(normalized);
            }
          }
        } catch {}
      }
      return { name: 'Random', description: 'All packs mixed', words: aggregated, close_pairs: {} };
    } else {
      const packPath = path.join(process.cwd(), 'public', 'packs', `${packId}.json`);
      const packData = fs.readFileSync(packPath, 'utf8');
      const rawPack = JSON.parse(packData);
      // Deduplicate and sanitize words server-side
      const uniqueWordsSet = new Set<string>();
      const sanitizedWords: string[] = [];
      for (const w of rawPack.words || []) {
        const normalized = normalizeWord(w);
        if (normalized && !uniqueWordsSet.has(normalized)) {
          uniqueWordsSet.add(normalized);
          sanitizedWords.push(normalized);
        }
      }
      return {
        ...rawPack,
        words: sanitizedWords,
      };
    }
  } catch (error) {
    console.error('Error loading word pack:', error);
    // Fallback to basic words
    return {
      words: ['apple', 'car', 'book', 'chair', 'dog'],
      close_pairs: {}
    };
  }
}

function getCloseWord(crewWord: string, pack: any, usedCloseWords?: Set<string>): string {
  // Try to get from close_pairs first
  if (pack.close_pairs && pack.close_pairs[crewWord]) {
    const closePairs = pack.close_pairs[crewWord];
    
    // If we have tracking of used close words, try to avoid repeats
    if (usedCloseWords && usedCloseWords.size > 0) {
      const unusedClosePairs = closePairs.filter((word: string) => !usedCloseWords.has(word));
      if (unusedClosePairs.length > 0) {
        return unusedClosePairs[Math.floor(Math.random() * unusedClosePairs.length)];
      }
    }
    
    return closePairs[Math.floor(Math.random() * closePairs.length)];
  }
  
  // Fallback: pick a random different word
  const otherWords = pack.words.filter((w: string) => w !== crewWord);
  return otherWords[Math.floor(Math.random() * otherWords.length)];
}

function selectOptimalWord(pack: any, usedWords: Set<string>, lastCrewWord: string | null): string {
  const availableWords = pack.words;
  
  // If we have enough words, prioritize unused ones
  if (availableWords.length > usedWords.size) {
    // Get all unused words
    const unusedWords = availableWords.filter((word: string) => !usedWords.has(word));
    
    // If we have unused words, pick from them (avoiding last word if possible)
    if (unusedWords.length > 0) {
      if (lastCrewWord && unusedWords.length > 1) {
        // Filter out the last word if possible
        const filteredUnused = unusedWords.filter((word: string) => word !== lastCrewWord);
      if (filteredUnused.length > 0) {
          return filteredUnused[Math.floor(Math.random() * filteredUnused.length)];
        }
      }
      // Fall back to any unused word
      return unusedWords[Math.floor(Math.random() * unusedWords.length)];
    }
  }
  
  // If all words have been used, implement smart rotation
  if (usedWords.size > 0) {
    // Create a rotation system that ensures maximum variety
    const usedWordsArray = Array.from(usedWords);
    
    // If we have many used words, try to find one that hasn't been used recently
    if (usedWordsArray.length >= 3) {
      // Shuffle and find a word that's different from the last one
      const shuffledUsed = shuffleArray([...usedWordsArray]);
      
      for (const word of shuffledUsed) {
        if (word !== lastCrewWord) {
          return word;
        }
      }
    }
    
    // If we can't avoid the last word or have few words, pick any random word
    // but ensure it's different from the last one if possible
    if (lastCrewWord && availableWords.length > 1) {
      const differentWords = availableWords.filter((word: string) => word !== lastCrewWord);
      if (differentWords.length > 0) {
        return differentWords[Math.floor(Math.random() * differentWords.length)];
      }
    }
    
    return availableWords[Math.floor(Math.random() * availableWords.length)];
  }
  
  // Fallback: pick any random word
  return availableWords[Math.floor(Math.random() * availableWords.length)];
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

    // Load word pack (deduped/sanitized)
    const pack = loadWordPack(settings.pack);

    // Fetch all previous rounds to track used words
    let usedWords = new Set<string>();
    let usedCloseWords = new Set<string>();
    let lastCrewWord: string | null = null;
    
    if (room.current_round && room.current_round > 0) {
      // Get ALL previous rounds for this room to ensure we don't repeat words
      const { data: previousRounds } = await supabaseAdmin
        .from('rounds')
        .select('id, crew_word, round_number')
        .eq('room_code', room_code)
        .eq('pack', settings.pack) // Only consider rounds with the same pack
        .order('round_number', { ascending: false });
      
      if (previousRounds && previousRounds.length > 0) {
        // Get the last round's word
        lastCrewWord = previousRounds[0]?.crew_word ? String(previousRounds[0].crew_word).toLowerCase() : null;
        
        // Track all used words from this pack
        for (const round of previousRounds) {
          if (round.crew_word) {
            usedWords.add(String(round.crew_word).toLowerCase());
          }
        }
      }
      
      // Also track used close words for DECEPTION mode
      if (settings.mode === 'DECEPTION') {
        const { data: previousAssignments } = await supabaseAdmin
          .from('assignments')
          .select('word_shown')
          .eq('role', 'IMPOSTOR')
          .in('round_id', previousRounds?.map(r => r.id) || []);
        
        if (previousAssignments) {
          for (const assignment of previousAssignments) {
            if (assignment.word_shown && assignment.word_shown !== '?') {
              usedCloseWords.add(String(assignment.word_shown).toLowerCase());
            }
          }
        }
      }
    }

    // Pick a word using the improved selection logic
    const crewWord = selectOptimalWord(pack, usedWords, lastCrewWord);
    const impostorWord = settings.mode === 'DECEPTION' 
      ? getCloseWord(crewWord, pack, usedCloseWords)
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
