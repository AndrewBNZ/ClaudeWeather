import { ref, computed, watch } from 'vue'
import { APP_STORAGE_PREFIX } from '../config.js'

const P = APP_STORAGE_PREFIX

const PWS_KEY_STG          = `${P}-pws-key`
const PWS_ENABLED_STG      = `${P}-pws-enabled`
const TEMPEST_TOKEN_STG    = `${P}-tempest-token`
const TEMPEST_ENABLED_STG  = `${P}-tempest-enabled`
const UNIT_PREFS_KEY  = `${P}-unitprefs`
const LEGACY_UNITS_KEY = `${P}-units`
const SIM_KEY         = `${P}-sim`
const TILES_KEY       = `${P}-tiles`
const CHART_ORDER_KEY = `${P}-chartorder`
const TIME_FORMAT_KEY = `${P}-timeformat`
const THEME_KEY       = `${P}-theme`
const DATATYPE_KEY    = `${P}-datatype`

export const DEFAULT_UNIT_PREFS = {
  temperature: 'celsius', wind: 'kmh', precipitation: 'mm', pressure: 'hpa', visibility: 'km',
}

export const UNIT_OPTIONS = [
  { key: 'temperature',   iconKey: 'temperature', label: 'Temperature',   options: [{ value: 'celsius', label: '°C' }, { value: 'fahrenheit', label: '°F' }] },
  { key: 'wind',          iconKey: 'wind',        label: 'Wind Speed',    options: [{ value: 'kmh', label: 'km/h' }, { value: 'mph', label: 'mph' }, { value: 'ms', label: 'm/s' }, { value: 'kn', label: 'knots' }] },
  { key: 'precipitation', iconKey: 'rain',        label: 'Precipitation', options: [{ value: 'mm', label: 'mm' }, { value: 'inch', label: 'in' }] },
  { key: 'pressure',      iconKey: 'pressure',    label: 'Pressure',      options: [{ value: 'hpa', label: 'hPa' }, { value: 'inhg', label: 'inHg' }, { value: 'mmhg', label: 'mmHg' }] },
  { key: 'visibility',    iconKey: 'visibility',  label: 'Visibility',    options: [{ value: 'km', label: 'km' }, { value: 'mi', label: 'mi' }] },
]

export const TILE_META = {
  rain:       { icon: '🌧️', label: 'Rain' },
  wind:       { icon: '💨', label: 'Wind' },
  feelsLike:  { icon: '🤔', label: 'Feels Like' },
  humidity:   { icon: '💧', label: 'Humidity' },
  uv:         { icon: '☀️', label: 'UV Index' },
  cloudCover: { icon: '☁️', label: 'Cloud Cover' },
  pressure:   { icon: '↕️', label: 'Pressure' },
  visibility: { icon: '👁️', label: 'Visibility' },
  radar:      { icon: '🛰️', label: 'Radar' },
}

const DEFAULT_TILES = [
  { type: 'rain',       enabled: true },
  { type: 'wind',       enabled: true },
  { type: 'feelsLike',  enabled: true },
  { type: 'humidity',   enabled: true },
  { type: 'uv',         enabled: true },
  { type: 'cloudCover', enabled: true },
  { type: 'pressure',   enabled: true },
  { type: 'visibility', enabled: true },
  { type: 'radar',      enabled: true },
]

function loadUnitPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(UNIT_PREFS_KEY))
    if (saved && typeof saved === 'object') return { ...DEFAULT_UNIT_PREFS, ...saved }
  } catch {}
  const legacy = localStorage.getItem(LEGACY_UNITS_KEY)
  if (legacy === 'imperial') return { temperature: 'fahrenheit', wind: 'mph', precipitation: 'inch', pressure: 'hpa', visibility: 'mi' }
  return { ...DEFAULT_UNIT_PREFS }
}

function loadTileConfig() {
  try {
    const raw = JSON.parse(localStorage.getItem(TILES_KEY))
    if (Array.isArray(raw) && raw.every(t => t.type)) {
      const known = new Set(Object.keys(TILE_META))
      const valid = raw.filter(t => t.type === 'pageBreak' || known.has(t.type))
      const seen  = new Set(valid.filter(t => t.type !== 'pageBreak').map(t => t.type))
      for (const d of DEFAULT_TILES) { if (!seen.has(d.type)) valid.push({ ...d }) }
      return valid
    }
  } catch {}
  return DEFAULT_TILES.map(t => ({ ...t }))
}

// ── Module-level singleton state ──────────────────────────────────────────────

const theme        = ref(localStorage.getItem(THEME_KEY) ?? 'system')
const systemDark   = window.matchMedia('(prefers-color-scheme: dark)')
const systemIsDark = ref(systemDark.matches)
export const autoIsDark = ref(isAutoNight())

