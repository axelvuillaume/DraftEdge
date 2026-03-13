const mongoose = require('mongoose');

const MODELNAME = 'soloq-snapshot';

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

Schema.index({ player_id: 1, fetched_at: -1 });
Schema.index({ team_id: 1, fetched_at: -1 });

const OBJ = mongoose.model(MODELNAME, Schema);
module.exports = OBJ;
