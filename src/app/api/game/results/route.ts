import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const payload = jwt.verify(token, JWT_SECRET) as any;
    const { room_code } = payload;

    // Get current room first
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('current_round')
      .eq('code', room_code)
      .single();

    if (roomError || !room) {
      console.error('Room error:', roomError);
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Get current round with assignments
    const { data: roundData, error: roundError } = await supabaseAdmin
      .from('rounds')
      .select(`
        id,
        crew_word,
        assignments(
          player_id,
          role,
          players(id, name)
        )
      `)
      .eq('room_code', room_code)
      .eq('round_number', room.current_round)
      .single();

    if (roundError || !roundData) {
      console.error('Round error:', roundError);
      return NextResponse.json({ error: 'No current round found' }, { status: 404 });
    }

    const currentRound = roundData;

    // Get votes for this round
    const { data: votes, error: votesError } = await supabaseAdmin
      .from('votes')
      .select('accused_player_id, players!votes_accused_player_id_fkey(id, name)')
      .eq('round_id', currentRound.id);

    if (votesError) {
      console.error('Votes error:', votesError);
      return NextResponse.json({ error: 'Failed to get votes' }, { status: 500 });
    }

    // Process results
    const assignments = currentRound.assignments || [];
    const impostorIds = assignments
      .filter((a: any) => a.role === 'IMPOSTOR')
      .map((a: any) => a.player_id);

    // Count votes per player
    const voteCounts: { [key: string]: { count: number; name: string } } = {};
    votes?.forEach((vote: any) => {
      const playerId = vote.accused_player_id;
      const playerName = vote.players?.name || 'Unknown';
      voteCounts[playerId] = voteCounts[playerId] || { count: 0, name: playerName };
      voteCounts[playerId].count++;
    });

    // Find most voted player
    let mostVotedPlayer = null;
    let maxVotes = 0;
    let tiedPlayers = 0;

    Object.entries(voteCounts).forEach(([playerId, data]) => {
      if (data.count > maxVotes) {
        maxVotes = data.count;
        mostVotedPlayer = { id: playerId, name: data.name, votes: data.count };
        tiedPlayers = 1;
      } else if (data.count === maxVotes && maxVotes > 0) {
        tiedPlayers++;
        if (tiedPlayers > 1) {
          mostVotedPlayer = null; // Tie - no elimination
        }
      }
    });

    // Determine winner
    let win: 'INNOCENT' | 'IMPOSTOR' = 'INNOCENT';
    
    if (mostVotedPlayer && impostorIds.includes(mostVotedPlayer.id)) {
      // Impostor was voted out - innocent wins
      win = 'INNOCENT';
    } else {
      // Innocent was voted out or tie - impostor wins
      win = 'IMPOSTOR';
    }

    const result = {
      impostorIds,
      crewWord: currentRound.crew_word,
      win,
      voteCounts,
      mostVotedPlayer
    };

    console.log('Game results calculated:', result);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error calculating results:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
