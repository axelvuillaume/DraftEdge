const { getMatchIdsByPuuid, getMatchById } = require("../src/services/riotgames");

const PUUID = "ctZDkNib9BzyxwODneK3aUiTkcjcqLCTfkwsIxk0oqRKTL4PtOWYBYLwzoQfvGq9d3K_wSAWXGNHhg";
const PLATFORM = "euw1";
const COUNT = 100;

(async () => {
  const ids = await getMatchIdsByPuuid(PUUID, { count: COUNT, platform: PLATFORM });
  if (!ids) return console.log("No match ids");
  console.log(`Fetched ${ids.length} match ids`);

  const summary = { byGameType: {}, byQueueId: {}, withTournamentCode: [] };

  for (const id of ids) {
    const match = await getMatchById(id, PLATFORM);
    if (!match) continue;
    const { gameType, queueId, tournamentCode } = match.info;
    summary.byGameType[gameType] = (summary.byGameType[gameType] || 0) + 1;
    summary.byQueueId[queueId] = (summary.byQueueId[queueId] || 0) + 1;
    if (tournamentCode && tournamentCode.length > 0) {
      summary.withTournamentCode.push({
        matchId: match.metadata.matchId,
        gameType,
        queueId,
        tournamentCode,
        gameCreation: new Date(match.info.gameCreation).toISOString(),
      });
    }
  }

  console.log("\n=== Breakdown ===");
  console.log("gameType:", summary.byGameType);
  console.log("queueId:", summary.byQueueId);
  console.log(`\nMatches with tournamentCode: ${summary.withTournamentCode.length}`);
  console.log(JSON.stringify(summary.withTournamentCode, null, 2));
})();
