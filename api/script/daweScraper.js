const WebSocket = require("ws");

function fetchDraft(roomId) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket("wss://draftlol.dawe.gg");

    const timeout = setTimeout(() => {
      ws.close();
      reject("Timeout: pas de réponse du serveur");
    }, 10000);

    ws.on("open", () => {
      ws.send(JSON.stringify({ type: "joinroom", roomId }));
    });

    ws.on("message", (data) => {
      const msg = JSON.parse(data.toString());

      if (msg.type === "statechange") {
        clearTimeout(timeout);
        ws.close();
        const d = msg.newState;

        const clean = (arr) => (Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : []);

        resolve({
          blue: d.blueName,
          red: d.redName,
          state: d.state,
          bluePicks: clean(d.bluePicks),
          redPicks: clean(d.redPicks),
          blueBans: clean(d.blueBans),
          redBans: clean(d.redBans),
          // Fearless bans (champions des games précédentes, interdits pour la suite)
          fearlessBlueChamps: clean(d.fearlessBlueChamps),
          fearlessRedChamps: clean(d.fearlessRedChamps),
          // Rooms précédentes (pour remonter l'historique si besoin)
          previousRooms: d.previousRooms || [],
        });
      }

      if (msg.type === "error") {
        clearTimeout(timeout);
        ws.close();
        reject("Erreur serveur: " + msg.reason);
      }
    });

    ws.on("error", (err) => {
      clearTimeout(timeout);
      reject("WebSocket error: " + err.message);
    });
  });
}

// --- Utilisation ---
const roomId = process.argv[2] || "loFNMpcH";

fetchDraft(roomId)
  .then((data) => {
    console.log(`\\n===== ${data.blue} vs ${data.red} (${data.state}) =====\\n`);

    console.log(`--- Bans ${data.blue} (Blue) ---`);
    console.log(data.blueBans.join(", ") || "(aucun)");

    console.log(`\\n--- Bans ${data.red} (Red) ---`);
    console.log(data.redBans.join(", ") || "(aucun)");

    console.log(`\\n--- Picks ${data.blue} (Blue) ---`);
    console.log(data.bluePicks.join(", ") || "(aucun)");

    console.log(`\\n--- Picks ${data.red} (Red) ---`);
    console.log(data.redPicks.join(", ") || "(aucun)");

    // Fearless Bans
    if (data.fearlessBlueChamps.length > 0 || data.fearlessRedChamps.length > 0) {
      console.log(`\\n========== FEARLESS BANS ==========`);
      console.log(`\\n--- Fearless Bans ${data.blue} (Blue) ---`);
      console.log(data.fearlessBlueChamps.join(", ") || "(aucun)");

      console.log(`\\n--- Fearless Bans ${data.red} (Red) ---`);
      console.log(data.fearlessRedChamps.join(", ") || "(aucun)");

      if (data.previousRooms.length > 0) {
        console.log(`\\n(Games précédentes: ${data.previousRooms.join(", ")})`);
      }
    } else {
      console.log("\\n(Pas de Fearless bans — Game 1 ou mode non-Fearless)");
    }
  })
  .catch(console.error);
