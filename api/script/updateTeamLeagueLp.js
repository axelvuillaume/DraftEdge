const mongoose = require("mongoose");
const { MONGODB_ENDPOINT } = require("../src/config.js");
const Player = require("../src/models/player.js");
const TeamLeague = require("../src/models/team-league.js");

const MASTER_TIERS = ["MASTER", "GRANDMASTER", "CHALLENGER"];

async function main() {
  await mongoose.connect(MONGODB_ENDPOINT);
  console.log("MongoDB Connected\n");

  const teams = await TeamLeague.find();
  console.log(`Found ${teams.length} team-leagues\n`);

  for (const team of teams) {
    const players = await Player.find({ team_league_id: team._id.toString(), is_league: true, active: true, current_tier: { $in: MASTER_TIERS } });
    const totalLp = players.sort((a, b) => (b.current_lp || 0) - (a.current_lp || 0)).slice(0, 5).reduce((sum, p) => sum + (p.current_lp || 0), 0);
    await TeamLeague.findByIdAndUpdate(team._id, { total_lp: totalLp });
    console.log(`${team.name}: ${totalLp} LP (${players.length} master+ players)`);
    for (const p of players) {
      console.log(`  - ${p.game_name}#${p.tag_line}: ${p.current_tier} ${p.current_lp || 0} LP`);
    }
  }

  console.log("\nDone!");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
