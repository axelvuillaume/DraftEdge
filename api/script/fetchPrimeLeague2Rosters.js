// Génère ./data/prime-league-2-fall-2627.js depuis les pages de groupe Prime League Division 2.
// Source : classement + matchs de chaque groupe, lineups annoncées (ajax leagues_match) et page de chaque équipe.
//
//   node script/fetchPrimeLeague2Rosters.js                      → scrape puppeteer (voir limite ci-dessous)
//   node script/fetchPrimeLeague2Rosters.js --from=dump.json     → construit le fichier depuis un export navigateur
//
// LIMITE (14/10/2026) : le challenge anti-bot Prime League (Blendbyte) laisse passer la page de groupe en headless
// mais bloque les POST ajax leagues_match dès le 2ᵉ appel (403, même avec --disable-blink-features=AutomationControlled).
// Contournement : ouvrir chaque page de groupe dans un vrai navigateur, coller `scrapeGroupInPage` dans la console,
// exécuter `copy(JSON.stringify({ group: '2.1', ...(await scrapeGroupInPage()) }))`, mettre les exports des groupes
// dans un tableau JSON `[{ group, ranking, matches, teams }, ...]` et lancer le script avec --from=<fichier>.
//
// Règles :
//   - players      = joueurs apparus dans au moins une lineup annoncée (triés par nb d'apparitions)
//                    → si aucune lineup annoncée : membres "Confirmed player" de la page équipe
//   - replacements = autres membres "Confirmed player" de la page équipe (hors staff)
//   - staff        = membres dont le pseudo / Riot ID contient "coach" et absents des lineups
//   - contacts     = Leader de l'équipe (pseudo Prime League, discord à compléter à la main)
//   - role         = déduit du tag Riot quand il est explicite (#TOP, #MID, #ADC, #SUPP…), sinon vide

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const LEAGUE = { name: 'Prime League Division 2', region: 'EUW', tier: 'Division 2', description: 'Fall Split 2026/27', has_points: true };
const GROUPS = [
  { group: '2.1', url: 'https://www.primeleague.gg/en/leagues/prm/3227-fall-split-202627/group/509-gruppenphase/5498-gruppe-2-1' },
  { group: '2.2', url: 'https://www.primeleague.gg/en/leagues/prm/3227-fall-split-202627/group/509-gruppenphase/5501-gruppe-2-2' },
];
const OUT = path.join(__dirname, 'data/prime-league-2-fall-2627.js');

// NB : Prime League (Blendbyte) renvoie d'abord un challenge anti-bot (403 « Establishing a secure connection ») qui se résout
// seul en ~5 s → on attend le classement avec waitForSelector plutôt que networkidle. Garder aussi un UA récent.
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36';

const ROLE_BY_TAG = { top: 'top', jgl: 'jungle', jng: 'jungle', jungle: 'jungle', ganks: 'jungle', mid: 'mid', adc: 'bottom', bot: 'bottom', sup: 'support', supp: 'support', support: 'support' };

// Exécuté dans la page de groupe : classement, matchs (+ lineups via ajax) et roster de chaque équipe
async function scrapeGroupInPage() {
  const parse = (html) => new DOMParser().parseFromString(html, 'text/html');

  const ranking = [...document.querySelectorAll('table.table-ranking tr')]
    .filter((tr) => tr.querySelector('td.main'))
    .map((tr) => {
      const a = tr.querySelector('td.main a');
      const m = a.href.match(/teams\/(\d+)-([^/]+)$/);
      return {
        team_id: +m[1],
        slug: m[2],
        name: (tr.querySelector('td.main img')?.alt || tr.querySelector('td.main').innerText).trim(),
        url: a.href,
        record: tr.querySelector('td.secondary')?.innerText.trim() || '',
        points: tr.querySelector('td.primary')?.innerText.trim() || '',
      };
    });

  const matchMap = new Map();
  for (const a of document.querySelectorAll('a[href*="/leagues/matches/"]')) {
    const m = a.href.match(/matches\/(\d+)-(.*)$/);
    if (!m) continue;
    matchMap.set(+m[1], { match_id: +m[1], slug: m[2] });
  }

  const parseLineup = (arr) =>
    (arr || []).map((p) => ({
      user_id: p.id,
      nick: p.name,
      riot_id: parse((p.gameaccounts || []).join('')).querySelector('.gameaccount-name')?.textContent.trim() || '',
      standin: p.standin,
      status: p.status_stu?.msg || '',
    }));

  // Le challenge anti-bot peut se redéclencher sur un POST (réponse HTML au lieu de JSON) → pause + retry
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const fetchMatch = async (matchId, attempt = 1) => {
    const r = await fetch('https://www.primeleague.gg/ajax/leagues_match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' },
      body: `id=${matchId}&action=init`,
    });
    if ((r.headers.get('content-type') || '').includes('json')) return r.json();
    if (attempt >= 4) throw new Error(`leagues_match ${matchId}: réponse non JSON (HTTP ${r.status}) après ${attempt} essais`);
    await sleep(2000 * attempt);
    return fetchMatch(matchId, attempt + 1);
  };

  const matches = [];
  for (const mt of matchMap.values()) {
    const j = await fetchMatch(mt.match_id);
    await sleep(300);
    matches.push({
      ...mt,
      status: j.status,
      score_1: j.score_1,
      score_2: j.score_2,
      team_1: ranking.find((t) => mt.slug.startsWith(`${t.slug}-vs-`))?.team_id || null,
      team_2: ranking.find((t) => mt.slug.endsWith(`-vs-${t.slug}`))?.team_id || null,
      lineup_1: parseLineup(j.lineups?.[1]),
      lineup_2: parseLineup(j.lineups?.[2]),
    });
  }

  const teams = [];
  for (const t of ranking) {
    const doc = parse(await fetch(t.url).then((r) => r.text()));
    await sleep(300);
    teams.push({
      ...t,
      roster: [...doc.querySelectorAll('ul.content-portrait-grid-l li')].map((li) => ({
        nick: li.querySelector('h3')?.textContent.trim() || '',
        user_id: +(li.querySelector('a[href*="/users/"]')?.href.match(/users\/(\d+)/)?.[1] || 0),
        title: li.querySelector('.txt-subtitle')?.textContent.trim() || '',
        riot_id: li.querySelector('.gameaccount-name')?.textContent.trim() || '',
        status: li.querySelector('[class*="txt-status"]')?.textContent.trim() || '',
      })),
    });
  }

  return { ranking, matches, teams };
}

