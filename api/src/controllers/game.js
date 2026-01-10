const express = require('express');
const router = express.Router();
const passport = require('passport');
const Game = require('../models/game');
const PlayerStats = require('../models/playerstats');
const ERROR_CODES = require('../utils/errorCodes');
const { capture } = require('../services/sentry');
const { client } = require('../services/gemini');

const durationToSeconds = (durationString) => {
  if (!durationString || typeof durationString !== 'string') return 0;
  const parts = durationString.split(':');
  if (parts.length !== 2) return 0;
  const minutes = parseInt(parts[0], 10) || 0;
  const seconds = parseInt(parts[1], 10) || 0;
  return minutes * 60 + seconds;
};

// Original analysis function for Scoreboard (initial upload)
const analyzeScoreboard = async (screenshot) => {
  const cleanScreenshot = screenshot.replace(/^data:image\/\w+;base64,/, '');

  const contents = [
    {
      role: 'user',
      parts: [
        {
          text: `You are an expert League of Legends analyst.

TASK: Analyze this League of Legends post-game screenshot and extract all visible data.

STEP 1: Identify the screenshot type based on the active tab:
- "scoreboard": Main scoreboard with KDA, CS, gold per player, items
- "stats_combat": Stats tab showing Combat section (KDA, Killing Spree, Multi Kill, CC Score, First Blood)
- "stats_damage": Stats tab showing Damage Dealt section
- "stats_damage_taken": Stats tab showing Damage Taken section  
- "stats_income": Stats tab showing Income section
- "stats_vision": Stats tab showing Vision section

STEP 2: Extract game header info (ALWAYS visible at top of any screenshot):
- Result: "victory" or "defeat"
- Duration: "mm:ss"
- Date: "dd/mm/yyyy"

STEP 3: Identify ALL 10 champions by their icons
- For scoreboard: icons are next to player names
- For stats tabs: icons are displayed at the top (5 left = team1, 5 right = team2)
- Use exact champion names as they appear in League of Legends
- Determine each player's role based on their champion: "top", "jungle", "mid", "bottom", "support"

STEP 4: Extract all statistics visible for the detected screenshot type

OUTPUT STRUCTURE (JSON ONLY):
{
  "screenshotType": "scoreboard" | "stats_combat" | "stats_damage" | "stats_damage_taken" | "stats_income" | "stats_vision",
  "gameInfo": {
    "result": "victory" | "defeat",
    "duration": "mm:ss",
    "date": "dd/mm/yyyy",
    "mode": "string"
  },
  "team1": {
    "totalKills": number | null,
    "totalDeaths": number | null,
    "totalAssists": number | null,
    "totalGold": number | null,
    "players": [
      {
        "champion": "Champion Name",
        "summonerName": "string" | null,
        "role": "top" | "jungle" | "mid" | "bottom" | "support",
        "level": number | null,
        "kills": number | null,
        "deaths": number | null,
        "assists": number | null,
        "cs": number | null,
        "gold": number | null,
        "combat": {
          "largestKillingSpree": number | null,
          "largestMultiKill": number | null,
          "crowdControlScore": number | null,
          "firstBlood": boolean | null
        } | null,
        "damageDealt": {
          "totalDamageToChampions": number | null,
          "physicalDamageToChampions": number | null,
          "magicDamageToChampions": number | null,
          "trueDamageToChampions": number | null,
          "totalDamageDealt": number | null,
          "physicalDamageDealt": number | null,
          "magicDamageDealt": number | null,
          "trueDamageDealt": number | null,
          "largestCriticalStrike": number | null
          "totalDamageToTowers": number | null,
          "totalDamageToObjectives": number | null,
        } | null,
        "damageTaken": {
          "damageHealed": number | null,
          "totalDamageTaken": number | null,
          "physicalDamageTaken": number | null,
          "magicDamageTaken": number | null,
          "trueDamageTaken": number | null,
          "totalDamageSelfMitigated": number | null
        } | null,
        "vision": {
          "visionScore": number | null,
          "wardsPlaced": number | null,
          "wardsDestroyed": number | null,
          "controlWardsPurchased": number | null
        } | null,
        "income": {
          "goldEarned": number | null,
          "goldSpent": number | null,
          "totalMinionsKilled": number | null,
          "neutralMinionsKilled": number | null,
          "neutralMinionsKilledInTeamJungle": number | null,
          "neutralMinionsKilledInEnemyJungle": number | null
        } | null,
        "MISC": {
         "towersDestroyed": number | null,
         "inhibitorsDestroyed": number | null,
      }
    ]
  },
  "team2": { ...same structure... }
}

IMPORTANT: 
- Champions and roles are ALWAYS required (detectable from icons)
- Only fill other fields if actually visible in the screenshot
- Use null for non-visible data`,
        },
        {
          inlineData: {
            mimeType: 'image/png',
            data: cleanScreenshot,
          },
        },
      ],
    },
  ];

  const result = await client.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents,
    config: { responseMimeType: 'application/json', temperature: 0 },
  });

  return JSON.parse(result.text);
};

