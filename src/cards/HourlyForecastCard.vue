<template>
  <div class="card hourly-forecast-card" :style="cardSizeStyle">
    <!-- Header: title -->
    <div v-if="layout.showTitle" class="hf-header">
      <span class="card-title-icon" v-html="CARD_ICONS.combinedHourly"></span>
      <h3 class="hf-title">Hourly Forecast</h3>
    </div>

    <!-- Scrollable area -->
    <div class="hf-scroll-wrapper">
      <!-- Sticky date labels, positioned over the time row via JS -->
      <div class="hf-date-bar" ref="dateBarEl" aria-hidden="true">
        <span
          v-for="d in dateBoundaries"
          :key="d.dayIndex"
          class="hf-date-label"
        >{{ dateLabel(d.date) }}</span>
      </div>
    <div class="hf-scroll" ref="scrollEl" @scroll.passive="onHourlyScroll">
      <div class="hf-inner" :style="{ width: totalWidth + 'px' }">

        <!-- Alert highlight bands -->
        <div
          v-for="r in highlightRanges"
          :key="r.start"
          class="hf-alert-band"
          :style="{
            left:       (r.start - displayStartIndex) * COL_WIDTH + 'px',
            width:      (r.end - r.start + 1) * COL_WIDTH + 'px',
            background: 'transparent',
            border:     `1.5px solid ${highlightColor}`,
          }"
        />

        <!-- Time row -->
        <div class="hf-row hf-row-time">
          <div
            v-for="slot in allHoursArr"
            :key="'t-' + slot.index"
            class="hf-col hf-cell"
            :class="{
              'hf-col-current':   isCurrent(slot.index),
              'hf-col-day-start': isDayStart(slot.index),
            }"
          >
            <span v-if="sunEventsByNearestHour[slot.index]" class="hf-sun-time">
              <span class="hf-sun-icon" v-html="sunEventsByNearestHour[slot.index].icon"></span>
              <span>{{ sunEventsByNearestHour[slot.index].time }}</span>
            </span>
            <template v-else>{{ hourLabel(slot.index) }}</template>
          </div>
        </div>


        <!-- Bar chart row (main data point) -->
        <div class="hf-chart" :class="{ 'hf-chart--icons': layout.chartStyle === 'icons' || layout.chartStyle === 'line' }">
          <div
            v-for="slot in allHoursArr"
            :key="'c-' + slot.index"
            class="hf-col"
            :class="{
              'hf-col-current':   isCurrent(slot.index),
              'hf-col-past':      isPast(slot.index),
              'hf-col-day-start': isDayStart(slot.index),
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
              stroke-opacity="0.6"
              stroke-width="4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>

        <!-- Configurable other data rows -->
        <div v-if="layout.showConditions && layout.chartStyle === 'bar'" class="hf-row hf-row-generic other-data-points-row">
          <div
            v-for="slot in allHoursArr"
            :key="'wx-' + slot.index"
            class="hf-col hf-cell"
            :class="{
              'hf-col-current':   isCurrent(slot.index),
              'hf-col-day-start': isDayStart(slot.index),
            }"
          ><span class="wx-icon"><WeatherIcon :code="allCodes[slot.index]" :is-day="isHourDay(slot.index)" /></span></div>
        </div>
        <template v-for="pt in visibleOtherPoints" :key="pt.type">

          <!-- Wind: directional arrow + speed value -->
          <div v-if="pt.type === 'wind'" class="hf-row hf-row-wind">
            <div
              v-for="slot in allHoursArr"
              :key="'w-' + slot.index"
              class="hf-col hf-cell"
              :class="{
                'hf-col-current':   isCurrent(slot.index),
                'hf-col-day-start': isDayStart(slot.index),
              }"
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

          <!-- All other data types: single formatted value -->
          <div v-else class="hf-row hf-row-generic">
            <div
              v-for="slot in allHoursArr"
              :key="'g-' + pt.type + '-' + slot.index"
              class="hf-col hf-cell"
              :class="{
                'hf-col-current':   isCurrent(slot.index),
                'hf-col-day-start': isDayStart(slot.index),
              }"
              :style="{ color: DATA_TYPES[pt.type]?.color }"
            >{{ fmtVal(pt.type, slot.index) }}</div>
          </div>

        </template>

      </div>
    </div>
    </div>

    <!-- Data point picker pills -->
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
import { DATA_TYPES } from '../utils/dataTypes.js'
import { DEFAULT_HOURLY_FORECAST_LAYOUT } from '../composables/useSettings.js'
import { TILE_ICONS, CARD_ICONS } from '../utils/tileIcons.js'
import DataPointPicker from '../components/ui/DataPointPicker.vue'
import WeatherIcon from '../components/WeatherIcon.vue'

