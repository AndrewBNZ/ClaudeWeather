import LZString from 'lz-string'
import { APP_STORAGE_PREFIX } from '../config.js'
import { useSettings } from './useSettings.js'

const P = APP_STORAGE_PREFIX

const WRITE_KEYS = {
  theme:      `${P}-theme`,
  timeFormat: `${P}-timeformat`,
  chartOrder: `${P}-chartorder`,
  sim:        `${P}-sim`,
  unitPrefs:  `${P}-unitprefs`,
  tiles:      `${P}-tiles`,
  pwsKey:     `${P}-pws-key`,
  pwsEnabled: `${P}-pws-enabled`,
  locations:  `${P}-locations`,
  active:     `${P}-active`,
}

const PAYLOAD_VERSION = 1

// Read from reactive refs so defaults are always correct even if localStorage
// was never written (e.g. user never changed units from default).
export function encodeSettings() {
  const { theme, timeFormat, dailyFirst, showSim, unitPrefs, tileConfig, pwsEnabled, pwsApiKey } = useSettings()
  const payload = {
    v:          PAYLOAD_VERSION,
    theme:      theme.value,
    timeFormat: timeFormat.value,
    chartOrder: dailyFirst.value,
    sim:        showSim.value,
    unitPrefs:  { ...unitPrefs.value },
    tiles:      tileConfig.value.map(t => ({ ...t })),
    pwsEnabled: pwsEnabled.value,
    pwsKey:     pwsApiKey.value,
    locations:  safeJsonParse(WRITE_KEYS.locations, []),
    active:     safeJsonParse(WRITE_KEYS.active, null),
  }
  return LZString.compressToEncodedURIComponent(JSON.stringify(payload))
}

export function decodeSettings(encoded) {
  const json = LZString.decompressFromEncodedURIComponent(encoded)
  if (!json) throw new Error('Invalid QR code — could not decompress data.')
  let payload
  try { payload = JSON.parse(json) } catch { throw new Error('Invalid QR code — data is not valid JSON.') }
  if (!payload || payload.v !== PAYLOAD_VERSION) throw new Error(`Unsupported backup version (v${payload?.v ?? '?'}).`)
  return payload
}

export function applySettings(payload) {
  localStorage.setItem(WRITE_KEYS.theme, payload.theme ?? 'system')
  localStorage.setItem(WRITE_KEYS.timeFormat, payload.timeFormat ?? '12h')
  localStorage.setItem(WRITE_KEYS.chartOrder, String(!!payload.chartOrder))
  localStorage.setItem(WRITE_KEYS.sim, String(!!payload.sim))
  if (payload.unitPrefs && typeof payload.unitPrefs === 'object')
    localStorage.setItem(WRITE_KEYS.unitPrefs, JSON.stringify(payload.unitPrefs))
  if (Array.isArray(payload.tiles) && payload.tiles.length)
    localStorage.setItem(WRITE_KEYS.tiles, JSON.stringify(payload.tiles))
  localStorage.setItem(WRITE_KEYS.pwsEnabled, String(!!payload.pwsEnabled))
  if (payload.pwsKey) localStorage.setItem(WRITE_KEYS.pwsKey, payload.pwsKey)
  else localStorage.removeItem(WRITE_KEYS.pwsKey)

  const locs = Array.isArray(payload.locations) ? payload.locations : []
  localStorage.setItem(WRITE_KEYS.locations, JSON.stringify(locs))

  let active = payload.active
  if (locs.length) {
    const match = locs.find(l => l.lat === active?.lat && l.lon === active?.lon)
    active = match ?? locs[0]
  } else {
    active = null
  }
  if (active) localStorage.setItem(WRITE_KEYS.active, JSON.stringify({ lat: active.lat, lon: active.lon }))
  else localStorage.removeItem(WRITE_KEYS.active)

  window.location.reload()
}

// Returns a flat list of { label, value } rows summarising what the payload contains.
export function previewSettings(payload) {
  const items = []

  const themeLabels = { system: 'Device theme', light: 'Always light', dark: 'Always dark', auto: 'Auto (time-based)' }
  items.push({ label: 'Theme', value: themeLabels[payload.theme] ?? payload.theme })

  items.push({ label: 'Time format', value: payload.timeFormat === '24h' ? '24-hour' : '12-hour' })

  items.push({ label: 'Chart order', value: payload.chartOrder ? 'Daily on top' : 'Hourly on top' })

  if (payload.unitPrefs && typeof payload.unitPrefs === 'object') {
    const u = payload.unitPrefs
    const tempLabel  = u.temperature === 'fahrenheit' ? '°F' : '°C'
    const windLabels = { kmh: 'km/h', mph: 'mph', ms: 'm/s', kn: 'kn' }
    const windLabel  = windLabels[u.wind] ?? u.wind
    const precipLabel = u.precipitation === 'inch' ? 'in' : 'mm'
    const pressureLabels = { hpa: 'hPa', inhg: 'inHg', mmhg: 'mmHg' }
    const pressureLabel  = pressureLabels[u.pressure] ?? u.pressure
    const visLabel = u.visibility === 'mi' ? 'mi' : 'km'
    items.push({ label: 'Units', value: `${tempLabel} · ${windLabel} · ${precipLabel} · ${pressureLabel} · ${visLabel}` })
  }

  if (Array.isArray(payload.tiles) && payload.tiles.length) {
    const enabled = payload.tiles.filter(t => t.enabled).length
    items.push({ label: 'Weather tiles', value: `${enabled} of ${payload.tiles.length} shown` })
  }

  const locs = Array.isArray(payload.locations) ? payload.locations : []
  if (locs.length) {
    items.push({ label: locs.length === 1 ? 'Location' : 'Locations', value: locs.map(l => l.name).join(', ') })
  } else {
    items.push({ label: 'Locations', value: 'None' })
  }

  items.push({ label: 'PWS API key', value: payload.pwsKey ? 'Included' : 'None' })

  return items
}

function safeJsonParse(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}
