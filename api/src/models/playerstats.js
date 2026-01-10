const mongoose = require('mongoose');

const MODELNAME = 'playerstats';

const Schema = new mongoose.Schema(
  {
    //game
    game_id: { type: String, trim: true },
    game_name: { type: String, trim: true },
    game_win: { type: Boolean },
    game_duration: { type: Number },

    //info player
    summoner_name: { type: String, trim: true },
    riot_tag: { type: String, trim: true },
    PUUID: { type: String, trim: true },

    team_id: { type: String, trim: true },
    team_name: { type: String, trim: true },
    opponent: { type: Boolean },
    side: { type: String, enum: ['blue', 'red'] },
    role: { type: String, enum: ['top', 'jungle', 'mid', 'bottom', 'support'] },
    champion: { type: String },

    // Basic stats
    kills: { type: Number },
    deaths: { type: Number },
    assists: { type: Number },
    level: { type: Number },

    // CS & Gold
    cs: { type: Number, default: 0 }, // Total minions + jungle
    cs_per_min: { type: Number }, // Calculé
    gold: { type: Number, default: 0 },
    gold_per_min: { type: Number }, // Calculé

    // Multi-kills
    multi_kills: {
      double: { type: Number, default: 0 },
      triple: { type: Number, default: 0 },
      quadra: { type: Number, default: 0 },
      penta: { type: Number, default: 0 },
    },

    // Combat
    combat: {
      killing_spree: { type: Number, default: 0 },
      largest_multi_kill: { type: Number, default: 0 },
      first_blood: { type: Boolean, default: false },
      solo_kills: { type: Number, default: 0 },
      time_ccing: { type: Number, default: 0 }, // Temps de CC en secondes
    },

    // Dégâts infligés
    damage: {
      total_to_champions: { type: Number, default: 0 },
      physical_to_champions: { type: Number, default: 0 },
      magic_to_champions: { type: Number, default: 0 },
      true_to_champions: { type: Number, default: 0 },
      to_turrets: { type: Number, default: 0 },
      to_objectives: { type: Number, default: 0 },
      damage_per_min: { type: Number }, // Calculé
    },

    // Dégâts subis / Tank
    tank: {
      total_taken: { type: Number, default: 0 },
      physical_taken: { type: Number, default: 0 },
      magic_taken: { type: Number, default: 0 },
      true_taken: { type: Number, default: 0 },
      self_mitigated: { type: Number, default: 0 },
      healed: { type: Number, default: 0 },
      shielded_to_allies: { type: Number, default: 0 },
    },

    // Vision
    vision: {
      score: { type: Number, default: 0 },
      wards_placed: { type: Number, default: 0 },
      wards_killed: { type: Number, default: 0 },
      control_wards_bought: { type: Number, default: 0 },
    },

    // Farm détaillé
    farm: {
      minions: { type: Number, default: 0 },
      jungle_monsters: { type: Number, default: 0 },
      enemy_jungle: { type: Number, default: 0 },
      ally_jungle: { type: Number, default: 0 },
    },

    // Objectifs
    objectives: {
      turrets: { type: Number, default: 0 },
      inhibitors: { type: Number, default: 0 },
      dragons: { type: Number, default: 0 },
      barons: { type: Number, default: 0 },
      heralds: { type: Number, default: 0 },
    },

    // Build (IDs Data Dragon)
    items: [{ type: Number }], // Array de 7 items max (6 + ward)

    // Runes
    runes: {
      keystone: { type: Number }, // ID de la rune principale
      primary_tree: { type: Number },
      secondary_tree: { type: Number },
    },

    // Summoner spells (IDs)
    summoner_spells: {
      spell1: { type: Number },
      spell2: { type: Number },
    },

    // Temps
    time: {
      played: { type: Number }, // secondes
      dead: { type: Number }, // secondes passées mort
      longest_life: { type: Number }, // plus longue vie
    },
  },
  { timestamps: true }
);

const OBJ = mongoose.model(MODELNAME, Schema);
module.exports = OBJ;
