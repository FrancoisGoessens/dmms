import { getAppMeta, setAppMeta, resetAllDungeonFlags } from './db.js'

// Renvoie la date/heure (en Date UTC réelle) du dernier mardi 12h00, heure
// de Paris, à ou avant l'instant présent.
function lastTuesdayNoonParis() {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris', weekday: 'short', hour: 'numeric', hour12: false,
  }).formatToParts(now)
  const weekday = parts.find((p) => p.type === 'weekday').value // 'Mon', 'Tue', ...
  const hour = Number(parts.find((p) => p.type === 'hour').value)

  const weekdayIndex = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[weekday]
  let daysSinceTuesday = (weekdayIndex - 2 + 7) % 7
  if (weekdayIndex === 2 && hour < 12) daysSinceTuesday = 7 // avant midi mardi -> mardi précédent

  const target = new Date(now)
  target.setDate(target.getDate() - daysSinceTuesday)
  target.setHours(12, 0, 0, 0) // approximation en heure locale du navigateur — suffisant pour un usage perso
  return target
}

export async function checkAndRunWeeklyReset() {
  const lastResetRaw = await getAppMeta('last_weekly_reset')
  const lastReset = lastResetRaw ? new Date(lastResetRaw) : null
  const threshold = lastTuesdayNoonParis()

  if (!lastReset || lastReset < threshold) {
    await resetAllDungeonFlags()
    await setAppMeta('last_weekly_reset', new Date().toISOString())
    return true
  }
  return false
}
