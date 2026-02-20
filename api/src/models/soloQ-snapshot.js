const mongoose = require('mongoose');

const MODELNAME = 'soloQ-snapshot';

const Schema = new mongoose.Schema(
  {
    player_id: { type: String },
    player_summoner_name: { type: String },
    player_summoner_tag: { type: String },
    team_id: { type: String },
    team_name: { type: String },
    tier: { type: String },
    rank: { type: String },
    league_points: { type: Number },
    wins: { type: Number },
    losses: { type: Number },
    win_rate: { type: Number },
    fetched_at: { type: Date },
  },
  { timestamps: true },
);

const OBJ = mongoose.model(MODELNAME, Schema);
module.exports = OBJ;
