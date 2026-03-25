<template>
  <div class="daily-card card">
    <div v-if="layout.showTitle" class="daily-header">
      <h3 class="daily-title">Daily Forecast</h3>
    </div>
    <div v-if="layout.showDataPointPicker" class="dp-picker">
      <button
        v-for="opt in pickerOptions"
        :key="opt.type"
        class="dp-pill"
        :class="{ active: activeDataPoint === opt.type }"
        :style="activeDataPoint === opt.type ? { '--pill-color': DATA_TYPES[opt.type].color } : {}"
        @click="selectDataPoint(opt.type)"
      ><span class="dp-pill-icon" v-html="TILE_ICONS[DATA_TYPES[opt.type]?.iconKey ?? opt.type]"></span>{{ opt.label }}</button>
    </div>

    <div class="forecast-grid">
      <!-- Sticky left column: icons only -->
      <div class="labels-col">
        <div class="lbl-day-row"></div>
        <div v-if="layout.showConditions" class="lbl-wx-row"></div>
        <div class="lbl-temp-row"></div>
        <div v-if="visibleOtherPoints.length" class="lbl-stats-wrap">
          <div
            v-for="pt in visibleOtherPoints"
            :key="pt.type"
            class="lbl-stat-row"
            :style="{ color: ptColor(pt.type) }"
          >
            <span class="stat-icon" v-html="TILE_ICONS[DATA_TYPES[pt.type]?.iconKey ?? pt.type]"></span>
          </div>
        </div>
      </div>

      <!-- Scrollable day columns -->
      <div class="days-scroll">
        <div class="days-row">
          <div
            v-for="(date, i) in days"
            :key="date"
            class="day-col"
            :class="{ 'is-selected': i === selectedDay }"
            @click="emit('day-selected', i)"
          >
            <div class="day-lbl">{{ dayLabel(date) }}</div>
            <div v-if="layout.showConditions" class="wx-icon">{{ wxEmoji(i) }}</div>

            <div class="temp-wrap">
              <!-- Floating bar types (temperature, feelsLike) -->
              <template v-if="FLOATING_BAR_TYPES.has(activeDataPoint)">
                <span class="t-hi">{{ fmtTemp(mainHi[i]) }}</span>
                <div class="bar-track">
                  <div class="bar-fill" :style="barStyle(i)" />
                </div>
                <span class="t-lo">{{ fmtTemp(mainLo[i]) }}</span>
              </template>
              <!-- Simple bottom-up bar (rain, wind, uv) -->
              <template v-else>
                <div v-if="activeDataPoint === 'wind'" class="t-hi t-wind-val">
                  <span v-if="windDirs[i] != null" class="wind-dir-arrow">
                    <svg viewBox="0 0 14 14" fill="none" aria-hidden="true"
                         :style="{ transform: `rotate(${windRotation(i)}deg)`, transformOrigin: '50% 50%' }">
                      <line x1="7" y1="12" x2="7" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                      <polygon points="7,2 4,7 10,7" fill="currentColor"/>
                    </svg>
                  </span>
                  <span>{{ fmtMainValue(i) }}</span>
                </div>
                <span v-else class="t-hi">{{ fmtMainValue(i) }}</span>
                <div class="bar-track">
                  <div class="bar-fill" :style="barStyleSimple(i)" />
                </div>
              </template>
            </div>

            <div v-if="visibleOtherPoints.length" class="stats">
              <template v-for="pt in visibleOtherPoints" :key="pt.type">
                <!-- Rain probability -->
                <div v-if="pt.type === 'rainProb'" class="stat-row" :style="{ color: rainColor }">
                  <span>{{ fmtProb(i) }}</span>
                </div>
                <!-- Rain amount -->
                <div v-else-if="pt.type === 'rainAmount'" class="stat-row" :style="{ color: rainColor }">
                  <span>{{ fmtPrecip(i) }}</span>
                </div>
                <!-- Wind: keep direction arrow inline with value -->
                <div v-else-if="pt.type === 'wind'" class="stat-row" :style="{ color: windColor }">
                  <span class="wind-dir-arrow">
                    <svg viewBox="0 0 14 14" fill="none" aria-hidden="true"
                         :style="{ transform: `rotate(${windRotation(i)}deg)`, transformOrigin: '50% 50%' }">
                      <line x1="7" y1="12" x2="7" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                      <polygon points="7,2 4,7 10,7" fill="currentColor"/>
                    </svg>
                  </span>
                  <span>{{ fmtWind(i) }}</span>
                </div>
                <!-- Wind gusts -->
                <div v-else-if="pt.type === 'gusts'" class="stat-row" :style="{ color: windColor }">
                  <span>{{ fmtGusts(i) }}</span>
                </div>
                <!-- Feels like -->
                <div v-else-if="pt.type === 'feelsLike'" class="stat-row" :style="{ color: DATA_TYPES.feelsLike.color }">
                  <span>{{ fmtTemp(feelsLikeMax[i]) }}</span>
                </div>
                <!-- UV index -->
                <div v-else-if="pt.type === 'uv'" class="stat-row" :style="{ color: DATA_TYPES.uv.color }">
                  <span>{{ fmtUv(i) }}</span>
                </div>
                <!-- Humidity -->
                <div v-else-if="pt.type === 'humidity'" class="stat-row" :style="{ color: DATA_TYPES.humidity.color }">
                  <span>{{ fmtHumidity(i) }}</span>
                </div>
                <!-- Cloud cover -->
                <div v-else-if="pt.type === 'cloudCover'" class="stat-row" :style="{ color: DATA_TYPES.cloudCover.color }">
                  <span>{{ fmtCloudCover(i) }}</span>
                </div>
                <!-- Pressure -->
                <div v-else-if="pt.type === 'pressure'" class="stat-row" :style="{ color: DATA_TYPES.pressure.color }">
                  <span>{{ fmtPressure(i) }}</span>
                </div>
                <!-- Visibility -->
                <div v-else-if="pt.type === 'visibility'" class="stat-row" :style="{ color: DATA_TYPES.visibility.color }">
                  <span>{{ fmtVisibility(i) }}</span>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { getWeatherInfo } from '../utils/weatherCodes.js'