const COL_WIDTH = 54

const props = defineProps({
  hourly:               { type: Object, default: null },
  daily:                { type: Object, default: null },
  unitPrefs:            { type: Object, required: true },
  selectedDay:          { type: Number, default: 0 },
  utcOffset:            { type: Number, default: 0 },
  timeFormat:           { type: String, default: '12h' },
  hourlyForecastLayout: { type: Object, default: null },
  forecastDataPoint:    { type: String, default: null },
  focusHour:            { type: Number, default: null },
  highlightHours:       { type: Array,  default: null },
  highlightColor:       { type: String, default: null },
})

const emit = defineEmits(['forecast-data-point', 'day-selected'])

const scrollEl = ref(null)

// ── Layout config ─────────────────────────────────────────────────────────────

const layout = computed(() => props.hourlyForecastLayout ?? DEFAULT_HOURLY_FORECAST_LAYOUT)

const CHART_SIZE_MULT = { S: 1, M: 1.6, L: 2.2 }
const chartSizeMult = computed(() => CHART_SIZE_MULT[layout.value.chartSize] ?? 1)
const cardSizeStyle = computed(() => ({ '--chart-size-mult': chartSizeMult.value }))
const BAR_TRACK_H_BASE  = 100 // px at S size
const ICON_TRACK_H_BASE = 96  // px at S size
const barTrackH  = computed(() => BAR_TRACK_H_BASE  * chartSizeMult.value)
const iconTrackH = computed(() => ICON_TRACK_H_BASE * chartSizeMult.value)

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

// ── All hourly data ───────────────────────────────────────────────────────────

const totalHours        = computed(() => props.hourly?.time?.length ?? 0)
const displayStartIndex = computed(() => Math.max(0, currentAbsoluteHour.value - 1))

const allHoursArr = computed(() => {
  const items = []
  for (let i = displayStartIndex.value; i < totalHours.value; i++) {
    items.push({ type: 'hour', index: i })
  }
  return items
})

function isDayStart(i) {
  return i > displayStartIndex.value && i % 24 === 0
}

function isHourDay(i) {
  const day = Math.floor(i / 24)
  const hour = i % 24
  const sr = props.daily?.sunrise?.[day]
  const ss = props.daily?.sunset?.[day]
  if (!sr || !ss) return true
  const srH = parseInt(sr.split('T')[1])
  const ssH = parseInt(ss.split('T')[1])
  return hour >= srH && hour < ssH
}

const totalWidth = computed(() => allHoursArr.value.length * COL_WIDTH)

const allCodes    = computed(() => props.hourly?.weather_code ?? [])
const allWindDirs = computed(() => props.hourly?.wind_direction_10m ?? [])

// ── Sunrise / sunset events keyed by absolute hour index ─────────────────────

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

