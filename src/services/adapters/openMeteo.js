/**
 * Open-Meteo adapter
 *
 * Fetches forecast data from Open-Meteo and normalizes it into the canonical
 * internal weather schema used by this app.
 *
 * Canonical schema
 * ─────────────────
 * {
 *   utc_offset_seconds: number,
 *   timezone: string,
 *   timezone_abbreviation: string,
 *   current: {
 *     temperature_2m, apparent_temperature, relative_humidity_2m,
 *     precipitation, precipitation_probability,
 *     weather_code, wind_speed_10m, wind_direction_10m,
 *     uv_index, cloud_cover, surface_pressure, visibility,
 *   },
 *   hourly: {                    // parallel arrays, 336 entries (14 days × 24 h)
 *     time[],
 *     temperature_2m[], apparent_temperature[], relative_humidity_2m[],
 *     precipitation[], precipitation_probability[],
 *     weather_code[], wind_speed_10m[], wind_direction_10m[],
 *     uv_index[], cloud_cover[], surface_pressure[], visibility[],
 *   },
 *   daily: {                     // parallel arrays, 14 entries
 *     time[],
 *     weather_code[],
 *     temperature_2m_max[], temperature_2m_min[],
 *     apparent_temperature_max[], apparent_temperature_min[],
 *     precipitation_sum[], precipitation_probability_max[],
 *     wind_speed_10m_max[], wind_direction_10m_dominant[], wind_gusts_10m_max[],
 *     uv_index_max[],
 *     sunrise[], sunset[],
 *   }
 * }
 */

import { APP_STORAGE_PREFIX } from '../../config.js'

const BASE_URL = 'https://api.open-meteo.com/v1/forecast'
const MODEL_STG = `${APP_STORAGE_PREFIX}-open-meteo-model`

export const id    = 'open-meteo'
export const label = 'Open-Meteo'

export const MODELS = [
  { value: 'best_match',           label: 'Auto',           hint: 'Automatically selects the best model for your location' },
  { value: 'ecmwf_ifs',            label: 'ECMWF HRES',     hint: 'High-resolution reliable global model (9 km)' },
  { value: 'gfs_seamless',         label: 'NOAA GFS',       hint: 'Best for the USA; 16-day range; good global coverage' },
  { value: 'icon_seamless',        label: 'DWD ICON',       hint: 'Best for Europe, especially Central and Alpine regions' },
  { value: 'gem_seamless',         label: 'GEM (Canada)',   hint: 'Best for Canada, North America, and the Arctic' },
  { value: 'meteofrance_seamless', label: 'Météo-France',   hint: 'Finest resolution for France & W. Europe; 4-day limit' },
  { value: 'ukmo_seamless',        label: 'UK Met Office',  hint: 'Best for the UK, Ireland & North Atlantic; 4-hr delay' },
  { value: 'jma_seamless',         label: 'JMA (Japan)',    hint: 'Best for Japan, Korea & W. Pacific typhoon tracking' },
]

export function getVariant() {
  return localStorage.getItem(MODEL_STG) ?? 'best_match'
}

/**
 * Fetch raw data from Open-Meteo and normalize to canonical schema.
 * unitPrefs are sent to the API so returned values are already in the
 * user's preferred units — no client-side unit conversion needed for
 * temperature, wind, or precipitation.
 */
export async function fetch(lat, lon, unitPrefs) {
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
    models:             getVariant(),
    cell_selection:     'nearest',
  })

  const res = await globalThis.fetch(`${BASE_URL}?${params}`)
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`)
  const raw = await res.json()
  return normalize(raw)
}

/**
 * Transform Open-Meteo's response into the canonical schema.
 * Open-Meteo's shape already matches the canonical schema closely,
 * so this is mostly pass-through — but having an explicit normalize()
 * step makes it clear where the contract is enforced.
 */
function normalize(raw) {
  return {
    utc_offset_seconds:    raw.utc_offset_seconds,
    timezone:              raw.timezone,
    timezone_abbreviation: raw.timezone_abbreviation,
    current: {
      temperature_2m:           raw.current.temperature_2m,
      apparent_temperature:     raw.current.apparent_temperature,
      relative_humidity_2m:     raw.current.relative_humidity_2m,
      precipitation:            raw.current.precipitation,
      precipitation_probability: null, // not in Open-Meteo current; merged from hourly by App.vue
      weather_code:             raw.current.weather_code,
      wind_speed_10m:           raw.current.wind_speed_10m,
      wind_direction_10m:       raw.current.wind_direction_10m,
      uv_index:                 raw.current.uv_index,
      cloud_cover:              raw.current.cloud_cover,
      surface_pressure:         raw.current.surface_pressure,
      visibility:               raw.current.visibility,
    },
    hourly: {
      time:                     raw.hourly.time,
      temperature_2m:           raw.hourly.temperature_2m,
      apparent_temperature:     raw.hourly.apparent_temperature,
      relative_humidity_2m:     raw.hourly.relative_humidity_2m,
      precipitation:            raw.hourly.precipitation,
      precipitation_probability: raw.hourly.precipitation_probability,
      weather_code:             raw.hourly.weather_code,
      wind_speed_10m:           raw.hourly.wind_speed_10m,
      wind_direction_10m:       raw.hourly.wind_direction_10m,
      uv_index:                 raw.hourly.uv_index,
      cloud_cover:              raw.hourly.cloud_cover,
      surface_pressure:         raw.hourly.surface_pressure,
      visibility:               raw.hourly.visibility,
    },
    daily: {
      time:                         raw.daily.time,
      weather_code:                 raw.daily.weather_code,
      temperature_2m_max:           raw.daily.temperature_2m_max,
      temperature_2m_min:           raw.daily.temperature_2m_min,
      apparent_temperature_max:     raw.daily.apparent_temperature_max,
      apparent_temperature_min:     raw.daily.apparent_temperature_min,
      precipitation_sum:            raw.daily.precipitation_sum,
      precipitation_probability_max: raw.daily.precipitation_probability_max,
      wind_speed_10m_max:           raw.daily.wind_speed_10m_max,
      wind_direction_10m_dominant:  raw.daily.wind_direction_10m_dominant,
      wind_gusts_10m_max:           raw.daily.wind_gusts_10m_max,
      uv_index_max:                 raw.daily.uv_index_max,
      sunrise:                      raw.daily.sunrise,
      sunset:                       raw.daily.sunset,
    },
  }
}
