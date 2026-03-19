const Player = require('../models/player');
const SoloQSnapshot = require('../models/soloq-snapshot');
const { getRankByPuuid } = require('../services/riotgames');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getElo() {
  const players = await Player.find({ puuid: { $exists: true, $ne: null }, connected_at: { $exists: true, $ne: null }, is_league: { $ne: true } });

  for (const player of players) {
    console.log(`Fetching elo for ${player.game_name}#${player.tag_line}`);
    try {
      const rank = await getRankByPuuid(player.puuid, player.region || 'euw1');
      if (!rank) continue;

      const wins = rank.wins || 0;
      const losses = rank.losses || 0;
      const totalGames = wins + losses;

      await SoloQSnapshot.create({
        player_id: player._id,
        player_summoner_name: player.game_name,
        player_summoner_tag: player.tag_line,
        team_id: player.team_id,
        team_name: player.team_name,
        tier: rank.tier,
        rank: rank.rank,
        league_points: rank.leaguePoints,
        wins,
        losses,
        win_rate: totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0,
        fetched_at: new Date(),
      });

      await Player.findByIdAndUpdate(player._id, {
        current_tier: rank.tier,
        current_rank: rank.rank,
        current_lp: rank.leaguePoints,
        current_wins: wins,
        current_losses: losses,
        last_fetched_at: new Date(),
      });

      // Riot API rate limit: 20 req/s, 100 req/2min
      await sleep(1000);
    } catch (error) {
      console.error(`Error fetching elo for ${player.game_name}#${player.tag_line}:`, error.message);
    }
  }
}

module.exports = getElo;
