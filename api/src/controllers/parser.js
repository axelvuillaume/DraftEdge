const express = require('express');
const router = express.Router();
const multer = require('multer');
const https = require('https');
const WebSocket = require('ws');
const Game = require('../models/game');
const PlayerStats = require('../models/playerstats');
const AIFeedBack = require('../models/AIFeedBack');
const CONFIG = require('../config');
const { client: geminiClient } = require('../services/gemini');

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

/**
 * Parse les stats d'un joueur depuis le ROFL
 */
function parsePlayerStats(p, gameData) {
  const durationMinutes = gameData.duration / 60;

  // Basic stats
  const kills = parseInt(p.CHAMPIONS_KILLED) || 0;
  const deaths = parseInt(p.NUM_DEATHS) || 0;
  const assists = parseInt(p.ASSISTS) || 0;
  const minions = parseInt(p.MINIONS_KILLED) || 0;
  const jungleMonsters = parseInt(p.NEUTRAL_MINIONS_KILLED) || 0;
  const cs = minions + jungleMonsters;
  const gold = parseInt(p.GOLD_EARNED) || 0;
  const totalDamageToChampions = parseInt(p.TOTAL_DAMAGE_DEALT_TO_CHAMPIONS) || 0;

  // Pings - calculer le total
  const pingsData = {
    all_in: parseInt(p.ALL_IN_PINGS) || 0,
    assist_me: parseInt(p.ASSIST_ME_PINGS) || 0,
    basic: parseInt(p.BASIC_PINGS) || 0,
    command: parseInt(p.COMMAND_PINGS) || 0,
    danger: parseInt(p.DANGER_PINGS) || 0,
    enemy_missing: parseInt(p.ENEMY_MISSING_PINGS) || 0,
    enemy_vision: parseInt(p.ENEMY_VISION_PINGS) || 0,
    get_back: parseInt(p.GET_BACK_PINGS) || 0,
    hold: parseInt(p.HOLD_PINGS) || 0,
    need_vision: parseInt(p.NEED_VISION_PINGS) || 0,
    on_my_way: parseInt(p.ON_MY_WAY_PINGS) || 0,
    push: parseInt(p.PUSH_PINGS) || 0,
    retreat: parseInt(p.RETREAT_PINGS) || 0,
    vision_cleared: parseInt(p.VISION_CLEARED_PINGS) || 0,
  };
  pingsData.total = Object.values(pingsData).reduce((a, b) => a + b, 0);

  return {
    // ==================== GAME INFO ====================
    game_id: gameData.game_id,
    game_name: gameData.name,
    game_win: p.WIN === 'Win',
    game_duration: gameData.duration,

    // ==================== PLAYER INFO ====================
    summoner_name: p.RIOT_ID_GAME_NAME || p.NAME,
    riot_tag: p.RIOT_ID_TAG_LINE || '',
    PUUID: p.PUUID || null,

    // Ranked info (enrichi via API Riot)
    tier: null,
    rank: null,
    league_points: null,
    wins: null,
    losses: null,
    total_games: null,
    win_rate: null,

    // ==================== TEAM & ROLE ====================
    team_id: null,
    team_name: null,
    opponent: null,
    side: p.TEAM === '100' ? 'blue' : 'red',
    role: normalizeRole(p.TEAM_POSITION || p.INDIVIDUAL_POSITION),
    champion: p.SKIN,

    // ==================== BASIC STATS ====================
    kills,
    deaths,
    assists,
    level: parseInt(p.LEVEL) || 0,
    exp: parseInt(p.EXP) || 0,

    // ==================== GOLD ====================
    gold,
    gold_spent: parseInt(p.GOLD_SPENT) || 0,
    gold_per_min: durationMinutes > 0 ? Math.round(gold / durationMinutes) : 0,
    gold_from_shutdowns: parseInt(p.HoL_ShutdownGoldCollected) || 0,

    // ==================== CS & FARM ====================
    cs,
    cs_per_min: durationMinutes > 0 ? Math.round((cs / durationMinutes) * 10) / 10 : 0,

    farm: {
      minions,
      jungle_monsters: jungleMonsters,
      enemy_jungle: parseInt(p.NEUTRAL_MINIONS_KILLED_ENEMY_JUNGLE) || 0,
      ally_jungle: parseInt(p.NEUTRAL_MINIONS_KILLED_YOUR_JUNGLE) || 0,
    },

    // ==================== MULTI-KILLS ====================
    multi_kills: {
      double: parseInt(p.DOUBLE_KILLS) || 0,
      triple: parseInt(p.TRIPLE_KILLS) || 0,
      quadra: parseInt(p.QUADRA_KILLS) || 0,
      penta: parseInt(p.PENTA_KILLS) || 0,
    },

    // ==================== COMBAT ====================
    combat: {
      killing_sprees: parseInt(p.KILLING_SPREES) || 0,
      largest_killing_spree: parseInt(p.LARGEST_KILLING_SPREE) || 0,
      largest_multi_kill: parseInt(p.LARGEST_MULTI_KILL) || 0,
      largest_critical_strike: parseInt(p.LARGEST_CRITICAL_STRIKE) || 0,
      largest_ability_damage: parseInt(p.LARGEST_ABILITY_DAMAGE) || 0,
      largest_attack_damage: parseInt(p.LARGEST_ATTACK_DAMAGE) || 0,
      solo_kills: parseInt(p.HoL_SoloKills) || 0,
      time_ccing_champions: parseInt(p.TIME_CCING_OTHERS) || 0,
      total_time_cc_dealt: parseInt(p.TOTAL_TIME_CROWD_CONTROL_DEALT) || 0,
      total_time_cc_dealt_to_champions: parseInt(p.TOTAL_TIME_CROWD_CONTROL_DEALT_TO_CHAMPIONS) || 0,
    },

    // ==================== DAMAGE DEALT ====================
    damage: {
      total: parseInt(p.TOTAL_DAMAGE_DEALT) || 0,
      total_to_champions: totalDamageToChampions,
      physical_to_champions: parseInt(p.PHYSICAL_DAMAGE_DEALT_TO_CHAMPIONS) || 0,
      magic_to_champions: parseInt(p.MAGIC_DAMAGE_DEALT_TO_CHAMPIONS) || 0,
      true_to_champions: parseInt(p.TRUE_DAMAGE_DEALT_TO_CHAMPIONS) || 0,
      physical_total: parseInt(p.PHYSICAL_DAMAGE_DEALT_PLAYER) || 0,
      magic_total: parseInt(p.MAGIC_DAMAGE_DEALT_PLAYER) || 0,
      true_total: parseInt(p.TRUE_DAMAGE_DEALT_PLAYER) || 0,
      to_turrets: parseInt(p.TOTAL_DAMAGE_DEALT_TO_TURRETS) || 0,
      to_buildings: parseInt(p.TOTAL_DAMAGE_DEALT_TO_BUILDINGS) || 0,
      to_objectives: parseInt(p.TOTAL_DAMAGE_DEALT_TO_OBJECTIVES) || 0,
      to_epic_monsters: parseInt(p.TOTAL_DAMAGE_DEALT_TO_EPIC_MONSTERS) || 0,
      damage_per_min: durationMinutes > 0 ? Math.round(totalDamageToChampions / durationMinutes) : 0,
      damage_share: null, // Calculé après avec les stats d'équipe
    },

    // ==================== DAMAGE TAKEN / TANK ====================
    tank: {
      total_taken: parseInt(p.TOTAL_DAMAGE_TAKEN) || 0,
      physical_taken: parseInt(p.PHYSICAL_DAMAGE_TAKEN) || 0,
      magic_taken: parseInt(p.MAGIC_DAMAGE_TAKEN) || 0,
      true_taken: parseInt(p.TRUE_DAMAGE_TAKEN) || 0,
      self_mitigated: parseInt(p.TOTAL_DAMAGE_SELF_MITIGATED) || 0,
      total_healed: parseInt(p.TOTAL_HEAL) || 0,
      healed_on_teammates: parseInt(p.TOTAL_HEAL_ON_TEAMMATES) || 0,
      units_healed: parseInt(p.TOTAL_UNITS_HEALED) || 0,
      shielded_on_teammates: parseInt(p.TOTAL_DAMAGE_SHIELDED_ON_TEAMMATES) || 0,
    },

    // ==================== VISION ====================
    vision: {
      score: parseInt(p.VISION_SCORE) || 0,
      wards_placed: parseInt(p.WARD_PLACED) || 0,
      wards_killed: parseInt(p.WARD_KILLED) || 0,
      control_wards_placed: parseInt(p.WARD_PLACED_DETECTOR) || 0,
      control_wards_bought: parseInt(p.VISION_WARDS_BOUGHT_IN_GAME) || 0,
      stealth_wards_bought: parseInt(p.SIGHT_WARDS_BOUGHT_IN_GAME) || 0,
    },

    // ==================== OBJECTIVES ====================
    objectives: {
      turrets_killed: parseInt(p.TURRETS_KILLED) || 0,
      turret_takedowns: parseInt(p.TURRET_TAKEDOWNS) || 0,
      inhibitors_killed: parseInt(p.BARRACKS_KILLED) || 0,
      inhibitor_takedowns: parseInt(p.BARRACKS_TAKEDOWNS) || 0,
      dragons: parseInt(p.DRAGON_KILLS) || 0,
      barons: parseInt(p.BARON_KILLS) || 0,
      heralds: parseInt(p.RIFT_HERALD_KILLS) || 0,
      grubs: parseInt(p.HORDE_KILLS) || 0,
      atakhan: parseInt(p.ATAKHAN_KILLS) || 0,
      nexus_killed: (parseInt(p.HQ_KILLED) || 0) > 0,
      nexus_takedown: (parseInt(p.HQ_TAKEDOWNS) || 0) > 0,
      objectives_stolen: parseInt(p.OBJECTIVES_STOLEN) || 0,
      objectives_stolen_assists: parseInt(p.OBJECTIVES_STOLEN_ASSISTS) || 0,
    },

    // ==================== ITEMS ====================
    items: [parseInt(p.ITEM0) || 0, parseInt(p.ITEM1) || 0, parseInt(p.ITEM2) || 0, parseInt(p.ITEM3) || 0, parseInt(p.ITEM4) || 0, parseInt(p.ITEM5) || 0, parseInt(p.ITEM6) || 0].filter((id) => id > 0),
    items_purchased: parseInt(p.ITEMS_PURCHASED) || 0,
    consumables_purchased: parseInt(p.CONSUMABLES_PURCHASED) || 0,

    // ==================== RUNES ====================
    runes: {
      keystone: parseInt(p.KEYSTONE_ID) || parseInt(p.PERK0) || 0,
      primary_tree: parseInt(p.PERK_PRIMARY_STYLE) || 0,
      secondary_tree: parseInt(p.PERK_SUB_STYLE) || 0,
      perks: [parseInt(p.PERK0) || 0, parseInt(p.PERK1) || 0, parseInt(p.PERK2) || 0, parseInt(p.PERK3) || 0, parseInt(p.PERK4) || 0, parseInt(p.PERK5) || 0],
      stat_perks: {
        offense: parseInt(p.STAT_PERK_0) || 0,
        flex: parseInt(p.STAT_PERK_1) || 0,
        defense: parseInt(p.STAT_PERK_2) || 0,
      },
      perk_values: [
        { perk_id: parseInt(p.PERK0) || 0, var1: parseInt(p.PERK0_VAR1) || 0, var2: parseInt(p.PERK0_VAR2) || 0, var3: parseInt(p.PERK0_VAR3) || 0 },
        { perk_id: parseInt(p.PERK1) || 0, var1: parseInt(p.PERK1_VAR1) || 0, var2: parseInt(p.PERK1_VAR2) || 0, var3: parseInt(p.PERK1_VAR3) || 0 },
        { perk_id: parseInt(p.PERK2) || 0, var1: parseInt(p.PERK2_VAR1) || 0, var2: parseInt(p.PERK2_VAR2) || 0, var3: parseInt(p.PERK2_VAR3) || 0 },
        { perk_id: parseInt(p.PERK3) || 0, var1: parseInt(p.PERK3_VAR1) || 0, var2: parseInt(p.PERK3_VAR2) || 0, var3: parseInt(p.PERK3_VAR3) || 0 },
        { perk_id: parseInt(p.PERK4) || 0, var1: parseInt(p.PERK4_VAR1) || 0, var2: parseInt(p.PERK4_VAR2) || 0, var3: parseInt(p.PERK4_VAR3) || 0 },
        { perk_id: parseInt(p.PERK5) || 0, var1: parseInt(p.PERK5_VAR1) || 0, var2: parseInt(p.PERK5_VAR2) || 0, var3: parseInt(p.PERK5_VAR3) || 0 },
      ],
    },

    // ==================== SUMMONER SPELLS ====================
    summoner_spells: {
      spell1: parseInt(p.SUMMONER_SPELL_1) || 0,
      spell2: parseInt(p.SUMMONER_SPELL_2) || 0,
      spell1_casts: parseInt(p.SUMMON_SPELL1_CAST) || 0,
      spell2_casts: parseInt(p.SUMMON_SPELL2_CAST) || 0,
    },

    // ==================== SPELL CASTS ====================
    spell_casts: {
      q: parseInt(p.SPELL1_CAST) || 0,
      w: parseInt(p.SPELL2_CAST) || 0,
      e: parseInt(p.SPELL3_CAST) || 0,
      r: parseInt(p.SPELL4_CAST) || 0,
    },

    // ==================== TIME ====================
    time: {
      played: parseInt(p.TIME_PLAYED) || 0,
      dead: parseInt(p.TOTAL_TIME_SPENT_DEAD) || 0,
      longest_life: parseInt(p.LONGEST_TIME_SPENT_LIVING) || 0,
      disconnected: parseInt(p.TIME_SPENT_DISCONNECTED) || 0,
    },

    // ==================== PLAYER BEHAVIOR ====================
    behavior: {
      was_afk: p.WAS_AFK === '1',
      was_afk_after_failed_surrender: p.WAS_AFK_AFTER_FAILED_SURRENDER === '1',
      was_leaver: p.WAS_LEAVER === '1',
      was_early_surrender_accomplice: p.WAS_EARLY_SURRENDER_ACCOMPLICE === '1',
      muted_all: p.MUTED_ALL === '1',
      players_muted: parseInt(p.PLAYERS_I_MUTED) || 0,
      muted_by_players: parseInt(p.PLAYERS_THAT_MUTED_ME) || 0,
    },

    // ==================== PINGS ====================
    pings: pingsData,

    // ==================== GAME END INFO ====================
    game_ended_in_surrender: p.GAME_ENDED_IN_SURRENDER === '1',
    game_ended_in_early_surrender: p.GAME_ENDED_IN_EARLY_SURRENDER === '1',

    // ==================== NETWORK ====================
    ping_ms: parseInt(p.PING) || 0,

    // ==================== TURRET PLATES ====================
    turret_plates_destroyed: parseInt(p.Missions_TurretPlatesDestroyed) || 0,
    gold_from_turret_plates: parseInt(p.Missions_GoldFromTurretPlatesTaken) || 0,

    // ==================== ADVANCED STATS ====================
    advanced: {
      takedowns_under_turret: parseInt(p.Missions_TakedownsUnderTurret) || 0,
      immobilize_champions: parseInt(p.Missions_ImmobilizeChampions) || 0,
      legendary_items_count: parseInt(p.Missions_LegendaryItems) || 0,
      plants_destroyed: parseInt(p.Missions_DestroyPlants) || 0,
    },

    hol_stats: {
      jungle_camps_stolen: parseInt(p.HoL_JungleCampsStolen) || 0,
      outnumbered_takedowns: parseInt(p.HoL_OutnumberedTakedowns) || 0,
      kills_while_low_hp: parseInt(p.HoL_KillsWhileLowHealth) || 0,
      fights_survived_low_hp: parseInt(p.HoL_FightsSurvivedWhileLowHealth) || 0,
      takedowns_under_enemy_tower: parseInt(p.HoL_EnemyTakedownUnderTower) || 0,
      champions_damaged_while_hidden: parseInt(p.HoL_ChampionsDamagedWhileHidden) || 0,
      hidden_enemies_damaged: parseInt(p.HoL_HiddenEnemiesDamaged) || 0,
    },
  };
}

