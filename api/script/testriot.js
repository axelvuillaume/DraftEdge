const { getGamesByPuuid } = require("../src/services/riotgames");

const PUUID = "P_2HJd_8FvTM7F2xas5Y-aCKzksH0_vQp8Yszr4QkDUBqU6GxOr3ZxM0sJ6aOqqKwPYr-EWmm-d-Xg'";

(async () => {
  const games = await getGamesByPuuid(PUUID, 1);
  console.log(games);
})();
