const mongoose = require('mongoose');

const FolderObject = require('../models/folder');
const StratMapObject = require('../models/strat-map');
const ReplayBookObject = require('../models/replay-book');
const ScrimObjectifObject = require('../models/scrim-objectif');
const DraftObject = require('../models/draft');
const DraftScenarioObject = require('../models/draft-scenario');

// Each function below seeds the defaults for one feature when a team is created.
// Edit freely — adding/removing fields here is enough, no other file to touch.

const seedStratMaps = (team, ids) =>
  StratMapObject.create([
    {
      _id: ids.nashStratMap,
      team_id: team._id.toString(),
      team_name: team.name,
      name: 'Default : Setup Nash',
      map_type: 'default',
      nash_type: 'nash2',
      note: '',
      elements: [
        { type: 'role', roleId: 'top', side: 'blue', x: 412.785016286645, y: 381.9543973941368 },
        { type: 'role', roleId: 'jungle', side: 'blue', x: 367.7524429967427, y: 389.4462540716612 },
        { type: 'role', roleId: 'mid', side: 'blue', x: 358.6319218241042, y: 355.3745928338762 },
        { type: 'role', roleId: 'bottom', side: 'blue', x: 344.03908794788276, y: 422.93159609120517 },
        { type: 'role', roleId: 'support', side: 'blue', x: 312.2475570032573, y: 383.12703583061887 },
        { type: 'role', roleId: 'top', side: 'red', x: 262.2149837133551, y: 239.60912052117263 },
        { type: 'role', roleId: 'jungle', side: 'red', x: 240.09771986970685, y: 212.24755700325736 },
        { type: 'role', roleId: 'mid', side: 'red', x: 227.6872964169381, y: 300.1302931596091 },
        { type: 'role', roleId: 'bottom', side: 'red', x: 223.09446254071665, y: 232.76872964169385 },
        { type: 'role', roleId: 'support', side: 'red', x: 305.7654723127036, y: 227.49185667752445 },
        { type: 'ward', wardType: 'ward_pink', x: 221.92182410423456, y: 151.56351791530946 },
        { type: 'ward', wardType: 'ward_pink', x: 243.90879478827367, y: 302.8338762214984 },
        { type: 'ward', wardType: 'ward_green', x: 306.3517915309447, y: 316.9055374592834 },
        { type: 'ward', wardType: 'ward_green', x: 357.36156351791533, y: 239.8045602605863 },
        { type: 'ward', wardType: 'ward_green', x: 227.49185667752445, y: 374.07166123778507 },
        { type: 'ward', wardType: 'ward_green', x: 147.75244299674267, y: 276.742671009772 },
      ],
      drawings: [
        {
          color: '#ef4444',
          size: 3,
          points: [
            { x: 300.48859934853425, y: 255.04885993485343 },
            { x: 300.48859934853425, y: 255.04885993485343 },
            { x: 300.48859934853425, y: 255.04885993485343 },
            { x: 300.1954397394137, y: 255.34201954397395 },
            { x: 300.1954397394137, y: 255.34201954397395 },
            { x: 299.6091205211727, y: 255.63517915309447 },
            { x: 299.31596091205216, y: 256.2214983713355 },
            { x: 298.4364820846906, y: 256.80781758957653 },
            { x: 297.55700325732903, y: 257.3941368078176 },
            { x: 296.38436482084694, y: 257.9804560260586 },
            { x: 295.21172638436485, y: 259.1530944625407 },
            { x: 293.4527687296418, y: 260.6188925081433 },
            { x: 291.98697068403914, y: 261.7915309446254 },
            { x: 290.228013029316, y: 263.257328990228 },
            { x: 288.46905537459287, y: 265.01628664495115 },
            { x: 286.71009771986974, y: 266.7752442996743 },
            { x: 285.24429967426715, y: 268.24104234527687 },
            { x: 283.77850162866457, y: 269.7068403908795 },
            { x: 282.6058631921825, y: 271.1726384364821 },
            { x: 281.4332247557004, y: 272.63843648208467 },
            { x: 280.2605863192183, y: 273.81107491856676 },
            { x: 279.0879478827362, y: 275.2768729641694 },
            { x: 277.62214983713363, y: 277.03583061889253 },
            { x: 275.86319218241044, y: 279.08794788273616 },
            { x: 273.8110749185668, y: 281.1400651465798 },
            { x: 271.46579804560264, y: 283.7785016286645 },
            { x: 267.94788273615643, y: 287.2964169381107 },
            { x: 264.42996742671016, y: 290.5211726384365 },
            { x: 261.2052117263844, y: 293.7459283387622 },
            { x: 257.6872964169381, y: 296.67752442996743 },
            { x: 255.04885993485345, y: 299.3159609120521 },
            { x: 252.7035830618893, y: 301.3680781758958 },
            { x: 250.94462540716617, y: 303.4201954397394 },
            { x: 248.89250814332252, y: 305.17915309446255 },
            { x: 247.42671009771993, y: 306.9381107491857 },
            { x: 246.54723127035834, y: 308.11074918566777 },
            { x: 245.08143322475576, y: 309.57654723127035 },
            { x: 243.61563517915314, y: 311.042345276873 },
            { x: 241.5635179153095, y: 312.5081433224756 },
            { x: 239.2182410423453, y: 314.5602605863192 },
            { x: 237.4592833876222, y: 316.02605863192184 },
            { x: 236.28664495114012, y: 317.19869706840393 },
            { x: 235.70032573289907, y: 318.07817589576547 },
            { x: 235.40716612377855, y: 318.371335504886 },
            { x: 235.11400651465803, y: 318.371335504886 },
          ],
        },
      ],
    },
  ]);

