// Règles de détection des warmups. Chaque règle renvoie une raison (string) ou null.
export const MIN_DURATION_SECONDS = 12 * 60
export const MIN_ROSTER_PLAYERS = 4

function normalizeName(gameName, tagLine) {
  return `${gameName || ''}#${tagLine || ''}`.toLowerCase()
}

export function countRosterPlayers(game, roster) {
  if (!game.detailed || !game.mySide) return null
  const puuids = new Set(roster.map((p) => p.puuid).filter(Boolean))
  const names = new Set(roster.filter((p) => p.game_name).map((p) => normalizeName(p.game_name, p.tag_line)))
  return game.participants.filter((p) => p.side === game.mySide).filter((p) => puuids.has(p.puuid) || names.has(normalizeName(p.gameName, p.tagLine))).length
}

export function detectWarmup(game, { roster = [] } = {}) {
  const reasons = []
  if (!game.isCustom) reasons.push('Not a custom game')
  if (game.duration < MIN_DURATION_SECONDS) reasons.push(`Under ${MIN_DURATION_SECONDS / 60} min`)

  const rosterCount = countRosterPlayers(game, roster)
  if (rosterCount !== null && roster.length >= MIN_ROSTER_PLAYERS && rosterCount < MIN_ROSTER_PLAYERS) reasons.push(`${rosterCount}/5 roster players`)


  return { isWarmup: reasons.length > 0, reasons, rosterCount }
}
