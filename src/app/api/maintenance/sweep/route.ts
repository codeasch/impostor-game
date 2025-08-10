import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Best-effort maintenance endpoint to:
// - Mark players disconnected if heartbeat stale (>90s)
// - End rooms with no connected players for >10 minutes
export async function POST(_request: NextRequest) {
  try {
    const now = Date.now();
    const staleThresholdIso = new Date(now - 90_000).toISOString();
    const roomEmptyThresholdMs = 10 * 60_000; // 10 minutes

    // 1) Find stale presence entries
    const { data: stalePresence, error: presenceErr } = await supabaseAdmin
      .from('presence')
      .select('room_code, player_id, last_seen')
      .lt('last_seen', staleThresholdIso);
    if (presenceErr) {
      console.error('presence query error', presenceErr);
    }

    if (stalePresence && stalePresence.length > 0) {
      const playerIds = stalePresence.map((p) => p.player_id);
      // Mark players disconnected
      const { error: updErr } = await supabaseAdmin
        .from('players')
        .update({ connected: false })
        .in('id', playerIds);
      if (updErr) console.error('players disconnect update error', updErr);
    }

    // 2) End empty rooms older than threshold
    const { data: activeRooms, error: roomsErr } = await supabaseAdmin
      .from('rooms')
      .select('code, status, created_at')
      .neq('status', 'ENDED');
    if (roomsErr) {
      console.error('rooms query error', roomsErr);
    }

    if (activeRooms && activeRooms.length > 0) {
      for (const room of activeRooms) {
        // Skip very new rooms
        const createdAtMs = new Date(room.created_at).getTime();
        if (now - createdAtMs < roomEmptyThresholdMs) continue;

        const { count, error: countErr } = await supabaseAdmin
          .from('players')
          .select('*', { count: 'exact', head: true })
          .eq('room_code', room.code)
          .eq('connected', true);
        if (countErr) {
          console.error('player count error', countErr);
          continue;
        }
        if (!count || count === 0) {
          const { error: endErr } = await supabaseAdmin
            .from('rooms')
            .update({ status: 'ENDED' })
            .eq('code', room.code);
          if (endErr) console.error('end room error', room.code, endErr);
        }
      }
    }

    // 3) Delete ended rooms older than 24h (cascade cleans related data)
    const endedBeforeIso = new Date(now - 24 * 60 * 60_000).toISOString();
    const { error: delErr } = await supabaseAdmin
      .from('rooms')
      .delete()
      .lt('created_at', endedBeforeIso)
      .eq('status', 'ENDED');
    if (delErr) console.error('delete old rooms error', delErr);

    // 4) Opportunistic cleanup: if any ended rooms still have presence or connected players, clear them
    const { data: endedRooms } = await supabaseAdmin
      .from('rooms')
      .select('code')
      .eq('status', 'ENDED');
    if (endedRooms && endedRooms.length > 0) {
      for (const r of endedRooms) {
        await supabaseAdmin.from('players').update({ connected: false }).eq('room_code', r.code);
        await supabaseAdmin.from('presence').delete().eq('room_code', r.code);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('maintenance sweep error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


