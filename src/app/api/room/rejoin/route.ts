import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

export async function POST(request: NextRequest) {
  try {
    const { roomCode, deviceId } = await request.json();

    if (!roomCode || typeof roomCode !== 'string' || roomCode.length !== 6) {
      return NextResponse.json({ error: 'Invalid room code' }, { status: 400 });
    }

    if (!deviceId || typeof deviceId !== 'string') {
      return NextResponse.json({ error: 'Missing deviceId' }, { status: 400 });
    }

    // Find existing player by device_id
    const { data: player } = await supabaseAdmin
      .from('players')
      .select('*')
      .eq('room_code', roomCode.toUpperCase())
      .eq('device_id', deviceId)
      .single();

    if (!player) {
      return NextResponse.json({ error: 'No existing player for device' }, { status: 404 });
    }

    // Verify room is still valid
    const { data: room } = await supabaseAdmin
      .from('rooms')
      .select('*')
      .eq('code', roomCode.toUpperCase())
      .single();

    if (!room || room.status === 'ENDED') {
      return NextResponse.json({ error: 'Room not available' }, { status: 404 });
    }

    // If player is kicked, do not allow rejoin; return 403 with signal
    if (player.kicked) {
      return NextResponse.json({ error: 'Player kicked' }, { status: 403 });
    }

    // Mark player as connected and upsert presence immediately on rejoin
    await supabaseAdmin
      .from('players')
      .update({ connected: true })
      .eq('id', player.id);

    await supabaseAdmin
      .from('presence')
      .upsert(
        { room_code: roomCode.toUpperCase(), player_id: player.id, last_seen: new Date().toISOString() },
        { onConflict: 'room_code,player_id' }
      );

    // Refresh token
    const token = jwt.sign(
      {
        player_id: player.id,
        room_code: roomCode.toUpperCase(),
        is_host: !!player.is_host,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Snapshot players
    const { data: players } = await supabaseAdmin
      .from('players')
      .select('*')
      .eq('room_code', roomCode.toUpperCase())
      .order('joined_at', { ascending: true });

    return NextResponse.json({ roomCode: roomCode.toUpperCase(), player, room, players: players || [], token });
  } catch (error) {
    console.error('Rejoin error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


