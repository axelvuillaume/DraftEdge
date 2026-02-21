require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { RIOT_API_KEY } = require("../src/config");

// ⬇️ Mettre le puuid et la region ici
const PUUID = "582JKpbHgqaA_3BuleIUw2gTHEE_eaHShDgtrufcZmqPfUWXyibpRl-Jzx9bk0xiTwGqX8Qn_Kd_9g";
const REGION = "jp1";

(async () => {
  const url = `https://${REGION}.api.riotgames.com/lol/league/v4/entries/by-puuid/${PUUID}?api_key=${RIOT_API_KEY}`;
  console.log(`Fetching elo for puuid: ${PUUID} (${REGION})\n`);

  const res = await fetch(url);
  if (!res.ok) {
    console.error(`Error: ${res.status} ${res.statusText}`);
    return;
  }

  const data = await res.json();
  const solo = data.find((e) => e.queueType === "RANKED_SOLO_5x5");

  if (!solo) {
    console.log("No Solo/Duo rank found");
    console.log("Raw response:", JSON.stringify(data, null, 2));
    return;
  }

  const wr = solo.wins + solo.losses > 0 ? Math.round((solo.wins / (solo.wins + solo.losses)) * 100) : 0;
  console.log(`${solo.tier} ${solo.rank} ${solo.leaguePoints} LP`);
  console.log(`${solo.wins}W ${solo.losses}L (${wr}% WR)`);
  console.log(`\nRaw:`, JSON.stringify(solo, null, 2));
})();