const seedReplayBook = (team) =>
  ReplayBookObject.create([
    {
      team_id: team._id.toString(),
      team_name: team.name,
      name: 'Default : G2 - GenG First Stand',
      link: 'https://www.youtube.com/watch?v=yLPrAg8fb9Q',
      notes: [
        { title: 'Game 2 - Lvl 1 Pression Botlane G2', description: 'Varus / Brum vs Sivir Alister\nPlaystyle lvl 1', timing: 5604 },
        { title: 'Game 3 - Setup Soul drake', description: 'Push mid deep, look for catch', timing: 9922 },
        { title: 'Game 3 - Team fight Nash', description: 'Add a description of what you want to focus on during the timer.', timing: 4265 },
      ],
    },
    {
      team_id: team._id.toString(),
      team_name: team.name,
      name: 'Default : POV my adc scrim',
      link: 'https://www.youtube.com/watch?v=xCQelrIHoBA',
      notes: [
        { title: 'Bad Trade', description: '', timing: 234 },
        { title: 'Cancel AA', description: '', timing: 337 },
      ],
    },
  ]);

const seedScrimObjectifs = (team, ids) =>
  ScrimObjectifObject.create([
    {
      team_id: team._id.toString(),
      team_name: team.name,
      name: 'Default : Setup Drake',
      description: 'Quality of dragon setups (vision, timers, rotations)',
      rating_type: 'rating',
      player: [],
    },
    {
      team_id: team._id.toString(),
      team_name: team.name,
      name: 'Default : Setup Nash',
      description: 'Quality of Baron Nashor setups (vision, timers, rotations)',
      rating_type: 'rating',
      player: [],
      strat_map_id: ids.nashStratMap.toString(),
      strat_map_name: 'Setup Nash',
    },
    {
      team_id: team._id.toString(),
      team_name: team.name,
      name: 'Default : Tracking jungle',
      description: 'Tracking enemy jungler and communicating his position',
      rating_type: 'rating',
      player: [],
    },
  ]);

const seedDraftScenarios = async (team) => {
  const defaults = [
    {
      name: 'Default : B1 Yunara',
      blueBans: [],
      redBans: [],
      bluePicks: ['Yunara', null, null, null, null],
      redPicks: ['Ryze', 'Aphelios', null, null, null],
    },
    {
      name: 'Default : B1 Ryze',
      blueBans: ['Azir', null, null, null, null],
      redBans: [],
      bluePicks: ['Ryze', 'Corki', 'Nami', null, null],
      redPicks: ['Yunara', 'Anivia', null, null, null],
    },
  ];
  for (const scenario of defaults) {
    const draft = await DraftObject.create({ team_id: team._id.toString(), team_name: team.name, name: scenario.name });
    await DraftScenarioObject.create({ ...scenario, name: 'Plan A', team_id: team._id.toString(), team_name: team.name, draft_id: draft._id.toString() });
  }
};

const seedTeamDefaults = async (team) => {
  const ids = { nashStratMap: new mongoose.Types.ObjectId() };
  await Promise.all([seedStratMaps(team, ids), seedReplayBook(team), seedScrimObjectifs(team, ids), seedDraftScenarios(team)]);
};

module.exports = { seedTeamDefaults, seedStratMaps, seedReplayBook, seedScrimObjectifs, seedDraftScenarios };
