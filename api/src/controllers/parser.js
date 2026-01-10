const express = require('express');
const router = express.Router();
const multer = require('multer');
const Game = require('../models/game');
const PlayerStats = require('../models/playerstats');
const CONFIG = require('../config');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

const RIOT_API_KEY = CONFIG.RIOT_API_KEY;
const RIOT_ACCOUNT_API = 'https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id';
const RIOT_LEAGUE_API = 'https://euw1.api.riotgames.com/lol/league/v4/entries/by-puuid';

async function fetchRiotPuuid(gameName, tagLine) {
  if (!RIOT_API_KEY) return null;
  if (!gameName || !tagLine) return null;

  try {
    const url = `${RIOT_ACCOUNT_API}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}?api_key=${RIOT_API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`Riot API error for ${gameName}#${tagLine}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.puuid || null;
  } catch (error) {
    console.error(`Error fetching PUUID for ${gameName}#${tagLine}:`, error.message);
    return null;
  }
}

async function fetchRiotRank(puuid) {
  if (!RIOT_API_KEY) return null;
  if (!puuid) return null;

  try {
    const url = `${RIOT_LEAGUE_API}/${puuid}?api_key=${RIOT_API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`Riot League API error for ${puuid}: ${response.status}`);
      return null;
    }

    const data = await response.json();

    // Chercher le rank Solo/Duo (RANKED_SOLO_5x5)
    const soloQueue = data.find((entry) => entry.queueType === 'RANKED_SOLO_5x5');

    if (!soloQueue) return null;

    return {
      tier: soloQueue.tier,
      rank: soloQueue.rank,
      league_points: soloQueue.leaguePoints,
      wins: soloQueue.wins,
      losses: soloQueue.losses,
      total_games: soloQueue.wins + soloQueue.losses,
      win_rate: Math.round((soloQueue.wins / (soloQueue.wins + soloQueue.losses)) * 100),
    };
  } catch (error) {
    console.error(`Error fetching rank for ${puuid}:`, error.message);
    return null;
  }
}

async function enrichPlayerWithRiotData(player, index) {
  // Délai pour éviter rate limit (100ms entre chaque joueur)
  await new Promise((resolve) => setTimeout(resolve, index * 100));

  const puuid = await fetchRiotPuuid(player.summoner_name, player.riot_tag);

  if (!puuid) {
    return { ...player, PUUID: null };
  }

  await new Promise((resolve) => setTimeout(resolve, 50));

  const rankData = await fetchRiotRank(puuid);

  return { ...player, PUUID: puuid, ...(rankData || {}) };
}

function parseRoflBuffer(buffer) {
  const magic = buffer.slice(0, 4).toString('ascii');
  if (magic !== 'RIOT') {
    throw new Error('Fichier ROFL invalide');
  }

  let gameVersion = 'Unknown';
  const headerStr = buffer.slice(0, 100).toString('utf-8');
  const versionMatch = headerStr.match(/\d+\.\d+\.\d+\.\d+/);
  if (versionMatch) gameVersion = versionMatch[0];

  const searchPattern = Buffer.from('{"gameLength');
  let jsonStart = -1;

  const searchStart = Math.max(0, buffer.length - 2000000);
  for (let i = searchStart; i < buffer.length; i++) {
    if (buffer.slice(i, i + searchPattern.length).equals(searchPattern)) {
      jsonStart = i;
      break;
    }
  }

  if (jsonStart === -1) throw new Error('Métadonnées JSON non trouvées dans le fichier ROFL.');

  let depth = 0,
    jsonEnd = jsonStart;
  for (let i = jsonStart; i < buffer.length; i++) {
    if (buffer[i] === 0x7b) depth++;
    if (buffer[i] === 0x7d) depth--;
    if (depth === 0) {
      jsonEnd = i + 1;
      break;
    }
  }

  try {
    const metadataStr = buffer.slice(jsonStart, jsonEnd).toString('utf-8');
    const metadata = JSON.parse(metadataStr);
    metadata.gameVersion = gameVersion;
    return metadata;
  } catch (e) {
    throw new Error('Erreur lors du parsing des métadonnées JSON : ' + e.message);
  }
}

function normalizeRole(role) {
  if (!role) return null;
  const roleMap = {
    TOP: 'top',
    JUNGLE: 'jungle',
    MIDDLE: 'mid',
    MID: 'mid',
    BOTTOM: 'bottom',
    ADC: 'bottom',
    UTILITY: 'support',
    SUPPORT: 'support',
  };
  return roleMap[role.toUpperCase()] || null;
}

function parsePlayerStats(p, gameData) {
  const durationMinutes = gameData.duration / 60;
  const kills = parseInt(p.CHAMPIONS_KILLED) || 0;
  const deaths = parseInt(p.NUM_DEATHS) || 0;
  const assists = parseInt(p.ASSISTS) || 0;
  const cs = (parseInt(p.MINIONS_KILLED) || 0) + (parseInt(p.NEUTRAL_MINIONS_KILLED) || 0);
  const gold = parseInt(p.GOLD_EARNED) || 0;
  const totalDamage = parseInt(p.TOTAL_DAMAGE_DEALT_TO_CHAMPIONS) || 0;

  return {
    // Game info
    game_id: gameData.game_id,
    game_name: gameData.name,
    game_win: p.WIN === 'Win',
    game_duration: gameData.duration,

    summoner_name: p.RIOT_ID_GAME_NAME || p.NAME,
    riot_tag: p.RIOT_ID_TAG_LINE || '',
    PUUID: null,
    tier: null,
    rank: null,
    league_points: null,
    wins: null,
    losses: null,
    total_games: null,
    win_rate: null,

    // Team context
    team_id: null,
    team_name: null,
    opponent: null,
    side: p.TEAM === '100' ? 'blue' : 'red',
    role: normalizeRole(p.TEAM_POSITION || p.INDIVIDUAL_POSITION),
    champion: p.SKIN,

    // Basic stats
    kills,
    deaths,
    assists,
    level: parseInt(p.LEVEL) || 0,

    // CS & Gold
    cs,
    cs_per_min: durationMinutes > 0 ? Math.round((cs / durationMinutes) * 10) / 10 : 0,
    gold,
    gold_per_min: durationMinutes > 0 ? Math.round(gold / durationMinutes) : 0,

    // Multi-kills
    multi_kills: {
      double: parseInt(p.DOUBLE_KILLS) || 0,
      triple: parseInt(p.TRIPLE_KILLS) || 0,
      quadra: parseInt(p.QUADRA_KILLS) || 0,
      penta: parseInt(p.PENTA_KILLS) || 0,
    },

    // Combat
    combat: {
      killing_spree: parseInt(p.LARGEST_KILLING_SPREE) || 0,
      largest_multi_kill: parseInt(p.LARGEST_MULTI_KILL) || 0,
      first_blood: false,
      solo_kills: parseInt(p.HoL_SoloKills) || 0,
      time_ccing: parseInt(p.TIME_CCING_OTHERS) || 0,
    },

    // Damage dealt
    damage: {
      total_to_champions: totalDamage,
      physical_to_champions: parseInt(p.PHYSICAL_DAMAGE_DEALT_TO_CHAMPIONS) || 0,
      magic_to_champions: parseInt(p.MAGIC_DAMAGE_DEALT_TO_CHAMPIONS) || 0,
      true_to_champions: parseInt(p.TRUE_DAMAGE_DEALT_TO_CHAMPIONS) || 0,
      to_turrets: parseInt(p.TOTAL_DAMAGE_DEALT_TO_TURRETS) || 0,
      to_objectives: parseInt(p.TOTAL_DAMAGE_DEALT_TO_OBJECTIVES) || 0,
      damage_per_min: durationMinutes > 0 ? Math.round(totalDamage / durationMinutes) : 0,
    },

    // Tank stats
    tank: {
      total_taken: parseInt(p.TOTAL_DAMAGE_TAKEN) || 0,
      physical_taken: parseInt(p.PHYSICAL_DAMAGE_TAKEN) || 0,
      magic_taken: parseInt(p.MAGIC_DAMAGE_TAKEN) || 0,
      true_taken: parseInt(p.TRUE_DAMAGE_TAKEN) || 0,
      self_mitigated: parseInt(p.TOTAL_DAMAGE_SELF_MITIGATED) || 0,
      healed: parseInt(p.TOTAL_HEAL) || 0,
      shielded_to_allies: parseInt(p.TOTAL_DAMAGE_SHIELDED_ON_TEAMMATES) || 0,
    },

    // Vision
    vision: {
      score: parseInt(p.VISION_SCORE) || 0,
      wards_placed: parseInt(p.WARD_PLACED) || 0,
      wards_killed: parseInt(p.WARD_KILLED) || 0,
      control_wards_bought: parseInt(p.VISION_WARDS_BOUGHT_IN_GAME) || 0,
    },

    // Farm
    farm: {
      minions: parseInt(p.MINIONS_KILLED) || 0,
      jungle_monsters: parseInt(p.NEUTRAL_MINIONS_KILLED) || 0,
      enemy_jungle: parseInt(p.NEUTRAL_MINIONS_KILLED_ENEMY_JUNGLE) || 0,
      ally_jungle: parseInt(p.NEUTRAL_MINIONS_KILLED_YOUR_JUNGLE) || 0,
    },

    // Objectives
    objectives: {
      turrets: parseInt(p.TURRETS_KILLED) || 0,
      inhibitors: parseInt(p.BARRACKS_KILLED) || 0,
      dragons: parseInt(p.DRAGON_KILLS) || 0,
      barons: parseInt(p.BARON_KILLS) || 0,
      heralds: parseInt(p.RIFT_HERALD_KILLS) || 0,
    },

    // Items
    items: [
      parseInt(p.ITEM0) || 0,
      parseInt(p.ITEM1) || 0,
      parseInt(p.ITEM2) || 0,
      parseInt(p.ITEM3) || 0,
      parseInt(p.ITEM4) || 0,
      parseInt(p.ITEM5) || 0,
      parseInt(p.ITEM6) || 0,
    ].filter((id) => id > 0),

    // Runes
    runes: {
      keystone: parseInt(p.KEYSTONE_ID) || 0,
      primary_tree: parseInt(p.PERK_PRIMARY_STYLE) || 0,
      secondary_tree: parseInt(p.PERK_SUB_STYLE) || 0,
    },

    // Summoner spells
    summoner_spells: {
      spell1: parseInt(p.SUMMONER_SPELL_1) || 0,
      spell2: parseInt(p.SUMMONER_SPELL_2) || 0,
    },

    // Time
    time: {
      played: Math.round((parseInt(p.TIME_PLAYED) || 0) / 1000),
      dead: Math.round((parseInt(p.TOTAL_TIME_SPENT_DEAD) || 0) / 1000),
      longest_life: Math.round((parseInt(p.LONGEST_TIME_SPENT_LIVING) || 0) / 1000),
    },
  };
}

/**
 * Calcule les stats d'équipe
 */
function calculateTeamStats(teamId, statsJson) {
  const teamPlayers = statsJson.filter((p) => p.TEAM === teamId);

  return {
    win: teamPlayers[0]?.WIN === 'Win',
    kills: teamPlayers.reduce((s, p) => s + (parseInt(p.CHAMPIONS_KILLED) || 0), 0),
    deaths: teamPlayers.reduce((s, p) => s + (parseInt(p.NUM_DEATHS) || 0), 0),
    assists: teamPlayers.reduce((s, p) => s + (parseInt(p.ASSISTS) || 0), 0),
    gold: teamPlayers.reduce((s, p) => s + (parseInt(p.GOLD_EARNED) || 0), 0),
    dragons: teamPlayers.reduce((s, p) => s + (parseInt(p.DRAGON_KILLS) || 0), 0),
    barons: teamPlayers.reduce((s, p) => s + (parseInt(p.BARON_KILLS) || 0), 0),
    heralds: teamPlayers.reduce((s, p) => s + (parseInt(p.RIFT_HERALD_KILLS) || 0), 0),
    towers: teamPlayers.reduce((s, p) => s + (parseInt(p.TURRETS_KILLED) || 0), 0),
    inhibitors: teamPlayers.reduce((s, p) => s + (parseInt(p.BARRACKS_KILLED) || 0), 0),
  };
}

/**
 * Traite le fichier ROFL
 */
function processRoflData(metadata, filename) {
  let statsJson;
  try {
    statsJson = typeof metadata.statsJson === 'string' ? JSON.parse(metadata.statsJson) : metadata.statsJson;
  } catch (e) {
    throw new Error('Erreur lors du parsing du champ statsJson : ' + e.message);
  }

  if (!statsJson || !Array.isArray(statsJson)) {
    throw new Error("Le champ statsJson est manquant ou n'est pas un tableau");
  }

  const durationSeconds = Math.round(metadata.gameLength / 1000);

  // Extraire le game ID du nom de fichier
  const gameIdMatch = filename?.match(/([A-Z]+\d*-\d+)/);
  const riotGameId = gameIdMatch ? gameIdMatch[1] : null;

  const gameData = {
    game_id: riotGameId,
    name: null,
    duration: durationSeconds,
    patch: metadata.gameVersion,
    date: new Date(),
  };

  // Game document
  const game = {
    game_id: riotGameId,
    name: null,
    duration: durationSeconds,
    patch: metadata.gameVersion,
    date: new Date(),
    screenshot: null,
    team_id: null,
    team_name: null,
    team_side: null,
    win: null,
    opponent_name: null,
    blue_team: calculateTeamStats('100', statsJson),
    red_team: calculateTeamStats('200', statsJson),
  };

  // PlayerStats documents
  const players = statsJson.map((p) => parsePlayerStats(p, gameData));

  return { game, players, raw: { statsJson } };
}

// ============================================
// ROUTES
// ============================================

/**
 * POST /parse - Parse un ROFL sans sauvegarder (preview)
 */
router.post('/parse', upload.single('replay'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'Aucun fichier fourni' });
    }

    if (!req.file.originalname.endsWith('.rofl')) {
      return res.status(400).json({ ok: false, error: 'Le fichier doit être un .rofl' });
    }

    const metadata = parseRoflBuffer(req.file.buffer);
    const data = processRoflData(metadata, req.file.originalname);

    res.json({ ok: true, data: { game: data.game, players: data.players } });
  } catch (error) {
    console.error('Erreur parsing ROFL:', error);
    res.status(500).json({ ok: false, error: 'Erreur parsing', details: error.message });
  }
});

/**
 * POST /import - Parse, enrichit avec API Riot, et sauvegarde en DB
 */
router.post('/import', upload.single('replay'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'Aucun fichier fourni' });
    }

    if (!req.file.originalname.endsWith('.rofl')) {
      return res.status(400).json({ ok: false, error: 'Le fichier doit être un .rofl' });
    }

    const { team_id, team_name, team_side, opponent_name, name } = req.body;

    if (!team_side || !['blue', 'red'].includes(team_side)) {
      return res.status(400).json({ ok: false, error: 'team_side requis (blue ou red)' });
    }

    const metadata = parseRoflBuffer(req.file.buffer);
    const data = processRoflData(metadata, req.file.originalname);

    // Enrichir les données Game
    data.game.team_id = team_id || null;
    data.game.team_name = team_name || null;
    data.game.team_side = team_side;
    data.game.opponent_name = opponent_name || null;
    data.game.name = name || null;
    data.game.win = team_side === 'blue' ? data.game.blue_team.win : data.game.red_team.win;

    // Sauvegarder la Game
    const savedGame = await Game.create(data.game);

    // Enrichir les joueurs avec l'API Riot (PUUID + Rank)
    console.log('Fetching Riot data for', data.players.length, 'players...');

    const enrichedPlayers = await Promise.all(data.players.map((player, index) => enrichPlayerWithRiotData(player, index)));

    // Ajouter les infos team/game
    const playersToSave = enrichedPlayers.map((p) => {
      const isAllyTeam = p.side === team_side;
      return {
        ...p,
        game_id: savedGame._id.toString(),
        game_name: name || null,
        team_id: team_id || null,
        team_name: isAllyTeam ? team_name : null,
        opponent: !isAllyTeam,
      };
    });

    const savedPlayers = await PlayerStats.insertMany(playersToSave);

    // Stats de l'enrichissement
    const enrichedCount = savedPlayers.filter((p) => p.PUUID).length;
    console.log(`Enriched ${enrichedCount}/${savedPlayers.length} players with Riot data`);

    res.json({
      ok: true,
      data: {
        game: savedGame,
        players: savedPlayers,
        enrichment: {
          total: savedPlayers.length,
          enriched: enrichedCount,
          apiKeyConfigured: !!RIOT_API_KEY,
        },
      },
    });
  } catch (error) {
    console.error('Erreur import ROFL:', error);

    if (error.code === 11000) {
      return res.status(409).json({ ok: false, error: 'Cette game existe déjà' });
    }

    res.status(500).json({ ok: false, error: 'Erreur import', details: error.message });
  }
});

/**
 * GET / - Info endpoint
 */
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    riotApiConfigured: !!RIOT_API_KEY,
    routes: {
      'POST /parse': 'Parse un ROFL et retourne les données (preview)',
      'POST /import': 'Parse, enrichit avec API Riot, et sauvegarde en DB',
    },
  });
});

module.exports = router;
