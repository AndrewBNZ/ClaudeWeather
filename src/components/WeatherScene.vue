<template>
  <div class="scene" :style="sceneStyle">

    <!-- Stars (night, clear/partly) -->
    <template v-if="showStars">
      <div v-for="s in stars" :key="s.id" class="star" :style="s.style" />
    </template>

    <!-- Sun -->
    <div v-if="showSun" class="sun" />

    <!-- Moon (crescent via box-shadow) -->
    <div v-if="showMoon" class="moon" />

    <!-- Clouds -->
    <div v-for="(cl, i) in activeClouds" :key="i" class="cloud" :style="cl.style" />

    <!-- Rain drops -->
    <template v-if="isRain || isStorm">
      <div v-for="n in 32" :key="n" class="drop" :style="dropStyle(n)" />
    </template>

    <!-- Snowflakes -->
    <template v-if="isSnow">
      <div v-for="n in 22" :key="n" class="flake" :style="flakeStyle(n)" />
    </template>

    <!-- Flying leaves -->
    <template v-if="showLeaves">
      <div v-for="n in leafCount" :key="n" class="leaf" :style="leafStyle(n)" />
    </template>

    <!-- Lightning flash -->
    <div v-if="isStorm" class="lightning" />

    <!-- Landscape SVG -->
    <svg class="landscape" viewBox="0 0 400 90" preserveAspectRatio="none"
         xmlns="http://www.w3.org/2000/svg">
      <!-- Far hills -->
      <path d="M0,90 C80,46 170,60 260,53 C320,48 365,58 400,40 L400,90Z"
            :fill="hillFarColor" />
      <!-- Near hills -->
      <path d="M0,90 C50,70 130,76 210,72 C290,68 345,74 400,66 L400,90Z"
            :fill="hillNearColor" />
      <!-- Tree trunk (tapered with root flare) -->
      <path d="M74,83 C74,83 76,74 77,67 C77,63 78,61 80,60 C82,61 83,63 83,67 C84,74 86,83 86,83Z"
            :fill="trunkColor" />
      <!-- Tree foliage (swaying group) -->
      <g :class="{ 'tree-sway': effectiveWind >= 5 }" :style="treeStyle">
        <!-- Shadow layer (back/bottom) -->
        <ellipse cx="61"  cy="64" rx="19" ry="9"  :fill="foliage[1]" />
        <ellipse cx="99"  cy="62" rx="19" ry="9"  :fill="foliage[1]" />
        <ellipse cx="80"  cy="67" rx="23" ry="9"  :fill="foliage[1]" />
        <!-- Main canopy body -->
        <ellipse cx="80"  cy="52" rx="30" ry="14" :fill="foliage[0]" />
        <ellipse cx="65"  cy="43" rx="20" ry="10" :fill="foliage[0]" />
        <ellipse cx="95"  cy="44" rx="19" ry="10" :fill="foliage[0]" />
        <ellipse cx="80"  cy="34" rx="20" ry="10" :fill="foliage[0]" />
        <!-- Highlight layer (top-left light source) -->
        <ellipse cx="72"  cy="37" rx="14" ry="7"  :fill="foliage[2]" />
        <ellipse cx="85"  cy="27" rx="11" ry="6"  :fill="foliage[2]" />
      </g>
      <!-- Ground strip -->
      <rect x="0" y="82" width="400" height="8" :fill="groundColor" />
    </svg>

    <!-- Scrim: darkens bottom for text readability -->
    <div class="scrim" />

    <!-- Preview controls -->
    <div v-if="showSim" class="preview-bar">
      <div class="preview-row">
        <button v-for="t in timeOfDays" :key="t.tod"
          class="preview-btn" :class="{ active: previewTod === t }"
          @click="previewTod = previewTod === t ? null : t"
          :title="t.label">{{ t.emoji }}</button>
        <button v-if="previewTod" class="preview-btn live-btn" @click="previewTod = null">↺</button>
      </div>
      <div class="preview-row">
        <button v-for="w in weatherPreviews" :key="w.group"
          class="preview-btn" :class="{ active: previewWeather === w }"
          @click="previewWeather = previewWeather === w ? null : w"
          :title="w.label">{{ w.emoji }}</button>
        <button v-if="previewWeather" class="preview-btn live-btn" @click="previewWeather = null">↺</button>
      </div>
      <div class="preview-row">
        <button v-for="wl in windLevels" :key="wl.label"
          class="preview-btn" :class="{ active: previewWind === wl }"
          @click="previewWind = previewWind === wl ? null : wl"
          :title="wl.label">{{ wl.emoji }}</button>
        <button v-if="previewWind" class="preview-btn live-btn" @click="previewWind = null">↺</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  weatherCode: { type: Number, default: 0 },
  windSpeed:   { type: Number, default: 0 },
  showSim:     { type: Boolean, default: false },
  sunrise:     { type: String, default: null },
  sunset:      { type: String, default: null },
})