import { DATA_TYPES, DATA_TYPE_LIST, getDailyAvgFromHourly } from '../utils/dataTypes.js'
import { DEFAULT_DAILY_FORECAST_LAYOUT } from '../composables/useSettings.js'
import { TILE_ICONS } from '../utils/tileIcons.js'

// ── Props & emits ───────────────────────────────────────────────────────────

const props = defineProps({
  daily:               { type: Object, default: null },
  hourly:              { type: Object, default: null },
  unitPrefs:           { type: Object, required: true },
  selectedDay:         { type: Number, default: 0 },
  utcOffset:           { type: Number, default: 0 },
  dailyForecastLayout: { type: Object, default: null },
  forecastDataPoint:   { type: String, default: null },
})

const emit = defineEmits(['day-selected', 'forecast-data-point'])

// ── Layout config (with fallback) ────────────────────────────────────────────

const layout = computed(() => props.dailyForecastLayout ?? DEFAULT_DAILY_FORECAST_LAYOUT)

const visibleOtherPoints = computed(() => {
  const mainType = layout.value.mainDataPoint
  return layout.value.otherDataPoints?.filter(p => p.enabled && p.type !== mainType) ?? []
})

// ── Data point picker (local — doesn't persist to settings) ──────────────────

const pickerOptions = computed(() => {
  const mainType = layout.value.mainDataPoint
  const seen = new Set()
  const opts = []
  for (const pt of layout.value.otherDataPoints ?? []) {
    if (seen.has(pt.type)) continue
    seen.add(pt.type)
    if (pt.type === mainType || pt.showInPicker) {
      opts.push({ type: pt.type, label: DATA_TYPES[pt.type]?.shortLabel ?? pt.type })
    }
  }
  return opts
})

const activeDataPoint = ref(props.forecastDataPoint ?? layout.value.mainDataPoint)
watch(() => layout.value.mainDataPoint, (v) => { activeDataPoint.value = v })
watch(() => props.forecastDataPoint, (v) => { if (v) activeDataPoint.value = v })

