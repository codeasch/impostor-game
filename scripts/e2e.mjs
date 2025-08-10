// End-to-end test harness for Impostor Game UX flow
// Requirements: Node 18+, dev server running at http://localhost:3000, env with Supabase URL + service role key
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer(timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE_URL}/`);
      if (res.ok) return true;
    } catch {}
    await sleep(500);
  }
  throw new Error('Dev server did not become ready in time');
}

async function fetchJSON(path, options = {}, expectOk = true) {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const started = Date.now();
  const res = await fetch(url, options);
  const duration = Date.now() - started;
  let data = null;
  try {
    data = await res.json();
  } catch {
    // ignore non-JSON
  }
  if (expectOk && !res.ok) {
    const message = data?.error || `HTTP ${res.status}`;
    const err = new Error(`Request failed: ${url} (${message})`);
    err.response = { status: res.status, data };
    err.timingMs = duration;
    throw err;
  }
  return { ok: res.ok, status: res.status, data, ms: duration };
}

function randomName(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 6)}`;
}

function newDevice(label) {
  return { label, deviceId: randomUUID(), token: null, player: null };
}

async function run() {
  console.log('Waiting for dev server...');
  await waitForServer();
  console.log('Dev server is ready');

  const deviceA = newDevice('A');
  const deviceB = newDevice('B');
  const nameA = randomName('Alice');
  const nameB = randomName('Bob');

  console.log('\n1) Create room as device A');
  const createRes = await fetchJSON('/api/room/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: nameA, deviceId: deviceA.deviceId }),
  });
  const roomCode = createRes.data.roomCode;
  deviceA.token = createRes.data.token;
  deviceA.player = createRes.data.player;
  console.log(' - Room code:', roomCode);
  console.log(' - Player A id:', deviceA.player.id);

  console.log('\n2) Fetch room snapshot with token (A)');
  const roomSnap1 = await fetchJSON(`/api/room/${roomCode}`, {
    headers: { Authorization: `Bearer ${deviceA.token}` },
  });
  console.log(` - players: ${roomSnap1.data.players.length}, status: ${roomSnap1.data.room.status}`);

  console.log('\n3) Send 2 heartbeats (A)');
  for (let i = 0; i < 2; i++) {
    const hb = await fetchJSON('/api/presence/heartbeat', {
      method: 'POST',
      headers: { Authorization: `Bearer ${deviceA.token}` },
    });
    console.log(` - heartbeat ${i + 1}: ${hb.status}, ${hb.ms}ms`);
    await sleep(500);
  }

  console.log('\n4) Mark presence stale and run maintenance sweep');
  // Make presence stale for device A
  await admin.from('presence')
    .update({ last_seen: new Date(Date.now() - 5 * 60 * 1000).toISOString() })
    .eq('room_code', roomCode)
    .eq('player_id', deviceA.player.id);
  const sweep1 = await fetchJSON('/api/maintenance/sweep', { method: 'POST' });
  console.log(' - sweep status:', sweep1.status);

  const roomSnap2 = await fetchJSON(`/api/room/${roomCode}`, {
    headers: { Authorization: `Bearer ${deviceA.token}` },
  });
  const currentA = roomSnap2.data.players.find((p) => p.id === deviceA.player.id);
  console.log(' - Player A connected after sweep:', currentA?.connected);

  console.log('\n5) Rejoin via deviceId (A)');
  const rejoin = await fetchJSON('/api/room/rejoin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomCode, deviceId: deviceA.deviceId }),
  });
  console.log(' - Rejoin player id:', rejoin.data.player.id);
  if (rejoin.data.player.id !== deviceA.player.id) throw new Error('Rejoin returned different player id');
  deviceA.token = rejoin.data.token;

  console.log('\n6) Attempt duplicate name from device B (should be rejected)');
  const dup = await fetchJSON('/api/room/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomCode, name: nameA, deviceId: deviceB.deviceId }),
  }, false);
  console.log(' - duplicate join ok?:', dup.ok, 'status:', dup.status, 'msg:', dup.data?.error);
  if (dup.ok) throw new Error('Duplicate name was incorrectly allowed');

  console.log('\n7) Rename on same device A using join (should update, not duplicate)');
  const newNameA = nameA + '-renamed';
  const reuse = await fetchJSON('/api/room/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomCode, name: newNameA, deviceId: deviceA.deviceId }),
  });
  console.log(' - join returned player id:', reuse.data.player.id, 'name:', reuse.data.player.name);
  if (reuse.data.player.id !== deviceA.player.id) throw new Error('Device reuse produced a new player id');

  console.log('\n8) End inactive room via maintenance');
  // Set everyone disconnected and created_at old enough
  await admin.from('players').update({ connected: false }).eq('room_code', roomCode);
  await admin.from('rooms').update({ created_at: new Date(Date.now() - 11 * 60 * 1000).toISOString() }).eq('code', roomCode);
  const sweep2 = await fetchJSON('/api/maintenance/sweep', { method: 'POST' });
  console.log(' - sweep status:', sweep2.status);

  const roomSnap3 = await fetchJSON(`/api/room/${roomCode}`, {
    headers: { Authorization: `Bearer ${deviceA.token}` },
  });
  console.log(' - Room status after sweep:', roomSnap3.data.room.status);

  console.log('\n9) Delete ended room older than 24h');
  await admin.from('rooms').update({ created_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() }).eq('code', roomCode);
  const sweep3 = await fetchJSON('/api/maintenance/sweep', { method: 'POST' });
  console.log(' - sweep status:', sweep3.status);

  const getEnded = await fetchJSON(`/api/room/${roomCode}`, { headers: { Authorization: `Bearer ${deviceA.token}` } }, false);
  console.log(' - Fetch ended room ok?:', getEnded.ok, 'status:', getEnded.status, 'msg:', getEnded.data?.error);
  if (getEnded.ok) throw new Error('Ended room was not deleted');

  console.log('\nAll tests completed successfully.');
}

run().catch((err) => {
  console.error('\nE2E failed:', err.message);
  if (err.response) console.error('Response:', err.response);
  if (err.timingMs) console.error('Timing(ms):', err.timingMs);
  process.exit(1);
});


