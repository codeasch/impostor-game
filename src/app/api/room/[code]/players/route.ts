import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const payload = jwt.verify(token, JWT_SECRET) as any;
    const { room_code } = payload;

    const { code } = await params;
    const roomCode = code.toUpperCase();

    // Verify the player is in this room
    if (room_code !== roomCode) {
      return NextResponse.json({ error: 'Access denied to this room' }, { status: 403 });
    }

    // Fetch players
    const { data: players, error: playersError } = await supabaseAdmin
      .from('players')
      .select('*')
      .eq('room_code', roomCode)
      .order('joined_at', { ascending: true });

    if (playersError) {
      return NextResponse.json({ error: 'Failed to load players' }, { status: 500 });
    }

    return NextResponse.json({
      players: players || [],
    });
  } catch (error) {
    console.error('Error fetching players:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
