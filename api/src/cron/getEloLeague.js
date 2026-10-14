const Player = require('../models/player');
const { updateTeamLeagueLp } = require('../services/team-league-lp');
const { getRankByPuuid, getAccountByPuuid } = require('../services/riotgames');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Les pros se renomment souvent : on resynchronise game_name / tag_line depuis le puuid
async function syncRiotId(player) {
  const account = await getAccountByPuuid(player.puuid, player.region || 'euw1');
  await sleep(500);
  if (!account) return;
  if (account.gameName === player.game_name && account.tagLine === player.tag_line) return;

  console.log(`[League] Rename detected: ${player.game_name}#${player.tag_line} -> ${account.gameName}#${account.tagLine}`);
  await Player.findByIdAndUpdate(player._id, {
    game_name: account.gameName,
    tag_line: account.tagLine,
    riot_id: `${account.gameName}#${account.tagLine}`,
  });
}

async function getEloLeague() {
  const players = await Player.find({ puuid: { $exists: true, $ne: null }, is_league: true, active: true });

  for (const player of players) {
    console.log(`[League] Fetching elo for ${player.game_name}#${player.tag_line}`);
    try {
      await syncRiotId(player);

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