/**
 * Calcule les stats d'équipe agrégées
 */
function calculateTeamStats(teamId, statsJson) {
  const teamPlayers = statsJson.filter((p) => p.TEAM === teamId);

  const sum = (key) => teamPlayers.reduce((s, p) => s + (parseInt(p[key]) || 0), 0);

  // Déterminer les "first" en comparant avec l'autre équipe
  const otherTeamId = teamId === '100' ? '200' : '100';
  const otherTeamPlayers = statsJson.filter((p) => p.TEAM === otherTeamId);

  const teamDragons = sum('DRAGON_KILLS');
  const otherDragons = otherTeamPlayers.reduce((s, p) => s + (parseInt(p.DRAGON_KILLS) || 0), 0);

  const teamBarons = sum('BARON_KILLS');
  const otherBarons = otherTeamPlayers.reduce((s, p) => s + (parseInt(p.BARON_KILLS) || 0), 0);

  const teamHeralds = sum('RIFT_HERALD_KILLS');
  const otherHeralds = otherTeamPlayers.reduce((s, p) => s + (parseInt(p.RIFT_HERALD_KILLS) || 0), 0);

  const teamGrubs = sum('HORDE_KILLS');
  const otherGrubs = otherTeamPlayers.reduce((s, p) => s + (parseInt(p.HORDE_KILLS) || 0), 0);

  const teamTowers = sum('TURRETS_KILLED');
  const otherTowers = otherTeamPlayers.reduce((s, p) => s + (parseInt(p.TURRETS_KILLED) || 0), 0);

  const teamInhibs = sum('BARRACKS_KILLED');
  const otherInhibs = otherTeamPlayers.reduce((s, p) => s + (parseInt(p.BARRACKS_KILLED) || 0), 0);

  return {
    win: teamPlayers[0]?.WIN === 'Win',

    // KDA
    kills: sum('CHAMPIONS_KILLED'),
    deaths: sum('NUM_DEATHS'),
    assists: sum('ASSISTS'),

    // Economy
    gold: sum('GOLD_EARNED'),
    gold_spent: sum('GOLD_SPENT'),

    // Objectives
    dragons: teamDragons,
    barons: teamBarons,
    heralds: teamHeralds,
    grubs: teamGrubs,
    atakhan: sum('ATAKHAN_KILLS'),
    towers: teamTowers,
    tower_takedowns: sum('TURRET_TAKEDOWNS'),
    inhibitors: teamInhibs,
    inhibitor_takedowns: sum('BARRACKS_TAKEDOWNS'),

    // Damage
    total_damage_to_champions: sum('TOTAL_DAMAGE_DEALT_TO_CHAMPIONS'),
    total_damage_taken: sum('TOTAL_DAMAGE_TAKEN'),

    // Vision
    vision_score: sum('VISION_SCORE'),
    wards_placed: sum('WARD_PLACED'),
    wards_killed: sum('WARD_KILLED'),
    control_wards_bought: sum('VISION_WARDS_BOUGHT_IN_GAME'),

    // Turret plates
    turret_plates_destroyed: teamPlayers.reduce((s, p) => s + (parseInt(p.Missions_TurretPlatesDestroyed) || 0), 0),
    gold_from_turret_plates: teamPlayers.reduce((s, p) => s + (parseInt(p.Missions_GoldFromTurretPlatesTaken) || 0), 0),

    // CS
    total_cs: sum('MINIONS_KILLED') + sum('NEUTRAL_MINIONS_KILLED'),
    total_jungle_cs: sum('NEUTRAL_MINIONS_KILLED'),
  };
}

