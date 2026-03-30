const puppeteer = require("puppeteer");
const mongoose = require("mongoose");
const { MONGODB_ENDPOINT } = require("../src/config.js");
const TeamLeague = require("../src/models/team-league.js");
const Player = require("../src/models/player.js");
const { getPuuidByRiotId, getRankByPuuid } = require("../src/services/riotgames.js");

const BASE_URL = "https://play.toornament.com/en_US/tournaments/2399602823406704639/participants/";
const LEAGUE_ID = "69b19b7b9453d5bb395b88fe";
const LEAGUE_NAME = "Nexus Tour LFL3";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Normalize name for fuzzy matching: lowercase, no spaces, no special chars
function normalize(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

async function createOrUpdatePlayer(riotId, playerName, teamLeague) {
  if (!riotId || !riotId.includes("#")) return;

  const [gameName, tagLine] = riotId.split("#");

  // Fetch puuid first so we can match by puuid
  let puuid = null;
  let rank = null;

  try {
    puuid = await getPuuidByRiotId(gameName, tagLine);
    await sleep(100);
  } catch (err) {
    console.log(`    -> Riot API error: ${err.message}`);
  }

  // Check if player already exists for this team (by puuid if available, fallback to riot_id)
  let existing = null;
  if (puuid) {
    existing = await Player.findOne({ team_league_id: teamLeague._id.toString(), puuid, is_league: true });
  }
  if (!existing) {
    existing = await Player.findOne({ team_league_id: teamLeague._id.toString(), riot_id: riotId, is_league: true });
  }

  if (existing) {
    // Update riot_id/name if changed, make sure active
    await Player.findByIdAndUpdate(existing._id, {
      active: true,
      riot_id: riotId,
      game_name: gameName,
      tag_line: tagLine,
      player_name: playerName,
      ...(puuid ? { puuid } : {}),
    });
    console.log(`    Player exists: ${riotId} (updated)`);
    return;
  }

  // New player — fetch rank
  try {
    if (puuid) {
      rank = await getRankByPuuid(puuid, "euw1");
      await sleep(100);
    }
  } catch (err) {
    console.log(`    -> Riot API error: ${err.message}`);
  }

  await Player.create({
    player_name: playerName,
    riot_id: riotId,
    game_name: gameName,
    tag_line: tagLine,
    puuid: puuid || undefined,
    region: "euw1",
    is_league: true,
    active: true,
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

  console.log(`    -> Created: ${riotId} (${rank?.tier || "unranked"} ${rank?.rank || ""} ${rank?.leaguePoints ? rank.leaguePoints + " LP" : ""})`);
}

async function deactivateOldPlayers(removedPlayers, teamLeagueId) {
  for (const removed of removedPlayers) {
    await Player.updateMany({ team_league_id: teamLeagueId, riot_id: removed.riot_id, is_league: true }, { active: false });
    console.log(`    Deactivated: ${removed.name} (${removed.riot_id})`);
  }
}

async function scrape() {
  await mongoose.connect(MONGODB_ENDPOINT);
  console.log("MongoDB Connected\n");

  // Load existing teams to match by normalized name
  const existingTeams = await TeamLeague.find({ league_id: LEAGUE_ID });
  console.log(`Found ${existingTeams.length} existing teams in DB\n`);

  const browser = await puppeteer.launch({ headless: true, defaultViewport: null });
  const page = await browser.newPage();

  // 1. Go to participants page and load ALL teams
  await page.goto(BASE_URL, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 3000));

  // Click "Load more" until all teams are visible
  let loadMoreClicks = 0;
  while (true) {
    const clicked = await page.evaluate(() => {
      const btn = document.querySelector(".dl-toolbar-load-more button");
      if (!btn) return false;
      btn.scrollIntoView();
      btn.click();
      return true;
    });
    if (!clicked) break;
    loadMoreClicks++;
    console.log(`Clicked "Load more" (${loadMoreClicks})`);
    await new Promise((r) => setTimeout(r, 2000));
  }
  console.log(`Done loading — clicked ${loadMoreClicks} times\n`);

  // 2. Collect all team links (filter real team links with participant IDs)
  const teamLinks = await page.evaluate(() => {
    const links = [...document.querySelectorAll("a.concerto.block.custom.block")];
    const seen = new Set();
    const results = [];
    for (const a of links) {
      const match = a.href.match(/\/participants\/(\d+)\//);
      if (!match) continue;
      if (seen.has(match[1])) continue;
      seen.add(match[1]);
      results.push({ href: a.href, name: a.textContent.trim() });
    }
    return results;
  });

  console.log(`Found ${teamLinks.length} teams\n`);

  let saved = 0;
  let updated = 0;

  // 3. Visit each team page
  for (const team of teamLinks) {
    console.log(`\n--- ${team.name} ---`);
    try {
      await page.goto(team.href, { waitUntil: "networkidle2" });
      await new Promise((r) => setTimeout(r, 2000));

      // Click "About" tab
      await page.evaluate(() => {
        const links = [...document.querySelectorAll("a")];
        const about = links.find((a) => a.textContent.trim() === "About");
        if (about) about.click();
      });
      await new Promise((r) => setTimeout(r, 3000));

      // Extract data from About page text
      const data = await page.evaluate(() => {
        const body = document.body.innerText;
        const lines = body
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);

        const players = [];
        const contacts = [];

        // Parse custom fields (label/value pairs)
        const contactFields = {
          coach: "name",
          "discord coach": "discord",
          "twitter coach": "twitter",
          manager: "name",
          "discord manager": "discord",
          "twitter manager": "twitter",
          capitaine: "name",
          captain: "name",
          "discord capitaine": "discord",
          "discord captain": "discord",
          "twitter capitaine": "twitter",
          "twitter captain": "twitter",
          "twitter team": null,
          "twitter equipe": null,
          "twitter équipe": null,
        };

        function getRole(label) {
          if (label.includes("coach")) return "Coach";
          if (label.includes("manager")) return "Manager";
          if (label.includes("capitaine") || label.includes("captain")) return "Captain";
          if (label.includes("team") || label.includes("equipe") || label.includes("équipe")) return "Team";
          return null;
        }

        const contactMap = {};

        for (let i = 0; i < lines.length; i++) {
          const lower = lines[i].toLowerCase();
          const nextVal = lines[i + 1] || "";

          const matchedKey = Object.keys(contactFields).find((k) => lower === k);
          if (!matchedKey) continue;

          const role = getRole(matchedKey);
          if (!role) continue;
          if (!contactMap[role]) contactMap[role] = { name: "", role, twitter: "", discord: "" };

          const field = contactFields[matchedKey];
          if (field) {
            contactMap[role][field] = nextVal;
          }
        }

        // Handle "Twitter Team" separately
        for (let i = 0; i < lines.length; i++) {
          const lower = lines[i].toLowerCase();
          if (lower === "twitter team" || lower === "twitter equipe" || lower === "twitter équipe") {
            if (!contactMap["Team"]) contactMap["Team"] = { name: "", role: "Team", twitter: "", discord: "" };
            contactMap["Team"].twitter = lines[i + 1] || "";
          }
        }

        for (const key in contactMap) {
          if (contactMap[key].name || contactMap[key].discord || contactMap[key].twitter) {
            contacts.push(contactMap[key]);
          }
        }

        // Parse lineup: pattern is PlayerName -> "Game ID" -> ActualID#Tag
        for (let i = 0; i < lines.length; i++) {
          if (lines[i] !== "Game ID") continue;
          const gameId = lines[i + 1] || "";
          if (!gameId || !gameId.includes("#")) continue;
          const playerName = lines[i - 1] || "";
          if (!playerName || playerName === "Lineup" || playerName === "No information.") continue;

          players.push({ name: playerName, riot_id: gameId });
        }

        return { players, contacts };
      });

      if (data.players.length === 0) {
        console.log(`  Skipped (empty roster)`);
        continue;
      }

      console.log(`  Players: ${data.players.map((p) => `${p.name} (${p.riot_id})`).join(", ")}`);
      if (data.contacts.length > 0) console.log(`  Contacts: ${data.contacts.map((c) => `${c.role}: ${c.name || "?"} [${c.discord || "-"}] [${c.twitter || "-"}]`).join(", ")}`);

      // Find existing team by normalized name
      const normalizedScraped = normalize(team.name);
      const existing = existingTeams.find((t) => normalize(t.name) === normalizedScraped);

      let teamLeague;

      if (existing) {
        // Move old players that are not in the new roster to old_players
        const newRiotIds = new Set(data.players.map((p) => p.riot_id));
        const removedPlayers = (existing.players || []).filter((p) => !newRiotIds.has(p.riot_id));
        const oldPlayers = [...(existing.old_players || [])];
        for (const removed of removedPlayers) {
          if (!oldPlayers.some((o) => o.riot_id === removed.riot_id)) {
            oldPlayers.push(removed);
          }
        }

        teamLeague = await TeamLeague.findByIdAndUpdate(
          existing._id,
          {
            players: data.players,
            old_players: oldPlayers,
            contacts: data.contacts,
          },
          { new: true },
        );

        // Deactivate removed players
        if (removedPlayers.length > 0) {
          console.log(`  Old players:`);
          await deactivateOldPlayers(removedPlayers, existing._id.toString());
        }

        updated++;
        console.log(`  -> Updated existing team (${existing.name})`);
      }
      if (!existing) {
        teamLeague = await TeamLeague.create({
          name: team.name,
          league_id: LEAGUE_ID,
          league_name: LEAGUE_NAME,
          players: data.players,
          contacts: data.contacts,
        });
        saved++;
        console.log(`  -> Created new team`);
      }

      // Create/update Player documents for each player
      console.log(`  Syncing players...`);
      for (const p of data.players) {
        await createOrUpdatePlayer(p.riot_id, p.name, teamLeague);
      }

      // Update total_lp: top 5 master+ players
      const masterPlayers = await Player.find({ team_league_id: teamLeague._id.toString(), is_league: true, active: true, current_tier: { $in: ["MASTER", "GRANDMASTER", "CHALLENGER"] } });
      const totalLp = masterPlayers
        .sort((a, b) => (b.current_lp || 0) - (a.current_lp || 0))
        .slice(0, 5)
        .reduce((sum, p) => sum + (p.current_lp || 0), 0);
      await TeamLeague.findByIdAndUpdate(teamLeague._id, { total_lp: totalLp });
      console.log(`  Total LP: ${totalLp} (${Math.min(masterPlayers.length, 5)} master+ players)`);
    } catch (err) {
      console.log(`  Error: ${err.message}`);
    }
  }

  console.log(`\nDone! ${saved} created, ${updated} updated out of ${teamLinks.length} teams`);

  await browser.close();
  await mongoose.disconnect();
}

scrape().catch(console.error);
