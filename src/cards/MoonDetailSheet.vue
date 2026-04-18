<template>
  <div class="moon-sheet-overlay" @click.self="$emit('close')">
    <div class="moon-sheet">
      <div class="moon-sheet-header">
        <div class="moon-sheet-title">Moon</div>
        <button class="moon-sheet-help" @click="showHelp = true">?</button>
        <button class="moon-sheet-close" @click="$emit('close')">✕</button>
      </div>

      <!-- Help modal -->
      <Teleport to="body">
        <Transition name="moon-help">
          <div v-if="showHelp" class="moon-help-overlay" @click.self="showHelp = false">
            <div class="moon-help-modal">
              <div class="moon-help-header">
                <span class="moon-help-title">About the Moon</span>
                <button class="moon-sheet-close" @click="showHelp = false">✕</button>
              </div>
              <div class="moon-help-body">
                <div class="moon-help-section">Phases</div>
                <p>The Moon cycles through eight phases every <strong>29.5 days</strong> as sunlight illuminates different portions of its face.</p>
                <div class="moon-help-phases">
                  <div class="moon-help-phase" v-for="p in PHASE_INFO" :key="p.key">
                    <svg viewBox="0 0 40 40" width="26" height="26">
                      <defs>
                        <clipPath :id="`help-clip-${p.key}`">
                          <circle cx="20" cy="20" r="18"/>
                        </clipPath>
                      </defs>
                      <circle cx="20" cy="20" r="18" fill="#7C4DFF" stroke="rgba(148,163,184,0.25)" stroke-width="1"/>
                      <path v-if="p.path" :d="p.path" fill="#E040FB" opacity="0.95" :clip-path="`url(#help-clip-${p.key})`"/>
                    </svg>
                    <div class="moon-help-phase-text">
                      <span class="moon-help-phase-name">{{ p.name }}</span>
                      <span class="moon-help-phase-desc">{{ p.desc }}</span>
                    </div>
                  </div>
                </div>

                <div class="moon-help-section">Rise &amp; Set</div>
                <p>The Moon rises ~<strong>50 minutes later</strong> each day. A full moon rises near sunset; a new moon rises with the sun.</p>

                <div class="moon-help-section">Southern Hemisphere</div>
                <p>The Moon appears rotated 180° — a waxing crescent lights the <strong>left</strong> side rather than the right.</p>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>
      <div class="moon-sheet-body">

        <!-- Moon arc -->
        <div>
        <div class="moon-section-label">{{ todayLabel }}</div>
        <div class="moon-arc-block">
          <svg viewBox="0 0 200 100" class="moon-arc-svg">
            <!-- Horizon line -->
            <line x1="10" y1="92" x2="190" y2="92" stroke="currentColor" stroke-opacity="0.12" stroke-width="1"/>
            <!-- Endpoint ticks -->
            <line x1="15" y1="88" x2="15" y2="96" stroke="currentColor" stroke-opacity="0.3" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="185" y1="88" x2="185" y2="96" stroke="currentColor" stroke-opacity="0.3" stroke-width="1.5" stroke-linecap="round"/>
            <!-- Arc track -->
            <path d="M 15,92 A 85,85 0 0,1 185,92" fill="none" stroke="currentColor" stroke-opacity="0.15" stroke-width="8"/>
            <!-- Progress arc -->
            <path v-if="moonProgress > 0 && moonProgressEnd"
              :d="`M 15,92 A 85,85 0 0,1 ${moonProgressEnd.x.toFixed(1)},${moonProgressEnd.y.toFixed(1)}`"
              fill="none" stroke="#E040FB" stroke-width="8" stroke-linecap="round"/>
            <!-- Moon glow -->
            <circle v-if="moonProgress >= 0 && moonProgress <= 1"
              :cx="moonDotPos.x" :cy="moonDotPos.y" r="10" fill="#E040FB" opacity="0.2"/>
            <!-- Moon dot -->
            <circle v-if="moonProgress >= 0 && moonProgress <= 1"
              :cx="moonDotPos.x" :cy="moonDotPos.y" r="5.5" fill="#E040FB"/>
            <!-- Phase graphic centred in arch -->
            <defs>
              <clipPath id="sheet-moon-clip">
                <circle cx="100" cy="60" r="22"/>
              </clipPath>
            </defs>
            <circle cx="100" cy="60" r="22" fill="#7C4DFF" stroke="rgba(148,163,184,0.2)" stroke-width="1"/>
            <path v-if="moonPathCurrent" :d="moonPathCurrent" :transform="sheetMoonTransform" fill="#E040FB" opacity="0.95" clip-path="url(#sheet-moon-clip)"/>
          </svg>
          <div class="moon-arc-times">
            <div class="moon-arc-col moon-arc-left">
              <span class="moon-arc-val">{{ moonriseFormatted }}</span>
              <span class="moon-arc-label">Moonrise</span>
            </div>
            <div class="moon-arc-col moon-arc-mid">
              <span class="moon-arc-val">{{ phaseName }}</span>
              <span class="moon-arc-label">{{ illumination }}% illuminated</span>
            </div>
            <div class="moon-arc-col moon-arc-right">
              <span class="moon-arc-val">{{ moonsetFormatted }}</span>
              <span class="moon-arc-label">Moonset</span>
            </div>
          </div>
        </div>
        </div>

        <!-- Key phases -->
        <div>
          <div class="moon-section-label">Upcoming Phases</div>
          <div class="moon-group">
            <div v-for="kp in keyPhases" :key="kp.label" class="moon-row">
              <div class="moon-phase-left">
                <svg viewBox="0 0 40 40" width="28" height="28" class="moon-icon-sm">
                  <defs>
                    <clipPath :id="`kp-clip-${kp.key}`">
                      <circle cx="20" cy="20" r="18"/>
                    </clipPath>
                  </defs>
                  <circle cx="20" cy="20" r="18" fill="#7C4DFF" stroke="rgba(148,163,184,0.25)" stroke-width="1"/>
                  <path v-if="kp.path" :d="kp.path" fill="#E040FB" opacity="0.95" :clip-path="`url(#kp-clip-${kp.key})`"/>
                </svg>
                <span class="moon-row-label">{{ kp.label }}</span>
              </div>
              <span class="moon-row-value">{{ kp.dateStr }}</span>
            </div>
          </div>
        </div>

        <!-- 7-day moon list -->
        <div>
          <div class="moon-section-label">Next 7 Days</div>
          <div class="moon-group">
            <div v-for="day in sevenDays" :key="day.dateKey" class="moon-row">
              <span class="moon-day-name">{{ day.dayName }}</span>
              <svg viewBox="0 0 40 40" width="28" height="28" class="moon-icon-sm">
                <defs>
                  <clipPath :id="`day-clip-${day.dateKey}`">
                    <circle cx="20" cy="20" r="18"/>
                  </clipPath>
                </defs>
                <circle cx="20" cy="20" r="18" fill="#7C4DFF" stroke="rgba(148,163,184,0.25)" stroke-width="1"/>
                <path v-if="day.path" :d="day.path" fill="#E040FB" opacity="0.95" :clip-path="`url(#day-clip-${day.dateKey})`"/>
              </svg>
              <span class="moon-day-phase">{{ day.phaseName }}</span>
              <span class="moon-day-illum">{{ day.illumination }}%</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import {
  getMoonPhase,
  moonPathForPhase,
  moonPhaseName,
  moonIllumination,
  nextKeyPhases,
  moonRiseSet,
} from '../utils/moonPhase.js'

