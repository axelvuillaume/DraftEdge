const mongoose = require('mongoose');

const MODELNAME = 'draft-scenario';

const Schema = new mongoose.Schema(
  {
    name: { type: String },
    description: { type: String },
    team_id: { type: String, required: true },
    team_name: { type: String, required: true },
    blueBans: [{ type: mongoose.Schema.Types.Mixed }],
    redBans: [{ type: mongoose.Schema.Types.Mixed }],
    bluePicks: [{ type: mongoose.Schema.Types.Mixed }],
    redPicks: [{ type: mongoose.Schema.Types.Mixed }],
    opponent_id: { type: String },
    opponent_name: { type: String },
  },
  { timestamps: true },
);

const Folder = mongoose.model(MODELNAME, Schema);
module.exports = Folder;
