import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

export async function POST(request: NextRequest) {
  console.log('Play Again API called');
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      console.log('No token provided');
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const payload = jwt.verify(token, JWT_SECRET) as any;
    const { room_code, is_host } = payload;

    if (!is_host) {
      return NextResponse.json({ error: 'Only host can start new game' }, { status: 403 });
    }

    console.log(`Play Again: Host starting new game in room ${room_code}`);

    // Get current room
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('*')
      .eq('code', room_code)
      .single();

    if (roomError || !room) {
      console.error('Room error:', roomError);
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.status !== 'REVEAL_RESULT') {
      return NextResponse.json({ error: 'Room is not in results phase' }, { status: 400 });
    }

    // Reset room to lobby and clear ready players
    const { error: updateError } = await supabaseAdmin
      .from('rooms')
      .update({ 
        status: 'LOBBY',
        ready_players: [] // Clear ready players for new game
      })
      .eq('code', room_code);

    if (updateError) {
      console.error('Error updating room status:', updateError);
      return NextResponse.json({ error: 'Failed to restart game' }, { status: 500 });
    }

    // Optional: Clean up old game data (votes, assignments)
    // Get the current round to clean up
    const { data: currentRound } = await supabaseAdmin
      .from('rounds')
      .select('id')
      .eq('room_code', room_code)
      .eq('round_number', room.current_round)
      .single();

    if (currentRound) {
      // Delete old votes
      await supabaseAdmin
        .from('votes')
        .delete()
        .eq('round_id', currentRound.id);

      // Delete old assignments
      await supabaseAdmin
        .from('assignments')
        .delete()
        .eq('round_id', currentRound.id);

      console.log(`Cleaned up old game data for round ${currentRound.id}`);
    }

    console.log(`Room ${room_code} reset to LOBBY for new game`);
    return NextResponse.json({ 
      success: true, 
      newStatus: 'LOBBY',
      message: 'New game started! Previous settings are preserved.'
    });
  } catch (error) {
    console.error('Error starting new game:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