const props = defineProps({
  daily:      { type: Object, default: null },
  lat:        { type: Number, default: 0 },
  lon:        { type: Number, default: 0 },
  timeFormat: { type: String, default: '12h' },
  utcOffset:  { type: Number, default: 0 },  // seconds
})
defineEmits(['close'])

const showHelp = ref(false)

const PHASE_INFO = [
  { key: 'new',       name: 'New Moon',        desc: 'Between Earth and Sun — invisible.',          path: '' },
  { key: 'wax-cres',  name: 'Waxing Crescent', desc: 'Slim sliver on the right, growing.',          path: moonPathForPhase(0.12, 0) },
  { key: 'first-q',   name: 'First Quarter',   desc: 'Half lit on the right. Rises at noon.',       path: moonPathForPhase(0.25, 0) },
  { key: 'wax-gib',   name: 'Waxing Gibbous',  desc: 'More than half lit, approaching full.',       path: moonPathForPhase(0.37, 0) },
  { key: 'full',      name: 'Full Moon',        desc: 'Fully lit. Rises at sunset, sets at sunrise.',path: moonPathForPhase(0.5,  0) },
  { key: 'wan-gib',   name: 'Waning Gibbous',  desc: 'More than half lit, fading from full.',       path: moonPathForPhase(0.63, 0) },
  { key: 'last-q',    name: 'Last Quarter',    desc: 'Half lit on the left. Rises at midnight.',    path: moonPathForPhase(0.75, 0) },
  { key: 'wan-cres',  name: 'Waning Crescent', desc: 'Slim sliver on the left, shrinking.',         path: moonPathForPhase(0.88, 0) },
]

