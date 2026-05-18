const puppeteer = require('puppeteer');
const League = require('../models/league');
const TeamLeague = require('../models/team-league');

const LEAGUES = [{ name: 'Prime League Division 3', url: 'https://www.primeleague.gg/en/coverages/33268-3-liga-spring-split-202526', groups: ['3.1', '3.2', '3.3', '3.4'] }];

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

function normalize(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

async function scrapeCoverage(url) {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENT);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 4000));

    const tables = await page.evaluate(() => {
      const blocks = Array.from(document.querySelectorAll('.coverage-groupstage-ranking'));
      return blocks.map((block) => {
        const rows = Array.from(block.querySelectorAll('table tbody tr'));
        return rows.map((row) => {
          const name = row.getAttribute('title') || '';
          const record = (row.querySelector('td.secondary') || {}).textContent || '';
          const points = (row.querySelector('td.primary') || {}).textContent || '';
          return { name: name.trim(), record: record.trim(), points: points.trim() };
        });
      });
    });
    return tables;
  } finally {
    await browser.close();
  }
}

async function scrapePrimeLeague() {
  for (const config of LEAGUES) {
    const league = await League.findOne({ name: config.name });
    if (!league) {
      console.log(`[PrimeLeague] League not found: ${config.name}`);
      continue;
    }

    console.log(`[PrimeLeague] Scraping ${config.url}`);
    const tables = await scrapeCoverage(config.url);
    console.log(`[PrimeLeague] Found ${tables.length} group tables`);

    const teams = await TeamLeague.find({ league_id: league._id.toString() });
    const teamsByName = new Map();
    for (const t of teams) teamsByName.set(normalize(t.name), t);

    const findTeam = (rawName) => {
      const key = normalize(rawName);
      if (teamsByName.has(key)) return teamsByName.get(key);
      for (const [k, t] of teamsByName) {
        if (k.includes(key) || key.includes(k)) return t;
      }
      return null;
    };

    let updated = 0;
    let unmatched = 0;
    for (let i = 0; i < tables.length; i++) {
      const groupLabel = config.groups[i] || `group-${i + 1}`;
      for (const row of tables[i]) {
        if (!row.name) continue;

        const team = findTeam(row.name);
        if (!team) {
          console.log(`  [${groupLabel}] No match: "${row.name}"`);
          unmatched++;
          continue;
        }

        const recordMatch = row.record.match(/^(\d+)\s*-\s*(\d+)$/);
        const wins = recordMatch ? Number(recordMatch[1]) : 0;
        const losses = recordMatch ? Number(recordMatch[2]) : 0;
        const points = Number(row.points) || 0;

        await TeamLeague.findByIdAndUpdate(team._id, { wins, losses, points });
        console.log(`  [${groupLabel}] ${team.name}: ${wins}-${losses}, ${points} pts`);
        updated++;
      }
    }
    console.log(`[PrimeLeague] ${config.name}: ${updated} updated, ${unmatched} unmatched`);
  }
}

module.exports = scrapePrimeLeague;
