const express = require('express');
const router = express.Router();
const passport = require('passport');
const Stripe = require('stripe');
const Team = require('../models/team');
const config = require('../config');
const ERROR_CODES = require('../utils/errorCodes');
const { capture } = require('../services/sentry');
const { capture: posthogCapture } = require('../services/posthog');

const stripe = new Stripe(config.STRIPE_SECRET_KEY);

// Create a Stripe Checkout Session for a team subscription
router.post('/create-checkout-session', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const team = await Team.findById(req.user.team_id);
    if (!team) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

    if (team.subscription_status === 'active') return res.status(400).send({ ok: false, code: 'ALREADY_SUBSCRIBED' });

    let customerId = team.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        metadata: { team_id: team._id.toString(), team_name: team.name },
      });
      customerId = customer.id;
      team.set({ stripe_customer_id: customerId });
      await team.save();
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: config.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${config.APP_URL}/team?subscription=success`,
      cancel_url: `${config.APP_URL}/team?subscription=canceled`,
      metadata: { team_id: team._id.toString() },
    });

    posthogCapture(req.user._id.toString(), 'stripe_checkout_started', { team_id: team._id.toString() });

    return res.status(200).send({ ok: true, url: session.url });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

// Create a Stripe Customer Portal session (manage subscription, invoices, cancel)
router.post('/create-portal-session', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const team = await Team.findById(req.user.team_id);
    if (!team) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });
    if (!team.stripe_customer_id) return res.status(400).send({ ok: false, code: 'NO_SUBSCRIPTION' });

    const session = await stripe.billingPortal.sessions.create({
      customer: team.stripe_customer_id,
      return_url: `${config.APP_URL}/team`,
    });

    return res.status(200).send({ ok: true, url: session.url });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

// Get subscription status for the current user's team
router.get('/subscription', passport.authenticate(['admin', 'user'], { session: false, failWithError: true }), async (req, res) => {
  try {
    const team = await Team.findById(req.user.team_id);
    if (!team) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

    return res.status(200).send({
      ok: true,
      data: {
        subscription_status: team.subscription_status,
        subscription_current_period_end: team.subscription_current_period_end,
        stripe_customer_id: team.stripe_customer_id,
      },
    });
  } catch (error) {
    capture(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

module.exports = router;
