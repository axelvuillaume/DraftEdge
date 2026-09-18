# DraftEdge Desktop — Importer LCU

Objectif : remplacer l'upload manuel de .rofl par une petite app desktop qui lit l'historique du client League (LCU), propose les games d'un bloc de scrim, écarte les warmups et pousse tout vers DraftEdge en un clic.

## État actuel (ce sur quoi on s'appuie)

- `POST /parser/import` (api/src/controllers/parser.js) : reçoit un .rofl + team_side / opponent / session_id / date… crée `Game` + 10 `PlayerStats`, dédoublonne par `game_fingerprint`, enrichit les joueurs via l'API Riot en arrière-plan.
- Le `game_id` Riot est extrait du **nom de fichier** (`EUW1-123456789.rofl`).
- `/parser` n'a **aucune auth** (seul controller sans passport) : à corriger dans cette update.
- Le bloc de scrim = `scrim-session` ; les games pointent vers lui via `game.session_id`. Pas d'ordre explicite (tri par `createdAt`), pas de notion de warmup.
- Roster : modèle `player` (puuid, game_name, tag_line, role, team_id).

## Décision d'architecture

**Stratégie retenue pour l'import : télécharger le .rofl via le LCU, puis réutiliser `/parser/import` tel quel.**

- Le LCU expose `POST /lol-replays/v1/rofls/{gameId}/download` puis `GET /lol-replays/v1/rofls/path` pour retrouver le fichier. Zéro mapping de stats à écrire, zéro régression : la donnée est exactement celle d'aujourd'hui.
- Le LCU donne en plus, gratuitement : la liste des games (`/lol-match-history/v1/products/lol/current-summoner/matches`), la date réelle (`gameCreation`), le type (`CUSTOM_GAME`), le côté de l'utilisateur (`teamId` du current summoner → plus besoin de choisir Blue/Red), et les puuid des 10 joueurs (→ enrichissement Riot sans lookup par Riot ID).
- Limite connue : un replay n'est téléchargeable que sur le patch courant. Pour des scrims du jour c'est toujours vrai. Fallback prévu plus tard (phase 6) : mapper le JSON LCU `/lol-match-history/v1/games/{gameId}` directement.
- Bonus futur : le LCU expose la **timeline** (`/lol-match-history/v1/game-timelines/{gameId}`), que le ROFL n'a pas.

**Stack desktop : Electron + Vite + React + Tailwind**, dossier `/desktop` à la racine du monorepo. Même langage que le reste, packaging Win/Mac via electron-builder. (Alternative écartée : Tauri, plus léger mais Rust.)

**Auth desktop → API : login email/mot de passe** dans l'app (`POST /user/signin` renvoie déjà un `token`), stocké chiffré via `safeStorage` d'Electron, envoyé en `Authorization: JWT <token>`.

## Roadmap

| # | Phase | Livrable |
|---|-------|----------|
| 1 | API prête pour le desktop | Auth sur `/parser`, endpoint de dédup en masse, import qui accepte `game_id` + `date` + `puuids` venant du LCU |
| 2 | Squelette desktop | App Electron qui se connecte au LCU (lockfile), affiche le summoner courant, login DraftEdge |
| 3 | Historique + bloc | Liste des customs du client, choix (ou création) du bloc, side auto, détection warmups, marquage "déjà importé" |
| 4 | Pipeline d'import | Download .rofl via LCU → upload → progression par game → récap |
| 5 | Distribution | Build Win/Mac, auto-update, lien de téléchargement dans DraftEdge, mention dans l'UploadModal |
| 6 | Enrichissements | Timeline LCU, import auto en fin de game (gameflow), ordre de pick de la draft |

## Définition "warmup" (à valider)

Une game de l'historique est pré-décochée si l'une de ces règles matche :

