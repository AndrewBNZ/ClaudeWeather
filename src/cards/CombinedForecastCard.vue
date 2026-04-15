<template>
  <div class="card cf-card" :style="cardSizeStyle">
    <!-- Title -->
    <div v-if="layout.showTitle" class="cf-header">
      <span class="card-title-icon" v-html="CARD_ICONS.combinedForecast"></span>
      <h3 class="cf-title">Forecast</h3>
    </div>

    <!-- Day tab bar -->
    <div class="cf-tabs-scroll" ref="tabsScrollEl">
      <div class="cf-tabs-inner">
        <button
          v-for="(date, i) in days"
          :key="date"
          :ref="el => { if (el) tabRefs[i] = el }"
          class="cf-tab"
          :class="{ 'cf-tab--selected': i === localSelectedDay }"
          @click="selectDay(i)"
        >
          <span class="cf-tab-label">{{ dayLabel(date) }}</span>
          <WeatherIcon class="cf-tab-icon" :code="wxCode(i)" :is-day="true" />
          <span
            class="cf-tab-value"
            :style="i === localSelectedDay ? { color: activeColor } : {}"
          >{{ fmtTabValue(i) }}</span>
        </button>
      </div>
    </div>

    <div class="cf-divider" />

    <!-- Hourly chart section (24 hours of selected day) -->
    <div class="cf-hourly-scroll" ref="scrollEl">
      <div class="hf-inner" :style="{ width: totalWidth + 'px' }">

        <!-- Time row -->
        <div class="hf-row hf-row-time">
          <div
            v-for="slot in allHoursArr"
            :key="'t-' + slot.index"
            class="hf-col hf-cell"
            :class="{ 'hf-col-current': isCurrent(slot.index) }"
          >
            <span v-if="sunEventsByNearestHour[slot.index]" class="hf-sun-time">
              <span class="hf-sun-icon" v-html="sunEventsByNearestHour[slot.index].icon"></span>
              <span>{{ sunEventsByNearestHour[slot.index].time }}</span>
            </span>
            <template v-else>{{ hourLabel(slot.index) }}</template>
          </div>
        </div>

        <!-- Bar / icons / line chart row -->
        <div class="hf-chart" :class="{ 'hf-chart--icons': layout.chartStyle === 'icons' || layout.chartStyle === 'line' }">
          <div
            v-for="slot in allHoursArr"
            :key="'c-' + slot.index"
            class="hf-col"
            :class="{
              'hf-col-current': isCurrent(slot.index),
              'hf-col-past':    isPast(slot.index),
            }"
          >
            <div class="hf-bar-area">
              <template v-if="layout.chartStyle === 'bar'">
                <div class="hf-bar-track">
                  <div class="hf-bar-fill" :style="barFillStyle(slot.index)">
                    <span v-if="activeDataPoint === 'wind'" class="hf-val-label hf-wind-cell hf-val-inside">
                      <span v-if="allWindDirs[slot.index] != null" class="hf-wind-arrow">
                        <svg viewBox="0 0 14 14" fill="none" aria-hidden="true"
                          :style="{ transform: `rotate(${(allWindDirs[slot.index] + 180) % 360}deg)`, transformOrigin: '50% 50%' }">
                          <line x1="7" y1="12" x2="7" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                          <polygon points="7,2 4,7 10,7" fill="currentColor"/>
                        </svg>
                      </span>
                      <span>{{ fmtVal(activeDataPoint, slot.index) }}</span>
                    </span>
                    <span v-else class="hf-val-label hf-val-inside">{{ fmtVal(activeDataPoint, slot.index) }}</span>
                  </div>
                </div>
              </template>
              <template v-else>
                <div class="hf-icon-track">
                  <div class="hf-float-group" :style="iconFloatStyle(slot.index)">
                    <span v-if="activeDataPoint === 'wind'" class="hf-val-label hf-wind-cell">
                      <span v-if="allWindDirs[slot.index] != null" class="hf-wind-arrow">
                        <svg viewBox="0 0 14 14" fill="none" aria-hidden="true"
                          :style="{ transform: `rotate(${(allWindDirs[slot.index] + 180) % 360}deg)`, transformOrigin: '50% 50%' }">
                          <line x1="7" y1="12" x2="7" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                          <polygon points="7,2 4,7 10,7" fill="currentColor"/>
                        </svg>
                      </span>
                      <span>{{ fmtVal(activeDataPoint, slot.index) }}</span>
                    </span>
                    <span v-else class="hf-val-label">{{ fmtVal(activeDataPoint, slot.index) }}</span>
                    <WeatherIcon class="hf-float-icon" :code="allCodes[slot.index]" :is-day="isHourDay(slot.index)" />
                  </div>
                </div>
              </template>
            </div>
          </div>

          <!-- Line chart SVG overlay -->
          <svg
            v-if="layout.chartStyle === 'line' && linePoints.length > 1"
            class="hf-line-svg"
            :width="totalWidth"
            :height="iconTrackH"
            aria-hidden="true"
          >
            <polyline
              :points="linePoints.join(' ')"
              fill="none"
              :stroke="activeColor"
              stroke-opacity="1"
              stroke-width="4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>

        <!-- Conditions row (bar style only) -->
        <div v-if="layout.showConditions && layout.chartStyle === 'bar'" class="hf-row hf-row-generic other-data-points-row">
          <div
            v-for="slot in allHoursArr"
            :key="'wx-' + slot.index"
            class="hf-col hf-cell"
            :class="{ 'hf-col-current': isCurrent(slot.index) }"
          ><span class="wx-icon"><WeatherIcon :code="allCodes[slot.index]" :is-day="isHourDay(slot.index)" /></span></div>
        </div>

        <!-- Other data rows -->
        <template v-for="pt in visibleOtherPoints" :key="pt.type">
          <div v-if="pt.type === 'wind'" class="hf-row hf-row-wind">
            <div
              v-for="slot in allHoursArr"
              :key="'w-' + slot.index"
              class="hf-col hf-cell"
              :class="{ 'hf-col-current': isCurrent(slot.index) }"
              :style="{ color: DATA_TYPES.wind.color }"
            >
              <span class="hf-wind-cell">
                <span v-if="allWindDirs[slot.index] != null" class="hf-wind-arrow">
                  <svg viewBox="0 0 14 14" fill="none" aria-hidden="true"
                    :style="{ transform: `rotate(${(allWindDirs[slot.index] + 180) % 360}deg)`, transformOrigin: '50% 50%' }">
                    <line x1="7" y1="12" x2="7" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <polygon points="7,2 4,7 10,7" fill="currentColor"/>
                  </svg>
                </span>
                <span class="hf-wind-speed">{{ fmtVal('wind', slot.index) }}</span>
              </span>
            </div>
          </div>
          <div v-else class="hf-row hf-row-generic">
            <div
              v-for="slot in allHoursArr"
              :key="'g-' + pt.type + '-' + slot.index"
              class="hf-col hf-cell"
              :class="{ 'hf-col-current': isCurrent(slot.index) }"
              :style="{ color: DATA_TYPES[pt.type]?.color }"
            >{{ fmtVal(pt.type, slot.index) }}</div>
          </div>
        </template>

      </div>
    </div>

    <!-- Data point picker -->
    <DataPointPicker
      :show="layout.showDataPointPicker"
      :options="pickerOptions"
      :model-value="activeDataPoint"
      @update:model-value="selectDataPoint"
      style="margin-top: 8px"
    />
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, nextTick } from 'vue'
import { DATA_TYPES, getDailyAvgFromHourly } from '../utils/dataTypes.js'
import { DEFAULT_COMBINED_FORECAST_LAYOUT } from '../composables/useSettings.js'
import { TILE_ICONS, CARD_ICONS } from '../utils/tileIcons.js'
import DataPointPicker from '../components/ui/DataPointPicker.vue'
import WeatherIcon from '../components/WeatherIcon.vue'