function selectDataPoint(type) {
  activeDataPoint.value = type
  emit('forecast-data-point', type)
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const rainColor = DATA_TYPES.rainAmount.color
const windColor = DATA_TYPES.wind.color

function ptColor(type) {
  if (type === 'rainProb' || type === 'rainAmount') return rainColor
  if (type === 'wind' || type === 'gusts') return windColor
  return DATA_TYPES[type]?.color ?? 'inherit'
}

const days     = computed(() => props.daily?.time ?? [])
const maxTemps = computed(() => props.daily?.temperature_2m_max ?? [])
const minTemps = computed(() => props.daily?.temperature_2m_min ?? [])
const windDirs = computed(() => props.daily?.wind_direction_10m_dominant ?? [])

const precipUnit = computed(() =>
  props.unitPrefs.precipitation === 'inch' ? 'in' : 'mm'
)
const precipDecimals = computed(() =>
  props.unitPrefs.precipitation === 'inch' ? 2 : 1
)
const windUnit = computed(() =>
  ({ kmh: 'km/h', mph: 'mph', ms: 'm/s', kn: 'kn' })[props.unitPrefs.wind] ?? 'km/h'
)

// Most common weather code between 7am–9pm for the day
function dominantDaytimeCode(dayIndex) {
  const hourlyWx = props.hourly?.weather_code
  if (!hourlyWx) return props.daily?.weather_code?.[dayIndex] ?? null
  const start   = dayIndex * 24
  const daytime = hourlyWx.slice(start + 7, start + 21).filter(v => v != null)
  if (!daytime.length) return props.daily?.weather_code?.[dayIndex] ?? null
  const freq = {}
  for (const c of daytime) freq[c] = (freq[c] ?? 0) + 1
  return Number(Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0])
}

function wxEmoji(i) {
  const code = dominantDaytimeCode(i)
  return code != null ? (getWeatherInfo(code)?.emoji ?? '') : ''
}

function dayLabel(isoDate) {
  const locDateStr = new Date(Date.now() + props.utcOffset * 1000).toISOString().slice(0, 10)
  if (isoDate === locDateStr) return 'Today'
  const [y, m, d] = isoDate.split('-').map(Number)
  const date    = new Date(Date.UTC(y, m - 1, d, 12))
  const weekday = date.toLocaleDateString('en', { weekday: 'short', timeZone: 'UTC' })
  const day     = date.toLocaleDateString('en', { day: 'numeric', timeZone: 'UTC' })
  return `${weekday} ${day}`
}

function fmtTemp(v) {
  if (v == null) return '–'
  return `${Math.round(v)}°`
}

function fmtProb(i) {
  const v = props.daily?.precipitation_probability_max?.[i]
  if (v == null) return '–'
  return `${v}%`
}

function fmtPrecip(i) {
  const v = props.daily?.precipitation_sum?.[i]
  if (v == null) return '–'
  return `${Number(v).toFixed(precipDecimals.value)}`
}

function fmtWind(i) {
  const v = props.daily?.wind_speed_10m_max?.[i]
  if (v == null) return '–'
  return `${Math.round(v)}`
}

function fmtGusts(i) {
  const v = props.daily?.wind_gusts_10m_max?.[i]
  if (v == null) return '–'
  return `${Math.round(v)}`
}

function fmtUv(i) {
  const v = uvMax.value[i]
  if (v == null) return '–'
  return `${Math.round(v * 10) / 10}`
}

function fmtHumidity(i) {
  const v = dailyHumidity.value[i]
  if (v == null) return '–'
  return `${Math.round(v)}%`
}

function fmtCloudCover(i) {
  const v = dailyCloudCover.value[i]
  if (v == null) return '–'
  return `${Math.round(v)}%`
}

function fmtPressure(i) {
  const v = dailyPressure.value[i]
  if (v == null) return '–'
  const decimals = DATA_TYPES.pressure.getDecimals(props.unitPrefs)
  return `${Number(v).toFixed(decimals)}`
}

function fmtVisibility(i) {
  const v = dailyVisibility.value[i]
  if (v == null) return '–'
  return `${Number(v).toFixed(1)}`
}

// Wind arrow rotation: meteorological dir is where wind comes FROM → arrow points TO (dir + 180)
function windRotation(i) {
  const d = windDirs.value[i]
  return d != null ? d + 180 : 0
}

// ── Main data point values ────────────────────────────────────────────────────

const feelsLikeMax = computed(() => props.daily?.apparent_temperature_max ?? [])
const feelsLikeMin = computed(() => props.daily?.apparent_temperature_min ?? [])
const uvMax        = computed(() => props.daily?.uv_index_max ?? [])
const dailyHumidity   = computed(() => getDailyAvgFromHourly(props.hourly ?? {}, 'relative_humidity_2m'))
const dailyCloudCover = computed(() => getDailyAvgFromHourly(props.hourly ?? {}, 'cloud_cover'))
const dailyPressure   = computed(() => {
  const raw = getDailyAvgFromHourly(props.hourly ?? {}, 'surface_pressure')
  const scale = DATA_TYPES.pressure.scale
  return raw.map(v => v != null ? scale(v, props.unitPrefs) : null)
})
const dailyVisibility = computed(() => {
  const raw = getDailyAvgFromHourly(props.hourly ?? {}, 'visibility')
  return raw.map(v => v != null ? DATA_TYPES.visibility.scale(v, props.unitPrefs) : null)
})

