const express = require('express');
const router = express.Router();
const passport = require('passport');
const SoloObjectif = require('../models/solo-objectif');
const ERROR_CODES = require('../utils/errorCodes');
const { capture } = require('../services/sentry');
const { client: geminiClient } = require('../services/gemini');
const { getPuuidByRiotId } = require('../services/riotgames');

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

router.post('/check-account', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const { game_name, tag_line, region } = req.body;
    if (!game_name || !tag_line) return res.status(400).send({ ok: false, code: 'MISSING_RIOT_ID' });
    const puuid = await getPuuidByRiotId(game_name, tag_line, region || 'euw1');
    if (!puuid) return res.status(404).send({ ok: false, code: 'ACCOUNT_NOT_FOUND' });
    return res.status(200).send({ ok: true, data: { puuid, game_name, tag_line, region: region || 'euw1' } });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

router.post('/', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const { name, request, player_id, player_name, champions, role, account } = req.body;

    const prompt = `Tu es un parser d'objectifs League of Legends. Transforme la demande du coach en règle structurée JSON.
Les noms de metrics doivent correspondre EXACTEMENT aux champs de l'API Riot Games. Pour les champs nestés, utilise la dot notation (ex: "damageStats.totalDamageDoneToChampions").
On ne gère que les stats du joueur lui-même, pas celles des adversaires ou coéquipiers.

IL EXISTE 3 TYPES D'OBJECTIFS:

1. "per_game" — évalué sur chaque match individuellement (ex: "moins de 3 deaths", "CS > 100 à 10min")
2. "aggregate" — compter/sommer/moyenner sur une période (ex: "jouer 5 games par jour", "win 3 games cette semaine", "average 7 kills par semaine")
3. "streak" — condition remplie sur N games consécutives (ex: "win 3 games d'affilée", "0 deaths 2 games de suite")

METRICS ENDGAME (source: "endgame", timing: null) — champs du match:
- kills, deaths, assists
- win (boolean: true/false, utilise value 1 pour true, 0 pour false)
- totalMinionsKilled (CS lane), neutralMinionsKilled (CS jungle)
- goldEarned, goldSpent
- totalDamageDealtToChampions, physicalDamageDealtToChampions, magicDamageDealtToChampions, trueDamageDealtToChampions
- totalDamageTaken, damageSelfMitigated
- visionScore, wardsPlaced, wardsKilled, detectorWardsPlaced, visionWardsBoughtInGame
- turretKills, dragonKills, baronKills
- firstBloodKill, firstBloodAssist, firstTowerKill
- doubleKills, tripleKills, pentaKills
- totalHealsOnTeammates, totalDamageShieldedOnTeammates
- damageDealtToTurrets, damageDealtToObjectives
- challenges.kda, challenges.killParticipation, challenges.damagePerMinute, challenges.goldPerMinute, challenges.visionScorePerMinute

METRICS CALCULÉES (source: "endgame", timing: null):
- cs_per_min (CS/min = totalMinionsKilled + neutralMinionsKilled / durée)
- kda ((kills+assists) / max(1, deaths))

METRICS TIMELINE (source: "timeline", timing: N minutes):
Champs participantFrames:
- minionsKilled (CS lane à X min)
- jungleMinionsKilled (CS jungle à X min)
- totalGold (gold total à X min)
- currentGold (gold actuel à X min)
- xp (XP à X min)
- level (niveau à X min)
- damageStats.totalDamageDoneToChampions (dégâts aux champions à X min)
- damageStats.magicDamageDoneToChampions (dégâts magiques aux champions à X min)
- damageStats.physicalDamageDoneToChampions (dégâts physiques aux champions à X min)
- damageStats.totalDamageDone (dégâts totaux à X min)
- damageStats.totalDamageTaken (dégâts subis à X min)
Comptés via events (aussi disponibles en timeline):
- kills (kills à X min)
- deaths (morts à X min)
- assists (assists à X min)

METRICS SPÉCIALES POUR AGGREGATE:
- games_played (nombre de games jouées — utilisé avec fn "count" sans filtre)

FORMAT DE RÉPONSE — un seul objet JSON:
{
  "type": "per_game" | "aggregate" | "streak",
  "rule": { "metric": "...", "operator": "...", "value": N, "timing": N|null, "source": "endgame"|"timeline" },
  "aggregate": { "fn": "count"|"sum"|"avg", "period": "daily"|"weekly", "minGames": N|null },
  "streak_count": N
}

RÈGLES:
- Pour per_game: rule obligatoire, aggregate et streak à null
- Pour aggregate avec fn "count": rule.metric = la metric à filtrer (ex: "win" pour compter les wins), rule.operator et rule.value = le seuil à atteindre sur le count. Si on compte juste les games jouées, rule.metric = "games_played"
- Pour aggregate avec fn "sum"/"avg": rule.metric = la stat à sommer/moyenner, rule.operator et rule.value = le seuil
- Pour streak: rule = la condition par game, streak_count = nombre de games consécutives
- operator: ">", ">=", "<", "<=", "=="
- timing: nombre de minutes (null si fin de partie)
- source: "timeline" si timing précis, "endgame" si fin de partie
- Réponds UNIQUEMENT avec le JSON, rien d'autre

EXEMPLES:
"CS supérieur à 100 à 10min" → {"type":"per_game","rule":{"metric":"minionsKilled","operator":">=","value":100,"timing":10,"source":"timeline"},"aggregate":null,"streak_count":null}
"Moins de 3 deaths" → {"type":"per_game","rule":{"metric":"deaths","operator":"<=","value":3,"timing":null,"source":"endgame"},"aggregate":null,"streak_count":null}
"Jouer 5 games par jour" → {"type":"aggregate","rule":{"metric":"games_played","operator":">=","value":5,"timing":null,"source":"endgame"},"aggregate":{"fn":"count","period":"daily","minGames":null},"streak_count":null}
"Win 3 games par jour" → {"type":"aggregate","rule":{"metric":"win","operator":">=","value":3,"timing":null,"source":"endgame"},"aggregate":{"fn":"count","period":"daily","minGames":null},"streak_count":null}
"Moyenne de kills > 7 par semaine" → {"type":"aggregate","rule":{"metric":"kills","operator":">=","value":7,"timing":null,"source":"endgame"},"aggregate":{"fn":"avg","period":"weekly","minGames":3},"streak_count":null}
"Win 3 games d'affilée" → {"type":"streak","rule":{"metric":"win","operator":"==","value":1,"timing":null,"source":"endgame"},"aggregate":null,"streak_count":3}
"0 deaths pendant 2 games de suite" → {"type":"streak","rule":{"metric":"deaths","operator":"==","value":0,"timing":null,"source":"endgame"},"aggregate":null,"streak_count":2}
"Juste win" → {"type":"per_game","rule":{"metric":"win","operator":"==","value":1,"timing":null,"source":"endgame"},"aggregate":null,"streak_count":null}

DEMANDE: "${name}${request ? ` - ${request}` : ''}"`;

    let parsed;
    try {
      const response = await geminiClient.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      const text = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || '';
      parsed = JSON.parse(
        text
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim(),
      );
    } catch (e) {
      capture(e);
      return res.status(422).send({ ok: false, code: ERROR_CODES.RULE_GENERATION_FAILED });
    }

    // --- Validation & correction ---
    const VALID_OPERATORS = ['>', '>=', '<', '<=', '=='];
    const VALID_TYPES = ['per_game', 'aggregate', 'streak'];

    if (!parsed?.rule?.metric || !VALID_OPERATORS.includes(parsed.rule.operator) || parsed.rule.value == null) {
      return res.status(422).send({ ok: false, code: ERROR_CODES.RULE_GENERATION_FAILED });
    }

    // Force type si absent
    if (!parsed.type || !VALID_TYPES.includes(parsed.type)) parsed.type = 'per_game';

    // Si metric = games_played, force aggregate count
    if (parsed.rule.metric === 'games_played' && parsed.type !== 'aggregate') {
      parsed.type = 'aggregate';
      parsed.aggregate = { fn: 'count', period: parsed.aggregate?.period || 'daily', minGames: null };
    }

    // Si aggregate mais pas de fn/period, corriger
    if (parsed.type === 'aggregate') {
      if (!parsed.aggregate?.fn) parsed.aggregate = { ...parsed.aggregate, fn: 'count' };
      if (!parsed.aggregate?.period) parsed.aggregate = { ...parsed.aggregate, period: 'daily' };
    }

    // Si streak mais pas de count, corriger
    if (parsed.type === 'streak') {
      if (!parsed.streak_count || parsed.streak_count < 2) parsed.streak_count = parsed.streak?.count || 2;
    }

    // Force source si absent
    if (!parsed.rule.source) parsed.rule.source = parsed.rule.timing ? 'timeline' : 'endgame';

    const soloObjectif = await SoloObjectif.create({
      name,
      request,
      type: parsed.type,
      rule: parsed.rule,
      ...(parsed.type === 'aggregate' && { aggregate: parsed.aggregate }),
      ...(parsed.type === 'streak' && { streak_count: parsed.streak_count }),
      champions: champions || [],
      role: role || null,
      player_id,
      player_name,
      team_id: req.user.team_id,
      team_name: req.user.team_name,
      ...(account?.puuid && { account }),
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
