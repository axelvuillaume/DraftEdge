// One-shot : importe coachs et managers de la Prime League Division 2 depuis le sheet public « PRM2 Fall '26/27 Doc von Acrive »
// (onglet Overview + Roster, lignes « Coach » / « Manager » de chaque équipe).
//
//   node script/importPrimeLeague2Staff.js            → dry-run (affiche ce qui serait écrit)
//   node script/importPrimeLeague2Staff.js --apply    → écrit en base + met à jour script/data/prime-league-2-fall-2627.js
//
// Écriture par équipe : contacts = coachs (role Coach) + managers (role Manager). Discord/twitter conservés
// pour les contacts existants de même nom, les autres contacts existants sont remplacés.

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { MONGODB_ENDPOINT } = require('../src/config.js');
const League = require('../src/models/league.js');
const TeamLeague = require('../src/models/team-league.js');

const APPLY = process.argv.includes('--apply');
const LEAGUE_NAME = 'Prime League Division 2';
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRkrMNCfPxhvCKLfIkEuIVNaHnd-UPFogWg0eNOUmO7RpH6TigUk1iLQd2au1p0_mkj7XgDI3X89W0c/pub?single=true&output=csv&gid=1128392708';
const DATA_FILE = path.join(__dirname, 'data/prime-league-2-fall-2627.js');

// Noms du sheet → noms Prime League quand ils diffèrent
const NAME_ALIASES = { '404 Multigaming': '404 Multigaming e.V.', NeedNoOrga: 'No Need Orga' };

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; continue; }
      if (c === '"') { quoted = false; continue; }
      cell += c;
      continue;
    }
    if (c === '"') { quoted = true; continue; }
    if (c === ',') { row.push(cell); cell = ''; continue; }
    if (c === '\r') continue;
    if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; continue; }
    cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// "Maxcraft 🇩🇪 Murmmelchen 🇩🇪 Keawy 🇩🇪" → ['Maxcraft', 'Murmmelchen', 'Keawy'] (les drapeaux servent de séparateur)
function splitNames(cell) {
  return cell.split(/(?:[\u{1F1E6}-\u{1F1FF}]{2})+/u).map((s) => s.trim()).filter(Boolean);
}

function normalize(str) {
  return (str || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
}

// Un bloc roster = une ligne d'en-têtes avec les noms d'équipes, puis des lignes libellées en colonne 2 (Top, Jgl, …, Coach, '', Manager)
function extractStaff(rows) {
  const result = new Map();
  for (let r = 0; r < rows.length; r++) {
    const header = rows[r];
    const teamCols = header.map((c, i) => (c && i >= 3 && !header[2] ? i : -1)).filter((i) => i >= 0);
    if (teamCols.length < 4) continue;
    const labelAt = (k) => (rows[r + k] || [])[2] || '';
    if (!['Top', 'Jgl'].includes(labelAt(2))) continue;

    let coachRow = -1;
    let managerRow = -1;
    for (let k = 1; k < 15 && r + k < rows.length; k++) {
      if (labelAt(k) === 'Coach') coachRow = r + k;
      if (labelAt(k) === 'Manager') managerRow = r + k;
    }
    for (const col of teamCols) {
      const coaches = [];
      for (let k = coachRow; k > 0 && k < managerRow; k++) coaches.push(...splitNames((rows[k] || [])[col] || ''));
      result.set(header[col].trim(), { coaches, managers: managerRow > 0 ? splitNames((rows[managerRow] || [])[col] || '') : [] });
    }
  }
  return result;
}

async function main() {
  const csv = await fetch(CSV_URL).then((r) => r.text());
  const sheet = extractStaff(parseCsv(csv));
  console.log(`Sheet : ${sheet.size} équipes trouvées — mode ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);

  await mongoose.connect(MONGODB_ENDPOINT);
  const league = await League.findOne({ name: LEAGUE_NAME });
  if (!league) throw new Error(`League introuvable : ${LEAGUE_NAME}`);
  const teams = await TeamLeague.find({ league_id: league._id.toString() });
  const { LEAGUE, TEAMS } = require(DATA_FILE);

  const unmatched = [];
  for (const [sheetName, { coaches, managers }] of sheet) {
    const dbName = NAME_ALIASES[sheetName] || sheetName;
    const team = teams.find((t) => normalize(t.name) === normalize(dbName));
    if (!team) { unmatched.push(sheetName); continue; }

    const keep = (name) => team.contacts.find((c) => normalize(c.name) === normalize(name)) || {};
    const contacts = [...coaches.map((n) => ({ name: n, role: 'Coach' })), ...managers.map((n) => ({ name: n, role: 'Manager' }))].map((c) => ({ ...c, twitter: keep(c.name).twitter || '', discord: keep(c.name).discord || '' }));
    console.log(`[${team.group}] ${team.name}\n  coachs   : ${coaches.join(', ') || '-'}\n  managers : ${managers.join(', ') || '-'}`);

    if (!APPLY) continue;
    await TeamLeague.findByIdAndUpdate(team._id, { contacts });
    const data = TEAMS.find((t) => t.name === team.name);
    if (data) data.contacts = contacts;
  }

  if (APPLY) {
    const header = fs.readFileSync(DATA_FILE, 'utf8').split('\nconst LEAGUE')[0] + '\n';
    fs.writeFileSync(DATA_FILE, `${header}const LEAGUE = ${JSON.stringify(LEAGUE)};\n\nconst TEAMS = ${JSON.stringify(TEAMS, null, 2)};\n\nmodule.exports = { LEAGUE, TEAMS };\n`);
    console.log(`\n→ base mise à jour + ${DATA_FILE}`);
  }
  for (const t of teams) if (![...sheet.keys()].some((n) => normalize(NAME_ALIASES[n] || n) === normalize(t.name))) console.warn(`  ⚠ équipe en base absente du sheet : ${t.name}`);
  if (unmatched.length) console.warn(`  ⚠ équipes du sheet sans correspondance en base : ${unmatched.join(', ')}`);
  if (!APPLY) console.log('\nAucune écriture. Relancer avec --apply.');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
