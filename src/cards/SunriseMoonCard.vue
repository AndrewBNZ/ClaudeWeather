<template>
  <div class="card sunrise-moon-card">
    <div class="sm-row">
      <!-- Sunrise/Sunset section -->
      <div class="sm-section sm-sun">
        <div class="sm-section-title">Sun</div>
        <div class="sm-sun-arc">
          <svg viewBox="0 0 100 55" class="sun-arc-svg">
            <!-- Arc path -->
            <path d="M 5,50 A 45,45 0 0,1 95,50" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="2"/>
            <!-- Progress arc -->
            <path v-if="sunProgress > 0" :d="sunProgressArc" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"/>
            <!-- Sun dot -->
            <circle :cx="sunDotX" :cy="sunDotY" r="4" fill="#fbbf24" v-if="sunProgress >= 0 && sunProgress <= 1"/>
          </svg>
        </div>
        <div class="sm-sun-times">
          <div class="sm-time-item">
            <span class="sm-time-icon">🌅</span>
            <span class="sm-time-val">{{ sunriseFormatted }}</span>
          </div>
          <div class="sm-time-sep">{{ dayLength }}</div>
          <div class="sm-time-item">
            <span class="sm-time-icon">🌇</span>
            <span class="sm-time-val">{{ sunsetFormatted }}</span>
          </div>
        </div>
      </div>

      <!-- Moon section -->
      <div class="sm-section sm-moon">
        <div class="sm-section-title">Moon</div>
        <div class="sm-moon-vis">
          <svg viewBox="0 0 40 40" width="56" height="56" class="moon-svg">
            <circle cx="20" cy="20" r="18" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
            <path v-if="moonPath" :d="moonPath" fill="#e2e8f0" opacity="0.9"/>
          </svg>
        </div>
        <div class="sm-moon-info">
          <div class="sm-moon-name">{{ phaseName }}</div>
          <div class="sm-moon-illum">{{ illumination }}% lit</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getMoonPhase, moonPathForPhase, moonPhaseName, moonIllumination } from '../utils/moonPhase.js'

const props = defineProps({
  daily:      { type: Object, default: null },
  selectedDay:{ type: Number, default: 0 },
  lat:        { type: Number, default: 0 },
  timeFormat: { type: String, default: '12h' },
})

// Sunrise/sunset for selected day
const sunrise = computed(() => props.daily?.sunrise?.[props.selectedDay] ?? null)
const sunset  = computed(() => props.daily?.sunset?.[props.selectedDay] ?? null)

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
  const now = new Date().getUTCHours() + new Date().getUTCMinutes() / 60
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
  const large = p > 0.5 ? 1 : 0
  return `M 5,50 A 45,45 0 ${large},1 ${end.x.toFixed(1)},${end.y.toFixed(1)}`
})

// Moon phase (for the selected day using sunrise date as reference)
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
  padding: 14px;
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
  gap: 8px;
}

.sm-section-title {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  align-self: flex-start;
}

/* Sun arc */
.sm-sun-arc { width: 100%; padding: 0 4px; }
.sun-arc-svg { width: 100%; height: auto; }

.sm-sun-times {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}
.sm-time-item {
  display: flex;
  align-items: center;
  gap: 4px;
}
.sm-time-icon { font-size: 0.9rem; }
.sm-time-val  { font-size: 0.82rem; font-weight: 600; color: var(--text); }
.sm-time-sep  { font-size: 0.72rem; color: var(--text-faint); white-space: nowrap; }

/* Moon */
.sm-moon-vis { display: flex; justify-content: center; }
.moon-svg { display: block; }

.sm-moon-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.sm-moon-name  { font-size: 0.85rem; font-weight: 600; color: var(--text); }
.sm-moon-illum { font-size: 0.75rem; color: var(--text-faint); }
</style>
