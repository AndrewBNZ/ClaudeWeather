<template>
  <div class="scene" :style="sceneStyle" ref="sceneEl">

    <!-- Sky cross-fade overlays (old sky fades out on time-of-day/weather change) -->
    <div v-for="o in skyOverlays" :key="o.id" class="sky-overlay" :style="{ background: o.background }" />

    <!-- Stars (night, clear/partly) -->
    <div class="stars-layer" :style="{ opacity: starsOpacity }">
      <div v-for="s in stars" :key="s.id" class="star" :style="s.style" />
    </div>

    <!-- Aurora borealis (night, high latitude, low cloud) -->
    <Transition name="tod-fade">
      <div v-if="showAurora" class="aurora-layer">
        <div v-for="n in 4" :key="n" class="aurora-band" :style="auroraBandStyle(n)" />
      </div>
    </Transition>

    <!-- Sun -->
    <div class="sun" :style="{ opacity: sunOpacity }" @click.stop="openCelestialModal()" />

    <!-- Shooting star -->
    <div
      v-if="shootingStarKey > 0"
      :key="shootingStarKey"
      class="shooting-star"
      :style="shootingStarStyle"
    />

    <!-- Moon (phase-accurate SVG) -->
    <svg class="moon" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" :style="{ opacity: moonOpacity }" @click.stop="openCelestialModal()">
      <circle cx="20" cy="20" r="20" fill="#1a237e" />
      <path v-if="moonPhasePath" :d="moonPhasePath" fill="#F0F4FF" />
      <circle cx="20" cy="20" r="19.5" fill="none" stroke="rgba(187,222,251,0.18)" stroke-width="1" />
    </svg>

    <!-- Lightning bolts — rendered before clouds so clouds layer on top -->
    <template v-if="isStorm && boltsVisible">
      <div class="bolt bolt-1" :style="boltPositions[0]">
        <svg viewBox="0 0 22 60" xmlns="http://www.w3.org/2000/svg">
          <polygon points="16,0 5,28 13,28 2,60 21,24 11,24" fill="white"/>
        </svg>
      </div>
      <div class="bolt bolt-2" :style="boltPositions[1]">
        <svg viewBox="0 0 16 48" xmlns="http://www.w3.org/2000/svg">
          <polygon points="12,0 3,22 9,22 1,48 15,19 8,19" fill="white"/>
        </svg>
      </div>
    </template>

    <!-- Clouds -->
    <TransitionGroup name="cloud-fade">
      <div v-for="(cl, i) in activeClouds" :key="i" class="cloud" :style="cl.style" />
    </TransitionGroup>

    <!-- Rain drops -->
    <div v-if="isRain || isStorm" class="drops-layer" :style="dropsContainerStyle">
      <div v-for="(s, i) in dropStyles" :key="i" class="drop" :style="s" />
    </div>

    <!-- Snowflakes -->
    <div v-if="isSnow" class="flakes-layer" :style="flakesContainerStyle">
      <div v-for="(s, i) in flakeStyles" :key="i" class="flake" :style="s" />
    </div>

    <!-- Birds (clear/partly, daytime) -->
    <Transition name="tod-fade">
      <div v-if="showBirds" class="birds-layer">
        <div v-for="(s, i) in birds" :key="i" class="bird" :style="s">
          <svg viewBox="0 0 20 8" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,6 Q5,1 10,6 Q15,1 20,6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
      </div>
    </Transition>

    <!-- Landscape SVG -->
    <svg class="landscape" viewBox="0 0 400 90" preserveAspectRatio="none"
         xmlns="http://www.w3.org/2000/svg">
      <!-- Far hills -->
      <path d="M0,90 C80,46 170,60 260,53 C320,48 365,58 400,40 L400,90Z"
            :fill="hillFarColor" />
      <!-- Near hills -->
      <path d="M0,90 C50,70 130,76 210,72 C290,68 345,74 400,66 L400,90Z"
            :fill="hillNearColor" />
      <!-- Snow on hill ridges -->
      <template v-if="group === 'snow'">
        <path d="M0,86 C80,42 170,56 260,49 C320,44 365,54 400,36 L400,40 C365,58 320,48 260,53 C170,60 80,46 0,90 Z" fill="rgba(255,255,255,0.45)" />
        <path d="M0,87 C50,67 130,73 210,69 C290,65 345,71 400,63 L400,66 C345,74 290,68 210,72 C130,76 50,70 0,90 Z" fill="rgba(255,255,255,0.60)" />
      </template>
      <!-- Tree A — large (cx=80) -->
      <rect x="77" y="69" width="6" height="13" :fill="trunkColor" />
      <g :class="{ 'tree-sway': sceneWind >= 5 }" :style="treeStyleA">
        <polygon points="80,46 47,74 113,74" :fill="foliage[0]" />
        <polygon points="80,31 51,61 109,61" :fill="foliage[0]" />
        <polygon points="80,18 58,50 102,50"  :fill="foliage[0]" />
        <polygon points="80,18 58,50 80,50"  :fill="foliage[2]" />
        <polygon points="80,31 51,61 80,61"  :fill="foliage[2]" opacity="0.55" />
        <polygon v-if="group === 'snow'" points="80,18 70,32 90,32" fill="rgba(255,255,255,0.82)" />
      </g>
      <!-- Tree B — medium (cx=180, 68% scale) -->
      <rect x="177" y="72" width="5" height="10" :fill="trunkColor" />
      <g :class="{ 'tree-sway': sceneWind >= 5 }" :style="treeStyleB">
        <polygon points="180,58 158,77 202,77" :fill="foliage[0]" />
        <polygon points="180,47 160,68 200,68" :fill="foliage[0]" />
        <polygon points="180,39 165,60 195,60" :fill="foliage[0]" />
        <polygon points="180,39 165,60 180,60" :fill="foliage[2]" />
        <polygon points="180,47 160,68 180,68" :fill="foliage[2]" opacity="0.55" />
        <polygon v-if="group === 'snow'" points="180,39 174,48 186,48" fill="rgba(255,255,255,0.82)" />
      </g>
      <!-- Tree C — small (cx=265, 50% scale) -->
      <rect x="262" y="74" width="5" height="8" :fill="trunkColor" />
      <g :class="{ 'tree-sway': sceneWind >= 5 }" :style="treeStyleC">
        <polygon points="265,64 247,78 283,78" :fill="foliage[0]" />
        <polygon points="265,57 250,72 280,72" :fill="foliage[0]" />
        <polygon points="265,50 253,66 277,66" :fill="foliage[0]" />
        <polygon points="265,50 253,66 265,66" :fill="foliage[2]" />
        <polygon points="265,57 250,72 265,72" :fill="foliage[2]" opacity="0.55" />
        <polygon v-if="group === 'snow'" points="265,50 260,57 270,57" fill="rgba(255,255,255,0.82)" />
      </g>
      <!-- Ground strip -->
      <rect x="0" y="82" width="400" height="8" :fill="groundColor" />
    </svg>

    <!-- Fog wisps -->
    <template v-if="isFog">
      <div v-for="(s, i) in fogWisps" :key="i" class="fog-wisp" :style="s" />
    </template>

    <!-- Flying leaves -->
    <template v-if="showLeaves">
      <div v-for="(s, i) in leaves" :key="i" class="leaf" :style="s" />
    </template>

    <!-- Scrim: darkens bottom for text readability -->
    <div class="scrim" />

    <!-- Fireworks canvas -->
    <canvas ref="fwCanvas" class="fw-canvas" />

  </div>

  <!-- Celestial modal (Sun + Moon tabs) -->
  <Teleport to="body">
  <Transition name="moon-modal-fade">
    <div v-if="celestialModalOpen" class="moon-modal-overlay" @click.self="celestialModalOpen = false">
      <div class="moon-modal">
        <div class="moon-modal-header">
          <div class="cel-tabs">
            <button class="cel-tab" :class="{ active: celestialTab === 'sun' }" @click="celestialTab = 'sun'">Sun</button>
            <button class="cel-tab" :class="{ active: celestialTab === 'moon' }" @click="celestialTab = 'moon'">Moon</button>
          </div>
          <button class="moon-modal-close" @click="celestialModalOpen = false">✕</button>
        </div>

        <div v-if="selectedDayLabel" class="cel-day-label">{{ selectedDayLabel }}</div>

        <div class="cel-body-grid">
        <!-- Sun tab -->
        <div class="moon-modal-body" :class="{ 'cel-pane--hidden': celestialTab !== 'sun' }">
          <div class="sun-modal-icon">☀</div>
          <div class="moon-modal-stats">
            <div class="moon-stat">
              <span class="moon-stat-label">Sunrise</span>
              <span class="moon-stat-value">{{ sunriseFormatted }}</span>
            </div>
            <div class="moon-stat">
              <span class="moon-stat-label">Sunset</span>
              <span class="moon-stat-value">{{ sunsetFormatted }}</span>
            </div>
            <div class="moon-stat">
              <span class="moon-stat-label">Day length</span>
              <span class="moon-stat-value">{{ dayLength }}</span>
            </div>
          </div>
        </div>

        <!-- Moon tab -->
        <div class="moon-modal-body" :class="{ 'cel-pane--hidden': celestialTab !== 'moon' }">
          <svg class="moon-modal-svg" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="20" fill="#1a237e" />
            <path v-if="modalMoonPhasePath" :d="modalMoonPhasePath" fill="#F0F4FF" />
            <circle cx="20" cy="20" r="19.5" fill="none" stroke="rgba(187,222,251,0.18)" stroke-width="1" />
          </svg>
          <div class="moon-modal-stats">
            <div class="moon-stat">
              <span class="moon-stat-label">Phase</span>
              <span class="moon-stat-value">{{ moonPhaseName }}</span>
            </div>
            <div class="moon-stat">
              <span class="moon-stat-label">Illuminated</span>
              <span class="moon-stat-value">{{ moonIllumination }}%</span>
            </div>
            <div class="moon-stat">
              <span class="moon-stat-label">Age</span>
              <span class="moon-stat-value">{{ moonAge }} days</span>
            </div>
            <div class="moon-stat">
              <span class="moon-stat-label">Full moon</span>
              <span class="moon-stat-value">{{ daysToFullMoon }}</span>
            </div>
            <div class="moon-stat">
              <span class="moon-stat-label">New moon</span>
              <span class="moon-stat-value">{{ daysToNewMoon }}</span>
            </div>
          </div>
        </div>
        </div><!-- /cel-body-grid -->
      </div>
    </div>
  </Transition>
  </Teleport>

