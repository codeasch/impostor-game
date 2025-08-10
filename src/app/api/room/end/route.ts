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
    if (!is_host) return NextResponse.json({ error: 'Only host can end room' }, { status: 403 });

    // Delete the room entirely; cascades remove players/rounds/votes/assignments/presence
    const { error } = await supabaseAdmin
      .from('rooms')
      .delete()
      .eq('code', room_code);
    if (error) return NextResponse.json({ error: 'Failed to end room' }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('end room error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


