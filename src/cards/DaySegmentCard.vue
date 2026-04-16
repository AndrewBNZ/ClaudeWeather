<template>
  <div class="day-segment-card card" :style="cardSizeStyle" @touchstart.passive="onTouchStart" @touchmove.passive="onTouchMove" @touchend.passive="onTouchEnd">
    <!-- Header -->
    <div v-if="layout.showTitle" class="seg-header">
      <span class="card-title-icon" v-html="CARD_ICONS.daySegment"></span>
      <h3 class="seg-title">Daily Dashboard</h3>
      <span class="seg-day-label">{{ dayTitle }}</span>
    </div>

    <div v-if="!hourly" class="seg-empty">No weather data</div>

    <div v-else class="seg-viewport">
      <div
        class="seg-slider"
        :style="sliderStyle"
      >
        <div class="seg-grid">
          <!-- Column headers -->
          <div class="seg-col-label">Morning</div>
          <div class="seg-col-label">Afternoon</div>
          <div class="seg-col-label">Evening</div>

          <!-- Condition row: weather icon, then temp + feelsLike below -->
          <div v-for="seg in segments" :key="'cond-' + seg.key" class="seg-cell seg-cell--condition">
            <WeatherIcon class="seg-wx-icon" :code="seg.dominantCode" :is-day="seg.isDay" />
            <span v-if="tempEnabled" class="seg-primary-val">
              {{ fmtSegValue('temperature', seg) }}
            </span>
            <span v-if="feelsEnabled" class="seg-secondary-val">
              {{ fmtSegValue('feelsLike', seg) }}
            </span>
          </div>

          <!-- Data rows -->
          <template v-for="row in visibleRows" :key="row.key">
            <div
              v-for="seg in segments"
              :key="row.key + '-' + seg.key"
              class="seg-cell seg-cell--data"
            >
              <!-- Row icon -->
              <template v-if="row.key === 'wind'">
                <span v-if="seg.avgWindDir != null" class="seg-data-icon seg-wind-arrow" :style="{ color: row.color }">
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"
                       :style="{ transform: `rotate(${seg.avgWindDir + 180}deg)`, transformOrigin: '50% 50%' }">
                    <line x1="10" y1="17" x2="10" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <polygon points="10,3 6,9 14,9" fill="currentColor"/>
                  </svg>
                </span>
                <span v-else class="seg-data-icon" v-html="row.icon"></span>
              </template>
              <span v-else class="seg-data-icon" v-html="row.icon"></span>

              <!-- Primary value -->
              <span class="seg-primary-val">
                <template v-if="row.key === 'wind'">
                  {{ fmtSegValue('wind', seg) }}<span class="seg-unit"> {{ windUnit }}</span>
                </template>
                <template v-else-if="row.key === 'rain'">
                  {{ fmtSegValue(row.primary, seg) }}<span class="seg-unit"> {{ ptUnit(row.primary) }}</span>
                </template>
                <template v-else>
                  {{ fmtSegValue(row.primary, seg) }}<span v-if="ptUnit(row.primary)" class="seg-unit"> {{ ptUnit(row.primary) }}</span>
                </template>
              </span>

              <!-- Secondary value (muted) -->
              <span v-if="row.secondary" class="seg-secondary-val">
                {{ fmtSegValue(row.secondary, seg) }}<span class="seg-unit">%</span>
              </span>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { DATA_TYPES } from '../utils/dataTypes.js'
import { TILE_ICONS, CARD_ICONS } from '../utils/tileIcons.js'
import { DEFAULT_DAY_SEGMENT_LAYOUT } from '../composables/useSettings.js'
import WeatherIcon from '../components/WeatherIcon.vue'

const props = defineProps({
  daily:            { type: Object, default: null },
  hourly:           { type: Object, default: null },
  unitPrefs:        { type: Object, required: true },
  selectedDay:      { type: Number, default: 0 },
  utcOffset:        { type: Number, default: 0 },
  daySegmentLayout: { type: Object, default: null },
})

const emit = defineEmits(['day-selected'])

const layout = computed(() => props.daySegmentLayout ?? DEFAULT_DAY_SEGMENT_LAYOUT)

