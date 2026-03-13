const mongoose = require('mongoose');

const MODELNAME = 'pro-game';

const Schema = new mongoose.Schema(
  {
    // Match identification
    matchId: { type: String, required: true },

    // Teams
    team_name: { type: String, required: true },
    winner: { type: Boolean },
    side: { type: String, enum: ['blue', 'red'] },
    // Match details
    dateTime: { type: Date, required: true, index: true },
    league: { type: String, index: true }, // e.g., 'LCK'
    year: { type: Number }, // e.g., 2025
    split: { type: String }, // e.g., 'Spring'

    patch: { type: String },
    gameNumber: { type: Number },
    duration: { type: String },

    // Draft order
    bans: [{ type: String }],
    picks: [{ champion: String, role: String }],

    // Stats
    kills: { type: Number },
    gold: { type: Number },
    towers: { type: Number },
    dragons: { type: Number },
    barons: { type: Number },
  },
  { timestamps: true },
);

// Index for common queries
Schema.index({ league: 1, year: 1, split: 1, dateTime: -1 });
Schema.index({ team_name: 1, dateTime: -1 });
Schema.index({ matchId: 1, team_name: 1 });

const ProGame = mongoose.model(MODELNAME, Schema);
module.exports = ProGame;
