<template>
  <div class="conditions card">

    <WeatherScene
      :weather-code="data.weather_code"
      :wind-speed="data.wind_speed_10m"
      :show-sim="showSim"
      :sunrise="todaySunrise"
      :sunset="todaySunset"
    />

    <div class="cond-content">
    <div class="cond-body">
      <!-- Main temp block — clicking selects "temperature" -->
      <button
        class="cond-main selectable"
        :class="{ active: activeType === 'temperature' }"
        style="--sel-color: #f97316"
        @click="emit('select', 'temperature')"
      >
        <div class="weather-icon">{{ info.emoji }}</div>
        <div class="temp-block">
          <div class="temperature">
            {{ fmt(data.temperature_2m, 1) }}<span class="unit">{{ tempUnit }}</span>
          </div>
          <div class="condition">{{ info.label }}</div>
        </div>
        <div v-if="todayHigh != null" class="hl-block">
          <div class="hl-item"><span class="hl-label">H</span> {{ fmt(todayHigh, 0) }}°</div>
          <div class="hl-item hl-low"><span class="hl-label">L</span> {{ fmt(todayLow, 0) }}°</div>
        </div>
        <div v-if="todaySunrise || todaySunset" class="sun-block">
          <div v-if="todaySunrise" class="hl-item hl-sun"><span class="hl-sun-icon">🌅</span> {{ fmtTime(todaySunrise) }}</div>
          <div v-if="todaySunset"  class="hl-item hl-sun"><span class="hl-sun-icon">🌇</span> {{ fmtTime(todaySunset) }}</div>
        </div>
      </button>

      <!-- Detail items — each selects its data type -->
      <div class="cond-details">
        <button
          v-for="item in detailItems"
          :key="item.type"
          class="detail-item selectable"
          :class="{ active: activeType === item.type }"
          :style="{ '--sel-color': item.color }"
          @click="emit('select', item.type)"
        >
          <span v-if="item.iconHtml" class="detail-icon" v-html="item.iconHtml"></span>
          <span v-else class="detail-icon">{{ item.icon }}</span>
          <div>
            <div class="detail-label">{{ item.label }}</div>
            <div class="detail-value">{{ item.value }}</div>
          </div>
        </button>
      </div>
    </div>
    </div>

  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getWeatherInfo, getCompassDir } from '../utils/weatherCodes.js'
import WeatherScene from './WeatherScene.vue'

const props = defineProps({
  data:         { type: Object, required: true },
  daily:        { type: Object, default: null },
  units:        { type: String, required: true },
  activeType:   { type: String, required: true },
  locationName: { type: String, default: '' },
  showSim:      { type: Boolean, default: false },
  tileConfig:   { type: Array, default: null },
})

const emit = defineEmits(['select'])

const info      = computed(() => getWeatherInfo(props.data.weather_code))
const windDir      = computed(() => getCompassDir(props.data.wind_direction_10m))
const todayHigh    = computed(() => props.daily?.temperature_2m_max?.[0] ?? null)
const todayLow     = computed(() => props.daily?.temperature_2m_min?.[0] ?? null)
const todaySunrise = computed(() => props.daily?.sunrise?.[0] ?? null)
const todaySunset  = computed(() => props.daily?.sunset?.[0] ?? null)

const windArrowSvg = computed(() => {
  const dir = props.data.wind_direction_10m
  if (dir == null) return null
  const angle = (dir + 180) % 360
  const c = '#06b6d4'
  return `<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
    <circle cx="14" cy="14" r="13" fill="rgba(15,23,42,0.85)" stroke="${c}" stroke-width="1.5"/>
    <g transform="rotate(${angle},14,14)">
      <line x1="14" y1="20" x2="14" y2="12" stroke="${c}" stroke-width="1.5" stroke-linecap="round"/>
      <polygon points="14,7 10.5,13 17.5,13" fill="${c}"/>
    </g>
  </svg>`
})
const tempUnit  = computed(() => props.units === 'metric' ? '°C' : '°F')
const windUnit  = computed(() => props.units === 'metric' ? 'km/h' : 'mph')
const precipUnit = computed(() => props.units === 'metric' ? 'mm' : 'in')

const uvLabel = computed(() => {
  const uv = props.data.uv_index
  if (uv == null) return ''
  if (uv < 3)  return ' Low'
  if (uv < 6)  return ' Moderate'
  if (uv < 8)  return ' High'
  if (uv < 11) return ' Very High'
  return ' Extreme'
})

