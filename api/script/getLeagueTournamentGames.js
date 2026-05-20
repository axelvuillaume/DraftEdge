require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const { MONGODB_ENDPOINT } = require("../src/config");
const Player = require("../src/models/player");
const SoloqMatch = require("../src/models/soloq-match");
const { apiFetch, getMatchById, PLATFORM_TO_REGIONAL } = require("../src/services/riotgames");

// =====================================================================
// CONFIGURATION
// =====================================================================
const PLAYER_LIMIT = 1;
const DELAY_MS = 1300; // ~46 req/min, safe sous la limite Riot
const PAGE_SIZE = 100; // max autorisé par Riot pour match-v5 ids
const IN_BATCH_SIZE = 200; // batch des $in pour Mongo M0
const BULK_SIZE = 25;
const MONGO_OPTIONS = { maxPoolSize: 5, socketTimeoutMS: 45000, serverSelectionTimeoutMS: 10000 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Clés du ParticipantDto qu'on ignore (cf. GetAllSoloQ.js)
const IGNORED_KEYS = new Set([
  "eligibleForProgression",
  "playerScore0", "playerScore1", "playerScore2", "playerScore3", "playerScore4",
  "playerScore5", "playerScore6", "playerScore7", "playerScore8", "playerScore9",
  "playerScore10", "playerScore11",
  "missions",
  "killsOnRecentlyHealedByAramPack",
  "snowballsHit", "poroExplosions",
  "placement", "subteamPlacement",
  "playerAugment1", "playerAugment2", "playerAugment3", "playerAugment4", "playerAugment5", "playerAugment6",
  "playerSubteamId",
]);

function getMatchIdsUrl(puuid, region, start) {
  const regional = PLATFORM_TO_REGIONAL[region] || "europe";
  return `https://${regional}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?type=tourney&start=${start}&count=${PAGE_SIZE}`;
}

async function fetchAllTourneyIds(puuid, region) {
  const all = [];
  let start = 0;

  while (true) {
    const ids = await apiFetch(getMatchIdsUrl(puuid, region, start));
    console.log(`    Page offset ${start}: ${ids.length} ids`);
    all.push(...ids);
    if (ids.length < PAGE_SIZE) break;
    start += PAGE_SIZE;
    await sleep(DELAY_MS);
  }

  return all;
}

function mapMatch(data, player) {
  const { metadata, info } = data;
  const p = info.participants.find((x) => x.puuid === player.puuid);
  if (!p) return null;

  const team = info.teams.find((t) => t.teamId === p.teamId);
  const opp = p.teamPosition ? info.participants.find((x) => x.teamId !== p.teamId && x.teamPosition === p.teamPosition) : null;

  const participant = {};
  for (const [key, value] of Object.entries(p)) {
    if (IGNORED_KEYS.has(key)) continue;
    participant[key] = value;
  }

  if (participant.challenges) {
    const clean = {};
    for (const [key, value] of Object.entries(participant.challenges)) {
      if (key.startsWith("SWARM_")) continue;
      if (IGNORED_KEYS.has(key)) continue;
      clean[key] = value;
    }
    participant.challenges = clean;
  }

  return {
    matchId: metadata.matchId,
    dataVersion: metadata.dataVersion,

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
    tournamentCode: info.tournamentCode,

    player_id: player._id.toString(),
    player_name: player.game_name,
    team_id: player.team_id,
    team_name: player.team_name,
    side: p.teamId === 100 ? "blue" : "red",

    ...participant,

    opponentChampion: opp?.championName,
    opponentChampionId: opp?.championId,
    opponentPuuid: opp?.puuid,

    teamObjectives: team?.objectives,
    teamBans: team?.bans,
  };
}

async function processPlayer(player) {
  const region = player.region || "euw1";
  const label = `${player.game_name}#${player.tag_line} (${region})`;
  console.log(`\n========== ${label} ==========`);

  if (!player.puuid || player.puuid.trim() === "") {
    console.log("  ⏭️  pas de puuid — skip");
    return { saved: 0, skipped: 0, errors: 0 };
  }

  const matchIds = await fetchAllTourneyIds(player.puuid, region);
  console.log(`  Found ${matchIds.length} tournament match ids`);

  if (matchIds.length === 0) return { saved: 0, skipped: 0, errors: 0 };

  const existingSet = new Set();
  for (let i = 0; i < matchIds.length; i += IN_BATCH_SIZE) {
    const batch = matchIds.slice(i, i + IN_BATCH_SIZE);
    const docs = await SoloqMatch.find({ matchId: { $in: batch }, puuid: player.puuid });
    for (const d of docs) existingSet.add(d.matchId);
  }
  const newIds = matchIds.filter((id) => !existingSet.has(id));
  console.log(`  ${existingSet.size} déjà en DB — ${newIds.length} à fetch`);

  let saved = 0;
  let skipped = 0;
  let errors = 0;
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
      const match = await getMatchById(matchId, region);
      if (!match) {
        errors++;
        if (i < newIds.length - 1) await sleep(DELAY_MS);
        continue;
      }

      if (!match.info.tournamentCode || match.info.tournamentCode.trim() === "") {
        console.log(`  [${i + 1}/${newIds.length}] ⏭️  ${matchId} skipped (no tournamentCode)`);
        skipped++;
        if (i < newIds.length - 1) await sleep(DELAY_MS);
        continue;
      }

      const doc = mapMatch(match, player);
      if (!doc) {
        console.warn(`  ⚠️  joueur introuvable dans ${matchId}`);
        errors++;
        if (i < newIds.length - 1) await sleep(DELAY_MS);
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
      console.log(`  [${i + 1}/${newIds.length}] ✅ ${matchId} — ${date} ${duration} — ${doc.championName} ${doc.win ? "W" : "L"} (${doc.kills}/${doc.deaths}/${doc.assists}) tc=${doc.tournamentCode}`);

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

(async () => {
  console.log("Connecting to MongoDB…");
  await mongoose.connect(MONGODB_ENDPOINT, MONGO_OPTIONS);
  console.log("✅ Connected\n");

  try {
    const players = await Player.find({
      is_league: true,
      puuid: { $exists: true, $ne: null },
      active: { $ne: false },
    }).limit(PLAYER_LIMIT);

    console.log(`Found ${players.length} league players (limit ${PLAYER_LIMIT})\n`);

    if (players.length === 0) {
      console.log("No league players to process.");
      return;
    }

    const recap = [];
    let totalSaved = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const player of players) {
      const { saved, skipped, errors } = await processPlayer(player);
      totalSaved += saved;
      totalSkipped += skipped;
      totalErrors += errors;
      recap.push({
        player: `${player.game_name}#${player.tag_line}`,
        region: player.region || "euw1",
        saved,
        skipped,
        errors,
      });
      await sleep(DELAY_MS);
    }

    console.log("\n==================== RECAP ====================");
    for (const r of recap) {
      console.log(`  ${r.player} (${r.region}): ${r.saved} saved, ${r.skipped} skipped, ${r.errors} errors`);
    }
    console.log(`\nTotal: ${totalSaved} saved, ${totalSkipped} skipped, ${totalErrors} errors over ${recap.length} players`);
    console.log("================================================");
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB disconnected");
  }
})();
