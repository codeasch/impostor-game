import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { shuffleArray, pickWeightedRandom, createRotationWeights } from '@/lib/utils';
import jwt from 'jsonwebtoken';

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

async function loadWordPack(packId: string): Promise<any> {
  try {
    const fs = await import('fs');
    const path = await import('path');
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

function getCloseWord(crewWord: string, pack: any, usedCloseWords: Set<string>): string {
  // Try to get from close_pairs first
  if (pack.close_pairs && pack.close_pairs[crewWord]) {
    const closePairs = pack.close_pairs[crewWord];
    
    // Create weights for close pairs based on usage history
    const closeWeights = closePairs.map((word: string) => 
      usedCloseWords.has(word) ? 1 : 3 // Unused close words get higher weight
    );
    
    // Use weighted selection to avoid repetition
    return pickWeightedRandom(closePairs, closeWeights);
  }
  
  // Fallback: pick a random different word with weighted selection
  const otherWords = pack.words.filter((w: string) => w !== crewWord);
  const otherWeights = otherWords.map((word: string) => 
    usedCloseWords.has(word) ? 1 : 2 // Unused words get higher weight
  );
  
  return pickWeightedRandom(otherWords, otherWeights);
}

function selectOptimalWord(pack: any, usedWords: Set<string>, lastCrewWord: string | null, recentWords: string[]): string {
  const availableWords = pack.words;
  
  // Create weights for all words based on usage history
  const weights = createRotationWeights(availableWords, usedWords, recentWords);
  
  // If we have enough words, prioritize unused ones
  if (availableWords.length > usedWords.size) {
    // Get all unused words
    const unusedWords = availableWords.filter((word: string) => !usedWords.has(word));
    
    // If we have unused words, pick from them (avoiding recent words if possible)
    if (unusedWords.length > 0) {
      // Filter out recent words to avoid immediate repetition
      const filteredUnused = unusedWords.filter((word: string) => !recentWords.includes(word));
      if (filteredUnused.length > 0) {
        // Use weighted selection from filtered unused words
        const filteredWeights = weights.filter((_, index) => filteredUnused.includes(availableWords[index]));
        return pickWeightedRandom(filteredUnused, filteredWeights);
      }
      // If all unused words are recent, fall back to weighted selection from unused
      const unusedWeights = weights.filter((_, index) => unusedWords.includes(availableWords[index]));
      return pickWeightedRandom(unusedWords, unusedWeights);
    }
  }
  
  // If all words have been used, use weighted selection for smart rotation
  if (usedWords.size > 0) {
    // Create a rotation pool that excludes recent words
    const rotationPool = Array.from(usedWords).filter((word: string) => !recentWords.includes(word));
    
    if (rotationPool.length > 0) {
      // Use weighted selection from rotation pool
      const rotationWeights = weights.filter((_, index) => rotationPool.includes(availableWords[index]));
      return pickWeightedRandom(rotationPool, rotationWeights);
    }
    
    // If all words are recent, use weighted selection from all words
    // This ensures even distribution over time
    return pickWeightedRandom(availableWords, weights);
  }
  
  // Fallback: use weighted selection from all words
  return pickWeightedRandom(availableWords, weights);
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
    const pack = await loadWordPack(settings.pack);

    // Fetch all previous rounds to track used words
    let usedWords = new Set<string>();
    let usedCloseWords = new Set<string>();
    let lastCrewWord: string | null = null;
    let recentWords: string[] = [];
    
    if (room.current_round && room.current_round > 0) {
      const { data: previousRounds } = await supabaseAdmin
        .from('rounds')
        .select('crew_word, pack, mode')
        .eq('room_code', room_code)
        .order('round_number', { ascending: false })
        .limit(20); // Track last 20 rounds for better rotation
      
      if (previousRounds && previousRounds.length > 0) {
        // Get the last round's word
        lastCrewWord = previousRounds[0]?.crew_word ? String(previousRounds[0].crew_word).toLowerCase() : null;
        
        // Track all used words and close words
        for (const round of previousRounds) {
          if (round.crew_word) {
            const crewWord = String(round.crew_word).toLowerCase();
            usedWords.add(crewWord);
            
            // If it was a deception mode, also track the close word that was used
            if (round.mode === 'DECEPTION' && round.pack) {
              try {
                const roundPack = await loadWordPack(round.pack);
                if (roundPack.close_pairs && roundPack.close_pairs[crewWord]) {
                  // Find which close word was likely used (we'll track all possibilities)
                  const closePairs = roundPack.close_pairs[crewWord];
                  closePairs.forEach((closeWord: string) => usedCloseWords.add(closeWord.toLowerCase()));
                }
              } catch (error) {
                // Ignore errors loading old packs
              }
            }
          }
        }
        
        // Create recent words array for better rotation (last 10 rounds)
        recentWords = previousRounds.slice(0, 10)
          .map(round => round.crew_word ? String(round.crew_word).toLowerCase() : '')
          .filter(word => word !== '');
      }
    }

    // Pick a word using the improved selection logic
    const crewWord = selectOptimalWord(pack, usedWords, lastCrewWord, recentWords);
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
