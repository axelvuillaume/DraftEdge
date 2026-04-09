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

    // Stripe subscription
    stripe_customer_id: { type: String },
    stripe_subscription_id: { type: String },
    subscription_status: { type: String, enum: ['active', 'cancel_scheduled', 'canceled', 'past_due', 'incomplete', 'trialing', 'unpaid', null], default: null },
    subscription_current_period_end: { type: Date },
  },
  { timestamps: true },
);

const OBJ = mongoose.model(MODELNAME, Schema);
module.exports = OBJ;
