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
  // Avoid degenerate arc at exact quarter phases (tx ≈ 0) by nudging slightly
  const rawTx = Math.cos(2 * Math.PI * p) * R
  const tx = Math.abs(rawTx) < 0.5 ? (rawTx < 0 ? -0.5 : 0.5) : rawTx
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

/**
 * Returns the next occurrence of a target phase (0=new, 0.25=first quarter,
 * 0.5=full, 0.75=last quarter) on or after fromMs.
 * Returns a Date.
 */
export function nextPhaseDate(targetPhase, fromMs = Date.now()) {
  const current = getMoonPhase(fromMs)
  let delta = targetPhase - current
  if (delta <= 0.01) delta += 1  // already past — go to next cycle
  return new Date(fromMs + delta * LUNAR_PERIOD_MS)
}

/**
 * Returns the next occurrences of all four key phases from fromMs.
 * { newMoon, firstQuarter, fullMoon, lastQuarter } — each a Date.
 */
export function nextKeyPhases(fromMs = Date.now()) {
  return {
    newMoon:      nextPhaseDate(0,    fromMs),
    firstQuarter: nextPhaseDate(0.25, fromMs),
    fullMoon:     nextPhaseDate(0.5,  fromMs),
    lastQuarter:  nextPhaseDate(0.75, fromMs),
  }
}

// ─── Moonrise / Moonset calculation ──────────────────────────────────────────
// Based on the algorithm by Arnold Barmettler / Jean Meeus approximation.
// Accuracy: typically within a few minutes for dates near J2000.

const RAD = Math.PI / 180
const DEG = 180 / Math.PI

function sind(d) { return Math.sin(d * RAD) }
function cosd(d) { return Math.cos(d * RAD) }
function atand2(y, x) { return Math.atan2(y, x) * DEG }
function norm360(x) { return ((x % 360) + 360) % 360 }

/**
 * Local sidereal time in degrees for JD at longitude lon (degrees).
 */
function localSiderealTime(jd, lon) {
  const T = (jd - 2451545.0) / 36525
  let theta = 280.46061837 + 360.98564736629 * (jd - 2451545) +
    T * T * (0.000387933 - T / 38710000)
  return norm360(theta + lon)
}

/**
 * Moon's geocentric equatorial coordinates (RA, Dec) in degrees for Julian day jd.
 * Low-precision (~1°) but sufficient for rise/set times within a few minutes.
 */
function moonEquatorial(jd) {
  const T  = (jd - 2451545.0) / 36525

  // Moon's mean longitude
  const L0 = norm360(218.316 + 13.176396 * (jd - 2451545))
  // Mean anomaly
  const M  = norm360(134.963 + 13.064993 * (jd - 2451545))
  // Mean distance argument
  const F  = norm360(93.272  + 13.229350 * (jd - 2451545))

  // Ecliptic longitude
  const lon = L0 + 6.289 * sind(M)
  // Ecliptic latitude
  const lat = 5.128 * sind(F)

  // Obliquity of ecliptic
  const eps = 23.439 - 0.0000004 * (jd - 2451545)

  // Equatorial coordinates
  const sinLon = sind(lon)
  const ra  = norm360(atand2(sinLon * cosd(eps) - Math.tan(lat * RAD) * sind(eps), cosd(lon)))
  const dec = Math.asin(sind(lat) * cosd(eps) + cosd(lat) * sind(eps) * sinLon) * DEG

  return { ra, dec }
}

/**
 * Calculate moonrise and moonset for a given date and location.
 * @param {Date}   date  — calendar date (local midnight is fine)
 * @param {number} lat   — latitude in degrees
 * @param {number} lon   — longitude in degrees
 * @param {number} utcOffsetSeconds — location's UTC offset
 * @returns {{ rise: Date|null, set: Date|null }}
 */
export function moonRiseSet(date, lat, lon, utcOffsetSeconds) {
  // JD for local midnight on the given date (shifted by UTC offset so we scan
  // local midnight → local midnight rather than UTC midnight → UTC midnight)
  const y = date.getUTCFullYear()
  const m = date.getUTCMonth() + 1
  const d = date.getUTCDate()
  const A = Math.floor((14 - m) / 12)
  const Y = y + 4800 - A
  const Mo = m + 12 * A - 3
  const jd0 = d + Math.floor((153 * Mo + 2) / 5) + 365 * Y +
    Math.floor(Y / 4) - Math.floor(Y / 100) + Math.floor(Y / 400) - 32045 - 0.5
    - (utcOffsetSeconds ?? 0) / 86400

  // Moon's angular altitude needed for rise/set (accounting for parallax ~0.95°)
  const h0 = -0.583  // degrees

  // Evaluate moon position every 15 min and interpolate for crossings
  const steps = 96
  const altitudes = []
  for (let i = 0; i <= steps; i++) {
    const jd = jd0 + i / steps
    const { ra, dec } = moonEquatorial(jd)
    const lst = localSiderealTime(jd, lon)
    const ha  = norm360(lst - ra)          // hour angle 0–360
    const haS = ha > 180 ? ha - 360 : ha  // signed –180..180
    const alt = Math.asin(
      sind(lat) * sind(dec) +
      cosd(lat) * cosd(dec) * cosd(haS)
    ) * DEG
    altitudes.push({ jd, alt, ha: haS })
  }

  let rise = null, set = null

  for (let i = 0; i < steps; i++) {
    const a0 = altitudes[i].alt - h0
    const a1 = altitudes[i + 1].alt - h0
    if (a0 * a1 < 0) {
      // Linear interpolation for crossing
      const frac = a0 / (a0 - a1)
      const jdCross = altitudes[i].jd + frac / steps

      // Moon is rising when altitude is increasing through the horizon
      const rising = altitudes[i].alt < altitudes[i + 1].alt

      const crossMs = (jdCross - 2440587.5) * 86400000
      const crossDate = new Date(crossMs)
      if (rising && !rise) rise = crossDate
      else if (!rising && !set) set = crossDate
    }
  }

  return { rise, set }
}
