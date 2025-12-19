const express = require('express');
const router = express.Router();
const passport = require('passport');
const Game = require('../models/game');
const ERROR_CODES = require('../utils/errorCodes');
const { capture } = require('../services/sentry');
const { client } = require('../services/gemini');
const fs = require('fs');
const path = require('path');

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

    if (req.body.user_id) query.user_id = req.body.user_id;
    if (req.body.read_at) query.read_at = req.body.read_at;
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
    if (!notification) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

    return res.status(200).send({ ok: true });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

const referenceImagePath = path.join(__dirname, '../../assets/champions-reference.png');
const referenceBase64 = fs.readFileSync(referenceImagePath).toString('base64');

router.post('/upload-screenshot', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const { screenshot } = req.body;
    if (!screenshot) return res.status(400).send({ ok: false, code: ERROR_CODES.INVALID_BODY });

    const cleanScreenshot = screenshot.replace(/x^data:image\/\w+;base64,/, '');

    const contents = [
      {
        role: 'user',
        parts: [
          {
            text: `You are an expert League of Legends analyst. 
        
        TASK: Extract game data from the "Screenshot" by cross-referencing it with the "Reference Dictionary".
        
        INSTRUCTIONS:
        1. Identify the 10 champions in the scoreboard (Screenshot).
        2. For EACH champion icon found, visually match it against the "Reference Dictionary" image to get the EXACT name.
        3. Do NOT guess. Verify colors, face direction, and accessories.
        
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
            "players": [
              {
                "champion": "Exact Name from Reference",
                "summonerName": "string",
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
              data: referenceBase64,
            },
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
      model: 'gemini-3-pro-preview',
      contents,
      config: {
        responseMimeType: 'application/json',
        temperature: 0,
      },
    });
    const text = result.text;

    let analysis;
    try {
      analysis = JSON.parse(text);

      console.log(JSON.stringify(analysis, null, 2));
    } catch (e) {
      console.error('Gemini analysis error:', e);
    }

    return res.status(200).send({ ok: true, data: analysis });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR, message: error.message });
  }
});

module.exports = router;
