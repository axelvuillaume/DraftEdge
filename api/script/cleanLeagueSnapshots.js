const mongoose = require("mongoose");
const { MONGODB_ENDPOINT } = require("../src/config");
const Player = require("../src/models/player");
const SoloQSnapshot = require("../src/models/soloq-snapshot");

async function run() {
  await mongoose.connect(MONGODB_ENDPOINT);
  console.log("Connected to MongoDB");

  const leaguePlayers = await Player.find({ is_league: true });
  console.log(`Found ${leaguePlayers.length} league players`);

  const leaguePlayerIds = leaguePlayers.map((p) => p._id.toString());

  const count = await SoloQSnapshot.countDocuments({ player_id: { $in: leaguePlayerIds } });
  console.log(`Found ${count} snapshots to delete`);

  if (count === 0) {
    console.log("Nothing to delete");
    await mongoose.disconnect();
    return;
  }

  const result = await SoloQSnapshot.deleteMany({ player_id: { $in: leaguePlayerIds } });
  console.log(`Deleted ${result.deletedCount} useless snapshots`);

  await mongoose.disconnect();
  console.log("Done");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
