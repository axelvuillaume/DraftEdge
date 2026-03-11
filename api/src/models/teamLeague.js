const mongoose = require('mongoose');

const MODELNAME = 'teamLeague';

const Schema = new mongoose.Schema(
  {
    name: { type: String },
    description: { type: String },
    league_id: { type: String },
    league_name: { type: String },
    multi_opgg: { type: String },
    players: [{ type: String }],
    players_ids: [{ type: String }],
    staff: [{ type: String }],
    staff_ids: [{ type: String }],
    replacements: [{ type: String }],
    replacements_ids: [{ type: String }],
    discord_manager: { type: String },
    discord_captain: { type: String },
  },
  { timestamps: true },
);

const TeamLeague = mongoose.model(MODELNAME, Schema);
module.exports = TeamLeague;