1. Elle n'est pas une custom game (`gameType !== 'CUSTOM_GAME'`) → soloQ/normale entre deux scrims.
2. Durée < 12 min (remake, test de setup).
3. Moins de 4 joueurs du roster DraftEdge (puuid) parmi les 5 du côté de l'utilisateur.


Tout reste modifiable à la main avant l'envoi.

## Phase 1 — API (détail) — ✅ livrée le 18/09/2026

### 1.1 Sécuriser `/parser`
- Ajouter `passport.authenticate(['admin','user'])` sur `/parse` et `/import`.
- `team_id` / `team_name` viennent de `req.user`, plus du body (le body reste accepté pour rétro-compat mais est ignoré si différent).
- Vérifier que l'UploadModal web continue de marcher (il envoie déjà le token via `api.postFormData`).

### 1.2 `POST /parser/check` — dédup en masse
- Body : `{ game_ids: ['EUW1-123', …] }`.
- Réponse : `{ ok, data: { existing: { 'EUW1-123': { _id, session_id, session_name } } } }`.
- Sert au desktop pour griser les games déjà importées avant même de télécharger les replays.

### 1.3 Étendre `POST /parser/import`
- Nouveaux champs body optionnels : `game_id` (prioritaire sur l'extraction depuis le filename), `date` (déjà supporté, on l'utilisera avec `gameCreation`), `region` (pour `match_id` au lieu du `EUW1_` codé en dur), `puuids` (JSON `{ "Name#TAG": puuid }`).
- Si `puuids` est fourni, l'enrichissement background saute `getPuuidByRiotId` et va direct au rang.
- Nouveau champ `game.source_import: 'web' | 'desktop'` pour suivre l'adoption.
- Dédup supplémentaire par `game_id` (avant le fingerprint) quand il est fourni.
- Note : `/parser` est monté avant `bodyParser.json` dans index.js, d'où `express.json()` posé directement sur `/check`.

### 1.4 Roster
- Pas de nouvelle route : `POST /player/search { team_id }` renvoie déjà `puuid`, `game_name`, `tag_line`, `role`.

### 1.5 Vérifs
- Import web d'un .rofl inchangé.
- Import avec `game_id` fourni → `game.game_id` et `match_id` corrects.
- `/parser/check` avec un mélange d'ids connus/inconnus.
- Sans token → 401 sur `/parser/import`.

## Phase 2 — Squelette desktop — ✅ livrée le 18/09/2026 (connexion LCU réelle à tester avec le client lancé)

Points déjà cadrés :
- Découverte du LCU : lire le `lockfile` (Windows `C:\Riot Games\League of Legends\lockfile`, macOS `/Applications/League of Legends.app/Contents/LoL/lockfile`), format `name:pid:port:password:protocol`. Fallback : parser les args du process `LeagueClientUx` (`--app-port`, `--remoting-auth-token`).
- Appels HTTPS locaux avec `rejectUnauthorized: false` et Basic `riot:<password>`. Polling toutes les 3 s pour l'état connecté/déconnecté.
- Process main = accès LCU + fichiers + token ; renderer React = UI. IPC typé par canal (`lcu:status`, `lcu:matches`, `import:run`, `import:progress`).