// ── Preview controls ───────────────────────────────────────────────────────
const timeOfDays = [
  { emoji: '🌙', label: 'Night',   tod: 'night'   },
  { emoji: '🌅', label: 'Sunrise', tod: 'sunrise'  },
  { emoji: '☀️', label: 'Day',     tod: 'day'      },
  { emoji: '🌇', label: 'Sunset',  tod: 'sunset'   },
]
const previewTod = ref(null)

const weatherPreviews = [
  { emoji: '✨',  label: 'Clear',        group: 'clear'  },
  { emoji: '⛅',  label: 'Partly cloudy', group: 'partly' },
  { emoji: '☁️',  label: 'Cloudy',        group: 'cloudy' },
  { emoji: '🌧️', label: 'Rain',          group: 'rain'   },
  { emoji: '🌨️', label: 'Snow',          group: 'snow'   },
  { emoji: '⛈️', label: 'Storm',         group: 'storm'  },
]
const previewWeather = ref(null)

const windLevels = [
  { emoji: '🍃', label: 'Calm',    speed: 0  },
  { emoji: '🌬️', label: 'Breeze', speed: 15 },
  { emoji: '💨', label: 'Windy',   speed: 35 },
  { emoji: '🌪️', label: 'Storm',  speed: 75 },
]
const previewWind = ref(null)
const effectiveWind = computed(() => previewWind.value?.speed ?? props.windSpeed)

watch(() => props.showSim, (val) => {
  if (!val) {
    previewTod.value     = null
    previewWeather.value = null
    previewWind.value    = null
  }
})

// ── Time of day ────────────────────────────────────────────────────────────
const timeOfDay = computed(() => {
  if (previewTod.value) return previewTod.value.tod
  const now = Date.now()
  if (props.sunrise && props.sunset) {
    const riseMs = new Date(props.sunrise).getTime()
    const setMs  = new Date(props.sunset).getTime()
    const transitionMs = 45 * 60 * 1000 // 45-min transition window
    if (now < riseMs - transitionMs)                   return 'night'
    if (now < riseMs + transitionMs)                   return 'sunrise'
    if (now < setMs  - transitionMs)                   return 'day'
    if (now < setMs  + transitionMs)                   return 'sunset'
    return 'night'
  }
  // Fallback to clock hours if no data
  const h = new Date().getHours()
  if (h >= 5  && h < 8)  return 'sunrise'
  if (h >= 8  && h < 18) return 'day'
  if (h >= 18 && h < 21) return 'sunset'
  return 'night'
})
const isDay = computed(() => timeOfDay.value !== 'night')

// ── Weather group ──────────────────────────────────────────────────────────
const group = computed(() => {
  if (previewWeather.value) return previewWeather.value.group
  const c = props.weatherCode ?? 0
  if (c <= 1)                                              return 'clear'
  if (c === 2)                                             return 'partly'
  if (c === 3 || c === 45 || c === 48)                     return 'cloudy'
  if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82))       return 'rain'
  if ((c >= 71 && c <= 77) || c === 85 || c === 86)        return 'snow'
  if (c >= 95)                                             return 'storm'
  return 'clear'
})

