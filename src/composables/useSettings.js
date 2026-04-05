import { ref, computed, watch } from 'vue'
import { APP_STORAGE_PREFIX } from '../config.js'
import { DATA_TYPE_LIST } from '../utils/dataTypes.js'

const P = APP_STORAGE_PREFIX

const PWS_KEY_STG          = `${P}-pws-key`
const PWS_ENABLED_STG      = `${P}-pws-enabled`
const TEMPEST_TOKEN_STG    = `${P}-tempest-token`
const TEMPEST_ENABLED_STG  = `${P}-tempest-enabled`
const OPEN_METEO_MODEL_STG = `${P}-open-meteo-model`
const UNIT_PREFS_KEY  = `${P}-unitprefs`
const LEGACY_UNITS_KEY = `${P}-units`
const SIM_KEY         = `${P}-sim`
const TILES_KEY       = `${P}-tiles`
const CARDS_KEY       = `${P}-cardconfig`
const CHART_ORDER_KEY = `${P}-chartorder`
const TIME_FORMAT_KEY = `${P}-timeformat`
const THEME_KEY       = `${P}-theme`
const DATATYPE_KEY      = `${P}-datatype`
const DAILY_SUMMARY_KEY = `${P}-dailysummary`
const DAILY_FORECAST_LAYOUT_KEY   = `${P}-daily-forecast-layout`
const HOURLY_FORECAST_LAYOUT_KEY  = `${P}-hourly-forecast-layout`
const SCENE_OVERLAY_LAYOUT_KEY    = `${P}-scene-overlay-layout`
const WARNINGS_CONFIG_KEY         = `${P}-warnings-config`
const CUSTOM_ALERTS_KEY           = `${P}-custom-alerts`
const CUSTOM_ALERTS_CONFIG_KEY    = `${P}-custom-alerts-config`
const CARD_STYLE_KEY              = `${P}-card-style`

export const SCENE_OVERLAY_SLOT_OPTIONS = [
  { type: 'none',      label: 'None',      iconKey: null },
  { type: 'condition', label: 'Condition', iconKey: null },
  ...DATA_TYPE_LIST
    .filter(t => !t.isMap)
    .map(t => ({ type: t.id, label: t.shortLabel, iconKey: t.iconKey ?? t.id })),
]

export const DEFAULT_SCENE_OVERLAY_LAYOUT = {
  slots: ['condition', 'rainAmount', 'wind'],
  showIcon:  true,
  showTemp:  true,
  showSlots: true,
}

export const MAIN_DATA_POINT_OPTIONS = DATA_TYPE_LIST
  .filter(t => !t.isMap)
  .map(t => ({ type: t.id, label: t.shortLabel, iconKey: t.iconKey ?? t.id }))

export const HOURLY_MAIN_DATA_POINT_OPTIONS = DATA_TYPE_LIST
  .filter(t => !t.isMap && t.hourlyKey != null)
  .map(t => ({ type: t.id, label: t.shortLabel, iconKey: t.iconKey ?? t.id }))

const DEFAULT_CHART_ENABLED = new Set(['temp','rainAmount', 'rainProb', 'wind'])
const DEFAULT_PICKER_ENABLED = new Set(['feelsLike','rainAmount', 'wind', 'cloudCover'])

export const DEFAULT_DAILY_FORECAST_LAYOUT = {
  showTitle:           true,
  showConditions:      true,
  showDataPointPicker: true,
  mainDataPoint:       'temperature',
  otherDataPoints:     DATA_TYPE_LIST.filter(t => !t.isMap).map(t => ({ type: t.id, enabled: DEFAULT_CHART_ENABLED.has(t.id), showInPicker: DEFAULT_PICKER_ENABLED.has(t.id) })),
}

const DEFAULT_HOURLY_CHART_ENABLED  = new Set(['rainAmount', 'rainProb', 'wind'])
const DEFAULT_HOURLY_PICKER_ENABLED = new Set(['feelsLike', 'rainAmount', 'wind', 'cloudCover'])

export const DEFAULT_HOURLY_FORECAST_LAYOUT = {
  showTitle:           true,
  showConditions:      true,
  showDataPointPicker: false,
  showSunriseSunset:   false,
  mainDataPoint:       'temperature',
  otherDataPoints:     DATA_TYPE_LIST
    .filter(t => !t.isMap && t.hourlyKey != null)
    .map(t => ({ type: t.id, enabled: DEFAULT_HOURLY_CHART_ENABLED.has(t.id), showInPicker: DEFAULT_HOURLY_PICKER_ENABLED.has(t.id) })),
}

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

