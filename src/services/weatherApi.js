const BASE_URL = 'https://api.open-meteo.com/v1/forecast'

export async function fetchWeather(lat, lon, unitPrefs) {
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
  return res.json()
}
