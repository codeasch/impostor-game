import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

export async function POST(request: NextRequest) {
  console.log('Vote API called');
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      console.log('No token provided');
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const payload = jwt.verify(token, JWT_SECRET) as any;
    const { player_id, room_code } = payload;
    
    const body = await request.json();
    const { accused_player_id } = body;

    if (!accused_player_id) {
      return NextResponse.json({ error: 'No accused player provided' }, { status: 400 });
    }

    console.log(`Vote: Player ${player_id} voting for ${accused_player_id} in room ${room_code}`);

    // Get current room and round
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('*, rounds(*)')
      .eq('code', room_code)
      .single();

    if (roomError) {
      console.error('Database error:', roomError);
      return NextResponse.json({ error: 'Database error', details: roomError.message }, { status: 500 });
    }

    if (!room) {
      console.log('Room not found');
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.status !== 'VOTE') {
      return NextResponse.json({ error: 'Room is not in voting phase' }, { status: 400 });
    }

    // Get current round
    const currentRound = room.rounds?.find((r: any) => r.round_number === room.current_round);
    if (!currentRound) {
      return NextResponse.json({ error: 'No active round found' }, { status: 404 });
    }

    // Insert or update vote (upsert)
    const { error: voteError } = await supabaseAdmin
      .from('votes')
      .upsert({
        round_id: currentRound.id,
        voter_id: player_id,
        accused_player_id: accused_player_id
      }, {
        onConflict: 'round_id,voter_id'
      });

    if (voteError) {
      console.error('Error inserting vote:', voteError);
      return NextResponse.json({ error: 'Failed to submit vote' }, { status: 500 });
    }

    // Get current vote counts
    const { data: votes, error: votesError } = await supabaseAdmin
      .from('votes')
      .select('accused_player_id, players!votes_accused_player_id_fkey(name)')
      .eq('round_id', currentRound.id);

    if (votesError) {
      console.error('Error getting votes:', votesError);
    }

    // Count votes per player
    const voteCounts: { [key: string]: { count: number; name: string } } = {};
    votes?.forEach((vote: any) => {
      const playerId = vote.accused_player_id;
      const playerName = vote.players?.name || 'Unknown';
      voteCounts[playerId] = voteCounts[playerId] || { count: 0, name: playerName };
      voteCounts[playerId].count++;
    });

    // Get connected players to check if all have voted
    const { data: players, error: playersError } = await supabaseAdmin
      .from('players')
      .select('id')
      .eq('room_code', room_code)
      .eq('connected', true);

    if (playersError) {
      console.error('Error getting players:', playersError);
    }

    const totalPlayers = players?.length || 0;
    const totalVotes = votes?.length || 0;
    const allVoted = totalVotes >= totalPlayers && totalPlayers > 0;

    console.log(`Vote submitted. Current votes: ${totalVotes}/${totalPlayers}`, voteCounts);

    // Auto-advance to results if all players have voted
    if (allVoted) {
      console.log('🎉 All players have voted! Auto-advancing to results...');
      const { error: advanceError } = await supabaseAdmin
        .from('rooms')
        .update({ status: 'REVEAL_RESULT' })
        .eq('code', room_code);

      if (advanceError) {
        console.error('Error advancing to results:', advanceError);
      } else {
        console.log(`Room ${room_code} auto-advanced to REVEAL_RESULT`);
      }
    }

    return NextResponse.json({ 
      success: true,
      voteCounts,
      totalVotes,
      allVoted
    });
  } catch (error) {
    console.error('Error submitting vote:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
