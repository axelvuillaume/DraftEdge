# Plan — Reset Prime League Division 3 (Fall Split 26/27)

Sources : spreadsheet « Roster PRM 3 teams » (onglets `Roster PRM 3 teams` + `Groups`) et https://www.primeleague.gg/en/liga3 (état au 01/10/2026, split démarre le 04/10).

## 1. État actuel

**Base de données**
- League `Prime League Division 3` (`_id` 6a01b44743a80be611a43b9d, `has_points` absent → true par défaut). À conserver : 3 teams utilisateurs y sont rattachées (`testTeam`, `Cloud eSport`, `404 Multigaming`).
- 31 `team-leagues` du Spring Split 25/26 (groupes 3.1 → 3.4, wins/losses/points de l'ancien split).
- 138 `players` `is_league: true` tous `active: true`, rattachés par `team_league_id`.
- Aucune autre collection ne référence `team_league_id` (vérifié : seulement `player`, `getEloLeague`, `scrapePrimeLeague`).

**Code**
- `api/script/createPrimeLeague3.js` : script one-shot du split précédent (liste TEAMS en dur, parse les liens op.gg multisearch, crée team-leagues + players avec puuid/rang, recalcule `total_lp`).
- `api/src/cron/scrapePrimeLeague.js` : cron quotidien (04:30) qui scrape une URL de coverage avec puppeteer (`.coverage-groupstage-ranking`, `tr[title]`, `td.secondary`, `td.primary`) et met à jour wins/losses/points par nom normalisé. URL actuelle = coverage Spring 25/26 (obsolète).
- Front `app/src/scenes/league/{list,view}.jsx` : lit `group`, `contacts[]`, `staff[]`, `replacements[]`, `multi_opgg`, et affiche les joueurs `active: false` dans « Old Players ». Aucune modif front nécessaire.

## 2. Nouveau split : 31 équipes, 4 groupes

Les groupes du site (Group 1-4) correspondent exactement à l'onglet `Groups` du sheet. On garde la convention `3.1`…`3.4`. Noms = noms canoniques Prime League (titre des lignes du classement) pour que le scraper matche sans alias.

- **3.1** : AIX eSports, Babos Gaming Academy, Black Lion, BlackDivision, Glacial Guardians, Kanji KIN, MT1 Vision, VfB x Engines Stuttgart
- **3.2** : 1. ECF Main, 300 White, Eintracht Spandau II, LOOKSMAXXER, Rich Gang, Socken und Sandalen, TeamOrangeGaming Academy, Whalepower Humpbacks
- **3.3** : ATRUVIA Münster Esports, Cloud eSport, Defiance eSports, Kanji AKA, Packmiko E-Sports, Purple Emperor Lizards - Atomic, REH Gaming
- **3.4** : ACEGaming Hearts, Berlin 5, Duplex Silva Pigeons Edition, Emperors Bremen, Neko Elite Kittens, Second Time Alive, Sissi State Punks, spongecord prime

**Riot IDs** : 30 équipes sur 31 ont un lien op.gg multisearch dans le sheet (hyperlien de la cellule du nom), soit 152 comptes `GameName#TAG`, plus les 4 de Babos fournis à la main (156 au total). Exceptions :
- Babos Gaming Academy : pas de lien op.gg dans le sheet. Riot IDs fournis par Axel le 01/10 (4 comptes) : `Soren#RS457`, `ΣΠΡΙΝΤΑ#gyros`, `Manυel#EUW`, `I GO MUTE ALL#PEKO`. Attention aux caractères : lettres grecques dans `ΣΠΡΙΝΤΑ` et upsilon grec (υ) dans `Manυel`, à copier tels quels dans le fichier de données. Le 5ᵉ titulaire n'a pas de compte connu.
- Purple Emperor Lizards : « der Pudding » sans tagline (4 comptes valides sur 5).
- BlackDivision : 8 comptes dans le lien, on ne garde que les 5 titulaires (les 3 subs sont ignorés). LOOKSMAXXER : Denner a 2 comptes avec des tags différents (`Denner#ALIEN`, `Denner#187`), les 2 sont gardés.

**Contacts Discord** (ligne `contact:` du sheet) : un pseudo par équipe sauf Black Lion (aucun) et Defiance (2 : keawy, the_s3b).

## 3. Décisions (validées le 01/10/2026)

1. **Tout ce qui est lié à l'ancien split est supprimé** : les 31 `team-leagues` dont `league_id` = Prime League Division 3, et tous les `players` `is_league: true` de cette ligue (138 docs). Pas de correspondance ancien/nouveau, pas d'`old_players`, pas de renommage.
2. **Le document League est conservé** (3 teams utilisateurs pointent dessus : `testTeam`, `Cloud eSport`, `404 Multigaming`). On met `description: "Fall Split 2026/27"` et `has_points: true`.
3. **31 team-leagues créées à neuf** avec `name`, `group`, `multi_opgg`, `players`, `staff`, `contacts`, compteurs à 0. **Titulaires uniquement** : pas de `replacements`, les subs du sheet et des liens op.gg sont ignorés.
4. **Source des Riot IDs = lien op.gg multisearch du sheet**. Le roster texte du sheet sert pour `player_name`, `role` et le staff. Matching nick ↔ compte par normalisation (ex. `H3ad` ↔ `h3ad#euw`) ; sans match, `role` reste vide.
5. **Staff / contacts** : lignes « Manager / Coach / HC / Analyst / GM » → `staff[{ name }]`, lignes « Sub / Substitute » ignorées. Pseudo Discord de la ligne `contact:` → `contacts[{ role: 'Manager', discord }]`, `name` renseigné quand le pseudo correspond à un membre du staff.
6. **Scraper** : pointer sur `https://www.primeleague.gg/en/liga3` (vérifié le 01/10 : 4 blocs `.coverage-groupstage-ranking`, `tr[title]`, `td.secondary` = `0-0`, `td.primary` = `0`, mêmes sélecteurs). Ordre des blocs = Group 1→4 = `3.1`→`3.4`. La page affiche toujours le split courant.

## 4. Étapes d'implémentation

### Étape 1 — Fichier de données `api/script/data/prime-league-3-fall-2627.js`
- Généré depuis l'export xlsx du sheet (les liens op.gg sont des hyperliens de cellule, invisibles en CSV). Un petit parseur Python/Node one-shot produit un tableau `TEAMS` :
  ```js
  { name, group, multi_opgg, lolpros, contacts: [{ role, name, discord }],
    players: [{ name, riot_id, role }], staff: [{ name }] }
  ```
- Corrections manuelles dans ce fichier :
  - **Babos Gaming Academy** : `multi_opgg` à construire à partir des 4 Riot IDs fournis (`Soren#RS457`, `ΣΠΡΙΝΤΑ#gyros`, `Manυel#EUW`, `I GO MUTE ALL#PEKO`). Rôles d'après le sheet : Soren = jungle, ΣΠΡΙΝΤΑ = mid (Sprinta), Manυel = adc (Manuel) ; `I GO MUTE ALL` sans rôle (top Meephunter ou support UnderNexus, à confirmer).
  - **Purple Emperor Lizards** : « der Pudding » sans tagline → chercher le tag, sinon ignorer le compte.
  - **BlackDivision** : ne garder que les 5 premiers comptes du lien (Kritias, Timon, Pisher, Nadra, TeaZing) ; les 3 derniers (Mentale Festung, AsianPower666, Nomecco) sont des subs, ignorés.
  - **LOOKSMAXXER** : Denner a 2 comptes avec un tag différent (`Denner#ALIEN`, `Denner#187`) → 2 docs `player`, même `player_name` et même `role` support.
  - **Defiance** : 2 contacts (`keawy` = Assistant Manager Kai Kramme, `the_s3b` = Manager Sebastian).

### Étape 2 — Script `api/script/resetPrimeLeague3.js`
Remplace `createPrimeLeague3.js` (qu'on supprime). Déroulé :
1. `--dry-run` par défaut : affiche ce qui sera supprimé (nb team-leagues, nb players) et créé, sans écrire. `--apply` pour exécuter.
2. Charge la League par nom, met à jour `description` / `has_points`.
3. `TeamLeague.deleteMany({ league_id })` puis `Player.deleteMany({ league_id, is_league: true })`.
4. Pour chaque team du fichier de données : `TeamLeague.create`, puis pour chaque compte `getPuuidByRiotId` + `getRankByPuuid` (sleep 120 ms, ~300 appels Riot) et `Player.create` avec `is_league: true`, `team_league_id`, `league_id`, `connected_at`.
5. Recalcul `total_lp` par équipe (top 5 LP des Master+). Extraire ce calcul de `getEloLeague.js` dans un helper partagé `api/src/services/team-league-lp.js` plutôt que le dupliquer une 3ᵉ fois.
6. Log récapitulatif + liste des Riot IDs non résolus (puuid null) à corriger à la main.

### Étape 3 — Cron `api/src/cron/scrapePrimeLeague.js`
- `url: 'https://www.primeleague.gg/en/liga3'`, `groups: ['3.1','3.2','3.3','3.4']`.
- Mettre à jour `group` depuis le scrape (en plus de wins/losses/points) pour que la base suive le site si Prime League modifie un groupe.
- Logger en warning si `tables.length !== 4` ou si une équipe de la base n'est trouvée dans aucun bloc (détection de changement de split / de markup).
- Test : `node script/scrapePrimeLeague.js` → attendu `31 updated, 0 unmatched`, tous à `0-0, 0 pts` avant le 04/10.

### Étape 4 — Exécution et vérification
1. `node script/resetPrimeLeague3.js` (dry-run) → relire le diff.
2. `node script/resetPrimeLeague3.js --apply`.
3. `node script/scrapePrimeLeague.js` → 0 unmatched.
4. Contrôle UI par Axel : `/league` (31 équipes, filtre groupes 3.1-3.4, tri LP), fiche d'une équipe (joueurs, rang, staff, contact Discord affiché), accueil (widget ligue).
5. Commit : data + script + cron + helper LP ; suppression de `createPrimeLeague3.js`.

## 5. Décisions complémentaires

- Les comptes utilisateurs (`teams`) ne sont pas touchés. `404 Multigaming` reste rattachée à la ligue même si elle n'y joue plus ; l'utilisateur peut changer de ligue via le sélecteur.

## 6. Hors périmètre (noté pour plus tard)

- Les matchs de la semaine (onglet `Groups`, planning Bo3) ne sont pas stockés : pas de modèle. Candidat pour une feature « prochains adversaires » (voir backlog).
- Les pseudos Discord des contacts viennent du sheet ; pas de vérification sur le serveur Discord Prime League dans ce chantier.

## 7. Exécution (01/10/2026)

- Reset appliqué : 31 team-leagues + 138 players supprimés, 31 team-leagues + 153 players créés.
- 4 Riot IDs introuvables côté Riot (créés sans puuid, à corriger à la main) : `UIC Symphonie#ZywOo` (300 White), `NEMESIS JIHAN#NOEXC` (TeamOrangeGaming Academy), `chat scale 0#0089` (ATRUVIA Münster), `kolopak#322` (Berlin 5).
- Scraper : le CDN Prime League (Blendbyte) renvoie 403 pour l'ancien User-Agent du cron (Mac OS X 10_15_7 / Chrome 130). UA remplacé par un Chrome 146 récent → 4 tableaux, 31 équipes matchées, 0 unmatched.
