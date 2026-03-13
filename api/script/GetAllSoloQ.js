require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const { MONGODB_ENDPOINT } = require("../src/config");
const SoloqMatch = require("../src/models/soloq-match");
const Player = require("../src/models/player");
const { apiFetch, PLATFORM_TO_REGIONAL } = require("../src/services/riotgames");

// =====================================================================
// CONFIGURATION
// =====================================================================
const SEASON_START = new Date("2026-01-08T00:00:00Z");
const QUEUE_ID = 420; // Ranked Solo/Duo
const DELAY_MS = 1300; // ~46 req/min — safe under 100 req/2 min
const IN_BATCH_SIZE = 200; // Max IDs per $in query (M0 safe)
const MONGO_OPTIONS = { maxPoolSize: 5, socketTimeoutMS: 45000, serverSelectionTimeoutMS: 10000 };

function getMatchV5Base(region) {
  const regional = PLATFORM_TO_REGIONAL[region] || "europe";
  return `https://${regional}.api.riotgames.com/lol/match/v5/matches`;
}

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

async function fetchAllMatchIds(puuid, region) {
  const base = getMatchV5Base(region);
  const startTime = Math.floor(SEASON_START.getTime() / 1000);
  const all = [];
  let start = 0;

  while (true) {
    const url = `${base}/by-puuid/${puuid}/ids?startTime=${startTime}&queue=${QUEUE_ID}&start=${start}&count=100`;
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
  const region = player.region || "euw1";
  const base = getMatchV5Base(region);
  const label = `${player.game_name}#${player.tag_line} (${region})`;
  console.log(`\n========== ${label} ==========`);

  const matchIds = await fetchAllMatchIds(player.puuid, region);
  console.log(`  Found ${matchIds.length} ranked solo/duo matches`);

  if (matchIds.length === 0) return { saved: 0, skipped: 0, errors: 0 };

  // Batch the $in query to avoid huge queries on M0
  const existingSet = new Set();
  for (let i = 0; i < matchIds.length; i += IN_BATCH_SIZE) {
    const batch = matchIds.slice(i, i + IN_BATCH_SIZE);
    const docs = await SoloqMatch.find({ matchId: { $in: batch }, puuid: player.puuid }, { matchId: 1 }).lean();
    for (const d of docs) existingSet.add(d.matchId);
  }
  const newIds = matchIds.filter((id) => !existingSet.has(id));
  console.log(`  ${existingSet.size} already in DB — ${newIds.length} new to fetch`);

  let saved = 0;
  let skipped = 0;
  let errors = 0;
  const BULK_SIZE = 25;
  let bulkOps = [];

  async function flushBulk() {
    if (bulkOps.length === 0) return;
    const ops = bulkOps;
    bulkOps = [];
    try {
      const result = await SoloqMatch.bulkWrite(ops, { ordered: false });
      saved += result.upsertedCount + result.modifiedCount;
    } catch (err) {
      const partial = err.result;
      if (partial) saved += (partial.nUpserted || 0) + (partial.nModified || 0);
      errors += ops.length - ((partial?.nUpserted || 0) + (partial?.nModified || 0));
      console.error(`  ❌ bulkWrite failed (${ops.length} ops): ${err.message}`);
    }
  }

  for (let i = 0; i < newIds.length; i++) {
    const matchId = newIds[i];
    try {
      const data = await apiFetch(`${base}/${matchId}`);

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

      bulkOps.push({
        updateOne: {
          filter: { matchId: doc.matchId, puuid: doc.puuid },
          update: { $set: doc },
          upsert: true,
        },
      });

      const date = doc.gameDate ? doc.gameDate.toISOString().slice(0, 10) : "?";
      const duration = doc.gameDuration ? `${Math.floor(doc.gameDuration / 60)}m${doc.gameDuration % 60}s` : "?";
      console.log(`  [${i + 1}/${newIds.length}] ✅ ${matchId} — ${date} ${duration} — ${doc.championName} ${doc.win ? "W" : "L"} (${doc.kills}/${doc.deaths}/${doc.assists})`);

      if (bulkOps.length >= BULK_SIZE) await flushBulk();
    } catch (err) {
      errors++;
      console.error(`  [${i + 1}/${newIds.length}] ❌ ${matchId}: ${err.message}`);
    }

    if (i < newIds.length - 1) await sleep(DELAY_MS);
  }

  await flushBulk();
  console.log(`  => ${saved} saved, ${skipped} skipped, ${errors} errors`);
  return { saved, skipped, errors };
}

// =====================================================================
// MAIN
// =====================================================================

(async () => {
  // ⬇️ Mettre un team_id ici pour filtrer sur une seule équipe, ou null pour tout récupérer
  const TEAM_ID = "697cb58fc93718dc53d6408b";

  console.log("Connecting to MongoDB…");
  await mongoose.connect(MONGODB_ENDPOINT, MONGO_OPTIONS);
  console.log("✅ Connected\n");

  try {
    const query = { puuid: { $exists: true, $ne: null }, connected_at: { $exists: true, $ne: null } };
    if (TEAM_ID) query.team_id = TEAM_ID;

    const players = await Player.find(query).lean();
    // Filter out empty strings (lean doesn't apply $ne to empty string well)
    const validPlayers = players.filter((p) => p.puuid && p.puuid.trim() !== "");

    if (TEAM_ID) {
      console.log(`Filtering on team_id: ${TEAM_ID}`);
    }
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

    // Per-player stats — avoids a single heavy aggregation on M0
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
      const s = stats[0];
      if (s) {
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
