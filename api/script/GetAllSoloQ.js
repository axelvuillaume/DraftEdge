require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const { MONGODB_ENDPOINT, RIOT_API_KEY } = require("../src/config");
const SoloqMatch = require("../src/models/soloq-match");
const Player = require("../src/models/player");

// =====================================================================
// CONFIGURATION
// =====================================================================
const SEASON_START = new Date("2026-01-08T00:00:00Z");
const QUEUE_ID = 420; // Ranked Solo/Duo
const MATCH_V5_BASE = "https://europe.api.riotgames.com/lol/match/v5/matches";
const DELAY_MS = 1300; // ~46 req/min — safe under 100 req/2 min

// =====================================================================

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Clés du ParticipantDto qu'on ignore (pas SoloQ)
const IGNORED_KEYS = new Set([
  "eligibleForProgression",
  "playerScore0",
  "playerScore1",
  "playerScore2",
  "playerScore3",
  "playerScore4",
  "playerScore5",
  "playerScore6",
  "playerScore7",
  "playerScore8",
  "playerScore9",
  "playerScore10",
  "playerScore11",
  "missions",
  "killsOnRecentlyHealedByAramPack",
  "snowballsHit",
  "poroExplosions",
  "placement",
  "subteamPlacement",
  "playerAugment1",
  "playerAugment2",
  "playerAugment3",
  "playerAugment4",
  "playerAugment5",
  "playerAugment6",
  "playerSubteamId",
]);

function mapMatch(data, puuid, player) {
  const { metadata, info } = data;
  const p = info.participants.find((x) => x.puuid === puuid);
  if (!p) return null;

  const team = info.teams.find((t) => t.teamId === p.teamId);

  // Spread le participant en filtrant les clés inutiles
  const participant = {};
  for (const [key, value] of Object.entries(p)) {
    if (!IGNORED_KEYS.has(key)) {
      participant[key] = value;
    }
  }

  // Filtrer les challenges SWARM/ARAM
  if (participant.challenges) {
    const clean = {};
    for (const [key, value] of Object.entries(participant.challenges)) {
      if (!key.startsWith("SWARM_") && !IGNORED_KEYS.has(key)) {
        clean[key] = value;
      }
    }
    participant.challenges = clean;
  }

  return {
    // MetadataDto
    matchId: metadata.matchId,
    dataVersion: metadata.dataVersion,

    // InfoDto
    endOfGameResult: info.endOfGameResult,
    gameCreation: info.gameCreation,
    gameDuration: info.gameDuration,
    gameEndTimestamp: info.gameEndTimestamp,
    gameStartTimestamp: info.gameStartTimestamp,
    gameDate: info.gameStartTimestamp ? new Date(info.gameStartTimestamp) : undefined,
    gameId: info.gameId,
    gameMode: info.gameMode,
    gameName: info.gameName,
    gameType: info.gameType,
    gameVersion: info.gameVersion,
    mapId: info.mapId,
    platformId: info.platformId,
    queueId: info.queueId,

    // Custom DraftEdge
    player_id: player._id.toString(),
    player_name: player.game_name,
    team_id: player.team_id,
    team_name: player.team_name,
    side: p.teamId === 100 ? "blue" : "red",

    // ParticipantDto (spread direct — mêmes noms que le model)
    ...participant,

    // TeamDto
    teamObjectives: team?.objectives,
    teamBans: team?.bans,
  };
}

// =====================================================================
// API helpers with retry on 429
// =====================================================================

async function apiFetch(url) {
  const res = await fetch(`${url}${url.includes("?") ? "&" : "?"}api_key=${RIOT_API_KEY}`);

  if (res.status === 429) {
    const wait = (parseInt(res.headers.get("Retry-After"), 10) || 120) * 1000;
    console.log(`  ⏳ Rate limited — waiting ${wait / 1000}s`);
    await sleep(wait);
    return apiFetch(url);
  }

  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return res.json();
}

async function fetchAllMatchIds(puuid) {
  const startTime = Math.floor(SEASON_START.getTime() / 1000);
  const all = [];
  let start = 0;

  while (true) {
    const url = `${MATCH_V5_BASE}/by-puuid/${puuid}/ids?startTime=${startTime}&queue=${QUEUE_ID}&start=${start}&count=100`;
    const ids = await apiFetch(url);
    console.log(`    Fetched ${ids.length} match IDs (offset ${start})`);
    all.push(...ids);
    if (ids.length < 100) break;
    start += 100;
    await sleep(DELAY_MS);
  }

  return all;
}

// =====================================================================
// PROCESS ONE PLAYER
// =====================================================================