// Step 1 for Advanced Stats: Extract only game info to find the match
const extractGameInfo = async (screenshot) => {
  const cleanScreenshot = screenshot.replace(/^data:image\/\w+;base64,/, '');
  const contents = [
    {
      role: 'user',
      parts: [
        {
          text: `You are an expert League of Legends analyst.
TASK: Extract ONLY the game header information from this screenshot.

OUTPUT STRUCTURE (JSON ONLY):
{
  "date": "dd/mm/yyyy",
  "duration": "mm:ss",
  "result": "victory" | "defeat"
}`,
        },
        {
          inlineData: { mimeType: 'image/png', data: cleanScreenshot },
        },
      ],
    },
  ];

  const result = await client.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents,
    config: { responseMimeType: 'application/json', temperature: 0 },
  });

  return JSON.parse(result.text);
};

// Step 2 for Advanced Stats: Extract stats using known champions context
const analyzeAdvancedStats = async (screenshot, knownChampions) => {
  const cleanScreenshot = screenshot.replace(/^data:image\/\w+;base64,/, '');
  const championsList = knownChampions.join(', ');

  const contents = [
    {
      role: 'user',
      parts: [
        {
          text: `You are an expert League of Legends analyst.

CONTEXT: This is an advanced stats tab for a game where we ALREADY KNOW the champions.
KNOWN CHAMPIONS LIST: ${championsList}

TASK: Extract stats from this screenshot and assign them to the correct champion from the list above.
DO NOT invent new champions. Map the visual data strictly to the known champions.

STEP 1: Identify the screenshot type: "stats_combat", "stats_damage", "stats_damage_taken", "stats_income", "stats_vision".
STEP 2: For each row/column in the screenshot, identify which champion from the KNOWN LIST it corresponds to.
STEP 3: Extract the visible stats.

OUTPUT STRUCTURE (JSON ONLY):
{
  "screenshotType": "string",
  "team1": {
    "players": [
      {
        "champion": "One of the known champions",
        "combat": { ... },
        "damageDealt": { ... },
        "damageTaken": { ... },
        "vision": { ... },
        "income": { ... },
        "MISC": { ... }
      }
    ]
  },
  "team2": {
    "players": [ ... ]
  }
}
Use the same detailed field structure as a full analysis, but ONLY for the visible stats.`,
        },
        {
          inlineData: { mimeType: 'image/png', data: cleanScreenshot },
        },
      ],
    },
  ];

  const result = await client.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents,
    config: { responseMimeType: 'application/json', temperature: 0 },
  });

  return JSON.parse(result.text);
};

router.get('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

    return res.status(200).send({ ok: true, data: game });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.put('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const game = await Game.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!game) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });
    return res.status(200).send({ ok: true, data: game });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/search', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    let query = {};

    if (req.body.team_id) query.team_id = req.body.team_id;
    const limit = req.body.limit || 50;
    const skip = req.body.offset || 0;
    const total = await Game.countDocuments(query);
    const data = await Game.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
    return res.status(200).send({ ok: true, data, total });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    if (!req.body.title || !req.body.message || !req.body.user_id) return res.status(400).send({ ok: false, code: ERROR_CODES.INVALID_BODY });
    const game = await Game.create(req.body);

    return res.status(200).send({ ok: true, data: game });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, data: { code: ERROR_CODES.SERVER_ERROR } });
  }
});

