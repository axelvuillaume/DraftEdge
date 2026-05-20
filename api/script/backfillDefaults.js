const mongoose = require("mongoose");
const { MONGODB_ENDPOINT } = require("../src/config.js");

const TeamObject = require("../src/models/team");
const PlayerObject = require("../src/models/player");
const StratMapObject = require("../src/models/strat-map");
const ReplayBookObject = require("../src/models/replay-book");
const ScrimObjectifObject = require("../src/models/scrim-objectif");
const DraftScenarioObject = require("../src/models/draft-scenario");
const SoloObjectifObject = require("../src/models/solo-objectif");

const { seedStratMaps, seedReplayBook, seedScrimObjectifs, seedDraftScenarios } = require("../src/seeders/team-defaults");
const { seedPlayerSoloObjectifs } = require("../src/seeders/player-defaults");

async function backfillTeam(team) {
  const teamId = team._id.toString();
  const stratCount = await StratMapObject.countDocuments({ team_id: teamId });
  const replayCount = await ReplayBookObject.countDocuments({ team_id: teamId });
  const scrimCount = await ScrimObjectifObject.countDocuments({ team_id: teamId });
  const draftCount = await DraftScenarioObject.countDocuments({ team_id: teamId });

  const nashStratMapId = new mongoose.Types.ObjectId();
  const seeded = [];

  if (stratCount === 0) {
    await seedStratMaps(team, { nashStratMap: nashStratMapId });
    seeded.push("strat-maps");
  }

  if (replayCount === 0) {
    await seedReplayBook(team);
    seeded.push("replay-books");
  }

  if (scrimCount === 0) {
    const existingNash = stratCount === 0 ? null : await StratMapObject.findOne({ team_id: teamId, nash_type: "nash2" });
    await seedScrimObjectifs(team, { nashStratMap: existingNash?._id || nashStratMapId });
    seeded.push("scrim-objectifs");
  }

  if (draftCount === 0) {
    await seedDraftScenarios(team);
    seeded.push("draft-scenarios");
  }

  return seeded;
}

async function backfill() {
  await mongoose.connect(MONGODB_ENDPOINT);
  console.log("MongoDB Connected\n");

  const teams = await TeamObject.find({ subscription_status: { $ne: "canceled" } });
  console.log(`Found ${teams.length} non-canceled teams\n`);

  let teamsTouched = 0;
  for (const team of teams) {
    const seeded = await backfillTeam(team);
    if (seeded.length === 0) continue;
    teamsTouched++;
    console.log(`Team ${team.name} (${team._id}) → seeded: ${seeded.join(", ")}`);
  }
  console.log(`\nTeams: ${teamsTouched}/${teams.length} backfilled\n`);

  const teamIds = teams.map((t) => t._id.toString());
  const players = await PlayerObject.find({ team_id: { $in: teamIds }, active: true });
  console.log(`Found ${players.length} active players in non-canceled teams\n`);

  let playersTouched = 0;
  for (const player of players) {
    const count = await SoloObjectifObject.countDocuments({ player_id: player._id.toString() });
    if (count > 0) continue;
    const created = await seedPlayerSoloObjectifs(player);
    if (!created || created.length === 0) continue;
    playersTouched++;
    console.log(`Player ${player.game_name} (${player._id}) [${player.role}] → seeded ${created.length} solo-objectifs`);
  }
  console.log(`\nPlayers: ${playersTouched}/${players.length} backfilled`);

  await mongoose.disconnect();
}

backfill().catch((err) => {
  console.error(err);
  process.exit(1);
});
