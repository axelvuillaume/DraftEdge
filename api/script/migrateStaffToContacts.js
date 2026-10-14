// One-shot : fusionne team-league.staff dans team-league.contacts (Prime League Division 2 et 3), puis supprime staff.
//
//   node script/migrateStaffToContacts.js            → dry-run
//   node script/migrateStaffToContacts.js --apply    → écrit en base ($unset staff) + réécrit les fichiers script/data/prime-league-*.js
//
// Règles :
//   - "Rôle - Nom" / "Rôle: Nom" → contact { role: rôle normalisé, name }. Rôle sans nom ("Coach", "Manager:") → ignoré.
//     Nom sans rôle → role "Staff". Préfixe "Staff:" ignoré.
//   - Rôles normalisés : HC / Head Coach / Headcoach → Head Coach ; Coach / Positional Coach → Coach ; Assist. Coach → Assistant Coach ;
//     GM → General Manager ; Manager, Assistant Manager, Analyst inchangés.
//   - Fusion avec un contact existant de même nom (guillemets, accents et casse ignorés) : on garde le contact (discord, twitter, rôle).

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { MONGODB_ENDPOINT } = require('../src/config.js');
const TeamLeague = require('../src/models/team-league.js');

const APPLY = process.argv.includes('--apply');
const DATA_FILES = ['prime-league-3-fall-2627', 'prime-league-2-fall-2627'].map((f) => path.join(__dirname, `data/${f}.js`));

const ROLES = {
  hc: 'Head Coach',
  headcoach: 'Head Coach',
  coach: 'Coach',
  positionalcoach: 'Coach',
  assistantcoach: 'Assistant Coach',
  assistcoach: 'Assistant Coach',
  manager: 'Manager',
  assistantmanager: 'Assistant Manager',
  gm: 'General Manager',
  generalmanager: 'General Manager',
  analyst: 'Analyst',
};

function normalize(str) {
  return (str || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
}

// "HC: Jari "HUNT"" → { role: 'Head Coach', name: 'Jari "HUNT"' } ; "Coach" → null ; "Ethyron" → { role: 'Staff', name: 'Ethyron' }
function parseStaffEntry(raw) {
  const text = (raw || '').replace(/^\s*staff\s*:\s*/i, '').trim();
  if (!text) return null;
  const m = text.match(/^([A-Za-z.\s]+?)\s*[:\-–]\s*(.*)$/);
  if (!m) {
    if (ROLES[normalize(text)]) return null;
    return { role: 'Staff', name: text };
  }
  const role = ROLES[normalize(m[1])];
  if (!role) return { role: 'Staff', name: text };
  if (!m[2].trim()) return null;
  return { role, name: m[2].trim() };
}

function mergeContacts(staff, contacts) {
  const merged = (contacts || []).map((c) => ({ name: c.name || '', role: c.role || '', twitter: c.twitter || '', discord: c.discord || '' }));
  const added = [];
  for (const s of staff || []) {
    const parsed = parseStaffEntry(s.name);
    if (!parsed) continue;
    const existing = merged.find((c) => c.name && normalize(c.name) === normalize(parsed.name));
    if (existing) {
      if (!existing.role) existing.role = parsed.role;
      continue;
    }
    merged.push({ name: parsed.name, role: parsed.role, twitter: '', discord: '' });
    added.push(parsed);
  }
  return { contacts: merged, added };
}

function printTeam(label, before, result) {
  console.log(`${label}`);
  console.log(`  staff avant : ${(before.staff || []).map((s) => s.name).join(' | ') || '-'}`);
  console.log(`  contacts    : ${result.contacts.map((c) => `${c.role}: ${c.name || '?'}${c.discord ? ` @${c.discord}` : ''}`).join(' | ') || '-'}`);
}

async function main() {
  console.log(`Mode ${APPLY ? 'APPLY' : 'DRY-RUN'}\n=== Base ===`);
  await mongoose.connect(MONGODB_ENDPOINT);
  const teams = await TeamLeague.find({ league_name: /^Prime League/ }).sort({ league_name: 1, group: 1, name: 1 });
  let updated = 0;
  for (const t of teams) {
    const before = t.toObject();
    const result = mergeContacts(before.staff, before.contacts);
    printTeam(`[${t.group}] ${t.name}`, before, result);
    if (!APPLY) continue;
    await TeamLeague.collection.updateOne({ _id: t._id }, { $set: { contacts: result.contacts }, $unset: { staff: '' } });
    updated++;
  }
  await mongoose.disconnect();

  console.log(`\n=== Fichiers de données ===`);
  for (const file of DATA_FILES) {
    const { LEAGUE, TEAMS } = require(file);
    for (const team of TEAMS) {
      const result = mergeContacts(team.staff, team.contacts);
      team.contacts = result.contacts;
      delete team.staff;
    }
    console.log(`${path.basename(file)} : ${TEAMS.length} équipes, ${TEAMS.reduce((s, t) => s + t.contacts.length, 0)} contacts`);
    if (!APPLY) continue;
    const header = fs.readFileSync(file, 'utf8').split('\nconst LEAGUE')[0] + '\n';
    fs.writeFileSync(file, `${header}const LEAGUE = ${JSON.stringify(LEAGUE)};\n\nconst TEAMS = ${JSON.stringify(TEAMS, null, 2)};\n\nmodule.exports = { LEAGUE, TEAMS };\n`);
  }

  if (APPLY) console.log(`\n→ ${updated} team-leagues mises à jour (staff supprimé), fichiers de données réécrits`);
  if (!APPLY) console.log('\nAucune écriture. Relancer avec --apply.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