export const CARD_META = {
  combinedHourly:  { icon: '🕐', label: 'Hourly Forecast' },
  dailyForecast:   { icon: '📅', label: 'Daily Forecast' },
  sunriseMoon:     { icon: '🌙', label: 'Sun & Moon' },
  radar:           { icon: '🛰️', label: 'Radar' },
  customAlerts:    { icon: '🔔', label: 'Custom Alerts' },
  weatherWarnings: { icon: '⚠️', label: 'Weather Warnings' },
}

const DEFAULT_CARDS = [
  { type: 'weatherWarnings', enabled: false },
  { type: 'customAlerts',    enabled: false },
  { type: 'dailyForecast',   enabled: true },
  { type: 'combinedHourly',  enabled: true },
  { type: 'sunriseMoon',     enabled: true },
  { type: 'radar',           enabled: true },
]

export const DEFAULT_WARNINGS_CONFIG = { show: 'always', feedOverride: null, locationFilter: 'location' }

function loadWarningsConfig() {
  try {
    const raw = JSON.parse(localStorage.getItem(WARNINGS_CONFIG_KEY))
    if (raw && typeof raw === 'object') return { ...DEFAULT_WARNINGS_CONFIG, ...raw }
  } catch {}
  return { ...DEFAULT_WARNINGS_CONFIG }
}

export const DEFAULT_CUSTOM_ALERTS_CONFIG = { show: 'always' }

function loadCustomAlertsConfig() {
  try {
    const raw = JSON.parse(localStorage.getItem(CUSTOM_ALERTS_CONFIG_KEY))
    if (raw && typeof raw === 'object') return { ...DEFAULT_CUSTOM_ALERTS_CONFIG, ...raw }
  } catch {}
  return { ...DEFAULT_CUSTOM_ALERTS_CONFIG }
}

function loadCustomAlerts() {
  try {
    const raw = JSON.parse(localStorage.getItem(CUSTOM_ALERTS_KEY))
    if (Array.isArray(raw)) return raw
  } catch {}
  return []
}

function loadSceneOverlayLayout() {
  try {
    const raw = JSON.parse(localStorage.getItem(SCENE_OVERLAY_LAYOUT_KEY))
    if (raw && Array.isArray(raw.slots) && raw.slots.length === 3) {
      return { ...DEFAULT_SCENE_OVERLAY_LAYOUT, ...raw }
    }
  } catch {}
  return { ...DEFAULT_SCENE_OVERLAY_LAYOUT }
}

function loadDailyForecastLayout() {
  try {
    const raw = JSON.parse(localStorage.getItem(DAILY_FORECAST_LAYOUT_KEY))
    if (raw && typeof raw === 'object') {
      let otherPts = Array.isArray(raw.otherDataPoints)
        ? raw.otherDataPoints
        : DEFAULT_DAILY_FORECAST_LAYOUT.otherDataPoints.map(p => ({ ...p }))
      // Strip legacy isMain flag and any stray 'rain' entries (not a valid other data point)
      const STRIP_TYPES = new Set(['rain'])
      otherPts = otherPts
        .filter(p => !STRIP_TYPES.has(p.type))
        .map(({ isMain, ...rest }) => rest)
      const seenTypes = new Set()
      otherPts = otherPts.filter(p => seenTypes.has(p.type) ? false : seenTypes.add(p.type))
      // Append any new default entries not yet in saved config
      for (const d of DEFAULT_DAILY_FORECAST_LAYOUT.otherDataPoints) {
        if (!seenTypes.has(d.type)) otherPts.push({ ...d })
      }
      return { ...DEFAULT_DAILY_FORECAST_LAYOUT, ...raw, otherDataPoints: otherPts }
    }
  } catch {}
  return { ...DEFAULT_DAILY_FORECAST_LAYOUT, otherDataPoints: DEFAULT_DAILY_FORECAST_LAYOUT.otherDataPoints.map(p => ({ ...p })) }
}

function loadHourlyForecastLayout() {
  try {
    const raw = JSON.parse(localStorage.getItem(HOURLY_FORECAST_LAYOUT_KEY))
    if (raw && typeof raw === 'object') {
      let otherPts = Array.isArray(raw.otherDataPoints)
        ? raw.otherDataPoints
        : DEFAULT_HOURLY_FORECAST_LAYOUT.otherDataPoints.map(p => ({ ...p }))
      const seenTypes = new Set()
      otherPts = otherPts.filter(p => seenTypes.has(p.type) ? false : seenTypes.add(p.type))
      for (const d of DEFAULT_HOURLY_FORECAST_LAYOUT.otherDataPoints) {
        if (!seenTypes.has(d.type)) otherPts.push({ ...d })
      }
      return { ...DEFAULT_HOURLY_FORECAST_LAYOUT, ...raw, otherDataPoints: otherPts }
    }
  } catch {}
  return { ...DEFAULT_HOURLY_FORECAST_LAYOUT, otherDataPoints: DEFAULT_HOURLY_FORECAST_LAYOUT.otherDataPoints.map(p => ({ ...p })) }
}