/**
 * Extrait les champions par rôle pour une équipe
 */
function extractChampionsByRole(teamId, statsJson) {
  const teamPlayers = statsJson.filter((p) => p.TEAM === teamId);
  const champions = {};

  teamPlayers.forEach((p) => {
    const role = normalizeRole(p.TEAM_POSITION || p.INDIVIDUAL_POSITION);
    if (role) {
      champions[role] = p.SKIN;
    }
  });

  return champions;
}

/**
 * Traite le fichier ROFL
 */
function processRoflData(metadata, filename, team_id) {
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

  // Calculer les stats d'équipe
  const blueTeamStats = calculateTeamStats('100', statsJson);
  const redTeamStats = calculateTeamStats('200', statsJson);

  // Calculer les stats summary
  const allPlayers = statsJson;
  const statsSummary = {
    total_kills: blueTeamStats.kills + redTeamStats.kills,
    total_gold: blueTeamStats.gold + redTeamStats.gold,
    total_cs: blueTeamStats.total_cs + redTeamStats.total_cs,
    total_vision_score: blueTeamStats.vision_score + redTeamStats.vision_score,
    longest_game_time_alive: Math.max(...allPlayers.map((p) => parseInt(p.LONGEST_TIME_SPENT_LIVING) || 0)),
    double_kills: allPlayers.reduce((s, p) => s + (parseInt(p.DOUBLE_KILLS) || 0), 0),
    triple_kills: allPlayers.reduce((s, p) => s + (parseInt(p.TRIPLE_KILLS) || 0), 0),
    quadra_kills: allPlayers.reduce((s, p) => s + (parseInt(p.QUADRA_KILLS) || 0), 0),
    penta_kills: allPlayers.reduce((s, p) => s + (parseInt(p.PENTA_KILLS) || 0), 0),
  };

  // Vérifier surrender
  const anySurrender = allPlayers.some((p) => p.GAME_ENDED_IN_SURRENDER === '1');
  const anyEarlySurrender = allPlayers.some((p) => p.GAME_ENDED_IN_EARLY_SURRENDER === '1');
  const surrenderDueToAfk = allPlayers.some((p) => p.WAS_SURRENDER_DUE_TO_AFK === '1');
  const nexusKilled = allPlayers.some((p) => (parseInt(p.HQ_KILLED) || 0) > 0);

  const game_fingerprint = `${durationSeconds}_${blueTeamStats.kills}_${blueTeamStats.deaths}_${blueTeamStats.assists}_${redTeamStats.kills}_${redTeamStats.deaths}_${redTeamStats.assists}${team_id ? `_${team_id}` : ''}`;

  // Game document
  const game = {
    game_id: riotGameId,
    match_id: riotGameId ? `EUW1_${riotGameId.split('-')[1]}` : null,
    game_fingerprint,
    name: null,
    duration: durationSeconds,
    patch: metadata.gameVersion,
    date: new Date(),

    team_id: null,
    team_name: null,
    team_side: null,
    win: null,
    opponent_id: null,
    opponent_name: null,

    blue_team: blueTeamStats,
    red_team: redTeamStats,

    game_end: {
      surrender: anySurrender,
      early_surrender: anyEarlySurrender,
      surrender_due_to_afk: surrenderDueToAfk,
      nexus_killed: nexusKilled,
    },

    champions: {
      blue: extractChampionsByRole('100', statsJson),
      red: extractChampionsByRole('200', statsJson),
    },

    stats_summary: statsSummary,

    tags: [],
    notes: null,

    rofl: {
      filename: filename,
      imported_at: new Date(),
      file_patch: metadata.gameVersion,
    },
  };

  // PlayerStats documents
  const players = statsJson.map((p) => parsePlayerStats(p, gameData));

  // Calculer le damage_share pour chaque joueur
  players.forEach((player) => {
    const teamDamage = player.side === 'blue' ? blueTeamStats.total_damage_to_champions : redTeamStats.total_damage_to_champions;
    if (teamDamage > 0) {
      player.damage.damage_share = Math.round((player.damage.total_to_champions / teamDamage) * 1000) / 10; // Pourcentage avec 1 décimale
    }
  });

  return { game, players, raw: { statsJson } };
}