const SIZE_MULT = { S: 0.7, M: 1.0, L: 1.4 }
const cardSizeStyle = computed(() => {
  const mult = SIZE_MULT[layout.value.size] ?? 1
  return { '--seg-size-mult': mult }
})

// ── Local day navigation ──────────────────────────────────────────────────────
const localDay = ref(props.selectedDay)
watch(() => props.selectedDay, d => { localDay.value = d })

const maxDay = computed(() => Math.max(0, (props.daily?.time?.length ?? 1) - 1))

// ── Swipe / slide animation ───────────────────────────────────────────────────
let touchStartX = 0
const dragOffset  = ref(0)   // live drag px offset
const isAnimating = ref(false)
const animateTo   = ref(0)   // target translateX during snap animation

const sliderStyle = computed(() => {
  if (isAnimating.value) {
    return { transform: `translateX(${animateTo.value}%)`, transition: 'transform 0.28s cubic-bezier(0.25,0.46,0.45,0.94)' }
  }
  return { transform: `translateX(${dragOffset.value}px)`, transition: 'none' }
})

function onTouchStart(e) {
  if (isAnimating.value) return
  touchStartX = e.touches[0].clientX
  dragOffset.value = 0
}

function onTouchMove(e) {
  const dx = e.touches[0].clientX - touchStartX
  // Resist at edges
  if ((dx > 0 && localDay.value === 0) || (dx < 0 && localDay.value === maxDay.value)) {
    dragOffset.value = dx * 0.2
  } else {
    dragOffset.value = dx
  }
}

function onTouchEnd(e) {
  const dx = e.changedTouches[0].clientX - touchStartX
  const threshold = 50

  if (dx < -threshold && localDay.value < maxDay.value) {
    // Slide out to left, then instantly reposition and slide in from right
    animateTo.value = -100
    isAnimating.value = true
    dragOffset.value = 0
    setTimeout(() => {
      isAnimating.value = false
      dragOffset.value = 0
      const nextDay = localDay.value + 1
      localDay.value = nextDay
      emit('day-selected', nextDay)
    }, 280)
  } else if (dx > threshold && localDay.value > 0) {
    animateTo.value = 100
    isAnimating.value = true
    dragOffset.value = 0
    setTimeout(() => {
      isAnimating.value = false
      dragOffset.value = 0
      const nextDay = localDay.value - 1
      localDay.value = nextDay
      emit('day-selected', nextDay)
    }, 280)
  } else {
    // Spring back
    animateTo.value = 0
    isAnimating.value = true
    dragOffset.value = 0
    setTimeout(() => { isAnimating.value = false }, 280)
  }
}

const enabledSet = computed(() => {
  const s = new Set()
  for (const p of layout.value.dataPoints) {
    if (p.enabled) s.add(p.type)
  }
  return s
})

const tempEnabled  = computed(() => enabledSet.value.has('temperature'))
const feelsEnabled = computed(() => enabledSet.value.has('feelsLike'))

// Build display rows — pairs related types, skips temp/feelsLike (shown in condition row)
const visibleRows = computed(() => {
  const rows = []
  const used = new Set(['temperature', 'feelsLike'])

  for (const pt of layout.value.dataPoints) {
    if (!pt.enabled) continue
    if (used.has(pt.type)) continue

    if (pt.type === 'rainAmount') {
      used.add('rainAmount')
      used.add('rainProb')
      rows.push({
        key:       'rain',
        primary:   'rainAmount',
        secondary: enabledSet.value.has('rainProb') ? 'rainProb' : null,
        color:     DATA_TYPES.rainAmount.color,
        icon:      TILE_ICONS[DATA_TYPES.rainAmount.iconKey ?? 'rainAmount'],
      })
    } else if (pt.type === 'rainProb') {
      used.add('rainProb')
      rows.push({
        key:       'rain',
        primary:   'rainProb',
        secondary: null,
        color:     DATA_TYPES.rainProb.color,
        icon:      TILE_ICONS[DATA_TYPES.rainProb.iconKey ?? 'rainProb'],
      })
    } else if (pt.type === 'wind') {
      used.add('wind')
      used.add('gusts')
      rows.push({
        key:       'wind',
        primary:   'wind',
        secondary: null,
        color:     DATA_TYPES.wind.color,
        icon:      TILE_ICONS[DATA_TYPES.wind.iconKey ?? 'wind'],
      })
    } else if (pt.type === 'gusts') {
      used.add('gusts')
      rows.push({
        key:       'gusts',
        primary:   'gusts',
        secondary: null,
        color:     DATA_TYPES.gusts.color,
        icon:      TILE_ICONS[DATA_TYPES.gusts.iconKey ?? 'gusts'],
      })
    } else {
      used.add(pt.type)
      rows.push({
        key:       pt.type,
        primary:   pt.type,
        secondary: null,
        color:     DATA_TYPES[pt.type]?.color ?? 'inherit',
        icon:      TILE_ICONS[DATA_TYPES[pt.type]?.iconKey ?? pt.type],
      })
    }
  }
  return rows
})

