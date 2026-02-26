const mongoose = require('mongoose');

const MODELNAME = 'pro-game-playerstats';

const Schema = new mongoose.Schema(
  {
    pro_game_id: { type: String, required: true },

    // Game identifiers
    gameid: { type: String },
    datacompleteness: { type: String },
    url: { type: String },
    league: { type: String },
    year: { type: Number },
    split: { type: String },
    playoffs: { type: Number },
    date: { type: String },
    game: { type: Number },
    patch: { type: String },
    participantid: { type: Number },
    side: { type: String },
    position: { type: String },

    // Player/Team info
    playername: { type: String },
    playerid: { type: String },
    teamname: { type: String },
    teamid: { type: String },

    // Player champion
    champion: { type: String },

    // Game info
    gamelength: { type: Number },
    result: { type: Number },

    // KDA
    kills: { type: Number },
    deaths: { type: Number },
    assists: { type: Number },
    teamkills: { type: Number },
    teamdeaths: { type: Number },
    doublekills: { type: Number },
    triplekills: { type: Number },
    quadrakills: { type: Number },
    pentakills: { type: Number },

    // First blood
    firstblood: { type: Number },
    firstbloodkill: { type: Number },
    firstbloodassist: { type: Number },
    firstbloodvictim: { type: Number },

    // Team KPM
    team_kpm: { type: Number },
    ckpm: { type: Number },

    // Dragons
    firstdragon: { type: Number },
    dragons: { type: Number },
    opp_dragons: { type: Number },
    elementaldrakes: { type: Number },
    opp_elementaldrakes: { type: Number },
    infernals: { type: Number },
    mountains: { type: Number },
    clouds: { type: Number },
    oceans: { type: Number },
    chemtechs: { type: Number },
    hextechs: { type: Number },
    dragons_type_unknown: { type: Number },
    elders: { type: Number },
    opp_elders: { type: Number },

    // Heralds
    firstherald: { type: Number },
    heralds: { type: Number },
    opp_heralds: { type: Number },

    // Void grubs
    void_grubs: { type: Number },
    opp_void_grubs: { type: Number },

    // Barons
    firstbaron: { type: Number },
    barons: { type: Number },
    opp_barons: { type: Number },

    // Atakhans
    atakhans: { type: Number },
    opp_atakhans: { type: Number },

    // Towers
    firsttower: { type: Number },
    towers: { type: Number },
    opp_towers: { type: Number },
    firstmidtower: { type: Number },
    firsttothreetowers: { type: Number },
    turretplates: { type: Number },
    opp_turretplates: { type: Number },

    // Inhibitors
    inhibitors: { type: Number },
    opp_inhibitors: { type: Number },

    // Damage
    damagetochampions: { type: Number },
    dpm: { type: Number },
    damageshare: { type: Number },
    damagetakenpermin: { type: Number },
    damagemitigatedpermin: { type: Number },
    damagetotowers: { type: Number },

    // Vision
    wardsplaced: { type: Number },
    wpm: { type: Number },
    wardskilled: { type: Number },
    wcpm: { type: Number },
    controlwardsbought: { type: Number },
    visionscore: { type: Number },
    vspm: { type: Number },

    // Gold
    totalgold: { type: Number },
    earnedgold: { type: Number },
    earned_gpm: { type: Number },
    earnedgoldshare: { type: Number },
    goldspent: { type: Number },
    gspd: { type: Number },
    gpr: { type: Number },

    // CS
    total_cs: { type: Number },
    minionkills: { type: Number },
    monsterkills: { type: Number },
    monsterkillsownjungle: { type: Number },
    monsterkillsenemyjungle: { type: Number },
    cspm: { type: Number },

    // Stats at 10
    goldat10: { type: Number },
    xpat10: { type: Number },
    csat10: { type: Number },
    opp_goldat10: { type: Number },
    opp_xpat10: { type: Number },
    opp_csat10: { type: Number },
    golddiffat10: { type: Number },
    xpdiffat10: { type: Number },
    csdiffat10: { type: Number },
    killsat10: { type: Number },
    assistsat10: { type: Number },
    deathsat10: { type: Number },
    opp_killsat10: { type: Number },
    opp_assistsat10: { type: Number },
    opp_deathsat10: { type: Number },

    // Stats at 15
    goldat15: { type: Number },
    xpat15: { type: Number },
    csat15: { type: Number },
    opp_goldat15: { type: Number },
    opp_xpat15: { type: Number },
    opp_csat15: { type: Number },
    golddiffat15: { type: Number },
    xpdiffat15: { type: Number },
    csdiffat15: { type: Number },
    killsat15: { type: Number },
    assistsat15: { type: Number },
    deathsat15: { type: Number },
    opp_killsat15: { type: Number },
    opp_assistsat15: { type: Number },
    opp_deathsat15: { type: Number },

    // Stats at 20
    goldat20: { type: Number },
    xpat20: { type: Number },
    csat20: { type: Number },
    opp_goldat20: { type: Number },
    opp_xpat20: { type: Number },
    opp_csat20: { type: Number },
    golddiffat20: { type: Number },
    xpdiffat20: { type: Number },
    csdiffat20: { type: Number },
    killsat20: { type: Number },
    assistsat20: { type: Number },
    deathsat20: { type: Number },
    opp_killsat20: { type: Number },
    opp_assistsat20: { type: Number },
    opp_deathsat20: { type: Number },

    // Stats at 25
    goldat25: { type: Number },
    xpat25: { type: Number },
    csat25: { type: Number },
    opp_goldat25: { type: Number },
    opp_xpat25: { type: Number },
    opp_csat25: { type: Number },
    golddiffat25: { type: Number },
    xpdiffat25: { type: Number },
    csdiffat25: { type: Number },
    killsat25: { type: Number },
    assistsat25: { type: Number },
    deathsat25: { type: Number },
    opp_killsat25: { type: Number },
    opp_assistsat25: { type: Number },
    opp_deathsat25: { type: Number },
  },
  { timestamps: true },
);

const Model = mongoose.model(MODELNAME, Schema);
module.exports = Model;