</template>

<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  weatherCode:          { type: Number,  default: 0 },
  windSpeed:            { type: Number,  default: 0 },
  cloudCover:           { type: Number,  default: null },
  sunrise:              { type: String,  default: null },
  sunset:               { type: String,  default: null },
  modalSunrise:         { type: String,  default: null },
  modalSunset:          { type: String,  default: null },
  previewTod:           { type: String,  default: null },
  previewWeather:       { type: String,  default: null },
  previewWind:          { type: Number,  default: null },
  lat:                  { type: Number,  default: 0 },
  utcOffset:            { type: Number,  default: 0 },
  showFireworks:        { type: Boolean, default: false },
  shootingStarTrigger:  { type: Number,  default: 0 },
  forceBirds:           { type: Boolean, default: false },
  forceAurora:          { type: Boolean, default: false },
  forceFog:             { type: Boolean, default: false },
})

const emit = defineEmits(['grass-color'])

// ── Derived preview values ─────────────────────────────────────────────────
const effectiveWind = computed(() => props.previewWind ?? props.windSpeed)

// sceneWind: smoothed version of effectiveWind used for visual effects.
// Large jumps (>10 km/h) apply immediately; small fluctuations debounce for
// 12s so rapid PWS updates (every 3s) don't restart cloud/tree animations.
const sceneWind = ref(effectiveWind.value ?? 0)
let _windDebounce = null
watch(effectiveWind, (val, old) => {
  clearTimeout(_windDebounce)
  if (Math.abs((val ?? 0) - (old ?? 0)) > 10) {
    sceneWind.value = val ?? 0
  } else {
    _windDebounce = setTimeout(() => { sceneWind.value = val ?? 0 }, 12_000)
  }
})

// ── Reactive clock for time-of-day transitions ─────────────────────────────
const clockNow = ref(Date.now())
let _clockTimer = null
onMounted(()       => { _clockTimer = setInterval(() => { clockNow.value = Date.now() }, 60_000) })
onBeforeUnmount(() => clearInterval(_clockTimer))

// ── Sky cross-fade overlays (old sky fades out when timeOfDay/group changes) ─
const skyOverlays    = ref([])
let   _overlayId     = 0
const _overlayTimers = []

// ── Time of day ────────────────────────────────────────────────────────────
const timeOfDay = computed(() => {
  if (props.previewTod) return props.previewTod
  // Shift clockNow into the location's timezone so we compare apples-to-apples
  // with the bare ISO strings Open-Meteo returns (which are in local time, no tz suffix).
  const locationNowMs = clockNow.value + props.utcOffset * 1000
  if (props.sunrise && props.sunset) {
    // Append 'Z' so the browser parses the local-time strings as UTC,
    // matching the shifted locationNowMs value.
    const riseMs = new Date(props.sunrise + 'Z').getTime()
    const setMs  = new Date(props.sunset  + 'Z').getTime()
    const transitionMs = 25 * 60 * 1000 // 25-min transition window
    if (locationNowMs < riseMs - transitionMs) return 'night'
    if (locationNowMs < riseMs + transitionMs) return 'sunrise'
    if (locationNowMs < setMs  - transitionMs) return 'day'
    if (locationNowMs < setMs  + transitionMs) return 'sunset'
    return 'night'
  }
  // Fallback: use clock hours at the location
  const h = new Date(locationNowMs).getUTCHours()
  if (h >= 5  && h < 8)  return 'sunrise'
  if (h >= 8  && h < 18) return 'day'
  if (h >= 18 && h < 21) return 'sunset'
  return 'night'
})
const isDay = computed(() => timeOfDay.value !== 'night')

