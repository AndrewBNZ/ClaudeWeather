<template>
  <div class="scene" :style="sceneStyle" ref="sceneEl">

    <!-- Stars (night, clear/partly) -->
    <template v-if="showStars">
      <div v-for="s in stars" :key="s.id" class="star" :style="s.style" />
    </template>

    <!-- Aurora borealis (night, high latitude, low cloud) -->
    <template v-if="showAurora">
      <div v-for="n in 4" :key="n" class="aurora-band" :style="auroraBandStyle(n)" />
    </template>

    <!-- Sun -->
    <div v-if="showSun" class="sun" />

    <!-- Shooting star -->
    <div
      v-if="shootingStarKey > 0"
      :key="shootingStarKey"
      class="shooting-star"
      :style="shootingStarStyle"
    />

    <!-- Moon (phase-accurate SVG) -->
    <svg v-if="showMoon" class="moon" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" :style="{ opacity: moonOpacity }">
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
    <div v-for="(cl, i) in activeClouds" :key="i" class="cloud" :style="cl.style" />

    <!-- Rainbow (rain, daytime — rendered above clouds) -->
    <svg v-if="showRainbow" class="rainbow" viewBox="-20 0 140 110" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M -8,100 A 58,58 0 0,1 108,100" fill="none" stroke="rgba(255,50,50,0.55)"  stroke-width="3.5" stroke-linecap="round" opacity="0.55"/>
      <path d="M -5,100 A 55,55 0 0,1 105,100" fill="none" stroke="rgba(255,140,0,0.55)"  stroke-width="3.5" stroke-linecap="round" opacity="0.55"/>
      <path d="M -2,100 A 52,52 0 0,1 102,100" fill="none" stroke="rgba(255,220,0,0.55)"  stroke-width="3.5" stroke-linecap="round" opacity="0.55"/>
      <path d="M  1,100 A 49,49 0 0,1  99,100" fill="none" stroke="rgba(0,200,60,0.55)"   stroke-width="3.5" stroke-linecap="round" opacity="0.55"/>
      <path d="M  4,100 A 46,46 0 0,1  96,100" fill="none" stroke="rgba(0,100,255,0.50)"  stroke-width="3.5" stroke-linecap="round" opacity="0.55"/>
      <path d="M  7,100 A 43,43 0 0,1  93,100" fill="none" stroke="rgba(130,0,220,0.45)"  stroke-width="3.5" stroke-linecap="round" opacity="0.55"/>
    </svg>

    <!-- Rain drops -->
    <template v-if="isRain || isStorm">
      <div v-for="n in 32" :key="n" class="drop" :style="dropStyle(n)" />
    </template>

    <!-- Snowflakes -->
    <template v-if="isSnow">
      <div v-for="n in 22" :key="n" class="flake" :style="flakeStyle(n)" />
    </template>

    <!-- Birds (clear/partly, daytime) -->
    <template v-if="showBirds">
      <div v-for="n in 6" :key="n" class="bird" :style="birdStyle(n)">
        <svg viewBox="0 0 20 8" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,6 Q5,1 10,6 Q15,1 20,6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </div>
    </template>

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
      <g :class="{ 'tree-sway': effectiveWind >= 5 }" :style="treeStyleA">
        <polygon points="80,46 47,74 113,74" :fill="foliage[0]" />
        <polygon points="80,31 51,61 109,61" :fill="foliage[0]" />
        <polygon points="80,18 58,50 102,50"  :fill="foliage[0]" />
        <polygon points="80,18 58,50 80,50"  :fill="foliage[2]" />
        <polygon points="80,31 51,61 80,61"  :fill="foliage[2]" opacity="0.55" />
        <polygon v-if="group === 'snow'" points="80,18 70,32 90,32" fill="rgba(255,255,255,0.82)" />
      </g>
      <!-- Tree B — medium (cx=180, 68% scale) -->
      <rect x="177" y="72" width="5" height="10" :fill="trunkColor" />
      <g :class="{ 'tree-sway': effectiveWind >= 5 }" :style="treeStyleB">
        <polygon points="180,58 158,77 202,77" :fill="foliage[0]" />
        <polygon points="180,47 160,68 200,68" :fill="foliage[0]" />
        <polygon points="180,39 165,60 195,60" :fill="foliage[0]" />
        <polygon points="180,39 165,60 180,60" :fill="foliage[2]" />
        <polygon points="180,47 160,68 180,68" :fill="foliage[2]" opacity="0.55" />
        <polygon v-if="group === 'snow'" points="180,39 174,48 186,48" fill="rgba(255,255,255,0.82)" />
      </g>
      <!-- Tree C — small (cx=265, 50% scale) -->
      <rect x="262" y="74" width="5" height="8" :fill="trunkColor" />
      <g :class="{ 'tree-sway': effectiveWind >= 5 }" :style="treeStyleC">
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
      <div v-for="n in 6" :key="n" class="fog-wisp" :style="fogStyle(n)" />
    </template>

    <!-- Flying leaves -->
    <template v-if="showLeaves">
      <div v-for="n in leafCount" :key="n" class="leaf" :style="leafStyle(n)" />
    </template>

    <!-- Scrim: darkens bottom for text readability -->
    <div class="scrim" />

    <!-- Fireworks canvas -->
    <canvas ref="fwCanvas" class="fw-canvas" />

  </div>
