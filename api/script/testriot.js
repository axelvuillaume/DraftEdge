const { getRankByPuuid } = require("../src/services/riotgames");

const PUUID = "QzrDRfNlrctoDwF7Pl1ieQcubgg-Ay4PwwqeRZQtIlwCFK3qdbTY3fJNW5jsvh8y2CnSOP_BCk0JyA";

(async () => {
  const rank = await getRankByPuuid(PUUID);
  console.log(rank);
})();