router.delete('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const game = await Game.findByIdAndDelete(req.params.id);
    if (!game) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

    await PlayerStats.deleteMany({ game_id: game._id });

    return res.status(200).send({ ok: true });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/upload-scoreboard', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const { screenshot, user } = req.body;
    if (!screenshot) return res.status(400).send({ ok: false, code: ERROR_CODES.INVALID_BODY });

    let analysis;
    try {
      analysis = await analyzeScoreboard(screenshot);
    } catch (e) {
      console.error('Gemini error:', e);
      return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR, message: 'Failed to analyze screenshot' });
    }

    const gameDuration = durationToSeconds(analysis.gameInfo.duration);
    const isVictory = analysis.gameInfo.result.toLowerCase() === 'victory';
    const cleanScreenshot = screenshot.replace(/^data:image\/\w+;base64,/, '');

    let game;
    try {
      game = await Game.create({
        name: analysis.gameInfo.date + ' ' + analysis.gameInfo.duration,
        duration: gameDuration,
        screenshot: cleanScreenshot,
        win: isVictory,
        date: analysis.gameInfo.date,
        mode: analysis.gameInfo.mode,
        team_id: user?.team_id || null,
        team_name: user?.team_name || null,
        blue_team: {
          total_kills: analysis.team1.totalKills,
          total_deaths: analysis.team1.totalDeaths,
          total_assists: analysis.team1.totalAssists,
          total_gold: analysis.team1.totalGold,
        },
        red_team: {
          total_kills: analysis.team2.totalKills,
          total_deaths: analysis.team2.totalDeaths,
          total_assists: analysis.team2.totalAssists,
          total_gold: analysis.team2.totalGold,
        },
      });

      const team1Stats = analysis.team1.players.map((player) => ({
        summoner_name: player.summonerName,
        opponent: false,
        team_id: user?.team_id || null,
        team_name: user?.team_name || null,
        game_id: game._id,
        game_name: game.name,
        game_win: game.win,
        game_duration: gameDuration,
        champion: player.champion,
        role: player.role,
        level: player.level,
        kills: player.kills,
        deaths: player.deaths,
        assists: player.assists,
        creep: player.cs,
        gold: player.gold,
        ...buildStatsUpdate(player),
      }));

      const team2Stats = analysis.team2.players.map((player) => ({
        summoner_name: player.summonerName,
        opponent: true,
        team_id: user?.team_id || null,
        team_name: user?.team_name || null,
        game_id: game._id,
        game_name: game.name,
        game_win: !game.win,
        game_duration: gameDuration,
        champion: player.champion,
        role: player.role,
        level: player.level,
        kills: player.kills,
        deaths: player.deaths,
        assists: player.assists,
        creep: player.cs,
        gold: player.gold,
        ...buildStatsUpdate(player),
      }));

      await PlayerStats.insertMany([...team1Stats, ...team2Stats]);
    } catch (error) {
      if (error.code === 11000) {
        game = await Game.findOne({ date: analysis.gameInfo.date, duration: gameDuration, team_id: user.team_id, win: isVictory });
      } else {
        throw error;
      }
    }

    if (game) {
      const gameUpdate = {};
      if (analysis.team1.totalKills != null && !game.blue_team?.total_kills) {
        gameUpdate['blue_team.total_kills'] = analysis.team1.totalKills;
        gameUpdate['blue_team.total_deaths'] = analysis.team1.totalDeaths;
        gameUpdate['blue_team.total_assists'] = analysis.team1.totalAssists;
        gameUpdate['blue_team.total_gold'] = analysis.team1.totalGold;
        gameUpdate['red_team.total_kills'] = analysis.team2.totalKills;
        gameUpdate['red_team.total_deaths'] = analysis.team2.totalDeaths;
        gameUpdate['red_team.total_assists'] = analysis.team2.totalAssists;
        gameUpdate['red_team.total_gold'] = analysis.team2.totalGold;
      }
      if (Object.keys(gameUpdate).length > 0) await Game.findByIdAndUpdate(game._id, { $set: gameUpdate });

      const updatePromises = [];

      for (const player of analysis.team1.players) {
        const updateData = buildPlayerUpdate(player);
        if (Object.keys(updateData).length > 0)
          updatePromises.push(PlayerStats.findOneAndUpdate({ game_id: game._id, champion: player.champion }, { $set: updateData }, { new: true, upsert: true }));
      }

      for (const player of analysis.team2.players) {
        const updateData = buildPlayerUpdate(player);
        if (Object.keys(updateData).length > 0)
          updatePromises.push(PlayerStats.findOneAndUpdate({ game_id: game._id, champion: player.champion }, { $set: updateData }, { new: true, upsert: true }));
      }

      await Promise.all(updatePromises);
    }

    return res.status(200).send({ ok: true });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR, message: error.message });
  }
});