// ── Moonrise / Moonset (calculated) ──────────────────────────────────────────

function formatTimeDate(date, format) {
  if (!date) return '—'
  // Convert UTC Date to location local time via utcOffset
  const localMs = date.getTime() + props.utcOffset * 1000
  const d = new Date(localMs)
  const h = d.getUTCHours()
  const m = d.getUTCMinutes()
  if (format === '24h') return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

// ── Reference date/timestamp for the selected day ────────────────────────────

const todayLabel = computed(() => {
  const src = props.daily?.sunrise?.[0]
  if (!src) return showingTomorrow.value ? 'Tomorrow' : 'Today'
  const dateStr = src.slice(0, 10)
  const [y, mo, d] = dateStr.split('-').map(Number)
  const offset = showingTomorrow.value ? 1 : 0
  const dt = new Date(Date.UTC(y, mo - 1, d + offset, 12))
  const prefix = showingTomorrow.value ? 'Tomorrow' : 'Today'
  return prefix + ' · ' + dt.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
})

const refDate = computed(() => {
  const src = props.daily?.sunrise?.[0]
  return src
    ? new Date(src.slice(0, 10) + 'T00:00:00Z')
    : new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z')
})

const refMs = computed(() => refDate.value.getTime() + 12 * 3600000)

const showingTomorrow = computed(() => {
  const today = moonRiseSet(refDate.value, props.lat, props.lon, props.utcOffset)
  return !!(today.set && Date.now() > today.set.getTime())
})

const riseSet = computed(() => {
  const tomorrow = new Date(refDate.value.getTime() + 86400000)
  const today = moonRiseSet(refDate.value, props.lat, props.lon, props.utcOffset)
  const now = Date.now()

  // If today's moonset has passed, show tomorrow's rise/set pair
  if (today.set && now > today.set.getTime()) {
    return moonRiseSet(tomorrow, props.lat, props.lon, props.utcOffset)
  }

  // If the moon rises today but sets tomorrow (no set in today's window),
  // borrow tomorrow's set so the display isn't blank
  if (today.rise && !today.set) {
    const tomorrowRiseSet = moonRiseSet(tomorrow, props.lat, props.lon, props.utcOffset)
    return { rise: today.rise, set: tomorrowRiseSet.set }
  }

  return today
})

const moonriseFormatted = computed(() => formatTimeDate(riseSet.value.rise, props.timeFormat))
const moonsetFormatted  = computed(() => formatTimeDate(riseSet.value.set,  props.timeFormat))

const currentPhase  = computed(() => getMoonPhase(refMs.value))
const phaseName        = computed(() => moonPhaseName(currentPhase.value))
const illumination     = computed(() => moonIllumination(currentPhase.value))
const moonPathCurrent  = computed(() => moonPathForPhase(currentPhase.value, props.lat))
const sheetMoonTransform = `translate(${(100 - 20 * 22/18).toFixed(3)},${(60 - 20 * 22/18).toFixed(3)}) scale(${(22/18).toFixed(6)})`

// ── Moon arc ──────────────────────────────────────────────────────────────────
// t=0 → left (15,92), t=1 → right (185,92), centre 100,92 radius 85
function arcPoint(t) {
  const angle = Math.PI - t * Math.PI
  return { x: 100 + 85 * Math.cos(angle), y: 92 - 85 * Math.sin(angle) }
}

const moonProgress = computed(() => {
  const now = Date.now()
  let rise = riseSet.value.rise
  let set  = riseSet.value.set

  // If rise is in the future and set is before rise, the rise found belongs to the
  // next cycle — the moon actually rose yesterday. Use yesterday's rise with today's set.
  // Also handle the case where today has no rise at all (rise is null).
  const needsYesterday = !rise || (set && rise.getTime() > set.getTime() && now < rise.getTime())
  if (needsYesterday) {
    const yesterday = new Date(refDate.value.getTime() - 86400000)
    const prev = moonRiseSet(yesterday, props.lat, props.lon, props.utcOffset)
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

  // If we're past moonset, return -1 to hide the arc
  if (now > set.getTime()) return -1

  return (now - rise.getTime()) / (set.getTime() - rise.getTime())
})

const moonDotPos      = computed(() => arcPoint(Math.min(Math.max(moonProgress.value, 0), 1)))
const moonProgressEnd = computed(() => moonProgress.value > 0 && moonProgress.value <= 1 ? moonDotPos.value : null)

// ── Key phases ────────────────────────────────────────────────────────────────

const PHASE_LABELS = [
  { key: 'newMoon',      label: 'New Moon',      target: 0    },
  { key: 'firstQuarter', label: 'First Quarter',  target: 0.25 },
  { key: 'fullMoon',     label: 'Full Moon',      target: 0.5  },
  { key: 'lastQuarter',  label: 'Last Quarter',   target: 0.75 },
]

const keyPhases = computed(() => {
  const phases = nextKeyPhases(refMs.value)
  return PHASE_LABELS.map(({ key, label }) => {
    const date = phases[key]
    const p = getMoonPhase(date.getTime())
    return {
      key,
      label,
      date,
      dateStr: date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }),
      path: moonPathForPhase(p, props.lat),
    }
  }).sort((a, b) => a.date - b.date)
})

