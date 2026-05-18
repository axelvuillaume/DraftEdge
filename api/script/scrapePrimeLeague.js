const mongoose = require('mongoose');
const { MONGODB_ENDPOINT } = require('../src/config.js');
const scrapePrimeLeague = require('../src/cron/scrapePrimeLeague.js');

async function main() {
  await mongoose.connect(MONGODB_ENDPOINT);
  console.log('MongoDB Connected\n');
  await scrapePrimeLeague();
  await mongoose.disconnect();
  console.log('\nDone!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