router.post('/upload-advanced-stats', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const { screenshot, user } = req.body;
    if (!screenshot) return res.status(400).send({ ok: false, code: ERROR_CODES.INVALID_BODY });

    // Step 1: Extract basic info to find the game
    let gameInfo;
    try {
      gameInfo = await extractGameInfo(screenshot);
    } catch (e) {
      console.error('Gemini error (extractGameInfo):', e);
      return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR, message: 'Failed to extract game info' });
    }

    const gameDuration = durationToSeconds(gameInfo.duration);

    // Fuzzy search for game (+/- 2 minutes = 120 seconds)
    const game = await Game.findOne({
      date: gameInfo.date,
      duration: { $gte: gameDuration - 120, $lte: gameDuration + 120 },
      team_id: user?.team_id,
    });

    if (!game) {
      return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND, message: 'Game not found. Please upload scoreboard first.' });
    }

    // Step 2: Get existing champions for this game
    const existingStats = await PlayerStats.find({ game_id: game._id }).select('champion');
    const knownChampions = existingStats.map((s) => s.champion);

    if (knownChampions.length === 0) {
      return res.status(400).send({ ok: false, code: ERROR_CODES.INVALID_BODY, message: 'No players found for this game.' });
    }

    // Step 3: Analyze stats using known champions
    let analysis;
    try {
      analysis = await analyzeAdvancedStats(screenshot, knownChampions);
    } catch (e) {
      console.error('Gemini error (analyzeAdvancedStats):', e);
      return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR, message: 'Failed to analyze stats' });
    }

    const updatePromises = [];

    // Process Team 1
    for (const player of analysis.team1?.players || []) {
      const updateData = buildStatsUpdate(player);
      if (Object.keys(updateData).length > 0) {
        updatePromises.push(
          PlayerStats.findOneAndUpdate(
            { game_id: game._id, champion: player.champion },
            { $set: updateData },
            { new: true, upsert: false } // upsert: false is key here
          )
        );
      }
    }

    // Process Team 2
    for (const player of analysis.team2?.players || []) {
      const updateData = buildStatsUpdate(player);
      if (Object.keys(updateData).length > 0) {
        updatePromises.push(PlayerStats.findOneAndUpdate({ game_id: game._id, champion: player.champion }, { $set: updateData }, { new: true, upsert: false }));
      }
    }

    await Promise.all(updatePromises);

    return res.status(200).send({ ok: true });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR, message: error.message });
  }
});