// ── Weather group ──────────────────────────────────────────────────────────
const group = computed(() => {
  if (props.previewWeather) return props.previewWeather
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


// ── Fog ────────────────────────────────────────────────────────────────────
const isFog = computed(() => {
  if (props.forceFog) return true
  if (props.previewWeather) return false
  const c = props.weatherCode ?? 0
  return c === 45 || c === 48
})
const fogWisps = Array.from({ length: 6 }, (_, i) => {
  const n = i + 1
  return {
    bottom:            `${10 + (n % 4) * 9}%`,
    width:             `${55 + (n % 3) * 22}%`,
    height:            `${22 + (n % 3) * 14}px`,
    animationDuration: `${18 + (n % 4) * 7}s`,
    animationDelay:    `${-((n * 4.1) % 16)}s`,
    opacity:           0.35 + (n % 3) * 0.12,
  }
})

// ── Aurora borealis ────────────────────────────────────────────────────────
const showAurora = computed(() =>
  props.forceAurora ||
  (timeOfDay.value === 'night' && cloudCount.value < 3 && (props.lat > 55 || props.lat < -55))
)
const AURORA_COLORS = [
  'rgba(57,255,120,0.22)',
  'rgba(80,200,255,0.18)',
  'rgba(180,100,255,0.20)',
  'rgba(57,255,180,0.18)',
]
function auroraBandStyle(n) {
  return {
    left:              `${(n * 24 + 3) % 65}%`,
    width:             `${38 + (n % 3) * 18}%`,
    top:               `${4 + (n % 3) * 7}%`,
    background:        `linear-gradient(to bottom, transparent, ${AURORA_COLORS[n % 4]}, transparent)`,
    animationDuration: `${6 + (n % 4) * 2}s`,
    animationDelay:    `${-((n * 1.9) % 6)}s`,
  }
}

// ── Birds ──────────────────────────────────────────────────────────────────
const showBirds = computed(() =>
  props.forceBirds ||
  (isDay.value && (group.value === 'clear' || group.value === 'partly') && cloudCount.value < 5)
)
const birds = Array.from({ length: 6 }, (_, i) => {
  const n = i + 1
  return {
    top:               `${6 + (n * 11) % 38}%`,
    width:             `${12 + (n % 3) * 4}px`,
    color:             'rgba(20,20,20,0.5)',
    animationDuration: `${14 + (n % 5) * 4}s`,
    animationDelay:    `${-((n * 3.1) % 14)}s`,
    '--bird-dy':       `${-(5 + (n % 5) * 3)}px`,
  }
})

// ── Lightning bolt cloud-tracking ───────────────────────────────────────────
const sceneEl       = ref(null)
const boltsVisible  = ref(false)
const boltPositions = ref([
  { left: '26%', top: '20%' },
  { left: '61%', top: '22%' },
])

const CLOUD_CFGS = [
  { top: '6%',  w: 140, h: 48, delay: 0    },
  { top: '16%', w: 105, h: 38, delay: -9   },
  { top: '3%',  w: 120, h: 44, delay: -19  },
  { top: '11%', w: 155, h: 52, delay: -28  },
  { top: '20%', w:  90, h: 32, delay: -6   },
  { top: '8%',  w: 130, h: 42, delay: -34  },
]

function pickBoltPositions() {
  if (!sceneEl.value) return
  const { width: sceneW, height: sceneH } = sceneEl.value.getBoundingClientRect()
  const dur    = driftDur.value
  const travel = sceneW + 360   // cloud travels from -160px to sceneW+200px
  const now    = performance.now() / 1000

  const visible = CLOUD_CFGS.slice(0, cloudCount.value).flatMap(cfg => {
    const elapsed  = (now + Math.abs(cfg.delay)) % dur
    const leftX    = -160 + (elapsed / dur) * travel
    const centerX  = leftX + cfg.w / 2
    if (centerX < 20 || centerX > sceneW - 20) return []
    const bottomY  = sceneH * (parseFloat(cfg.top) / 100) + cfg.h
    return [{ centerX, bottomY }]
  })

  if (visible.length === 0) {
    boltsVisible.value = false
    return
  }
  const shuffled = [...visible].sort(() => Math.random() - 0.5)
  const a = shuffled[0]
  const b = shuffled.length > 1 ? shuffled[1] : shuffled[0]
  // Position each bolt so its top half is hidden behind the cloud:
  //   bolt-1 is 60px tall → offset by 30px (half height)
  //   bolt-2 is 45px tall → offset by 22px (half height)
  boltPositions.value = [
    { left: `${Math.round(a.centerX - 11)}px`, top: `${Math.round(a.bottomY - 30)}px` },
    { left: `${Math.round(b.centerX - 8)}px`,  top: `${Math.round(b.bottomY - 22)}px` },
  ]
  boltsVisible.value = true
}

// ── Fireworks ──────────────────────────────────────────────────────────────
const fwCanvas = ref(null)
let fwRaf = null

const FW_COLORS = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff922b', '#cc5de8', '#38bdf8', '#f06595']

function startFireworks() {
  const canvas = fwCanvas.value
  if (!canvas) return
  canvas.width  = canvas.offsetWidth  || canvas.parentElement?.offsetWidth  || 400
  canvas.height = canvas.offsetHeight || canvas.parentElement?.offsetHeight || 200

  const ctx     = canvas.getContext('2d')
  const rockets = []
  const sparks  = []
  let lastTs    = null
  let elapsed   = 0
  let nextLaunch = 200

  function launchRocket() {
    rockets.push({
      x:       0.45 + Math.random() * 0.40,
      y:       0.95,
      targetY: 0.10 + Math.random() * 0.10,
      speed:   0.010 + Math.random() * 0.004,
      vx:      (Math.random() - 0.5) * 0.004,
      color:   FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)],
      trail:   [],
    })
  }

  function explode(r) {
    const n = 28 + Math.floor(Math.random() * 14)
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2
      const speed = 0.0014 + Math.random() * 0.002
      sparks.push({
        x: r.x, y: r.targetY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: r.color,
        life: 1,
        decay: 0.009 + Math.random() * 0.005,
        size:  1.5 + Math.random() * 1.5,
      })
    }
  }

  function frame(ts) {
    if (!lastTs) lastTs = ts
    const dt = Math.min(ts - lastTs, 50)
    lastTs = ts
    elapsed += dt

    const W = canvas.width
    const H = canvas.height
    ctx.clearRect(0, 0, W, H)

    if (elapsed < 3800) {
      nextLaunch -= dt
      if (nextLaunch <= 0) { launchRocket(); nextLaunch = 500 + Math.random() * 700 }
    }

    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i]
      r.y -= r.speed * (dt / 16)
      r.x += r.vx * (dt / 16)
      r.trail.push({ x: r.x, y: r.y })
      if (r.trail.length > 10) r.trail.shift()
      if (r.y <= r.targetY) { explode(r); rockets.splice(i, 1); continue }
      for (let j = 0; j < r.trail.length; j++) {
        ctx.globalAlpha = (j / r.trail.length) * 0.65
        ctx.fillStyle = r.color
        ctx.beginPath(); ctx.arc(r.trail[j].x * W, r.trail[j].y * H, 1.5, 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalAlpha = 1; ctx.fillStyle = '#fff'
      ctx.beginPath(); ctx.arc(r.x * W, r.y * H, 2, 0, Math.PI * 2); ctx.fill()
    }

    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i]
      s.x  += s.vx * (dt / 16)
      s.y  += s.vy * (dt / 16)
      s.vy += 0.00009 * (dt / 16)
      s.life -= s.decay * (dt / 16)
      if (s.life <= 0) { sparks.splice(i, 1); continue }
      ctx.globalAlpha = s.life * 0.85; ctx.fillStyle = s.color
      ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.size * Math.sqrt(s.life), 0, Math.PI * 2); ctx.fill()
    }

    ctx.globalAlpha = 1
    if (rockets.length > 0 || sparks.length > 0 || elapsed < 4200)
      fwRaf = requestAnimationFrame(frame)
    else { ctx.clearRect(0, 0, W, H); fwRaf = null }
  }

  if (fwRaf) cancelAnimationFrame(fwRaf)
  fwRaf = requestAnimationFrame(frame)
}