const FLOATING_BAR_TYPES = new Set(['temperature', 'feelsLike'])

const mainHi = computed(() => {
  const mdp = activeDataPoint.value
  if (mdp === 'feelsLike')  return feelsLikeMax.value
  if (mdp === 'rainAmount') return props.daily?.precipitation_sum ?? []
  if (mdp === 'rainProb')   return props.daily?.precipitation_probability_max ?? []
  if (mdp === 'wind')       return props.daily?.wind_speed_10m_max ?? []
  if (mdp === 'gusts')      return props.daily?.wind_gusts_10m_max ?? []
  if (mdp === 'uv')         return uvMax.value
  if (mdp === 'humidity')   return dailyHumidity.value
  if (mdp === 'cloudCover') return dailyCloudCover.value
  if (mdp === 'pressure')   return dailyPressure.value
  if (mdp === 'visibility') return dailyVisibility.value
  return maxTemps.value
})
const mainLo = computed(() => {
  const mdp = activeDataPoint.value
  if (mdp === 'feelsLike') return feelsLikeMin.value
  return minTemps.value
})

function fmtMainValue(i) {
  const mdp = activeDataPoint.value
  if (mdp === 'feelsLike') return fmtTemp(feelsLikeMax.value[i])
  if (mdp === 'rainAmount') {
    const v = props.daily?.precipitation_sum?.[i]
    return v != null ? `${Number(v).toFixed(precipDecimals.value)}` : '–'
  }
  if (mdp === 'rainProb') {
    const v = props.daily?.precipitation_probability_max?.[i]
    return v != null ? `${Math.round(v)}%` : '–'
  }
  if (mdp === 'gusts') {
    const v = props.daily?.wind_gusts_10m_max?.[i]
    return v != null ? `${Math.round(v)}` : '–'
  }
  if (mdp === 'wind') {
    const v = props.daily?.wind_speed_10m_max?.[i]
    return v != null ? `${Math.round(v)}` : '–'
  }
  if (mdp === 'uv') {
    const v = uvMax.value[i]
    return v != null ? `${Math.round(v * 10) / 10}` : '–'
  }
  if (mdp === 'humidity')   return fmtHumidity(i)
  if (mdp === 'cloudCover') return fmtCloudCover(i)
  if (mdp === 'pressure')   return fmtPressure(i)
  if (mdp === 'visibility') return fmtVisibility(i)
  return fmtTemp(maxTemps.value[i])
}

// ── Temperature bar (floating) ────────────────────────────────────────────────

const globalTempMin = computed(() => {
  const vals = minTemps.value.filter(v => v != null)
  return vals.length ? Math.min(...vals) : 0
})

const globalTempMax = computed(() => {
  const vals = maxTemps.value.filter(v => v != null)
  return vals.length ? Math.max(...vals) : 1
})

function barStyle(i) {
  const lo  = globalTempMin.value
  const hi  = globalTempMax.value
  const range = hi - lo || 1
  const dayMax = maxTemps.value[i] ?? hi
  const dayMin = minTemps.value[i] ?? lo
  const topPct    = ((hi - dayMax) / range) * 100
  const heightPct = ((dayMax - dayMin) / range) * 100
  return {
    top:        `${topPct}%`,
    height:     `${heightPct}%`,
    background: DATA_TYPES[activeDataPoint.value]?.color ?? DATA_TYPES.temperature.color,
  }
}

// ── Simple bottom-up bar (rain / wind / uv) ──────────────────────────────────

const globalMainMax = computed(() => {
  const vals = mainHi.value.filter(v => v != null)
  return vals.length ? Math.max(...vals) : 1
})

function barStyleSimple(i) {
  const val       = mainHi.value[i] ?? 0
  const maxVal    = globalMainMax.value || 1
  const heightPct = (val / maxVal) * 100
  return {
    top:        `${100 - heightPct}%`,
    height:     `${heightPct}%`,
    background: DATA_TYPES[activeDataPoint.value]?.color ?? DATA_TYPES.temperature.color,
  }
}
</script>

<style scoped>
.daily-card {
  padding: 16px 16px 14px;
}

.daily-header {
  margin-bottom: 12px;
}

.daily-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text);
}

