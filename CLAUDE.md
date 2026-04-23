# DraftEdge

## Env

- MONGO_URI → MongoDB
- API_URL → http://localhost:8080 (dev)

## Stack

React + React Router + Tailwind
Node.js + Express + MongoDB

## Structure

/app/src/scenes/ ← pages
/app/src/components/ ← composants réutilisables
/app/src/services/api.js ← client API (ne pas modifier)
/api/src/controllers/ ← controllers
/api/src/models/ ← models Mongoose

## Commandes

- App dev : `cd app && npm run dev`
- Api dev : `cd api && npm run dev`
- Build : `cd app && npm run build`
- Lint : `cd app && npm run lint`

## Description

Plateforme de gestion pour équipes esport League of Legends.
Permet de planifier et analyser les scrims, préparer les drafts, scouter les adversaires et suivre les performances soloQ des joueurs.
