<template>
  <div class="sun-sheet-overlay" @click.self="$emit('close')">
    <div class="sun-sheet">
      <div class="sun-sheet-header">
        <div class="sun-sheet-title">Sun</div>
        <button class="sun-sheet-help" @click="showHelp = true">?</button>
        <button class="sun-sheet-close" @click="$emit('close')">✕</button>
      </div>

      <Teleport to="body">
        <Transition name="sun-help">
          <div v-if="showHelp" class="sun-help-overlay" @click.self="showHelp = false">
            <div class="sun-help-modal">
              <div class="sun-help-header">
                <span class="sun-help-title">About the Sun</span>
                <button class="sun-sheet-close" @click="showHelp = false">✕</button>
              </div>
              <div class="sun-help-body">
                <div class="sun-help-section">Dawn &amp; Dusk</div>
                <p>Civil twilight — sun is within 6° below the horizon. Bright enough to see outdoors without artificial light.</p>

                <div class="sun-help-section">Sunrise &amp; Sunset</div>
                <p>When the upper edge of the sun crosses the horizon. Atmospheric refraction means the sun is geometrically just below the horizon at this moment.</p>

                <div class="sun-help-section">Solar Noon</div>
                <p>The sun's highest point — midway between sunrise and sunset. Shadows are shortest; UV is at its peak.</p>

                <div class="sun-help-section">Day Length</div>
                <p>Time from sunrise to sunset. Longest at the summer solstice, shortest at the winter solstice.</p>

                <div class="sun-help-section">Seasons</div>
                <p>Caused by Earth's 23.5° axial tilt, not its distance from the Sun. When your hemisphere tilts toward the Sun, days are longer and the sun climbs higher — delivering more energy per square metre.</p>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>
      <div class="sun-sheet-body">

        <!-- Arc + three-column times -->
        <div>
        <div class="sun-section-label">{{ todayLabel }}</div>
        <div class="sun-arc-block">
          <svg viewBox="0 0 200 100" class="sun-arc-svg">
            <!-- Dawn/dusk shaded zone -->
            <path v-if="dawnArc && sunriseArc" :d="`M ${dawnArc.x.toFixed(1)},${dawnArc.y.toFixed(1)} A 85,85 0 0,1 ${sunriseArc.x.toFixed(1)},${sunriseArc.y.toFixed(1)}`"
              fill="none" stroke="#FFC107" stroke-opacity="0.18" stroke-width="8"/>
            <path v-if="sunsetArc && duskArc" :d="`M ${sunsetArc.x.toFixed(1)},${sunsetArc.y.toFixed(1)} A 85,85 0 0,1 ${duskArc.x.toFixed(1)},${duskArc.y.toFixed(1)}`"
              fill="none" stroke="#FFC107" stroke-opacity="0.18" stroke-width="8"/>
            <!-- Horizon line -->
            <line x1="10" y1="92" x2="190" y2="92" stroke="currentColor" stroke-opacity="0.12" stroke-width="1"/>
            <!-- Endpoint ticks -->
            <line x1="15" y1="88" x2="15" y2="96" stroke="currentColor" stroke-opacity="0.3" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="185" y1="88" x2="185" y2="96" stroke="currentColor" stroke-opacity="0.3" stroke-width="1.5" stroke-linecap="round"/>
            <!-- Arc track -->
            <path d="M 15,92 A 85,85 0 0,1 185,92" fill="none" stroke="currentColor" stroke-opacity="0.15" stroke-width="8"/>
            <!-- Progress arc (sunrise to now, full after sunset) -->
            <path v-if="sunProgressEnd" :d="`M 15,92 A 85,85 0 0,1 ${sunProgressEnd.x.toFixed(1)},${sunProgressEnd.y.toFixed(1)}`"
              fill="none" stroke="#FFC107" stroke-width="8" stroke-linecap="round"/>
            <!-- Sun glow -->
            <circle v-if="sunProgress >= 0 && sunProgress <= 1" :cx="sunDotPos.x" :cy="sunDotPos.y" r="10" fill="#FFC107" opacity="0.2"/>
            <!-- Sun dot -->
            <circle v-if="sunProgress >= 0 && sunProgress <= 1" :cx="sunDotPos.x" :cy="sunDotPos.y" r="5.5" fill="#FFC107"/>
          </svg>

          <div class="sun-times-row">
            <div class="sun-col sun-col-left">
              <span class="sun-col-val">{{ dawnFormatted }}</span>
              <span class="sun-col-label">Dawn</span>
              <span class="sun-col-val sun-col-event">
                {{ sunriseFormatted }}
                <span class="sun-day-icon" v-html="TILE_ICONS.sunrise"></span>
              </span>
              <span class="sun-col-label">Sunrise</span>
            </div>
            <div class="sun-col sun-col-mid">
              <span class="sun-col-val">{{ solarNoonFormatted }}</span>
              <span class="sun-col-label">Solar Noon</span>
              <span class="sun-col-val">{{ dayLength }}</span>
              <span class="sun-col-label">Day Length</span>
            </div>
            <div class="sun-col sun-col-right">
              <span class="sun-col-val">{{ duskFormatted }}</span>
              <span class="sun-col-label">Dusk</span>
              <span class="sun-col-val sun-col-event">
                <span class="sun-day-icon" v-html="TILE_ICONS.sunset"></span>
                {{ sunsetFormatted }}
              </span>
              <span class="sun-col-label">Sunset</span>
            </div>
          </div>
        </div>
        </div>

        <!-- 7-day sun times -->
        <div>
          <div class="sun-section-label">Next 7 Days</div>
          <div class="sun-group">
            <div v-for="day in sevenDays" :key="day.dateKey" class="sun-row sun-row-7day">
              <span class="sun-day-name">{{ day.dayName }}</span>
              <span class="sun-day-times">
                <span class="sun-day-event">
                  <span class="sun-day-icon" v-html="TILE_ICONS.sunrise"></span>
                  <span class="sun-day-rise">{{ day.sunrise }}</span>
                </span>
                <span class="sun-day-sep">–</span>
                <span class="sun-day-event">
                  <span class="sun-day-icon" v-html="TILE_ICONS.sunset"></span>
                  <span class="sun-day-set">{{ day.sunset }}</span>
                </span>
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { TILE_ICONS } from '../utils/tileIcons.js'

