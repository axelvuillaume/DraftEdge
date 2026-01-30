const { PostHog } = require('posthog-node');
const { POSTHOG_API_KEY, POSTHOG_HOST } = require('../config');

let client = null;

function initPostHog() {
  if (POSTHOG_API_KEY) {
    client = new PostHog(POSTHOG_API_KEY, {
      host: POSTHOG_HOST,
    });
    console.log('PostHog initialized');
  }
}

function capture(distinctId, event, properties = {}) {
  if (client) {
    client.capture({
      distinctId,
      event,
      properties,
    });
  }
}

function identify(distinctId, properties = {}) {
  if (client) {
    client.identify({
      distinctId,
      properties,
    });
  }
}

async function shutdown() {
  if (client) {
    await client.shutdown();
  }
}

module.exports = {
  initPostHog,
  capture,
  identify,
  shutdown,
};
