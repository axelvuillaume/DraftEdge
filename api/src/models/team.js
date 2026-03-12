const mongoose = require('mongoose');

const MODELNAME = 'team';

const Schema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    region: { type: String, default: 'euw1' },
    prio_pick: [{ type: String }],
    prio_ban: [{ type: String }],
    prio_flex: [{ type: String }],
    prio_support: [{ type: String }],
    prio_jungle: [{ type: String }],
    prio_mid: [{ type: String }],
    prio_top: [{ type: String }],
    prio_bottom: [{ type: String }],
    league_id: { type: String },
    league_name: { type: String },
    notes: { type: String, default: '' },
  },
  { timestamps: true },
);

const OBJ = mongoose.model(MODELNAME, Schema);
module.exports = OBJ;
