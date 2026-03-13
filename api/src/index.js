require('dotenv').config();
const cors = require('cors');
const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const { initSentry, setupErrorHandler } = require('./services/sentry');
const { initPostHog, capture } = require('./services/posthog');
const { PORT, ENVIRONMENT, APP_URL } = require('./config');

const app = express();
initSentry(app);
initPostHog();

if (ENVIRONMENT === 'development') {
  app.use(morgan('tiny'));
}

require('./services/mongo');

app.use(cors({ credentials: true, origin: [APP_URL, 'https://draftedge.lol'] }));
app.use(cookieParser());

app.use('/parser', require('./controllers/parser'));

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

const lastDeployedAt = new Date();
app.get('/', async (req, res) => {
  res.status(200).send({
    name: 'api',
    environment: ENVIRONMENT,
    last_deployed_at: lastDeployedAt.toLocaleString(),
  });
});

app.use('/user', require('./controllers/user'));
app.use('/game', require('./controllers/game'));
app.use('/aifeedback', require('./controllers/AIFeedBack'));
app.use('/folder', require('./controllers/folder'));
app.use('/playerstats', require('./controllers/playerstats'));
app.use('/draft-scenario', require('./controllers/draft-scenario'));
app.use('/pro-game', require('./controllers/pro-game'));
app.use('/pro-game-playerstats', require('./controllers/pro-game-playerstats'));
app.use('/team', require('./controllers/team'));
app.use('/scrim-objectif', require('./controllers/scrim-objectif'));
app.use('/scrim-objectif-result', require('./controllers/scrim-objectif-result'));
app.use('/scrim-session', require('./controllers/scrim-session'));
app.use('/enemy-team', require('./controllers/enemy-team'));
app.use('/player', require('./controllers/player'));
app.use('/solo-objectif', require('./controllers/solo-objectif'));
app.use('/solo-objectif-result', require('./controllers/solo-objectif-result'));
app.use('/soloq-snapshot', require('./controllers/soloQ-snapshot'));
app.use('/soloq-match', require('./controllers/soloQ-match'));
app.use('/team-league', require('./controllers/team-league'));
app.use('/league', require('./controllers/league'));

setupErrorHandler(app);
require('./services/passport')(app);
require('./cron');

app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});