function loadCardConfig() {
  try {
    const raw = JSON.parse(localStorage.getItem(CARDS_KEY))
    if (Array.isArray(raw) && raw.every(c => c.type)) {
      const known = new Set(Object.keys(CARD_META))
      const valid = raw.filter(c => known.has(c.type))
      const seen  = new Set(valid.map(c => c.type))
      for (const d of DEFAULT_CARDS) { if (!seen.has(d.type)) valid.push({ ...d }) }
      return valid
    }
  } catch {}
  return DEFAULT_CARDS.map(c => ({ ...c }))
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

const cardStyle      = ref(localStorage.getItem(CARD_STYLE_KEY) ?? 'cards')
const cardConfig     = ref(loadCardConfig())
const tileConfig     = ref(loadTileConfig())
const unitPrefs      = ref(loadUnitPrefs())
const timeFormat     = ref(localStorage.getItem(TIME_FORMAT_KEY) ?? '12h')
const hourlyFirst    = ref(localStorage.getItem(CHART_ORDER_KEY) === 'true')
const showSim        = ref(localStorage.getItem(SIM_KEY) === 'true')
const pwsEnabled      = ref(localStorage.getItem(PWS_ENABLED_STG) !== 'false')
const pwsApiKey       = ref(localStorage.getItem(PWS_KEY_STG) ?? '')
const tempestEnabled   = ref(localStorage.getItem(TEMPEST_ENABLED_STG) !== 'false')
const tempestToken     = ref(localStorage.getItem(TEMPEST_TOKEN_STG) ?? '')
const openMeteoModel   = ref(localStorage.getItem(OPEN_METEO_MODEL_STG) ?? 'best_match')
const activeDataType   = ref(localStorage.getItem(DATATYPE_KEY) ?? 'temperature')
const showDailySummary = ref(localStorage.getItem(DAILY_SUMMARY_KEY) !== 'false')
const dailyForecastLayout  = ref(loadDailyForecastLayout())
const hourlyForecastLayout = ref(loadHourlyForecastLayout())
const sceneOverlayLayout   = ref(loadSceneOverlayLayout())
const warningsConfig       = ref(loadWarningsConfig())
const customAlertsConfig   = ref(loadCustomAlertsConfig())
const customAlerts         = ref(loadCustomAlerts())

// ── Persistence ───────────────────────────────────────────────────────────────
watch(theme,         (v) => { localStorage.setItem(THEME_KEY, v); applyTheme(v) })
watch(cardStyle,     (v) => localStorage.setItem(CARD_STYLE_KEY, v))
watch(cardConfig,    (v) => { try { localStorage.setItem(CARDS_KEY, JSON.stringify(v)) } catch {} }, { deep: true })
watch(tileConfig,    (v) => { try { localStorage.setItem(TILES_KEY, JSON.stringify(v)) } catch {} }, { deep: true })
watch(unitPrefs,     (v) => { try { localStorage.setItem(UNIT_PREFS_KEY, JSON.stringify(v)) } catch {} }, { deep: true })
watch(timeFormat,    (v) => localStorage.setItem(TIME_FORMAT_KEY, v))
watch(hourlyFirst,   (v) => localStorage.setItem(CHART_ORDER_KEY, String(v)))
watch(showSim,       (v) => localStorage.setItem(SIM_KEY, String(v)))
watch(pwsEnabled,     (v) => localStorage.setItem(PWS_ENABLED_STG, String(v)))
watch(pwsApiKey,      (v) => { try { if (v) localStorage.setItem(PWS_KEY_STG, v); else localStorage.removeItem(PWS_KEY_STG) } catch {} })
watch(tempestEnabled,  (v) => localStorage.setItem(TEMPEST_ENABLED_STG, String(v)))
watch(tempestToken,    (v) => { try { if (v) localStorage.setItem(TEMPEST_TOKEN_STG, v); else localStorage.removeItem(TEMPEST_TOKEN_STG) } catch {} })
watch(openMeteoModel,  (v) => localStorage.setItem(OPEN_METEO_MODEL_STG, v))
watch(activeDataType,   (v) => localStorage.setItem(DATATYPE_KEY, v))
watch(showDailySummary,      (v) => localStorage.setItem(DAILY_SUMMARY_KEY, String(v)))
watch(dailyForecastLayout,   (v) => { try { localStorage.setItem(DAILY_FORECAST_LAYOUT_KEY, JSON.stringify(v)) } catch {} }, { deep: true })
watch(hourlyForecastLayout,  (v) => { try { localStorage.setItem(HOURLY_FORECAST_LAYOUT_KEY, JSON.stringify(v)) } catch {} }, { deep: true })
watch(sceneOverlayLayout,    (v) => { try { localStorage.setItem(SCENE_OVERLAY_LAYOUT_KEY, JSON.stringify(v)) } catch {} }, { deep: true })
watch(warningsConfig,        (v) => { try { localStorage.setItem(WARNINGS_CONFIG_KEY,      JSON.stringify(v)) } catch {} }, { deep: true })
watch(customAlertsConfig,    (v) => { try { localStorage.setItem(CUSTOM_ALERTS_CONFIG_KEY,  JSON.stringify(v)) } catch {} }, { deep: true })
watch(customAlerts,          (v) => { try { localStorage.setItem(CUSTOM_ALERTS_KEY,         JSON.stringify(v)) } catch {} }, { deep: true })
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

// ── Daily forecast layout helpers ────────────────────────────────────────────
function toggleDailyOtherPoint(type) {
  const pts = dailyForecastLayout.value.otherDataPoints.map(p =>
    p.type === type ? { ...p, enabled: !p.enabled } : p
  )
  dailyForecastLayout.value = { ...dailyForecastLayout.value, otherDataPoints: pts }
}

function toggleDailyOtherPointPicker(type) {
  const pts = dailyForecastLayout.value.otherDataPoints.map(p =>
    p.type === type ? { ...p, showInPicker: !p.showInPicker } : p
  )
  dailyForecastLayout.value = { ...dailyForecastLayout.value, otherDataPoints: pts }
}

function reorderDailyOtherPoints(from, to) {
  const arr = [...dailyForecastLayout.value.otherDataPoints]
  const [item] = arr.splice(from, 1)
  arr.splice(to, 0, item)
  dailyForecastLayout.value = { ...dailyForecastLayout.value, otherDataPoints: arr }
}

function setDailyMainDataPoint(type) {
  dailyForecastLayout.value = { ...dailyForecastLayout.value, mainDataPoint: type }
}

// ── Hourly forecast layout helpers ───────────────────────────────────────────
function toggleHourlyOtherPoint(type) {
  const pts = hourlyForecastLayout.value.otherDataPoints.map(p =>
    p.type === type ? { ...p, enabled: !p.enabled } : p
  )
  hourlyForecastLayout.value = { ...hourlyForecastLayout.value, otherDataPoints: pts }
}

function toggleHourlyOtherPointPicker(type) {
  const pts = hourlyForecastLayout.value.otherDataPoints.map(p =>
    p.type === type ? { ...p, showInPicker: !p.showInPicker } : p
  )
  hourlyForecastLayout.value = { ...hourlyForecastLayout.value, otherDataPoints: pts }
}

function reorderHourlyOtherPoints(from, to) {
  const arr = [...hourlyForecastLayout.value.otherDataPoints]
  const [item] = arr.splice(from, 1)
  arr.splice(to, 0, item)
  hourlyForecastLayout.value = { ...hourlyForecastLayout.value, otherDataPoints: arr }
}

function setHourlyMainDataPoint(type) {
  hourlyForecastLayout.value = { ...hourlyForecastLayout.value, mainDataPoint: type }
}

// ── Scene overlay helpers ─────────────────────────────────────────────────────
function setSceneOverlaySlot(idx, type) {
  const slots = [...sceneOverlayLayout.value.slots]
  slots[idx] = type
  sceneOverlayLayout.value = { ...sceneOverlayLayout.value, slots }
}

// ── Card helpers ──────────────────────────────────────────────────────────────
function toggleCard(type) {
  cardConfig.value = cardConfig.value.map(c => c.type === type ? { ...c, enabled: !c.enabled } : c)
}

function reorderCards(from, to) {
  const arr = [...cardConfig.value]
  const [item] = arr.splice(from, 1)
  arr.splice(to, 0, item)
  cardConfig.value = arr
}

export function useSettings() {
  return {
    theme, resolvedTheme, cardStyle, timeFormat, hourlyFirst, showSim, showDailySummary,
    tileConfig, cardConfig, unitPrefs, pwsEnabled, pwsApiKey, tempestEnabled, tempestToken, openMeteoModel, activeDataType,
    dailyForecastLayout, hourlyForecastLayout,
    UNIT_OPTIONS, TILE_META, CARD_META,
    toggleTile, setAllTiles, reorderTiles, addPageBreak, removePageBreak,
    toggleCard, reorderCards,
    toggleDailyOtherPoint, toggleDailyOtherPointPicker, reorderDailyOtherPoints, setDailyMainDataPoint,
    toggleHourlyOtherPoint, toggleHourlyOtherPointPicker, reorderHourlyOtherPoints, setHourlyMainDataPoint,
    sceneOverlayLayout, setSceneOverlaySlot,
    warningsConfig,
    customAlertsConfig, customAlerts,
  }
}
