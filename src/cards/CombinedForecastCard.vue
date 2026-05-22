<template>
  <div class="combined-forecast-card card" :style="cardSizeStyle">

    <!-- Header -->
    <div v-if="layout.showTitle" class="cf-header">
      <span class="card-title-icon" v-html="CARD_ICONS.combinedForecast"></span>
      <h3 class="cf-title">Forecast</h3>
    </div>

    <!-- Daily strip -->
    <div class="cf-strip-wrapper">
      <div class="cf-strip" ref="stripScrollEl">
        <div
          v-for="(date, i) in displayDays"
          :key="date"
          class="cf-day-col"
          :class="{ 'cf-day-col--selected': i === localSelectedDay }"
          @click="selectDay(i)"
        >
          <div class="cf-day-lbl">{{ dayLabel(date) }}</div>
          <div v-if="dayNumber(date)" class="cf-day-num">{{ dayNumber(date) }}</div>
          <WeatherIcon class="cf-day-icon" :code="dominantDaytimeCode(i)" :is-day="true" />
          <div class="cf-day-hi">{{ fmtTemp(maxTemps[i]) }}</div>
          <div class="cf-day-lo">{{ fmtTemp(minTemps[i]) }}</div>
        </div>
      </div>
    </div>

    <div class="cf-divider"></div>

    <!-- 24h hourly section for selected day -->
    <div class="cf-hourly">
      <div class="cf-h-scroll-wrapper">
        <div class="cf-h-scroll" ref="hourlyScrollEl">
          <div class="cf-h-inner" :style="{ width: (24 * COL_WIDTH) + 'px' }">

            <!-- Time row -->
            <div class="cf-h-row cf-h-row-time">
              <div
                v-for="slot in daySlots"
                :key="'t-' + slot.index"
                class="cf-h-col cf-h-cell"
                :class="{ 'cf-h-col-current': isCurrent(slot.index) }"
              >
                <span v-if="sunEventsByNearestHour[slot.index]" class="cf-sun-time">
                  <span class="cf-sun-icon" v-html="sunEventsByNearestHour[slot.index].icon"></span>
                  <span>{{ sunEventsByNearestHour[slot.index].time }}</span>
                </span>
                <template v-else>{{ hourLabel(slot.index) }}</template>
              </div>
            </div>

            <!-- Chart row (strip / icons / bar / line) -->
            <div class="cf-h-chart" :class="{
              'cf-h-chart--icons': layout.chartStyle === 'icons' || layout.chartStyle === 'strip' || layout.chartStyle === 'line',
              'cf-h-chart--strip': layout.chartStyle === 'strip',
            }">
              <div
                v-for="slot in daySlots"
                :key="'c-' + slot.index"
                class="cf-h-col"
                :class="{
                  'cf-h-col-current': isCurrent(slot.index),
                  'cf-h-col-past':    isPast(slot.index),
                }"
              >
                <div class="cf-h-bar-area">
                  <template v-if="layout.chartStyle === 'bar'">
                    <div class="cf-h-bar-track">
                      <div class="cf-h-bar-fill" :style="barFillStyle(slot.index)">
                        <span v-if="activeDataPoint === 'wind'" class="cf-h-val-label cf-h-wind-cell cf-h-val-inside">
                          <span v-if="allWindDirs[slot.index] != null" class="cf-h-wind-arrow">
                            <svg viewBox="0 0 14 14" fill="none" aria-hidden="true"
                              :style="{ transform: `rotate(${(allWindDirs[slot.index] + 180) % 360}deg)`, transformOrigin: '50% 50%' }">
                              <line x1="7" y1="12" x2="7" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                              <polygon points="7,2 4,7 10,7" fill="currentColor"/>
                            </svg>
                          </span>
                          <span>{{ fmtVal(activeDataPoint, slot.index) }}</span>
                        </span>
                        <span v-else class="cf-h-val-label cf-h-val-inside">{{ fmtVal(activeDataPoint, slot.index) }}</span>
                      </div>
                    </div>
                  </template>
                  <template v-else>
                    <div class="cf-h-icon-track">
                      <div class="cf-h-float-group" :style="iconFloatStyle(slot.index)">
                        <span v-if="activeDataPoint === 'wind'" class="cf-h-val-label cf-h-wind-cell">
                          <span v-if="allWindDirs[slot.index] != null" class="cf-h-wind-arrow">
                            <svg viewBox="0 0 14 14" fill="none" aria-hidden="true"
                              :style="{ transform: `rotate(${(allWindDirs[slot.index] + 180) % 360}deg)`, transformOrigin: '50% 50%' }">
                              <line x1="7" y1="12" x2="7" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                              <polygon points="7,2 4,7 10,7" fill="currentColor"/>
                            </svg>
                          </span>
                          <span>{{ fmtVal(activeDataPoint, slot.index) }}</span>
                        </span>
                        <span v-else class="cf-h-val-label">{{ fmtVal(activeDataPoint, slot.index) }}</span>
                        <WeatherIcon class="cf-h-float-icon" :code="allCodes[slot.index]" :is-day="isHourDay(slot.index)" />
                      </div>
                    </div>
                  </template>
                </div>
              </div>

              <!-- Line chart SVG overlay -->
              <svg
                v-if="layout.chartStyle === 'line' && linePoints.length > 1"
                class="cf-h-line-svg"
                :width="24 * COL_WIDTH"
                :height="iconTrackH"
                aria-hidden="true"
              >
                <polyline
                  :points="linePoints.join(' ')"
                  fill="none"
                  :stroke="activeColor"
                  stroke-width="4"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>

            <!-- Weather icon row (bar style only) -->
            <div v-if="layout.chartStyle === 'bar'" class="cf-h-row cf-h-row-generic cf-other-points-row">
              <div
                v-for="slot in daySlots"
                :key="'wx-' + slot.index"
                class="cf-h-col cf-h-cell"
                :class="{ 'cf-h-col-current': isCurrent(slot.index) }"
              ><span class="cf-wx-icon"><WeatherIcon :code="allCodes[slot.index]" :is-day="isHourDay(slot.index)" /></span></div>
            </div>

            <!-- Other data rows -->
            <template v-for="pt in visibleOtherPoints" :key="pt.type">
              <div v-if="pt.type === 'wind'" class="cf-h-row cf-h-row-wind">
                <div
                  v-for="slot in daySlots"
                  :key="'w-' + slot.index"
                  class="cf-h-col cf-h-cell"
                  :class="{ 'cf-h-col-current': isCurrent(slot.index) }"
                  :style="{ color: DATA_TYPES.wind.color }"
                >
                  <span class="cf-h-wind-cell">
                    <span v-if="allWindDirs[slot.index] != null" class="cf-h-wind-arrow">
                      <svg viewBox="0 0 14 14" fill="none" aria-hidden="true"
                        :style="{ transform: `rotate(${(allWindDirs[slot.index] + 180) % 360}deg)`, transformOrigin: '50% 50%' }">
                        <line x1="7" y1="12" x2="7" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        <polygon points="7,2 4,7 10,7" fill="currentColor"/>
                      </svg>
                    </span>
                    <span class="cf-h-wind-speed">{{ fmtVal('wind', slot.index) }}</span>
                  </span>
                </div>
              </div>
              <div v-else class="cf-h-row cf-h-row-generic">
                <div
                  v-for="slot in daySlots"
                  :key="'g-' + pt.type + '-' + slot.index"
                  class="cf-h-col cf-h-cell"
                  :class="{ 'cf-h-col-current': isCurrent(slot.index) }"
                  :style="{ color: DATA_TYPES[pt.type]?.color }"
                >{{ fmtVal(pt.type, slot.index) }}</div>
              </div>
            </template>

          </div>
        </div>
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
import { computed, ref, watch, nextTick } from 'vue'
import { DATA_TYPES } from '../utils/dataTypes.js'
import { DEFAULT_COMBINED_FORECAST_LAYOUT } from '../composables/useSettings.js'
import { TILE_ICONS, CARD_ICONS } from '../utils/tileIcons.js'
import DataPointPicker from '../components/ui/DataPointPicker.vue'
import WeatherIcon from '../components/WeatherIcon.vue'

