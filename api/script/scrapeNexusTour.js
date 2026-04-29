const puppeteer = require("puppeteer");
const mongoose = require("mongoose");
const { MONGODB_ENDPOINT } = require("../src/config.js");
const TeamLeague = require("../src/models/team-league.js");
const Player = require("../src/models/player.js");
const { getPuuidByRiotId, getRankByPuuid } = require("../src/services/riotgames.js");

const BASE_URL = "https://www.opentourfrance.fr/fr/tournaments/2367635332179073023/participants/";
const LEAGUE_ID = "69b19b7b9453d5bb395b88fe";
const LEAGUE_NAME = "Nexus Tour LFL3";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Normalize name for fuzzy matching: lowercase, no spaces, no special chars
function normalize(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

async function createOrUpdatePlayer(riotId, playerName, teamLeague) {
  if (!riotId || !riotId.includes("#")) return;

  const [gameName, tagLine] = riotId.split("#");

  // Fast path: exact riot_id match — no Riot API call needed
  const existingByRiotId = await Player.findOne({ team_league_id: teamLeague._id.toString(), riot_id: riotId, is_league: true });

  if (existingByRiotId) {
    await Player.findByIdAndUpdate(existingByRiotId._id, { active: true, riot_id: riotId, game_name: gameName, tag_line: tagLine, player_name: playerName });
    console.log(`    Player exists: ${riotId} (skipped)`);
    return;
  }

  // Riot ID not found — fetch puuid to check for rename (same player, new game name/tag)
  let puuid = null;
  try {
    puuid = await getPuuidByRiotId(gameName, tagLine);
    await sleep(100);
  } catch (err) {
    console.log(`    -> Riot API error: ${err.message}`);
  }

  if (puuid) {
    const existingByPuuid = await Player.findOne({ team_league_id: teamLeague._id.toString(), puuid, is_league: true });
    if (existingByPuuid) {
      await Player.findByIdAndUpdate(existingByPuuid._id, { active: true, riot_id: riotId, game_name: gameName, tag_line: tagLine, player_name: playerName });
      console.log(`    Player renamed: ${existingByPuuid.riot_id} -> ${riotId} (matched by puuid)`);
      return;
    }
  }

  let rank = null;
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

  const existingTeams = await TeamLeague.find({ league_id: LEAGUE_ID });
  console.log(`Found ${existingTeams.length} existing teams in DB\n`);

  const browser = await puppeteer.launch({ headless: true, defaultViewport: null });
  const page = await browser.newPage();

  // 1. Go to participants page and load ALL teams
  await page.goto(BASE_URL, { waitUntil: "networkidle2" });
  await page.waitForSelector("a[href*='/participants/']", { timeout: 15000 });

  // Click "Charger plus" until there are no more teams to load
  let loadMoreClicks = 0;
  while (true) {
    const clicked = await page.evaluate(() => {
      const buttons = [...document.querySelectorAll("button, a, div[role='button']")];
      const loadMore = buttons.find((el) => el.textContent.toLowerCase().includes("charger plus") || el.textContent.toLowerCase().includes("load more"));
      if (!loadMore) return false;
      loadMore.scrollIntoView();
      loadMore.click();
      return true;
    });
    if (!clicked) break;
    loadMoreClicks++;
    console.log(`Clicked "Charger plus" (${loadMoreClicks})`);
    await sleep(2000);
  }
  console.log(`Done loading — clicked ${loadMoreClicks} times\n`);

  // 2. Collect all team links
  const teamLinks = await page.evaluate(() => {
    const links = document.querySelectorAll("a[href*='/participants/']");
    const seen = new Set();
    const results = [];
    links.forEach((a) => {
      const href = a.href;
      const match = href.match(/\/participants\/(\d+)/);
      if (!match) return;
      if (seen.has(match[1])) return;
      seen.add(match[1]);
      const name = a.textContent.trim() || a.querySelector("img")?.alt || "Unknown";
      results.push({ href, name });
    });
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
      await sleep(2000);

      // Click "À propos" tab if it exists
      await page.evaluate(() => {
        const els = [...document.querySelectorAll("a, button, div[role='tab'], span")];
        const tab = els.find((el) => el.textContent.toLowerCase().includes("propos"));
        if (tab) tab.click();
      });
      await sleep(2000);

      // Extract structured data from About page text
      const data = await page.evaluate(() => {
        const body = document.body.innerText;
        const lines = body
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);

        const players = [];
        const replacements = [];
        const staff = [];
        const contactMap = {};

        // Parse discord info: the value is on the NEXT line after the label
        for (let i = 0; i < lines.length; i++) {
          const lower = lines[i].toLowerCase();
          const nextVal = lines[i + 1] || "";
          if (lower.includes("discord") && lower.includes("capitaine") && nextVal) {
            if (!contactMap["Captain"]) contactMap["Captain"] = { name: "", role: "Captain", twitter: "", discord: "" };
            contactMap["Captain"].discord = nextVal;
          }
          if (lower.includes("discord") && (lower.includes("coach") || lower.includes("manager")) && nextVal) {
            if (!contactMap["Manager"]) contactMap["Manager"] = { name: "", role: "Manager", twitter: "", discord: "" };
            contactMap["Manager"].discord = nextVal;
          }
        }

        const contacts = Object.values(contactMap).filter((c) => c.name || c.discord || c.twitter);

        // Parse lineup: each player card is structured as:
        //   PlayerName
        //   Riot ID (avec le #)
        //   ActualRiotID
        //   Rôle
        //   Titulaire / Remplaçant / Coach
        const lineupStart = lines.findIndex((l) => l.toLowerCase() === "lineup");
        if (lineupStart !== -1) {
          for (let i = lineupStart + 1; i < lines.length; i++) {
            if (lines[i].toLowerCase() !== "rôle" || !lines[i + 1]) continue;
            const role = lines[i + 1].toLowerCase();
            const playerName = lines[i - 3] || "";
            const riotId = lines[i - 1] || "";

            if (!playerName || playerName.toLowerCase() === "lineup" || playerName.toLowerCase().includes("riot id")) continue;
            if (!riotId || !riotId.includes("#")) continue;

            const entry = { name: playerName, riot_id: riotId };

            if (role.includes("titulaire")) players.push(entry);
            if (role.includes("remplaç") || role.includes("remplacement")) replacements.push(entry);
            if (role.includes("coach") || role.includes("manager") || role.includes("staff")) staff.push(entry);
          }
        }

        return { players, replacements, staff, contacts };
      });

      if (data.players.length === 0) {
        console.log(`  Skipped (empty roster)`);
        continue;
      }

      console.log(`  Players: ${data.players.map((p) => `${p.name} (${p.riot_id})`).join(", ")}`);
      if (data.replacements.length > 0) console.log(`  Replacements: ${data.replacements.map((p) => `${p.name} (${p.riot_id})`).join(", ")}`);
      if (data.staff.length > 0) console.log(`  Staff: ${data.staff.map((p) => `${p.name} (${p.riot_id})`).join(", ")}`);
      if (data.contacts.length > 0) console.log(`  Contacts: ${data.contacts.map((c) => `${c.role}: ${c.name || "?"} [${c.discord || "-"}] [${c.twitter || "-"}]`).join(", ")}`);

      // Find existing team by normalized name
      const normalizedScraped = normalize(team.name);
      const existing = existingTeams.find((t) => normalize(t.name) === normalizedScraped);

      let teamLeague;

      if (existing) {
        // Move old titulaires that are not in the new roster to old_players
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
            replacements: data.replacements,
            staff: data.staff,
            old_players: oldPlayers,
            contacts: data.contacts,
          },
          { new: true },
        );

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
          replacements: data.replacements,
          staff: data.staff,
          contacts: data.contacts,
        });
        saved++;
        console.log(`  -> Created new team`);
      }

      // Sync Player documents for titulaires
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
