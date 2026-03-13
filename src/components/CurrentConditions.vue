<template>
  <div class="conditions card">

    <div class="cond-header">
      <h3 class="cond-title">Current Conditions</h3>
      <span v-if="locationName" class="cond-location">📍 {{ locationName }}</span>
    </div>

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
          <span class="detail-icon">{{ item.icon }}</span>
          <div>
            <div class="detail-label">{{ item.label }}</div>
            <div class="detail-value">{{ item.value }}</div>
          </div>
        </button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getWeatherInfo, getCompassDir } from '../utils/weatherCodes.js'

const props = defineProps({
  data:         { type: Object, required: true },
  units:        { type: String, required: true },
  activeType:   { type: String, required: true },
  locationName: { type: String, default: '' },
})

const emit = defineEmits(['select'])

const info      = computed(() => getWeatherInfo(props.data.weather_code))
const windDir   = computed(() => getCompassDir(props.data.wind_direction_10m))
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

const detailItems = computed(() => [
  {
    type:  'rain',
    icon:  '🌧️',
    label: 'Rain',
    color: '#3b82f6',
    value: `${fmt(props.data.precipitation, 2)} ${precipUnit.value}${props.data.precipitation_probability != null ? ' · ' + props.data.precipitation_probability + '%' : ''}`,
  },
  {
    type:  'wind',
    icon:  '💨',
    label: 'Wind',
    color: '#06b6d4',
    value: `${fmt(props.data.wind_speed_10m, 1)} ${windUnit.value} ${windDir.value}`,
  },
  {
    type:  'feelsLike',
    icon:  '🤔',
    label: 'Feels Like',
    color: '#a855f7',
    value: `${fmt(props.data.apparent_temperature, 1)}${tempUnit.value}`,
  },
  {
    type:  'humidity',
    icon:  '💧',
    label: 'Humidity',
    color: '#14b8a6',
    value: `${fmt(props.data.relative_humidity_2m, 0)}%`,
  },
  {
    type:  'uv',
    icon:  '☀️',
    label: 'UV Index',
    color: '#eab308',
    value: `${fmt(props.data.uv_index, 1)}${uvLabel.value}`,
  },
])

function fmt(v, decimals) {
  if (v == null) return '–'
  return Number(v).toFixed(decimals)
}
</script>

<style scoped>
.conditions {
  padding: 16px 24px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.cond-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.cond-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #e2e8f0;
}

.cond-location {
  font-size: 1rem;
  color: #94a3b8;
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
  justify-content: center;
  gap: 16px;
  padding: 10px 14px;
}

.weather-icon {
  font-size: 68px;
  line-height: 1;
  filter: drop-shadow(0 0 20px rgba(255,255,255,0.2));
}

.temp-block { display: flex; flex-direction: column; gap: 4px; }

.temperature {
  font-size: 3.5rem;
  font-weight: 700;
  letter-spacing: -2px;
  line-height: 1;
  color: #f1f5f9;
}
.unit {
  font-size: 1.8rem;
  font-weight: 400;
  color: #94a3b8;
  margin-left: 4px;
}
.condition {
  font-size: 1.05rem;
  color: #94a3b8;
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
  background: rgba(255, 255, 255, 0.04);
  overflow: hidden;
  box-sizing: border-box;
}

.detail-icon { font-size: 20px; flex-shrink: 0; }

.detail-label {
  font-size: 0.7rem;
  color: #64748b;
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
</style>
