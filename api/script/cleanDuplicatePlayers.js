const mongoose = require("mongoose");
const { MONGODB_ENDPOINT } = require("../src/config.js");
const Player = require("../src/models/player.js");

async function main() {
  await mongoose.connect(MONGODB_ENDPOINT);
  console.log("MongoDB Connected\n");

  // Find all league players with a puuid
  const players = await Player.find({ is_league: true, puuid: { $exists: true, $ne: null } });
  console.log(`Found ${players.length} league players with puuid\n`);

  // Group by team_league_id + puuid
  const groups = {};
  for (const p of players) {
    const key = `${p.team_league_id}_${p.puuid}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  }

  let deleted = 0;

  for (const key in groups) {
    if (groups[key].length <= 1) continue;

    const dupes = groups[key];
    const hasActive = dupes.some((d) => d.active);
    if (!hasActive) continue;

    // Delete only inactive duplicates when an active one exists
    const inactive = dupes.filter((d) => !d.active);
    if (inactive.length === 0) continue;

    console.log(`\nDuplicate: ${dupes[0].player_name || dupes[0].game_name} (puuid: ${dupes[0].puuid})`);

    for (const d of inactive) {
      await Player.findByIdAndDelete(d._id);
      deleted++;
      console.log(`  Deleted inactive: ${d._id} (riot_id: ${d.riot_id})`);
    }
  }

  console.log(`\nDone! Deleted ${deleted} inactive duplicates`);
  await mongoose.disconnect();
}

main().catch(console.error);
