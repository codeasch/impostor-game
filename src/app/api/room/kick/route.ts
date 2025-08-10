import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'No token' }, { status: 401 });

    const payload = jwt.verify(token, JWT_SECRET) as any;
    const { room_code, is_host } = payload;
    if (!is_host) return NextResponse.json({ error: 'Only host can remove players' }, { status: 403 });

    const { playerId } = await request.json();
    if (!playerId) return NextResponse.json({ error: 'Missing playerId' }, { status: 400 });

    // Ensure target is in this room and not the host
    const { data: target, error: tErr } = await supabaseAdmin
      .from('players')
      .select('*')
      .eq('id', playerId)
      .eq('room_code', room_code)
      .single();
    if (tErr || !target) {
      // If already removed/kicked, treat as success (idempotent)
      return NextResponse.json({ ok: true, already: true });
    }
    if (target.is_host) return NextResponse.json({ error: 'Cannot remove host' }, { status: 400 });

    // Mark kicked, disconnected and remove presence
    await supabaseAdmin.from('players').update({ connected: false, kicked: true, kicked_at: new Date().toISOString() }).eq('id', playerId);
    await supabaseAdmin.from('presence').delete().eq('room_code', room_code).eq('player_id', playerId);

    // Optional: remove from ready_players
    try {
      const { error: rpcErr } = await supabaseAdmin.rpc('array_remove_uuid', { 
        table_name: 'rooms', col_name: 'ready_players', key: 'code', key_val: room_code, uuid_val: playerId 
      });
      if (rpcErr) {
        console.warn('array_remove_uuid RPC error (ignored):', rpcErr);
      }
    } catch {}

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('kick error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


