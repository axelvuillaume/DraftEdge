const Team = require('../models/team');

module.exports = async () => {
  const result = await Team.updateMany({ subscription_status: 'trialing', subscription_current_period_end: { $lt: new Date() } }, { subscription_status: 'canceled', subscription_current_period_end: null });
  if (result.modifiedCount > 0) {
    console.log(`Expired ${result.modifiedCount} trial(s)`);
  }
};
