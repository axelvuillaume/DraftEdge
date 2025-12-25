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

router.post('/upload-screenshot', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const { screenshot, user } = req.body;
    if (!screenshot) return res.status(400).send({ ok: false, code: ERROR_CODES.INVALID_BODY });

    const cleanScreenshot = screenshot.replace(/^data:image\/\w+;base64,/, '');

    const contents = [
      {
        role: 'user',
        parts: [
          {
            text: `You are an expert League of Legends analyst.
        
TASK: Extract game data from this League of Legends end-game screenshot.

INSTRUCTIONS:
1. Identify the 10 champions in the scoreboard using their official League of Legends champion names.
2. Extract all player statistics visible in the screenshot.
3. Use the exact champion names as they appear in League of Legends (e.g., "Ahri", "Lee Sin", "Miss Fortune", "Twisted Fate").
4. Determine each player's role based on their champion. Roles are: "top", "jungle", "mid", "bottom", "support".

OUTPUT STRUCTURE (JSON ONLY):
{
  "gameInfo": {
    "result": "victory" or "defeat",
    "duration": "mm:ss",
    "mode": "string",
    "date": "dd/mm/yyyy"
  },
  "team1": {
    "totalKills": number,
    "totalDeaths": number,
    "totalAssists": number,
    "totalGold": number,
    "players": [
      {
        "level": number,
        "champion": "Champion Name",
        "summonerName": "string",
        "role": "top" | "jungle" | "mid" | "bottom" | "support",
        "kills": number,
        "deaths": number,
        "assists": number,
        "cs": number,
        "gold": number
      }
    ]
  },
  "team2": { ...same structure... }
}`,
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
    const text = result.text;

    let analysis;
    try {
      analysis = JSON.parse(text);
    } catch (e) {
      console.error('Gemini JSON parse error:', e);
      return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR, message: 'Failed to parse Gemini response' });
    }

    // const side = team?.side || 'blue';

    const gameExist = await Game.findOne({
      date: analysis.gameInfo.date,
      duration: durationToSeconds(analysis.gameInfo.duration),
      'blue_team.total_gold': analysis.team1.totalGold,
      'red_team.total_gold': analysis.team2.totalGold,
    });

    if (gameExist) return res.status(500).send({ ok: false, code: ERROR_CODES.GAME_ALREADY_EXISTS });

    const game = await Game.create({
      name: analysis.gameInfo.date + ' ' + analysis.gameInfo.duration,
      duration: durationToSeconds(analysis.gameInfo.duration),
      // side,j
      win: analysis.gameInfo.result.toLowerCase() === 'victory',
      // opponent_name: team?.opponent_name || 'Unknown',
      date: analysis.gameInfo.date,
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
      game_duration: durationToSeconds(analysis.gameInfo.duration),
      kills: player.kills,
      deaths: player.deaths,
      assists: player.assists,
      creep: player.cs,
      gold: player.gold,
      champion: player.champion,
      level: player.level,
      role: player.role,
    }));

    const team2Stats = analysis.team2.players.map((player) => ({
      summoner_name: player.summonerName,
      team_id: user?.team_id || null,
      team_name: user?.team_name || null,
      game_id: game._id,
      game_name: game.name,
      game_win: !game.win,
      game_duration: durationToSeconds(analysis.gameInfo.duration),
      opponent: true,
      kills: player.kills,
      deaths: player.deaths,
      assists: player.assists,
      creep: player.cs,
      gold: player.gold,
      champion: player.champion,
      level: player.level,
      role: player.role,
    }));

    await PlayerStats.insertMany([...team1Stats, ...team2Stats]);

    return res.status(200).send({ ok: true });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR, message: error.message });
  }
});

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