const isRain  = computed(() => group.value === 'rain')
const isSnow  = computed(() => group.value === 'snow')
const isStorm = computed(() => group.value === 'storm')

const cloudCount = computed(() =>
  ({ clear: 0, partly: 1, cloudy: 2, rain: 3, snow: 2, storm: 3 })[group.value] ?? 0
)

// ── Sky gradient ───────────────────────────────────────────────────────────
const SKY = {
  night: {
    clear:  ['#060a14', '#0a1220', '#0c1e40'],
    partly: ['#07101e', '#0d1a30', '#152440'],
    cloudy: ['#0f172a', '#1e293b', '#2d3748'],
    rain:   ['#0f172a', '#1e293b', '#334155'],
    snow:   ['#1e293b', '#334155', '#475569'],
    storm:  ['#020408', '#080d18', '#0f172a'],
  },
  sunrise: {
    clear:  ['#1a0a3e', '#c2410c', '#fbbf24'],
    partly: ['#1e1238', '#b45309', '#fcd34d'],
    cloudy: ['#374151', '#78674a', '#9c8a6a'],
    rain:   ['#1f2937', '#374151', '#4b5563'],
    snow:   ['#7ba8c8', '#a8c9e0', '#cde3f2'],
    storm:  ['#111827', '#1f2937', '#374151'],
  },
  day: {
    clear:  ['#1e56d4', '#3b82f6', '#bfdbfe'],
    partly: ['#2260c8', '#4b9ef5', '#dbeafe'],
    cloudy: ['#4a5e75', '#68788e', '#99afc4'],
    rain:   ['#1e293b', '#334155', '#475569'],
    snow:   ['#7ba8c8', '#a8c9e0', '#cde3f2'],
    storm:  ['#0f172a', '#1e293b', '#374151'],
  },
  sunset: {
    clear:  ['#0f0c2e', '#7e22ce', '#f97316'],
    partly: ['#1e1b4b', '#6d28d9', '#ea580c'],
    cloudy: ['#374151', '#6b4226', '#9c6b38'],
    rain:   ['#1e293b', '#334155', '#4b5563'],
    snow:   ['#7ba8c8', '#a8c9e0', '#cde3f2'],
    storm:  ['#0f172a', '#1e293b', '#374151'],
  },
}

const sceneStyle = computed(() => {
  const colors = SKY[timeOfDay.value]?.[group.value] ?? SKY.day.clear
  return { background: `linear-gradient(to bottom, ${colors[0]}, ${colors[1]} 55%, ${colors[2]})` }
})

// ── Sun / Moon / Stars ─────────────────────────────────────────────────────
const showSun   = computed(() => isDay.value && cloudCount.value === 0)
const showMoon  = computed(() => timeOfDay.value === 'night' && cloudCount.value === 0)
const showStars = computed(() => timeOfDay.value === 'night' && cloudCount.value < 2)

const stars = Array.from({ length: 38 }, (_, i) => ({
  id: i,
  style: {
    left:            `${(i * 31 + 17) % 88}%`,
    top:             `${(i * 19 + 5)  % 50}%`,
    width:           `${1 + (i % 2)}px`,
    height:          `${1 + (i % 2)}px`,
    opacity:          0.4 + (i % 5) * 0.12,
    animationDelay:  `${((i * 0.7) % 3).toFixed(1)}s`,
  },
}))

// ── Clouds ─────────────────────────────────────────────────────────────────
const cloudColor = computed(() => {
  const g   = group.value
  const tod = timeOfDay.value
  if (g === 'rain' || g === 'storm') return 'rgba(71,85,105,0.93)'
  if (g === 'snow')                  return 'rgba(200,225,245,0.88)'
  if (g === 'cloudy')                return 'rgba(148,163,184,0.88)'
  if (tod === 'sunrise' || tod === 'sunset') return 'rgba(253,186,116,0.85)'
  return 'rgba(255,255,255,0.82)'
})

