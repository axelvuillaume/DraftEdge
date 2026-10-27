/* One-off backfill : rattache les lignes player-stats alliées sans puuid au joueur actif
   de l'équipe qui a le même rôle (cas des comptes tournoi "404 Ray#eProd" que Riot ne résout pas).
   Dry-run par défaut, n'écrit rien. Ajouter --apply pour écrire.
   Run: node api/src/scripts/backfill-puuid-by-role.js [--apply] [--team <team_id>] */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const { MONGODB_ENDPOINT } = require('../config');
const PlayerStats = require('../models/player-stats');
const Player = require('../models/player');

const APPLY = process.argv.includes('--apply');
const teamArg = process.argv.indexOf('--team');
const ONLY_TEAM = teamArg !== -1 ? process.argv[teamArg + 1] : null;

(async () => {
  await mongoose.connect(MONGODB_ENDPOINT);
  console.log(APPLY ? '*** MODE APPLY : écriture en base ***' : '*** DRY-RUN : aucune écriture ***');

  const noPuuid = { opponent: false, $or: [{ puuid: null }, { puuid: '' }, { puuid: { $exists: false } }] };
  if (ONLY_TEAM) noPuuid.team_id = ONLY_TEAM;

  const rows = await PlayerStats.find(noPuuid, { team_id: 1, role: 1, summoner_name: 1, riot_tag: 1, game_id: 1 });
  console.log(`lignes alliées sans puuid : ${rows.length}`);
  if (rows.length === 0) return process.exit(0);

  const teamIds = [...new Set(rows.map((r) => r.team_id).filter(Boolean))];
  const activePlayers = await Player.find({ team_id: { $in: teamIds }, active: true });
  const activeByTeamRole = {};
  activePlayers.forEach((p) => {
    if (!p.role || !p.puuid) return;
    activeByTeamRole[`${p.team_id}|${p.role}`] = p;
  });

  const ops = [];
  let planned = 0;
  let skipped = 0;
  for (const teamId of teamIds) {
    const teamRows = rows.filter((r) => r.team_id === teamId);
    const teamName = activePlayers.find((p) => String(p.team_id) === String(teamId))?.team_name;
    console.log(`\n== team ${teamId}${teamName ? ` (${teamName})` : ''} : ${teamRows.length} lignes, ${new Set(teamRows.map((r) => r.game_id)).size} games`);

    const byRole = {};
    teamRows.forEach((r) => {
      const role = r.role || '(sans rôle)';
      byRole[role] = byRole[role] || { rows: [], accounts: new Set() };
      byRole[role].rows.push(r);
      byRole[role].accounts.add(`${r.summoner_name}#${r.riot_tag}`);
    });

    for (const [role, info] of Object.entries(byRole)) {
      const target = activeByTeamRole[`${teamId}|${role}`];
      const accounts = [...info.accounts].join(', ');
      if (!target) {
        skipped += info.rows.length;
        console.log(`  ${role.padEnd(8)} ${String(info.rows.length).padStart(3)} lignes  [${accounts}]  -> SKIP (pas de joueur actif avec puuid pour ce rôle)`);
        continue;
      }
      planned += info.rows.length;
      console.log(`  ${role.padEnd(8)} ${String(info.rows.length).padStart(3)} lignes  [${accounts}]  -> ${target.game_name}#${target.tag_line} (puuid ${target.puuid.slice(0, 8)}…)`);
      ops.push({ updateMany: { filter: { _id: { $in: info.rows.map((r) => r._id) } }, update: { $set: { puuid: target.puuid } } } });
    }
  }

  console.log(`\nà rattacher : ${planned} lignes, ignorées : ${skipped}`);
  if (!APPLY) {
    console.log('Dry-run terminé. Relancer avec --apply pour écrire.');
    return process.exit(0);
  }

  const res = await PlayerStats.bulkWrite(ops, { ordered: false });
  console.log(`modifiées : ${res.modifiedCount}`);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
