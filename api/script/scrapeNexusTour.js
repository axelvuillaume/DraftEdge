const puppeteer = require("puppeteer");
const mongoose = require("mongoose");
const { MONGODB_ENDPOINT } = require("../src/config.js");
const TeamLeague = require("../src/models/teamLeague.js");

const BASE_URL = "https://www.opentourfrance.fr/fr/tournaments/2367625949264826367/participants/";
const LEAGUE_ID = "69b19b7b9453d5bb395b88fe";
const LEAGUE_NAME = "Nexus Tour LFL3";

async function scrape() {
  // Connect to MongoDB
  await mongoose.connect(MONGODB_ENDPOINT);
  console.log("MongoDB Connected\n");

  const browser = await puppeteer.launch({ headless: true, defaultViewport: null });
  const page = await browser.newPage();

  // 1. Go to participants page and load ALL teams
  await page.goto(BASE_URL, { waitUntil: "networkidle2" });
  await page.waitForSelector("a[href*='/participants/']", { timeout: 15000 });

  // Click "Charger plus" until there are no more teams to load
  let loadMoreClicks = 0;
  while (true) {
    const btn = await page.evaluate(() => {
      const buttons = [...document.querySelectorAll("button, a, div[role='button']")];
      const loadMore = buttons.find((el) => el.textContent.toLowerCase().includes("charger plus") || el.textContent.toLowerCase().includes("load more"));
      if (loadMore) {
        loadMore.scrollIntoView();
        loadMore.click();
        return true;
      }
      return false;
    });
    if (!btn) break;
    loadMoreClicks++;
    console.log(`Clicked "Charger plus" (${loadMoreClicks})`);
    await new Promise((r) => setTimeout(r, 2000));
  }
  console.log(`Done loading — clicked ${loadMoreClicks} times\n`);

  const teamLinks = await page.evaluate(() => {
    const links = document.querySelectorAll("a[href*='/participants/']");
    const seen = new Set();
    const results = [];
    links.forEach((a) => {
      const href = a.href;
      const match = href.match(/\/participants\/(\d+)/);
      if (match && !seen.has(match[1])) {
        seen.add(match[1]);
        const name = a.textContent.trim() || a.querySelector("img")?.alt || "Unknown";
        results.push({ href, name });
      }
    });
    return results;
  });

  console.log(`Found ${teamLinks.length} teams\n`);

  let saved = 0;

  // 2. Visit each team page
  for (const team of teamLinks) {
    console.log(`--- Scraping: ${team.name} ---`);
    try {
      await page.goto(team.href, { waitUntil: "networkidle2" });
      await new Promise((r) => setTimeout(r, 2000));

      // Click "À propos" tab if it exists
      await page.evaluate(() => {
        const els = [...document.querySelectorAll("a, button, div[role='tab'], span")];
        const tab = els.find((el) => el.textContent.toLowerCase().includes("propos"));
        if (tab) tab.click();
      });
      await new Promise((r) => setTimeout(r, 2000));

      // Extract structured data: players, staff, replacements, discords
      const data = await page.evaluate(() => {
        const body = document.body.innerText;
        const lines = body
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);

        const players = [];
        const players_ids = [];
        const staff = [];
        const staff_ids = [];
        const replacements = [];
        const replacements_ids = [];
        let discord_captain = "";
        let discord_manager = "";

        // Parse discord info: the value is on the NEXT line after the label
        for (let i = 0; i < lines.length; i++) {
          const lower = lines[i].toLowerCase();
          if (lower.includes("discord") && lower.includes("capitaine") && lines[i + 1]) {
            discord_captain = lines[i + 1];
          }
          if (lower.includes("discord") && (lower.includes("coach") || lower.includes("manager")) && lines[i + 1]) {
            discord_manager = lines[i + 1];
          }
        }

        // Parse lineup: each player card is structured as:
        //   PlayerName
        //   Riot ID (avec le #)
        //   ActualRiotID
        //   Rôle
        //   Titulaire / Remplaçant / Coach
        const lineupStart = lines.findIndex((l) => l.toLowerCase() === "lineup");
        if (lineupStart !== -1) {
          for (let i = lineupStart + 1; i < lines.length; i++) {
            // Look for "Rôle" label — the role value is next, and the player name is 4 lines back
            if (lines[i].toLowerCase() === "rôle" && lines[i + 1]) {
              const role = lines[i + 1].toLowerCase();
              // Player name is 4 lines before "Rôle" (Name, "Riot ID...", RiotID, "Rôle")
              const playerName = lines[i - 3] || "";
              const riotId = lines[i - 1] || "";

              // Skip noise
              if (!playerName || playerName.toLowerCase() === "lineup" || playerName.toLowerCase().includes("riot id")) continue;

              if (role.includes("titulaire")) {
                players.push(playerName);
                players_ids.push(riotId);
              } else if (role.includes("remplaç") || role.includes("remplacement")) {
                replacements.push(playerName);
                replacements_ids.push(riotId);
              } else if (role.includes("coach") || role.includes("manager") || role.includes("staff")) {
                staff.push(playerName);
                staff_ids.push(riotId);
              }
            }
          }
        }

        return { players, players_ids, staff, staff_ids, replacements, replacements_ids, discord_captain, discord_manager };
      });

      // Save to MongoDB via TeamLeague model (upsert by name + league_id)
      await TeamLeague.findOneAndUpdate(
        { name: team.name, league_id: LEAGUE_ID },
        {
          name: team.name,
          league_id: LEAGUE_ID,
          league_name: LEAGUE_NAME,
          players: data.players,
          players_ids: data.players_ids,
          staff: data.staff,
          staff_ids: data.staff_ids,
          replacements: data.replacements,
          replacements_ids: data.replacements_ids,
          discord_captain: data.discord_captain,
          discord_manager: data.discord_manager,
        },
        { upsert: true, new: true },
      );
      saved++;

      console.log(`  -> Saved to DB`);
    } catch (err) {
      console.log(`  Error: ${err.message}`);
    }
  }

  console.log(`\nDone! ${saved}/${teamLinks.length} teams saved to MongoDB`);

  await browser.close();
  await mongoose.disconnect();
}

scrape().catch(console.error);