Réalisé :
- `desktop/src/main/lcu.js` : `LcuClient` (lockfile puis fallback process, polling 3 s, `get`/`post` vers le client).
- `desktop/src/main/store.js` : config JSON dans userData, token chiffré via `safeStorage`. API par défaut : `http://localhost:8080` en dev, `https://api.draftedge.lol` packagé.
- `desktop/src/main/api.js` : client DraftEdge (`JWT <token>`), `login` / `me` (renouvelle le token via `/user/signin_token`) / `logout`.
- `desktop/src/preload/index.js` : `window.draftedge.{auth,settings,lcu,api}`.
- Renderer : `Login` (avec réglage de l'URL API), `Home` (statut client + summoner), `TitleBar`.
- Reste pour la phase 3 : l'écran d'historique remplace le placeholder de `Home`.

## Phase 3 — Historique + bloc — ✅ livrée le 18/09/2026 (à tester avec le client lancé)

- `desktop/src/main/history.js` : liste `/lol-match-history/v1/products/lol/current-summoner/matches` (60 dernières), détail 10 joueurs via `/lol-match-history/v1/games/{id}` pour les customs seulement (max 40), champions via `/lol-game-data/assets/v1/champion-summary.json`. Normalisation : `riotGameId = PLATFORM-gameId` (même format que les noms de .rofl), `mySide` depuis le teamId du summoner courant, `region` depuis `platformId`.
- `desktop/src/renderer/src/lib/warmup.js` : règles pures et testées (non custom, < 12 min, < 4 joueurs du roster par puuid ou Nom#TAG).
- `Import.jsx` : sélecteur de bloc (`BlockPicker`, création inline avec adversaire via `/enemy-team/search`), fenêtre "jour du bloc / ± 1 jour / 7 jours", filtre customs, doublons via `POST /parser/check`, sélection par défaut = customs non importées et non warmup. Bouton Importer branché à la phase 4.
- Icônes de champions via CommunityDragon (`cdn.communitydragon.org/latest/champion/{id}/square`), autorisé par la CSP `img-src https:`.

## Phase 4 — Pipeline d'import — ✅ livrée le 18/09/2026 (téléchargement réel via le client à tester)

- `desktop/src/main/replay.js` : `ensureReplay(lcu, game)` → dossier Replays via `GET /lol-replays/v1/rofls/path`, fichier déjà présent réutilisé, sinon `POST /lol-replays/v1/rofls/{gameId}/download` puis polling de `GET /lol-replays/v1/metadata/{gameId}` jusqu'à l'état `watch` (timeout 2 min). États `incompatible` / `lost` / `missing` → erreur explicite.
- `desktop/src/main/importer.js` : classe `Importer` séquentielle, annulable. Par game : replay → `POST /parser/import` (multipart natif Node : FormData + Blob) avec `team_side` = side du summoner, `game_id`, `region`, `date` = gameCreation, `puuids`, `source_import=desktop`, `name = Game N` (N = games déjà dans le bloc + 1), bloc / adversaire / dossier. 409 → statut `duplicate`. À la fin : recalcul `win` / `loss` / `winrate` du bloc et `patch` si absent, comme la vue web.
- IPC `import:run` / `import:cancel` / événement `import:progress` ; `ImportPanel.jsx` affiche la progression par game et le récap.
- Test réalisé : importer réel + API de test locale + faux client (dossier Replays factice avec ROFL synthétique) → game créée avec les bons champs, doublon détecté au second passage, stats du bloc mises à jour, puuid posés. Données de test supprimées ensuite.
- Non testé : le téléchargement réel d'un replay via le client (états de `metadata` observés d'après la doc communautaire, à confirmer sur une vraie game).

## Phase 5 — Distribution — ✅ livrée le 18/09/2026 (première release à publier)

- `desktop/electron-builder.yml` : DMG + ZIP Mac (arm64, x64), installeur NSIS Windows (x64), artefacts `DraftEdge-<version>-<os>-<arch>`, publication sur GitHub Releases (`axelvuillaume/DraftEdge`, repo public). Builds non signés pour l'instant (`identity: null`, `signAndEditExecutable: false`).
- `desktop/src/main/updater.js` : electron-updater, check 5 s après le lancement puis toutes les heures, téléchargement auto, installation à la fermeture ou via le bandeau « Redémarrer » (`UpdateBanner.jsx`). Inactif en dev.
- `.github/workflows/desktop-release.yml` : tag `desktop-vX.Y.Z` → lint + build Mac et Windows en parallèle → assets + `latest*.yml` attachés à la release. Vérifie que le tag correspond à `desktop/package.json`. `workflow_dispatch` produit des artefacts sans publier.
- Web : menu « Download app » dans la TopBar (`app/src/components/DesktopDownloadMenu.jsx`), liens permanents définis dans `app/src/config.js` (`desktopDownloadURLs`) vers `releases/latest/download/DraftEdge-latest-{mac-arm64.dmg,mac-x64.dmg,win-x64.exe}`. Le workflow attache à chaque release des copies des installeurs sous ces noms stables, en plus des fichiers versionnés utilisés par l'auto-update. Même principe que jeeve (liens « latest »), sans bucket S3.
- Build Mac local validé (`npm run dist:mac`) : 4 artefacts + `latest-mac.yml`.

Procédure de release :
1. Bumper `version` dans `desktop/package.json`, commiter.
2. `git tag desktop-v0.1.0 && git push origin desktop-v0.1.0`.
3. Le workflow publie la release GitHub **`v0.1.0`** (tag créé par electron-builder, distinct du tag de déclenchement) avec les installeurs versionnés, `latest*.yml` pour l'auto-update, et les copies `DraftEdge-latest-*` pour les liens du site.

Première release publiée le 18/09/2026 : https://github.com/axelvuillaume/DraftEdge/releases/tag/v0.1.0

Retour de la v0.1.0 (18/09/2026) et correctifs v0.1.1 :
- **« Connexion… » infini sur Windows** : l'app packagée visait `https://api.draftedge.lol` (hôte inexistant) et l'erreur réseau n'était pas rattrapée. Corrigé : URL de prod `https://api-draftedge-production.up.railway.app` (même que `app/src/config.js`), migration silencieuse de l'ancienne valeur stockée, timeout + message « Serveur injoignable » avec l'URL.
- **« DraftEdge est endommagé » sur Mac** : le build n'était pas signé du tout (`identity: null`). Corrigé : signature ad hoc (`CSC_IDENTITY_AUTO_DISCOVERY=false` dans le workflow) + entitlements. Gatekeeper affiche alors « impossible de vérifier le développeur », contournable via clic droit → Ouvrir ou Réglages > Confidentialité et sécurité > Ouvrir quand même. Si le message « endommagé » persiste sur une machine : `xattr -cr /Applications/DraftEdge.app`. Solution définitive : compte Apple Developer (99 $/an) → secrets `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` déjà câblés dans le workflow, puis `notarize: true`.
- **Windows Defender / SmartScreen « fichier dangereux »** : inhérent à un .exe non signé. Pas de correctif côté code. Options : certificat OV/EV classique (200 à 400 €/an) ou Azure Trusted Signing (~10 $/mois, supporté par electron-builder via `win.azureSignOptions`). La réputation SmartScreen s'améliore aussi avec le volume de téléchargements.

## Phase 6 — Vérification timeline LCU (18/09/2026)

Testé en direct sur le client (`GET /lol-match-history/v1/game-timelines/{gameId}`) :

| Game | Type | Réponse |
|------|------|---------|
| Custom 11 min (solo) | CUSTOM_GAME q3140 | 200, 12 frames, `participantFrames` avec `position {x,y}`, gold, xp, level, cs ; events : BUILDING_KILL |
| Custom 55 s (solo) | CUSTOM_GAME q3100 | 200, 2 frames, positions présentes |
| Arena 24 min | MATCHED_GAME q1750 | 200, 26 frames, 18 participants positionnés, 147 CHAMPION_KILL avec position |

Conclusion : la timeline est disponible pour les customs, avec positions par minute et kills positionnés, sans Tournament API. Ce que le ROFL ne donne pas.
À confirmer sur une vraie custom 5v5 (prochain scrim) : présence de WARD_PLACED / WARD_KILL / ELITE_MONSTER_KILL / ITEM_PURCHASED, pas observable sur les games disponibles ce jour-là.
Implémentation envisagée : l'app desktop envoie la timeline en JSON avec le .rofl (`timeline` dans le multipart), l'API la stocke dans une collection `game-timeline` liée à la game, exploitée ensuite pour une minimap (positions, kills, wards).

