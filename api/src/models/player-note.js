const mongoose = require('mongoose');

const MODELNAME = 'player-note';

const Schema = new mongoose.Schema(
  {
    team_id: { type: String, trim: true },
    team_name: { type: String, trim: true },
    player_id: { type: String, trim: true },
    player_name: { type: String, trim: true },
    title: { type: String, trim: true },
    content: { type: String, default: '' },
    author_id: { type: String, trim: true },
    author_name: { type: String, trim: true },
  },
  { timestamps: true },
);

const OBJ = mongoose.model(MODELNAME, Schema);
module.exports = OBJ;
