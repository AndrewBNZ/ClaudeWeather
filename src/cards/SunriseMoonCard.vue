<template>
  <div class="card sunrise-moon-card">
    <div class="sm-row">
      <!-- Sunrise/Sunset section -->
      <button class="sm-section sm-sun sm-sun-btn" @click="showSunSheet = true">
        <div class="sm-section-title">Sun</div>
        <div v-if="showingSunTomorrow" class="sm-tomorrow">Tomorrow</div>
        <div class="sm-sun-arc">
          <svg viewBox="0 0 100 58" class="sun-arc-svg">
            <!-- Horizon line -->
            <line x1="2" y1="50" x2="98" y2="50" stroke="currentColor" stroke-opacity="0.12" stroke-width="1"/>
            <!-- Endpoint ticks -->
            <line x1="5" y1="46" x2="5" y2="54" stroke="currentColor" stroke-opacity="0.3" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="95" y1="46" x2="95" y2="54" stroke="currentColor" stroke-opacity="0.3" stroke-width="1.5" stroke-linecap="round"/>
            <!-- Arc track -->
            <path d="M 5,50 A 45,45 0 0,1 95,50" fill="none" stroke="currentColor" stroke-opacity="0.15" stroke-width="5"/>
            <!-- Progress arc -->
            <path v-if="sunProgress > 0" :d="sunProgressArc" fill="none" stroke="#FFC107" stroke-width="5" stroke-linecap="round"/>
            <!-- Sun glow halo -->
            <circle v-if="sunProgress >= 0 && sunProgress <= 1" :cx="sunDotX" :cy="sunDotY" r="7" fill="#FFC107" opacity="0.25"/>
            <!-- Sun dot -->
            <circle v-if="sunProgress >= 0 && sunProgress <= 1" :cx="sunDotX" :cy="sunDotY" r="4" fill="#FFC107"/>
            <!-- Day length inside arch -->
            <text x="50" y="40" text-anchor="middle" font-size="14" fill="currentColor" opacity="0.45">{{ dayLength }}</text>
          </svg>
        </div>
        <div class="sm-sun-times">
          <div class="sm-time-col sm-time-rise">
            <span class="sm-time-val">{{ sunriseFormatted }}</span>
            <span class="sm-time-label">Sunrise</span>
          </div>
          <div class="sm-time-col sm-time-set">
            <span class="sm-time-val">{{ sunsetFormatted }}</span>
            <span class="sm-time-label">Sunset</span>
          </div>
        </div>
      </button>

      <!-- Moon section -->
      <button class="sm-section sm-moon sm-moon-btn" @click="showMoonSheet = true">
        <div class="sm-section-title">Moon</div>
        <div v-if="showingTomorrow" class="sm-tomorrow">Tomorrow</div>
        <div class="sm-moon-arc">
          <svg viewBox="0 0 100 58" class="moon-arc-svg">
            <!-- Horizon line -->
            <line x1="2" y1="50" x2="98" y2="50" stroke="currentColor" stroke-opacity="0.12" stroke-width="1"/>
            <!-- Endpoint ticks -->
            <line x1="5" y1="46" x2="5" y2="54" stroke="currentColor" stroke-opacity="0.3" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="95" y1="46" x2="95" y2="54" stroke="currentColor" stroke-opacity="0.3" stroke-width="1.5" stroke-linecap="round"/>
            <!-- Arc track -->
            <path d="M 5,50 A 45,45 0 0,1 95,50" fill="none" stroke="currentColor" stroke-opacity="0.15" stroke-width="5"/>
            <!-- Progress arc -->
            <path v-if="moonProgress > 0 && moonArcEnd"
              :d="`M 5,50 A 45,45 0 0,1 ${moonArcEnd.x.toFixed(1)},${moonArcEnd.y.toFixed(1)}`"
              fill="none" stroke="#E040FB" stroke-width="5" stroke-linecap="round"/>
            <!-- Moon glow -->
            <circle v-if="moonProgress >= 0 && moonProgress <= 1"
              :cx="moonDotX" :cy="moonDotY" r="7" fill="#E040FB" opacity="0.25"/>
            <!-- Moon dot -->
            <circle v-if="moonProgress >= 0 && moonProgress <= 1"
              :cx="moonDotX" :cy="moonDotY" r="4" fill="#E040FB"/>
            <!-- Phase graphic centred in arch -->
            <defs>
              <clipPath id="card-moon-clip">
                <circle cx="50" cy="30" r="11"/>
              </clipPath>
            </defs>
            <circle cx="50" cy="30" r="11" fill="#7C4DFF" stroke="rgba(148,163,184,0.2)" stroke-width="0.75"/>
            <path v-if="moonPath" :d="moonPath" :transform="moonTransform" fill="#E040FB" opacity="0.95" clip-path="url(#card-moon-clip)"/>
          </svg>
        </div>
        <div class="sm-moon-times">
          <div class="sm-time-col">
            <span class="sm-time-val">{{ moonriseFormatted }}</span>
            <span class="sm-time-label">Moonrise</span>
          </div>
          <div class="sm-time-col">
            <span class="sm-time-val">{{ moonsetFormatted }}<sup v-if="moonsetNextDay" class="sm-next-day">+1</sup></span>
            <span class="sm-time-label">Moonset</span>
          </div>
        </div>
      </button>
    </div>

    <Teleport to="body">
      <Transition name="sun-sheet">
        <SunDetailSheet
          v-if="showSunSheet"
          :daily="daily"
          :lat="lat"
          :lon="lng"
          :time-format="timeFormat"
          :utc-offset="utcOffset"
          @close="showSunSheet = false"
        />
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="moon-sheet">
        <MoonDetailSheet
          v-if="showMoonSheet"
          :daily="daily"
          :lat="lat"
          :lon="lng"
          :time-format="timeFormat"
          :utc-offset="utcOffset"
          @close="showMoonSheet = false"
        />
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { getMoonPhase, moonPathForPhase, moonRiseSet } from '../utils/moonPhase.js'
import MoonDetailSheet from './MoonDetailSheet.vue'
import SunDetailSheet from './SunDetailSheet.vue'

