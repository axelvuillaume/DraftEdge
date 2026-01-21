const mongoose = require('mongoose');

const MODELNAME = 'playerstats';

const Schema = new mongoose.Schema(
  {
    // ==================== GAME INFO ====================
    game_id: { type: String, trim: true },
    game_name: { type: String, trim: true },
    game_win: { type: Boolean },
    game_duration: { type: Number }, // en secondes

    // ==================== PLAYER INFO ====================
    summoner_name: { type: String, trim: true },
    riot_tag: { type: String, trim: true },

    // Ranked info (à récupérer via API Riot séparément)
    tier: { type: String, trim: true },
    rank: { type: String, trim: true },
    league_points: { type: Number },
    wins: { type: Number },
    losses: { type: Number },
    total_games: { type: Number },
    win_rate: { type: Number },

    // ==================== TEAM & ROLE ====================
    team_id: { type: String, trim: true },
    team_name: { type: String, trim: true },
    opponent: { type: Boolean },
    side: { type: String, enum: ['blue', 'red'] }, // TEAM 100 = blue, 200 = red
    role: { type: String, enum: ['top', 'jungle', 'mid', 'bottom', 'support'] },
    champion: { type: String },

    // ==================== BASIC STATS ====================
    kills: { type: Number, default: 0 },
    deaths: { type: Number, default: 0 },
    assists: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    exp: { type: Number, default: 0 },

    // ==================== GOLD ====================
    gold: { type: Number, default: 0 }, // GOLD_EARNED
    gold_spent: { type: Number, default: 0 },
    gold_per_min: { type: Number }, // Calculé

    // ==================== CS & FARM ====================
    cs: { type: Number, default: 0 }, // Total minions + jungle
    cs_per_min: { type: Number }, // Calculé

    farm: {
      minions: { type: Number, default: 0 }, // MINIONS_KILLED
      jungle_monsters: { type: Number, default: 0 }, // NEUTRAL_MINIONS_KILLED
      enemy_jungle: { type: Number, default: 0 }, // NEUTRAL_MINIONS_KILLED_ENEMY_JUNGLE
      ally_jungle: { type: Number, default: 0 }, // NEUTRAL_MINIONS_KILLED_YOUR_JUNGLE
    },

    // ==================== MULTI-KILLS ====================
    multi_kills: {
      double: { type: Number, default: 0 },
      triple: { type: Number, default: 0 },
      quadra: { type: Number, default: 0 },
      penta: { type: Number, default: 0 },
    },

    // ==================== COMBAT ====================
    combat: {
      killing_sprees: { type: Number, default: 0 }, // KILLING_SPREES
      largest_killing_spree: { type: Number, default: 0 },
      largest_multi_kill: { type: Number, default: 0 },
      largest_critical_strike: { type: Number, default: 0 },
      largest_ability_damage: { type: Number, default: 0 },
      largest_attack_damage: { type: Number, default: 0 },
      solo_kills: { type: Number, default: 0 },
      time_ccing_champions: { type: Number, default: 0 }, // TIME_CCING_OTHERS (secondes)
      total_time_cc_dealt: { type: Number, default: 0 }, // TOTAL_TIME_CROWD_CONTROL_DEALT
      total_time_cc_dealt_to_champions: { type: Number, default: 0 },
    },

    // ==================== DAMAGE DEALT ====================
    damage: {
      // Total
      total: { type: Number, default: 0 }, // TOTAL_DAMAGE_DEALT
      total_to_champions: { type: Number, default: 0 },
      // Par type aux champions
      physical_to_champions: { type: Number, default: 0 },
      magic_to_champions: { type: Number, default: 0 },
      true_to_champions: { type: Number, default: 0 },
      // Par type total
      physical_total: { type: Number, default: 0 }, // PHYSICAL_DAMAGE_DEALT_PLAYER
      magic_total: { type: Number, default: 0 }, // MAGIC_DAMAGE_DEALT_PLAYER
      true_total: { type: Number, default: 0 }, // TRUE_DAMAGE_DEALT_PLAYER
      // Objectifs
      to_turrets: { type: Number, default: 0 },
      to_buildings: { type: Number, default: 0 }, // TOTAL_DAMAGE_DEALT_TO_BUILDINGS
      to_objectives: { type: Number, default: 0 },
      to_epic_monsters: { type: Number, default: 0 }, // TOTAL_DAMAGE_DEALT_TO_EPIC_MONSTERS
      // Calculé
      damage_per_min: { type: Number },
      damage_share: { type: Number }, // % des dégâts de l'équipe
    },

    // ==================== DAMAGE TAKEN / TANK ====================
    tank: {
      total_taken: { type: Number, default: 0 },
      physical_taken: { type: Number, default: 0 },
      magic_taken: { type: Number, default: 0 },
      true_taken: { type: Number, default: 0 },
      self_mitigated: { type: Number, default: 0 },
      // Healing
      total_healed: { type: Number, default: 0 }, // TOTAL_HEAL
      healed_on_teammates: { type: Number, default: 0 },
      units_healed: { type: Number, default: 0 },
      // Shields
      shielded_on_teammates: { type: Number, default: 0 },
    },

    // ==================== VISION ====================
    vision: {
      score: { type: Number, default: 0 },
      wards_placed: { type: Number, default: 0 },
      wards_killed: { type: Number, default: 0 },
      control_wards_placed: { type: Number, default: 0 }, // WARD_PLACED_DETECTOR
      control_wards_bought: { type: Number, default: 0 }, // VISION_WARDS_BOUGHT_IN_GAME
      stealth_wards_bought: { type: Number, default: 0 }, // SIGHT_WARDS_BOUGHT_IN_GAME
    },

    // ==================== OBJECTIVES ====================
    objectives: {
      turrets_killed: { type: Number, default: 0 }, // TURRETS_KILLED
      turret_takedowns: { type: Number, default: 0 }, // TURRET_TAKEDOWNS
      inhibitors_killed: { type: Number, default: 0 }, // BARRACKS_KILLED
      inhibitor_takedowns: { type: Number, default: 0 }, // BARRACKS_TAKEDOWNS
      dragons: { type: Number, default: 0 }, // DRAGON_KILLS
      barons: { type: Number, default: 0 }, // BARON_KILLS
      heralds: { type: Number, default: 0 }, // RIFT_HERALD_KILLS
      grubs: { type: Number, default: 0 }, // HORDE_KILLS (voidgrubs)
      atakhan: { type: Number, default: 0 }, // ATAKHAN_KILLS
      nexus_killed: { type: Boolean, default: false }, // HQ_KILLED > 0
      nexus_takedown: { type: Boolean, default: false }, // HQ_TAKEDOWNS > 0
      objectives_stolen: { type: Number, default: 0 },
      objectives_stolen_assists: { type: Number, default: 0 },
    },

    // ==================== ITEMS ====================
    items: [{ type: Number }], // Array de 7 items (ITEM0-6)
    items_purchased: { type: Number, default: 0 },
    consumables_purchased: { type: Number, default: 0 },

    // ==================== RUNES ====================
    runes: {
      keystone: { type: Number }, // KEYSTONE_ID / PERK0
      primary_tree: { type: Number }, // PERK_PRIMARY_STYLE
      secondary_tree: { type: Number }, // PERK_SUB_STYLE
      // Toutes les runes
      perks: [{ type: Number }], // PERK0-5
      // Petites runes de stats
      stat_perks: {
        offense: { type: Number }, // STAT_PERK_0
        flex: { type: Number }, // STAT_PERK_1
        defense: { type: Number }, // STAT_PERK_2
      },
      // Valeurs générées par les runes (optionnel mais utile pour analyse)
      perk_values: [
        {
          perk_id: { type: Number },
          var1: { type: Number },
          var2: { type: Number },
          var3: { type: Number },
        },
      ],
    },

    // ==================== SUMMONER SPELLS ====================
    summoner_spells: {
      spell1: { type: Number },
      spell2: { type: Number },
      spell1_casts: { type: Number, default: 0 },
      spell2_casts: { type: Number, default: 0 },
    },

    // ==================== SPELL CASTS ====================
    spell_casts: {
      q: { type: Number, default: 0 }, // SPELL1_CAST
      w: { type: Number, default: 0 }, // SPELL2_CAST
      e: { type: Number, default: 0 }, // SPELL3_CAST
      r: { type: Number, default: 0 }, // SPELL4_CAST
    },

    // ==================== TIME ====================
    time: {
      played: { type: Number }, // TIME_PLAYED (secondes)
      dead: { type: Number, default: 0 }, // TOTAL_TIME_SPENT_DEAD
      longest_life: { type: Number, default: 0 }, // LONGEST_TIME_SPENT_LIVING
      disconnected: { type: Number, default: 0 }, // TIME_SPENT_DISCONNECTED
    },

    // ==================== PLAYER BEHAVIOR ====================
    behavior: {
      was_afk: { type: Boolean, default: false },
      was_afk_after_failed_surrender: { type: Boolean, default: false },
      was_leaver: { type: Boolean, default: false },
      was_early_surrender_accomplice: { type: Boolean, default: false },
      muted_all: { type: Boolean, default: false },
      players_muted: { type: Number, default: 0 },
      muted_by_players: { type: Number, default: 0 },
    },

    // ==================== PINGS ====================
    pings: {
      total: { type: Number, default: 0 }, // Calculé
      all_in: { type: Number, default: 0 },
      assist_me: { type: Number, default: 0 },
      basic: { type: Number, default: 0 },
      command: { type: Number, default: 0 },
      danger: { type: Number, default: 0 },
      enemy_missing: { type: Number, default: 0 },
      enemy_vision: { type: Number, default: 0 },
      get_back: { type: Number, default: 0 },
      hold: { type: Number, default: 0 },
      need_vision: { type: Number, default: 0 },
      on_my_way: { type: Number, default: 0 },
      push: { type: Number, default: 0 },
      retreat: { type: Number, default: 0 },
      vision_cleared: { type: Number, default: 0 },
    },

    // ==================== GAME END INFO ====================
    game_ended_in_surrender: { type: Boolean, default: false },
    game_ended_in_early_surrender: { type: Boolean, default: false },

    // ==================== NETWORK ====================
    ping_ms: { type: Number }, // PING (latence moyenne du joueur)

    // ==================== TURRET PLATES ====================
    turret_plates_destroyed: { type: Number, default: 0 },
    gold_from_turret_plates: { type: Number, default: 0 },

    // ==================== ADVANCED MISSIONS STATS ====================
    // Ces stats sont utiles pour des analyses poussées
    advanced: {
      takedowns_under_turret: { type: Number, default: 0 },
      immobilize_champions: { type: Number, default: 0 },
      legendary_items_count: { type: Number, default: 0 },
      plants_destroyed: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);
Schema.index({ team_id: 1, createdAt: -1 });
Schema.index({ champion: 1, role: 1 });

const OBJ = mongoose.model(MODELNAME, Schema);
module.exports = OBJ;
