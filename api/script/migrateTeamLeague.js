const mongoose = require("mongoose");
const { MONGODB_ENDPOINT } = require("../src/config.js");

async function migrate() {
  await mongoose.connect(MONGODB_ENDPOINT);
  console.log("MongoDB Connected\n");

  const collection = mongoose.connection.db.collection("team-leagues");
  const teams = await collection.find({}).toArray();

  console.log(`Found ${teams.length} teams to migrate\n`);

  let migrated = 0;

  for (const team of teams) {
    const update = {};

    // Migrate players + players_ids -> players: [{ name, riot_id }]
    if (team.players_ids && team.players_ids.length > 0 && typeof team.players?.[0] === "string") {
      update.players = team.players.map((name, i) => ({ name, riot_id: team.players_ids[i] || "" }));
      update.$unset = { ...update.$unset, players_ids: "" };
    }

    // Migrate staff + staff_ids -> staff: [{ name, riot_id }]
    if (team.staff_ids && team.staff_ids.length > 0 && typeof team.staff?.[0] === "string") {
      update.staff = team.staff.map((name, i) => ({ name, riot_id: team.staff_ids[i] || "" }));
      if (!update.$unset) update.$unset = {};
      update.$unset.staff_ids = "";
    }

    // Migrate replacements + replacements_ids -> replacements: [{ name, riot_id }]
    if (team.replacements_ids && team.replacements_ids.length > 0 && typeof team.replacements?.[0] === "string") {
      update.replacements = team.replacements.map((name, i) => ({ name, riot_id: team.replacements_ids[i] || "" }));
      if (!update.$unset) update.$unset = {};
      update.$unset.replacements_ids = "";
    }

    // Migrate discord_manager / discord_captain -> contacts
    if ((team.discord_manager || team.discord_captain) && !team.contacts?.length) {
      const contacts = [];
      if (team.discord_manager) contacts.push({ name: "", role: "Manager", twitter: "", discord: team.discord_manager });
      if (team.discord_captain) contacts.push({ name: "", role: "Captain", twitter: "", discord: team.discord_captain });
      update.contacts = contacts;
      if (!update.$unset) update.$unset = {};
      update.$unset.discord_manager = "";
      update.$unset.discord_captain = "";
    }

    if (!Object.keys(update).length) continue;

    const { $unset, ...setFields } = update;
    const mongoUpdate = {};
    if (Object.keys(setFields).length > 0) mongoUpdate.$set = setFields;
    if ($unset) mongoUpdate.$unset = $unset;

    await collection.updateOne({ _id: team._id }, mongoUpdate);
    migrated++;
    console.log(`Migrated: ${team.name} (players: ${update.players?.length || "-"}, staff: ${update.staff?.length || "-"}, contacts: ${update.contacts?.length || "-"})`);
  }

  console.log(`\nDone! ${migrated}/${teams.length} teams migrated`);
  await mongoose.disconnect();
}

migrate().catch(console.error);