const COL_WIDTH = 54

const props = defineProps({
  daily:                   { type: Object, default: null },
  hourly:                  { type: Object, default: null },
  unitPrefs:               { type: Object, required: true },
  selectedDay:             { type: Number, default: 0 },
  utcOffset:               { type: Number, default: 0 },
  timeFormat:              { type: String, default: '12h' },
  combinedForecastLayout:  { type: Object, default: null },
  forecastDataPoint:       { type: String, default: null },
})

const emit = defineEmits(['day-selected', 'forecast-data-point'])

const stripScrollEl  = ref(null)
const hourlyScrollEl = ref(null)

// ── Layout ────────────────────────────────────────────────────────────────────

const layout = computed(() => props.combinedForecastLayout ?? DEFAULT_COMBINED_FORECAST_LAYOUT)

const CHART_SIZE_MULT = { S: 1, M: 1.6, L: 2.2 }
const chartSizeMult = computed(() => CHART_SIZE_MULT[layout.value.chartSize] ?? 1)
const cardSizeStyle = computed(() => ({ '--chart-size-mult': chartSizeMult.value }))
const BAR_TRACK_H_BASE  = 100
const ICON_TRACK_H_BASE = 96
const barTrackH  = computed(() => BAR_TRACK_H_BASE  * chartSizeMult.value)
const iconTrackH = computed(() => ICON_TRACK_H_BASE * chartSizeMult.value)

