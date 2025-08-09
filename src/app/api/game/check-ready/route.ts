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
      return NextResponse.json({ error: 'Only host can check ready status' }, { status: 403 });
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

    // Advance to DISCUSS phase when host calls this
    const { error: updateError } = await supabaseAdmin
      .from('rooms')
      .update({ 
        status: 'DISCUSS'
      })
      .eq('code', room_code);

    if (updateError) {
      console.error('Error updating room status:', updateError);
      return NextResponse.json({ error: 'Failed to advance game' }, { status: 500 });
    }

    console.log(`Advanced room ${room_code} to DISCUSS phase`);
    return NextResponse.json({ success: true, newStatus: 'DISCUSS' });
  } catch (error) {
    console.error('Error checking ready status:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
