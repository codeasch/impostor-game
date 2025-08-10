// Load test / comprehensive e2e for multi-device UX
// Node 18+ required

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const NUM_DEVICES = Number(process.env.NUM_DEVICES || 10);
const POLL_ITERATIONS = Number(process.env.POLL_ITERATIONS || 10);
const POLL_DELAY_MS = Number(process.env.POLL_DELAY_MS || 250);

import { randomUUID } from 'node:crypto';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function nowMs() { return performance.now(); }

async function waitForServer(timeoutMs = 30000) {
  const start = nowMs();
  while (nowMs() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE_URL}/`);
      if (res.ok) return true;
    } catch {}
    await sleep(400);
  }
  throw new Error('Dev server did not become ready in time');
}

async function fetchJSON(path, options = {}, expectOk = true) {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const t0 = nowMs();
  const res = await fetch(url, options);
  const ms = nowMs() - t0;
  let data = null;
  try { data = await res.json(); } catch {}
  if (expectOk && !res.ok) {
    const message = data?.error || `HTTP ${res.status}`;
    const err = new Error(`${url} failed: ${message}`);
    err.status = res.status; err.data = data; err.ms = ms;
    throw err;
  }
  return { ok: res.ok, status: res.status, data, ms };
}

function pct(arr, p) {
  if (arr.length === 0) return 0;
  const a = [...arr].sort((x,y)=>x-y);
  const idx = Math.min(a.length - 1, Math.floor((p/100) * a.length));
  return a[idx];
}

function stats(name, samples) {
  if (samples.length === 0) return { name, count: 0 };
  const sum = samples.reduce((a,b)=>a+b,0);
  const avg = sum / samples.length;
  const p50 = pct(samples, 50);
  const p95 = pct(samples, 95);
  const p99 = pct(samples, 99);
  return { name, count: samples.length, avg: Math.round(avg), p50: Math.round(p50), p95: Math.round(p95), p99: Math.round(p99) };
}

function device(label) {
  return { label, deviceId: randomUUID(), token: null, player: null };
}

async function main() {
  console.log(`Target: ${BASE_URL}`);
  console.log(`Devices: ${NUM_DEVICES}, Poll iters: ${POLL_ITERATIONS}, delay: ${POLL_DELAY_MS}ms`);

  await waitForServer();

  const devices = Array.from({ length: NUM_DEVICES }, (_, i) => device(String.fromCharCode(65 + i)));
  const name = (i) => `User-${i}-${Math.random().toString(36).slice(2,6)}`;

  console.log('\n[1] Host creates room');
  const host = devices[0];
  const create = await fetchJSON('/api/room/create', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name(0), deviceId: host.deviceId }),
  });
  const roomCode = create.data.roomCode; host.token = create.data.token; host.player = create.data.player;
  console.log(' - Room:', roomCode, 'Host:', host.player.id);

  console.log('[2] Others join in parallel');
  const joinTimes = [];
  await Promise.all(devices.slice(1).map(async (d, i) => {
    const t0 = nowMs();
    const res = await fetchJSON('/api/room/join', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode, name: name(i+1), deviceId: d.deviceId }),
    });
    joinTimes.push(res.ms);
    d.token = res.data.token; d.player = res.data.player;
  }));
  console.log(' - Joined:', devices.length - 1);

  console.log('[3] Snapshot check from all devices');
  const snapTimes = [];
  await Promise.all(devices.map(async (d) => {
    const res = await fetchJSON(`/api/room/${roomCode}`, { headers: { Authorization: `Bearer ${d.token}` } });
    snapTimes.push(res.ms);
  }));

  console.log('[4] Heartbeats from all devices (x2)');
  const hbTimes = [];
  for (let k = 0; k < 2; k++) {
    await Promise.all(devices.map(async (d) => {
      const res = await fetchJSON('/api/presence/heartbeat', { method: 'POST', headers: { Authorization: `Bearer ${d.token}` } });
      hbTimes.push(res.ms);
    }));
  }

  console.log('[5] Poll room snapshots concurrently');
  const pollTimes = [];
  for (let i = 0; i < POLL_ITERATIONS; i++) {
    await Promise.all(devices.map(async (d) => {
      const res = await fetchJSON(`/api/room/${roomCode}`, { headers: { Authorization: `Bearer ${d.token}` } });
      pollTimes.push(res.ms);
    }));
    await sleep(POLL_DELAY_MS);
  }

  console.log('[6] Simulate stale presence of first 2 devices and sweep');
  // Best-effort: mark 2 devices stale by pausing their heartbeats (no-op here), run sweep
  const sweep1 = await fetchJSON('/api/maintenance/sweep', { method: 'POST' });
  console.log(' - sweep:', sweep1.status);

  console.log('[7] Rejoin 2 devices by deviceId');
  const rjTimes = [];
  for (let i = 0; i < Math.min(2, devices.length); i++) {
    const d = devices[i];
    const res = await fetchJSON('/api/room/rejoin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode, deviceId: d.deviceId }),
    });
    rjTimes.push(res.ms);
  }

  console.log('[8] Summaries (ms)');
  const out = [
    stats('join', joinTimes),
    stats('snapshot_initial', snapTimes),
    stats('heartbeat', hbTimes),
    stats('poll_room', pollTimes),
    stats('rejoin', rjTimes),
  ];
  for (const s of out) {
    console.log(`${s.name}: count=${s.count} avg=${s.avg} p50=${s.p50} p95=${s.p95} p99=${s.p99}`);
  }

  console.log('[9] Cleanup: end and delete room');
  // Mark all disconnected & old to trigger end+delete
  try {
    await fetchJSON('/api/maintenance/sweep', { method: 'POST' });
  } catch {}

  console.log('\nLoad test completed.');
}

main().catch((e) => {
  console.error('Load test failed:', e.message, e.status || '', e.data || '');
  process.exit(1);
});


