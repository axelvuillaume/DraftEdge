const mongoose = require("mongoose");
const { MONGODB_ENDPOINT } = require("../src/config.js");
const League = require("../src/models/league.js");
const TeamLeague = require("../src/models/team-league.js");
const Player = require("../src/models/player.js");
const { getPuuidByRiotId, getRankByPuuid } = require("../src/services/riotgames.js");

const REGION = "euw1";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const LEAGUE_NAME = "Prime League Division 3";
const LEAGUE_REGION = "EUW";
const LEAGUE_TIER = "Division 3";

const TEAMS = [
  // ============ Group 3.1 ============
  { group: "3.1", name: "Defiance eSports", multi_opgg: "https://op.gg/fr/lol/multisearch/euw?summoners=Aanng%23HSV%2CADC+IS+FRONTLINE%23SVW%2CMarcy%23FROG%2CFiZZi%23245%2Cleo%23xdd" },
  { group: "3.1", name: "Esport Factory x MentalRush", multi_opgg: "https://op.gg/fr/lol/multisearch/euw?summoners=Zeniv%23heart%2CKarina%23Real%2CSha%2391811%2CBOMBA+Miella%23meow%2CMRS+Sahrii%23241" },
  { group: "3.1", name: "AceGaming Hearts", multi_opgg: "https://op.gg/fr/lol/multisearch/euw?summoners=FreakySchnigIRL%23Pig%2CDrizzle%23ADCY%2CLychee%23HVN%2CSylveon%23Lotus%2CBeani%23ACE" },
  { group: "3.1", name: "No Need Orga", multi_opgg: "https://op.gg/fr/lol/multisearch/euw?summoners=Augenringe%23EUW%2CObsess%232308%2CDon+Noway%23EUW%2CBroeki%23EUW%2CKarni%23Ionia" },
  { group: "3.1", name: "Whalepower Humpbacks", multi_opgg: "https://op.gg/fr/lol/multisearch/euw?summoners=terrorsmurfje123%23EUW%2Ciceeye%23eci%2CWP+PoG%23EUW%2CNiemand%23STRBN%2CWP+GvNonFire%23EUW" },
  { group: "3.1", name: "Packmiko E-Sports", multi_opgg: "https://op.gg/fr/lol/multisearch/euw?summoners=Kas%C3%A2p%23EUW%2CPMK+KmL%230000%2CPMK+Will%23PMK%2Cthanks+im+turk%23proud%2Cpeanut%23LEC" },
  { group: "3.1", name: "300 White", multi_opgg: "" },

  // ============ Group 3.2 ============
  { group: "3.2", name: "Berlin 5", multi_opgg: "https://op.gg/fr/lol/multisearch/euw?summoners=B5+stgs%23WOW%2CJoshi%23Sin%2CYami%23TINKA%2CCherkess%23Alure%2Ckolopak%23322" },
  { group: "3.2", name: "AceGaming FullHouse", multi_opgg: "https://op.gg/fr/lol/multisearch/euw?summoners=MeepHunter%231337%2C+eye%23qy54%2C+SprInta%23Tetsu%2C+Man%CF%85el%23EUW%2C+Faded%23Godly" },
  { group: "3.2", name: "Second Time Alive", multi_opgg: "https://op.gg/fr/lol/multisearch/euw?summoners=Bester+Mann+Miks%23EUW%2CKlatzenklopper%23EUW%2CBerryB%23BOSS%2C2TA+L%C3%ADm%C3%ADtTester%232TA%2CPluffuff%23EUW" },
  { group: "3.2", name: "Neko Elite", multi_opgg: "" },
  { group: "3.2", name: "Babos Gaming Academy", multi_opgg: "https://op.gg/fr/lol/multisearch/euw?summoners=ManaZ%23EUWE%2CSoren%23RS457%2CKoni%23Liebe%2CIvanDragovic%232002%2Cichdeutsch%23161" },
  { group: "3.2", name: "Sissi State Punk", multi_opgg: "https://op.gg/fr/lol/multisearch/euw?summoners=Soap%23SSP%2C%C2%BA%C2%BA%C2%BA+Ranger+%C2%BA%C2%BA%C2%BA%23EUW%2CSealed%23GOAT" },
  { group: "3.2", name: "ATRUVIA Münster Esports", multi_opgg: "https://op.gg/fr/lol/multisearch/euw?summoners=Michael+Jukeson%23VODIN%2CSenor%23GMNG%2CShui+Ta%23TXY1%2CTherandom%238799%2CDucksInTheSea%23DK1" },
  { group: "3.2", name: "TeamBash", multi_opgg: "https://op.gg/fr/lol/multisearch/euw?summoners=Boppa%23Big%2CFrozenKing%23Astra%2Cabysrising%23EUW%2CSantiago+Carlos%23SANTI%2CeBay+Ben%23eBay" },

  // ============ Group 3.3 ============
  { group: "3.3", name: "300 Black", multi_opgg: "https://op.gg/fr/lol/multisearch/euw?summoners=Tayto%23TOP%2Cpauleman007%23JGL%2CCorvus%23DQ9%2CAgeile%23EUW%2CVeyytix%23EUW" },
  { group: "3.3", name: "Kanji Kin", multi_opgg: "https://op.gg/fr/lol/multisearch/euw?summoners=NeptuneX%23EUW%2Cclomnxx%23wipe%2CSunam%230000%2C%E3%82%A8%E3%82%B4%E3%82%A4%E3%82%B9%E3%83%88%231210%2CHeaders+Kitten%23Cyrcl" },
  { group: "3.3", name: "Eintracht Spandau II", multi_opgg: "https://op.gg/fr/lol/multisearch/euw?summoners=Siegbert+Schn%C3%B6sl%23REICH%2CV9+Autophil%23EUW%2CV9+Bladeshow%23EUW%2CReval%23EUW%2CPhilly+Westside%23MEGA" },
  { group: "3.3", name: "Black Lion", multi_opgg: "https://op.gg/fr/lol/multisearch/euw?summoners=M6msu%23EESTI%2CSundax%23111%2CBL+Seelachs%232107%2CSintemon%23Zimt%2CTobbaTaco%23EUW" },
  { group: "3.3", name: "Neko Elite Kittens", multi_opgg: "https://op.gg/fr/lol/multisearch/euw?summoners=Agnes+Tachyon%23Wife%2Cich+hab+gekackt%23bbma%2CRaki%23JPG%2CZyon%23Rolli%2CAva+Max+Genie%C3%9Fer%23666" },
  { group: "3.3", name: "MT1 Vision", multi_opgg: "https://op.gg/fr/lol/multisearch/euw?summoners=Fields+of+Verdun%237734%2CBitse%23TTV%2C%C4%90ishonored%23PSZ%2CMT1+Sh0ckZzi%23YaYet%2CMT1+Kid%231738" },
  { group: "3.3", name: "AIX eSports", multi_opgg: "https://op.gg/fr/lol/multisearch/euw?summoners=GentlemanHero%231337%2Cstrikerthebest%23EUW%2CPentago%231229%2CTrippleJ%23309%2CShinyQB%23035" },

  // ============ Group 3.4 ============
  { group: "3.4", name: "VfB x Engines Stuttgart", multi_opgg: "https://op.gg/fr/lol/multisearch/euw?summoners=RobRal%235531%2CM+N+M%23CRAZY%2CHenga%234000%2Cgrail%23000%2CH3ad%23EUW" },
  { group: "3.4", name: "AceGaming Wildcard", multi_opgg: "https://op.gg/fr/lol/multisearch/euw?summoners=Chopcup%23BABO%2CIWTGankYou%23999%2CzAgOn%23EUW%2CBaker+Behner%23EUW%2CTheboman%23uwu" },
  { group: "3.4", name: "Glacial Guardians", multi_opgg: "https://op.gg/fr/lol/multisearch/euw?summoners=Pl%CE%B1nk%23Plank%2COpossos%23%E4%BE%98+%E5%AF%82%2CGinz%23WRLD%2CLegende+Matti%23EUW%2CElement+Empress%23ADO" },
  { group: "3.4", name: "ECF Main", multi_opgg: "https://op.gg/fr/lol/multisearch/euw?summoners=ECF+SeiKeinGnar%23ECF%2C+ECF+Simi%23Ent%2C+ECF+Bubi%23ECF%2C+ECF+Nelaf%23ECF%2C+ECF+Hosoma%23ECF" },
  { group: "3.4", name: "404 Multigaming e.V.", multi_opgg: "https://op.gg/fr/lol/multisearch/euw?summoners=404+WNTR%23j0b%2CRaydio+1%23Ray%2C404+Sunatchi%23MID%2C404+Peters%C3%A9n%23Adc%2C404+und+Findus%23SIGGI" },
  { group: "3.4", name: "BS Effortless", multi_opgg: "" },
  { group: "3.4", name: "Locked Int", multi_opgg: "https://op.gg/fr/lol/multisearch/euw?summoners=Zharp%23EUW%2CArmenian+Sugar%23SOAD%2CTrailblazer%23005%2Crnxx%234000%2CMoon+Pressence%23BLDBN" },
  { group: "3.4", name: "Kanji AKA", multi_opgg: "https://op.gg/fr/lol/multisearch/euw?summoners=Weres%23%C5%81eres%2C+Gimkooo%23jgl%2C+Pucki%23MID%2C+Lowfire125%23EUW%2C+i+want+to+win%230304" },
];

