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
    const { player_id, room_code, is_host } = payload;

    if (!is_host) {
      return NextResponse.json({ error: 'Only host can update settings' }, { status: 403 });
    }

    const settings = await request.json();

    // Validate settings
    if (!settings.pack || !settings.mode || !settings.impostor_count || !settings.clue_rounds) {
      return NextResponse.json({ error: 'Invalid settings' }, { status: 400 });
    }

    // Broadcast the settings to all clients
    const channel = supabaseAdmin.channel(`room:${room_code}`);
    const { error: broadcastError } = await channel.send({
      type: 'broadcast',
      event: 'SETTINGS_UPDATE',
      payload: { settings }
    });

    if (broadcastError) {
      console.error('Broadcast error:', broadcastError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
