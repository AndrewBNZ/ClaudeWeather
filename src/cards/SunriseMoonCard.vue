<template>
  <div class="card sunrise-moon-card">
    <div class="sm-row">
      <!-- Sunrise/Sunset section -->
      <button class="sm-section sm-sun sm-sun-btn" @click="showSunSheet = true">
        <div class="sm-section-title">Sun</div>
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
        <div class="sm-moon-vis">
          <svg viewBox="0 0 40 40" width="56" height="56" class="moon-svg">
            <defs>
              <clipPath id="moon-clip">
                <circle cx="20" cy="20" r="18"/>
              </clipPath>
            </defs>
            <circle cx="20" cy="20" r="18" fill="#7C4DFF" stroke="rgba(148,163,184,0.25)" stroke-width="1"/>
            <path v-if="moonPath" :d="moonPath" fill="#E040FB" opacity="0.95" clip-path="url(#moon-clip)"/>
          </svg>
        </div>
        <div class="sm-moon-info">
          <div class="sm-moon-name">{{ phaseName }}</div>
          <div class="sm-moon-sub">{{ illumination }}% illuminated</div>
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
import { getMoonPhase, moonPathForPhase, moonPhaseName, moonIllumination } from '../utils/moonPhase.js'
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

// Sunrise/sunset always for today (day 0) — card shows current day only
const sunrise = computed(() => props.daily?.sunrise?.[0] ?? null)
const sunset  = computed(() => props.daily?.sunset?.[0] ?? null)

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
  const p = Math.min(Math.max(sunProgress.value, 0), 1)
  const end = arcPoint(p)
  return `M 5,50 A 45,45 0 0,1 ${end.x.toFixed(1)},${end.y.toFixed(1)}`
})

// Moon phase always for today (day 0)
const moonReferenceMs = computed(() => {
  const src = sunrise.value
  if (!src) return Date.now()
  return new Date(src.slice(0, 10) + 'T12:00:00Z').getTime()
})

const phase        = computed(() => getMoonPhase(moonReferenceMs.value))
const moonPath     = computed(() => moonPathForPhase(phase.value, props.lat))
const phaseName    = computed(() => moonPhaseName(phase.value))
const illumination = computed(() => moonIllumination(phase.value))
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
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-muted);
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
.sm-sun-btn:hover { background: var(--btn-hover); }

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
.sm-moon-btn:hover { background: var(--btn-hover); }

.sm-moon-vis { display: flex; justify-content: center; }
.moon-svg { display: block; }

.sm-moon-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.sm-moon-name { font-size: 0.85rem; font-weight: 500; color: var(--text); }
.sm-moon-sub  { font-size: 0.8rem; color: var(--text-muted); }
</style>
