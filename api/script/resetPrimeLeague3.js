// Reset complet de la Prime League Division 3 pour un nouveau split.
// Supprime toutes les team-leagues + players de la ligue, puis recrée tout depuis ./data/prime-league-3-fall-2627.js
//
//   node script/resetPrimeLeague3.js            → dry-run (aucune écriture)
//   node script/resetPrimeLeague3.js --apply    → exécution réelle

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { MONGODB_ENDPOINT } = require('../src/config.js');
const League = require('../src/models/league.js');
const TeamLeague = require('../src/models/team-league.js');
const Player = require('../src/models/player.js');
const { getPuuidByRiotId, getRankByPuuid } = require('../src/services/riotgames.js');
const { updateTeamLeagueLp } = require('../src/services/team-league-lp.js');
const { LEAGUE, TEAMS } = require('./data/prime-league-3-fall-2627.js');

const APPLY = process.argv.includes('--apply');
const REGION = 'euw1';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  await mongoose.connect(MONGODB_ENDPOINT);
  console.log(`MongoDB Connected — mode: ${APPLY ? 'APPLY (écriture réelle)' : 'DRY-RUN (aucune écriture)'}\n`);

  // ---------- 1. League ----------
  let league = await League.findOne({ name: LEAGUE.name });
  if (!league && !APPLY) console.log(`[League] "${LEAGUE.name}" introuvable → serait créée`);
  if (!league && APPLY) {
    league = await League.create(LEAGUE);
    console.log(`[League] Créée: ${league.name} (${league._id})`);
  }
  if (league) {
    console.log(`[League] ${league.name} (${league._id}) — description: "${league.description || ''}" → "${LEAGUE.description}", has_points: ${league.has_points} → ${LEAGUE.has_points}`);
    if (APPLY) await League.findByIdAndUpdate(league._id, { description: LEAGUE.description, has_points: LEAGUE.has_points });
  }
  const leagueId = league ? league._id.toString() : '(new)';

  // ---------- 2. Suppression de l'ancien split ----------
  console.log(`\n=== Suppression de l'ancien split ===`);
  const oldTeams = league ? await TeamLeague.find({ league_id: leagueId }) : [];
  const oldPlayersCount = league ? await Player.countDocuments({ league_id: leagueId, is_league: true }) : 0;
  console.log(`[Delete] ${oldTeams.length} team-leagues, ${oldPlayersCount} players is_league`);
  for (const t of oldTeams) {
    const n = await Player.countDocuments({ team_league_id: t._id.toString(), is_league: true });
    console.log(`  - [${t.group || '-'}] ${t.name} (${n} players, ${t.wins || 0}-${t.losses || 0}, ${t.points || 0} pts)`);
  }
  if (APPLY && league) {
    const r1 = await TeamLeague.deleteMany({ league_id: leagueId });
    const r2 = await Player.deleteMany({ league_id: leagueId, is_league: true });
    console.log(`[Delete] Supprimé: ${r1.deletedCount} team-leagues, ${r2.deletedCount} players`);
  }

  // ---------- 3. Création du nouveau split ----------
  console.log(`\n=== Création du nouveau split (${TEAMS.length} équipes, ${TEAMS.reduce((s, t) => s + t.players.length, 0)} comptes) ===`);
  let teamsCreated = 0;
  let playersCreated = 0;
  const unresolved = [];

  for (const t of TEAMS) {
    console.log(`\n[${t.group}] ${t.name} — ${t.players.length} players, ${t.staff.length} staff, ${t.contacts.length} contacts`);
    for (const c of t.contacts) console.log(`  contact: ${c.role} ${c.name ? `${c.name} ` : ''}(discord: ${c.discord})`);

    let teamLeague = null;
    if (APPLY) {
      teamLeague = await TeamLeague.create({
        name: t.name,
        group: t.group,
        league_id: leagueId,
        league_name: league.name,
        multi_opgg: t.multi_opgg || '',
        players: t.players.map((p) => ({ name: p.name, riot_id: p.riot_id })),
        staff: t.staff.map((s) => ({ name: s.name, riot_id: '' })),
        contacts: t.contacts,
        points: 0,
        wins: 0,
        losses: 0,
        total_lp: 0,
      });
      teamsCreated++;
    }

    for (const p of t.players) {
      const [gameName, tagLine] = p.riot_id.split('#');
      if (!gameName || !tagLine) {
        console.log(`  ✗ Riot ID invalide: ${p.riot_id}`);
        unresolved.push(`${t.name}: ${p.riot_id}`);
        continue;
      }
      if (!APPLY) {
        console.log(`  · ${p.role || '?'.padEnd(1)}\t${p.name}\t${p.riot_id}`);
        continue;
      }

      const puuid = await getPuuidByRiotId(gameName, tagLine, REGION);
      await sleep(120);

      const doc = {
        player_name: p.name || gameName,
        role: p.role || undefined,
        riot_id: p.riot_id,
        game_name: gameName,
        tag_line: tagLine,
        region: REGION,
        is_league: true,
        active: true,
        league_id: leagueId,
        league_name: league.name,
        team_league_id: teamLeague._id.toString(),
        team_league_name: teamLeague.name,
        connected_at: new Date(),
      };

      if (!puuid) {
        await Player.create(doc);
        console.log(`  ✗ ${p.role || '?'}\t${p.name}\t${p.riot_id} → PUUID introuvable (créé sans puuid)`);
        unresolved.push(`${t.name}: ${p.riot_id}`);
        playersCreated++;
        continue;
      }

      doc.puuid = puuid;
      const rank = await getRankByPuuid(puuid, REGION);
      await sleep(120);
      if (rank) {
        doc.current_tier = rank.tier || null;
        doc.current_rank = rank.rank || null;
        doc.current_lp = rank.leaguePoints || null;
        doc.current_wins = rank.wins || 0;
        doc.current_losses = rank.losses || 0;
        doc.last_fetched_at = new Date();
      }
      await Player.create(doc);
      console.log(`  ✓ ${p.role || '?'}\t${p.name}\t${p.riot_id} → ${rank ? `${rank.tier} ${rank.rank} ${rank.leaguePoints} LP` : 'unranked'}`);
      playersCreated++;
    }
  }

  // ---------- 4. total_lp ----------
  if (APPLY) {
    console.log(`\n=== Recalcul total_lp ===`);
    await updateTeamLeagueLp({ league_id: leagueId });
  }

  // ---------- 5. Récap ----------
  console.log(`\n=== Récap (${APPLY ? 'APPLY' : 'DRY-RUN'}) ===`);
  console.log(`  Supprimé : ${oldTeams.length} team-leagues, ${oldPlayersCount} players`);
  console.log(`  Créé     : ${APPLY ? teamsCreated : TEAMS.length} team-leagues, ${APPLY ? playersCreated : TEAMS.reduce((s, t) => s + t.players.length, 0)} players`);
  if (unresolved.length) {
    console.log(`  Riot IDs non résolus (${unresolved.length}) :`);
    for (const u of unresolved) console.log(`    - ${u}`);
  }
  if (!APPLY) console.log(`\nAucune écriture effectuée. Relancer avec --apply pour exécuter.`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
