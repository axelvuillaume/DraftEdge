require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const { MONGODB_ENDPOINT } = require("../src/config.js");
const Game = require("../src/models/game.js");
const ScrimSession = require("../src/models/scrim-session.js");
const EnemyTeam = require("../src/models/enemy-team.js");

const NO_OPPONENT_ID_FILTER = {
  opponent_name: { $ne: null, $exists: true, $nin: [""] },
  $or: [{ opponent_id: null }, { opponent_id: { $exists: false } }, { opponent_id: "" }],
};

async function findOrCreateEnemyTeam(team_id, team_name, opponent_name, stats) {
  let enemyTeam = await EnemyTeam.findOne({ team_id, name: opponent_name });

  if (enemyTeam) {
    stats.reused++;
    console.log(`  FOUND  enemy team "${opponent_name}" (${enemyTeam._id})`);
  } else {
    enemyTeam = await EnemyTeam.create({ name: opponent_name, team_id, team_name: team_name || "Unknown" });
    stats.created++;
    console.log(`  CREATE enemy team "${opponent_name}" (${enemyTeam._id})`);
  }

  return enemyTeam;
}

function groupByOpponent(docs) {
  const groups = {};
  for (const doc of docs) {
    const key = `${doc.team_id || "NO_TEAM"}|||${doc.opponent_name}`;
    if (!groups[key]) {
      groups[key] = { team_id: doc.team_id, team_name: doc.team_name, opponent_name: doc.opponent_name, ids: [] };
    }
    groups[key].ids.push(doc._id);
  }
  return groups;
}

async function run() {
  await mongoose.connect(MONGODB_ENDPOINT);
  console.log("MongoDB Connected\n");

  const stats = { created: 0, reused: 0, gamesUpdated: 0, sessionsUpdated: 0 };

  // ==================== GAMES ====================
  console.log("=== GAMES ===");
  const games = await Game.find(NO_OPPONENT_ID_FILTER).lean();
  console.log(`Found ${games.length} game(s) with opponent_name but no opponent_id\n`);

  const gameGroups = groupByOpponent(games);
  for (const [, group] of Object.entries(gameGroups)) {
    const { team_id, team_name, opponent_name, ids } = group;
    if (!team_id) {
      console.log(`  SKIP "${opponent_name}" — no team_id`);
      continue;
    }

    const enemyTeam = await findOrCreateEnemyTeam(team_id, team_name, opponent_name, stats);
    const result = await Game.updateMany({ _id: { $in: ids } }, { $set: { opponent_id: enemyTeam._id.toString() } });
    stats.gamesUpdated += result.modifiedCount;
    console.log(`  -> Updated ${result.modifiedCount} game(s)\n`);
  }

  // ==================== SCRIM SESSIONS ====================
  console.log("=== SCRIM SESSIONS ===");
  const sessions = await ScrimSession.find(NO_OPPONENT_ID_FILTER).lean();
  console.log(`Found ${sessions.length} scrim session(s) with opponent_name but no opponent_id\n`);

  const sessionGroups = groupByOpponent(sessions);
  for (const [, group] of Object.entries(sessionGroups)) {
    const { team_id, team_name, opponent_name, ids } = group;
    if (!team_id) {
      console.log(`  SKIP "${opponent_name}" — no team_id`);
      continue;
    }

    const enemyTeam = await findOrCreateEnemyTeam(team_id, team_name, opponent_name, stats);
    const result = await ScrimSession.updateMany({ _id: { $in: ids } }, { $set: { opponent_id: enemyTeam._id.toString() } });
    stats.sessionsUpdated += result.modifiedCount;
    console.log(`  -> Updated ${result.modifiedCount} scrim session(s)\n`);
  }

  // ==================== SUMMARY ====================
  console.log("=== DONE ===");
  console.log(`Enemy teams created:      ${stats.created}`);
  console.log(`Enemy teams reused:       ${stats.reused}`);
  console.log(`Games updated:            ${stats.gamesUpdated}`);
  console.log(`Scrim sessions updated:   ${stats.sessionsUpdated}`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