// ============================================
// DRAFT FETCHING (drafter.lol / dawe.gg)
// ============================================

function fetchFromDrafter(draftUrl) {
  const parsed = new URL(draftUrl);
  const game = parseInt(parsed.searchParams.get('game')) || 1;
  const url = draftUrl.includes('?') ? draftUrl : `${draftUrl}?game=1`;

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let html = '';
      res.on('data', (chunk) => (html += chunk));
      res.on('end', () => {
        const startMarker = '\\"drafts\\":[';
        const endMarker = '],\\"fearless\\"';
        const startIdx = html.indexOf(startMarker);
        if (startIdx === -1) return reject('Données de draft introuvables dans la page');

        const arrayStart = startIdx + startMarker.length;
        const endIdx = html.indexOf(endMarker, arrayStart);
        if (endIdx === -1) return reject('Impossible de trouver la fin du tableau de drafts');

        const rawDrafts = html.substring(arrayStart, endIdx);
        const cleaned = rawDrafts.replace(/\\"/g, '"');
        const drafts = JSON.parse(`[${cleaned}]`);

        const draft = drafts[game - 1];
        if (!draft) return reject(`Game ${game} introuvable`);

        const fearlessRestricted = {};
        if (draft.fearless && game > 1) {
          const prevDrafts = drafts.slice(0, game - 1);
          const blue = draft.drafterBlue;
          const red = draft.drafterRed;
          fearlessRestricted[blue] = [];
          fearlessRestricted[red] = [];

          for (const prev of prevDrafts) {
            const prevBlue = prev.drafterBlue;
            const prevRed = prev.drafterRed;
            const bluePicks = [prev.bluePick1, prev.bluePick2, prev.bluePick3, prev.bluePick4, prev.bluePick5];
            const redPicks = [prev.redPick1, prev.redPick2, prev.redPick3, prev.redPick4, prev.redPick5];

            if (prevBlue === blue) fearlessRestricted[blue].push(...bluePicks);
            else if (prevBlue === red) fearlessRestricted[red].push(...bluePicks);

            if (prevRed === blue) fearlessRestricted[blue].push(...redPicks);
            else if (prevRed === red) fearlessRestricted[red].push(...redPicks);
          }
        }

        resolve({
          source: 'drafter',
          fearless: draft.fearless || false,
          blueBans: [draft.blueBan1, draft.blueBan2, draft.blueBan3, draft.blueBan4, draft.blueBan5],
          redBans: [draft.redBan1, draft.redBan2, draft.redBan3, draft.redBan4, draft.redBan5],
          bluePicks: [draft.bluePick1, draft.bluePick2, draft.bluePick3, draft.bluePick4, draft.bluePick5],
          redPicks: [draft.redPick1, draft.redPick2, draft.redPick3, draft.redPick4, draft.redPick5],
          fearlessRestricted,
        });
      });
      res.on('error', reject);
    });
  });
}

