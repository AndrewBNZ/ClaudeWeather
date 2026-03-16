const BASE_URL = 'https://api.open-meteo.com/v1/forecast'
const CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes

function cacheKey(lat, lon, unitPrefs) {
  const rLat = Math.round(lat * 10000) / 10000
  const rLon = Math.round(lon * 10000) / 10000
  return `weather_cache_${rLat}_${rLon}_${unitPrefs.temperature}_${unitPrefs.wind}_${unitPrefs.precipitation}`
}

function readCache(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const entry = JSON.parse(raw)
    if (Date.now() - entry.timestamp < CACHE_TTL_MS) return entry
  } catch {}
  return null
}

function writeCache(key, data) {
  const timestamp = Date.now()
  try {
    localStorage.setItem(key, JSON.stringify({ timestamp, data }))
  } catch {}
  return timestamp
}

export function clearWeatherCache(lat, lon) {
  const rLat = Math.round(lat * 10000) / 10000
  const rLon = Math.round(lon * 10000) / 10000
  const prefix = `weather_cache_${rLat}_${rLon}_`
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith(prefix))
      .forEach(k => localStorage.removeItem(k))
  } catch {}
}

// Returns { data, timestamp } where timestamp is when the data was originally fetched.
export async function fetchWeather(lat, lon, unitPrefs, { forceRefresh = false } = {}) {
  const key = cacheKey(lat, lon, unitPrefs)

  if (!forceRefresh) {
    const cached = readCache(key)
    if (cached) return { data: cached.data, timestamp: cached.timestamp }
  }

  const params = new URLSearchParams({
    latitude:  lat,
    longitude: lon,
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'precipitation',
      'weather_code',
      'wind_speed_10m',
      'wind_direction_10m',
      'uv_index',
      'cloud_cover',
      'surface_pressure',
      'visibility',
    ].join(','),
    hourly: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'precipitation',
      'weather_code',
      'wind_speed_10m',
      'wind_direction_10m',
      'precipitation_probability',
      'uv_index',
      'cloud_cover',
      'surface_pressure',
      'visibility',
    ].join(','),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'apparent_temperature_max',
      'apparent_temperature_min',
      'precipitation_sum',
      'precipitation_probability_max',
      'wind_speed_10m_max',
      'wind_direction_10m_dominant',
      'wind_gusts_10m_max',
      'uv_index_max',
      'sunrise',
      'sunset',
    ].join(','),
    temperature_unit:   unitPrefs.temperature,
    wind_speed_unit:    unitPrefs.wind,
    precipitation_unit: unitPrefs.precipitation,
    timezone:           'auto',
    forecast_days:      14,
  })

  const res = await fetch(`${BASE_URL}?${params}`)
  if (!res.ok) throw new Error(`Weather API error: ${res.status}`)
  const data = await res.json()
  const timestamp = writeCache(key, data)
  return { data, timestamp }
}