const COL_WIDTH = 54

// Icon/line chart constants (match HourlyForecastCard)
const ICON_H         = 40
const LABEL_H        = 22
const ICON_GAP       = 2
const ICON_HALF      = 12
const LINE_CY_OFFSET = LABEL_H + ICON_GAP + ICON_HALF

const props = defineProps({
  hourly:                 { type: Object, default: null },
  daily:                  { type: Object, default: null },
  unitPrefs:              { type: Object, required: true },
  selectedDay:            { type: Number, default: 0 },
  utcOffset:              { type: Number, default: 0 },
  timeFormat:             { type: String, default: '12h' },
  combinedForecastLayout: { type: Object, default: null },
  forecastDataPoint:      { type: String, default: null },
})

const emit = defineEmits(['forecast-data-point', 'day-selected'])

const scrollEl    = ref(null)
const tabsScrollEl = ref(null)
const tabRefs      = ref([])

// ── Layout ────────────────────────────────────────────────────────────────────

const layout = computed(() => props.combinedForecastLayout ?? DEFAULT_COMBINED_FORECAST_LAYOUT)

const CHART_SIZE_MULT = { S: 1, M: 1.6, L: 2.2 }
const chartSizeMult = computed(() => CHART_SIZE_MULT[layout.value.chartSize] ?? 1)
const cardSizeStyle = computed(() => ({ '--chart-size-mult': chartSizeMult.value }))
const BAR_TRACK_H_BASE  = 100
const ICON_TRACK_H_BASE = 96
const barTrackH  = computed(() => BAR_TRACK_H_BASE  * chartSizeMult.value)
const iconTrackH = computed(() => ICON_TRACK_H_BASE * chartSizeMult.value)

