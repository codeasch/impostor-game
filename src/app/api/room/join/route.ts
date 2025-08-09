import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generateAvatarSeed } from '@/lib/utils';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

export async function POST(request: NextRequest) {
  try {
    const { roomCode, name } = await request.json();

    if (!roomCode || typeof roomCode !== 'string' || roomCode.length !== 6) {
      return NextResponse.json({ error: 'Invalid room code' }, { status: 400 });
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (name.trim().length > 20) {
      return NextResponse.json({ error: 'Name must be 20 characters or less' }, { status: 400 });
    }

    // Check if room exists and is joinable
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('*')
      .eq('code', roomCode.toUpperCase())
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.status === 'ENDED') {
      return NextResponse.json({ error: 'This room has ended' }, { status: 400 });
    }

    // Check if name is already taken in this room
    const { data: existingPlayer } = await supabaseAdmin
      .from('players')
      .select('id, name')
      .eq('room_code', roomCode.toUpperCase())
      .ilike('name', name.trim());

    if (existingPlayer && existingPlayer.length > 0) {
      return NextResponse.json({ error: 'Name already taken in this room' }, { status: 400 });
    }

    // Check player count (max 20)
    const { count: playerCount } = await supabaseAdmin
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('room_code', roomCode.toUpperCase())
      .eq('connected', true);

    if (playerCount && playerCount >= 20) {
      return NextResponse.json({ error: 'Room is full (20 players max)' }, { status: 400 });
    }

    // Create player
    const { data: player, error: playerError } = await supabaseAdmin
      .from('players')
      .insert({
        room_code: roomCode.toUpperCase(),
        name: name.trim(),
        is_host: false,
        connected: true,
        avatar_seed: generateAvatarSeed(),
      })
      .select()
      .single();

    if (playerError) {
      console.error('Error creating player:', playerError);
      return NextResponse.json({ error: 'Failed to join room' }, { status: 500 });
    }

    // Get room snapshot with all players
    const { data: players } = await supabaseAdmin
      .from('players')
      .select('*')
      .eq('room_code', roomCode.toUpperCase())
      .order('joined_at', { ascending: true });

    // Generate JWT token
    const token = jwt.sign(
      {
        player_id: player.id,
        room_code: roomCode.toUpperCase(),
        is_host: false,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return NextResponse.json({
      roomCode: roomCode.toUpperCase(),
      player,
      room,
      players: players || [],
      token,
    });
  } catch (error) {
    console.error('Error in join room:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
