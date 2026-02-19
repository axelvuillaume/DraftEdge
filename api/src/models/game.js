const mongoose = require('mongoose');

const MODELNAME = 'game';

const TeamStatsSchema = {
  win: { type: Boolean },
  // KDA
  kills: { type: Number, default: 0 },
  deaths: { type: Number, default: 0 },
  assists: { type: Number, default: 0 },
  // Economy
  gold: { type: Number, default: 0 },
  gold_spent: { type: Number, default: 0 },
  // Objectives
  dragons: { type: Number, default: 0 },
  barons: { type: Number, default: 0 },
  heralds: { type: Number, default: 0 },
  grubs: { type: Number, default: 0 }, // HORDE_KILLS (voidgrubs)
  atakhan: { type: Number, default: 0 }, // ATAKHAN_KILLS (nouveau monstre S15)
  towers: { type: Number, default: 0 }, // TURRETS_KILLED
  tower_takedowns: { type: Number, default: 0 }, // TURRET_TAKEDOWNS
  inhibitors: { type: Number, default: 0 }, // BARRACKS_KILLED
  inhibitor_takedowns: { type: Number, default: 0 }, // BARRACKS_TAKEDOWNS
  // Damage
  total_damage_to_champions: { type: Number, default: 0 },
  total_damage_taken: { type: Number, default: 0 },
  // Vision
  vision_score: { type: Number, default: 0 },
  wards_placed: { type: Number, default: 0 },
  wards_killed: { type: Number, default: 0 },
  control_wards_bought: { type: Number, default: 0 },

  // Turret plates
  turret_plates_destroyed: { type: Number, default: 0 },
  gold_from_turret_plates: { type: Number, default: 0 },
  // CS
  total_cs: { type: Number, default: 0 },
  total_jungle_cs: { type: Number, default: 0 },
};

const Schema = new mongoose.Schema(
  {
    // ==================== GAME IDENTIFICATION ====================
    name: { type: String }, // Nom personnalisé de la game
    game_id: { type: String, unique: true, sparse: true },
    match_id: { type: String }, // Format Riot: EUW1_XXXXXXXXXX
    game_fingerprint: { type: String, unique: true }, // duration_blueK_blueD_blueA_redK_redD_redA

    // ==================== GAME INFO ====================
    duration: { type: Number, required: true }, // en secondes
    patch: { type: String },
    date: { type: Date },

    // ==================== TEAM CONTEXT ====================
    // Ton équipe
    team_id: { type: String },
    team_name: { type: String },
    team_side: { type: String, enum: ['blue', 'red'] },
    win: { type: Boolean },

    // Équipe adverse
    opponent_id: { type: String },
    opponent_name: { type: String },

    // ==================== TEAM STATS ====================
    blue_team: TeamStatsSchema,
    red_team: TeamStatsSchema,

    // ==================== GAME END INFO ====================
    game_end: {
      surrender: { type: Boolean, default: false }, // GAME_ENDED_IN_SURRENDER
      early_surrender: { type: Boolean, default: false }, // GAME_ENDED_IN_EARLY_SURRENDER
      surrender_due_to_afk: { type: Boolean, default: false }, // WAS_SURRENDER_DUE_TO_AFK
      nexus_killed: { type: Boolean, default: true }, // Si HQ_KILLED > 0
    },

    // ==================== SESSION INFO ====================
    session_id: { type: String },
    session_name: { type: String },

    // ==================== FOLDER INFO ====================
    folder_id: { type: String },
    folder_name: { type: String },

    // ==================== CHAMPIONS PLAYED ====================
    // Référence rapide sans avoir à query les playerstats
    champions: {
      blue: {
        top: { type: String },
        jungle: { type: String },
        mid: { type: String },
        bottom: { type: String },
        support: { type: String },
      },
      red: {
        top: { type: String },
        jungle: { type: String },
        mid: { type: String },
        bottom: { type: String },
        support: { type: String },
      },
    },

    // ==================== DRAFTER INFO ====================
    bluePicks: [{ type: String }],
    redPicks: [{ type: String }],
    blueBans: [{ type: String }],
    redBans: [{ type: String }],
    fearless: { type: Boolean, default: false },
    fearlessRestricted: { type: mongoose.Schema.Types.Mixed },
    source: { type: String, enum: ['drafter', 'dawe'] },
    source_url: { type: String },

    // ==================== GAME STATS SUMMARY ====================
    // Stats globales de la partie
    stats_summary: {
      total_kills: { type: Number, default: 0 }, // blue + red kills
      total_gold: { type: Number, default: 0 },
      total_cs: { type: Number, default: 0 },
      total_vision_score: { type: Number, default: 0 },
      longest_game_time_alive: { type: Number, default: 0 },
      // Multi-kills de la partie
      double_kills: { type: Number, default: 0 },
      triple_kills: { type: Number, default: 0 },
      quadra_kills: { type: Number, default: 0 },
      penta_kills: { type: Number, default: 0 },
    },

    // ==================== TAGS & NOTES ====================
    // Pour organisation personnelle
    tags: [{ type: String }],
    notes: { type: String },

    // ==================== ROFL FILE INFO ====================
    rofl: {
      filename: { type: String },
      imported_at: { type: Date },
      file_patch: { type: String }, // Version du client depuis le ROFL
    },
  },
  { timestamps: true },
);

// Index unique pour éviter les doublons
Schema.index({ date: 1, duration: 1, team_id: 1, win: 1 }, { unique: true, sparse: true });

const OBJ = mongoose.model(MODELNAME, Schema);
module.exports = OBJ;