// ── 7-day list ────────────────────────────────────────────────────────────────

const sevenDays = computed(() => {
  const base = refMs.value
  return Array.from({ length: 7 }, (_, i) => {
    const ms = base + i * 24 * 60 * 60 * 1000
    const date = new Date(ms)
    const p = getMoonPhase(ms)
    const dateKey = date.toISOString().slice(0, 10)
    return {
      dateKey,
      dayName: i === 0
        ? 'Today'
        : date.toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' }),
      path: moonPathForPhase(p, props.lat),
      phaseName: moonPhaseName(p),
      illumination: moonIllumination(p),
    }
  })
})
</script>

<style scoped>
/* ── Help button ── */
.moon-sheet-help {
  flex-shrink: 0;
  background: none;
  border: none;
  color: inherit;
  opacity: 0.45;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.2rem 0.5rem;
  line-height: 1;
}
.moon-sheet-help:hover { opacity: 0.8; }

/* ── Help modal transition ── */
.moon-help-enter-active,
.moon-help-leave-active { transition: opacity 0.18s ease; }
.moon-help-enter-from,
.moon-help-leave-to { opacity: 0; }

/* ── Help overlay ── */
.moon-help-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
}

/* ── Help modal panel ── */
.moon-help-modal {
  background: var(--sheet-bg);
  border: 1px solid var(--panel-border, rgba(255,255,255,0.08));
  border-radius: 16px;
  width: 100%;
  max-width: 420px;
  max-height: calc(100dvh - 48px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--shadow);
}

.moon-help-header {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--panel-border, rgba(255,255,255,0.08));
  flex-shrink: 0;
}
.moon-help-title {
  flex: 1;
  font-size: 1rem;
  font-weight: 600;
}

.moon-help-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 14px 16px 20px;
  font-size: 0.85rem;
  line-height: 1.55;
  color: var(--text);
}

