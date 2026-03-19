import LZString from 'lz-string'
import { APP_STORAGE_PREFIX } from '../config.js'

const P = APP_STORAGE_PREFIX

const KEYS = {
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

export function encodeSettings() {
  const payload = {
    v:          PAYLOAD_VERSION,
    theme:      localStorage.getItem(KEYS.theme) ?? 'system',
    timeFormat: localStorage.getItem(KEYS.timeFormat) ?? '12h',
    chartOrder: localStorage.getItem(KEYS.chartOrder) === 'true',
    sim:        localStorage.getItem(KEYS.sim) === 'true',
    unitPrefs:  safeJsonParse(KEYS.unitPrefs, {}),
    tiles:      safeJsonParse(KEYS.tiles, []),
    pwsEnabled: localStorage.getItem(KEYS.pwsEnabled) !== 'false',
    pwsKey:     localStorage.getItem(KEYS.pwsKey) ?? '',
    locations:  safeJsonParse(KEYS.locations, []),
    active:     safeJsonParse(KEYS.active, null),
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
  localStorage.setItem(KEYS.theme, payload.theme ?? 'system')
  localStorage.setItem(KEYS.timeFormat, payload.timeFormat ?? '12h')
  localStorage.setItem(KEYS.chartOrder, String(!!payload.chartOrder))
  localStorage.setItem(KEYS.sim, String(!!payload.sim))
  if (payload.unitPrefs && typeof payload.unitPrefs === 'object')
    localStorage.setItem(KEYS.unitPrefs, JSON.stringify(payload.unitPrefs))
  if (Array.isArray(payload.tiles) && payload.tiles.length)
    localStorage.setItem(KEYS.tiles, JSON.stringify(payload.tiles))
  localStorage.setItem(KEYS.pwsEnabled, String(!!payload.pwsEnabled))
  if (payload.pwsKey) localStorage.setItem(KEYS.pwsKey, payload.pwsKey)
  else localStorage.removeItem(KEYS.pwsKey)

  const locs = Array.isArray(payload.locations) ? payload.locations : []
  localStorage.setItem(KEYS.locations, JSON.stringify(locs))

  // Resolve active location: use payload.active if it matches a saved location, else fall back to first
  let active = payload.active
  if (locs.length) {
    const match = locs.find(l => l.lat === active?.lat && l.lon === active?.lon)
    active = match ?? locs[0]
  } else {
    active = null
  }
  if (active) localStorage.setItem(KEYS.active, JSON.stringify({ lat: active.lat, lon: active.lon }))
  else localStorage.removeItem(KEYS.active)

  window.location.reload()
}

export function diffSettings(payload) {
  const changes = []

  const cur = {
    theme:      localStorage.getItem(KEYS.theme) ?? 'system',
    timeFormat: localStorage.getItem(KEYS.timeFormat) ?? '12h',
    chartOrder: localStorage.getItem(KEYS.chartOrder) === 'true',
    sim:        localStorage.getItem(KEYS.sim) === 'true',
    unitPrefs:  safeJsonParse(KEYS.unitPrefs, {}),
    tiles:      safeJsonParse(KEYS.tiles, []),
    pwsEnabled: localStorage.getItem(KEYS.pwsEnabled) !== 'false',
    pwsKey:     localStorage.getItem(KEYS.pwsKey) ?? '',
    locations:  safeJsonParse(KEYS.locations, []),
  }

  if (cur.theme !== payload.theme)
    changes.push({ label: 'Theme', from: cur.theme, to: payload.theme })

  if (cur.timeFormat !== payload.timeFormat)
    changes.push({ label: 'Time format', from: cur.timeFormat, to: payload.timeFormat })

  if (cur.chartOrder !== !!payload.chartOrder)
    changes.push({ label: 'Chart order', from: cur.chartOrder ? 'Daily first' : 'Hourly first', to: payload.chartOrder ? 'Daily first' : 'Hourly first' })

  if (cur.sim !== !!payload.sim)
    changes.push({ label: 'Weather simulator', from: cur.sim ? 'On' : 'Off', to: payload.sim ? 'On' : 'Off' })

  if (cur.pwsEnabled !== !!payload.pwsEnabled)
    changes.push({ label: 'PWS data', from: cur.pwsEnabled ? 'Enabled' : 'Disabled', to: payload.pwsEnabled ? 'Enabled' : 'Disabled' })

  if ((cur.pwsKey || '') !== (payload.pwsKey || ''))
    changes.push({ label: 'PWS API key', from: cur.pwsKey ? '(saved)' : '(none)', to: payload.pwsKey ? '(new key)' : '(none)' })

  // Units
  if (payload.unitPrefs && typeof payload.unitPrefs === 'object') {
    const unitLabels = { temperature: 'Temperature unit', wind: 'Wind unit', precipitation: 'Precipitation unit', pressure: 'Pressure unit', visibility: 'Visibility unit' }
    for (const key of Object.keys(unitLabels)) {
      if (cur.unitPrefs[key] !== payload.unitPrefs[key])
        changes.push({ label: unitLabels[key], from: cur.unitPrefs[key] ?? '?', to: payload.unitPrefs[key] ?? '?' })
    }
  }

  // Tiles — just flag if any differ
  if (Array.isArray(payload.tiles) && JSON.stringify(cur.tiles) !== JSON.stringify(payload.tiles))
    changes.push({ label: 'Weather tiles', from: null, to: 'Layout / visibility will change' })

  // Locations
  const newLocs = Array.isArray(payload.locations) ? payload.locations : []
  const curNames = new Set(cur.locations.map(l => l.name))
  const newNames = new Set(newLocs.map(l => l.name))
  const added   = newLocs.filter(l => !curNames.has(l.name))
  const removed = cur.locations.filter(l => !newNames.has(l.name))
  for (const l of added)   changes.push({ label: 'Location added', from: null, to: l.name })
  for (const l of removed) changes.push({ label: 'Location removed', from: l.name, to: null })

  return changes
}

function safeJsonParse(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}
