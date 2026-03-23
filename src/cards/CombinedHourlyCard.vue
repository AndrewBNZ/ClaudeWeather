<template>
  <div class="card combined-hourly-card">
    <!-- Card header: title + day picker -->
    <div class="ch-header">
      <span class="ch-title">Hourly</span>
      <div class="ch-day-nav">
        <button class="ch-nav-btn" :disabled="selectedDay === 0" @click="prevDay">‹</button>
        <select class="ch-day-select" :value="selectedDay" @change="setDay(+$event.target.value)">
          <option v-for="(label, i) in dayLabels" :key="i" :value="i">{{ label }}</option>
        </select>
        <button class="ch-nav-btn" :disabled="selectedDay >= dayCount - 1" @click="nextDay">›</button>
      </div>
    </div>

    <!-- Scrollable combined view -->
    <div class="ch-scroll" ref="scrollEl">
      <div class="ch-inner" :style="{ width: totalWidth + 'px' }">

        <!-- Bar chart area (temperature) -->
        <div class="ch-chart">
          <div
            v-for="(temp, i) in hourTemps"
            :key="i"
            class="ch-col"
            :class="{ 'ch-col-current': isCurrent(i), 'ch-col-past': isPast(i) }"
          >
            <div class="ch-bar-area">
              <span class="ch-emoji">{{ hourEmojis[i] }}</span>
              <div class="ch-bar-wrap">
                <div
                  class="ch-bar"
                  :style="{
                    height: barHeight(temp) + 'px',
                    background: isCurrent(i) ? 'rgba(249,115,22,0.85)' : 'rgba(249,115,22,0.45)',
                  }"
                ></div>
              </div>
              <span class="ch-temp-label">{{ fmtTemp(temp) }}</span>
            </div>
          </div>
        </div>

        <!-- Time row -->
        <div class="ch-row ch-row-time">
          <div v-for="(temp, i) in hourTemps" :key="i" class="ch-col ch-cell" :class="{ 'ch-col-current': isCurrent(i) }">
            {{ hourLabel(i) }}
          </div>
        </div>

        <!-- Wind row -->
        <div class="ch-row ch-row-wind">
          <div v-for="(temp, i) in hourTemps" :key="i" class="ch-col ch-cell" :class="{ 'ch-col-current': isCurrent(i) }">
            <span class="ch-wind-cell">
              <svg v-if="hourWindDirs[i] != null" width="18" height="18" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" class="ch-wind-arrow">
                <circle cx="10" cy="10" r="9.5" fill="rgba(15,23,42,0.75)" stroke="#06b6d4" stroke-width="1.5"/>
                <g :style="{ transform: `rotate(${(hourWindDirs[i] + 180) % 360}deg)`, transformOrigin: '10px 10px' }">
                  <line x1="10" y1="16" x2="10" y2="10" stroke="#06b6d4" stroke-width="1.5" stroke-linecap="round"/>
                  <polygon points="10,4 7,10 13,10" fill="#06b6d4"/>
                </g>
              </svg>
              <span class="ch-wind-speed">{{ fmtWind(hourWindSpeeds[i]) }}</span>
            </span>
          </div>
        </div>

        <!-- Rain row -->
        <div class="ch-row ch-row-rain">
          <div v-for="(temp, i) in hourTemps" :key="i" class="ch-col ch-cell" :class="{ 'ch-col-current': isCurrent(i) }">
            <span v-if="hourPrecip[i]" class="ch-rain-val">{{ fmtPrecip(hourPrecip[i]) }}</span>
            <span v-else class="ch-rain-none">—</span>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, nextTick } from 'vue'
import { getWeatherInfo } from '../utils/weatherCodes.js'
import { DATA_TYPES } from '../utils/dataTypes.js'

const COL_WIDTH = 54

const props = defineProps({
  hourly:     { type: Object, default: null },
  daily:      { type: Object, default: null },
  unitPrefs:  { type: Object, required: true },
  selectedDay:{ type: Number, default: 0 },
  utcOffset:  { type: Number, default: 0 },
  timeFormat: { type: String, default: '12h' },
})

const emit = defineEmits(['day-selected'])
const scrollEl = ref(null)

const dayCount = computed(() => props.daily?.time?.length ?? 1)
const totalWidth = computed(() => 24 * COL_WIDTH)

const dayLabels = computed(() => {
  if (!props.daily?.time) return ['Today']
  return props.daily.time.map((t, i) => {
    if (i === 0) return 'Today'
    const d = new Date(t + 'T12:00:00')
    return d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })
  })
})

function setDay(n) { emit('day-selected', n) }
function prevDay() { if (props.selectedDay > 0) emit('day-selected', props.selectedDay - 1) }
function nextDay() { if (props.selectedDay < dayCount.value - 1) emit('day-selected', props.selectedDay + 1) }

// Slice hourly data for the selected day (24 hours)
function hourlySlice(arr) {
  if (!arr) return Array(24).fill(null)
  const start = props.selectedDay * 24
  return arr.slice(start, start + 24)
}