function stopFireworks() {
  if (fwRaf) { cancelAnimationFrame(fwRaf); fwRaf = null }
  const c = fwCanvas.value
  if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height)
}

watch(() => props.showFireworks, val => { if (val) startFireworks(); else stopFireworks() })

// ── Shooting stars ─────────────────────────────────────────────────────────
const shootingStarKey   = ref(0)
const shootingStarStyle = ref({})

const shootingStarsEnabled = computed(() =>
  timeOfDay.value === 'night' && (group.value === 'clear' || group.value === 'partly')
)

function fireStar() {
  const startX = 5  + Math.random() * 60   // % from left (leave room for trail)
  const startY = 3  + Math.random() * 25   // % from top
  const angle  = 20 + Math.random() * 25   // degrees: 20–45
  shootingStarStyle.value = {
    left: `${startX}%`,
    top:  `${startY}%`,
    '--star-angle': `${angle}deg`,
  }
  shootingStarKey.value++
}

let autoStarTimer = null
function scheduleNextStar() {
  const delay = 25000 + Math.random() * 45000  // 25–70 seconds
  autoStarTimer = setTimeout(() => {
    if (!shootingStarsEnabled.value) return
    fireStar()
    scheduleNextStar()
  }, delay)
}

watch(shootingStarsEnabled, enabled => {
  clearTimeout(autoStarTimer)
  if (enabled) scheduleNextStar()
}, { immediate: true })

watch(() => props.shootingStarTrigger, (val, old) => { if (val !== old) fireStar() })

let boltTimer = null
watch(isStorm, val => {
  clearInterval(boltTimer)
  boltTimer = null
  if (val) {
    pickBoltPositions()
    boltTimer = setInterval(pickBoltPositions, 6000)
  }
}, { immediate: true })
onBeforeUnmount(() => { clearInterval(boltTimer); clearTimeout(autoStarTimer); stopFireworks(); _overlayTimers.forEach(clearTimeout) })

function coverToCount(pct) {
  if (pct <=  8) return 0
  if (pct <= 20) return 1
  if (pct <= 40) return 2
  if (pct <= 55) return 3
  if (pct <= 70) return 4
  if (pct <= 87) return 5
  return 6
}

const cloudCount = computed(() => {
  // Use actual cloud cover % when available and no weather preview is overriding
  if (props.cloudCover != null && !props.previewWeather) return coverToCount(props.cloudCover)
  return ({ clear: 0, partly: 3, cloudy: 5, rain: 5, snow: 4, storm: 6 })[group.value] ?? 0
})

// ── Sky gradient ───────────────────────────────────────────────────────────
const SKY = {
  night: {
    clear:  ['#303F9F', '#3949AB', '#512DA8'],  // Indigo 700→600, Deep Purple 700
    partly: ['#303F9F', '#3949AB', '#5C6BC0'],  // Indigo 700→600→400
    cloudy: ['#455A64', '#546E7A', '#607D8B'],  // Blue Grey 700→600→500
    rain:   ['#455A64', '#303F9F', '#3949AB'],  // Blue Grey 700, Indigo 700→600
    snow:   ['#3949AB', '#5C6BC0', '#607D8B'],  // Indigo 600→400, Blue Grey 500
    storm:  ['#37474F', '#455A64', '#303F9F'],  // Blue Grey 800→700, Indigo 700
  },
  sunrise: {
    clear:  ['#7B1FA2', '#D81B60', '#FF9800'],  // Purple 700, Pink 600, Orange 500
    partly: ['#8E24AA', '#E91E63', '#FF5722'],  // Purple 600, Pink 500, Deep Orange 500
    cloudy: ['#607D8B', '#90A4AE', '#B0BEC5'],  // Blue Grey 500→300→200
    rain:   ['#455A64', '#546E7A', '#78909C'],  // Blue Grey 700→600→400
    snow:   ['#90CAF9', '#BBDEFB', '#E1F5FE'],  // Blue 200→100, Light Blue 50
    storm:  ['#37474F', '#455A64', '#512DA8'],  // Blue Grey 800→700, Deep Purple 700
  },
  day: {
    clear:  ['#1565C0', '#1E88E5', '#64B5F6'],  // Blue 800→600→300
    partly: ['#1976D2', '#2196F3', '#90CAF9'],  // Blue 700→500→200
    cloudy: ['#546E7A', '#78909C', '#B0BEC5'],  // Blue Grey 600→400→300
    rain:   ['#455A64', '#607D8B', '#78909C'],  // Blue Grey 700→500→400
    snow:   ['#42A5F5', '#90CAF9', '#BBDEFB'],  // Blue 400→200→100
    storm:  ['#37474F', '#455A64', '#303F9F'],  // Blue Grey 800→700, Indigo 700
  },
  sunset: {
    clear:  ['#7B1FA2', '#C2185B', '#FF5722'],  // Purple 700, Pink 700, Deep Orange 500
    partly: ['#8E24AA', '#D81B60', '#FF7043'],  // Purple 600, Pink 600, Deep Orange 400
    cloudy: ['#546E7A', '#78909C', '#90A4AE'],  // Blue Grey 600→400→300
    rain:   ['#455A64', '#546E7A', '#303F9F'],  // Blue Grey 700→600, Indigo 700
    snow:   ['#42A5F5', '#BBDEFB', '#E1F5FE'],  // Blue 400→100, Light Blue 50
    storm:  ['#37474F', '#455A64', '#303F9F'],  // Blue Grey 800→700, Indigo 700
  },
}

