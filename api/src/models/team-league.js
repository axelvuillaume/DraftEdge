const mongoose = require('mongoose');

const MODELNAME = 'team-league';

const Schema = new mongoose.Schema(
  {
    name: { type: String },
    description: { type: String },
    league_id: { type: String },
    league_name: { type: String },
    group: { type: String },
    multi_opgg: { type: String },
    players: [{ name: { type: String }, riot_id: { type: String } }],
    old_players: [{ name: { type: String }, riot_id: { type: String } }],
    staff: [{ name: { type: String }, riot_id: { type: String } }],
    replacements: [{ name: { type: String }, riot_id: { type: String } }],
    contacts: [{ name: { type: String }, role: { type: String }, twitter: { type: String }, discord: { type: String } }],
    points: { type: Number, default: 0 },
    total_lp: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const TeamLeague = mongoose.model(MODELNAME, Schema);
module.exports = TeamLeague;
