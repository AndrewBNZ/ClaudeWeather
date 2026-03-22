import { getWeatherInfo, getCompassDir } from './weatherCodes.js'

// Convert any wind unit to km/h for Beaufort classification
const TO_KMH = { kmh: 1, mph: 1.60934, ms: 3.6, kn: 1.852 }

// Beaufort scale thresholds (km/h) and terms
const BEAUFORT = [
  { max:   1, term: 'calm' },
  { max:   5, term: 'light air' },
  { max:  11, term: 'light breeze' },
  { max:  19, term: 'gentle breeze' },
  { max:  28, term: 'moderate breeze' },
  { max:  38, term: 'fresh breeze' },
  { max:  49, term: 'strong breeze' },
  { max:  61, term: 'near gale' },
  { max:  74, term: 'gale' },
  { max:  88, term: 'strong gale' },
  { max: 102, term: 'storm' },
  { max: 117, term: 'violent storm' },
  { max: Infinity, term: 'hurricane-force winds' },
]

// WMO codes that represent precipitation conditions
const PRECIP_CODES = new Set([51,53,55,56,57,61,63,65,66,67,71,73,75,77,80,81,82,85,86,95,96,99])

function beaufortTerm(speedInUserUnit, unit) {
  const kmh = speedInUserUnit * (TO_KMH[unit] ?? 1)
  return BEAUFORT.find(b => kmh <= b.max)?.term ?? 'hurricane-force winds'
}

export function getDailySummary(daily, dayIndex, unitPrefs) {
  if (!daily) return null

  const code       = daily.weather_code?.[dayIndex]
  const tempMax    = daily.temperature_2m_max?.[dayIndex]
  const tempMin    = daily.temperature_2m_min?.[dayIndex]
  const precipProb = daily.precipitation_probability_max?.[dayIndex]
  const precipSum  = daily.precipitation_sum?.[dayIndex]
  const windMax    = daily.wind_speed_10m_max?.[dayIndex]
  const windDir    = daily.wind_direction_10m_dominant?.[dayIndex]
  const uvMax      = daily.uv_index_max?.[dayIndex]

  if (code == null || tempMax == null) return null

  const { label } = getWeatherInfo(code)
  const tempUnit = unitPrefs.temperature === 'fahrenheit' ? '°F' : '°C'
  const windUnit = { kmh: 'km/h', mph: 'mph', ms: 'm/s', kn: 'kn' }[unitPrefs.wind] ?? 'km/h'
  const hi = Math.round(tempMax)
  const lo = tempMin != null ? Math.round(tempMin) : null

  const parts = []

  // Condition + temp range
  // If the WMO code is a precipitation type, inline the probability after the label
  const isPrecipCode = PRECIP_CODES.has(code)
  const sumStr = precipSum != null && precipSum >= 0.5
    ? (unitPrefs.precipitation === 'inch' ? `${precipSum.toFixed(2)} in` : `${precipSum.toFixed(1)} mm`)
    : null
  const probInline = isPrecipCode && precipProb != null
    ? ` (${[`${precipProb}%`, sumStr].filter(Boolean).join(', ')})`
    : ''
  if (lo != null) {
    parts.push(`${label}${probInline} with a high of ${hi}${tempUnit} and low of ${lo}${tempUnit}`)
  } else {
    parts.push(`${label}${probInline}, reaching ${hi}${tempUnit}`)
  }

  // Precipitation — only for non-precip WMO codes where chance is still notable
  if (!isPrecipCode && precipProb != null && precipProb >= 20) {
    parts.push(sumStr
      ? `${precipProb}% chance of precipitation (${sumStr} expected)`
      : `${precipProb}% chance of precipitation`)
  }

  // Wind — always included using Beaufort term
  if (windMax != null) {
    const term   = beaufortTerm(windMax, unitPrefs.wind)
    const dirStr = windDir != null ? ` from the ${getCompassDir(windDir)}` : ''
    parts.push(`${term}${dirStr} (${Math.round(windMax)} ${windUnit})`)
  }

  // UV (only if high or above)
  if (uvMax != null && uvMax >= 6) {
    const uvDesc = uvMax >= 11 ? 'extreme' : uvMax >= 8 ? 'very high' : 'high'
    parts.push(`${uvDesc} UV (${Math.round(uvMax)})`)
  }

  return parts.join(', ') + '.'
}
