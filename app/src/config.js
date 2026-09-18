const environment = getEnvironment()

let apiURL = ""
if (environment === "development") apiURL = "http://localhost:8080"
if (environment === "production") {
  apiURL = "https://api-draftedge-production.up.railway.app"
}

const SENTRY_URL = "YOUR_SENTRY_URL"

const POSTHOG_API_KEY = "phc_ytErKBckHNz5Rs3qW4sJqVbCiMLRBj6BTFZ1a5fVNrU"
const POSTHOG_HOST = "https://eu.i.posthog.com"

function getEnvironment() {
  if (window.location.href.indexOf("app-staging") !== -1) return "staging"
  if (window.location.href.indexOf("localhost") !== -1 || window.location.href.indexOf("127.0.0.1") !== -1) return "development"
  return "production"
}

// Liens permanents vers la dernière version de l'app desktop.
// Le workflow .github/workflows/desktop-release.yml publie, à chaque release, des copies des installeurs
// sous ces noms stables : le lien "releases/latest/download/<nom>" pointe donc toujours sur la dernière version.
const DESKTOP_RELEASE_BASE = "https://github.com/axelvuillaume/DraftEdge/releases/latest/download"
const desktopDownloadURLs = {
  macArm64: `${DESKTOP_RELEASE_BASE}/DraftEdge-latest-mac-arm64.dmg`,
  macIntel: `${DESKTOP_RELEASE_BASE}/DraftEdge-latest-mac-x64.dmg`,
  windows: `${DESKTOP_RELEASE_BASE}/DraftEdge-latest-win-x64.exe`,
}

export { apiURL, SENTRY_URL, environment, POSTHOG_API_KEY, POSTHOG_HOST, desktopDownloadURLs }
