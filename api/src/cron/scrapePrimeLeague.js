const puppeteer = require('puppeteer');
const League = require('../models/league');
const TeamLeague = require('../models/team-league');

// Division 3 : la page liga3 affiche toujours le split en cours (4 blocs .coverage-groupstage-ranking = Group 1..4)
// Division 2 : pas de page coverage, on lit directement le classement (table.table-ranking) de chaque page de groupe — URLs à changer à chaque split
const LEAGUES = [
  { name: 'Prime League Division 3', url: 'https://www.primeleague.gg/en/liga3', groups: ['3.1', '3.2', '3.3', '3.4'] },
  {
    name: 'Prime League Division 2',
    pages: [
      { group: '2.1', url: 'https://www.primeleague.gg/en/leagues/prm/3227-fall-split-202627/group/509-gruppenphase/5498-gruppe-2-1' },
      { group: '2.2', url: 'https://www.primeleague.gg/en/leagues/prm/3227-fall-split-202627/group/509-gruppenphase/5501-gruppe-2-2' },
    ],
  },
];

// NB : Prime League (Blendbyte) renvoie 403 pour l'UA par défaut de puppeteer (Mac OS X 10_15_7 / Chrome 130) — garder un UA récent.
// Il sert aussi un challenge anti-bot (« Establishing a secure connection ») qui se résout seul en ~5 s : on attend le sélecteur du classement.
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36';

function normalize(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

async function evaluateOnPage(url, selector, fn) {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENT);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector(selector, { timeout: 45000 });
    return await page.evaluate(fn);
  } finally {
    await browser.close();
  }
}

// Page coverage (liga3) : un tableau par bloc .coverage-groupstage-ranking
function scrapeCoverage(url) {
  return evaluateOnPage(url, '.coverage-groupstage-ranking tr[title]', () => {
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
}

// Page de groupe (Division 2) : classement dans table.table-ranking, nom = alt du logo
function scrapeGroupPage(url) {
  return evaluateOnPage(url, 'table.table-ranking td.main', () => {
    const rows = Array.from(document.querySelectorAll('table.table-ranking tr')).filter((row) => row.querySelector('td.main'));
    return rows.map((row) => {
      const name = (row.querySelector('td.main img') || {}).alt || (row.querySelector('td.main') || {}).textContent || '';
      const record = (row.querySelector('td.secondary') || {}).textContent || '';
      const points = (row.querySelector('td.primary') || {}).textContent || '';
      return { name: name.trim(), record: record.trim(), points: points.trim() };
    });
  });
}

async function scrapeLeague(config) {
  if (config.url) {
    console.log(`[PrimeLeague] Scraping ${config.url}`);
    return { tables: await scrapeCoverage(config.url), groups: config.groups };
  }
  const tables = [];
  for (const p of config.pages) {
    console.log(`[PrimeLeague] Scraping ${p.url}`);
    tables.push(await scrapeGroupPage(p.url));
  }
  return { tables, groups: config.pages.map((p) => p.group) };
}

async function scrapePrimeLeague() {
  for (const config of LEAGUES) {
    const league = await League.findOne({ name: config.name });
    if (!league) {
      console.log(`[PrimeLeague] League not found: ${config.name}`);
      continue;
    }

    const { tables, groups } = await scrapeLeague(config);
    console.log(`[PrimeLeague] Found ${tables.length} group tables`);
    if (tables.length !== groups.length) console.warn(`[PrimeLeague] Expected ${groups.length} group tables, got ${tables.length} — markup or split changed?`);

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
    const matchedIds = new Set();
    for (let i = 0; i < tables.length; i++) {
      const groupLabel = groups[i] || `group-${i + 1}`;
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

        await TeamLeague.findByIdAndUpdate(team._id, { wins, losses, points, group: groupLabel });
        console.log(`  [${groupLabel}] ${team.name}: ${wins}-${losses}, ${points} pts`);
        updated++;
        matchedIds.add(team._id.toString());
      }
    }
    for (const t of teams) {
      if (matchedIds.has(t._id.toString())) continue;
      console.warn(`  [PrimeLeague] Team in DB not found on page: "${t.name}"`);
    }
    console.log(`[PrimeLeague] ${config.name}: ${updated} updated, ${unmatched} unmatched`);
  }
}

module.exports = scrapePrimeLeague;