// ── Helpers ──────────────────────────────────────────────────────────────────

const windUnit = computed(() =>
  ({ kmh: 'km/h', mph: 'mph', ms: 'm/s', kn: 'kn' })[props.unitPrefs.wind] ?? 'km/h'
)

function ptUnit(type) {
  const cfg = DATA_TYPES[type]
  if (!cfg) return ''
  if (type === 'temperature' || type === 'feelsLike') return ''
  if (type === 'wind' || type === 'gusts') return ''
  return cfg.getUnit(props.unitPrefs)
}

// Return label for selected day
const dayTitle = computed(() => {
  const todayStr = new Date(Date.now() + props.utcOffset * 1000).toISOString().slice(0, 10)
  const dayDate  = props.daily?.time?.[localDay.value]
  if (!dayDate) return 'Today'
  if (dayDate === todayStr) return 'Today'
  const [y, m, d] = dayDate.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d, 12))
  return date.toLocaleDateString('en', { weekday: 'long', timeZone: 'UTC' })
})

// ── Segment computation ──────────────────────────────────────────────────────

function hourlySlice(key, startHour, endHour) {
  const arr = props.hourly?.[key] ?? []
  const base = localDay.value * 24
  return arr.slice(base + startHour, base + endHour)
}

function avg(vals) {
  const valid = vals.filter(v => v != null)
  if (!valid.length) return null
  return valid.reduce((a, b) => a + b, 0) / valid.length
}

function sum(vals) {
  const valid = vals.filter(v => v != null)
  return valid.length ? valid.reduce((a, b) => a + b, 0) : null
}

function dominantCode(codes) {
  const valid = codes.filter(v => v != null)
  if (!valid.length) return null
  const freq = {}
  for (const c of valid) freq[c] = (freq[c] ?? 0) + 1
  return Number(Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0])
}

function avgWindDir(dirs) {
  const valid = dirs.filter(v => v != null)
  if (!valid.length) return null
  const toRad = d => (d * Math.PI) / 180
  const sx = valid.reduce((a, d) => a + Math.sin(toRad(d)), 0)
  const sy = valid.reduce((a, d) => a + Math.cos(toRad(d)), 0)
  const angle = Math.atan2(sx, sy) * (180 / Math.PI)
  return (angle + 360) % 360
}

function segIsDay(startHour, endHour) {
  const midHour = (startHour + endHour) / 2
  const sunrise = props.daily?.sunrise?.[localDay.value]
  const sunset  = props.daily?.sunset?.[localDay.value]
  if (sunrise && sunset) {
    const srH = parseFloat(sunrise.split('T')[1]) || 6
    const ssH = parseFloat(sunset.split('T')[1])  || 20
    return midHour >= srH && midHour < ssH
  }
  return midHour >= 6 && midHour < 20
}

function buildSegment(key, startHour, endHour, label) {
  const codes    = hourlySlice('weather_code', startHour, endHour)
  const windDirs = hourlySlice('wind_direction_10m', startHour, endHour)
  return {
    key,
    label,
    startHour,
    endHour,
    isDay: segIsDay(startHour, endHour),
    dominantCode: dominantCode(codes),
    avgWindDir: avgWindDir(windDirs),
  }
}

const segments = computed(() => [
  buildSegment('morning',   layout.value.morningStart,   layout.value.morningEnd,   'Morning'),
  buildSegment('afternoon', layout.value.afternoonStart, layout.value.afternoonEnd, 'Afternoon'),
  buildSegment('evening',   layout.value.eveningStart,   layout.value.eveningEnd,   'Evening'),
])

