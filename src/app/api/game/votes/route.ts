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

    // Get current room and round
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('*, rounds(*)')
      .eq('code', room_code)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Get current round
    const currentRound = room.rounds?.find((r: any) => r.round_number === room.current_round);
    if (!currentRound) {
      return NextResponse.json({ 
        voteCounts: {},
        totalVotes: 0
      });
    }

    // Get current votes
    const { data: votes, error: votesError } = await supabaseAdmin
      .from('votes')
      .select('accused_player_id, players!votes_accused_player_id_fkey(name)')
      .eq('round_id', currentRound.id);

    if (votesError) {
      console.error('Error getting votes:', votesError);
      return NextResponse.json({ error: 'Failed to get votes' }, { status: 500 });
    }

    // Count votes per player
    const voteCounts: { [key: string]: { count: number; name: string } } = {};
    votes?.forEach((vote: any) => {
      const playerId = vote.accused_player_id;
      const playerName = vote.players?.name || 'Unknown';
      voteCounts[playerId] = voteCounts[playerId] || { count: 0, name: playerName };
      voteCounts[playerId].count++;
    });

    return NextResponse.json({ 
      voteCounts,
      totalVotes: votes?.length || 0
    });
  } catch (error) {
    console.error('Error fetching votes:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