const activeDataPoint = ref(props.forecastDataPoint ?? layout.value.mainDataPoint)
watch(() => layout.value.mainDataPoint, (v) => { activeDataPoint.value = v })
watch(() => props.forecastDataPoint,    (v) => { if (v) activeDataPoint.value = v })

function selectDataPoint(type) {
  activeDataPoint.value = type
  emit('forecast-data-point', type)
}

const visibleOtherPoints = computed(() => {
  const mainType = layout.value.mainDataPoint
  return layout.value.otherDataPoints?.filter(p => p.enabled && p.type !== mainType) ?? []
})

const pickerOptions = computed(() => {
  const mainType = layout.value.mainDataPoint
  const seen = new Set()
  const opts = []
  for (const pt of layout.value.otherDataPoints ?? []) {
    if (seen.has(pt.type)) continue
    seen.add(pt.type)
    if (pt.type === mainType || pt.showInPicker) {
      opts.push({ type: pt.type })
    }
  }
  return opts
})

// ── Time / current hour ───────────────────────────────────────────────────────

const currentAbsoluteDayIndex = computed(() => {
  const ms = Date.now() + (props.utcOffset ?? 0) * 1000
  const todayStr = new Date(ms).toISOString().slice(0, 10)
  return (props.daily?.time ?? []).indexOf(todayStr)
})

const currentAbsoluteHour = computed(() => {
  const dayIdx = currentAbsoluteDayIndex.value
  if (dayIdx < 0) return -1
  const ms = Date.now() + (props.utcOffset ?? 0) * 1000
  return dayIdx * 24 + new Date(ms).getUTCHours()
})

function isCurrent(i) { return i === currentAbsoluteHour.value }
function isPast(i)    { return i < currentAbsoluteHour.value }

// ── Day tab selection ─────────────────────────────────────────────────────────

const localSelectedDay = ref(Math.max(0, currentAbsoluteDayIndex.value))

watch(() => props.selectedDay, (d) => {
  if (d !== localSelectedDay.value) {
    localSelectedDay.value = d
    nextTick(() => scrollTabIntoView(d))
  }
})

function selectDay(i) {
  localSelectedDay.value = i
  emit('day-selected', i)
  nextTick(() => {
    scrollEl.value?.scrollTo({ left: 0 })
    scrollTabIntoView(i)
  })
}

