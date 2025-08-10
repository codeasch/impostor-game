import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'No token' }, { status: 401 });

    const payload = jwt.verify(token, JWT_SECRET) as any;
    const { player_id, room_code } = payload;
    if (!player_id || !room_code) return NextResponse.json({ error: 'Invalid token' }, { status: 400 });

    await supabaseAdmin.from('players').update({ connected: false }).eq('id', player_id);
    await supabaseAdmin.from('presence').delete().eq('room_code', room_code).eq('player_id', player_id);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


