const CACHE_TTL = 15 * 60 * 1000
const cache = new Map()

function cacheKey(lat, lon) {
  return `${lat.toFixed(4)},${lon.toFixed(4)}`
}

export async function fetchAirQuality(lat, lon, { signal } = {}) {
  const key = cacheKey(lat, lon)
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data

  const params = new URLSearchParams({
    latitude:  lat,
    longitude: lon,
    current:   'european_aqi,us_aqi,pm2_5,pm10',
    hourly:    'european_aqi,us_aqi,pm2_5,pm10',
    timezone:  'auto',
    forecast_days: 2,
  })

  const res = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${params}`, { signal })
  if (!res.ok) throw new Error(`Air quality fetch failed: ${res.status}`)

  const json = await res.json()
  const data = {
    current: {
      european_aqi: json.current?.european_aqi ?? null,
      us_aqi:       json.current?.us_aqi       ?? null,
      pm2_5:        json.current?.pm2_5         ?? null,
      pm10:         json.current?.pm10          ?? null,
    },
    hourly: {
      time:         json.hourly?.time         ?? [],
      european_aqi: json.hourly?.european_aqi ?? [],
      us_aqi:       json.hourly?.us_aqi       ?? [],
      pm2_5:        json.hourly?.pm2_5        ?? [],
      pm10:         json.hourly?.pm10         ?? [],
    },
  }

  cache.set(key, { data, timestamp: Date.now() })
  return data
}