async function scrapeGroup(browser, url) {
  const page = await browser.newPage();
  await page.setUserAgent(USER_AGENT);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('table.table-ranking td.main', { timeout: 45000 });
  const data = await page.evaluate(scrapeGroupInPage);
  await page.close();
  return data;
}

function roleFromRiotId(riotId) {
  return ROLE_BY_TAG[(riotId.split('#')[1] || '').toLowerCase()] || '';
}

function isCoach(member) {
  return /coach/i.test(member.nick) || /coach/i.test(member.riot_id);
}

function buildTeam(team, matches, group) {
  const appearances = new Map();
  for (const mt of matches) {
    const lineup = mt.team_1 === team.team_id ? mt.lineup_1 : mt.team_2 === team.team_id ? mt.lineup_2 : [];
    for (const p of lineup) {
      if (!p.riot_id) continue;
      const entry = appearances.get(p.riot_id) || { nick: p.nick, riot_id: p.riot_id, count: 0 };
      entry.count++;
      appearances.set(p.riot_id, entry);
    }
  }

  const lineupPlayers = [...appearances.values()].sort((a, b) => b.count - a.count);
  const confirmed = team.roster.filter((m) => m.riot_id && m.status === 'Confirmed player');
  const inLineup = new Set(lineupPlayers.map((p) => p.riot_id));

  const players = lineupPlayers.length ? lineupPlayers : confirmed.filter((m) => !isCoach(m));
  const playerIds = new Set(players.map((p) => p.riot_id));
  const staff = team.roster.filter((m) => isCoach(m) && !inLineup.has(m.riot_id));
  const staffIds = new Set(staff.map((m) => m.riot_id));
  const replacements = confirmed.filter((m) => !playerIds.has(m.riot_id) && !staffIds.has(m.riot_id));
  const leader = team.roster.find((m) => m.title === 'Leader');

  return {
    name: team.name,
    group,
    prime_url: team.url,
    lineups_announced: matches.filter((mt) => (mt.team_1 === team.team_id && mt.lineup_1.length) || (mt.team_2 === team.team_id && mt.lineup_2.length)).length,
    players: players.map((p) => ({ name: p.nick, riot_id: p.riot_id, role: roleFromRiotId(p.riot_id) })),
    replacements: replacements.map((m) => ({ name: m.nick, riot_id: m.riot_id })),
    staff: staff.map((m) => ({ name: m.nick, riot_id: m.riot_id })),
    contacts: leader ? [{ name: leader.nick, role: 'Leader', twitter: '', discord: '' }] : [],
  };
}

function buildGroup(TEAMS, group, { ranking, matches, teams }) {
  console.log(`  ${ranking.length} équipes, ${matches.length} matchs, ${matches.filter((m) => m.lineup_1.length || m.lineup_2.length).length} avec lineup annoncée`);
  for (const t of teams) {
    const built = buildTeam(t, matches, group);
    console.log(`  - ${built.name}: ${built.players.length} players (${built.lineups_announced} lineups), ${built.replacements.length} replacements, ${built.staff.length} staff`);
    TEAMS.push(built);
  }
}

async function loadFromDump(TEAMS, file) {
  const dumps = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
  for (const dump of dumps) {
    console.log(`[${dump.group}] export navigateur`);
    buildGroup(TEAMS, dump.group, dump);
  }
}

async function loadFromPuppeteer(TEAMS) {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    for (const g of GROUPS) {
      console.log(`[${g.group}] ${g.url}`);
      buildGroup(TEAMS, g.group, await scrapeGroup(browser, g.url));
    }
  } finally {
    await browser.close();
  }
}

async function main() {
  const TEAMS = [];
  const from = (process.argv.find((a) => a.startsWith('--from=')) || '').slice('--from='.length);
  if (from) await loadFromDump(TEAMS, from);
  if (!from) await loadFromPuppeteer(TEAMS);

  const header = `// Généré par script/fetchPrimeLeague2Rosters.js le ${new Date().toISOString().slice(0, 10)} depuis les pages de groupe Prime League\n// ${LEAGUE.description} — players = lineups annoncées, replacements = autres membres confirmés\n\n`;
  fs.writeFileSync(OUT, `${header}const LEAGUE = ${JSON.stringify(LEAGUE)};\n\nconst TEAMS = ${JSON.stringify(TEAMS, null, 2)};\n\nmodule.exports = { LEAGUE, TEAMS };\n`);
  console.log(`\n→ ${OUT} (${TEAMS.length} équipes, ${TEAMS.reduce((s, t) => s + t.players.length, 0)} players, ${TEAMS.reduce((s, t) => s + t.replacements.length, 0)} replacements)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
