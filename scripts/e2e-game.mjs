// E2E game simulation: 10 players x 10 rounds using real API endpoints
// Usage:
//   node --env-file=.env.local scripts/e2e-game.mjs
// Requires dev server running at BASE_URL (default http://localhost:3000)

import { randomUUID } from 'node:crypto';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const NUM_PLAYERS = Number(process.env.NUM_PLAYERS || 10);
const NUM_ROUNDS = Number(process.env.NUM_ROUNDS || 10);
const PACK = process.env.TEST_PACK || 'random'; // Use random to test different packs
const MODE = process.env.TEST_MODE || 'mixed'; // Use mixed to test both modes

// Available packs for random selection
const AVAILABLE_PACKS = ['classic', 'animals', 'food', 'places', 'movies', 'sports', 'music', 'technology', 'jobs', 'nature', 'trending'];
const AVAILABLE_MODES = ['BLANK', 'DECEPTION'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer(timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
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
  const t0 = Date.now();
  const res = await fetch(url, options);
  const ms = Date.now() - t0;
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

async function getRoomStatus(roomCode, token) {
  const res = await fetchJSON(`/api/room/${roomCode}`, { headers: { Authorization: `Bearer ${token}` } });
  return res.data?.room?.status;
}

async function getRoundDetails(roomCode, token) {
  const res = await fetchJSON(`/api/room/${roomCode}`, { headers: { Authorization: `Bearer ${token}` } });
  const room = res.data?.room;
  if (!room) return null;
  
  // Get current round details
  const roundRes = await fetchJSON(`/api/game/results`, { headers: { Authorization: `Bearer ${token}` } });
  
  // Note: Impostor word assignments not available through current API endpoints
  
  return {
    roundNumber: room.current_round,
    status: room.status,
    crewWord: roundRes.data?.crewWord,
    impostorIds: roundRes.data?.impostorIds || [],
    impostorWords: [], // Not available through current API
    win: roundRes.data?.win,
    voteCounts: roundRes.data?.voteCounts || {}
  };
}

function getRandomPack() {
  return AVAILABLE_PACKS[Math.floor(Math.random() * AVAILABLE_PACKS.length)];
}

function getRandomMode() {
  return AVAILABLE_MODES[Math.floor(Math.random() * AVAILABLE_MODES.length)];
}

function device(label) {
  return { label, deviceId: randomUUID(), token: null, player: null };
}

async function main() {
  console.log(`Target: ${BASE_URL}`);
  console.log(`Players: ${NUM_PLAYERS}, Rounds: ${NUM_ROUNDS}`);
  console.log(`Pack: ${PACK === 'random' ? 'RANDOM (different each round)' : PACK}`);
  console.log(`Mode: ${MODE === 'mixed' ? 'MIXED (BLANK + DECEPTION)' : MODE}`);
  await waitForServer();

  // 1) Host creates room
  const devices = Array.from({ length: NUM_PLAYERS }, (_, i) => device(String.fromCharCode(65 + i)));
  const host = devices[0];
  const create = await fetchJSON('/api/room/create', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: `Host-${host.label}`, deviceId: host.deviceId }),
  });
  const roomCode = create.data.roomCode; host.token = create.data.token; host.player = create.data.player;
  console.log('Room created:', roomCode);

  // 2) Others join
  for (let i = 1; i < devices.length; i++) {
    const d = devices[i];
    const res = await fetchJSON('/api/room/join', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode, name: `P${i}-${d.label}`, deviceId: d.deviceId }),
    });
    d.token = res.data.token; d.player = res.data.player;
  }
  console.log('Players joined:', devices.length);

  const roundSummaries = [];
  const usedWords = new Set();
  const usedCloseWords = new Set();
  const packHistory = [];
  const modeHistory = [];

  // 3) Play NUM_ROUNDS rounds
  for (let round = 1; round <= NUM_ROUNDS; round++) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎮 ROUND ${round} / ${NUM_ROUNDS}`);
    console.log(`${'='.repeat(60)}`);
    
    // Select random pack and mode for this round
    const selectedPack = PACK === 'random' ? getRandomPack() : PACK;
    const selectedMode = MODE === 'mixed' ? getRandomMode() : MODE;
    packHistory.push(selectedPack);
    modeHistory.push(selectedMode);
    
    console.log(`📦 Pack: ${selectedPack}`);
    console.log(`🎯 Mode: ${selectedMode}`);
    console.log(`📊 Pack History: [${packHistory.join(', ')}]`);
    console.log(`🎲 Mode History: [${modeHistory.join(', ')}]`);
    
    // 3.1) Host starts round
    const start = await fetchJSON('/api/game/start', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${host.token}` },
      body: JSON.stringify({ pack: selectedPack, mode: selectedMode, impostor_count: 1, clue_rounds: 1, timer_seconds: 60 }),
    });
    console.log(`🚀 Start: ${start.status} (${start.ms}ms)`);
    let status = await getRoomStatus(roomCode, host.token);
    console.log(`📋 Status: ${status}`);

    // 3.2) Everyone readies up (from REVEAL -> DISCUSS)
    console.log(`\n👥 Players readying up...`);
    for (const d of devices) {
      const r = await fetchJSON('/api/game/ready', { method: 'POST', headers: { Authorization: `Bearer ${d.token}` } });
      console.log(`  ${d.label}: ${r.status}`);
    }
    status = await getRoomStatus(roomCode, host.token);
    console.log(`📋 Status: ${status}`);

    // 3.3) Host ensures advance (optional) to DISCUSS
    await fetchJSON('/api/game/check-ready', { method: 'POST', headers: { Authorization: `Bearer ${host.token}` } }, false);
    status = await getRoomStatus(roomCode, host.token);
    console.log(`📋 Status: ${status}`);

    // 3.4) Host ends discussion -> VOTE
    console.log(`\n💬 Ending discussion...`);
    const endDiscuss = await fetchJSON('/api/game/end-discussion', { method: 'POST', headers: { Authorization: `Bearer ${host.token}` } });
    console.log(`  End discuss: ${endDiscuss.status}`);
    status = await getRoomStatus(roomCode, host.token);
    console.log(`📋 Status: ${status}`);

    // 3.5) Everyone votes (random target) - auto-advances to REVEAL_RESULT when all vote
    console.log(`\n🗳️  Voting phase...`);
    const target = devices[Math.floor(Math.random() * devices.length)].player.id;
    const targetPlayer = devices.find(d => d.player.id === target);
    console.log(`  Target: ${targetPlayer?.label} (${targetPlayer?.player.name})`);
    
    for (const d of devices) {
      const v = await fetchJSON('/api/game/vote', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${d.token}` },
        body: JSON.stringify({ accused_player_id: target }),
      });
      console.log(`  ${d.label}: ${v.status}${v.data?.allVoted ? ' (ALL VOTED!)' : ''}`);
    }
    status = await getRoomStatus(roomCode, host.token);
    console.log(`📋 Status: ${status}`);

    // 3.6) Get detailed round results
    console.log(`\n📊 ROUND RESULTS:`);
    const roundDetails = await getRoundDetails(roomCode, host.token);
    
    if (roundDetails) {
      const crewWord = roundDetails.crewWord;
      const impostorIds = roundDetails.impostorIds;
      const impostorWords = roundDetails.impostorWords;
      const win = roundDetails.win;
      
      // Track word usage - check for duplicate BEFORE adding
      let isDuplicate = false;
      if (crewWord) {
        if (usedWords.has(crewWord)) {
          console.log(`⚠️  DUPLICATE CREW WORD: "${crewWord}" was used before!`);
          isDuplicate = true;
        } else {
          usedWords.add(crewWord);
        }
      }
      
      // Find impostor players
      const impostorPlayers = devices.filter(d => impostorIds.includes(d.player.id));
      const impostorNames = impostorPlayers.map(p => `${p.label}(${p.player.name})`).join(', ');
      
      console.log(`  🎯 Crew Word: "${crewWord}"`);
      console.log(`  👹 Impostor(s): ${impostorNames}`);
      
      // Show mode-specific information
      if (selectedMode === 'DECEPTION') {
        console.log(`  🎭 Mode: DECEPTION (impostor gets similar word)`);
        console.log(`  💡 Note: Impostor word not available in API response`);
      } else if (selectedMode === 'BLANK') {
        console.log(`  ❓ Mode: BLANK (impostor gets "?")`);
      }
      
      console.log(`  🏆 Winner: ${win}`);
      console.log(`  📈 Word History: [${Array.from(usedWords).join(', ')}]`);
      
      // Show vote counts for DECEPTION mode
      if (selectedMode === 'DECEPTION' && roundDetails.voteCounts) {
        console.log(`  🔍 Vote Counts:`, roundDetails.voteCounts);
      }
      
      // isDuplicate already calculated above
      
      roundSummaries.push({ 
        round, 
        pack: selectedPack,
        mode: selectedMode,
        win, 
        crewWord, 
        impostorWords: impostorWords,
        impostors: impostorNames,
        duplicate: isDuplicate
      });
    }

    await sleep(500); // Longer delay between rounds
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`🎉 GAME FINISHED - COMPREHENSIVE SUMMARY`);
  console.log(`${'='.repeat(80)}`);
  
  console.log(`\n📊 ROUND SUMMARIES:`);
  for (const s of roundSummaries) {
    const duplicateFlag = s.duplicate ? ' ⚠️  DUPLICATE!' : '';
    const modeInfo = s.mode === 'DECEPTION' 
      ? ` | Mode: DECEPTION` 
      : s.mode === 'BLANK' 
        ? ` | Mode: BLANK` 
        : '';
    console.log(`  Round ${s.round}: ${s.pack} | ${s.mode} | ${s.win} | "${s.crewWord}"${modeInfo} | Impostor: ${s.impostors}${duplicateFlag}`);
  }
  
  console.log(`\n📈 STATISTICS:`);
  const uniqueWords = Array.from(usedWords).length;
  const duplicates = roundSummaries.filter(s => s.duplicate).length;
  const blankRounds = roundSummaries.filter(s => s.mode === 'BLANK').length;
  const deceptionRounds = roundSummaries.filter(s => s.mode === 'DECEPTION').length;
  const innocentWins = roundSummaries.filter(s => s.win === 'INNOCENT').length;
  const impostorWins = roundSummaries.filter(s => s.win === 'IMPOSTOR').length;
  
  console.log(`  Total Rounds: ${roundSummaries.length}`);
  console.log(`  Unique Words: ${uniqueWords}`);
  console.log(`  Duplicates: ${duplicates}`);
  console.log(`  BLANK Mode: ${blankRounds} rounds`);
  console.log(`  DECEPTION Mode: ${deceptionRounds} rounds`);
  console.log(`  Innocent Wins: ${innocentWins}`);
  console.log(`  Impostor Wins: ${impostorWins}`);
  
  console.log(`\n📦 PACK USAGE:`);
  const packCounts = {};
  packHistory.forEach(pack => packCounts[pack] = (packCounts[pack] || 0) + 1);
  Object.entries(packCounts).forEach(([pack, count]) => {
    console.log(`  ${pack}: ${count} rounds`);
  });
  
  console.log(`\n🎯 WORD HISTORY:`);
  console.log(`  [${Array.from(usedWords).join(', ')}]`);
  
  if (duplicates > 0) {
    console.log(`\n⚠️  DUPLICATES DETECTED: ${duplicates} rounds had duplicate words!`);
  } else {
    console.log(`\n✅ NO DUPLICATES: All words were unique!`);
  }
  
  console.log(`\n🎮 E2E game simulation complete.`);
}

main().catch((e) => {
  console.error('E2E game failed:', e.message, e.status || '', e.data || '');
  process.exit(1);
});