const sceneStyle = computed(() => {
  const colors = SKY[timeOfDay.value]?.[group.value] ?? SKY.day.clear
  return { background: `linear-gradient(to bottom, ${colors[0]}, ${colors[1]} 55%, ${colors[2]})` }
})

watch([timeOfDay, group], ([, ], [oldTod, oldGrp]) => {
  if (!oldTod) return
  const cols = SKY[oldTod]?.[oldGrp] ?? SKY.day.clear
  const id   = ++_overlayId
  skyOverlays.value.push({ id, background: `linear-gradient(to bottom, ${cols[0]}, ${cols[1]} 55%, ${cols[2]})` })
  const t = setTimeout(() => { skyOverlays.value = skyOverlays.value.filter(o => o.id !== id) }, 3600)
  _overlayTimers.push(t)
})

// ── Sun / Moon / Stars ─────────────────────────────────────────────────────
const sunOpacity = computed(() => {
  if (!isDay.value) return 0
  const maxClouds = group.value === 'partly' ? 4 : 3
  if (cloudCount.value > maxClouds) return 0
  return cloudCount.value <= 1 ? 1 : 0.6
})
const moonOpacity = computed(() => {
  if (timeOfDay.value !== 'night') return 0
  const c = cloudCount.value
  if (c === 0) return 1
  if (c <= 3)  return 0.55
  if (c <= 5)  return 0.25
  return 0.12  // storm / fully overcast
})
const starsOpacity = computed(() => {
  if (timeOfDay.value !== 'night') return 0
  const g = group.value
  return (g === 'clear' || g === 'partly') ? 1 : 0
})

// ── Moon phase ─────────────────────────────────────────────────────────────
// Phase 0 = new moon, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter
// Uses noon of the selected day (derived from modalSunrise) so the modal
// reflects the correct phase for the chosen day, not always today.
const moonReferenceTime = computed(() => {
  const src = props.modalSunrise ?? props.sunrise
  if (!src) return Date.now()
  return new Date(src.slice(0, 10) + 'T12:00:00Z').getTime()
})

const moonPhase = computed(() => {
  const knownNewMoon = new Date('2000-01-06T18:14:00Z').getTime()
  const lunarPeriod  = 29.53058867 * 24 * 60 * 60 * 1000
  const t            = Date.now()
  return ((t - knownNewMoon) % lunarPeriod + lunarPeriod) % lunarPeriod / lunarPeriod
})

const modalMoonPhase = computed(() => {
  const knownNewMoon = new Date('2000-01-06T18:14:00Z').getTime()
  const lunarPeriod  = 29.53058867 * 24 * 60 * 60 * 1000
  const t            = moonReferenceTime.value
  return ((t - knownNewMoon) % lunarPeriod + lunarPeriod) % lunarPeriod / lunarPeriod
})

function moonPathForPhase(p) {
  if (p < 0.02 || p > 0.98) return ''
  const R = 20, cx = 20, cy = 20
  const tx = Math.cos(2 * Math.PI * p) * R
  const atx = Math.abs(tx)
  const litOnRight = (p < 0.5) !== (props.lat < 0)
  const s1 = litOnRight ? 1 : 0
  const s2 = (litOnRight === (tx < 0)) ? 1 : 0
  return `M ${cx},${cy - R} A ${R},${R} 0 0,${s1} ${cx},${cy + R} A ${atx},${R} 0 0,${s2} ${cx},${cy - R} Z`
}

const moonPhasePath      = computed(() => moonPathForPhase(moonPhase.value))
const modalMoonPhasePath = computed(() => moonPathForPhase(modalMoonPhase.value))

const celestialModalOpen = ref(false)
const celestialTab = ref('sun')

function openCelestialModal() {
  celestialTab.value = isDay.value ? 'sun' : 'moon'
  celestialModalOpen.value = true
}

const sunriseFormatted = computed(() => {
  const src = props.modalSunrise ?? props.sunrise
  if (!src) return '—'
  const [h, m] = src.slice(11, 16).split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
})

const sunsetFormatted = computed(() => {
  const src = props.modalSunset ?? props.sunset
  if (!src) return '—'
  const [h, m] = src.slice(11, 16).split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
})

const dayLength = computed(() => {
  const rise = props.modalSunrise ?? props.sunrise
  const set  = props.modalSunset  ?? props.sunset
  if (!rise || !set) return '—'
  const riseMs = new Date(rise + 'Z').getTime()
  const setMs  = new Date(set  + 'Z').getTime()
  const mins   = Math.round((setMs - riseMs) / 60000)
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
})

const selectedDayLabel = computed(() => {
  const src = props.modalSunrise ?? props.sunrise
  if (!src) return ''
  const selDate  = src.slice(0, 10)
  const locNow   = clockNow.value + props.utcOffset * 1000
  const todayStr = new Date(locNow).toISOString().slice(0, 10)
  if (selDate === todayStr) return 'Today'
  const tomorrowStr = new Date(locNow + 86400000).toISOString().slice(0, 10)
  if (selDate === tomorrowStr) return 'Tomorrow'
  return new Date(selDate + 'T12:00:00Z').toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' })
})

const LUNAR_PERIOD = 29.53058867
const moonPhaseName = computed(() => {
  const p = modalMoonPhase.value
  if (p < 0.02 || p > 0.98) return 'New Moon'
  if (p < 0.23)              return 'Waxing Crescent'
  if (p < 0.27)              return 'First Quarter'
  if (p < 0.48)              return 'Waxing Gibbous'
  if (p < 0.52)              return 'Full Moon'
  if (p < 0.73)              return 'Waning Gibbous'
  if (p < 0.77)              return 'Last Quarter'
  return 'Waning Crescent'
})

const moonIllumination = computed(() =>
  Math.round((1 - Math.cos(2 * Math.PI * modalMoonPhase.value)) / 2 * 100)
)

