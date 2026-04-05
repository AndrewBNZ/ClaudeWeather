<template>
  <div class="sc-overlay">
    <div class="sc-inner" @pointerdown="onPointerDown" @pointerup="onPointerUp" @pointercancel="onPointerCancel" @click="onClick" @contextmenu.prevent="onContextMenu">
      <!-- Left: icon + temp + condition -->
      <div class="sc-left">
        <span v-if="sceneOverlayLayout.showIcon" class="sc-icon">{{ info.emoji }}</span>
        <div v-if="sceneOverlayLayout.showTemp" class="sc-temp-group">
          <span class="sc-temp">{{ fmt(data.temperature_2m, 1) }}<span class="sc-unit">{{ tempUnit }}</span></span>
          <div v-if="todayHigh != null" class="sc-hl">
            <span>H {{ fmt(todayHigh, 0) }}°</span>
            <span class="sc-hl-low">L {{ fmt(todayLow, 0) }}°</span>
          </div>
        </div>
      </div>

      <!-- Right: configurable slots -->
      <div v-if="sceneOverlayLayout.showSlots" class="sc-right">
        <div v-if="showConditionSlot" class="sc-right-item">{{ info.label }}</div>
        <div v-if="dataSlots.length" class="sc-data-grid">
          <template v-for="slot in dataSlots" :key="slot.type">
            <span class="sc-tile-icon" v-html="slot.icon"></span>
            <span class="sc-data-val">{{ slot.value }}</span>
            <span class="sc-data-unit">{{ slot.unit }}</span>
            <svg v-if="slot.type === 'wind' && data.wind_direction_10m != null" class="sc-wind-arrow" width="17" height="17" viewBox="0 0 14 14" fill="none" aria-hidden="true"
                 :style="{ transform: `rotate(${data.wind_direction_10m + 180}deg)`, transformOrigin: '50% 50%' }">
              <line x1="7" y1="12" x2="7" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <polygon points="7,2 4,7 10,7" fill="currentColor"/>
            </svg>
            <span v-else-if="slot.type !== 'wind'"></span>
            <span v-else></span>
          </template>
        </div>
      </div>
    </div>
  </div>

  <Teleport to="body">
    <div v-if="showPanel" class="cond-backdrop" @click="showPanel = false" />
    <Transition name="sheet-slide">
      <div v-if="showPanel" class="cond-panel">
        <div class="cond-header">
          <span class="cond-title">Current Conditions</span>
          <button class="cond-close" @click="showPanel = false">✕</button>
        </div>
        <div class="cond-condition-row">
          <span class="cond-subtitle">{{ info.emoji }} {{ info.label }}</span>
        </div>
        <div class="cond-scroll">
          <div class="cond-grid">
            <div v-for="tile in tiles" :key="tile.id" class="cond-tile">
              <div class="cond-tile-head">
                <span class="cond-tile-icon" v-html="tile.icon"></span>
                <span class="cond-tile-label" :style="{ color: tile.color }">{{ tile.label }}</span>
                <span v-if="tile.fromStation" class="cond-tile-pws-dot" :title="props.pwsName ? `PWS: ${props.pwsName}` : 'PWS: Personal weather station'"></span>
              </div>
              <div class="cond-tile-value">
                {{ tile.value }}<span v-if="tile.unit" class="cond-tile-unit">{{ tile.unit }}</span>
              </div>
              <div v-if="tile.sub" class="cond-tile-sub">
                <svg v-if="tile.windDeg != null" class="cond-wind-arrow" width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true"
                     :style="{ transform: `rotate(${tile.windDeg + 180}deg)`, transformOrigin: '50% 50%' }">
                  <line x1="7" y1="12" x2="7" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  <polygon points="7,2 4,7 10,7" fill="currentColor"/>
                </svg>
                {{ tile.sub }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { getWeatherInfo } from '../utils/weatherCodes.js'
import { DATA_TYPES } from '../utils/dataTypes.js'
import { TILE_ICONS } from '../utils/tileIcons.js'
import { useSettings } from '../composables/useSettings.js'

const props = defineProps({
  data:         { type: Object,  required: true },
  daily:        { type: Object,  default: null },
  unitPrefs:    { type: Object,  required: true },
  blocked:      { type: Boolean, default: false },
  pwsDataActive:{ type: Boolean, default: false },
  pwsName:      { type: String,  default: null },
})

const emit = defineEmits(['panel-change', 'open-settings'])

const { timeFormat, sceneOverlayLayout } = useSettings()

const showPanel = ref(false)

// ── Tap-and-hold ──────────────────────────────────────────────────────────────
let holdTimer = null
let holdFired = false

function onPointerDown() {
  if (props.blocked) return
  holdFired = false
  holdTimer = setTimeout(() => {
    holdFired = true
    navigator.vibrate?.(30)
    emit('open-settings', 'sceneConditions')
  }, 500)
}

function onPointerUp() {
  if (holdTimer) { clearTimeout(holdTimer); holdTimer = null }
}

function onPointerCancel() {
  if (holdTimer) { clearTimeout(holdTimer); holdTimer = null }
}

// Android Chrome fires pointercancel when contextmenu fires, which would clear
// the timer before settings opens. Open settings directly from contextmenu instead.
function onContextMenu() {
  if (props.blocked) return
  if (holdTimer) { clearTimeout(holdTimer); holdTimer = null }
  holdFired = true
  emit('open-settings', 'sceneConditions')
}

function onClick() {
  if (!holdFired && !props.blocked) showPanel.value = true
}


watch(showPanel, (open) => emit('panel-change', open))
const info      = computed(() => getWeatherInfo(props.data.weather_code))
const tempUnit  = computed(() => DATA_TYPES.temperature.getUnit(props.unitPrefs))
const todayHigh = computed(() => props.daily?.temperature_2m_max?.[0] ?? null)
const todayLow  = computed(() => props.daily?.temperature_2m_min?.[0] ?? null)

// ── Slot rendering ────────────────────────────────────────────────────────────
const showConditionSlot = computed(() => sceneOverlayLayout.value.slots.includes('condition'))

const dataSlots = computed(() => {
  const d  = props.data
  const up = props.unitPrefs
  return sceneOverlayLayout.value.slots
    .filter(s => s !== 'condition' && s !== 'none')
    .map(type => {
      const cfg = DATA_TYPES[type]
      if (!cfg) return null
      const icon = TILE_ICONS[cfg.iconKey ?? type]
      let value = '–'
      if (cfg.hourlyKey && d[cfg.hourlyKey] != null) {
        const raw = cfg.scale ? cfg.scale(d[cfg.hourlyKey], up) : d[cfg.hourlyKey]
        const dec = Math.min(cfg.getDecimals ? cfg.getDecimals(up) : (cfg.decimals ?? 0), 1)
        value = Number(raw).toFixed(dec)
      }
      const unit = cfg.getUnit ? cfg.getUnit(up) : ''
      return { type, icon, value, unit }
    })
    .filter(Boolean)
})

function fmt(v, decimals) {
  if (v == null) return '–'
  return Number(v).toFixed(decimals)
}

function fmtTime(isoStr) {
  if (!isoStr) return '–'
  const [h, m] = isoStr.slice(11, 16).split(':').map(Number)
  if (timeFormat.value !== '24h') {
    const ampm = h >= 12 ? 'PM' : 'AM'
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function windCardinal(deg) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round(deg / 45) % 8]
}

// ── Moon phase ──────────────────────────────────────────────────────────────
const KNOWN_NEW_MOON  = new Date('2000-01-06T18:14:00Z').getTime()
const LUNAR_PERIOD_MS = 29.53058867 * 24 * 60 * 60 * 1000

const moonPhase = computed(() => {
  const t = Date.now()
  return ((t - KNOWN_NEW_MOON) % LUNAR_PERIOD_MS + LUNAR_PERIOD_MS) % LUNAR_PERIOD_MS / LUNAR_PERIOD_MS
})

const moonPhaseName = computed(() => {
  const p = moonPhase.value
  if (p < 0.02 || p > 0.98) return 'New Moon'
  if (p < 0.23)              return 'Waxing Crescent'
  if (p < 0.27)              return 'First Quarter'
  if (p < 0.48)              return 'Waxing Gibbous'
  if (p < 0.52)              return 'Full Moon'
  if (p < 0.73)              return 'Waning Gibbous'
  if (p < 0.77)              return 'Last Quarter'
  return 'Waning Crescent'
})

const moonIllumination = computed(() =>
  Math.round((1 - Math.cos(2 * Math.PI * moonPhase.value)) / 2 * 100)
)

// ── Tiles ───────────────────────────────────────────────────────────────────
const STATION_TILE_IDS = new Set(['temperature', 'feelsLike', 'rain', 'wind', 'humidity', 'uv', 'pressure'])

const tiles = computed(() => {
  const d     = props.data
  const up    = props.unitPrefs
  const daily = props.daily
  const pws   = props.pwsDataActive

  function scaledFmt(id, v) {
    if (v == null) return '–'
    const cfg    = DATA_TYPES[id]
    const scaled = cfg.scale ? cfg.scale(v, up) : v
    const dec    = cfg.getDecimals ? cfg.getDecimals(up) : cfg.decimals
    return Number(scaled).toFixed(dec)
  }

  const st = (id, tile) => ({ ...tile, fromStation: pws && STATION_TILE_IDS.has(id) })

  return [
    st('temperature', {
      id: 'temperature', label: 'Temperature',
      icon: TILE_ICONS.temperature, color: '#f97316',
      value: fmt(d.temperature_2m, 1),
      unit: DATA_TYPES.temperature.getUnit(up),
      sub: todayHigh.value != null ? `H ${fmt(todayHigh.value, 0)}°  ·  L ${fmt(todayLow.value, 0)}°` : null,
    }),
    st('feelsLike', {
      id: 'feelsLike', label: 'Feels Like',
      icon: TILE_ICONS.feelsLike, color: '#a855f7',
      value: fmt(d.apparent_temperature, 1),
      unit: DATA_TYPES.feelsLike.getUnit(up),
    }),
    st('rain', {
      id: 'rain', label: 'Precipitation',
      icon: TILE_ICONS.rain, color: '#3b82f6',
      value: fmt(d.precipitation, 1),
      unit: DATA_TYPES.rainAmount.getUnit(up),
      sub: d.precipitation_probability != null ? `${fmt(d.precipitation_probability, 0)}% chance` : null,
    }),
    st('wind', {
      id: 'wind', label: 'Wind',
      icon: TILE_ICONS.wind, color: '#06b6d4',
      value: fmt(d.wind_speed_10m, DATA_TYPES.wind.decimals ?? 0),
      unit: DATA_TYPES.wind.getUnit(up),
      sub: d.wind_direction_10m != null ? windCardinal(d.wind_direction_10m) : null,
      windDeg: d.wind_direction_10m ?? null,
    }),
    st('humidity', {
      id: 'humidity', label: 'Humidity',
      icon: TILE_ICONS.humidity, color: '#14b8a6',
      value: fmt(d.relative_humidity_2m, 0),
      unit: '%',
    }),
    st('uv', {
      id: 'uv', label: 'UV Index',
      icon: TILE_ICONS.uv, color: '#eab308',
      value: fmt(d.uv_index, 1),
      unit: '',
    }),
    st('cloudCover', {
      id: 'cloudCover', label: 'Cloud Cover',
      icon: TILE_ICONS.cloudCover, color: '#94a3b8',
      value: fmt(d.cloud_cover, 0),
      unit: '%',
    }),
    st('visibility', {
      id: 'visibility', label: 'Visibility',
      icon: TILE_ICONS.visibility, color: '#22d3ee',
      value: scaledFmt('visibility', d.visibility),
      unit: DATA_TYPES.visibility.getUnit(up),
    }),
    st('pressure', {
      id: 'pressure', label: 'Pressure',
      icon: TILE_ICONS.pressure, color: '#818cf8',
      value: scaledFmt('pressure', d.surface_pressure),
      unit: DATA_TYPES.pressure.getUnit(up),
    }),
    st('moon', {
      id: 'moon', label: 'Moon Phase',
      icon: TILE_ICONS.moon, color: '#a5b4fc',
      value: moonPhaseName.value,
      unit: '',
      sub: `${moonIllumination.value}% illuminated`,
    }),
    st('sunrise', {
      id: 'sunrise', label: 'Sunrise',
      icon: TILE_ICONS.sunrise, color: '#fb923c',
      value: fmtTime(daily?.sunrise?.[0]),
      unit: '',
    }),
    st('sunset', {
      id: 'sunset', label: 'Sunset',
      icon: TILE_ICONS.sunset, color: '#f472b6',
      value: fmtTime(daily?.sunset?.[0]),
      unit: '',
    }),
  ]
})
</script>

<style scoped>
/* ── Scene overlay (tap target) ─────────────────────────────────────────── */
.sc-overlay {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sc-inner {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 24px;
  pointer-events: auto;
  cursor: pointer;
  -webkit-touch-callout: none;
  user-select: none;
}

/* Left column */
.sc-left {
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 10px;
  flex: 1;
}

.sc-icon {
  font-size: 3rem;
  line-height: 1;
  filter: drop-shadow(0 2px 8px rgba(0,0,0,0.45));
  flex-shrink: 0;
  margin-top: 3px;
}

.sc-temp-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sc-temp {
  font-size: 2.2rem;
  font-weight: 700;
  letter-spacing: -1px;
  line-height: 1;
  color: #fff;
  text-shadow: 0 1px 8px rgba(0,0,0,0.55);
}

.sc-unit {
  font-size: 1.3rem;
  font-weight: 400;
  margin-left: 2px;
  color: rgba(255,255,255,0.8);
}

.sc-hl {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 0.95rem;
  font-weight: 600;
  color: rgba(255,255,255,0.8);
  text-shadow: 0 1px 4px rgba(0,0,0,0.5);
}

.sc-hl-low {
  opacity: 0.7;
}

/* Right column */
.sc-right {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
  flex: 1;
}

.sc-right-item {
  font-size: 0.85rem;
  font-weight: 500;
  color: rgba(255,255,255,0.85);
  text-shadow: 0 1px 4px rgba(0,0,0,0.5);
  white-space: nowrap;
}

.sc-data-grid {
  display: grid;
  grid-template-columns: 20px 3.5ch auto auto;
  align-items: center;
  gap: 7px 5px;
  font-size: 0.85rem;
  font-weight: 500;
  color: rgba(255,255,255,0.85);
  text-shadow: 0 1px 4px rgba(0,0,0,0.5);
}

.sc-data-val {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.sc-data-unit {
  white-space: nowrap;
}

.sc-data-secondary {
  opacity: 0.65;
  font-size: 0.78rem;
}

.sc-tile-icon {
  display: inline-flex;
  align-items: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}
.sc-tile-icon :deep(svg) {
  width: 20px;
  height: 20px;
}

.sc-wind-arrow {
  color: rgba(255,255,255,0.75);
  vertical-align: middle;
  flex-shrink: 0;
}

/* ── Backdrop ───────────────────────────────────────────────────────────── */
.cond-backdrop {
  position: fixed;
  inset: 0;
  z-index: 249;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

/* ── Conditions panel (bottom sheet) ───────────────────────────────────── */
.cond-panel {
  position: fixed;
  left: 50%;
  right: auto;
  transform: translateX(-50%);
  width: 100%;
  max-width: 640px;
  bottom: 0;
  z-index: 250;
  background: var(--panel-bg, #1e2130);
  border: 1px solid var(--panel-border, rgba(255,255,255,0.08));
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  height: 65dvh;
  overflow: hidden;
}

.cond-handle {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--panel-border);
  margin: 10px auto 0;
  flex-shrink: 0;
}

.cond-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--panel-border, rgba(255,255,255,0.08));
  flex-shrink: 0;
}

.cond-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
}

.cond-condition-row {
  display: flex;
  justify-content: center;
  padding: 10px 16px 10px;
  flex-shrink: 0;
}

.cond-subtitle {
  font-size: 0.95rem;
  color: var(--text);
  font-weight: 500;
}

.cond-close {
  background: none;
  border: none;
  color: inherit;
  opacity: 0.45;
  font-size: 1rem;
  padding: 0.2rem 0.4rem;
  cursor: pointer;
  line-height: 1;
}
.cond-close:hover { opacity: 0.8; }

.cond-scroll {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.cond-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-auto-rows: 80px;
  gap: 8px;
  padding: 0 12px 12px 12px;
}

.cond-tile {
  background: var(--btn-bg);
  border-radius: 8px;
  padding: 10px 12px;
  min-width: 0;
}

.cond-tile-head {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 5px;
}
.cond-tile-pws-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #38bdf8;
  flex-shrink: 0;
  margin-left: auto;
  opacity: 0.85;
}

.cond-tile-icon {
  display: inline-flex;
  align-items: center;
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}
.cond-tile-icon :deep(svg) {
  width: 15px;
  height: 15px;
}

.cond-tile-label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cond-tile-value {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  line-height: 1.2;
  word-break: break-word;
}

.cond-tile-unit {
  font-size: 0.78rem;
  font-weight: 400;
  color: var(--text-muted);
  margin-left: 3px;
}

.cond-tile-sub {
  font-size: 0.72rem;
  color: var(--text-faint);
  margin-top: 2px;
  display: flex;
  align-items: center;
  gap: 3px;
}
.cond-wind-arrow {
  flex-shrink: 0;
  color: var(--text-faint);
}


.sheet-slide-enter-active,
.sheet-slide-leave-active {
  transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
}
.sheet-slide-enter-from,
.sheet-slide-leave-to {
  transform: translateX(-50%) translateY(100%);
}
</style>