const allTiles = computed(() => ({
  rain: {
    type:  'rain',
    icon:  '🌧️',
    label: 'Rain',
    color: '#3b82f6',
    value: `${fmt(props.data.precipitation, 2)} ${precipUnit.value}${props.data.precipitation_probability != null ? ' · ' + props.data.precipitation_probability + '%' : ''}`,
  },
  wind: {
    type:     'wind',
    icon:     '💨',
    iconHtml: windArrowSvg.value,
    label:    'Wind',
    color:    '#06b6d4',
    value:    `${fmt(props.data.wind_speed_10m, 1)} ${windUnit.value}`,
  },
  feelsLike: {
    type:  'feelsLike',
    icon:  '🤔',
    label: 'Feels Like',
    color: '#a855f7',
    value: `${fmt(props.data.apparent_temperature, 1)}${tempUnit.value}`,
  },
  humidity: {
    type:  'humidity',
    icon:  '💧',
    label: 'Humidity',
    color: '#14b8a6',
    value: `${fmt(props.data.relative_humidity_2m, 0)}%`,
  },
  uv: {
    type:  'uv',
    icon:  '☀️',
    label: 'UV Index',
    color: '#eab308',
    value: `${fmt(props.data.uv_index, 1)}${uvLabel.value}`,
  },
  cloudCover: {
    type:  'cloudCover',
    icon:  '☁️',
    label: 'Cloud Cover',
    color: '#94a3b8',
    value: `${fmt(props.data.cloud_cover, 0)}%`,
  },
  pressure: {
    type:  'pressure',
    icon:  '↕️',
    label: 'Pressure',
    color: '#818cf8',
    value: `${fmt(props.data.surface_pressure, 0)} hPa`,
  },
  visibility: {
    type:  'visibility',
    icon:  '👁️',
    label: 'Visibility',
    color: '#22d3ee',
    value: `${fmt(props.units === 'metric' ? props.data.visibility / 1000 : props.data.visibility / 1609.344, 1)} ${props.units === 'metric' ? 'km' : 'mi'}`,
  },
}))

const detailItems = computed(() => {
  if (!props.tileConfig) return Object.values(allTiles.value)
  return props.tileConfig
    .filter(t => t.enabled)
    .map(t => allTiles.value[t.type])
    .filter(Boolean)
})

function fmt(v, decimals) {
  if (v == null) return '–'
  return Number(v).toFixed(decimals)
}

function fmtTime(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}
</script>

<style scoped>
.conditions {
  position: relative;
  overflow: hidden;
  padding: 0;
}

.cond-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 18px 16px;
}



.cond-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── Shared selectable styles ───────────────────────────────────────────── */
.selectable {
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 12px;
  transition: background 0.18s, border-color 0.18s, transform 0.12s;
  background: none;
  font-family: inherit;
  text-align: left;
  color: inherit;
}

.selectable:hover:not(.active) {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.08);
  transform: translateY(-1px);
}

.selectable.active {
  background: color-mix(in srgb, var(--sel-color) 12%, transparent);
  border-color: color-mix(in srgb, var(--sel-color) 40%, transparent);
}

/* ── Main temp block ────────────────────────────────────────────────────── */
.cond-main {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  padding: 8px 10px;
}

.weather-icon {
  font-size: 54px;
  line-height: 1;
  filter: drop-shadow(0 0 16px rgba(255,255,255,0.2));
}

.temp-block { display: flex; flex-direction: column; gap: 2px; }

.temperature {
  font-size: 2.9rem;
  font-weight: 700;
  letter-spacing: -2px;
  line-height: 1;
  color: #f1f5f9;
  text-shadow: 0 1px 8px rgba(0,0,0,0.6), 0 2px 20px rgba(0,0,0,0.4);
}
.unit {
  font-size: 1.5rem;
  font-weight: 400;
  color: #94a3b8;
  margin-left: 3px;
}
.condition {
  font-size: 0.92rem;
  color: #94a3b8;
  text-shadow: 0 1px 6px rgba(0,0,0,0.7);
}

.hl-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-self: center;
}
.sun-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-self: center;
}
.hl-item {
  font-size: 0.82rem;
  font-weight: 600;
  color: #e2e8f0;
  white-space: nowrap;
  text-shadow: 0 1px 6px rgba(0,0,0,0.7);
}
.hl-low { color: #94a3b8; }
.hl-sun {
  color: #fbbf24;
  font-weight: 500;
}
.hl-sun-icon { font-size: 0.75rem; }
.hl-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* ── Detail grid ────────────────────────────────────────────────────────── */
.cond-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  grid-auto-rows: 68px;
  gap: 8px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(6px);
  overflow: hidden;
  box-sizing: border-box;
}

.detail-icon { font-size: 20px; flex-shrink: 0; }

.detail-label {
  font-size: 0.7rem;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 500;
}
.detail-value {
  font-size: 0.85rem;
  color: #e2e8f0;
  font-weight: 600;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 639px) {
  .cond-content {
    padding: 10px 12px 12px;
    gap: 8px;
  }
  .cond-main {
    padding: 6px 8px;
    gap: 10px;
  }
  .weather-icon { font-size: 44px; }
  .temperature  { font-size: 2.4rem; }
  .unit         { font-size: 1.2rem; }
  .condition    { font-size: 0.82rem; }
  .cond-details {
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    grid-auto-rows: 54px;
    gap: 5px;
  }
  .detail-item {
    padding: 6px 8px;
    gap: 7px;
  }
  .detail-icon { font-size: 17px; }
  .detail-label { font-size: 0.65rem; }
  .detail-value { font-size: 0.78rem; }
}
</style>
