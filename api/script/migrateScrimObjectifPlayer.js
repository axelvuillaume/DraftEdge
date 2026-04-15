const mongoose = require("mongoose");
const { MONGODB_ENDPOINT } = require("../src/config.js");

async function migrate() {
  await mongoose.connect(MONGODB_ENDPOINT);
  console.log("MongoDB Connected\n");

  const collection = mongoose.connection.db.collection("scrim-objectifs");
  const objectifs = await collection.find({}).toArray();

  console.log(`Found ${objectifs.length} objectifs to check\n`);

  let migrated = 0;

  for (const obj of objectifs) {
    if (Array.isArray(obj.player)) continue;

    const player = obj.player_id ? [{ id: obj.player_id, name: obj.player_name || "" }] : [];

    await collection.updateOne(
      { _id: obj._id },
      {
        $set: { player },
        $unset: { player_id: "", player_name: "" }
      }
    );
    migrated++;
    console.log(`Migrated: ${obj.name} (${player.length} player)`);
  }

  console.log(`\nDone! ${migrated}/${objectifs.length} objectifs migrated`);
  await mongoose.disconnect();
}

migrate().catch(console.error);
