const Player = require('../models/player');
const TeamLeague = require('../models/team-league');

const MASTER_TIERS = ['MASTER', 'GRANDMASTER', 'CHALLENGER'];

// total_lp = somme des LP des 5 meilleurs joueurs Master+ actifs de l'équipe
async function updateTeamLeagueLp(filter = {}) {
  const teams = await TeamLeague.find(filter);
  for (const team of teams) {
    const players = await Player.find({ team_league_id: team._id.toString(), is_league: true, active: true, current_tier: { $in: MASTER_TIERS } });
    const totalLp = players
      .sort((a, b) => (b.current_lp || 0) - (a.current_lp || 0))
      .slice(0, 5)
      .reduce((sum, p) => sum + (p.current_lp || 0), 0);
    await TeamLeague.findByIdAndUpdate(team._id, { total_lp: totalLp });
    console.log(`[League] ${team.name}: ${totalLp} LP (${players.length} master+ players)`);
  }
}

module.exports = { updateTeamLeagueLp, MASTER_TIERS };