/* ── Data point picker ────────────────────────────── */
.dp-picker {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
  margin-bottom: 10px;
}
.dp-picker::-webkit-scrollbar { display: none; }

.dp-pill {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid var(--card-border);
  background: transparent;
  color: var(--text-muted);
  font-size: 0.7rem;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  white-space: nowrap;
}
.dp-pill-icon { display: flex; align-items: center; }
.dp-pill-icon :deep(svg) { width: 13px; height: 13px; }

.dp-pill.active {
  background: color-mix(in srgb, var(--pill-color) 18%, transparent);
  border-color: var(--pill-color);
  color: var(--pill-color);
  font-weight: 600;
}

/* ── Forecast grid: sticky labels + scrollable days ── */
.forecast-grid {
  --h-day:  20px;
  --h-wx:   28px;
  --h-temp: 96px;
  --h-stat: 16px;
  display: flex;
  overflow: hidden;
  gap: 6px;
}

/* ── Sticky left labels column ────────────────────── */
.labels-col {
  flex-shrink: 0;
  display: none;
  flex-direction: column;
  align-items: center;
  padding-top: 6px; /* match day-col top padding */
  padding-right: 4px;
}

.lbl-day-row {
  height: var(--h-day);
  flex-shrink: 0;
}

.lbl-wx-row {
  height: var(--h-wx);
  flex-shrink: 0;
}

.lbl-temp-row {
  height: var(--h-temp);
  flex-shrink: 0;
}

.lbl-stats-wrap {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-top: 6px;
  margin-top: 2px;
  width: 100%;
  align-items: center;
}

.lbl-stat-row {
  height: var(--h-stat);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* ── Scrollable days ──────────────────────────────── */
.days-scroll {
  flex: 1;
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}
.days-scroll::-webkit-scrollbar { display: none; }

.days-row {
  display: flex;
  gap: 2px;
  min-width: 100%;
}

/* ── Day column ───────────────────────────────────── */
.day-col {
  flex: 0 0 calc(100% / 6);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 4px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
  min-width: 0;
}
@media (hover: hover) {
  .day-col:hover {
    background: var(--card-hover);
  }
}
.day-col.is-selected {
  background: rgba(56, 189, 248, 0.12);
}

/* ── Day label ────────────────────────────────────── */
.day-lbl {
  height: var(--h-day);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--text-muted);
  text-align: center;
  white-space: nowrap;
  flex-shrink: 0;
}
.is-selected .day-lbl {
  color: var(--accent);
  font-weight: 600;
}

/* ── Condition icon ───────────────────────────────── */
.wx-icon {
  height: var(--h-wx);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  line-height: 1;
  flex-shrink: 0;
}

/* ── Temperature section ──────────────────────────── */
.temp-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: var(--h-temp);
  flex-shrink: 0;
}

.t-hi {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text);
  line-height: 1.2;
}
.t-wind-val {
  display: flex;
  align-items: center;
  gap: 2px;
}
.t-lo {
  font-size: 0.75rem;
  color: var(--text-muted);
  line-height: 1.2;
}

.bar-track {
  position: relative;
  width: 6px;
  height: 60px;
  background: var(--card-border);
  border-radius: 3px;
  margin: 3px 0;
  flex-shrink: 0;
}

.bar-fill {
  position: absolute;
  left: 0;
  right: 0;
  border-radius: 3px;
  min-height: 4px;
}

/* ── Stats section ────────────────────────────────── */
.stats {
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 100%;
  border-top: 1px solid var(--card-border);
  padding-top: 6px;
  margin-top: 2px;
}

.stat-row {
  height: var(--h-stat);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 0.68rem;
  color: var(--text-muted);
  white-space: nowrap;
}

/* Wind direction arrow (inline, smaller than the label icon) */
.wind-dir-arrow {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.wind-dir-arrow svg {
  width: 10px;
  height: 10px;
}

/* Shared icon sizing for labels col */
.stat-icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.stat-icon :deep(svg) {
  width: 14px;
  height: 14px;
}

/* ── Responsive ───────────────────────────────────── */
@media (max-width: 1000px) {
  .daily-card {
    padding: 8px 10px 10px;
  }
  .day-col {
    flex: 0 0 calc(100% / 6);
    min-width: 0;
  }
}

@media (orientation: landscape) and (max-height: 900px) and (max-width: 1366px) {
  .daily-card {
    padding: 8px 10px;
  }
  .forecast-grid {
    --h-temp: 72px;
  }
  .bar-track {
    height: 44px;
  }
}
</style>
