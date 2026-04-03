const COMPASS_DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

export function degreesToCompass(deg) {
  if (deg == null) return null
  const idx = Math.round(((deg % 360) + 360) % 360 / 45) % 8
  return COMPASS_DIRS[idx]
}

// Handles overnight wrap-around (e.g. from=22, to=6)
function hourInRange(h, from, to) {
  if (from <= to) return h >= from && h <= to
  return h >= from || h <= to
}

/**
 * Evaluates all enabled alerts against hourly weather data.
 *
 * @param {Array}  alerts  - Array of alert objects from useSettings
 * @param {Object} hourly  - Hourly data object with parallel arrays (time[], temperature_2m[], etc.)
 * @returns {Map<string, { alert, matchesByDay: Array<{ date: string, hours: number[] }> }>}
 *          Only alerts with at least one matching hour are included.
 */
export function evaluateCustomAlerts(alerts, hourly) {
  const results = new Map()
  if (!hourly?.time?.length || !Array.isArray(alerts)) return results

  for (const alert of alerts) {
    if (!alert.enabled) continue

    // date string → Set of matching hours
    const matchMap = new Map()

    for (let i = 0; i < hourly.time.length; i++) {
      const timeStr = hourly.time[i]
      const d = new Date(timeStr)
      const jsDay    = d.getDay()    // 0=Sun..6=Sat
      const hourOfDay = d.getHours()
      const dateStr  = timeStr.slice(0, 10)  // 'YYYY-MM-DD'

      let match = true

      // Days of week — alert uses 0=Mon..6=Sun
      if (match && alert.daysOfWeek?.enabled) {
        const alertDay = jsDay === 0 ? 6 : jsDay - 1
        if (!Array.isArray(alert.daysOfWeek.days) || !alert.daysOfWeek.days.includes(alertDay)) {
          match = false
        }
      }

      // Between hours
      if (match && alert.betweenHours?.enabled) {
        if (!hourInRange(hourOfDay, alert.betweenHours.from ?? 0, alert.betweenHours.to ?? 23)) {
          match = false
        }
      }

      // Temperature (raw °C from API)
      if (match && alert.temperature?.enabled) {
        const v = hourly.temperature_2m?.[i]
        if (v == null) {
          match = false
        } else {
          if (alert.temperature.min != null && v < alert.temperature.min) match = false
          if (alert.temperature.max != null && v > alert.temperature.max) match = false
        }
      }

      // Rain
      if (match && alert.rain?.enabled) {
        const prob   = hourly.precipitation_probability?.[i] ?? 0
        const amount = hourly.precipitation?.[i] ?? 0
        if (alert.rain.probMin   != null && prob   < alert.rain.probMin)   match = false
        if (alert.rain.probMax   != null && prob   > alert.rain.probMax)   match = false
        if (alert.rain.amountMin != null && amount < alert.rain.amountMin) match = false
        if (alert.rain.amountMax != null && amount > alert.rain.amountMax) match = false
      }

      // Wind
      if (match && alert.wind?.enabled) {
        const speed = hourly.wind_speed_10m?.[i] ?? 0
        if (alert.wind.speedMin != null && speed < alert.wind.speedMin) match = false
        if (alert.wind.speedMax != null && speed > alert.wind.speedMax) match = false
        // Support both new `directions[]` and legacy `direction` (single string)
        const dirs = Array.isArray(alert.wind.directions)
          ? alert.wind.directions
          : (alert.wind.direction ? [alert.wind.direction] : [])
        if (match && dirs.length > 0) {
          const dir = degreesToCompass(hourly.wind_direction_10m?.[i])
          if (!dirs.includes(dir)) match = false
        }
      }

      // Cloud cover
      if (match && alert.cloudCover?.enabled) {
        const v = hourly.cloud_cover?.[i] ?? 0
        if (alert.cloudCover.min != null && v < alert.cloudCover.min) match = false
        if (alert.cloudCover.max != null && v > alert.cloudCover.max) match = false
      }

      if (match) {
        if (!matchMap.has(dateStr)) matchMap.set(dateStr, new Set())
        matchMap.get(dateStr).add(hourOfDay)
      }
    }

    if (matchMap.size > 0) {
      const matchesByDay = [...matchMap.entries()]
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([date, hrs]) => ({ date, hours: [...hrs].sort((a, b) => a - b) }))
      results.set(alert.id, { alert, matchesByDay })
    }
  }

  return results
}