const driftDur = computed(() => {
  const s = effectiveWind.value
  if (s > 50) return 7
  if (s > 30) return 13
  if (s > 15) return 24
  return 38
})

const activeClouds = computed(() =>
  [
    { top: '7%',  w: 130, h: 44, delay: 0   },
    { top: '18%', w: 100, h: 36, delay: -11 },
    { top: '4%',  w: 115, h: 42, delay: -22 },
  ]
  .slice(0, cloudCount.value)
  .map(cfg => ({
    style: {
      top:               cfg.top,
      width:             `${cfg.w}px`,
      height:            `${cfg.h}px`,
      '--cloud-color':   cloudColor.value,
      animationDuration: `${driftDur.value}s`,
      animationDelay:    `${cfg.delay}s`,
    },
  }))
)

// ── Rain ───────────────────────────────────────────────────────────────────
const rainAngle = computed(() => {
  const s = effectiveWind.value
  return Math.min(38, 5 + s * 0.42) // positive = leans right with wind
})

const rainDrift = computed(() => {
  const s = effectiveWind.value
  return Math.min(200, s * 2.5) // px rightward drift over full fall
})

function dropStyle(n) {
  const angleVariation = ((n % 5) - 2) * 1.5 // ±3 deg per-drop variation
  return {
    left:              `${(n * 29 + 7) % 100}%`,
    height:            `${14 + (n % 4) * 5}px`,
    opacity:            isStorm.value ? 0.75 : 0.5,
    animationDelay:    `${((n * 0.17) % 1).toFixed(2)}s`,
    animationDuration: `${(0.45 + (n % 5) * 0.1).toFixed(2)}s`,
    '--rain-angle':    `${(rainAngle.value + angleVariation).toFixed(1)}deg`,
    '--rain-drift':    `${rainDrift.value.toFixed(0)}px`,
  }
}

// ── Snow ───────────────────────────────────────────────────────────────────
const snowDrift = computed(() => {
  const s = effectiveWind.value
  return Math.min(120, 10 + s * 2.8)
})

function flakeStyle(n) {
  const driftVariation = (n % 5) * 6 // spread per-flake
  return {
    left:              `${(n * 37 + 11) % 95}%`,
    width:             `${4 + (n % 3) * 2}px`,
    height:            `${4 + (n % 3) * 2}px`,
    animationDelay:    `${((n * 0.23) % 2).toFixed(2)}s`,
    animationDuration: `${(1.4 + (n % 5) * 0.4).toFixed(2)}s`,
    '--snow-drift':    `${(snowDrift.value + driftVariation).toFixed(0)}px`,
  }
}

// ── Landscape colours ──────────────────────────────────────────────────────
const hillFarColor = computed(() => {
  const tod = timeOfDay.value
  const g   = group.value
  if (tod === 'night')               return '#031208'
  if (g === 'snow')                  return '#c0dff5'
  if (g === 'rain' || g === 'storm') return '#0c3820'
  return '#15803d'
})

const hillNearColor = computed(() => {
  const tod = timeOfDay.value
  const g   = group.value
  if (tod === 'night')               return '#010a04'
  if (g === 'snow')                  return '#a0cce8'
  if (g === 'rain' || g === 'storm') return '#092b17'
  return '#166534'
})

const groundColor = computed(() => {
  const tod = timeOfDay.value
  const g   = group.value
  if (tod === 'night')               return '#010804'
  if (g === 'snow')                  return '#d4eaf8'
  if (g === 'rain' || g === 'storm') return '#08220f'
  return '#14532d'
})

