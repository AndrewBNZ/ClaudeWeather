const KNOWN_NEW_MOON = new Date('2000-01-06T18:14:00Z').getTime()
const LUNAR_PERIOD_MS = 29.53058867 * 24 * 60 * 60 * 1000
export const LUNAR_PERIOD_DAYS = 29.53058867

/**
 * Returns moon phase as a value 0–1 (0/1 = new moon, 0.5 = full moon)
 * for the given timestamp (ms). Defaults to now.
 */
export function getMoonPhase(timestampMs = Date.now()) {
  return ((timestampMs - KNOWN_NEW_MOON) % LUNAR_PERIOD_MS + LUNAR_PERIOD_MS) % LUNAR_PERIOD_MS / LUNAR_PERIOD_MS
}

/**
 * Returns the SVG path string for a given phase (0–1).
 * lat (number) affects which side appears lit (southern hemisphere flip).
 */
export function moonPathForPhase(p, lat = 0) {
  if (p < 0.02 || p > 0.98) return ''
  const R = 20, cx = 20, cy = 20
  const tx = Math.cos(2 * Math.PI * p) * R
  const atx = Math.abs(tx)
  const litOnRight = (p < 0.5) !== (lat < 0)
  const s1 = litOnRight ? 1 : 0
  const s2 = (litOnRight === (tx < 0)) ? 1 : 0
  return `M ${cx},${cy - R} A ${R},${R} 0 0,${s1} ${cx},${cy + R} A ${atx},${R} 0 0,${s2} ${cx},${cy - R} Z`
}

export function moonPhaseName(p) {
  if (p < 0.02 || p > 0.98) return 'New Moon'
  if (p < 0.23) return 'Waxing Crescent'
  if (p < 0.27) return 'First Quarter'
  if (p < 0.48) return 'Waxing Gibbous'
  if (p < 0.52) return 'Full Moon'
  if (p < 0.73) return 'Waning Gibbous'
  if (p < 0.77) return 'Last Quarter'
  return 'Waning Crescent'
}

export function moonIllumination(p) {
  return Math.round((1 - Math.cos(2 * Math.PI * p)) / 2 * 100)
}
