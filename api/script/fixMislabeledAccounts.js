const mongoose = require("mongoose");
const { MONGODB_ENDPOINT } = require("../src/config.js");

const SoloObjectifObject = require("../src/models/solo-objectif");
const PlayerObject = require("../src/models/player");

// One-off migration: the player seeder used to set `account` to the player's MAIN
// puuid, which made the soloq cron treat these objectifs as smurf objectifs and
// never evaluate them per-match. Remove `account` ONLY where account.puuid equals
// the player's own main puuid. Real smurf objectifs (puuid differs) are left intact.
async function run() {
  await mongoose.connect(MONGODB_ENDPOINT);
  console.log("MongoDB Connected\n");

  const objectives = await SoloObjectifObject.find({ "account.puuid": { $exists: true, $ne: null } });
  console.log(`Found ${objectives.length} objectifs with an account.puuid\n`);

  let fixed = 0;
  let keptSmurf = 0;
  let skipped = 0;

  for (const obj of objectives) {
    const player = await PlayerObject.findById(obj.player_id);
    if (!player || !player.puuid) {
      skipped++;
      continue;
    }
    if (obj.account.puuid !== player.puuid) {
      keptSmurf++;
      continue;
    }
    await SoloObjectifObject.updateOne({ _id: obj._id }, { $unset: { account: "" } });
    fixed++;
    console.log(`Fixed: ${obj.team_name} / ${obj.player_name} / ${obj.name}`);
  }

  console.log(`\nFixed (main mislabeled): ${fixed}`);
  console.log(`Kept (real smurf):       ${keptSmurf}`);
  console.log(`Skipped (no player/puuid): ${skipped}`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