function scrollTabIntoView(i) {
  const tab     = tabRefs.value[i]
  const scroller = tabsScrollEl.value
  if (!tab || !scroller) return
  const tabLeft  = tab.offsetLeft
  const tabRight = tabLeft + tab.offsetWidth
  const sl = scroller.scrollLeft
  const cw = scroller.clientWidth
  if (tabLeft < sl) scroller.scrollTo({ left: tabLeft - 8, behavior: 'smooth' })
  else if (tabRight > sl + cw) scroller.scrollTo({ left: tabRight - cw + 8, behavior: 'smooth' })
}

// ── Hourly data window ────────────────────────────────────────────────────────

const displayStartIndex = computed(() => {
  const dayStart = localSelectedDay.value * 24
  if (localSelectedDay.value === currentAbsoluteDayIndex.value) {
    return Math.max(dayStart, currentAbsoluteHour.value - 1)
  }
  return dayStart
})

const allHoursArr = computed(() => {
  const start = displayStartIndex.value
  const dayEnd = localSelectedDay.value * 24 + 25
  const items = []
  for (let i = start; i < dayEnd; i++) items.push({ index: i })
  return items
})

const totalWidth  = computed(() => allHoursArr.value.length * COL_WIDTH)
const allCodes    = computed(() => props.hourly?.weather_code ?? [])
const allWindDirs = computed(() => props.hourly?.wind_direction_10m ?? [])

function isHourDay(i) {
  const day  = Math.floor(i / 24)
  const hour = i % 24
  const sr   = props.daily?.sunrise?.[day]
  const ss   = props.daily?.sunset?.[day]
  if (!sr || !ss) return true
  const srH = parseInt(sr.split('T')[1])
  const ssH = parseInt(ss.split('T')[1])
  return hour >= srH && hour < ssH
}

// ── Hour label ────────────────────────────────────────────────────────────────

function hourLabel(i) {
  const h = i % 24
  if (props.timeFormat === '24h') return String(h).padStart(2, '0')
  if (h === 0)  return '12am'
  if (h === 12) return '12pm'
  return h < 12 ? `${h}am` : `${h - 12}pm`
}

// ── Sunrise / sunset events ───────────────────────────────────────────────────

// Only the selected day's events, placed into the visible slot set.
// Past events naturally disappear because allHoursArr starts at currentAbsoluteHour-1 for today.
const sunEventsByNearestHour = computed(() => {
  if (!layout.value.showSunriseSunset || !props.daily) return {}
  const day = localSelectedDay.value
  const fmt = (dtStr, type) => {
    if (!dtStr) return null
    const timePart = dtStr.split('T')[1]
    if (!timePart) return null
    const [h, m] = timePart.split(':').map(Number)
    const timeStr = props.timeFormat === '24h'
      ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      : `${h % 12 || 12}:${String(m).padStart(2, '0')}`
    const icon = type === 'sunrise' ? TILE_ICONS.sunrise : TILE_ICONS.sunset
    return { icon, time: timeStr, type }
  }
  const result    = {}
  const usedSlots = new Set()
  const visibleSet = new Set(allHoursArr.value.map(s => s.index))

  const events = []
  const srStr = props.daily.sunrise?.[day]
  const ssStr = props.daily.sunset?.[day]
  if (srStr) events.push([day * 24 + parseInt(srStr.split('T')[1]), fmt(srStr, 'sunrise')])
  if (ssStr) events.push([day * 24 + parseInt(ssStr.split('T')[1]), fmt(ssStr, 'sunset')])
  events.sort((a, b) => a[0] - b[0])

  for (const [rawHour, evt] of events) {
    if (!evt) continue
    if (rawHour < displayStartIndex.value) continue
    let best = null, bestDist = Infinity
    for (const idx of visibleSet) {
      if (usedSlots.has(idx)) continue
      const d = Math.abs(idx - rawHour)
      if (d < bestDist) { bestDist = d; best = idx }
    }
    if (best != null) { result[best] = evt; usedSlots.add(best) }
  }
  return result
})

// ── Hourly value accessor ─────────────────────────────────────────────────────

