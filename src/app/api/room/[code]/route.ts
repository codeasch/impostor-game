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
    const { player_id, room_code } = payload;

    const { code } = await params;
    const roomCode = code.toUpperCase();

    // Verify the player is in this room
    if (room_code !== roomCode) {
      return NextResponse.json({ error: 'Access denied to this room' }, { status: 403 });
    }

    // Fetch room data
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('*')
      .eq('code', roomCode)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // If room ended, block access for clients resuming
    if (room.status === 'ENDED') {
      return NextResponse.json({ error: 'Room has ended' }, { status: 410 });
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

    // Get current player
    const currentPlayer = players?.find(p => p.id === player_id);
    if (!currentPlayer) {
      return NextResponse.json({ error: 'Player not found in room' }, { status: 404 });
    }

    // If kicked, inform client; they will show a modal and block UI
    if (currentPlayer.kicked) {
      return NextResponse.json({ room, players: players || [], currentPlayer });
    }

    return NextResponse.json({ room, players: players || [], currentPlayer });
  } catch (error) {
    console.error('Error fetching room:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