function buildStatsUpdate(player) {
  const update = {};

  // Combat stats
  if (player.combat) {
    update.combat = {};
    if (player.combat.largestKillingSpree != null) update.combat.largestKillingSpree = player.combat.largestKillingSpree;
    if (player.combat.largestMultiKill != null) update.combat.largestMultiKill = player.combat.largestMultiKill;
    if (player.combat.crowdControlScore != null) update.combat.crowdControlScore = player.combat.crowdControlScore;
    if (player.combat.firstBlood != null) update.combat.firstBlood = player.combat.firstBlood;
  }

  // Damage dealt stats
  if (player.damageDealt) {
    update.damageDealt = {};
    if (player.damageDealt.totalDamageToChampions != null) update.damageDealt.totalDamageToChampions = player.damageDealt.totalDamageToChampions;
    if (player.damageDealt.physicalDamageToChampions != null) update.damageDealt.physicalDamageToChampions = player.damageDealt.physicalDamageToChampions;
    if (player.damageDealt.magicDamageToChampions != null) update.damageDealt.magicDamageToChampions = player.damageDealt.magicDamageToChampions;
    if (player.damageDealt.trueDamageToChampions != null) update.damageDealt.trueDamageToChampions = player.damageDealt.trueDamageToChampions;
    if (player.damageDealt.totalDamageDealt != null) update.damageDealt.totalDamageDealt = player.damageDealt.totalDamageDealt;
    if (player.damageDealt.physicalDamageDealt != null) update.damageDealt.physicalDamageDealt = player.damageDealt.physicalDamageDealt;
    if (player.damageDealt.magicDamageDealt != null) update.damageDealt.magicDamageDealt = player.damageDealt.magicDamageDealt;
    if (player.damageDealt.trueDamageDealt != null) update.damageDealt.trueDamageDealt = player.damageDealt.trueDamageDealt;
    if (player.damageDealt.largestCriticalStrike != null) update.damageDealt.largestCriticalStrike = player.damageDealt.largestCriticalStrike;
    if (player.damageDealt.totalDamageToTowers != null) update.damageDealt.totalDamageToTowers = player.damageDealt.totalDamageToTowers;
    if (player.damageDealt.totalDamageToObjectives != null) update.damageDealt.totalDamageToObjectives = player.damageDealt.totalDamageToObjectives;
  }

  // Damage taken stats
  if (player.damageTaken) {
    update.damageTaken = {};
    if (player.damageTaken.damageHealed != null) update.damageTaken.damageHealed = player.damageTaken.damageHealed;
    if (player.damageTaken.totalDamageTaken != null) update.damageTaken.totalDamageTaken = player.damageTaken.totalDamageTaken;
    if (player.damageTaken.physicalDamageTaken != null) update.damageTaken.physicalDamageTaken = player.damageTaken.physicalDamageTaken;
    if (player.damageTaken.magicDamageTaken != null) update.damageTaken.magicDamageTaken = player.damageTaken.magicDamageTaken;
    if (player.damageTaken.trueDamageTaken != null) update.damageTaken.trueDamageTaken = player.damageTaken.trueDamageTaken;
    if (player.damageTaken.totalDamageSelfMitigated != null) update.damageTaken.totalDamageSelfMitigated = player.damageTaken.totalDamageSelfMitigated;
  }

  // Vision stats
  if (player.vision) {
    update.vision = {};
    if (player.vision.visionScore != null) update.vision.visionScore = player.vision.visionScore;
    if (player.vision.wardsPlaced != null) update.vision.wardsPlaced = player.vision.wardsPlaced;
    if (player.vision.wardsDestroyed != null) update.vision.wardsDestroyed = player.vision.wardsDestroyed;
    if (player.vision.controlWardsPurchased != null) update.vision.controlWardsPurchased = player.vision.controlWardsPurchased;
  }

  // Income stats
  if (player.income) {
    update.income = {};
    if (player.income.goldEarned != null) update.income.goldEarned = player.income.goldEarned;
    if (player.income.goldSpent != null) update.income.goldSpent = player.income.goldSpent;
    if (player.income.totalMinionsKilled != null) update.income.totalMinionsKilled = player.income.totalMinionsKilled;
    if (player.income.neutralMinionsKilled != null) update.income.neutralMinionsKilled = player.income.neutralMinionsKilled;
    if (player.income.neutralMinionsKilledInTeamJungle != null) update.income.neutralMinionsKilledInTeamJungle = player.income.neutralMinionsKilledInTeamJungle;
    if (player.income.neutralMinionsKilledInEnemyJungle != null) update.income.neutralMinionsKilledInEnemyJungle = player.income.neutralMinionsKilledInEnemyJungle;
  }

  // Miscellaneous stats
  if (player.MISC) {
    update.misc = {};
    if (player.MISC.towersDestroyed != null) update.misc.towersDestroyed = player.MISC.towersDestroyed;
    if (player.MISC.inhibitorsDestroyed != null) update.misc.inhibitorsDestroyed = player.MISC.inhibitorsDestroyed;
  }

  return update;
}

function buildPlayerUpdate(player) {
  const update = {};

  if (player.summonerName != null) update.summoner_name = player.summonerName;
  if (player.level != null) update.level = player.level;
  if (player.kills != null) update.kills = player.kills;
  if (player.deaths != null) update.deaths = player.deaths;
  if (player.assists != null) update.assists = player.assists;
  if (player.cs != null) update.creep = player.cs;
  if (player.gold != null) update.gold = player.gold;

  return { ...update, ...buildStatsUpdate(player) };
}

router.post('/stats', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const games = await Game.find({ team_id: req.user.team_id });

    const stats = {
      win_rate: games.filter((game) => game.win).length / games.length,
      total_wins: games.filter((game) => game.win).length,
      total_losses: games.filter((game) => !game.win).length,
      total_games: games.length,
    };

    return res.status(200).send({ ok: true, data: stats });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

module.exports = router;
