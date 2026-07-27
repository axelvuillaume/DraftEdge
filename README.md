# DraftEdge

Plateforme de gestion pour équipes esport **League of Legends** : planification et analyse des scrims, préparation des drafts, scouting des adversaires et suivi des performances soloQ des joueurs.

## ✨ Fonctionnalités

- **Scrims** — planification des sessions (calendrier), objectifs et résultats, analyse des games
- **Drafts** — préparation de scénarios de draft
- **Scouting** — suivi des équipes adverses, pro games et stats joueurs
- **SoloQ** — suivi des matchs et snapshots de progression des joueurs (Riot API)
- **Replay book & strat maps** — notes, replays et cartes stratégiques
- **Leagues & stats** — suivi des compétitions et statistiques d'équipe
- **AI feedback** — retours générés par IA (Claude / Gemini)
- **Billing** — abonnements via Stripe

## 🛠️ Stack

| Partie | Technologies |
| --- | --- |
| Frontend (`/app`) | React 18, Vite, React Router, Tailwind CSS, Zustand, Recharts, i18next |
| Backend (`/api`) | Node.js, Express, Mongoose (MongoDB), Passport JWT, node-cron |
| Services | Riot API, Stripe, Anthropic (Claude), Gemini, Brevo, Sentry, PostHog |

## 📁 Structure

```
app/
  src/
    scenes/        # pages (auth, home, league, opponents, performance, soloQ, stats, team…)
    components/    # composants réutilisables
    services/api.js# client API
api/
  src/
    controllers/   # routes / logique métier
    models/        # modèles Mongoose
    services/      # services externes (Riot, Stripe, IA…)
    cron/          # tâches planifiées
```

## 🚀 Démarrage

### Prérequis

- Node.js ≥ 18
- Une base MongoDB

### API

```bash
cd api
npm install
npm run dev   # http://localhost:8080
```

Créer un fichier `api/.env` :

```env
PORT=8080
ENVIRONMENT=development
APP_URL=http://localhost:5173
MONGODB_ENDPOINT=mongodb://...
SECRET=jwt-secret

# Services externes
RIOT_API_KEY=
CLAUDE_API_KEY=
GEMINI_API_KEY=
BREVO_KEY=
SENTRY_DSN=
POSTHOG_API_KEY=
POSTHOG_HOST=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
```

### App

```bash
cd app
npm install
npm run dev   # http://localhost:5173
```

## 📜 Scripts

| Commande | Description |
| --- | --- |
| `cd app && npm run dev` | Frontend en dev (Vite) |
| `cd app && npm run build` | Build de production |
| `cd app && npm run lint` | Lint (ESLint, zéro warning) |
| `cd api && npm run dev` | API en dev (nodemon) |
| `cd api && npm start` | API en production |
