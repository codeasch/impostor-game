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

    // Get current room and round - lightweight query
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('current_round')
      .eq('code', room_code)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ totalVotes: 0 });
    }

    // Get current round ID only
    const { data: rounds, error: roundError } = await supabaseAdmin
      .from('rounds')
      .select('id')
      .eq('room_code', room_code)
      .eq('round_number', room.current_round)
      .single();

    if (roundError || !rounds) {
      return NextResponse.json({ totalVotes: 0 });
    }

    // Count votes only - no individual vote details
    const { count, error: countError } = await supabaseAdmin
      .from('votes')
      .select('*', { count: 'exact', head: true })
      .eq('round_id', rounds.id);

    if (countError) {
      console.error('Error counting votes:', countError);
      return NextResponse.json({ totalVotes: 0 });
    }

    return NextResponse.json({ 
      totalVotes: count || 0
    });
  } catch (error) {
    console.error('Error fetching vote count:', error);
    return NextResponse.json({ totalVotes: 0 });
  }
}