const hourTemps       = computed(() => hourlySlice(props.hourly?.temperature_2m))
const hourCodes       = computed(() => hourlySlice(props.hourly?.weather_code))
const hourWindDirs    = computed(() => hourlySlice(props.hourly?.wind_direction_10m))
const hourWindSpeeds  = computed(() => hourlySlice(props.hourly?.wind_speed_10m))
const hourPrecip      = computed(() => hourlySlice(props.hourly?.precipitation))
const hourEmojis      = computed(() => hourCodes.value.map(c => c != null ? getWeatherInfo(c)?.emoji ?? '' : ''))

// Bar height calculation
const BAR_MAX_PX = 72
const barRange = computed(() => {
  const temps = hourTemps.value.filter(t => t != null)
  if (!temps.length) return { min: 0, max: 1, range: 1 }
  const min = Math.min(...temps)
  const max = Math.max(...temps)
  return { min, max, range: Math.max(max - min, 1) }
})
function barHeight(temp) {
  if (temp == null) return 4
  const { min, range } = barRange.value
  return 4 + ((temp - min) / range) * (BAR_MAX_PX - 4)
}

// Current/past hour detection
const currentLocalHour = computed(() => {
  const ms = Date.now() + (props.utcOffset ?? 0) * 1000
  return new Date(ms).getUTCHours()
})
function isCurrent(i) { return props.selectedDay === 0 && i === currentLocalHour.value }
function isPast(i)    { return props.selectedDay === 0 && i < currentLocalHour.value }

// Hour label
function hourLabel(i) {
  if (props.timeFormat === '24h') return String(i).padStart(2, '0')
  if (i === 0)  return '12am'
  if (i === 12) return '12pm'
  return i < 12 ? `${i}am` : `${i - 12}pm`
}

// Formatting
function fmtTemp(v) {
  if (v == null) return '–'
  return `${Math.round(v)}°`
}
function fmtWind(v) {
  if (v == null) return '–'
  return `${Math.round(v)}`
}
function fmtPrecip(v) {
  if (!v || v < 0.05) return null
  return DATA_TYPES.rain.getUnit(props.unitPrefs) === 'in'
    ? `${(v * 0.0393701).toFixed(2)}`
    : `${v.toFixed(1)}`
}

// Scroll to current hour on mount / day change
onMounted(() => scrollToCurrent())
function scrollToCurrent() {
  nextTick(() => {
    if (!scrollEl.value || props.selectedDay !== 0) { scrollEl.value?.scrollTo({ left: 0 }); return }
    const targetX = Math.max(0, (currentLocalHour.value - 2) * COL_WIDTH)
    scrollEl.value.scrollTo({ left: targetX, behavior: 'smooth' })
  })
}
</script>

<style scoped>
.combined-hourly-card {
  padding: 0;
  overflow: hidden;
}

.ch-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px 8px;
}

.ch-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.ch-day-nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ch-nav-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1.3rem;
  line-height: 1;
  padding: 2px 6px;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.15s;
}
.ch-nav-btn:hover:not(:disabled) { background: rgba(255,255,255,0.08); }
.ch-nav-btn:disabled { opacity: 0.3; cursor: default; }

.ch-day-select {
  background: var(--card-bg, rgba(255,255,255,0.06));
  border: 1px solid var(--card-border, rgba(255,255,255,0.1));
  border-radius: 7px;
  color: var(--text);
  font-size: 0.82rem;
  padding: 4px 8px;
  cursor: pointer;
}

/* Scroll container */
.ch-scroll {
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  padding-bottom: 4px;
}
.ch-scroll::-webkit-scrollbar { display: none; }

.ch-inner {
  display: flex;
  flex-direction: column;
}

/* All rows share the same column structure */
.ch-col {
  width: 54px;
  flex-shrink: 0;
  flex-grow: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Bar chart row */
.ch-chart {
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  padding: 8px 0 0;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.ch-chart .ch-col {
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  gap: 2px;
  padding: 0 2px 0;
}

.ch-bar-area {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.ch-emoji { font-size: 16px; line-height: 1; }

.ch-bar-wrap {
  width: 100%;
  height: 76px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.ch-bar {
  width: 28px;
  border-radius: 4px 4px 0 0;
  transition: height 0.3s ease;
  min-height: 4px;
}

.ch-temp-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 4px;
}

/* Data rows */
.ch-row {
  display: flex;
  flex-direction: row;
}

.ch-cell {
  height: 38px;
  border-right: 1px solid rgba(255,255,255,0.04);
  font-size: 0.72rem;
  color: var(--text-muted);
}

.ch-row-time .ch-cell { font-size: 0.68rem; color: var(--text-faint); }

.ch-wind-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}
.ch-wind-speed { font-size: 0.65rem; color: var(--text-faint); }

.ch-rain-val  { font-size: 0.72rem; color: #7dd3fc; font-weight: 600; }
.ch-rain-none { font-size: 0.65rem; color: var(--text-faint); opacity: 0.4; }

/* Current hour highlight */
.ch-col-current .ch-bar { background: rgba(249,115,22,0.9) !important; }
.ch-col-current.ch-cell { background: rgba(249,115,22,0.07); }
.ch-col-current .ch-temp-label,
.ch-col-current.ch-cell { color: var(--text); }

/* Past hours fade */
.ch-col-past .ch-bar { opacity: 0.45; }
.ch-col-past.ch-cell { opacity: 0.55; }
</style>