function getHourlyValue(type, i) {
  const dt = DATA_TYPES[type]
  if (!dt?.hourlyKey) return null
  const raw = props.hourly?.[dt.hourlyKey]?.[i]
  if (raw == null) return null
  if (type === 'visibility') return dt.scale(raw, props.unitPrefs)
  if (type === 'pressure')   return dt.scale(raw, props.unitPrefs)
  if (type === 'rainAmount') return props.unitPrefs.precipitation === 'inch' ? raw * 0.0393701 : raw
  return raw
}

// ── Main data point bar/icon heights ─────────────────────────────────────────

const allMainValues = computed(() =>
  Array.from({ length: (props.hourly?.time?.length ?? 0) }, (_, i) => getHourlyValue(activeDataPoint.value, i))
)

const activeColor = computed(() => DATA_TYPES[activeDataPoint.value]?.color ?? '#f97316')

const FLOATING_BAR_TYPES = new Set(['temperature', 'feelsLike'])

const barRange = computed(() => {
  const vals = allMainValues.value.filter(v => v != null)
  if (!vals.length) return { min: 0, range: 1 }
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  return { min, range: Math.max(max - min, 1) }
})

const barMax = computed(() => {
  const vals = allMainValues.value.filter(v => v != null)
  return vals.length ? Math.max(...vals) : 1
})

function barFillStyle(i) {
  const v  = allMainValues.value[i]
  const bg = activeColor.value
  const MIN_H  = 26 * chartSizeMult.value
  const trackH = barTrackH.value
  if (FLOATING_BAR_TYPES.has(activeDataPoint.value)) {
    const { min, range } = barRange.value
    const ratio    = v != null ? (v - min) / range : 0.5
    const heightPx = MIN_H + ratio * (trackH - MIN_H)
    return { bottom: '0', top: 'auto', height: `${heightPx}px`, background: bg }
  } else {
    if (v == null || v === 0) return { bottom: '0', top: 'auto', height: '0px', background: bg }
    const ratio    = v / (barMax.value || 1)
    const heightPx = MIN_H + ratio * (trackH - MIN_H)
    return { bottom: '0', top: 'auto', height: `${heightPx}px`, background: bg }
  }
}

function iconFloatStyle(i) {
  const v = allMainValues.value[i]
  let ratio
  if (FLOATING_BAR_TYPES.has(activeDataPoint.value)) {
    const { min, range } = barRange.value
    ratio = v != null ? 1 - (v - min) / range : 0.5
  } else {
    const max = barMax.value || 1
    ratio = v != null ? 1 - v / max : 1
  }
  const usable = iconTrackH.value - ICON_H
  const topPx  = Math.max(0, Math.min(usable, ratio * usable))
  return { top: `${topPx}px` }
}

const linePoints = computed(() => {
  if (layout.value.chartStyle !== 'line') return []
  const usable = iconTrackH.value - ICON_H
  return allHoursArr.value.map((slot, arrayIdx) => {
    const v = allMainValues.value[slot.index]
    let ratio
    if (FLOATING_BAR_TYPES.has(activeDataPoint.value)) {
      const { min, range } = barRange.value
      ratio = v != null ? 1 - (v - min) / range : 0.5
    } else {
      const max = barMax.value || 1
      ratio = v != null ? 1 - v / max : 1
    }
    const topPx = Math.max(0, Math.min(usable, ratio * usable))
    const cx    = arrayIdx * COL_WIDTH + COL_WIDTH / 2
    const cy    = topPx + LINE_CY_OFFSET
    return `${cx},${cy}`
  })
})

// ── Value formatting ──────────────────────────────────────────────────────────

function fmtVal(type, i) {
  const v = getHourlyValue(type, i)
  if (v == null) return '–'
  if (type === 'temperature' || type === 'feelsLike') return `${Math.round(v)}°`
  if (type === 'rainProb')   return v > 0 ? `${Math.round(v)}%` : '—'
  if (type === 'rainAmount') {
    if (v < 0.05) return '—'
    return props.unitPrefs.precipitation === 'inch' ? v.toFixed(2) : v.toFixed(1)
  }
  if (type === 'wind')       return `${Math.round(v)}`
  if (type === 'humidity' || type === 'cloudCover') return `${Math.round(v)}%`
  if (type === 'uv')         return `${Math.round(v * 10) / 10}`
  if (type === 'pressure')   return v.toFixed(DATA_TYPES.pressure.getDecimals(props.unitPrefs))
  if (type === 'visibility') return v.toFixed(1)
  return `${Math.round(v)}`
}

