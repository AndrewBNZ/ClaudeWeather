<template>
  <div class="card hourly-strip-card">
    <div class="strip-scroll">
      <div class="strip-inner">
        <div
          v-for="(temp, i) in nextHours"
          :key="i"
          class="strip-slot"
          :class="{ 'slot-current': i === 0 }"
        >
          <div class="slot-time">{{ slotLabel(i) }}</div>
          <div class="slot-emoji">{{ slotEmoji(i) }}</div>
          <div class="slot-temp">{{ fmtTemp(temp) }}</div>
          <div v-if="slotPrecip(i)" class="slot-rain">{{ slotPrecip(i) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getWeatherInfo } from '../utils/weatherCodes.js'

const HOURS_AHEAD = 24

const props = defineProps({
  hourly:     { type: Object, default: null },
  unitPrefs:  { type: Object, required: true },
  utcOffset:  { type: Number, default: 0 },
  timeFormat: { type: String, default: '12h' },
})

const currentLocalHour = computed(() => {
  const ms = Date.now() + (props.utcOffset ?? 0) * 1000
  return new Date(ms).getUTCHours()
})

const startIndex = computed(() => currentLocalHour.value) // today index 0–23

const nextHours = computed(() => {
  const arr = props.hourly?.temperature_2m
  if (!arr) return Array(HOURS_AHEAD).fill(null)
  return arr.slice(startIndex.value, startIndex.value + HOURS_AHEAD)
})

function slotLabel(i) {
  const h = (startIndex.value + i) % 24
  if (props.timeFormat === '24h') return String(h).padStart(2, '0')
  if (h === 0)  return '12am'
  if (h === 12) return '12pm'
  return h < 12 ? `${h}am` : `${h - 12}pm`
}

function slotEmoji(i) {
  const codes = props.hourly?.weather_code
  if (!codes) return ''
  const code = codes[startIndex.value + i]
  return code != null ? getWeatherInfo(code)?.emoji ?? '' : ''
}

function slotPrecip(i) {
  const arr = props.hourly?.precipitation
  if (!arr) return null
  const v = arr[startIndex.value + i]
  if (!v || v < 0.05) return null
  return `${v.toFixed(1)}`
}

function fmtTemp(v) {
  if (v == null) return '–'
  return `${Math.round(v)}°`
}
</script>

<style scoped>
.hourly-strip-card {
  padding: 10px 0;
}

.strip-scroll {
  overflow-x: auto;
  scrollbar-width: none;
  padding: 0 12px;
}
.strip-scroll::-webkit-scrollbar { display: none; }

.strip-inner {
  display: flex;
  gap: 4px;
}

.strip-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 8px 6px;
  min-width: 52px;
  border-radius: 10px;
  flex-shrink: 0;
  transition: background 0.15s;
}
.strip-slot:hover { background: rgba(255,255,255,0.05); }

.slot-current {
  background: rgba(249,115,22,0.1);
  border: 1px solid rgba(249,115,22,0.3);
}

.slot-time  { font-size: 0.7rem; color: var(--text-faint); font-weight: 500; }
.slot-emoji { font-size: 1.4rem; line-height: 1; }
.slot-temp  { font-size: 0.85rem; font-weight: 600; color: var(--text); }
.slot-rain  { font-size: 0.65rem; color: #7dd3fc; }
</style>
