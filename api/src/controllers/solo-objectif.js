const express = require('express');
const router = express.Router();
const passport = require('passport');
const SoloObjectif = require('../models/solo-objectif');
const ERROR_CODES = require('../utils/errorCodes');
const { capture } = require('../services/sentry');
const { client: geminiClient } = require('../services/gemini');

router.get('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const soloObjectif = await SoloObjectif.findById(req.params.id);
    if (!soloObjectif) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });
    return res.status(200).send({ ok: true, data: soloObjectif });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.put('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const soloObjectif = await SoloObjectif.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!soloObjectif) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });
    return res.status(200).send({ ok: true, data: soloObjectif });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/search', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    let query = {};
    if (req.body.team_id) query.team_id = req.body.team_id;
    if (req.body.player_id) query.player_id = req.body.player_id;
    if (req.body.solo_objectif_id) query.solo_objectif_id = req.body.solo_objectif_id;
    const data = await SoloObjectif.find(query).sort({ createdAt: -1 });
    return res.status(200).send({ ok: true, data });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const { name, request, player_id, player_name } = req.body;

    const prompt = `Tu es un parser d'objectifs League of Legends. Transforme la demande du coach en règle structurée JSON.

METRICS DISPONIBLES (endgame - fin de partie):
- kills, deaths, assists (KDA)
- totalMinionsKilled (CS minions lane), neutralMinionsKilled (CS jungle)
- cs_per_min (CS total par minute, calculé: (totalMinionsKilled + neutralMinionsKilled) / (gameDuration / 60))
- goldEarned, goldSpent
- totalDamageDealtToChampions, physicalDamageDealtToChampions, magicDamageDealtToChampions
- totalDamageTaken, damageSelfMitigated
- visionScore, wardsPlaced, wardsKilled, detectorWardsPlaced, visionWardsBoughtInGame
- turretKills, dragonKills, baronKills
- firstBloodKill, firstBloodAssist, firstTowerKill
- doubleKills, tripleKills, pentaKills
- totalHealsOnTeammates, totalDamageShieldedOnTeammates
- kda (calculé: (kills + assists) / max(deaths, 1))
- kill_participation (calculé)
- damage_per_min (calculé: totalDamageDealtToChampions / (gameDuration / 60))
- gold_per_min (calculé: goldEarned / (gameDuration / 60))
- vision_per_min (calculé: visionScore / (gameDuration / 60))

METRICS DISPONIBLES (timeline - à un timing précis):
- totalMinionsKilled (CS à X min)
- totalGold (gold à X min)
- xp (XP à X min)
- level (niveau à X min)

RÈGLES:
- operator: ">", ">=", "<", "<=", "=="
- timing: nombre de minutes (null si fin de partie)
- source: "timeline" si timing précis, "endgame" si fin de partie
- Réponds UNIQUEMENT avec le JSON, rien d'autre

EXEMPLES:
"CS supérieur à 100 à 10min" → {"metric":"totalMinionsKilled","operator":">=","value":100,"timing":10,"source":"timeline"}
"Moins de 3 deaths" → {"metric":"deaths","operator":"<=","value":3,"timing":null,"source":"endgame"}
"Plus de 7 CS/min" → {"metric":"cs_per_min","operator":">=","value":7,"timing":null,"source":"endgame"}
"Vision score au dessus de 40" → {"metric":"visionScore","operator":">=","value":40,"timing":null,"source":"endgame"}
"Plus de 8k gold à 15 min" → {"metric":"totalGold","operator":">=","value":8000,"timing":15,"source":"timeline"}

DEMANDE: "${name}${request ? ` - ${request}` : ''}"`;

    const response = await geminiClient.models.generateContent({ model: 'gemini-3-pro-preview', contents: prompt });
    const text = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const rule = JSON.parse(
      text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim(),
    );

    const soloObjectif = await SoloObjectif.create({
      name,
      request,
      rule,
      player_id,
      player_name,
      team_id: req.user.team_id,
      team_name: req.user.team_name,
      request,
    });

    return res.status(200).send({ ok: true, data: soloObjectif });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.delete('/:id', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const soloObjectif = await SoloObjectif.findByIdAndDelete(req.params.id);
    if (!soloObjectif) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });
    return res.status(200).send({ ok: true, data: soloObjectif });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

module.exports = router;