// ── Tab bar: daily data values ────────────────────────────────────────────────

const days        = computed(() => props.daily?.time ?? [])
const maxTemps    = computed(() => props.daily?.temperature_2m_max ?? [])
const feelsLikeMax = computed(() => props.daily?.apparent_temperature_max ?? [])
const uvMax        = computed(() => props.daily?.uv_index_max ?? [])
const precipDecimals = computed(() =>
  props.unitPrefs.precipitation === 'inch' ? 2 : 1
)

const dailyHumidity   = computed(() => getDailyAvgFromHourly(props.hourly ?? {}, 'relative_humidity_2m'))
const dailyCloudCover = computed(() => getDailyAvgFromHourly(props.hourly ?? {}, 'cloud_cover'))
const dailyPressure   = computed(() => {
  const raw = getDailyAvgFromHourly(props.hourly ?? {}, 'surface_pressure')
  return raw.map(v => v != null ? DATA_TYPES.pressure.scale(v, props.unitPrefs) : null)
})
const dailyVisibility = computed(() => {
  const raw = getDailyAvgFromHourly(props.hourly ?? {}, 'visibility')
  return raw.map(v => v != null ? DATA_TYPES.visibility.scale(v, props.unitPrefs) : null)
})

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

function wxCode(i) { return dominantDaytimeCode(i) }

function dayLabel(isoDate) {
  const locDateStr = new Date(Date.now() + props.utcOffset * 1000).toISOString().slice(0, 10)
  if (isoDate === locDateStr) return 'Today'
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d, 12))
  return date.toLocaleDateString('en', { weekday: 'short', timeZone: 'UTC' })
}

function fmtTemp(v) { return v == null ? '–' : `${Math.round(v)}°` }

function fmtTabValue(i) {
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
  if (mdp === 'humidity') {
    const v = dailyHumidity.value[i]
    return v != null ? `${Math.round(v)}%` : '–'
  }
  if (mdp === 'cloudCover') {
    const v = dailyCloudCover.value[i]
    return v != null ? `${Math.round(v)}%` : '–'
  }
  if (mdp === 'pressure') {
    const v = dailyPressure.value[i]
    return v != null ? `${Number(v).toFixed(DATA_TYPES.pressure.getDecimals(props.unitPrefs))}` : '–'
  }
  if (mdp === 'visibility') {
    const v = dailyVisibility.value[i]
    return v != null ? `${Number(v).toFixed(1)}` : '–'
  }
  return fmtTemp(maxTemps.value[i])
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(() => {
  nextTick(() => {
    scrollEl.value?.scrollTo({ left: 0 })
    scrollTabIntoView(localSelectedDay.value)
  })
})
</script>

<style scoped>
.cf-card {
  padding: 10px 12px;
  overflow: hidden;
}

/* ── Header ──────────────────────────────────────────────────────────── */

.cf-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.card-title-icon {
  display: flex;
  flex-shrink: 0;
  color: var(--text-muted);
}
.card-title-icon :deep(svg) {
  width: 16px;
  height: 16px;
}
.card-title-icon :deep(svg), .card-title-icon :deep(svg *) {
  stroke: currentColor;
  fill: none;
}

.cf-title {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
}

/* ── Day tab bar ──────────────────────────────────────────────────────── */

.cf-tabs-scroll {
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  margin: 0 -4px;
}
.cf-tabs-scroll::-webkit-scrollbar { display: none; }

.cf-tabs-inner {
  display: flex;
  gap: 4px;
  padding: 4px 4px 6px;
}

.cf-tab {
  flex: 0 0 auto;
  min-width: 58px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 5px 4px 6px;
  border: 1.5px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

@media (hover: hover) {
  .cf-tab:hover {
    background: var(--card-hover);
  }
}

.cf-tab--selected {
  background: var(--card-hover);
  border-color: var(--accent);
}

.cf-tab-label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: var(--text-faint);
  line-height: 1;
}

.cf-tab--selected .cf-tab-label {
  color: var(--text-muted);
}

.cf-tab-icon {
  font-size: 1.4rem;
  line-height: 1;
}

.cf-tab-value {
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1;
  color: var(--text-muted);
}

/* ── Divider ──────────────────────────────────────────────────────────── */

.cf-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 2px 0 0;
}