function fetchFromDawe(roomId) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('wss://draftlol.dawe.gg');

    const timeout = setTimeout(() => {
      ws.close();
      reject('Timeout: pas de réponse du serveur');
    }, 10000);

    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'joinroom', roomId }));
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'statechange') {
        clearTimeout(timeout);
        ws.close();
        const d = msg.newState;
        const clean = (arr) => (Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : []);

        resolve({
          source: 'dawe',
          bluePicks: clean(d.bluePicks),
          redPicks: clean(d.redPicks),
          blueBans: clean(d.blueBans),
          redBans: clean(d.redBans),
          fearless: false,
          fearlessRestricted: {
            [d.blueName]: clean(d.fearlessBlueChamps),
            [d.redName]: clean(d.fearlessRedChamps),
          },
        });
      }

      if (msg.type === 'error') {
        clearTimeout(timeout);
        ws.close();
        reject('Erreur serveur: ' + msg.reason);
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject('WebSocket error: ' + err.message);
    });
  });
}

function detectDraftSource(url) {
  if (url.includes('dawe.gg')) return 'dawe';
  if (url.includes('drafter.lol')) return 'drafter';
  return null;
}

function extractDraftId(url) {
  const parts = url.split('/').filter(Boolean);
  return parts[parts.length - 1].split('?')[0];
}

