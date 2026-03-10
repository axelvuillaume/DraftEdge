const mongoose = require('mongoose');

const MODELNAME = 'player';

const Schema = new mongoose.Schema(
  {
    team_id: { type: String, trim: true },
    team_name: { type: String, trim: true },
    player_name: { type: String, trim: true },
    role: { type: String, enum: ['top', 'jungle', 'mid', 'bottom', 'support'] },

    // Riot Account
    riot_id: { type: String, trim: true },
    game_name: { type: String, trim: true },
    tag_line: { type: String, trim: true },
    puuid: { type: String, trim: true },
    summoner_id: { type: String, trim: true },
    region: { type: String, trim: true },

    current_tier: { type: String, trim: true },
    current_rank: { type: String, trim: true },
    current_lp: { type: Number },
    current_wins: { type: Number },
    current_losses: { type: Number },

    // Champion pool (tier list manuelle du joueur)
    champion_pool: [
      {
        champion: { type: String, trim: true },
        tier: { type: String, enum: ['S', 'A', 'B'] },
      },
    ],

    notes: { type: String, default: '' },

    active: { type: Boolean, default: true },
    last_fetched_at: { type: Date },
    connected_at: { type: Date },
  },
  { timestamps: true },
);

const OBJ = mongoose.model(MODELNAME, Schema);
module.exports = OBJ;