// ── Local selected day (instant updates + upward sync) ────────────────────────

const localSelectedDay = ref(props.selectedDay)

watch(() => props.selectedDay, (v) => {
  localSelectedDay.value = v
  nextTick(() => scrollStripToDay(v))
})

function selectDay(i) {
  localSelectedDay.value = i
  emit('day-selected', i)
}

// ── Strip day data ────────────────────────────────────────────────────────────

const days        = computed(() => props.daily?.time ?? [])
const displayDays = computed(() => {
  const n = layout.value.numDays
  return n != null ? days.value.slice(0, n) : days.value
})
const maxTemps = computed(() => props.daily?.temperature_2m_max ?? [])
const minTemps = computed(() => props.daily?.temperature_2m_min ?? [])

const datesNeedingDay = computed(() => {
  const seen = new Set(), needsDay = new Set()
  for (const isoDate of displayDays.value) {
    const [y, m, d] = isoDate.split('-').map(Number)
    const wd = new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('en', { weekday: 'short', timeZone: 'UTC' })
    if (seen.has(wd)) needsDay.add(isoDate)
    else seen.add(wd)
  }
  return needsDay
})

function dayLabel(isoDate) {
  const locDateStr = new Date(Date.now() + props.utcOffset * 1000).toISOString().slice(0, 10)
  if (isoDate === locDateStr) return 'Today'
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('en', { weekday: 'short', timeZone: 'UTC' })
}

function dayNumber(isoDate) {
  const locDateStr = new Date(Date.now() + props.utcOffset * 1000).toISOString().slice(0, 10)
  if (isoDate === locDateStr) return null
  if (!datesNeedingDay.value.has(isoDate)) return null
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('en', { day: 'numeric', timeZone: 'UTC' })
}

function fmtTemp(v) {
  if (v == null) return '–'
  return `${Math.round(v)}°`
}

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

function scrollStripToDay(i) {
  const el = stripScrollEl.value
  if (!el) return
  const cols = el.querySelectorAll('.cf-day-col')
  const col  = cols[i]
  if (!col) return
  const colLeft   = col.offsetLeft
  const colRight  = colLeft + col.offsetWidth
  const viewLeft  = el.scrollLeft
  const viewRight = viewLeft + el.clientWidth
  if (colLeft < viewLeft) {
    el.scrollTo({ left: colLeft, behavior: 'smooth' })
  } else if (colRight > viewRight) {
    el.scrollTo({ left: colRight - el.clientWidth, behavior: 'smooth' })
  }
}

