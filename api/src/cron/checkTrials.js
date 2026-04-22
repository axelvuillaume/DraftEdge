const Team = require('../models/team');

async function checkTrials() {
  const expired = await Team.find({ subscription_status: 'trialing', subscription_current_period_end: { $lt: new Date() } });
  console.log(`[checkTrials] Found ${expired.length} expired trial(s)`);

  for (const team of expired) {
    team.subscription_status = 'canceled';
    await team.save();
    console.log(`[checkTrials] Canceled ${team.name}`);
  }

  console.log(`[checkTrials] Done`);
}

module.exports = checkTrials;
