import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const payload = jwt.verify(token, JWT_SECRET) as any;
    const { room_code, is_host } = payload;

    if (!is_host) {
      return NextResponse.json({ error: 'Only host can end discussion' }, { status: 403 });
    }

    // Get current room
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('*')
      .eq('code', room_code)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.status !== 'DISCUSS') {
      return NextResponse.json({ error: 'Room is not in discussion phase' }, { status: 400 });
    }

    // Update room status to VOTE
    const { error: updateError } = await supabaseAdmin
      .from('rooms')
      .update({ status: 'VOTE' })
      .eq('code', room_code);

    if (updateError) {
      console.error('Error updating room status:', updateError);
      return NextResponse.json({ error: 'Failed to end discussion' }, { status: 500 });
    }

    console.log(`Room ${room_code} moved to VOTE phase`);
    return NextResponse.json({ success: true, newStatus: 'VOTE' });
  } catch (error) {
    console.error('Error ending discussion:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
