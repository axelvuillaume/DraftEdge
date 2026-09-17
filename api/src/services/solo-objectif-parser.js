// Parse une demande d'objectif SoloQ (langage naturel) en règle structurée via Gemini,
// puis valide et normalise le résultat. Retourne null si la règle n'est pas exploitable.
const { capture } = require('./sentry');
const { client: geminiClient } = require('./gemini');

async function parseObjectiveRequest(name, request) {
  const prompt = `Tu es un parser d'objectifs League of Legends. Transforme la demande du coach en règle structurée JSON.
Les noms de metrics doivent correspondre EXACTEMENT aux champs de l'API Riot Games. Pour les champs nestés, utilise la dot notation (ex: "damageStats.totalDamageDoneToChampions").
On ne gère que les stats du joueur lui-même, pas celles des adversaires ou coéquipiers.

IL EXISTE 4 TYPES D'OBJECTIFS:

1. "per_game" — évalué sur chaque match individuellement (ex: "moins de 3 deaths", "CS > 100 à 10min")
2. "aggregate" — UNIQUEMENT pour compter des games ou des wins sur une période (ex: "jouer 5 games par jour", "win 3 games cette semaine", "jouer 20 games au total"). JAMAIS pour une moyenne ou une somme de stat : "average 7 kills par semaine", "moyenne de vision score 3.5", "CS moyen > 8" sont des per_game avec le même seuil (kills >= 7, visionScorePerMinute >= 3.5, ...). La vue per_game calcule déjà les moyennes par semaine.
3. "streak" — condition remplie sur N games consécutives (ex: "win 3 games d'affilée", "0 deaths 2 games de suite")
4. "rank" — atteindre un palier de rank SoloQ (ex: "Monter Gold 1", "Atteindre Platinum", "Passer Diamond 4")

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

CHAMPS SPÉCIAUX POUR RANK:
- target_tier: "IRON" | "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" | "EMERALD" | "DIAMOND" | "MASTER" | "GRANDMASTER" | "CHALLENGER"
- target_division: "I" | "II" | "III" | "IV" (null pour MASTER/GRANDMASTER/CHALLENGER)
- target_lp: nombre de LP requis en plus du palier (0 par défaut, utile pour apex comme "1300 LP Master")
- Si l'utilisateur dit "Atteindre Platinum" sans préciser la division, utiliser IV (= entrée dans le palier)
- Si l'utilisateur donne juste un nombre de LP élevé (ex: "1300 LP", "2000 LP"), cible MASTER division null avec target_lp = le nombre donné

FORMAT DE RÉPONSE — un seul objet JSON:
{
  "type": "per_game" | "aggregate" | "streak" | "rank",
  "rule": { "metric": "...", "operator": "...", "value": N, "timing": N|null, "source": "endgame"|"timeline", "target_tier": "...", "target_division": "...", "target_lp": N },
  "aggregate": { "fn": "count", "period": "daily"|"weekly"|"total" },
  "streak_count": N
}

RÈGLES:
- Pour per_game: rule obligatoire, aggregate et streak à null
- Pour aggregate: fn est TOUJOURS "count". rule.metric = "games_played" pour compter les games, ou "win" pour compter les wins. rule.operator et rule.value = le seuil à atteindre sur le count. fn "sum" et "avg" sont INTERDITS : une demande de moyenne ou de somme d'une stat devient un per_game
- aggregate.period: "daily" (sur la journée), "weekly" (sur la semaine), "total" (pas de fenêtre — objectif cumulatif à vie). Si l'utilisateur dit "20 games" / "100 wins" sans préciser "par jour" ou "par semaine", utilise "total"
- Pour streak: rule = la condition par game, streak_count = nombre de games consécutives
- Pour rank: rule.target_tier obligatoire, rule.target_division obligatoire sauf pour MASTER/GRANDMASTER/CHALLENGER, rule.target_lp par défaut 0; rule.metric="rank", rule.operator=">=", rule.value=0 (placeholders); aggregate et streak à null
- operator: ">", ">=", "<", "<=", "=="
- timing: nombre de minutes (null si fin de partie)
- source: "timeline" si timing précis, "endgame" si fin de partie
- Réponds UNIQUEMENT avec le JSON, rien d'autre

EXEMPLES:
"CS supérieur à 100 à 10min" → {"type":"per_game","rule":{"metric":"minionsKilled","operator":">=","value":100,"timing":10,"source":"timeline"},"aggregate":null,"streak_count":null}
"Moins de 3 deaths" → {"type":"per_game","rule":{"metric":"deaths","operator":"<=","value":3,"timing":null,"source":"endgame"},"aggregate":null,"streak_count":null}
"Jouer 5 games par jour" → {"type":"aggregate","rule":{"metric":"games_played","operator":">=","value":5,"timing":null,"source":"endgame"},"aggregate":{"fn":"count","period":"daily"},"streak_count":null}
"Win 3 games par jour" → {"type":"aggregate","rule":{"metric":"win","operator":">=","value":3,"timing":null,"source":"endgame"},"aggregate":{"fn":"count","period":"daily"},"streak_count":null}
"Moyenne de kills > 7 par semaine" → {"type":"per_game","rule":{"metric":"kills","operator":">=","value":7,"timing":null,"source":"endgame"},"aggregate":null,"streak_count":null}
"Average vision score par minute 3.5 cette semaine" → {"type":"per_game","rule":{"metric":"challenges.visionScorePerMinute","operator":">=","value":3.5,"timing":null,"source":"endgame"},"aggregate":null,"streak_count":null}
"Jouer 20 games" → {"type":"aggregate","rule":{"metric":"games_played","operator":">=","value":20,"timing":null,"source":"endgame"},"aggregate":{"fn":"count","period":"total"},"streak_count":null}
"100 wins au total" → {"type":"aggregate","rule":{"metric":"win","operator":">=","value":100,"timing":null,"source":"endgame"},"aggregate":{"fn":"count","period":"total"},"streak_count":null}
"Win 3 games d'affilée" → {"type":"streak","rule":{"metric":"win","operator":"==","value":1,"timing":null,"source":"endgame"},"aggregate":null,"streak_count":3}
"0 deaths pendant 2 games de suite" → {"type":"streak","rule":{"metric":"deaths","operator":"==","value":0,"timing":null,"source":"endgame"},"aggregate":null,"streak_count":2}
"Juste win" → {"type":"per_game","rule":{"metric":"win","operator":"==","value":1,"timing":null,"source":"endgame"},"aggregate":null,"streak_count":null}
"Monter Gold 1" → {"type":"rank","rule":{"metric":"rank","operator":">=","value":0,"timing":null,"source":"endgame","target_tier":"GOLD","target_division":"I","target_lp":0},"aggregate":null,"streak_count":null}
"Atteindre Platinum" → {"type":"rank","rule":{"metric":"rank","operator":">=","value":0,"timing":null,"source":"endgame","target_tier":"PLATINUM","target_division":"IV","target_lp":0},"aggregate":null,"streak_count":null}
"Passer Diamond 4" → {"type":"rank","rule":{"metric":"rank","operator":">=","value":0,"timing":null,"source":"endgame","target_tier":"DIAMOND","target_division":"IV","target_lp":0},"aggregate":null,"streak_count":null}
"Monter Master" → {"type":"rank","rule":{"metric":"rank","operator":">=","value":0,"timing":null,"source":"endgame","target_tier":"MASTER","target_division":null,"target_lp":0},"aggregate":null,"streak_count":null}
"Atteindre 1300 LP" → {"type":"rank","rule":{"metric":"rank","operator":">=","value":0,"timing":null,"source":"endgame","target_tier":"MASTER","target_division":null,"target_lp":1300},"aggregate":null,"streak_count":null}
"Gold 1 avec 50 LP" → {"type":"rank","rule":{"metric":"rank","operator":">=","value":0,"timing":null,"source":"endgame","target_tier":"GOLD","target_division":"I","target_lp":50},"aggregate":null,"streak_count":null}

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
    return null;
  }

  // --- Validation & correction ---
  const VALID_OPERATORS = ['>', '>=', '<', '<=', '=='];
  const VALID_TYPES = ['per_game', 'aggregate', 'streak', 'rank'];
  const VALID_TIERS = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'];
  const VALID_DIVISIONS = ['I', 'II', 'III', 'IV'];
  const APEX_TIERS = ['MASTER', 'GRANDMASTER', 'CHALLENGER'];

  // Force type si absent
  if (!parsed.type || !VALID_TYPES.includes(parsed.type)) parsed.type = 'per_game';

  // Validation rank: tier requis, division requise hors apex
  if (parsed.type === 'rank') {
    if (!parsed.rule?.target_tier || !VALID_TIERS.includes(parsed.rule.target_tier)) {
      return null;
    }
    if (!APEX_TIERS.includes(parsed.rule.target_tier) && !VALID_DIVISIONS.includes(parsed.rule.target_division)) {
      return null;
    }
    if (APEX_TIERS.includes(parsed.rule.target_tier)) parsed.rule.target_division = null;
    if (parsed.rule.target_lp == null || parsed.rule.target_lp < 0) parsed.rule.target_lp = 0;
    parsed.rule.metric = 'rank';
    parsed.rule.operator = '>=';
    parsed.rule.value = 0;
    parsed.rule.source = 'endgame';
    parsed.rule.timing = null;
  }

  // Validation pour types match-based
  if (parsed.type !== 'rank') {
    if (!parsed?.rule?.metric || !VALID_OPERATORS.includes(parsed.rule.operator) || parsed.rule.value == null) {
      return null;
    }
  }

  // Si metric = games_played, force aggregate count
  if (parsed.rule.metric === 'games_played' && parsed.type !== 'aggregate') {
    parsed.type = 'aggregate';
    parsed.aggregate = { fn: 'count', period: parsed.aggregate?.period || 'daily' };
  }

  // Garde-fou : un aggregate n'a de sens que pour compter des games ou des wins.
  // Une moyenne/somme de stat, ou un count sur une autre metric, redevient un per_game avec le même seuil.
  if (parsed.type === 'aggregate' && (['sum', 'avg'].includes(parsed.aggregate?.fn) || !['games_played', 'win'].includes(parsed.rule.metric))) {
    parsed.type = 'per_game';
    parsed.aggregate = null;
  }

  // Si aggregate mais pas de fn/period, corriger
  if (parsed.type === 'aggregate') {
    parsed.aggregate = { fn: 'count', period: parsed.aggregate?.period || 'daily' };
  }

  // Si streak mais pas de count, corriger
  if (parsed.type === 'streak') {
    if (!parsed.streak_count || parsed.streak_count < 2) parsed.streak_count = parsed.streak?.count || 2;
  }

  // Force source si absent (non-rank)
  if (parsed.type !== 'rank' && !parsed.rule.source) parsed.rule.source = parsed.rule.timing ? 'timeline' : 'endgame';
  return parsed;
}

module.exports = { parseObjectiveRequest };
