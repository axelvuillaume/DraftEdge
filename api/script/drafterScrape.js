const https = require("https");

function fetchDraft(seriesId, game = 1) {
  const url = `https://drafter.lol/draft/${seriesId}?game=${game}`;

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let html = "";
      res.on("data", (chunk) => (html += chunk));
      res.on("end", () => {
        const startMarker = '\\"drafts\\":[';
        const endMarker = '],\\"fearless\\"';
        const startIdx = html.indexOf(startMarker);
        if (startIdx === -1) return reject("Données de draft introuvables dans la page");

        const arrayStart = startIdx + startMarker.length;
        const endIdx = html.indexOf(endMarker, arrayStart);
        if (endIdx === -1) return reject("Impossible de trouver la fin du tableau de drafts");

        const rawDrafts = html.substring(arrayStart, endIdx);
        const cleaned = rawDrafts.replace(/\\"/g, '"');
        const drafts = JSON.parse(`[${cleaned}]`);

        const draft = drafts[game - 1];
        if (!draft) return reject(`Game ${game} introuvable`);

        const picksOf = (d) => [d.bluePick1, d.bluePick2, d.bluePick3, d.bluePick4, d.bluePick5, d.redPick1, d.redPick2, d.redPick3, d.redPick4, d.redPick5];

        const fearlessRestricted = {};
        if (draft.fearless && game > 1) {
          const prevDrafts = drafts.slice(0, game - 1);
          const blue = draft.drafterBlue;
          const red = draft.drafterRed;
          fearlessRestricted[blue] = [];
          fearlessRestricted[red] = [];

          for (const prev of prevDrafts) {
            const prevBlue = prev.drafterBlue;
            const prevRed = prev.drafterRed;
            const bluePicks = [prev.bluePick1, prev.bluePick2, prev.bluePick3, prev.bluePick4, prev.bluePick5];
            const redPicks = [prev.redPick1, prev.redPick2, prev.redPick3, prev.redPick4, prev.redPick5];

            if (prevBlue === blue) fearlessRestricted[blue].push(...bluePicks);
            else if (prevBlue === red) fearlessRestricted[red].push(...bluePicks);

            if (prevRed === blue) fearlessRestricted[blue].push(...redPicks);
            else if (prevRed === red) fearlessRestricted[red].push(...redPicks);
          }
        }

        resolve({
          blue: draft.drafterBlue,
          red: draft.drafterRed,
          fearless: draft.fearless || false,
          blueBans: [draft.blueBan1, draft.blueBan2, draft.blueBan3, draft.blueBan4, draft.blueBan5],
          redBans: [draft.redBan1, draft.redBan2, draft.redBan3, draft.redBan4, draft.redBan5],
          bluePicks: [draft.bluePick1, draft.bluePick2, draft.bluePick3, draft.bluePick4, draft.bluePick5],
          redPicks: [draft.redPick1, draft.redPick2, draft.redPick3, draft.redPick4, draft.redPick5],
          fearlessRestricted,
        });
      });
      res.on("error", reject);
    });
  });
}

// --- Utilisation ---
const seriesId = process.argv[2] || "Kao8bRBx";
const game = parseInt(process.argv[3]) || 2;

fetchDraft(seriesId, game)
  .then((data) => {
    console.log(`\n===== GAME ${game} =====`);
    console.log(`${data.blue} (Blue) vs ${data.red} (Red)\n`);

    if (data.fearless && Object.keys(data.fearlessRestricted).length > 0) {
      console.log("--- Fearless Restricted (picks des games précédentes) ---");
      for (const [team, champs] of Object.entries(data.fearlessRestricted)) {
        console.log(`  ${team}: ${champs.join(", ")}`);
      }
      console.log();
    }

    console.log(`--- Bans ${data.blue} (Blue) ---`);
    console.log(data.blueBans.join(", "));
    console.log(`\n--- Bans ${data.red} (Red) ---`);
    console.log(data.redBans.join(", "));
    console.log(`\n--- Picks ${data.blue} (Blue) ---`);
    console.log(data.bluePicks.join(", "));
    console.log(`\n--- Picks ${data.red} (Red) ---`);
    console.log(data.redPicks.join(", "));
  })
  .catch(console.error);