export const resolvedTheme = computed(() => {
  if (theme.value === 'light') return 'light'
  if (theme.value === 'dark')  return 'dark'
  if (theme.value === 'auto')  return autoIsDark.value ? 'dark' : 'light'
  return systemIsDark.value ? 'dark' : 'light'
})

function applyTheme(v) {
  let isLight
  if (v === 'light')     isLight = true
  else if (v === 'dark') isLight = false
  else if (v === 'auto') isLight = !autoIsDark.value
  else                   isLight = !systemDark.matches
  document.documentElement.classList.toggle('light-theme', isLight)
}
applyTheme(theme.value)

export function isAutoNight() { const h = new Date().getHours(); return h < 6 || h >= 20 }

const tileConfig     = ref(loadTileConfig())
const unitPrefs      = ref(loadUnitPrefs())
const timeFormat     = ref(localStorage.getItem(TIME_FORMAT_KEY) ?? '12h')
const dailyFirst     = ref(localStorage.getItem(CHART_ORDER_KEY) === 'true')
const showSim        = ref(localStorage.getItem(SIM_KEY) === 'true')
const pwsEnabled      = ref(localStorage.getItem(PWS_ENABLED_STG) !== 'false')
const pwsApiKey       = ref(localStorage.getItem(PWS_KEY_STG) ?? '')
const tempestEnabled  = ref(localStorage.getItem(TEMPEST_ENABLED_STG) !== 'false')
const tempestToken    = ref(localStorage.getItem(TEMPEST_TOKEN_STG) ?? '')
const activeDataType = ref(localStorage.getItem(DATATYPE_KEY) ?? 'temperature')

// ── Persistence ───────────────────────────────────────────────────────────────
watch(theme,         (v) => { localStorage.setItem(THEME_KEY, v); applyTheme(v) })
watch(tileConfig,    (v) => { try { localStorage.setItem(TILES_KEY, JSON.stringify(v)) } catch {} }, { deep: true })
watch(unitPrefs,     (v) => { try { localStorage.setItem(UNIT_PREFS_KEY, JSON.stringify(v)) } catch {} }, { deep: true })
watch(timeFormat,    (v) => localStorage.setItem(TIME_FORMAT_KEY, v))
watch(dailyFirst,    (v) => localStorage.setItem(CHART_ORDER_KEY, String(v)))
watch(showSim,       (v) => localStorage.setItem(SIM_KEY, String(v)))
watch(pwsEnabled,     (v) => localStorage.setItem(PWS_ENABLED_STG, String(v)))
watch(pwsApiKey,      (v) => { try { if (v) localStorage.setItem(PWS_KEY_STG, v); else localStorage.removeItem(PWS_KEY_STG) } catch {} })
watch(tempestEnabled, (v) => localStorage.setItem(TEMPEST_ENABLED_STG, String(v)))
watch(tempestToken,   (v) => { try { if (v) localStorage.setItem(TEMPEST_TOKEN_STG, v); else localStorage.removeItem(TEMPEST_TOKEN_STG) } catch {} })
watch(activeDataType,(v) => localStorage.setItem(DATATYPE_KEY, v))
watch(autoIsDark,    () => { if (theme.value === 'auto') applyTheme('auto') })
systemDark.addEventListener('change', (e) => { systemIsDark.value = e.matches; if (theme.value === 'system') applyTheme('system') })

// ── Tile helpers ──────────────────────────────────────────────────────────────
function reorderTiles(from, to) {
  const arr = [...tileConfig.value]
  const [item] = arr.splice(from, 1)
  arr.splice(to, 0, item)
  tileConfig.value = arr
}

function toggleTile(i) {
  const arr = tileConfig.value.map((t, idx) => idx === i ? { ...t, enabled: !t.enabled } : t)
  if (!arr[i].enabled && activeDataType.value === arr[i].type) activeDataType.value = 'temperature'
  tileConfig.value = arr
}

function setAllTiles(enabled) {
  tileConfig.value = tileConfig.value.map(t => t.type === 'pageBreak' ? t : { ...t, enabled })
  if (!enabled) activeDataType.value = 'temperature'
}

function addPageBreak(afterIndex) {
  const arr = [...tileConfig.value]
  arr.splice(afterIndex + 1, 0, { type: 'pageBreak' })
  tileConfig.value = arr
}

function removePageBreak(index) {
  tileConfig.value = tileConfig.value.filter((_, i) => i !== index)
}

export function useSettings() {
  return {
    theme, resolvedTheme, timeFormat, dailyFirst, showSim,
    tileConfig, unitPrefs, pwsEnabled, pwsApiKey, tempestEnabled, tempestToken, activeDataType,
    UNIT_OPTIONS, TILE_META,
    toggleTile, setAllTiles, reorderTiles, addPageBreak, removePageBreak,
  }
}