const moonAge = computed(() =>
  (modalMoonPhase.value * LUNAR_PERIOD).toFixed(1)
)

const daysToFullMoon = computed(() => {
  const d = modalMoonPhase.value < 0.5
    ? (0.5 - modalMoonPhase.value) * LUNAR_PERIOD
    : (1.5 - modalMoonPhase.value) * LUNAR_PERIOD
  return Math.round(d) === 0 ? 'Tonight' : `in ${Math.round(d)} day${Math.round(d) === 1 ? '' : 's'}`
})

const daysToNewMoon = computed(() => {
  const d = (1 - modalMoonPhase.value) * LUNAR_PERIOD
  return Math.round(d) === 0 ? 'Tonight' : `in ${Math.round(d)} day${Math.round(d) === 1 ? '' : 's'}`
})

const stars = Array.from({ length: 38 }, (_, i) => ({
  id: i,
  style: {
    left:            `${(i * 31 + 17) % 88}%`,
    top:             `${(i * 19 + 5)  % 50}%`,
    width:           `${2 + (i % 2)}px`,
    height:          `${2 + (i % 2)}px`,
    '--star-op':      0.4 + (i % 5) * 0.12,
    animationDelay:  `${((i * 0.7) % 3).toFixed(1)}s`,
  },
}))

// ── Clouds ─────────────────────────────────────────────────────────────────
const cloudColor = computed(() => {
  const g   = group.value
  const tod = timeOfDay.value
  if (g === 'rain' || g === 'storm') return 'rgba(84,110,122,0.93)'    // Blue Grey 600
  if (g === 'snow')                  return 'rgba(236,239,241,0.90)'   // Blue Grey 50
  if (g === 'cloudy')                return 'rgba(176,190,197,0.88)'   // Blue Grey 200
  if (tod === 'sunrise')             return 'rgba(255,204,128,0.88)'   // Orange 200
  if (tod === 'sunset')              return 'rgba(225,190,231,0.85)'   // Purple 100
  if (tod === 'night')               return 'rgba(232,234,246,0.70)'   // Indigo 50
  return 'rgba(255,255,255,0.85)'
})

const driftDur = computed(() => {
  const s = sceneWind.value
  if (s > 60) return 14
  if (s > 50) return 19
  if (s > 40) return 26
  if (s > 30) return 36
  if (s > 20) return 49
  if (s > 10) return 65
  if (s > 5)  return 95
  return 120
})

const activeClouds = computed(() => {
  const configs = [
    { top: '6%',  w: 140, h: 48 },
    { top: '16%', w: 105, h: 38 },
    { top: '3%',  w: 120, h: 44 },
    { top: '11%', w: 155, h: 52 },
    { top: '20%', w:  90, h: 32 },
    { top: '8%',  w: 130, h: 42 },
  ]
  const count = cloudCount.value
  const dur   = driftDur.value
  return configs
    .slice(0, count)
    .map((cfg, i) => ({
      style: {
        top:               cfg.top,
        width:             `${cfg.w}px`,
        height:            `${cfg.h}px`,
        '--cloud-color':   cloudColor.value,
        animationDuration: `${dur}s`,
        animationDelay:    `${-(i * dur / count).toFixed(1)}s`,
      },
    }))
})

// ── Rain ───────────────────────────────────────────────────────────────────
// Static per-drop styles (position, timing, per-drop angle variation)
const dropStyles = Array.from({ length: 32 }, (_, i) => {
  const n = i + 1
  return {
    left:              `${(n * 29 + 7) % 100}%`,
    height:            `${14 + (n % 4) * 5}px`,
    animationDelay:    `${((n * 0.17) % 1).toFixed(2)}s`,
    animationDuration: `${(1.00 + (n % 5) * 0.1).toFixed(2)}s`,
    '--angle-var':     `${(((n % 5) - 2) * 1.5).toFixed(1)}deg`,
  }
})

// Dynamic CSS vars on the container — only recomputes when wind/storm changes
const dropsContainerStyle = computed(() => ({
  '--rain-angle':   `${-Math.min(38, 5 + sceneWind.value * 0.42).toFixed(1)}deg`,
  '--rain-drift':   `${Math.min(200, sceneWind.value * 2.5).toFixed(0)}px`,
  '--drop-opacity':  isStorm.value ? '0.75' : '0.5',
}))

// ── Snow ───────────────────────────────────────────────────────────────────
// Static per-flake styles (position, sizing, timing, per-flake drift variation)
const flakeStyles = Array.from({ length: 22 }, (_, i) => {
  const n = i + 1
  return {
    left:              `${(n * 37 + 11) % 95}%`,
    width:             `${4 + (n % 3) * 2}px`,
    height:            `${4 + (n % 3) * 2}px`,
    animationDelay:    `${((n * 0.23) % 2).toFixed(2)}s`,
    animationDuration: `${(2.2 + (n % 5) * 0.4).toFixed(2)}s`,
    '--drift-var':     `${(n % 5) * 6}px`,
  }
})

// Dynamic CSS vars on the container — only recomputes when wind changes
const flakesContainerStyle = computed(() => ({
  '--snow-drift': `${Math.min(120, 10 + sceneWind.value * 2.8).toFixed(0)}px`,
}))

// ── Landscape colours ──────────────────────────────────────────────────────
const hillFarColor = computed(() => {
  const tod = timeOfDay.value
  const g   = group.value
  if (tod === 'night')               return '#512DA8'  // Deep Purple 700
  if (tod === 'sunrise')             return '#7B1FA2'  // Purple 700
  if (tod === 'sunset')              return '#7B1FA2'  // Purple 700
  if (g === 'snow')                  return '#CFD8DC'  // Blue Grey 100
  if (g === 'rain' || g === 'storm') return '#4CAF50'  // Green 500
  return '#66BB6A'                                     // Green 400
})

const hillNearColor = computed(() => {
  const tod = timeOfDay.value
  const g   = group.value
  if (tod === 'night')               return '#303F9F'  // Indigo 700
  if (tod === 'sunrise')             return '#512DA8'  // Deep Purple 700
  if (tod === 'sunset')              return '#512DA8'  // Deep Purple 700
  if (g === 'snow')                  return '#B0BEC5'  // Blue Grey 200
  if (g === 'rain' || g === 'storm') return '#43A047'  // Green 600
  return '#4CAF50'                                     // Green 500
})

const groundColor = computed(() => {
  const tod = timeOfDay.value
  const g   = group.value
  if (tod === 'night')               return '#303F9F'  // Indigo 700
  if (tod === 'sunrise')             return '#3949AB'  // Indigo 600
  if (tod === 'sunset')              return '#3949AB'  // Indigo 600
  if (g === 'snow')                  return '#ECEFF1'  // Blue Grey 50
  if (g === 'rain' || g === 'storm') return '#43A047'  // Green 600
  return '#43A047'                                     // Green 600
})

