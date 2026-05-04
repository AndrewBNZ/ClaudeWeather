<template>
  <div class="card sunrise-moon-card">
    <div class="sm-row">
      <!-- Sunrise/Sunset section -->
      <button class="sm-section sm-sun sm-sun-btn" @click="showSunSheet = true">
        <div class="sm-section-title">Sun</div>
        <div v-if="showingSunTomorrow || showingTomorrow" class="sm-tomorrow" :style="{ visibility: showingSunTomorrow ? 'visible' : 'hidden' }">Tomorrow</div>
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
        <div v-if="showingTomorrow || showingSunTomorrow" class="sm-tomorrow" :style="{ visibility: showingTomorrow ? 'visible' : 'hidden' }">Tomorrow</div>
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
import { getMoonPhase, moonPathForPhase } from '../utils/moonPhase.js'
import { useMoonArc } from '../composables/useMoonArc.js'
import { useSunArc } from '../composables/useSunArc.js'
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

const {
  showingSunTomorrow,
  sunriseFormatted,
  sunsetFormatted,
  dayLength,
  sunProgress,
} = useSunArc({
  daily:      computed(() => props.daily),
  utcOffset:  computed(() => props.utcOffset),
  timeFormat: computed(() => props.timeFormat),
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

// ── Moon ──────────────────────────────────────────────────────────────────────

const moonRefDate = computed(() => {
  const src = props.daily?.sunrise?.[0]
  return src
    ? new Date(src.slice(0, 10) + 'T00:00:00Z')
    : new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z')
})

const {
  showingTomorrow,
  riseSet,
  moonRefMs,
  currentPhase,
  moonriseFormatted,
  moonsetFormatted,
  moonsetNextDay,
  moonProgress,
} = useMoonArc({
  refDate:    moonRefDate,
  lat:        computed(() => props.lat),
  lon:        computed(() => props.lng),
  utcOffset:  computed(() => props.utcOffset),
  timeFormat: computed(() => props.timeFormat),
})

const moonPath      = computed(() => moonPathForPhase(currentPhase.value, props.lat))
const moonTransform = `translate(${(50 - 20 * 11/18).toFixed(3)},${(30 - 20 * 11/18).toFixed(3)}) scale(${(11/18).toFixed(6)})`

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