/* ── Hourly scroll ────────────────────────────────────────────────────── */

.cf-hourly-scroll {
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  padding-top: 4px;
}
.cf-hourly-scroll::-webkit-scrollbar { display: none; }

@media (hover: hover) and (pointer: fine) {
  .cf-hourly-scroll {
    scrollbar-width: thin;
    scrollbar-color: var(--card-border) transparent;
  }
  .cf-hourly-scroll::-webkit-scrollbar { display: block; height: 4px; }
  .cf-hourly-scroll::-webkit-scrollbar-thumb { background: var(--card-border); border-radius: 2px; }
  .cf-hourly-scroll::-webkit-scrollbar-track { background: transparent; }
}

/* ── Inner flex column ────────────────────────────────────────────────── */

.hf-inner {
  display: flex;
  flex-direction: column;
  position: relative;
  isolation: isolate;
}

/* ── Column base ──────────────────────────────────────────────────────── */

.hf-col {
  width: 54px;
  flex-shrink: 0;
  flex-grow: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Time row ─────────────────────────────────────────────────────────── */

.hf-row {
  display: flex;
  flex-direction: row;
}

.hf-cell {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.hf-row-time .hf-cell {
  font-size: 0.8rem;
  color: var(--text-faint);
}

/* ── Bar chart row ────────────────────────────────────────────────────── */

.hf-chart {
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  padding: 0;
  position: relative;
}

.hf-chart--icons {
  align-items: flex-start;
}

.hf-chart .hf-col {
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  padding: 0 2px;
  position: relative;
  z-index: 2;
}

.hf-bar-area {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 2px 4px;
}

.hf-bar-track {
  position: relative;
  width: 100%;
  height: calc(100px * var(--chart-size-mult, 1));
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
}

.hf-bar-fill {
  position: absolute;
  left: 0;
  right: 0;
  border-radius: 6px;
  min-height: 4px;
  transition: top 0.3s ease, bottom 0.3s ease, height 0.3s ease;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 3px;
  overflow: hidden;
}

.hf-val-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
}

.hf-val-inside {
  color: #fff;
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}

.hf-line-svg {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 1;
  overflow: visible;
}

.hf-icon-track {
  position: relative;
  width: 100%;
  height: calc(96px * var(--chart-size-mult, 1));
  flex-shrink: 0;
}

.hf-float-group {
  position: absolute;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.hf-float-icon {
  font-size: 1.5rem;
  line-height: 1;
}

/* ── Data rows ────────────────────────────────────────────────────────── */

.hf-cell {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.hf-row-generic .hf-cell { font-size: 0.8rem; }

/* ── Wind row ─────────────────────────────────────────────────────────── */

.hf-wind-cell {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 2px;
}
.hf-wind-arrow {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.hf-wind-arrow svg { width: 10px; height: 10px; }
.hf-wind-speed { font-size: 0.8rem; }
.wx-icon { font-size: 1.5rem; line-height: 1rem; }

/* ── Current hour highlight ───────────────────────────────────────────── */

.hf-col-current.hf-cell { color: var(--accent); font-weight: 600; }

/* ── Past hours fade ──────────────────────────────────────────────────── */

.hf-col-past.hf-cell { opacity: 0.55; }

/* ── Sunrise / sunset ─────────────────────────────────────────────────── */

.hf-sun-time {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 0.8rem;
  color: var(--sun);
}

.hf-sun-icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.hf-sun-icon :deep(svg) {
  width: 16px;
  height: 16px;
}
</style>