const foliage = computed(() => {
  const tod = timeOfDay.value
  const g   = group.value
  if (tod === 'night')               return ['#03180a', '#010d05', '#041f0c']
  if (g === 'snow')                  return ['#c0dff5', '#a0cce8', '#dbeeff']
  if (g === 'rain' || g === 'storm') return ['#0d6b35', '#094d26', '#128040']
  if (tod === 'sunset')              return ['#1a8040', '#155e30', '#22c55e']
  return ['#16a34a', '#166534', '#4ade80']
})

const trunkColor = computed(() => {
  if (timeOfDay.value === 'night') return '#2a1a08'
  if (group.value === 'snow')      return '#6b4c2a'
  return '#5c3d1e'
})

// ── Leaves ─────────────────────────────────────────────────────────────────
const showLeaves = computed(() => effectiveWind.value >= 15)
const leafCount  = computed(() => {
  const s = effectiveWind.value
  if (s >= 60) return 10
  if (s >= 35) return 7
  return 4
})

function leafStyle(n) {
  const col  = foliage.value[n % 3]
  const size = 5 + (n % 3) * 2 // 5, 7, 9px
  return {
    width:             `${size}px`,
    height:            `${(size * 0.6).toFixed(0)}px`,
    background:        col,
    bottom:            `${14 + (n * 9 % 18)}%`,
    left:              `${17 + (n % 5) * 1.5}%`,
    borderRadius:      '50% 10% 50% 10%',
    animationDelay:    `${-((n * 0.71) % 3.5).toFixed(2)}s`,
    animationDuration: `${(2.0 + (n % 5) * 0.55).toFixed(1)}s`,
    '--wa':            `${9 + (n % 4) * 5}px`,
  }
}

// ── Tree sway ──────────────────────────────────────────────────────────────
const treeStyle = computed(() => {
  const s = effectiveWind.value
  if (s < 5) return {}
  const dur   = s > 40 ? 0.3  : s > 20 ? 0.7  : 1.8
  const angle = s > 40 ? 14   : s > 20 ? 7    : 4
  return {
    '--sway-from':  `${(angle * 0.3).toFixed(1)}deg`,
    '--sway-angle': `${angle}deg`,
    '--sway-dur':   `${dur}s`,
  }
})
</script>

<style scoped>
.scene {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
  pointer-events: none;
}

/* ── Stars ────────────────────────────────────────────────────────────────── */
.star {
  position: absolute;
  background: #fff;
  border-radius: 50%;
  animation: scene-twinkle 3s ease-in-out infinite;
}
@keyframes scene-twinkle {
  0%, 100% { opacity: inherit; }
  50%       { opacity: 0.1; }
}

