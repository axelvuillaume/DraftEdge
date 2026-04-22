const Player = require('../models/player');
const SoloQSnapshot = require('../models/soloq-snapshot');
const SoloObjectif = require('../models/solo-objectif');
const { getRankByPuuid } = require('../services/riotgames');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const TIER_ORDER = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'];
const DIVISION_ORDER = ['IV', 'III', 'II', 'I'];
const APEX_TIERS = new Set(['MASTER', 'GRANDMASTER', 'CHALLENGER']);

function rankTuple(tier, division, lp) {
  const tierIdx = TIER_ORDER.indexOf(tier);
  if (tierIdx === -1) return null;
  const divIdx = APEX_TIERS.has(tier) ? DIVISION_ORDER.length - 1 : DIVISION_ORDER.indexOf(division);
  if (divIdx === -1) return null;
  return [tierIdx, divIdx, lp || 0];
}

function rankGte(current, target) {
  if (!current || !target) return false;
  if (current[0] !== target[0]) return current[0] > target[0];
  if (current[1] !== target[1]) return current[1] > target[1];
  return current[2] >= target[2];
}

async function evaluateRankObjectives(player, currentTier, currentDivision, currentLp) {
  const objectives = await SoloObjectif.find({
    player_id: player._id.toString(),
    type: 'rank',
    active: { $ne: false },
    completed: { $ne: true },
    'account.puuid': { $exists: false },
  });
  if (objectives.length === 0) return;

  const current = rankTuple(currentTier, currentDivision, currentLp);
  if (!current) return;

  for (const obj of objectives) {
    const target = rankTuple(obj.rule?.target_tier, obj.rule?.target_division, obj.rule?.target_lp || 0);
    if (!target) continue;
    if (!rankGte(current, target)) continue;
    await SoloObjectif.findByIdAndUpdate(obj._id, { completed: true, completed_at: new Date() });
  }
}

async function evaluateSmurfRankObjectives() {
  const smurfObjectives = await SoloObjectif.find({
    type: 'rank',
    active: { $ne: false },
    completed: { $ne: true },
    'account.puuid': { $exists: true, $ne: null },
  });
  if (smurfObjectives.length === 0) return;

  const byPuuid = {};
  for (const obj of smurfObjectives) {
    if (!byPuuid[obj.account.puuid]) byPuuid[obj.account.puuid] = { account: obj.account, objectives: [] };
    byPuuid[obj.account.puuid].objectives.push(obj);
  }

  for (const puuid of Object.keys(byPuuid)) {
    const { account, objectives } = byPuuid[puuid];
    console.log(`Fetching smurf elo for ${account.game_name}#${account.tag_line}`);
    try {
      const rank = await getRankByPuuid(puuid, account.region || 'euw1');
      if (!rank) {
        await sleep(1000);
        continue;
      }

      const current = rankTuple(rank.tier, rank.rank, rank.leaguePoints);
      if (!current) {
        await sleep(1000);
        continue;
      }

      for (const obj of objectives) {
        const target = rankTuple(obj.rule?.target_tier, obj.rule?.target_division, obj.rule?.target_lp || 0);
        if (!target) continue;
        if (!rankGte(current, target)) continue;
        await SoloObjectif.findByIdAndUpdate(obj._id, { completed: true, completed_at: new Date() });
      }

      await sleep(1000);
    } catch (error) {
      console.error(`Error fetching smurf elo for ${account.game_name}#${account.tag_line}:`, error.message);
    }
  }
}

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

      await evaluateRankObjectives(player, rank.tier, rank.rank, rank.leaguePoints);

      // Riot API rate limit: 20 req/s, 100 req/2min
      await sleep(1000);
    } catch (error) {
      console.error(`Error fetching elo for ${player.game_name}#${player.tag_line}:`, error.message);
    }
  }

  await evaluateSmurfRankObjectives();
}

module.exports = getElo;