// Sun events mapped to nearest visible hour, avoiding collisions
const sunEventsByNearestHour = computed(() => {
  if (!layout.value.showSunriseSunset || !props.daily) return {}
  const rawEvents = sunEvents.value
  const visibleSet = new Set(allHoursArr.value.map(s => s.index))
  const result = {}
  // Sort events by their raw hour so earlier ones win ties
  const entries = Object.entries(rawEvents).map(([k, v]) => [Number(k), v])
  entries.sort((a, b) => a[0] - b[0])
  const usedSlots = new Set()
  const currentHour = currentAbsoluteHour.value
  for (const [rawHour, evt] of entries) {
    // Don't show past sun events unless they fall within the displayed past hour
    if (rawHour < currentHour - 1) continue
    // Find nearest visible hour not already taken
    // Past slots (idx < currentHour) only eligible if the raw event is within that same hour
    let best = null
    let bestDist = Infinity
    for (const idx of visibleSet) {
      if (usedSlots.has(idx)) continue
      if (idx < currentHour && rawHour !== idx) continue
      const d = Math.abs(idx - rawHour)
      if (d < bestDist) { bestDist = d; best = idx }
    }
    if (best != null) {
      result[best] = evt
      usedSlots.add(best)
    }
  }
  return result
})

// ── Scaled value accessor ─────────────────────────────────────────────────────

function getHourlyValue(type, i) {
  const dt = DATA_TYPES[type]
  if (!dt?.hourlyKey) return null
  const raw = props.hourly?.[dt.hourlyKey]?.[i]
  if (raw == null) return null
  if (type === 'visibility') return dt.scale(raw, props.unitPrefs)
  if (type === 'pressure')   return dt.scale(raw, props.unitPrefs)
  if (type === 'rainAmount') {
    return props.unitPrefs.precipitation === 'inch' ? raw * 0.0393701 : raw
  }
  return raw
}

// ── Main data point: bar heights ──────────────────────────────────────────────

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
  const MIN_H = 26 * chartSizeMult.value
  const trackH = barTrackH.value
  if (FLOATING_BAR_TYPES.has(activeDataPoint.value)) {
    const { min, range } = barRange.value
    const ratio = v != null ? (v - min) / range : 0.5
    const heightPx = MIN_H + ratio * (trackH - MIN_H)
    return { bottom: '0', top: 'auto', height: `${heightPx}px`, background: bg }
  } else {
    if (v == null || v === 0) return { bottom: '0', top: 'auto', height: '0px', background: bg }
    const ratio = v / (barMax.value || 1)
    const heightPx = MIN_H + ratio * (trackH - MIN_H)
    return { bottom: '0', top: 'auto', height: `${heightPx}px`, background: bg }
  }
}

// ── Sticky date labels ────────────────────────────────────────────────────────

const EDGE_PAD  = 0
const FADE_ZONE = 150
const dateBarEl = ref(null)

function dateLabel(dateStr) {
  if (!dateStr) return ''
  const todayStr = new Date(Date.now() + (props.utcOffset ?? 0) * 1000).toISOString().slice(0, 10)
  if (dateStr === todayStr) return 'Today'
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d, 12))
  return dt.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
}

// One entry per day boundary (including day 0 at natural left = 0)
const dateBoundaries = computed(() => {
  const result = []
  const start = displayStartIndex.value
  const day0 = Math.floor(start / 24)
  result.push({ dayIndex: day0, date: props.daily?.time?.[day0] ?? null, naturalLeft: 0 })
  for (let i = start + 1; i < totalHours.value; i++) {
    if (i % 24 === 0) {
      const dayIndex = i / 24
      result.push({ dayIndex, date: props.daily?.time?.[dayIndex] ?? null, naturalLeft: (i - start) * COL_WIDTH })
    }
  }
  return result
})

function positionDateLabels(scrollLeft) {
  const bar = dateBarEl.value
  if (!bar) return
  const boundaries = dateBoundaries.value
  const spans = bar.children
  for (let idx = 0; idx < boundaries.length; idx++) {
    const span = spans[idx]
    if (!span) continue
    const b    = boundaries[idx]
    const next = boundaries[idx + 1]
    const left = Math.max(b.naturalLeft - scrollLeft, EDGE_PAD)
    const nextDistToEdge = next ? (next.naturalLeft - scrollLeft) - EDGE_PAD : Infinity
    const opacity = Math.min(1, Math.max(0, nextDistToEdge / FADE_ZONE))
    span.style.left    = left + 'px'
    span.style.opacity = opacity
  }
}