</template>

<script setup>
import { computed, ref, watch, onBeforeUnmount } from 'vue'

const props = defineProps({
  weatherCode:          { type: Number,  default: 0 },
  windSpeed:            { type: Number,  default: 0 },
  cloudCover:           { type: Number,  default: null },
  sunrise:              { type: String,  default: null },
  sunset:               { type: String,  default: null },
  previewTod:           { type: String,  default: null },
  previewWeather:       { type: String,  default: null },
  previewWind:          { type: Number,  default: null },
  lat:                  { type: Number,  default: 0 },
  showFireworks:        { type: Boolean, default: false },
  shootingStarTrigger:  { type: Number,  default: 0 },
  forceBirds:           { type: Boolean, default: false },
  forceAurora:          { type: Boolean, default: false },
  forceFog:             { type: Boolean, default: false },
})

const emit = defineEmits(['grass-color'])

// ── Derived preview values ─────────────────────────────────────────────────
const effectiveWind = computed(() => props.previewWind ?? props.windSpeed)

// ── Time of day ────────────────────────────────────────────────────────────
const timeOfDay = computed(() => {
  if (props.previewTod) return props.previewTod
  const now = Date.now()
  if (props.sunrise && props.sunset) {
    const riseMs = new Date(props.sunrise).getTime()
    const setMs  = new Date(props.sunset).getTime()
    const transitionMs = 25 * 60 * 1000 // 25-min transition window
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

// ── Rainbow ────────────────────────────────────────────────────────────────
const showRainbow = computed(() => isRain.value && isDay.value)

// ── Fog ────────────────────────────────────────────────────────────────────
const isFog = computed(() => {
  if (props.forceFog) return true
  if (props.previewWeather) return false
  const c = props.weatherCode ?? 0
  return c === 45 || c === 48
})
function fogStyle(n) {
  return {
    bottom:            `${10 + (n % 4) * 9}%`,
    width:             `${55 + (n % 3) * 22}%`,
    height:            `${22 + (n % 3) * 14}px`,
    animationDuration: `${18 + (n % 4) * 7}s`,
    animationDelay:    `${-((n * 4.1) % 16)}s`,
    opacity:           0.35 + (n % 3) * 0.12,
  }
}

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
  (isDay.value && (group.value === 'clear' || group.value === 'partly') && cloudCount.value < 4)
)
function birdStyle(n) {
  return {
    top:               `${6 + (n * 11) % 38}%`,
    width:             `${12 + (n % 3) * 4}px`,
    color:             'rgba(20,20,20,0.5)',
    animationDuration: `${14 + (n % 5) * 4}s`,
    animationDelay:    `${-((n * 3.1) % 14)}s`,
  }
}

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
onBeforeUnmount(() => { clearInterval(boltTimer); clearTimeout(autoStarTimer); stopFireworks() })

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
    clear:  ['#1E88E5', '#64B5F6', '#B3E5FC'],  // Blue 600→300, Light Blue 100
    partly: ['#2196F3', '#90CAF9', '#E1F5FE'],  // Blue 500→200, Light Blue 50
    cloudy: ['#78909C', '#B0BEC5', '#CFD8DC'],  // Blue Grey 400→200→100
    rain:   ['#455A64', '#607D8B', '#78909C'],  // Blue Grey 700→500→400
    snow:   ['#64B5F6', '#BBDEFB', '#E1F5FE'],  // Blue 300→100, Light Blue 50
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

// ── Sun / Moon / Stars ─────────────────────────────────────────────────────
const showSun   = computed(() => isDay.value && cloudCount.value === 0)
const showMoon  = computed(() => timeOfDay.value === 'night')
const moonOpacity = computed(() => {
  const c = cloudCount.value
  if (c === 0) return 1
  if (c <= 3)  return 0.55
  if (c <= 5)  return 0.25
  return 0.12  // storm / fully overcast
})
const showStars = computed(() => timeOfDay.value === 'night' && cloudCount.value < 4)

// ── Moon phase ─────────────────────────────────────────────────────────────
// Phase 0 = new moon, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter
const moonPhase = computed(() => {
  const knownNewMoon  = new Date('2000-01-06T18:14:00Z').getTime()
  const lunarPeriod   = 29.53058867 * 24 * 60 * 60 * 1000
  const now           = Date.now()
  return ((now - knownNewMoon) % lunarPeriod + lunarPeriod) % lunarPeriod / lunarPeriod
})

const moonPhasePath = computed(() => {
  const p  = moonPhase.value
  if (p < 0.02 || p > 0.98) return ''   // new moon — show only dark disc

  const R  = 20
  const cx = 20, cy = 20
  const tx = Math.cos(2 * Math.PI * p) * R  // signed terminator x-radius
  const atx = Math.abs(tx)

  const litOnRight = (p < 0.5) !== (props.lat < 0)     // waxing=right in N. Hemisphere; flipped in S. Hemisphere
  const s1 = litOnRight ? 1 : 0                        // outer arc: clockwise (right side) when lit is on right
  const s2 = (litOnRight === (tx < 0)) ? 1 : 0         // terminator sweep depends on lit side + gibbous/crescent

  return `M ${cx},${cy - R} A ${R},${R} 0 0,${s1} ${cx},${cy + R} A ${atx},${R} 0 0,${s2} ${cx},${cy - R} Z`
})

const stars = Array.from({ length: 38 }, (_, i) => ({
  id: i,
  style: {
    left:            `${(i * 31 + 17) % 88}%`,
    top:             `${(i * 19 + 5)  % 50}%`,
    width:           `${2 + (i % 2)}px`,
    height:          `${2 + (i % 2)}px`,
    opacity:          0.4 + (i % 5) * 0.12,
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
  const s = effectiveWind.value
  if (s > 50) return 7
  if (s > 30) return 13
  if (s > 10) return 28  // breeze (15 km/h) lands here
  return 65              // calm (0) — very slow lazy drift
})

const activeClouds = computed(() =>
  [
    { top: '6%',  w: 140, h: 48, delay: 0    },
    { top: '16%', w: 105, h: 38, delay: -9   },
    { top: '3%',  w: 120, h: 44, delay: -19  },
    { top: '11%', w: 155, h: 52, delay: -28  },
    { top: '20%', w:  90, h: 32, delay: -6   },
    { top: '8%',  w: 130, h: 42, delay: -34  },
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
    animationDuration: `${(1.00 + (n % 5) * 0.1).toFixed(2)}s`,
    '--rain-angle':    `${-(rainAngle.value + angleVariation).toFixed(1)}deg`,
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
    animationDuration: `${(2.2 + (n % 5) * 0.4).toFixed(2)}s`,
    '--snow-drift':    `${(snowDrift.value + driftVariation).toFixed(0)}px`,
  }
}

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
const showLeaves = computed(() => effectiveWind.value >= 15)
const leafCount  = computed(() => {
  const s = effectiveWind.value
  if (s >= 60) return 10
  if (s >= 35) return 7
  return 4
})

// Tree A ≈ 20%, Tree B ≈ 45%, Tree C ≈ 66% of scene width
const TREE_ORIGINS = [17, 42, 63]
function leafStyle(n) {
  const col    = leafColors.value[n % leafColors.value.length]
  const size   = 5 + (n % 3) * 2
  const treeX  = TREE_ORIGINS[n % 3] + (n % 4) * 1.2
  return {
    width:             `${size}px`,
    height:            `${(size * 0.6).toFixed(0)}px`,
    background:        col,
    bottom:            `${14 + (n * 7 % 16)}%`,
    left:              `${treeX}%`,
    borderRadius:      '50% 10% 50% 10%',
    animationDelay:    `${-((n * 0.71) % 3.5).toFixed(2)}s`,
    animationDuration: `${(2.0 + (n % 5) * 0.55).toFixed(1)}s`,
    '--wa':            `${9 + (n % 4) * 5}px`,
  }
}

// ── Tree sway ──────────────────────────────────────────────────────────────
function swayVars() {
  const s = effectiveWind.value
  if (s < 5) return null
  const dur   = s > 40 ? 0.3  : s > 20 ? 0.7  : 1.8
  const angle = s > 40 ? 14   : s > 20 ? 7    : 4
  return { '--sway-from': `${(angle * 0.3).toFixed(1)}deg`, '--sway-angle': `${angle}deg`, '--sway-dur': `${dur}s` }
}
const treeStyleA = computed(() => swayVars() ?? {})
const treeStyleB = computed(() => swayVars() ? { ...swayVars(), animationDelay: '-0.5s' } : {})
const treeStyleC = computed(() => swayVars() ? { ...swayVars(), animationDelay: '-1.1s' } : {})
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
  top: 68px;
  right: 6%;
  width: 54px;
  height: 54px;
  background: radial-gradient(circle at 38% 38%, #FFFFFF, #FFD54F 40%, #FFA000 68%, transparent);
  border-radius: 50%;
  box-shadow: 0 0 28px 8px rgba(255,213,79,0.45), 0 0 60px 24px rgba(255,179,0,0.22), 0 0 100px 40px rgba(255,160,0,0.12);
}

/* ── Moon ─────────────────────────────────────────────────────────────────── */
.moon {
  position: absolute;
  top: 68px;
  right: 6%;
  width: 64px;
  height: 64px;
  overflow: visible;
  filter:
    drop-shadow(0 0 6px rgba(187,222,251,0.55))
    drop-shadow(0 0 18px rgba(187,222,251,0.28));
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
  background: linear-gradient(to bottom, transparent, rgba(129,212,250,0.75));
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

/* ── Rainbow ─────────────────────────────────────────────────────────────── */
.rainbow {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  animation: rainbow-shimmer 5s ease-in-out infinite alternate;
}
@keyframes rainbow-shimmer {
  from { opacity: 0.72; }
  to   { opacity: 1; }
}

/* ── Aurora borealis ─────────────────────────────────────────────────────── */
.aurora-band {
  position: absolute;
  height: 30%;
  border-radius: 50%;
  animation: aurora-wave ease-in-out infinite alternate;
  pointer-events: none;
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
}
.bird svg { display: block; width: 100%; height: auto; }
@keyframes bird-fly {
  from { transform: translateX(0); }
  to   { transform: translateX(1200px); }
}

/* ── Fog wisps ───────────────────────────────────────────────────────────── */
.fog-wisp {
  position: absolute;
  left: -60%;
  background: radial-gradient(ellipse at center, rgba(200,215,225,0.55), transparent 70%);
  border-radius: 50%;
  animation: fog-drift linear infinite;
  pointer-events: none;
}
@keyframes fog-drift {
  from { transform: translateX(0); }
  to   { transform: translateX(250vw); }
}

</style>