watch(groundColor, val => emit('grass-color', val), { immediate: true })

const foliage = computed(() => {
  const tod = timeOfDay.value
  const g   = group.value
  if (tod === 'night')               return ['#1A237E', '#311B92', '#283593']  // Indigo 900, Deep Purple 900, Indigo 800
  if (tod === 'sunrise')             return ['#3E4A1A', '#2E3A10', '#4A5520']  // dark backlit silhouette
  if (tod === 'sunset')              return ['#4A148C', '#311B92', '#6A1B9A']  // Purple 900, Deep Purple 900, Purple 800
  if (g === 'snow')                  return ['#E1F5FE', '#BBDEFB', '#E3F2FD']  // Light Blue 50, Blue 100, Blue 50
  if (g === 'rain' || g === 'storm') return ['#2E7D32', '#1B5E20', '#388E3C']  // Green 800, 900, 700
  return ['#388E3C', '#2E7D32', '#66BB6A']                                     // Green 700, 800, 400
})

const trunkColor = computed(() => {
  if (timeOfDay.value === 'night')   return '#1A237E'  // Indigo 900
  if (timeOfDay.value === 'sunrise') return '#6D4C41'  // Brown 600
  if (timeOfDay.value === 'sunset')  return '#7B1FA2'  // Purple 700
  if (group.value === 'snow')        return '#A1887F'  // Brown 300
  return '#795548'                                     // Brown 500
})

// ── Leaves ─────────────────────────────────────────────────────────────────
const leafColors = computed(() => [
  ...foliage.value,
  '#8D6E63',  // Brown 400
  '#795548',  // Brown 500
  '#A1887F',  // Brown 300
])
const showLeaves = computed(() => sceneWind.value >= 15)

// Tree A ≈ 20%, Tree B ≈ 45%, Tree C ≈ 66% of scene width
const TREE_ORIGINS = [17, 42, 63]
const leaves = computed(() => {
  const s = sceneWind.value
  const count = s >= 60 ? 10 : s >= 35 ? 7 : 4
  const cols  = leafColors.value
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1
    const size  = 5 + (n % 3) * 2
    const treeX = TREE_ORIGINS[n % 3] + (n % 4) * 1.2
    return {
      width:             `${size}px`,
      height:            `${(size * 0.6).toFixed(0)}px`,
      background:        cols[n % cols.length],
      bottom:            `${14 + (n * 7 % 16)}%`,
      left:              `${treeX}%`,
      borderRadius:      '50% 10% 50% 10%',
      animationDelay:    `${-((n * 0.71) % 3.5).toFixed(2)}s`,
      animationDuration: `${(2.0 + (n % 5) * 0.55).toFixed(1)}s`,
      '--wa':            `${9 + (n % 4) * 5}px`,
    }
  })
})

// ── Tree sway ──────────────────────────────────────────────────────────────
function swayVars() {
  const s = sceneWind.value
  if (s < 5) return null
  const dur   = s > 40 ? 0.5  : s > 20 ? 0.7  : 1.8
  const angle = s > 40 ? 12   : s > 20 ? 7    : 4
  return { '--sway-from': `${(angle * 0.3).toFixed(1)}deg`, '--sway-angle': `${angle}deg`, '--sway-dur': `${dur}s` }
}
const treeStyleA = computed(() => swayVars() ?? {})
const treeStyleB = computed(() => { const v = swayVars(); return v ? { ...v, animationDelay: '-0.5s' } : {} })
const treeStyleC = computed(() => { const v = swayVars(); return v ? { ...v, animationDelay: '-1.1s' } : {} })
</script>

<style scoped>
.scene {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
  pointer-events: none;
  contain: layout style paint;
}

/* ── Sky cross-fade overlay ───────────────────────────────────────────────── */
.sky-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  animation: sky-fade-out 3.5s ease forwards;
}
@keyframes sky-fade-out {
  from { opacity: 1; }
  to   { opacity: 0; }
}

/* ── Time-of-day element fades ────────────────────────────────────────────── */
.tod-fade-enter-active,
.tod-fade-leave-active { transition: opacity 2.5s ease; }
.tod-fade-enter-from,
.tod-fade-leave-to     { opacity: 0; }

/* ── Layer wrappers for element groups ───────────────────────────────────── */
.stars-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  transition: opacity 2.5s ease;
}
.aurora-layer,
.birds-layer {
  position: absolute;
  inset: 0;
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
  0%, 100% { opacity: var(--star-op, 1); }
  50%       { opacity: 0.1; }
}

/* ── Shooting star ────────────────────────────────────────────────────────── */
.shooting-star {
  position: absolute;
  width: 130px;
  height: 2px;
  background: linear-gradient(to right, transparent 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.95) 100%);
  border-radius: 1px;
  transform-origin: right center;
  transform: rotate(var(--star-angle, 30deg)) translateX(0);
  filter: drop-shadow(0 0 4px rgba(255,255,255,0.85));
  animation: scene-shoot 0.75s ease-out forwards;
  pointer-events: none;
}
@keyframes scene-shoot {
  0%   { transform: rotate(var(--star-angle, 30deg)) translateX(0);      opacity: 0; }
  8%   { opacity: 1; }
  75%  { opacity: 0.7; }
  100% { transform: rotate(var(--star-angle, 30deg)) translateX(360px);  opacity: 0; }
}