const props = defineProps({
  daily:      { type: Object, default: null },
  lat:        { type: Number, default: 0 },
  lon:        { type: Number, default: 0 },
  timeFormat: { type: String, default: '12h' },
  utcOffset:  { type: Number, default: 0 },  // seconds
})
defineEmits(['close'])

const showHelp = ref(false)

// ── Helpers ──────────────────────────────────────────────────────────────────
// Open-Meteo sunrise/sunset strings are LOCAL time (e.g. "2026-04-05T06:32").
// Never append 'Z' — work directly with the local HH:MM values as minutes.

function isoToLocalMins(isoStr) {
  if (!isoStr) return null
  const [h, m] = isoStr.slice(11, 16).split(':').map(Number)
  return h * 60 + m
}

function formatMins(totalMins, format) {
  if (totalMins == null) return '—'
  const h = Math.floor(((totalMins % 1440) + 1440) % 1440 / 60)
  const m = ((totalMins % 60) + 60) % 60
  if (format === '24h') return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${ampm}`
}

function formatIso(isoStr, format) {
  return formatMins(isoToLocalMins(isoStr), format)
}

function dayLengthStr(riseIso, setIso) {
  const r = isoToLocalMins(riseIso)
  const s = isoToLocalMins(setIso)
  if (r == null || s == null) return '—'
  const mins = s - r
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

// ── Solar altitude offset calculator ─────────────────────────────────────────
// Returns minutes offset from sunrise/sunset for a given solar altitude (degrees).
// Negative altitude → before sunrise / after sunset (twilight).
// Positive altitude → after sunrise / before sunset (golden hour end).

const RAD = Math.PI / 180

function solarOffsetMins(riseIso, lat, altitudeDeg) {
  if (!riseIso) return null
  const date = new Date(riseIso.slice(0, 10) + 'T12:00:00Z')
  const dayOfYear = Math.floor((date - new Date(Date.UTC(date.getUTCFullYear(), 0, 0))) / 86400000)
  const B = (360 / 365) * (dayOfYear - 81) * RAD
  const dec = 23.45 * Math.sin(B) * RAD
  const latRad = lat * RAD

  function haForAlt(hRad) {
    const cosHA = (Math.sin(hRad) - Math.sin(latRad) * Math.sin(dec)) /
                  (Math.cos(latRad) * Math.cos(dec))
    if (cosHA < -1 || cosHA > 1) return null
    return Math.acos(cosHA)
  }

  const haHorizon = haForAlt(0)
  const haTarget  = haForAlt(altitudeDeg * RAD)
  if (haHorizon == null || haTarget == null) return null

  const dHA = (haTarget - haHorizon) / RAD  // degrees (negative when target > horizon)
  return Math.round(dHA / 15 * 60)  // minutes (negative = after sunrise / before sunset)
}

// ── Selected day computed values ──────────────────────────────────────────────

const todayLabel = computed(() => {
  const src = props.daily?.sunrise?.[0]
  if (!src) return 'Today'
  const dateStr = src.slice(0, 10)
  const [y, mo, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, mo - 1, d, 12))
  const label = dt.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
  return 0 === 0 ? 'Today · ' + label : label
})

const sunrise = computed(() => props.daily?.sunrise?.[0] ?? null)
const sunset  = computed(() => props.daily?.sunset?.[0]  ?? null)

const sunriseMins = computed(() => isoToLocalMins(sunrise.value))
const sunsetMins  = computed(() => isoToLocalMins(sunset.value))

const solarNoonMins = computed(() => {
  if (sunriseMins.value == null || sunsetMins.value == null) return null
  return Math.round((sunriseMins.value + sunsetMins.value) / 2)
})

const twilightOffsetMins   = computed(() => solarOffsetMins(sunrise.value, props.lat, -6))
const dawnMins = computed(() => {
  if (sunriseMins.value == null || twilightOffsetMins.value == null) return null
  return sunriseMins.value - twilightOffsetMins.value
})

const duskMins = computed(() => {
  if (sunsetMins.value == null || twilightOffsetMins.value == null) return null
  return sunsetMins.value + twilightOffsetMins.value
})

const sunriseFormatted   = computed(() => formatIso(sunrise.value, props.timeFormat))
const sunsetFormatted    = computed(() => formatIso(sunset.value,  props.timeFormat))
const solarNoonFormatted = computed(() => formatMins(solarNoonMins.value, props.timeFormat))
const dawnFormatted = computed(() => formatMins(dawnMins.value, props.timeFormat))
const duskFormatted = computed(() => formatMins(duskMins.value, props.timeFormat))
const dayLength     = computed(() => dayLengthStr(sunrise.value, sunset.value))

// ── Arc geometry (SVG viewBox 200×100, semicircle centre 100,92 radius 85) ────
// t=0 → left end (15,92), t=1 → right end (185,92)
function arcPoint(t) {
  const angle = Math.PI - t * Math.PI
  return { x: 100 + 85 * Math.cos(angle), y: 92 - 85 * Math.sin(angle) }
}

// Map a local-minutes value onto t (0=sunrise, 1=sunset)
function minsToT(mins) {
  if (sunriseMins.value == null || sunsetMins.value == null) return null
  return (mins - sunriseMins.value) / (sunsetMins.value - sunriseMins.value)
}

const sunProgress = computed(() => {
  if (sunriseMins.value == null || sunsetMins.value == null) return -1
  const localDate = new Date(Date.now() + props.utcOffset * 1000)
  const nowMins = localDate.getUTCHours() * 60 + localDate.getUTCMinutes()
  return (nowMins - sunriseMins.value) / (sunsetMins.value - sunriseMins.value)
})

const sunDotPos      = computed(() => arcPoint(Math.min(Math.max(sunProgress.value, 0), 1)))
const sunProgressEnd = computed(() => {
  if (sunProgress.value < 0) return null
  // Full arc after sunset (progress >= 1), otherwise clamp to 0-1
  const p = sunProgress.value >= 1 ? 1 : sunProgress.value
  return arcPoint(p)
})

const dawnArc    = computed(() => dawnMins.value    != null ? arcPoint(Math.max(minsToT(dawnMins.value),   -0.15)) : null)
const sunriseArc = computed(() => sunriseMins.value != null ? arcPoint(0) : null)
const sunsetArc  = computed(() => sunsetMins.value  != null ? arcPoint(1) : null)
const duskArc    = computed(() => duskMins.value    != null ? arcPoint(Math.min(minsToT(duskMins.value),    1.15)) : null)

// ── 7-day list ────────────────────────────────────────────────────────────────

const sevenDays = computed(() => {
  const times = props.daily?.time ?? []
  const rises = props.daily?.sunrise ?? []
  const sets  = props.daily?.sunset  ?? []
  return Array.from({ length: 7 }, (_, i) => {
    const idx = 0 + i
    const riseIso = rises[idx] ?? null
    const setIso  = sets[idx]  ?? null
    const dateKey = times[idx] ?? String(i)
    const date    = riseIso ? new Date(riseIso.slice(0, 10) + 'T12:00:00Z') : null
    return {
      dateKey,
      dayName: i === 0 && 0 === 0
        ? 'Today'
        : date?.toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' }) ?? '—',
      sunrise: formatIso(riseIso, props.timeFormat),
      sunset:  formatIso(setIso,  props.timeFormat),
      length:  dayLengthStr(riseIso, setIso),
    }
  }).filter(d => d.sunrise !== '—')
})
</script>

<style scoped>
/* ── Transition ── */
.sun-sheet-enter-active,
.sun-sheet-leave-active { transition: opacity 0.22s ease; }
.sun-sheet-enter-from,
.sun-sheet-leave-to { opacity: 0; }
.sun-sheet-enter-active .sun-sheet,
.sun-sheet-leave-active .sun-sheet { transition: transform 0.22s cubic-bezier(0.32, 0.72, 0, 1); }
.sun-sheet-enter-from .sun-sheet,
.sun-sheet-leave-to .sun-sheet { transform: translateY(100%); }

/* ── Overlay ── */
.sun-sheet-overlay {
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
.sun-sheet {
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
.sun-sheet-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 14px 16px;
  border-bottom: 1px solid var(--panel-border, rgba(255,255,255,0.08));
  flex-shrink: 0;
}

.sun-sheet-title {
  flex: 1;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.3;
}

.sun-sheet-close {
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
.sun-sheet-close:hover { opacity: 0.8; }

/* ── Body ── */
.sun-sheet-body {
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 12px 16px 1.25rem;
}

/* ── Section label ── */
.sun-section-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.5;
  margin-bottom: 0.4rem;
}

/* ── Arc block ── */
.sun-arc-block {
  background: var(--sheet-item-bg);
  border-radius: 12px;
  padding: 12px 12px 14px;
}

.sun-arc-svg {
  width: 100%;
  max-height: 90px;
  display: block;
  margin-bottom: 10px;
}

.sun-times-row {
  display: flex;
  justify-content: space-between;
  gap: 4px;
}

.sun-col {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
}
.sun-col-left  { align-items: flex-start; }
.sun-col-mid   { align-items: center; }
.sun-col-right { align-items: flex-end; }

.sun-col-event {
  display: flex;
  align-items: center;
  gap: 4px;
}

.sun-col-val {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text);
  white-space: nowrap;
  line-height: 1.35;
}

.sun-col-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-bottom: 4px;
}

/* ── Group box (7-day) ── */
.sun-group {
  background: var(--sheet-item-bg);
  border-radius: 12px;
}

.sun-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  box-sizing: border-box;
}
.sun-row + .sun-row {
  border-top: 1px solid var(--row-border);
}

/* 7-day row */
.sun-row-7day {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.sun-day-times {
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: flex-end;
}

.sun-day-sep {
  font-size: 0.85rem;
  opacity: 0.3;
}

.sun-day-name {
  width: 44px;
  font-size: 0.85rem;
  flex-shrink: 0;
}
.sun-day-event {
  display: flex;
  align-items: center;
  gap: 4px;
}
.sun-day-icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  color: var(--sun);
}
.sun-day-icon :deep(svg) {
  width: 14px;
  height: 14px;
}
.sun-day-rise,
.sun-day-set {
  font-size: 0.85rem;
  opacity: 0.6;
  white-space: nowrap;
}

/* ── Help button ── */
.sun-sheet-help {
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
.sun-sheet-help:hover { opacity: 0.8; }

/* ── Help modal transition ── */
.sun-help-enter-active,
.sun-help-leave-active { transition: opacity 0.18s ease; }
.sun-help-enter-from,
.sun-help-leave-to { opacity: 0; }

/* ── Help overlay ── */
.sun-help-overlay {
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
.sun-help-modal {
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

.sun-help-header {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--panel-border, rgba(255,255,255,0.08));
  flex-shrink: 0;
}
.sun-help-title {
  flex: 1;
  font-size: 1rem;
  font-weight: 600;
}

.sun-help-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 14px 16px 20px;
  font-size: 0.85rem;
  line-height: 1.55;
  color: var(--text);
}
.sun-help-body > * + * { margin-top: 0.6rem; }
.sun-help-body p { margin: 0; opacity: 0.8; }
.sun-help-body strong { color: var(--text); opacity: 1; }

.sun-help-section {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.5;
  margin-top: 0.4rem;
}
</style>
