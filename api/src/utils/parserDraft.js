const https = require('https');
const WebSocket = require('ws');
const Game = require('../models/game');

function fetchFromDrafter(draftUrl) {
  const parsed = new URL(draftUrl);
  const game = parseInt(parsed.searchParams.get('game')) || 1;
  const url = draftUrl.includes('?') ? draftUrl : `${draftUrl}?game=1`;

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let html = '';
      res.on('data', (chunk) => (html += chunk));
      res.on('end', () => {
        const startMarker = '\\"drafts\\":[';
        const endMarker = '],\\"fearless\\"';
        const startIdx = html.indexOf(startMarker);
        if (startIdx === -1) return reject('Données de draft introuvables dans la page');

        const arrayStart = startIdx + startMarker.length;
        const endIdx = html.indexOf(endMarker, arrayStart);
        if (endIdx === -1) return reject('Impossible de trouver la fin du tableau de drafts');

        const rawDrafts = html.substring(arrayStart, endIdx);
        const cleaned = rawDrafts.replace(/\\"/g, '"');
        const drafts = JSON.parse(`[${cleaned}]`);

        const draft = drafts[game - 1];
        if (!draft) return reject(`Game ${game} introuvable`);

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
          source: 'drafter',
          fearless: draft.fearless || false,
          blueBans: [draft.blueBan1, draft.blueBan2, draft.blueBan3, draft.blueBan4, draft.blueBan5],
          redBans: [draft.redBan1, draft.redBan2, draft.redBan3, draft.redBan4, draft.redBan5],
          bluePicks: [draft.bluePick1, draft.bluePick2, draft.bluePick3, draft.bluePick4, draft.bluePick5],
          redPicks: [draft.redPick1, draft.redPick2, draft.redPick3, draft.redPick4, draft.redPick5],
          fearlessRestricted,
        });
      });
      res.on('error', reject);
    });
  });
}

function fetchFromDawe(roomId) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('wss://draftlol.dawe.gg');

    const timeout = setTimeout(() => {
      ws.close();
      reject('Timeout: pas de réponse du serveur');
    }, 10000);

    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'joinroom', roomId }));
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'statechange') {
        clearTimeout(timeout);
        ws.close();
        const d = msg.newState;
        const clean = (arr) => (Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : []);

        resolve({
          source: 'dawe',
          bluePicks: clean(d.bluePicks),
          redPicks: clean(d.redPicks),
          blueBans: clean(d.blueBans),
          redBans: clean(d.redBans),
          fearless: false,
          fearlessRestricted: {
            [d.blueName]: clean(d.fearlessBlueChamps),
            [d.redName]: clean(d.fearlessRedChamps),
          },
        });
      }

      if (msg.type === 'error') {
        clearTimeout(timeout);
        ws.close();
        reject('Erreur serveur: ' + msg.reason);
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject('WebSocket error: ' + err.message);
    });
  });
}

function detectDraftSource(url) {
  if (url.includes('dawe.gg')) return 'dawe';
  if (url.includes('drafter.lol')) return 'drafter';
  return null;
}

function extractDraftId(url) {
  const parts = url.split('/').filter(Boolean);
  return parts[parts.length - 1].split('?')[0];
}

async function fetchAndSaveDraft(gameId, draftUrl) {
  const source = detectDraftSource(draftUrl);
  if (!source) throw new Error('URL not recognized. Use a drafter.lol or dawe.gg link');

  const draft = source === 'drafter' ? await fetchFromDrafter(draftUrl) : await fetchFromDawe(extractDraftId(draftUrl));

  return Game.findByIdAndUpdate(gameId, { ...draft, source_url: draftUrl }, { new: true });
}

module.exports = { fetchFromDrafter, fetchFromDawe, detectDraftSource, extractDraftId, fetchAndSaveDraft };