const showSunSheet  = ref(false)
const showMoonSheet = ref(false)

const props = defineProps({
  daily:      { type: Object, default: null },
  selectedDay:{ type: Number, default: 0 },
  lat:        { type: Number, default: 0 },
  lng:        { type: Number, default: 0 },
  timeFormat: { type: String, default: '12h' },
  utcOffset:  { type: Number, default: 0 },  // seconds
})

const showingSunTomorrow = computed(() => {
  const s = props.daily?.sunset?.[0]
  if (!s) return false
  const localDate = new Date(Date.now() + props.utcOffset * 1000)
  const nowH = localDate.getUTCHours() + localDate.getUTCMinutes() / 60
  const [h, m] = s.slice(11, 16).split(':').map(Number)
  return nowH > h + m / 60
})

const sunrise = computed(() => props.daily?.sunrise?.[showingSunTomorrow.value ? 1 : 0] ?? null)
const sunset  = computed(() => props.daily?.sunset?.[showingSunTomorrow.value ? 1 : 0] ?? null)

function formatTime(isoStr, format) {
  if (!isoStr) return '—'
  const [h, m] = isoStr.slice(11, 16).split(':').map(Number)
  if (format === '24h') return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

const sunriseFormatted = computed(() => formatTime(sunrise.value, props.timeFormat))
const sunsetFormatted  = computed(() => formatTime(sunset.value, props.timeFormat))

const dayLength = computed(() => {
  if (!sunrise.value || !sunset.value) return '—'
  const riseMs = new Date(sunrise.value + 'Z').getTime()
  const setMs  = new Date(sunset.value + 'Z').getTime()
  const mins   = Math.round((setMs - riseMs) / 60000)
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
})

// Sun arc progress (0 = sunrise, 1 = sunset, <0 / >1 = night)
function parseHour(isoStr) {
  if (!isoStr) return null
  const [h, m] = isoStr.slice(11, 16).split(':').map(Number)
  return h + m / 60
}

const sunProgress = computed(() => {
  if (showingSunTomorrow.value) return -1
  const riseH = parseHour(sunrise.value)
  const setH  = parseHour(sunset.value)
  if (riseH == null || setH == null) return -1
  // Shift UTC now into the location's local time
  const localDate = new Date(Date.now() + props.utcOffset * 1000)
  const now = localDate.getUTCHours() + localDate.getUTCMinutes() / 60
  return (now - riseH) / (setH - riseH)
})

// Arc geometry: semicircle from (5,50) to (95,50), radius=45
function arcPoint(t) {
  const angle = Math.PI - t * Math.PI // 180° at t=0, 0° at t=1
  return { x: 50 + 45 * Math.cos(angle), y: 50 - 45 * Math.sin(angle) }
}

const sunDotPos = computed(() => arcPoint(Math.min(Math.max(sunProgress.value, 0), 1)))
const sunDotX   = computed(() => sunDotPos.value.x)
const sunDotY   = computed(() => sunDotPos.value.y)

const sunProgressArc = computed(() => {
  // Full arc after sunset (progress > 1), otherwise clamp to 0-1
  const p = sunProgress.value >= 1 ? 1 : Math.max(sunProgress.value, 0)
  const end = arcPoint(p)
  return `M 5,50 A 45,45 0 0,1 ${end.x.toFixed(1)},${end.y.toFixed(1)}`
})

// ── Moon (identical logic to MoonDetailSheet) ─────────────────────────────────

const moonRefDate = computed(() => {
  const src = props.daily?.sunrise?.[0]
  return src
    ? new Date(src.slice(0, 10) + 'T00:00:00Z')
    : new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z')
})

const showingTomorrow = computed(() => {
  const today = moonRiseSet(moonRefDate.value, props.lat, props.lng, props.utcOffset)
  return !!(today.set && Date.now() > today.set.getTime())
})

const moonRefMs = computed(() => {
  const base = moonRefDate.value.getTime() + 12 * 3600000
  return showingTomorrow.value ? base + 86400000 : base
})

const riseSet = computed(() => {
  const tomorrow = new Date(moonRefDate.value.getTime() + 86400000)
  const today = moonRiseSet(moonRefDate.value, props.lat, props.lng, props.utcOffset)
  const now = Date.now()

  if (today.set && now > today.set.getTime()) {
    return moonRiseSet(tomorrow, props.lat, props.lng, props.utcOffset)
  }
  if (today.rise && !today.set) {
    const tomorrowRiseSet = moonRiseSet(tomorrow, props.lat, props.lng, props.utcOffset)
    return { rise: today.rise, set: tomorrowRiseSet.set }
  }
  return today
})

function formatTimeMs(date) {
  if (!date) return '—'
  const localMs = date.getTime() + props.utcOffset * 1000
  const d = new Date(localMs)
  const h = d.getUTCHours()
  const m = d.getUTCMinutes()
  if (props.timeFormat === '24h') return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${ampm}`
}

const moonriseFormatted = computed(() => formatTimeMs(riseSet.value.rise))
const moonsetFormatted  = computed(() => formatTimeMs(riseSet.value.set))

// True when moonset falls on the next calendar day (set timestamp > rise timestamp but earlier clock time)
const moonsetNextDay = computed(() => {
  const { rise, set } = riseSet.value
  if (!rise || !set) return false
  const riseLocal = rise.getTime() + props.utcOffset * 1000
  const setLocal  = set.getTime()  + props.utcOffset * 1000
  return Math.floor(setLocal / 86400000) > Math.floor(riseLocal / 86400000)
})

const phase    = computed(() => getMoonPhase(moonRefMs.value))
const moonPath = computed(() => moonPathForPhase(phase.value, props.lat))
const moonTransform = `translate(${(50 - 20 * 11/18).toFixed(3)},${(30 - 20 * 11/18).toFixed(3)}) scale(${(11/18).toFixed(6)})`

// Moon arc progress
const moonProgress = computed(() => {
  const now = Date.now()
  let rise = riseSet.value.rise
  let set  = riseSet.value.set

  // If rise is in the future and set is before rise, the rise found belongs to the
  // next cycle — the moon actually rose yesterday. Use yesterday's rise with today's set.
  // Also handle the case where today has no rise at all (rise is null).
  const needsYesterday = !rise || (set && rise.getTime() > set.getTime() && now < rise.getTime())
  if (needsYesterday) {
    const yesterday = new Date(moonRefDate.value.getTime() - 86400000)
    const prev = moonRiseSet(yesterday, props.lat, props.lng, props.utcOffset)
    if (prev.rise) {
      rise = prev.rise
      if (!set) set = prev.set
      // Correct for JD interpolation pushing the rise past midnight by one day
      if (set && rise.getTime() > set.getTime()) {
        rise = new Date(rise.getTime() - 86400000)
      }
    }
  }

  if (!rise || !set) return -1
  if (now > set.getTime()) return -1
  return (now - rise.getTime()) / (set.getTime() - rise.getTime())
})

const moonDotPos = computed(() => arcPoint(Math.min(Math.max(moonProgress.value, 0), 1)))
const moonDotX   = computed(() => moonDotPos.value.x)
const moonDotY   = computed(() => moonDotPos.value.y)
const moonArcEnd = computed(() => moonProgress.value > 0 && moonProgress.value <= 1 ? moonDotPos.value : null)
</script>

<style scoped>
.sunrise-moon-card {
  padding: 12px 14px;
}

.sm-row {
  display: flex;
  gap: 14px;
}

.sm-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.sm-section-title {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
}

/* Sun arc */
.sm-sun-arc { width: 100%; padding: 0 4px; }
.sun-arc-svg { width: 100%; height: 56px; }

.sm-sun-times {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-around;
}
.sm-time-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}
.sm-time-rise { align-items: center; }
.sm-time-set  { align-items: center; }
.sm-time-label  { font-size: 0.8rem; color: var(--text-muted); }
.sm-tomorrow    { font-size: 0.65rem; color: var(--text-muted); opacity: 0.7; font-weight: 400; text-transform: none; letter-spacing: 0; margin-top: -4px; }
.sm-next-day    { font-size: 0.6rem; opacity: 0.6; vertical-align: super; margin-left: 1px; }
.sm-time-val    { font-size: 0.85rem; font-weight: 500; color: var(--text); }

/* Sun button */
.sm-sun-btn {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  color: inherit;
  cursor: pointer;
  border-radius: 10px;
  transition: background 0.15s;
}
.sm-sun-btn:hover { background: var(--card-hover); }

/* Moon */
.sm-moon-btn {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  color: inherit;
  cursor: pointer;
  border-radius: 10px;
  transition: background 0.15s;
}
.sm-moon-btn:hover { background: var(--card-hover); }

/* Moon arc */
.sm-moon-arc { width: 100%; padding: 0 4px; }
.moon-arc-svg { width: 100%; height: 56px; }

.sm-moon-times {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-around;
}
</style>
