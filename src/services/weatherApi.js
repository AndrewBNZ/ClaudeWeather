/**
 * Weather service — dispatcher layer
 *
 * Manages caching and routes fetch requests to the active API adapter.
 * All adapters must implement:  fetch(lat, lon, unitPrefs) → canonical schema
 *
 * To add a new provider:
 *   1. Create src/services/adapters/<name>.js exporting { id, label, fetch }
 *   2. Import and register it in ADAPTERS below
 *   3. Add the provider option to the settings UI in App.vue
 */

import * as openMeteo from './adapters/openMeteo.js'
import { APP_STORAGE_PREFIX } from '../config.js'

// ─── Adapter registry ────────────────────────────────────────────────────────

const ADAPTERS = {
  [openMeteo.id]: openMeteo,
  // 'weatherapi': weatherApiCom,   ← future adapters registered here
}

export const WEATHER_PROVIDERS = Object.values(ADAPTERS).map(a => ({ id: a.id, label: a.label }))

const STORAGE_KEY_PROVIDER = `${APP_STORAGE_PREFIX}-weather-provider`
const DEFAULT_PROVIDER = openMeteo.id

export function getWeatherProvider() {
  return localStorage.getItem(STORAGE_KEY_PROVIDER) ?? DEFAULT_PROVIDER
}

export function setWeatherProvider(id) {
  localStorage.setItem(STORAGE_KEY_PROVIDER, id)
}

// ─── Cache ────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS       = 15 * 60 * 1000
const CACHE_PURGE_TTL_MS = 24 * 60 * 60 * 1000  // keep stale data for up to 24h as fallback

function cacheKey(adapter, lat, lon, unitPrefs) {
  const rLat    = Math.round(lat * 10000) / 10000
  const rLon    = Math.round(lon * 10000) / 10000
  const variant = adapter.getVariant?.() ?? ''
  const key     = variant ? `${adapter.id}_${variant}` : adapter.id
  return `weather_cache_${key}_${rLat}_${rLon}_${unitPrefs.temperature}_${unitPrefs.wind}_${unitPrefs.precipitation}`
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

function readStaleCache(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {}
  return null
}

function purgeExpiredCache() {
  try {
    const now = Date.now()
    Object.keys(localStorage)
      .filter(k => k.startsWith('weather_cache_'))
      .forEach(k => {
        try {
          const entry = JSON.parse(localStorage.getItem(k))
          if (now - entry.timestamp >= CACHE_PURGE_TTL_MS) localStorage.removeItem(k)
        } catch {
          localStorage.removeItem(k)
        }
      })
  } catch {}
}

purgeExpiredCache()

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
  // Clear cache for all providers at this location
  const prefix = `weather_cache_`
  const locationFragment = `_${rLat}_${rLon}_`
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith(prefix) && k.includes(locationFragment))
      .forEach(k => localStorage.removeItem(k))
  } catch {}
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch weather for the given coordinates.
 * Returns { data, timestamp } where data matches the canonical schema.
 */
export async function fetchWeather(lat, lon, unitPrefs, { forceRefresh = false, signal } = {}) {
  const provider = getWeatherProvider()
  const adapter  = ADAPTERS[provider] ?? openMeteo
  const key      = cacheKey(adapter, lat, lon, unitPrefs)

  if (!forceRefresh) {
    const cached = readCache(key)
    if (cached) return { data: cached.data, timestamp: cached.timestamp }
  }

  try {
    const data      = await adapter.fetch(lat, lon, unitPrefs, { signal })
    const timestamp = writeCache(key, data)
    return { data, timestamp }
  } catch (err) {
    if (err.name === 'AbortError') throw err
    const stale = readStaleCache(key)
    if (stale) return { data: stale.data, timestamp: stale.timestamp, stale: true }
    throw err
  }
}