async function fetchAndSaveDraft(gameId, draftUrl) {
  const source = detectDraftSource(draftUrl);
  if (!source) throw new Error('URL non reconnue. Utilisez un lien drafter.lol ou dawe.gg');

  const draft = source === 'drafter' ? await fetchFromDrafter(draftUrl) : await fetchFromDawe(extractDraftId(draftUrl));

  const update = {
    bluePicks: draft.bluePicks,
    redPicks: draft.redPicks,
    blueBans: draft.blueBans,
    redBans: draft.redBans,
    fearless: draft.fearless || false,
    fearlessRestricted: draft.fearlessRestricted,
    source,
    source_url: draftUrl,
  };

  return Game.findByIdAndUpdate(gameId, update, { new: true });
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

    const { team_id, team_name, team_side, opponent_name, name, session_id, session_name, folder_id, folder_name, draft_url, date } = req.body;

    if (!team_side || !['blue', 'red'].includes(team_side)) {
      return res.status(400).json({ ok: false, error: 'team_side requis (blue ou red)' });
    }

    const metadata = parseRoflBuffer(req.file.buffer);
    const data = processRoflData(metadata, req.file.originalname, team_id);

    const existingGame = await Game.findOne({ game_fingerprint: data.game.game_fingerprint });
    //if (existingGame) return res.status(409).json({ ok: false, error: 'This game already exists', existing_game_id: existingGame._id });

    // Enrichir les données Game
    data.game.team_id = team_id || null;
    data.game.team_name = team_name || null;
    data.game.team_side = team_side;
    data.game.opponent_name = opponent_name || null;
    data.game.name = name || null;
    data.game.session_id = session_id || null;
    data.game.session_name = session_name || null;
    data.game.folder_id = folder_id || null;
    data.game.folder_name = folder_name || null;
    data.game.win = team_side === 'blue' ? data.game.blue_team.win : data.game.red_team.win;
    if (date) data.game.date = new Date(date);

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

    let finalGame = savedGame;
    if (draft_url) {
      try {
        console.log('[import] Fetching draft from:', draft_url);
        finalGame = await fetchAndSaveDraft(savedGame._id, draft_url);
        console.log('[import] Draft saved successfully');
      } catch (draftError) {
        console.error('[import] Draft fetch failed:', draftError);
      }
    }

    res.json({ ok: true, data: { game: finalGame, players: savedPlayers } });
  } catch (error) {
    console.error('Erreur import ROFL:', error);

    if (error.code === 11000) {
      return res.status(409).json({ ok: false, error: 'This game already exists' });
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

/**
 * Génère et sauvegarde les feedbacks IA pour une équipe (appelé après import)
 */
async function generateAndSaveAIFeedback(team_id, team_name) {
  if (!team_id) return;

  const validRoles = ['top', 'jungle', 'mid', 'bottom', 'support'];

  try {
    const allTeamStats = await PlayerStats.find({ team_id, opponent: false });
    const allEnemyStats = await PlayerStats.find({ team_id, opponent: true });

    if (!allTeamStats.length) {
      console.log('No team stats found for AI feedback generation');
      return;
    }

    const aggregateStats = (stats) => {
      return stats.reduce(
        (acc, curr) => {
          acc.kills += curr.kills || 0;
          acc.deaths += curr.deaths || 0;
          acc.assists += curr.assists || 0;
          acc.gold += curr.gold || 0;
          acc.damage += curr.damage?.total_to_champions || 0;
          acc.duration += curr.game_duration || 0;
          acc.solo_kills += curr.combat?.solo_kills || 0;
          acc.games += 1;
          return acc;
        },
        { kills: 0, deaths: 0, assists: 0, gold: 0, damage: 0, duration: 0, solo_kills: 0, games: 0 },
      );
    };

    const getAvg = (total, games) => (games > 0 ? total / games : 0);
    const getPerMin = (total, duration) => (duration > 0 ? total / (duration / 60) : 0);

    // Générer feedback pour chaque rôle
    for (const role of validRoles) {
      const teamStats = allTeamStats.filter((s) => s.role === role);
      const enemyStats = allEnemyStats.filter((s) => s.role === role);

      if (!teamStats.length) continue;

      const teamAgg = aggregateStats(teamStats);
      const enemyAgg = aggregateStats(enemyStats);

      const combatMetrics = [
        {
          label: 'DMG / min',
          team: parseFloat(getPerMin(teamAgg.damage, teamAgg.duration).toFixed(1)),
          enemy: parseFloat(getPerMin(enemyAgg.damage, enemyAgg.duration).toFixed(1)),
          description: 'Average damage dealt to champions per minute',
        },
        {
          label: 'Kills / game',
          team: parseFloat(getAvg(teamAgg.kills, teamAgg.games).toFixed(1)),
          enemy: parseFloat(getAvg(enemyAgg.kills, enemyAgg.games).toFixed(1)),
          description: 'Average kills per game',
        },
        {
          label: 'Deaths / game',
          team: parseFloat(getAvg(teamAgg.deaths, teamAgg.games).toFixed(1)),
          enemy: parseFloat(getAvg(enemyAgg.deaths, enemyAgg.games).toFixed(1)),
          description: 'Average deaths per game',
          invert: true,
        },
        {
          label: 'KDA',
          team: parseFloat((teamAgg.deaths > 0 ? (teamAgg.kills + teamAgg.assists) / teamAgg.deaths : teamAgg.kills + teamAgg.assists).toFixed(2)),
          enemy: parseFloat((enemyAgg.deaths > 0 ? (enemyAgg.kills + enemyAgg.assists) / enemyAgg.deaths : enemyAgg.kills + enemyAgg.assists).toFixed(2)),
          description: 'Kill/Death/Assist ratio',
        },
        {
          label: 'DMG / Gold',
          team: parseFloat((teamAgg.gold > 0 ? teamAgg.damage / teamAgg.gold : 0).toFixed(2)),
          enemy: parseFloat((enemyAgg.gold > 0 ? enemyAgg.damage / enemyAgg.gold : 0).toFixed(2)),
          description: 'Damage efficiency relative to gold earned',
        },
        {
          label: 'Kill Participation',
          team: parseFloat((((teamAgg.kills + teamAgg.assists) / Math.max(teamAgg.kills + teamAgg.deaths + teamAgg.assists, 1)) * 100).toFixed(1)),
          enemy: parseFloat((((enemyAgg.kills + enemyAgg.assists) / Math.max(enemyAgg.kills + enemyAgg.deaths + enemyAgg.assists, 1)) * 100).toFixed(1)),
          description: 'Percentage of team kills participated in',
        },
        {
          label: 'Solo Kills / game',
          team: parseFloat(getAvg(teamAgg.solo_kills, teamAgg.games).toFixed(1)),
          enemy: parseFloat(getAvg(enemyAgg.solo_kills, enemyAgg.games).toFixed(1)),
          description: 'Average solo kills per game',
        },
      ];

      // Calculate diff percentage for each metric
      const metricsWithDiff = combatMetrics.map((m) => {
        let diffPercent = 0;
        if (m.enemy > 0) {
          diffPercent = ((m.team - m.enemy) / m.enemy) * 100;
        } else if (m.team > 0) {
          diffPercent = 100;
        }
        if (m.invert) diffPercent = -diffPercent;
        return { ...m, diff: parseFloat(diffPercent.toFixed(1)) };
      });

      // Prepare prompt for Gemini
      const statsPrompt = metricsWithDiff.map((m) => `- ${m.label}: Team ${m.team} vs Enemy ${m.enemy} (${m.diff > 0 ? '+' : ''}${m.diff}%) - ${m.description}`).join('\n');

      const prompt = `Tu es un analyste expert de League of Legends. Analyse les statistiques de combat suivantes pour le rôle ${role.toUpperCase()} comparées aux adversaires et identifie exactement 2 points forts et 2 axes d'amélioration. Donne des conseils spécifiques au rôle ${role}.

Statistiques de Combat:
${statsPrompt}

Nombre total de parties analysées: ${teamAgg.games}

Réponds UNIQUEMENT en JSON valide avec ce format exact (sans markdown, sans backticks):
{
  "strengths": [
    {"title": "Titre court", "description": "Explication concise en 1-2 phrases"},
    {"title": "Titre court", "description": "Explication concise en 1-2 phrases"}
  ],
  "improvements": [
    {"title": "Titre court", "description": "Explication concise en 1-2 phrases"},
    {"title": "Titre court", "description": "Explication concise en 1-2 phrases"}
  ]
}`;

      try {
        const response = await geminiClient.models.generateContent({
          model: 'gemini-3-pro-preview',
          contents: prompt,
        });

        let analysis = { strengths: [], improvements: [] };
        const responseText = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleanedText = responseText
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        analysis = JSON.parse(cleanedText);

        // Supprimer l'ancien feedback pour ce rôle/type/team
        // await AIFeedBack.deleteMany({ team_id, role, type: 'combat' });

        // Sauvegarder le nouveau feedback
        await AIFeedBack.create({
          role,
          strengths: analysis.strengths,
          improvements: analysis.improvements,
          type: 'combat',
          team_id,
          team_name: team_name || '',
          statsPrompt,
        });

        console.log(`AI Feedback generated for role ${role}`);
      } catch (parseError) {
        console.error(`Failed to generate AI feedback for role ${role}:`, parseError.message);
      }
    }
  } catch (error) {
    console.error('Error generating AI feedback:', error);
  }
}

module.exports = router;
