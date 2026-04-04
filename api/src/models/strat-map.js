const mongoose = require('mongoose');

const MODELNAME = 'strat-map';

const Schema = new mongoose.Schema(
  {
    name: { type: String, default: 'Untitled' },
    team_id: { type: String, required: true },
    team_name: { type: String },
    elements: [{ type: mongoose.Schema.Types.Mixed }],
    drawings: [{ type: mongoose.Schema.Types.Mixed }],
    map_type: { type: String, default: 'default' },
    nash_type: { type: String, default: 'none' },
    opponent_id: { type: String },
    opponent_name: { type: String },
    note: { type: String, default: '' },
  },
  { timestamps: true },
);

const OBJ = mongoose.model(MODELNAME, Schema);
module.exports = OBJ;