async function processPlayer(player) {
  const label = `${player.game_name}#${player.tag_line}`;
  console.log(`\n========== ${label} ==========`);

  const matchIds = await fetchAllMatchIds(player.puuid);
  console.log(`  Found ${matchIds.length} ranked solo/duo matches`);

  if (matchIds.length === 0) return { saved: 0, skipped: 0, errors: 0 };

  const existing = await SoloqMatch.find({ matchId: { $in: matchIds }, puuid: player.puuid }, { matchId: 1 }).lean();
  const existingSet = new Set(existing.map((d) => d.matchId));
  const newIds = matchIds.filter((id) => !existingSet.has(id));
  console.log(`  ${existingSet.size} already in DB — ${newIds.length} new to fetch`);

  let saved = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < newIds.length; i++) {
    const matchId = newIds[i];
    try {
      const data = await apiFetch(`${MATCH_V5_BASE}/${matchId}`);

      if (data.info.queueId !== QUEUE_ID) {
        console.log(`  [${i + 1}/${newIds.length}] ⏭️  ${matchId} skipped (queue ${data.info.queueId})`);
        skipped++;
        continue;
      }

      if (data.info.gameStartTimestamp && data.info.gameStartTimestamp < SEASON_START.getTime()) {
        console.log(`  [${i + 1}/${newIds.length}] 🛑 ${matchId} before season — stopping`);
        break;
      }

      const doc = mapMatch(data, player.puuid, player);
      if (!doc) {
        console.warn(`  ⚠️  Player not found in ${matchId}`);
        errors++;
        continue;
      }

      await SoloqMatch.updateOne({ matchId: doc.matchId, puuid: doc.puuid }, { $set: doc }, { upsert: true });
      saved++;
      const date = doc.gameDate ? doc.gameDate.toISOString().slice(0, 10) : "?";
      const duration = doc.gameDuration ? `${Math.floor(doc.gameDuration / 60)}m${doc.gameDuration % 60}s` : "?";
      console.log(`  [${i + 1}/${newIds.length}] ✅ ${matchId} — ${date} ${duration} — ${doc.championName} ${doc.win ? "W" : "L"} (${doc.kills}/${doc.deaths}/${doc.assists})`);
    } catch (err) {
      errors++;
      console.error(`  [${i + 1}/${newIds.length}] ❌ ${matchId}: ${err.message}`);
    }

    if (i < newIds.length - 1) await sleep(DELAY_MS);
  }

  console.log(`  => ${saved} saved, ${skipped} skipped, ${errors} errors`);
  return { saved, skipped, errors };
}

// =====================================================================
// MAIN
// =====================================================================

(async () => {
  console.log("Connecting to MongoDB…");
  await mongoose.connect(MONGODB_ENDPOINT);
  console.log("✅ Connected\n");

  try {
    const players = await Player.find({ puuid: { $exists: true, $ne: null }, active: true }).lean();
    // Filter out empty strings (lean doesn't apply $ne to empty string well)
    const validPlayers = players.filter((p) => p.puuid && p.puuid.trim() !== "");
    console.log(`Found ${validPlayers.length} players with a puuid\n`);

    if (validPlayers.length === 0) {
      console.log("No players to process.");
      return;
    }

    let totalSaved = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const player of validPlayers) {
      const result = await processPlayer(player);
      totalSaved += result.saved;
      totalSkipped += result.skipped;
      totalErrors += result.errors;
    }

    // ==================== GLOBAL RECAP ====================
    console.log("\n==================== GLOBAL RECAP ====================");
    console.log(`Players processed: ${validPlayers.length}`);
    console.log(`Total saved: ${totalSaved}`);
    console.log(`Total skipped: ${totalSkipped}`);
    console.log(`Total errors: ${totalErrors}`);
    console.log("");

    for (const player of validPlayers) {
      const stats = await SoloqMatch.aggregate([
        { $match: { puuid: player.puuid, queueId: QUEUE_ID } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            wins: { $sum: { $cond: ["$win", 1, 0] } },
            losses: { $sum: { $cond: ["$win", 0, 1] } },
          },
        },
      ]);

      if (stats.length) {
        const s = stats[0];
        const wr = s.wins + s.losses > 0 ? Math.round((s.wins / (s.wins + s.losses)) * 100) : 0;
        console.log(`  ${player.game_name}#${player.tag_line}: ${s.total} games — ${s.wins}W ${s.losses}L (${wr}% WR)`);
      } else {
        console.log(`  ${player.game_name}#${player.tag_line}: 0 games`);
      }
    }

    console.log("=====================================================");
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB disconnected");
  }
})();