/* ── Sun ──────────────────────────────────────────────────────────────────── */
.sun {
  position: absolute;
  top: 5%;
  right: 6%;
  width: 54px;
  height: 54px;
  background: radial-gradient(circle at 38% 38%, #fef9c3, #fbbf24 45%, #f59e0b 70%, transparent);
  border-radius: 50%;
  box-shadow: 0 0 44px 14px rgba(251,191,36,0.38), 0 0 90px 28px rgba(251,191,36,0.14);
}

/* ── Moon ─────────────────────────────────────────────────────────────────── */
.moon {
  position: absolute;
  top: 9%;
  right: 15%;
  width: 40px;
  height: 40px;
  background: #dde6f0;
  border-radius: 50%;
  box-shadow: -10px 6px 0 -4px #080d1a, 0 0 16px rgba(220,230,240,0.22);
}

/* ── Clouds ───────────────────────────────────────────────────────────────── */
.cloud {
  position: absolute;
  left: -160px;
  background: var(--cloud-color, rgba(255,255,255,0.82));
  border-radius: 60px;
  animation: scene-drift linear infinite;
}
.cloud::before,
.cloud::after {
  content: '';
  position: absolute;
  background: inherit;
  border-radius: 50%;
}
.cloud::before {
  width:  55%;
  height: 170%;
  top:   -48%;
  left:   18%;
}
.cloud::after {
  width:  42%;
  height: 140%;
  top:   -35%;
  right:  18%;
}
@keyframes scene-drift {
  from { transform: translateX(0); }
  to   { transform: translateX(calc(100vw + 200px)); }
}

/* ── Rain ─────────────────────────────────────────────────────────────────── */
.drop {
  position: absolute;
  top: -28px;
  width: 1.5px;
  background: linear-gradient(to bottom, transparent, rgba(147,197,253,0.75));
  border-radius: 2px;
  animation: scene-rain linear infinite;
}
@keyframes scene-rain {
  from { transform: translateY(0)     translateX(0)                    rotate(var(--rain-angle, 8deg)); }
  to   { transform: translateY(110vh) translateX(var(--rain-drift, 40px)) rotate(var(--rain-angle, 8deg)); }
}

/* ── Snow ─────────────────────────────────────────────────────────────────── */
.flake {
  position: absolute;
  top: -14px;
  background: rgba(255,255,255,0.88);
  border-radius: 50%;
  animation: scene-snow linear infinite;
}
@keyframes scene-snow {
  from { transform: translateY(0)     translateX(0); }
  to   { transform: translateY(110vh) translateX(var(--snow-drift, 18px)); }
}

/* ── Lightning ────────────────────────────────────────────────────────────── */
.lightning {
  position: absolute;
  inset: 0;
  animation: scene-lightning 5s ease-in-out infinite;
  pointer-events: none;
}
@keyframes scene-lightning {
  0%, 86%, 90%, 94%, 100% { background: transparent; }
  88%, 92%                { background: rgba(255,255,255,0.07); }
}

/* ── Landscape ────────────────────────────────────────────────────────────── */
.landscape {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 52%;
}

/* ── Tree sway ────────────────────────────────────────────────────────────── */
.tree-sway {
  animation: scene-sway var(--sway-dur, 1.8s) ease-in-out infinite alternate;
  transform-origin: 80px 86px;
}
@keyframes scene-sway {
  from { transform: rotate(var(--sway-from, 1deg)); }
  to   { transform: rotate(var(--sway-angle, 5deg)); }
}

/* ── Scrim for text contrast ──────────────────────────────────────────────── */
.scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.00) 0%,
    rgba(0, 0, 0, 0.12) 50%,
    rgba(0, 0, 0, 0.48) 100%
  );
}

/* ── Preview bar ──────────────────────────────────────────────────────────── */
.preview-bar {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 10;
  pointer-events: all;
}

.preview-row {
  display: flex;
  gap: 4px;
}

.preview-btn {
  width: 28px;
  height: 28px;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 6px;
  background: rgba(10, 18, 36, 0.65);
  backdrop-filter: blur(4px);
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, border-color 0.15s;
  padding: 0;
  line-height: 1;
}

.preview-btn:hover {
  background: rgba(30, 50, 90, 0.8);
  border-color: rgba(255,255,255,0.4);
}

.preview-btn.active {
  background: rgba(56, 130, 246, 0.5);
  border-color: rgba(147, 197, 253, 0.7);
}

.live-btn {
  font-size: 16px;
  color: #93c5fd;
  font-weight: 700;
}

/* ── Leaves ───────────────────────────────────────────────────────────────── */
.leaf {
  position: absolute;
  opacity: 0;
  animation: scene-leaf linear infinite;
}
@keyframes scene-leaf {
  0%   { transform: translateX(0)    translateY(0)                     rotate(0deg);   opacity: 0; }
  8%   {                                                                                opacity: 1; }
  25%  { transform: translateX(70px)  translateY(calc(var(--wa) * -1)) rotate(110deg); }
  50%  { transform: translateX(160px) translateY(0)                    rotate(220deg); }
  75%  { transform: translateX(260px) translateY(calc(var(--wa) * -1)) rotate(340deg); }
  88%  {                                                                                opacity: 0.6; }
  100% { transform: translateX(370px) translateY(0)                    rotate(470deg); opacity: 0; }
}
</style>