function parsePlayersFromUrl(url) {
  if (!url) return [];
  const match = url.match(/summoners=([^&]+)/);
  if (!match) return [];
  return match[1]
    .split("%2C")
    .map((s) => {
      const decoded = decodeURIComponent(s.replace(/\+/g, " ")).trim();
      if (!decoded.includes("#")) return null;
      const [gameName, tagLine] = decoded.split("#");
      if (!gameName || !tagLine) return null;
      return { name: gameName.trim(), riot_id: `${gameName.trim()}#${tagLine.trim()}` };
    })
    .filter(Boolean);
}

async function main() {
  await mongoose.connect(MONGODB_ENDPOINT);
  console.log("MongoDB Connected\n");

  let league = await League.findOne({ name: LEAGUE_NAME });
  if (league) console.log(`League exists: ${league.name} (${league._id})`);
  if (!league) {
    league = await League.create({ name: LEAGUE_NAME, region: LEAGUE_REGION, tier: LEAGUE_TIER, has_points: false });
    console.log(`Created league: ${league.name} (${league._id})`);
  }

  let teamsCreated = 0;
  let teamsSkipped = 0;
  let playersCreated = 0;
  let playersSkipped = 0;

  for (const t of TEAMS) {
    let teamLeague = await TeamLeague.findOne({ name: t.name, league_id: league._id.toString() });
    if (teamLeague) {
      console.log(`\n[${t.group}] ${t.name} — exists, checking players`);
      teamsSkipped++;
    }
    if (!teamLeague) {
      const parsed = parsePlayersFromUrl(t.multi_opgg);
      teamLeague = await TeamLeague.create({
        name: t.name,
        group: t.group,
        league_id: league._id.toString(),
        league_name: league.name,
        multi_opgg: t.multi_opgg || "",
        players: parsed,
      });
      console.log(`\n[${t.group}] ${t.name} — created with ${parsed.length} players`);
      teamsCreated++;
    }

    for (const p of teamLeague.players || []) {
      const riotId = p.riot_id;
      if (!riotId || !riotId.includes("#")) {
        console.log(`  Skip invalid riot id: ${riotId}`);
        playersSkipped++;
        continue;
      }

      const [gameName, tagLine] = riotId.split("#");

      const existing = await Player.findOne({ riot_id: riotId, team_league_id: teamLeague._id.toString(), is_league: true });
      if (existing) {
        console.log(`  Skip (player exists): ${riotId}`);
        playersSkipped++;
        continue;
      }

      console.log(`  Fetching PUUID for ${riotId}...`);
      const puuid = await getPuuidByRiotId(gameName, tagLine, REGION);
      await sleep(120);

      const doc = {
        player_name: p.name || gameName,
        riot_id: riotId,
        game_name: gameName,
        tag_line: tagLine,
        region: REGION,
        is_league: true,
        league_id: teamLeague.league_id,
        league_name: teamLeague.league_name,
        team_league_id: teamLeague._id.toString(),
        team_league_name: teamLeague.name,
        connected_at: new Date(),
      };

      if (!puuid) {
        await Player.create(doc);
        console.log(`  -> Created (no puuid): ${riotId}`);
        playersCreated++;
        continue;
      }

      doc.puuid = puuid;
      const rank = await getRankByPuuid(puuid, REGION);
      await sleep(120);

      if (rank) {
        doc.current_tier = rank.tier || null;
        doc.current_rank = rank.rank || null;
        doc.current_lp = rank.leaguePoints || null;
        doc.current_wins = rank.wins || 0;
        doc.current_losses = rank.losses || 0;
        doc.last_fetched_at = new Date();
      }

      await Player.create(doc);
      console.log(`  -> Created: ${riotId} (${rank?.tier || "unranked"} ${rank?.rank || ""} ${rank?.leaguePoints ?? ""}LP)`);
      playersCreated++;
    }
  }

  console.log(`\n=== Updating team-league total_lp ===`);
  const MASTER_TIERS = ["MASTER", "GRANDMASTER", "CHALLENGER"];
  const allTeams = await TeamLeague.find({ league_id: league._id.toString() });
  for (const tl of allTeams) {
    const masters = await Player.find({ team_league_id: tl._id.toString(), is_league: true, active: true, current_tier: { $in: MASTER_TIERS } });
    const totalLp = masters.sort((a, b) => (b.current_lp || 0) - (a.current_lp || 0)).slice(0, 5).reduce((sum, p) => sum + (p.current_lp || 0), 0);
    await TeamLeague.findByIdAndUpdate(tl._id, { total_lp: totalLp });
    console.log(`  [${tl.group}] ${tl.name}: ${totalLp} LP (${masters.length} master+ players)`);
  }

  console.log(`\nDone!`);
  console.log(`  Teams  — created: ${teamsCreated}, skipped: ${teamsSkipped}, total: ${TEAMS.length}`);
  console.log(`  Players — created: ${playersCreated}, skipped: ${playersSkipped}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
