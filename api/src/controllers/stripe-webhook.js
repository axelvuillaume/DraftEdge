const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const Team = require('../models/team');
const config = require('../config');
const { capture } = require('../services/sentry');

const stripe = new Stripe(config.STRIPE_SECRET_KEY);

router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], config.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).send({ ok: false });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      if (session.mode !== 'subscription') return res.status(200).send({ ok: true });

      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      const periodEnd = subscription.items?.data?.[0]?.current_period_end;
      const update = { stripe_subscription_id: subscription.id, subscription_status: subscription.status };
      if (periodEnd) update.subscription_current_period_end = new Date(periodEnd * 1000);
      await Team.findByIdAndUpdate(session.metadata.team_id, update);
    }

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
      const subscription = event.data.object;
      const team = await Team.findOne({ stripe_customer_id: subscription.customer });
      if (team) {
        team.set({
          stripe_subscription_id: subscription.id,
          subscription_status: subscription.cancel_at ? 'cancel_scheduled' : subscription.status,
          subscription_current_period_end: new Date(subscription.items.data[0].current_period_end * 1000),
        });
        await team.save();
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const team = await Team.findOne({ stripe_customer_id: subscription.customer });
      if (team) {
        team.set({ subscription_status: 'canceled', stripe_subscription_id: null, subscription_current_period_end: null });
        await team.save();
      }
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object;
      const team = await Team.findOne({ stripe_customer_id: invoice.customer });
      if (team) {
        team.set({ subscription_status: 'past_due' });
        await team.save();
      }
    }

    return res.status(200).send({ ok: true });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false });
  }
});

module.exports = router;
