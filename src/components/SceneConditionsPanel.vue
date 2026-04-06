<template>
  <Teleport to="body">
    <div v-if="modelValue" class="cond-backdrop" @click="$emit('update:modelValue', false)" />
    <Transition name="sheet-slide">
      <div v-if="modelValue" class="cond-panel">
        <div class="cond-header">
          <span class="cond-title">Current Conditions</span>
          <button class="cond-close" @click="$emit('update:modelValue', false)">✕</button>
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
                <span v-if="tile.fromStation" class="cond-tile-pws-icon" :title="pwsName ? `PWS: ${pwsName}` : 'PWS: Personal weather station'">
                  <svg width="13" height="13" viewBox="0 -1 20 22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="7" y1="18" x2="13" y2="18"/>
                    <line x1="10" y1="18" x2="10" y2="11.5"/>
                    <path d="M7 11a4.2 4.2 0 0 1 6 0"/>
                    <path d="M4.5 8.5a7.7 7.7 0 0 1 11 0"/>
                    <circle cx="10" cy="11.5" r="1.5" fill="currentColor" stroke="none"/>
                  </svg>
                </span>
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
import { computed } from 'vue'
import { getWeatherInfo } from '../utils/weatherCodes.js'
import { DATA_TYPES } from '../utils/dataTypes.js'
import { TILE_ICONS } from '../utils/tileIcons.js'
import { useSettings } from '../composables/useSettings.js'

const props = defineProps({
  modelValue:    { type: Boolean, required: true },
  data:          { type: Object,  required: true },
  daily:         { type: Object,  default: null },
  unitPrefs:     { type: Object,  required: true },
  pwsDataActive: { type: Boolean, default: false },
  pwsName:       { type: String,  default: null },
})

defineEmits(['update:modelValue'])

const { timeFormat } = useSettings()

const info      = computed(() => getWeatherInfo(props.data.weather_code))
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
  background: var(--sheet-bg, #1e2130);
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
  background: var(--sheet-item-bg);
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
.cond-tile-pws-icon {
  display: inline-flex;
  align-items: center;
  margin-left: auto;
  color: #38bdf8;
  opacity: 0.85;
  flex-shrink: 0;
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
