<template>
  <div class="sc-overlay" @click="!blocked && (showPanel = true)">
    <div class="sc-inner">
      <!-- Left: icon + temp + condition -->
      <div class="sc-left">
        <span class="sc-icon">{{ info.emoji }}</span>
        <div class="sc-temp-group">
          <span class="sc-temp">{{ fmt(data.temperature_2m, 1) }}<span class="sc-unit">{{ tempUnit }}</span></span>
          <div v-if="todayHigh != null" class="sc-hl">
            <span>H {{ fmt(todayHigh, 0) }}°</span>
            <span class="sc-hl-low">L {{ fmt(todayLow, 0) }}°</span>
          </div>
        </div>
      </div>

      <!-- Right: condition + rain + wind -->
      <div class="sc-right">
        <div class="sc-right-item">{{ info.label }}</div>
        <div class="sc-data-grid">
          <template v-if="data.precipitation != null || data.precipitation_probability != null">
            <span class="sc-tile-icon" v-html="rainIcon"></span>
            <span class="sc-data-val">{{ data.precipitation != null ? fmt(data.precipitation, 1) : fmt(data.precipitation_probability, 0) }}</span>
            <span class="sc-data-unit">{{ data.precipitation != null ? rainUnit : '%' }}</span>
            <span></span>
          </template>
          <template v-if="data.wind_speed_10m != null">
            <span class="sc-tile-icon" v-html="windIcon"></span>
            <span class="sc-data-val">{{ fmt(data.wind_speed_10m, 0) }}</span>
            <span class="sc-data-unit">{{ windUnit }}</span>
            <svg v-if="data.wind_direction_10m != null" class="sc-wind-arrow" width="13" height="13" viewBox="0 0 20 20" :style="{ transform: `rotate(${data.wind_direction_10m}deg)` }">
              <polygon points="10,2 14,16 10,13 6,16" fill="currentColor"/>
            </svg>
            <span v-else></span>
          </template>
        </div>
      </div>
    </div>
  </div>

  <Teleport to="body">
    <div v-if="showPanel" class="cond-backdrop" @click="showPanel = false" />
    <Transition name="cond-slide">
      <div v-if="showPanel" class="cond-panel" :style="panelStyle">
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
              </div>
              <div class="cond-tile-value">
                {{ tile.value }}<span v-if="tile.unit" class="cond-tile-unit">{{ tile.unit }}</span>
              </div>
              <div v-if="tile.sub" class="cond-tile-sub">{{ tile.sub }}</div>
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
  data:      { type: Object, required: true },
  daily:     { type: Object, default: null },
  unitPrefs: { type: Object, required: true },
  blocked:   { type: Boolean, default: false },
})

const emit = defineEmits(['panel-change'])

const { timeFormat } = useSettings()

const showPanel  = ref(false)
const panelStyle = ref({})