/* ── Sun ──────────────────────────────────────────────────────────────────── */
.sun {
  position: absolute;
  top: 20px;
  right: 6%;
  width: 54px;
  height: 54px;
  background: radial-gradient(circle at 38% 38%, #FFFFFF, #FFD54F 40%, #FFA000 68%, transparent);
  border-radius: 50%;
  box-shadow: 0 0 28px 8px rgba(255,213,79,0.45), 0 0 60px 24px rgba(255,179,0,0.22), 0 0 100px 40px rgba(255,160,0,0.12);
  transition: opacity 2.5s ease;
  cursor: pointer;
}

/* ── Moon ─────────────────────────────────────────────────────────────────── */
.moon {
  position: absolute;
  top: 15px;
  right: 6%;
  width: 64px;
  height: 64px;
  overflow: visible;
  filter:
    drop-shadow(0 0 6px rgba(187,222,251,0.55))
    drop-shadow(0 0 18px rgba(187,222,251,0.28));
  pointer-events: auto;
  cursor: pointer;
  transition: opacity 2.5s ease;
}

/* ── Clouds ───────────────────────────────────────────────────────────────── */
.cloud {
  position: absolute;
  left: -160px;
  background: var(--cloud-color, rgba(255,255,255,0.82));
  border-radius: 60px;
  animation: scene-drift linear infinite;
  transition: background 2.5s ease;
  will-change: transform;
}

.cloud-fade-enter-active,
.cloud-fade-leave-active { transition: opacity 2.5s ease; }
.cloud-fade-enter-from,
.cloud-fade-leave-to     { opacity: 0; }
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
.drops-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.drop {
  position: absolute;
  top: -28px;
  width: 1.5px;
  background: linear-gradient(to bottom, transparent, rgba(129,212,250,0.75));
  border-radius: 2px;
  opacity: var(--drop-opacity, 0.5);
  animation: scene-rain linear infinite;
  will-change: transform;
}
@keyframes scene-rain {
  from { transform: translateY(0)     translateX(0)                       rotate(calc(var(--rain-angle, -8deg) + var(--angle-var, 0deg))); }
  to   { transform: translateY(110vh) translateX(var(--rain-drift, 40px)) rotate(calc(var(--rain-angle, -8deg) + var(--angle-var, 0deg))); }
}

/* ── Snow ─────────────────────────────────────────────────────────────────── */
.flakes-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.flake {
  position: absolute;
  top: -14px;
  background: rgba(255,255,255,0.88);
  border-radius: 50%;
  animation: scene-snow linear infinite;
  will-change: transform;
}
@keyframes scene-snow {
  from { transform: translateY(0)     translateX(0); }
  to   { transform: translateY(110vh) translateX(calc(var(--snow-drift, 18px) + var(--drift-var, 0px))); }
}

/* ── Lightning bolts ──────────────────────────────────────────────────────── */
.bolt {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  filter: drop-shadow(0 0 5px rgba(255,255,255,0.9)) drop-shadow(0 0 14px rgba(180,210,255,0.7));
  animation: scene-bolt 6s linear infinite;
  overflow: visible;
}
.bolt svg { width: 100%; height: 100%; }
.bolt-1 { width: 22px; height: 60px; }
.bolt-2 { width: 15px; height: 45px; animation-delay: -3.2s; }

@keyframes scene-bolt {
  0%, 87%, 100% { opacity: 0; }
  89%, 90%      { opacity: 1; }
  92%           { opacity: 0; }
}

/* ── Landscape ────────────────────────────────────────────────────────────── */
.landscape {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 52%;
}
.landscape path,
.landscape polygon,
.landscape rect { transition: fill 3s ease; }

/* ── Tree sway ────────────────────────────────────────────────────────────── */
.tree-sway {
  animation: scene-sway var(--sway-dur, 1.8s) ease-in-out infinite alternate;
  transform-box: fill-box;
  transform-origin: 50% 100%;
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
    rgba(0, 0, 0, 0.18) 55%,
    rgba(0, 0, 0, 0.05) 100%
  );
}


/* ── Fireworks canvas ────────────────────────────────────────────────────── */
.fw-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* ── Leaves ───────────────────────────────────────────────────────────────── */
.leaf {
  position: absolute;
  opacity: 0;
  animation: scene-leaf linear infinite;
  will-change: transform, opacity;
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


/* ── Aurora borealis ─────────────────────────────────────────────────────── */
.aurora-band {
  position: absolute;
  height: 30%;
  border-radius: 50%;
  animation: aurora-wave ease-in-out infinite alternate;
  pointer-events: none;
  will-change: transform, opacity;
}
@keyframes aurora-wave {
  0%   { transform: scaleX(1)    scaleY(1)    skewX(0deg);   opacity: 0.45; }
  50%  { transform: scaleX(1.12) scaleY(0.88) skewX(-10deg); opacity: 0.80; }
  100% { transform: scaleX(0.95) scaleY(1.08) skewX(6deg);   opacity: 0.55; }
}

/* ── Birds ───────────────────────────────────────────────────────────────── */
.bird {
  position: absolute;
  left: -30px;
  animation: bird-fly linear infinite;
  pointer-events: none;
  will-change: transform;
}
.bird svg { display: block; width: 100%; height: auto; }
@keyframes bird-fly {
  0%   { transform: translateX(0)      translateY(0); }
  25%  { transform: translateX(300px)  translateY(var(--bird-dy, -8px)); }
  50%  { transform: translateX(600px)  translateY(0); }
  75%  { transform: translateX(900px)  translateY(var(--bird-dy, -8px)); }
  100% { transform: translateX(1200px) translateY(0); }
}

/* ── Fog wisps ───────────────────────────────────────────────────────────── */
.fog-wisp {
  position: absolute;
  left: -60%;
  background: radial-gradient(ellipse at center, rgba(200,215,225,0.55), transparent 70%);
  border-radius: 50%;
  animation: fog-drift linear infinite;
  pointer-events: none;
  will-change: transform;
}
@keyframes fog-drift {
  from { transform: translateX(0); }
  to   { transform: translateX(250vw); }
}

/* ── Celestial modal (Sun + Moon) ─────────────────────────────────────────── */
.moon-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
}

.moon-modal {
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  width: 280px;
  overflow: hidden;
}

.moon-modal-header {
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid var(--panel-border);
}

.cel-tabs {
  display: flex;
  flex: 1;
}

.cel-tab {
  flex: 1;
  padding: 14px 0;
  background: none;
  border: none;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.15s;
  position: relative;
}

.cel-tab::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 10%;
  right: 10%;
  height: 2px;
  background: var(--accent);
  border-radius: 2px;
  opacity: 0;
  transition: opacity 0.15s;
}

.cel-tab.active { color: var(--text); }
.cel-tab.active::after { opacity: 1; }
.cel-tab:hover:not(.active) { color: var(--text); }

.sun-modal-icon {
  font-size: 3.5rem;
  line-height: 1;
  width: 72px;
  text-align: center;
  flex-shrink: 0;
  filter: drop-shadow(0 0 8px rgba(255,200,50,0.6));
}

.moon-modal-close {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0 16px;
  align-self: center;
  line-height: 1;
}
.moon-modal-close:hover { color: var(--text); }

.cel-day-label {
  text-align: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  padding: 6px 20px;
  border-bottom: 1px solid var(--panel-border);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.cel-body-grid {
  display: grid;
}

.moon-modal-body {
  grid-area: 1 / 1;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 20px;
}

.cel-pane--hidden {
  visibility: hidden;
  pointer-events: none;
}

.moon-modal-svg {
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  filter:
    drop-shadow(0 0 6px rgba(187,222,251,0.55))
    drop-shadow(0 0 18px rgba(187,222,251,0.28));
}

.moon-modal-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.moon-stat {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}

.moon-stat-label {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.moon-stat-value {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text);
  text-align: right;
}

.moon-modal-fade-enter-active,
.moon-modal-fade-leave-active { transition: opacity 0.2s ease; }
.moon-modal-fade-enter-from,
.moon-modal-fade-leave-to     { opacity: 0; }

</style>