// ── 24h slot array for selected day ──────────────────────────────────────────

const daySlots = computed(() => {
  const start = localSelectedDay.value * 24
  return Array.from({ length: 24 }, (_, j) => ({ index: start + j }))
})

watch(localSelectedDay, () => {
  nextTick(() => {
    if (hourlyScrollEl.value) hourlyScrollEl.value.scrollLeft = 0
  })
})

// ── Current / past hour ───────────────────────────────────────────────────────

const currentAbsoluteHour = computed(() => {
  if (!props.hourly?.time?.length) return 0
  const now = new Date(Date.now() + (props.utcOffset ?? 0) * 1000)
  const pad = (n) => String(n).padStart(2, '0')
  const target = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}T${pad(now.getUTCHours())}:00`
  const idx = props.hourly.time.findIndex(t => t === target)
  return idx >= 0 ? idx : now.getUTCHours()
})

function isCurrent(i) { return i === currentAbsoluteHour.value }
function isPast(i)    { return i < currentAbsoluteHour.value }

// ── Hourly helpers ────────────────────────────────────────────────────────────

function isHourDay(i) {
  const day  = Math.floor(i / 24)
  const hour = i % 24
  const sr = props.daily?.sunrise?.[day]
  const ss = props.daily?.sunset?.[day]
  if (!sr || !ss) return true
  const srH = parseInt(sr.split('T')[1])
  const ssH = parseInt(ss.split('T')[1])
  return hour >= srH && hour < ssH
}

function hourLabel(i) {
  const h = i % 24
  if (props.timeFormat === '24h') return String(h).padStart(2, '0')
  if (h === 0)  return '12am'
  if (h === 12) return '12pm'
  return h < 12 ? `${h}am` : `${h - 12}pm`
}

const allCodes    = computed(() => props.hourly?.weather_code ?? [])
const allWindDirs = computed(() => props.hourly?.wind_direction_10m ?? [])

// ── Sunrise / sunset in time row ──────────────────────────────────────────────

const sunEvents = computed(() => {
  if (!layout.value.showSunriseSunset || !props.daily) return {}
  const map = {}
  const fmt = (dtStr, type) => {
    if (!dtStr) return null
    const timePart = dtStr.split('T')[1]
    if (!timePart) return null
    const [h, m] = timePart.split(':').map(Number)
    const timeStr = props.timeFormat === '24h'
      ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      : `${h % 12 || 12}:${String(m).padStart(2, '0')}`
    const icon = type === 'sunrise' ? TILE_ICONS.sunrise : TILE_ICONS.sunset
    return { icon, time: timeStr }
  }
  const sunrises = props.daily.sunrise ?? []
  const sunsets  = props.daily.sunset  ?? []
  for (let day = 0; day < Math.max(sunrises.length, sunsets.length); day++) {
    const sr = sunrises[day]
    if (sr) {
      const h = parseInt(sr.split('T')[1])
      map[day * 24 + h] = { type: 'sunrise', ...fmt(sr, 'sunrise') }
    }
    const ss = sunsets[day]
    if (ss) {
      const h = parseInt(ss.split('T')[1])
      map[day * 24 + h] = { type: 'sunset', ...fmt(ss, 'sunset') }
    }
  }
  return map
})

const sunEventsByNearestHour = computed(() => {
  if (!layout.value.showSunriseSunset || !props.daily) return {}
  const rawEvents = sunEvents.value
  const visibleSet = new Set(daySlots.value.map(s => s.index))
  const result = {}
  const entries = Object.entries(rawEvents).map(([k, v]) => [Number(k), v])
  entries.sort((a, b) => a[0] - b[0])
  const usedSlots = new Set()
  const currentHour = currentAbsoluteHour.value
  for (const [rawHour, evt] of entries) {
    if (!visibleSet.has(rawHour) && !entries.some(([h]) => visibleSet.has(h) && Math.abs(h - rawHour) <= 1)) continue
    let best = null, bestDist = Infinity
    for (const idx of visibleSet) {
      if (usedSlots.has(idx)) continue
      if (idx < currentHour && rawHour !== idx) continue
      const d = Math.abs(idx - rawHour)
      if (d < bestDist) { bestDist = d; best = idx }
    }
    if (best != null && bestDist <= 1) {
      result[best] = evt
      usedSlots.add(best)
    }
  }
  return result
})

// ── Data point selection ──────────────────────────────────────────────────────

const activeDataPoint = ref(props.forecastDataPoint ?? layout.value.mainDataPoint)
watch(() => layout.value.mainDataPoint, (v) => { activeDataPoint.value = v })
watch(() => props.forecastDataPoint, (v) => { if (v) activeDataPoint.value = v })

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

// ── Value accessors ───────────────────────────────────────────────────────────

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

const totalHours    = computed(() => props.hourly?.time?.length ?? 0)
const allMainValues = computed(() =>
  Array.from({ length: totalHours.value }, (_, i) => getHourlyValue(activeDataPoint.value, i))
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
    const ratio   = v != null ? (v - min) / range : 0.5
    const heightPx = MIN_H + ratio * (trackH - MIN_H)
    return { bottom: '0', top: 'auto', height: `${heightPx}px`, background: bg }
  } else {
    if (v == null || v === 0) return { bottom: '0', top: 'auto', height: '0px', background: bg }
    const ratio   = v / (barMax.value || 1)
    const heightPx = MIN_H + ratio * (trackH - MIN_H)
    return { bottom: '0', top: 'auto', height: `${heightPx}px`, background: bg }
  }
}

const ICON_H    = 40
const LABEL_H   = 22
const ICON_GAP  = 2
const ICON_HALF = 12
const LINE_CY_OFFSET = LABEL_H + ICON_GAP + ICON_HALF

function iconFloatStyle(i) {
  if (layout.value.chartStyle === 'strip') return { top: '0px' }
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
  return daySlots.value.map((slot, arrayIdx) => {
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
    const cx = arrayIdx * COL_WIDTH + COL_WIDTH / 2
    const cy = topPx + LINE_CY_OFFSET
    return `${cx},${cy}`
  })
})

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
</script>

<style scoped>
.combined-forecast-card {
  padding: 10px 12px;
  overflow: hidden;
}

/* ── Header ─────────────────────────────────────────────────────────── */

.cf-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
}

.card-title-icon {
  display: flex;
  flex-shrink: 0;
  color: var(--text-muted);
}
.card-title-icon :deep(svg) { width: 16px; height: 16px; }
.card-title-icon :deep(svg), .card-title-icon :deep(svg *) { stroke: currentColor; fill: none; }

.cf-title {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
}

/* ── Daily strip ────────────────────────────────────────────────────── */

.cf-strip-wrapper {
  overflow: hidden;
}

.cf-strip {
  display: flex;
  flex-direction: row;
  overflow-x: auto;
  scrollbar-width: none;
  gap: 2px;
  padding-bottom: 4px;
}
.cf-strip::-webkit-scrollbar { display: none; }

.cf-day-col {
  flex: 0 0 54px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 2px 6px;
  border-radius: 8px;
  cursor: pointer;
  outline: 1.5px solid transparent;
  transition: background 0.15s, outline-color 0.15s;
  user-select: none;
}
.cf-day-col:hover { background: var(--card-hover, rgba(255,255,255,0.05)); }
.cf-day-col--selected {
  outline-color: var(--accent, #818cf8);
  background: var(--card-hover, rgba(255,255,255,0.05));
}

.cf-day-lbl {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.02em;
  line-height: 1.2;
}

.cf-day-num {
  font-size: 0.7rem;
  color: var(--text-faint);
  line-height: 1.1;
  margin-bottom: 1px;
}

.cf-day-icon {
  font-size: 1.4rem;
  line-height: 1;
  margin: 3px 0;
}

.cf-day-hi {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text);
  line-height: 1.2;
}

.cf-day-lo {
  font-size: 0.75rem;
  color: var(--text-faint);
  line-height: 1.2;
}

/* ── Divider ────────────────────────────────────────────────────────── */

.cf-divider {
  height: 1px;
  background: var(--card-border);
  margin: 8px 0;
}

/* ── Hourly section ─────────────────────────────────────────────────── */

.cf-hourly {
  overflow: hidden;
}

.cf-h-scroll-wrapper {
  position: relative;
  overflow: hidden;
}

.cf-h-scroll {
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
}
.cf-h-scroll::-webkit-scrollbar { display: none; }

.cf-h-inner {
  display: flex;
  flex-direction: column;
  position: relative;
  isolation: isolate;
}

.cf-h-col {
  width: 54px;
  flex-shrink: 0;
  flex-grow: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Time row ───────────────────────────────────────────────────────── */

.cf-h-row {
  display: flex;
  flex-direction: row;
}

.cf-h-cell {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.cf-h-row-time .cf-h-cell {
  font-size: 0.8rem;
  color: var(--text-faint);
}

/* ── Chart row ──────────────────────────────────────────────────────── */

.cf-h-chart {
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  padding: 0;
  position: relative;
}

.cf-h-chart--icons { align-items: flex-start; }

.cf-h-chart .cf-h-col {
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  padding: 0 2px;
  position: relative;
  z-index: 2;
}

.cf-h-bar-area {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 2px 4px;
}

.cf-h-bar-track {
  position: relative;
  width: 100%;
  height: calc(100px * var(--chart-size-mult, 1));
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
}

.cf-h-bar-fill {
  position: absolute;
  left: 0;
  right: 0;
  border-radius: 6px;
  min-height: 4px;
  transition: height 0.3s ease;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 3px;
  overflow: hidden;
}

.cf-h-val-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
}

.cf-h-val-inside {
  color: #fff;
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}

.cf-h-icon-track {
  position: relative;
  width: 100%;
  height: calc(96px * var(--chart-size-mult, 1));
  flex-shrink: 0;
}

.cf-h-chart--strip .cf-h-icon-track { height: 40px; }
.cf-h-chart--strip .cf-h-bar-area { padding-bottom: 16px; padding-top: 8px; }
.cf-h-chart--strip .cf-h-float-group { flex-direction: column-reverse; }

.cf-h-float-group {
  position: absolute;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.cf-h-float-icon {
  font-size: 1.5rem;
  line-height: 1;
}

.cf-h-line-svg {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 1;
  overflow: visible;
}

/* ── Data rows ──────────────────────────────────────────────────────── */

.cf-h-row-generic .cf-h-cell { font-size: 0.8rem; }

.cf-h-wind-cell {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 2px;
}
.cf-h-wind-arrow {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.cf-h-wind-arrow svg { width: 10px; height: 10px; }
.cf-h-wind-speed { font-size: 0.8rem; }
.cf-wx-icon { font-size: 1.5rem; line-height: 1rem; }

/* ── Current / past ─────────────────────────────────────────────────── */

.cf-h-col-current.cf-h-cell { color: var(--accent); font-weight: 600; }
.cf-h-col-past.cf-h-cell    { opacity: 0.55; }

/* ── Scrollbar on non-touch ─────────────────────────────────────────── */

@media (hover: hover) and (pointer: fine) {
  .cf-h-scroll {
    scrollbar-width: thin;
    scrollbar-color: var(--card-border) transparent;
  }
  .cf-h-scroll::-webkit-scrollbar { display: block; height: 4px; }
  .cf-h-scroll::-webkit-scrollbar-thumb { background: var(--card-border); border-radius: 2px; }
  .cf-h-scroll::-webkit-scrollbar-track { background: transparent; }
}

/* ── Sunrise / sunset ───────────────────────────────────────────────── */

.cf-sun-time {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 0.8rem;
  color: var(--sun);
}
</style>
