import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generateRoomCode, generateAvatarSeed } from '@/lib/utils';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (name.trim().length > 20) {
      return NextResponse.json({ error: 'Name must be 20 characters or less' }, { status: 400 });
    }

    // Generate unique room code
    let roomCode: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      roomCode = generateRoomCode();
      const { data: existingRoom } = await supabaseAdmin
        .from('rooms')
        .select('code')
        .eq('code', roomCode)
        .single();
      
      if (!existingRoom) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      return NextResponse.json({ error: 'Unable to generate unique room code' }, { status: 500 });
    }

    // Create room first with a temporary host_id
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .insert({
        code: roomCode,
        host_id: '00000000-0000-0000-0000-000000000000', // Temporary UUID
        status: 'LOBBY',
        current_round: 0,
      })
      .select()
      .single();

    if (roomError) {
      console.error('Error creating room:', roomError);
      return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
    }

    // Create player
    const { data: player, error: playerError } = await supabaseAdmin
      .from('players')
      .insert({
        room_code: roomCode,
        name: name.trim(),
        is_host: true,
        connected: true,
        avatar_seed: generateAvatarSeed(),
      })
      .select()
      .single();

    if (playerError) {
      console.error('Error creating player:', playerError);
      // Clean up room if player creation failed
      await supabaseAdmin.from('rooms').delete().eq('code', roomCode);
      return NextResponse.json({ error: 'Failed to create player' }, { status: 500 });
    }

    // Update room with correct host_id
    const { error: updateError } = await supabaseAdmin
      .from('rooms')
      .update({ host_id: player.id })
      .eq('code', roomCode);

    if (updateError) {
      console.error('Error updating room host:', updateError);
      // Clean up both room and player
      await supabaseAdmin.from('players').delete().eq('id', player.id);
      await supabaseAdmin.from('rooms').delete().eq('code', roomCode);
      return NextResponse.json({ error: 'Failed to set room host' }, { status: 500 });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        player_id: player.id,
        room_code: roomCode,
        is_host: true,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return NextResponse.json({
      roomCode,
      player,
      room,
      token,
    });
  } catch (error) {
    console.error('Error in create room:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
