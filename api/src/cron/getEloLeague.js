const Player = require('../models/player');
const TeamLeague = require('../models/team-league');
const { getRankByPuuid } = require('../services/riotgames');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const MASTER_TIERS = ['MASTER', 'GRANDMASTER', 'CHALLENGER'];

async function updateTeamLeagueLp() {
  const teams = await TeamLeague.find();
  for (const team of teams) {
    const players = await Player.find({ team_league_id: team._id.toString(), is_league: true, active: true, current_tier: { $in: MASTER_TIERS } });
    const totalLp = players.sort((a, b) => (b.current_lp || 0) - (a.current_lp || 0)).slice(0, 5).reduce((sum, p) => sum + (p.current_lp || 0), 0);
    await TeamLeague.findByIdAndUpdate(team._id, { total_lp: totalLp });
    console.log(`[League] ${team.name}: ${totalLp} LP (${players.length} master+ players)`);
  }
}

async function getEloLeague() {
  const players = await Player.find({ puuid: { $exists: true, $ne: null }, is_league: true, active: true });

  for (const player of players) {
    console.log(`[League] Fetching elo for ${player.game_name}#${player.tag_line}`);
    try {
      const rank = await getRankByPuuid(player.puuid, player.region || 'euw1');
      if (!rank) continue;

      await Player.findByIdAndUpdate(player._id, {
        current_tier: rank.tier,
        current_rank: rank.rank,
        current_lp: rank.leaguePoints,
        current_wins: rank.wins || 0,
        current_losses: rank.losses || 0,
        last_fetched_at: new Date(),
      });

      // Riot API rate limit: 20 req/s, 100 req/2min
      await sleep(500);
    } catch (error) {
      console.error(`[League] Error fetching elo for ${player.game_name}#${player.tag_line}:`, error.message);
    }
  }

  await updateTeamLeagueLp();
}

module.exports = getEloLeague;
