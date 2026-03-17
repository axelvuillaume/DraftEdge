const mongoose = require("mongoose");
const { MONGODB_ENDPOINT } = require("../src/config.js");
const TeamLeague = require("../src/models/team-league.js");
const Player = require("../src/models/player.js");
const { getPuuidByRiotId, getRankByPuuid } = require("../src/services/riotgames.js");

async function main() {
  await mongoose.connect(MONGODB_ENDPOINT);
  console.log("MongoDB Connected\n");

  const teamLeagues = await TeamLeague.find({ players_ids: { $exists: true, $ne: [] } });
  console.log(`Found ${teamLeagues.length} team-leagues with players\n`);

  let created = 0;
  let skipped = 0;

  for (const teamLeague of teamLeagues) {
    console.log(`\n--- ${teamLeague.name} (${teamLeague.league_name || "no league"}) ---`);

    for (let i = 0; i < teamLeague.players_ids.length; i++) {
      const riotId = teamLeague.players_ids[i];
      const playerName = teamLeague.players?.[i] || riotId;

      if (!riotId || !riotId.includes("#")) {
        console.log(`  Skipping invalid riot id: ${riotId}`);
        skipped++;
        continue;
      }

      const [gameName, tagLine] = riotId.split("#");

      console.log(`  Fetching PUUID for ${riotId}...`);
      const puuid = await getPuuidByRiotId(gameName, tagLine);

      if (!puuid) {
        console.log(`  -> PUUID not found, creating without rank`);
        const existing = await Player.findOne({ puuid, team_league_id: teamLeague._id.toString(), is_league: true });
        if (!existing) {
          await Player.create({
            player_name: playerName,
            riot_id: riotId,
            game_name: gameName,
            tag_line: tagLine,
            region: "euw1",
            is_league: true,
            league_id: teamLeague.league_id,
            league_name: teamLeague.league_name,
            team_league_id: teamLeague._id.toString(),
            team_league_name: teamLeague.name,
          });
          console.log(`  -> Created: ${riotId} (no puuid)`);
          created++;
        } else {
          console.log(`  Already exists: ${riotId}`);
          skipped++;
        }
        continue;
      }

      // Check if league player already exists for this team-league
      const existing = await Player.findOne({ puuid, team_league_id: teamLeague._id.toString(), is_league: true });
      if (existing) {
        console.log(`  Already exists: ${riotId}`);
        skipped++;
        continue;
      }

      // Fetch current rank
      const rank = await getRankByPuuid(puuid, "euw1");

      await Player.create({
        player_name: playerName,
        riot_id: riotId,
        game_name: gameName,
        tag_line: tagLine,
        puuid,
        region: "euw1",
        is_league: true,
        league_id: teamLeague.league_id,
        league_name: teamLeague.league_name,
        team_league_id: teamLeague._id.toString(),
        team_league_name: teamLeague.name,
        current_tier: rank?.tier || null,
        current_rank: rank?.rank || null,
        current_lp: rank?.leaguePoints || null,
        current_wins: rank?.wins || 0,
        current_losses: rank?.losses || 0,
        last_fetched_at: rank ? new Date() : null,
        connected_at: new Date(),
      });

      console.log(`  -> Created: ${riotId} (${rank?.tier || "unranked"} ${rank?.rank || ""})`);
      created++;
    }
  }

  console.log(`\nDone! Created: ${created}, Skipped: ${skipped}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
