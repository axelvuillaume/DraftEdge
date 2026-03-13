const mongoose = require("mongoose");
const { MONGODB_ENDPOINT } = require("../src/config");
const EnemyTeam = require("../src/models/enemy-team");
const Game = require("../src/models/game");
const PlayerStats = require("../src/models/player-stats");

async function fetchEnemyRosters() {
  await mongoose.connect(MONGODB_ENDPOINT);
  console.log("MongoDB connected");

  const enemyTeams = await EnemyTeam.find();
  console.log(`Found ${enemyTeams.length} enemy teams`);

  for (const enemy of enemyTeams) {
    // Trouver la dernière game contre cette enemy team
    const lastGame = await Game.findOne({ opponent_id: enemy._id.toString() }).sort({ date: -1 });

    if (!lastGame) {
      console.log(`[${enemy.name}] No game found, skipping`);
      continue;
    }

    // Récupérer les joueurs adverses de cette game
    const opponentPlayers = await PlayerStats.find({ game_id: lastGame._id.toString(), opponent: true }).sort({ role: 1 });

    if (!opponentPlayers.length) {
      console.log(`[${enemy.name}] No opponent players found in game ${lastGame._id}, skipping`);
      continue;
    }

    // Construire le roster: "summonerName#tagLine"
    const roster = opponentPlayers.filter((p) => p.summoner_name).map((p) => (p.riot_tag ? `${p.summoner_name}#${p.riot_tag}` : p.summoner_name));

    console.log(`[${enemy.name}] Last game: ${lastGame.date?.toISOString().slice(0, 10) || "no date"} — Roster (${roster.length}):`, roster.join(", "));

    await EnemyTeam.findByIdAndUpdate(enemy._id, {
      players_ids: roster,
      multi_opgg: `https://www.op.gg/multisearch/euw?summoners=${roster.map((id) => encodeURIComponent(id)).join(",")}`,
    });
  }

  console.log("Done!");
  await mongoose.disconnect();
}

fetchEnemyRosters().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