// ── Value formatting per segment ─────────────────────────────────────────────

function getSegAvg(type, seg) {
  const cfg = DATA_TYPES[type]
  if (!cfg?.hourlyKey) return null
  const vals = hourlySlice(cfg.hourlyKey, seg.startHour, seg.endHour)
  if (type === 'rainAmount') return sum(vals)
  if (type === 'visibility') {
    const a = avg(vals)
    return a != null ? DATA_TYPES.visibility.scale(a, props.unitPrefs) : null
  }
  if (type === 'pressure') {
    const a = avg(vals)
    return a != null ? DATA_TYPES.pressure.scale(a, props.unitPrefs) : null
  }
  return avg(vals)
}

function fmtSegValue(type, seg) {
  const v = getSegAvg(type, seg)
  if (v == null) return '–'
  const cfg = DATA_TYPES[type]
  if (!cfg) return '–'

  if (type === 'temperature' || type === 'feelsLike') return `${Math.round(v)}°`
  if (type === 'rainAmount') {
    const dec = props.unitPrefs.precipitation === 'inch' ? 2 : 1
    return Number(v).toFixed(dec)
  }
  if (type === 'rainProb')   return `${Math.round(v)}`
  if (type === 'wind')       return `${Math.round(v)}`
  if (type === 'gusts')      return `${Math.round(v)}`
  if (type === 'uv')         return `${Math.round(v * 10) / 10}`
  if (type === 'humidity')   return `${Math.round(v)}`
  if (type === 'cloudCover') return `${Math.round(v)}`
  if (type === 'pressure') {
    const dec = cfg.getDecimals(props.unitPrefs)
    return Number(v).toFixed(dec)
  }
  if (type === 'visibility') return Number(v).toFixed(1)
  return `${Math.round(v)}`
}
</script>

<style scoped>
.day-segment-card {
  padding: 12px 14px 14px;
}

.seg-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
}

.seg-title {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
  margin: 0;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  flex: 1;
}

.seg-day-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
  letter-spacing: 0.01em;
}

.card-title-icon {
  display: flex;
  align-items: center;
  opacity: 0.8;
  filter: grayscale(1);
}

.seg-empty {
  color: var(--text-muted);
  font-size: 0.85rem;
  text-align: center;
  padding: 16px 0;
}

/* Viewport clips the sliding content */
.seg-viewport {
  overflow: hidden;
}

/* Slider translates on drag/animate */
.seg-slider {
  will-change: transform;
}

/* 3-column grid */
.seg-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0;
}

.seg-col-label {
  font-size: 0.8rem;
  letter-spacing: 0.04em;
  color: var(--text-faint);
  text-align: center;
  padding-bottom: 8px;
}

/* Every cell: centered column, icon on top then values */
.seg-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 4px;
  gap: 2px;
  min-width: 0;
}

.seg-cell--condition {
  padding: 4px 4px 8px;
}

/* Weather condition icon */
.seg-wx-icon {
  font-size: calc(3rem * var(--seg-size-mult, 1));
  line-height: 1;
}

/* Data type icon */
.seg-data-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.85;
}
.seg-data-icon :deep(svg) {
  width: calc(45px * var(--seg-size-mult, 1));
  height: calc(45px * var(--seg-size-mult, 1));
}

/* Wind arrow as data icon */
.seg-wind-arrow svg {
  width: calc(30px * var(--seg-size-mult, 1));
  height: calc(30px * var(--seg-size-mult, 1));
  color: currentColor;
}

/* Primary value */
.seg-primary-val {
  font-size: calc(1rem * var(--seg-size-mult, 1));
  font-weight: 700;
  line-height: 1.15;
  color: var(--text-muted);
}

/* Secondary value (feels like, rain %) — muted */
.seg-secondary-val {
  font-size: calc(0.85rem * var(--seg-size-mult, 1));
  font-weight: 500;
  line-height: 1.2;
  color: var(--text-faint);
}

/* Inline unit text — smaller, inherits color */
.seg-unit {
  font-size: 0.8em;
  font-weight: 400;
  letter-spacing: 0.02em;
  margin-left: 4px;
}
</style>