.moon-help-body > * + * { margin-top: 0.6rem; }
.moon-help-body p { margin: 0; opacity: 0.8; }
.moon-help-body strong { color: var(--text); opacity: 1; }

.moon-help-section {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.5;
  margin-top: 0.4rem;
}

.moon-help-phases {
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: var(--sheet-item-bg);
  border-radius: 12px;
  overflow: hidden;
}
.moon-help-phase {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
}
.moon-help-phase:nth-child(odd)  { border-right: 1px solid var(--row-border); }
.moon-help-phase:nth-child(n+3)  { border-top: 1px solid var(--row-border); }
.moon-help-phase-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.moon-help-phase-name {
  font-size: 0.8rem;
  font-weight: 500;
}
.moon-help-phase-desc {
  font-size: 0.7rem;
  opacity: 0.55;
}

/* ── Transition ── */
.moon-sheet-enter-active,
.moon-sheet-leave-active { transition: opacity 0.22s ease; }
.moon-sheet-enter-from,
.moon-sheet-leave-to { opacity: 0; }
.moon-sheet-enter-active .moon-sheet,
.moon-sheet-leave-active .moon-sheet { transition: transform 0.22s cubic-bezier(0.32, 0.72, 0, 1); }
.moon-sheet-enter-from .moon-sheet,
.moon-sheet-leave-to .moon-sheet { transform: translateY(100%); }

/* ── Overlay ── */
.moon-sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

/* ── Panel ── */
.moon-sheet {
  background: var(--sheet-bg);
  border: 1px solid var(--panel-border, rgba(255,255,255,0.08));
  color: var(--text);
  border-radius: 20px 20px 0 0;
  width: 100%;
  max-width: 480px;
  height: 65dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--shadow);
}

/* ── Header ── */
.moon-sheet-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 14px 16px;
  border-bottom: 1px solid var(--panel-border, rgba(255,255,255,0.08));
  flex-shrink: 0;
}

.moon-sheet-title {
  flex: 1;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.3;
}

.moon-sheet-close {
  flex-shrink: 0;
  background: none;
  border: none;
  color: inherit;
  opacity: 0.45;
  font-size: 1rem;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
  line-height: 1;
}
.moon-sheet-close:hover { opacity: 0.8; }

/* ── Body ── */
.moon-sheet-body {
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 12px 16px 1.25rem;
}

/* ── Section label (like ww-instruction-label) ── */
.moon-section-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.5;
  margin-bottom: 0.4rem;
}

/* ── Moon arc block ── */
.moon-arc-block {
  background: var(--sheet-item-bg);
  border-radius: 12px;
  padding: 12px 12px 14px;
}

.moon-arc-svg {
  width: 100%;
  max-height: 90px;
  display: block;
  margin-bottom: 10px;
}

.moon-arc-times {
  display: flex;
  justify-content: space-between;
}

.moon-arc-col {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.moon-arc-left  { align-items: flex-start; }
.moon-arc-mid   { align-items: center; flex: 1; text-align: center; }
.moon-arc-right { align-items: flex-end; }

.moon-arc-val {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text);
}
.moon-arc-label {
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* ── Group box ── */
.moon-group {
  background: var(--sheet-item-bg);
  border-radius: 12px;
}

.moon-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  box-sizing: border-box;
}
.moon-row + .moon-row {
  border-top: 1px solid var(--row-border);
}

.moon-row-label {
  flex: 1;
  font-size: 0.85rem;
  opacity: 0.85;
}
.moon-row-value {
  font-size: 0.85rem;
  opacity: 0.6;
  flex-shrink: 0;
  white-space: nowrap;
}

.moon-phase-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.moon-icon-sm {
  display: block;
  flex-shrink: 0;
}

/* 7-day row */
.moon-day-name {
  width: 44px;
  font-size: 0.85rem;
  flex-shrink: 0;
}
.moon-day-phase {
  flex: 1;
  font-size: 0.85rem;
  opacity: 0.6;
  padding: 0 4px;
}
.moon-day-illum {
  width: 36px;
  text-align: right;
  font-size: 0.85rem;
  opacity: 0.6;
}
</style>