watch(showPanel, (open) => {
  emit('panel-change', open)
  if (!open) return
  const btn  = document.querySelector('[data-settings-btn]')
  if (!btn) return
  const rect     = btn.getBoundingClientRect()
  const card     = document.querySelector('.conditions')
  const cardRect = card?.getBoundingClientRect()
  const top      = rect.bottom + 6
  const maxHeight = `${window.innerHeight - top - 14}px`
  if (cardRect) {
    panelStyle.value = {
      top:       `${top}px`,
      left:      `${cardRect.left + 8}px`,
      right:     `${window.innerWidth - cardRect.right + 8}px`,
      maxHeight,
    }
  } else {
    const panelWidth = 320
    const rightEdge  = Math.min(rect.right, window.innerWidth - 8)
    const leftEdge   = Math.max(rightEdge - panelWidth, 8)
    panelStyle.value = { top: `${top}px`, left: `${leftEdge}px`, width: `${panelWidth}px`, maxHeight }
  }
})
const info      = computed(() => getWeatherInfo(props.data.weather_code))
const rainIcon  = TILE_ICONS.rain
const windIcon  = TILE_ICONS.wind
const tempUnit  = computed(() => DATA_TYPES.temperature.getUnit(props.unitPrefs))
const rainUnit  = computed(() => DATA_TYPES.rain.getUnit(props.unitPrefs))
const windUnit  = computed(() => DATA_TYPES.wind.getUnit(props.unitPrefs))
const todayHigh = computed(() => props.daily?.temperature_2m_max?.[0] ?? null)
const todayLow  = computed(() => props.daily?.temperature_2m_min?.[0] ?? null)

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
const tiles = computed(() => {
  const d     = props.data
  const up    = props.unitPrefs
  const daily = props.daily

  function scaledFmt(id, v) {
    if (v == null) return '–'
    const cfg    = DATA_TYPES[id]
    const scaled = cfg.scale ? cfg.scale(v, up) : v
    const dec    = cfg.getDecimals ? cfg.getDecimals(up) : cfg.decimals
    return Number(scaled).toFixed(dec)
  }

  return [
    {
      id: 'temperature', label: 'Temperature',
      icon: TILE_ICONS.temperature, color: '#f97316',
      value: fmt(d.temperature_2m, 1),
      unit: DATA_TYPES.temperature.getUnit(up),
      sub: todayHigh.value != null ? `H ${fmt(todayHigh.value, 0)}°  ·  L ${fmt(todayLow.value, 0)}°` : null,
    },
    {
      id: 'feelsLike', label: 'Feels Like',
      icon: TILE_ICONS.feelsLike, color: '#a855f7',
      value: fmt(d.apparent_temperature, 1),
      unit: DATA_TYPES.feelsLike.getUnit(up),
    },
    {
      id: 'rain', label: 'Precipitation',
      icon: TILE_ICONS.rain, color: '#3b82f6',
      value: fmt(d.precipitation, 1),
      unit: DATA_TYPES.rain.getUnit(up),
      sub: d.precipitation_probability != null ? `${fmt(d.precipitation_probability, 0)}% chance` : null,
    },
    {
      id: 'wind', label: 'Wind',
      icon: TILE_ICONS.wind, color: '#06b6d4',
      value: fmt(d.wind_speed_10m, 0),
      unit: DATA_TYPES.wind.getUnit(up),
      sub: d.wind_direction_10m != null ? windCardinal(d.wind_direction_10m) : null,
    },
    {
      id: 'humidity', label: 'Humidity',
      icon: TILE_ICONS.humidity, color: '#14b8a6',
      value: fmt(d.relative_humidity_2m, 0),
      unit: '%',
    },
    {
      id: 'uv', label: 'UV Index',
      icon: TILE_ICONS.uv, color: '#eab308',
      value: fmt(d.uv_index, 1),
      unit: '',
    },
    {
      id: 'cloudCover', label: 'Cloud Cover',
      icon: TILE_ICONS.cloudCover, color: '#94a3b8',
      value: fmt(d.cloud_cover, 0),
      unit: '%',
    },
    {
      id: 'visibility', label: 'Visibility',
      icon: TILE_ICONS.visibility, color: '#22d3ee',
      value: scaledFmt('visibility', d.visibility),
      unit: DATA_TYPES.visibility.getUnit(up),
    },
    {
      id: 'pressure', label: 'Pressure',
      icon: TILE_ICONS.pressure, color: '#818cf8',
      value: scaledFmt('pressure', d.surface_pressure),
      unit: DATA_TYPES.pressure.getUnit(up),
    },
    {
      id: 'moon', label: 'Moon Phase',
      icon: TILE_ICONS.moon, color: '#a5b4fc',
      value: moonPhaseName.value,
      unit: '',
      sub: `${moonIllumination.value}% illuminated`,
    },
    {
      id: 'sunrise', label: 'Sunrise',
      icon: TILE_ICONS.sunrise, color: '#fb923c',
      value: fmtTime(daily?.sunrise?.[0]),
      unit: '',
    },
    {
      id: 'sunset', label: 'Sunset',
      icon: TILE_ICONS.sunset, color: '#f472b6',
      value: fmtTime(daily?.sunset?.[0]),
      unit: '',
    },
  ]
})
</script>

<style scoped>
/* ── Scene overlay (tap target) ─────────────────────────────────────────── */
.sc-overlay {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: auto;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sc-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
}

/* Left column */
.sc-left {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex: 1;
}

.sc-icon {
  font-size: 3rem;
  line-height: 1;
  filter: drop-shadow(0 2px 8px rgba(0,0,0,0.45));
  flex-shrink: 0;
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
  font-size: 0.85rem;
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
  grid-template-columns: 16px 3ch auto auto;
  align-items: center;
  gap: 3px 5px;
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
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}
.sc-tile-icon :deep(svg) {
  width: 16px;
  height: 16px;
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
}

/* ── Conditions panel ───────────────────────────────────────────────────── */
.cond-panel {
  position: fixed;
  z-index: 250;
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

@media (max-width: 599px) {
  .cond-panel {
    left: 8px !important;
    right: 8px !important;
    bottom: 8px !important;
    max-height: none !important;
    width: auto !important;
    border-radius: 12px !important;
  }
}

.cond-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px 10px 16px;
  border-bottom: 1px solid var(--panel-divider);
  flex-shrink: 0;
}

.cond-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.cond-condition-row {
  display: flex;
  justify-content: center;
  padding: 10px 16px 4px;
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
  color: var(--text-muted);
  font-size: 1rem;
  padding: 2px 4px;
  cursor: pointer;
  transition: color 0.15s;
}
.cond-close:hover { color: var(--text); }

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
  padding: 12px;
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
}

/* ── Transition ─────────────────────────────────────────────────────────── */
.cond-slide-enter-active,
.cond-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.cond-slide-enter-from,
.cond-slide-leave-to {
  opacity: 0;
  transform: translateY(14px);
}
</style>
