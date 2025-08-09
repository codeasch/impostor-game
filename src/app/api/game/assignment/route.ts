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
    const { player_id, room_code } = payload;

    // Get current round for the room
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('current_round')
      .eq('code', room_code)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Get the current round
    const { data: round, error: roundError } = await supabaseAdmin
      .from('rounds')
      .select('*')
      .eq('room_code', room_code)
      .eq('round_number', room.current_round)
      .single();

    if (roundError || !round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    // Get player's assignment
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from('assignments')
      .select('*')
      .eq('round_id', round.id)
      .eq('player_id', player_id)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    return NextResponse.json({
      role: assignment.role,
      word_shown: assignment.word_shown,
      round_id: round.id,
      mode: round.mode, // Include game mode for DECEPTION handling
    });
  } catch (error) {
    console.error('Error getting assignment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