// ── Current/past hour ─────────────────────────────────────────────────────────

const currentAbsoluteHour = computed(() => {
  const ms = Date.now() + (props.utcOffset ?? 0) * 1000
  return new Date(ms).getUTCHours()
})

function isCurrent(i) { return i === currentAbsoluteHour.value }
function isPast(i)    { return i < currentAbsoluteHour.value }

// ── Hour label ────────────────────────────────────────────────────────────────

function hourLabel(i) {
  const h = i % 24
  if (props.timeFormat === '24h') return String(h).padStart(2, '0')
  if (h === 0)  return '12am'
  if (h === 12) return '12pm'
  return h < 12 ? `${h}am` : `${h - 12}pm`
}

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

// ── Icons chart style ─────────────────────────────────────────────────────────

const ICON_H    = 40 // px — label + icon group height (label ~14px + gap 2px + icon ~24px at 1.5rem)
const LABEL_H   = 22 // px — approximate rendered height of the value label (0.85rem * ~1.2 line-height + rounding)
const ICON_GAP  = 2  // px — gap between label and icon in .hf-float-group
const ICON_HALF = 12 // px — half of icon height (1.5rem ≈ 24px)
const LINE_CY_OFFSET = LABEL_H + ICON_GAP + ICON_HALF // offset from float-group top to icon centre

function iconFloatStyle(i) {
  const v = allMainValues.value[i]
  let ratio // 0 = top (highest value), 1 = bottom (lowest)
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

// ── Line chart points ─────────────────────────────────────────────────────────

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
    const cx = arrayIdx * COL_WIDTH + COL_WIDTH / 2
    const cy = topPx + LINE_CY_OFFSET
    return `${cx},${cy}`
  })
})

// ── Alert hour highlights ─────────────────────────────────────────────────────

const highlightRanges = computed(() => {
  if (!props.highlightHours?.length) return []
  const sorted = [...props.highlightHours].sort((a, b) => a - b)
  const ranges = []
  let start = sorted[0], end = sorted[0]
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) { end = sorted[i] }
    else { ranges.push({ start, end }); start = end = sorted[i] }
  }
  ranges.push({ start, end })
  return ranges
})

// ── Scroll behaviour ──────────────────────────────────────────────────────────

const programmaticScroll = ref(false)
const userScrolling = ref(false)
let userScrollTimer = null
let programmaticScrollTimer = null

function onHourlyScroll() {
  if (!scrollEl.value) return
  const sl = scrollEl.value.scrollLeft
  positionDateLabels(sl)

  if (programmaticScroll.value) {
    // Keep flag true until scroll animation settles
    clearTimeout(programmaticScrollTimer)
    programmaticScrollTimer = setTimeout(() => { programmaticScroll.value = false }, 150)
    return
  }

  userScrolling.value = true
  clearTimeout(userScrollTimer)
  userScrollTimer = setTimeout(() => { userScrolling.value = false }, 150)
  const centerX  = sl + scrollEl.value.clientWidth / 2
  const slotIdx  = Math.round(centerX / COL_WIDTH)
  const slot     = allHoursArr.value[Math.min(slotIdx, allHoursArr.value.length - 1)]
  if (slot) emit('day-selected', Math.floor(slot.index / 24))
}

onMounted(() => {
  nextTick(() => {
    if (!scrollEl.value) return
    scrollEl.value.scrollTo({ left: 0 })
    positionDateLabels(0)
  })
})

