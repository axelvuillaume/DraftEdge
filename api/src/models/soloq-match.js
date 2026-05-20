const mongoose = require('mongoose');

const MODELNAME = 'soloq-match';

const Schema = new mongoose.Schema(
  {
    // ==================== METADATA (MetadataDto) ====================
    matchId: { type: String, trim: true }, // ex: EUW1_7654321
    dataVersion: { type: String, trim: true },

    // ==================== INFO (InfoDto) ====================
    endOfGameResult: { type: String, trim: true },
    gameCreation: { type: Number }, // epoch ms
    gameDuration: { type: Number }, // secondes (post patch 11.20)
    gameEndTimestamp: { type: Number }, // epoch ms
    gameStartTimestamp: { type: Number }, // epoch ms
    gameDate: { type: Date }, // déduit de gameStartTimestamp (custom DraftEdge)
    gameId: { type: Number },
    gameMode: { type: String, trim: true }, // CLASSIC
    gameName: { type: String, trim: true },
    gameType: { type: String, trim: true }, // MATCHED_GAME
    gameVersion: { type: String, trim: true }, // patch ex: 14.10.614.4526
    mapId: { type: Number }, // 11 = Summoner's Rift
    platformId: { type: String, trim: true }, // EUW1
    queueId: { type: Number }, // 420 = SoloQ, 440 = Flex, 3130 = Tournament Draft
    tournamentCode: { type: String, trim: true }, // rempli pour les games tournament code

    // ==================== CUSTOM DRAFTEDGE ====================
    player_id: { type: String, trim: true }, // ref vers Player._id
    player_name: { type: String, trim: true },
    team_id: { type: String, trim: true }, // ref vers Team._id
    team_name: { type: String, trim: true },
    side: { type: String, enum: ['blue', 'red'] }, // déduit de teamId (100=blue, 200=red)

    // ==================== PLAYER IDENTITY (ParticipantDto) ====================
    puuid: { type: String, trim: true },
    summonerId: { type: String, trim: true },
    summonerName: { type: String, trim: true },
    riotIdGameName: { type: String, trim: true },
    riotIdTagline: { type: String, trim: true },
    summonerLevel: { type: Number },
    profileIcon: { type: Number },
    participantId: { type: Number },

    // ==================== TEAM & ROLE ====================
    teamId: { type: Number }, // 100 = blue, 200 = red
    teamPosition: { type: String, trim: true }, // recommandé par Riot
    individualPosition: { type: String, trim: true },
    role: { type: String, trim: true },
    lane: { type: String, trim: true },

    // ==================== CHAMPION ====================
    championName: { type: String, trim: true },
    championId: { type: Number },
    championTransform: { type: Number }, // Kayn: 0=None, 1=Slayer, 2=Assassin

    // Lane opponent (déduit des participants à l'ingestion)
    opponentChampion: { type: String, trim: true },
    opponentChampionId: { type: Number },
    opponentPuuid: { type: String, trim: true },

    // ==================== RESULT ====================
    win: { type: Boolean },
    gameEndedInSurrender: { type: Boolean },
    gameEndedInEarlySurrender: { type: Boolean },
    teamEarlySurrendered: { type: Boolean },

    // ==================== BASIC STATS ====================
    kills: { type: Number, default: 0 },
    deaths: { type: Number, default: 0 },
    assists: { type: Number, default: 0 },
    champLevel: { type: Number },
    champExperience: { type: Number },
    bountyLevel: { type: Number },

    // ==================== GOLD ====================
    goldEarned: { type: Number, default: 0 },
    goldSpent: { type: Number, default: 0 },

    // ==================== CS & FARM ====================
    totalMinionsKilled: { type: Number, default: 0 },
    neutralMinionsKilled: { type: Number, default: 0 },
    totalAllyJungleMinionsKilled: { type: Number, default: 0 },
    totalEnemyJungleMinionsKilled: { type: Number, default: 0 },

    // ==================== MULTI-KILLS ====================
    doubleKills: { type: Number, default: 0 },
    tripleKills: { type: Number, default: 0 },
    quadraKills: { type: Number, default: 0 },
    pentaKills: { type: Number, default: 0 },
    unrealKills: { type: Number, default: 0 },

    // ==================== COMBAT ====================
    killingSprees: { type: Number, default: 0 },
    largestKillingSpree: { type: Number, default: 0 },
    largestMultiKill: { type: Number, default: 0 },
    largestCriticalStrike: { type: Number, default: 0 },
    timeCCingOthers: { type: Number, default: 0 },
    totalTimeCCDealt: { type: Number, default: 0 },
    longestTimeSpentLiving: { type: Number, default: 0 },

    // ==================== FIRST BLOOD / FIRST TOWER ====================
    firstBloodKill: { type: Boolean },
    firstBloodAssist: { type: Boolean },
    firstTowerKill: { type: Boolean },
    firstTowerAssist: { type: Boolean },

    // ==================== DAMAGE DEALT ====================
    totalDamageDealt: { type: Number, default: 0 },
    totalDamageDealtToChampions: { type: Number, default: 0 },
    physicalDamageDealt: { type: Number, default: 0 },
    physicalDamageDealtToChampions: { type: Number, default: 0 },
    magicDamageDealt: { type: Number, default: 0 },
    magicDamageDealtToChampions: { type: Number, default: 0 },
    trueDamageDealt: { type: Number, default: 0 },
    trueDamageDealtToChampions: { type: Number, default: 0 },
    damageDealtToTurrets: { type: Number, default: 0 },
    damageDealtToBuildings: { type: Number, default: 0 },
    damageDealtToObjectives: { type: Number, default: 0 },

    // ==================== DAMAGE TAKEN ====================
    totalDamageTaken: { type: Number, default: 0 },
    physicalDamageTaken: { type: Number, default: 0 },
    magicDamageTaken: { type: Number, default: 0 },
    trueDamageTaken: { type: Number, default: 0 },
    damageSelfMitigated: { type: Number, default: 0 },

    // ==================== HEALING & SHIELDING ====================
    totalHeal: { type: Number, default: 0 },
    totalHealsOnTeammates: { type: Number, default: 0 },
    totalUnitsHealed: { type: Number, default: 0 },
    totalDamageShieldedOnTeammates: { type: Number, default: 0 },

    // ==================== VISION ====================
    visionScore: { type: Number, default: 0 },
    wardsPlaced: { type: Number, default: 0 },
    wardsKilled: { type: Number, default: 0 },
    detectorWardsPlaced: { type: Number, default: 0 },
    visionWardsBoughtInGame: { type: Number, default: 0 },
    sightWardsBoughtInGame: { type: Number, default: 0 },

    // ==================== OBJECTIVES ====================
    turretKills: { type: Number, default: 0 },
    turretTakedowns: { type: Number, default: 0 },
    turretsLost: { type: Number, default: 0 },
    inhibitorKills: { type: Number, default: 0 },
    inhibitorTakedowns: { type: Number, default: 0 },
    inhibitorsLost: { type: Number, default: 0 },
    dragonKills: { type: Number, default: 0 },
    baronKills: { type: Number, default: 0 },
    nexusKills: { type: Number, default: 0 },
    nexusTakedowns: { type: Number, default: 0 },
    nexusLost: { type: Number, default: 0 },
    objectivesStolen: { type: Number, default: 0 },
    objectivesStolenAssists: { type: Number, default: 0 },

    // ==================== ITEMS ====================
    item0: { type: Number },
    item1: { type: Number },
    item2: { type: Number },
    item3: { type: Number },
    item4: { type: Number },
    item5: { type: Number },
    item6: { type: Number },
    itemsPurchased: { type: Number, default: 0 },
    consumablesPurchased: { type: Number, default: 0 },

    // ==================== PERKS (PerksDto) ====================
    perks: {
      statPerks: {
        defense: { type: Number },
        flex: { type: Number },
        offense: { type: Number },
      },
      styles: [
        {
          description: { type: String, trim: true }, // "primaryStyle" ou "subStyle"
          style: { type: Number },
          selections: [
            {
              perk: { type: Number },
              var1: { type: Number },
              var2: { type: Number },
              var3: { type: Number },
            },
          ],
        },
      ],
    },

    // ==================== SUMMONER SPELLS ====================
    summoner1Id: { type: Number },
    summoner1Casts: { type: Number, default: 0 },
    summoner2Id: { type: Number },
    summoner2Casts: { type: Number, default: 0 },

    // ==================== SPELL CASTS ====================
    spell1Casts: { type: Number, default: 0 }, // Q
    spell2Casts: { type: Number, default: 0 }, // W
    spell3Casts: { type: Number, default: 0 }, // E
    spell4Casts: { type: Number, default: 0 }, // R

    // ==================== TIME ====================
    timePlayed: { type: Number, default: 0 },
    totalTimeSpentDead: { type: Number, default: 0 },

    // ==================== PINGS ====================
    allInPings: { type: Number, default: 0 },
    assistMePings: { type: Number, default: 0 },
    commandPings: { type: Number, default: 0 },
    dangerPings: { type: Number, default: 0 },
    enemyMissingPings: { type: Number, default: 0 },
    enemyVisionPings: { type: Number, default: 0 },
    getBackPings: { type: Number, default: 0 },
    holdPings: { type: Number, default: 0 },
    needVisionPings: { type: Number, default: 0 },
    onMyWayPings: { type: Number, default: 0 },
    pushPings: { type: Number, default: 0 },
    visionClearedPings: { type: Number, default: 0 },

    // ==================== CHALLENGES (ChallengesDto) ====================
    challenges: {
      '12AssistStreakCount': { type: Number },
      abilityUses: { type: Number },
      acesBefore15Minutes: { type: Number },
      alliedJungleMonsterKills: { type: Number },
      baronBuffGoldAdvantageOverThreshold: { type: Number },
      baronTakedowns: { type: Number },
      blastConeOppositeOpponentCount: { type: Number },
      bountyGold: { type: Number },
      buffsStolen: { type: Number },
      completeSupportQuestInTime: { type: Number },
      controlWardTimeCoverageInRiverOrEnemyHalf: { type: Number },
      controlWardsPlaced: { type: Number },
      damagePerMinute: { type: Number },
      damageTakenOnTeamPercentage: { type: Number },
      dancedWithRiftHerald: { type: Number },
      deathsByEnemyChamps: { type: Number },
      dodgeSkillShotsSmallWindow: { type: Number },
      doubleAces: { type: Number },
      dragonTakedowns: { type: Number },
      earliestBaron: { type: Number },
      earliestDragonTakedown: { type: Number },
      earliestElderDragon: { type: Number },
      earlyLaningPhaseGoldExpAdvantage: { type: Number },
      effectiveHealAndShielding: { type: Number },
      elderDragonKillsWithOpposingSoul: { type: Number },
      elderDragonMultikills: { type: Number },
      enemyChampionImmobilizations: { type: Number },
      enemyJungleMonsterKills: { type: Number },
      epicMonsterKillsNearEnemyJungler: { type: Number },
      epicMonsterKillsWithin30SecondsOfSpawn: { type: Number },
      epicMonsterSteals: { type: Number },
      epicMonsterStolenWithoutSmite: { type: Number },
      fasterSupportQuestCompletion: { type: Number },
      fastestLegendary: { type: Number },
      firstTurretKilled: { type: Number },
      firstTurretKilledTime: { type: Number },
      flawlessAces: { type: Number },
      fullTeamTakedown: { type: Number },
      gameLength: { type: Number },
      getTakedownsInAllLanesEarlyJungleAsLaner: { type: Number },
      goldPerMinute: { type: Number },
      hadAfkTeammate: { type: Number },
      hadOpenNexus: { type: Number },
      highestChampionDamage: { type: Number },
      highestCrowdControlScore: { type: Number },
      highestWardKills: { type: Number },
      immobilizeAndKillWithAlly: { type: Number },
      InfernalScalePickup: { type: Number },
      initialBuffCount: { type: Number },
      initialCrabCount: { type: Number },
      jungleCsBefore10Minutes: { type: Number },
      junglerKillsEarlyJungle: { type: Number },
      junglerTakedownsNearDamagedEpicMonster: { type: Number },
      kTurretsDestroyedBeforePlatesFall: { type: Number },
      kda: { type: Number },
      killAfterHiddenWithAlly: { type: Number },
      killParticipation: { type: Number },
      killedChampTookFullTeamDamageSurvived: { type: Number },
      killingSprees: { type: Number },
      killsNearEnemyTurret: { type: Number },
      killsOnLanersEarlyJungleAsJungler: { type: Number },
      killsOnOtherLanesEarlyJungleAsLaner: { type: Number },
      killsUnderOwnTurret: { type: Number },
      killsWithHelpFromEpicMonster: { type: Number },
      knockEnemyIntoTeamAndKill: { type: Number },
      landSkillShotsEarlyGame: { type: Number },
      laneMinionsFirst10Minutes: { type: Number },
      laningPhaseGoldExpAdvantage: { type: Number },
      legendaryCount: { type: Number },
      legendaryItemUsed: [{ type: Number }],
      lostAnInhibitor: { type: Number },
      maxCsAdvantageOnLaneOpponent: { type: Number },
      maxKillDeficit: { type: Number },
      maxLevelLeadLaneOpponent: { type: Number },
      mejaisFullStackInTime: { type: Number },
      moreEnemyJungleThanOpponent: { type: Number },
      mostWardsDestroyedOneSweeper: { type: Number },
      multiKillOneSpell: { type: Number },
      multiTurretRiftHeraldCount: { type: Number },
      multikills: { type: Number },
      multikillsAfterAggressiveFlash: { type: Number },
      mythicItemUsed: { type: Number },
      outerTurretExecutesBefore10Minutes: { type: Number },
      outnumberedKills: { type: Number },
      outnumberedNexusKill: { type: Number },
      perfectDragonSoulsTaken: { type: Number },
      perfectGame: { type: Number },
      pickKillWithAlly: { type: Number },
      playedChampSelectPosition: { type: Number },
      quickCleanse: { type: Number },
      quickFirstTurret: { type: Number },
      quickSoloKills: { type: Number },
      riftHeraldTakedowns: { type: Number },
      saveAllyFromDeath: { type: Number },
      scuttleCrabKills: { type: Number },
      shortestTimeToAceFromFirstTakedown: { type: Number },
      skillshotsDodged: { type: Number },
      skillshotsHit: { type: Number },
      soloBaronKills: { type: Number },
      soloKills: { type: Number },
      soloTurretsLategame: { type: Number },
      stealthWardsPlaced: { type: Number },
      survivedSingleDigitHpCount: { type: Number },
      survivedThreeImmobilizesInFight: { type: Number },
      takedownOnFirstTurret: { type: Number },
      takedowns: { type: Number },
      takedownsAfterGainingLevelAdvantage: { type: Number },
      takedownsBeforeJungleMinionSpawn: { type: Number },
      takedownsFirst25Minutes: { type: Number },
      takedownsInAlcove: { type: Number },
      takedownsInEnemyFountain: { type: Number },
      teamBaronKills: { type: Number },
      teamDamagePercentage: { type: Number },
      teamElderDragonKills: { type: Number },
      teamRiftHeraldKills: { type: Number },
      teleportTakedowns: { type: Number },
      thirdInhibitorDestroyedTime: { type: Number },
      threeWardsOneSweeperCount: { type: Number },
      tookLargeDamageSurvived: { type: Number },
      turretPlatesTaken: { type: Number },
      turretTakedowns: { type: Number },
      turretsTakenWithRiftHerald: { type: Number },
      twentyMinionsIn3SecondsCount: { type: Number },
      twoWardsOneSweeperCount: { type: Number },
      unseenRecalls: { type: Number },
      visionScoreAdvantageLaneOpponent: { type: Number },
      visionScorePerMinute: { type: Number },
      voidMonsterKill: { type: Number },
      fistBumpParticipation: { type: Number },
      wardTakedowns: { type: Number },
      wardTakedownsBefore20M: { type: Number },
      wardsGuarded: { type: Number },
    },

    // ==================== TEAM DATA (TeamDto) ====================
    teamObjectives: {
      baron: { first: { type: Boolean }, kills: { type: Number } },
      champion: { first: { type: Boolean }, kills: { type: Number } },
      dragon: { first: { type: Boolean }, kills: { type: Number } },
      horde: { first: { type: Boolean }, kills: { type: Number } },
      inhibitor: { first: { type: Boolean }, kills: { type: Number } },
      riftHerald: { first: { type: Boolean }, kills: { type: Number } },
      tower: { first: { type: Boolean }, kills: { type: Number } },
    },

    // ==================== BANS (BanDto) ====================
    teamBans: [
      {
        championId: { type: Number },
        pickTurn: { type: Number },
      },
    ],
  },
  { timestamps: true },
);

Schema.index({ player_id: 1, gameDate: -1 });
Schema.index({ team_id: 1, gameDate: -1 });
Schema.index({ puuid: 1, queueId: 1 });
Schema.index({ matchId: 1, puuid: 1 });

const OBJ = mongoose.model(MODELNAME, Schema);
module.exports = OBJ;
