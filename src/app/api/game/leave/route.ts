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

    // Mark player disconnected
    const { error: updErr } = await supabaseAdmin
      .from('players')
      .update({ connected: false })
      .eq('id', player_id);
    if (updErr) {
      console.error('leave: update player error', updErr);
    }

    // Remove from presence
    const { error: presErr } = await supabaseAdmin
      .from('presence')
      .delete()
      .eq('room_code', room_code)
      .eq('player_id', player_id);
    if (presErr) {
      console.error('leave: delete presence error', presErr);
    }

    // Also remove from ready_players array if present
    await supabaseAdmin.rpc('array_remove_uuid', { 
      table_name: 'rooms',
      col_name: 'ready_players',
      key: 'code',
      key_val: room_code,
      uuid_val: player_id,
    }).catch(() => {}); // ignore if RPC not present

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('leave error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


