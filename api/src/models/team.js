const mongoose = require('mongoose');

const MODELNAME = 'team';

const Schema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    prio_pick: [{ type: String }],
    prio_ban: [{ type: String }],
    prio_flex: [{ type: String }],
    prio_support: [{ type: String }],
    prio_jungle: [{ type: String }],
    prio_mid: [{ type: String }],
    prio_top: [{ type: String }],
    prio_bottom: [{ type: String }],
  },
  { timestamps: true },
);

const OBJ = mongoose.model(MODELNAME, Schema);
module.exports = OBJ;
