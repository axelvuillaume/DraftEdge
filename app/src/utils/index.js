/** Format a date to YYYY-MM-DD.
 * @param {string} isoDateString - The ISO date string
 * @returns {string} - The formatted date
 * @example
 * formatDateToYYYYMMDD('2021-01-01T00:00:00.000Z') // '2021-01-01'
 */
export function formatDateToYYYYMMDD(isoDateString) {
  const date = new Date(isoDateString)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const formattedMonth = month < 10 ? `0${month}` : month
  const formattedDay = day < 10 ? `0${day}` : day
  return `${year}-${formattedMonth}-${formattedDay}`
}

export function getChampionIcon(name) {
  if (!name) return ""
  return `/icon/champions/${name.toLowerCase().replace(/[^a-z0-9]/g, "")}.png`
}