// Scroll to the selected day only when the change came from the daily card, not from our own scroll
watch(() => props.selectedDay, (d) => {
  if (userScrolling.value) return
  nextTick(() => {
    if (!scrollEl.value) return
    const targetHour = d * 24
    const offset = Math.max(0, targetHour - displayStartIndex.value) * COL_WIDTH
    programmaticScroll.value = true
    scrollEl.value.scrollTo({ left: offset, behavior: 'smooth' })
  })
})

// Scroll to a specific absolute hour (e.g. from Custom Alerts tap)
watch(() => props.focusHour, (absHour) => {
  if (absHour == null) return
  nextTick(() => {
    if (!scrollEl.value) return
    const offset = Math.max(0, absHour - displayStartIndex.value) * COL_WIDTH
    programmaticScroll.value = true
    scrollEl.value.scrollTo({ left: offset, behavior: 'smooth' })
  })
})
</script>

<style scoped>
.hourly-forecast-card {
  padding: 10px 12px;
  overflow: hidden;
}

/* ── Header ─────────────────────────────────────────────────────────── */

.hf-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 0px;
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

.hf-title {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
}

/* ── Scroll container ────────────────────────────────────────────────── */

.hf-scroll-wrapper {
  position: relative;
  overflow: hidden;
}

/* Date bar: absolutely positioned overlay above the time row */
.hf-date-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 25px;
  pointer-events: none;
  z-index: 2;
}

.hf-date-label {
  position: absolute;
  top: 1px;
  white-space: nowrap;
  font-size: 0.8rem;
  color: var(--text-faint);
}

.hf-scroll {
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  padding-top: 20px;
  padding-bottom: 0;
}
.hf-scroll::-webkit-scrollbar { display: none; }

.hf-inner {
  display: flex;
  flex-direction: column;
  zzzgap: 3px;
  position: relative;
  isolation: isolate;
}

.hf-alert-band {
  position: absolute;
  top: 0;
  height: 26px;
  pointer-events: none;
  border-radius: 6px;
  z-index: -1;
  transition: left 0.3s ease, width 0.3s ease, background 0.3s ease, border-color 0.3s ease;
}

/* ── Column base ─────────────────────────────────────────────────────── */

.hf-col {
  width: 54px;
  flex-shrink: 0;
  flex-grow: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Day boundary line ───────────────────────────────────────────────── */
.hf-col-day-start {
  border-left: 1px solid var(--card-border);
}
.hf-row-time .hf-col-day-start {
  border-left: none;
}


/* ── Bar chart row ───────────────────────────────────────────────────── */

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
  zzzbackground: var(--card-border);
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

/* ── Data rows ───────────────────────────────────────────────────────── */

.hf-row {
  display: flex;
  flex-direction: row;
}

.hf-cell {
  zzzheight: 18px;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.hf-row-time .hf-cell {
  font-size: 0.8rem;
  color: var(--text-faint);
  zzzheight: 26px;
}

/* Wind row */
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

/* Other data points rows */
.other-data-points-row {
}

/* Generic row: inherits inline :style color */
.hf-row-generic .hf-cell { font-size: 0.8rem; }

/* ── Current hour highlight ──────────────────────────────────────────── */
.hf-col-current.hf-cell { color: var(--accent); font-weight: 600; }

/* ── Past hours fade ─────────────────────────────────────────────────── */
.hf-col-past.hf-cell { opacity: 0.55; }

/* ── Show scrollbar on non-touch devices ─────────────────────────────── */
@media (hover: hover) and (pointer: fine) {
  .hf-scroll {
    scrollbar-width: thin;
    scrollbar-color: var(--card-border) transparent;
  }
  .hf-scroll::-webkit-scrollbar { display: block; height: 4px; }
  .hf-scroll::-webkit-scrollbar-thumb { background: var(--card-border); border-radius: 2px; }
  .hf-scroll::-webkit-scrollbar-track { background: transparent; }
}

/* ── Sunrise / sunset in time row ───────────────────────────────────── */

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
