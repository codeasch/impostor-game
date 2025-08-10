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
    const { player_id, room_code } = payload;

    if (!player_id || !room_code) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    // Upsert presence row
    const { error: presenceError } = await supabaseAdmin
      .from('presence')
      .upsert({ room_code, player_id, last_seen: new Date().toISOString() }, { onConflict: 'room_code,player_id' });

    if (presenceError) {
      console.error('Presence upsert error:', presenceError);
    }

    // Mark player as connected
    const { error: playerError } = await supabaseAdmin
      .from('players')
      .update({ connected: true })
      .eq('id', player_id);

    if (playerError) {
      console.error('Player update error:', playerError);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Heartbeat error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


