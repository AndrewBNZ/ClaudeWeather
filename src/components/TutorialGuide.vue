<template>
  <Teleport to="body">
    <div v-if="step !== null" class="tut-root">
      <!-- Spotlight + dimmer: hidden while the locations panel is open or tutorial is pending -->
      <template v-if="!panelOpen && !hidden">
        <div v-if="spotRect" class="tut-spotlight" :style="spotlightStyle" />
        <div v-else class="tut-dimmer" />
      </template>

      <!-- Tooltip card -->
      <div v-show="!hidden" class="tut-card" :style="cardStyle">
        <div class="tut-dots">
          <span
            v-for="i in displayStepCount"
            :key="i"
            class="tut-dot"
            :class="{ active: i - 1 === displayStepIndex }"
          />
        </div>
        <p class="tut-icon">{{ current.icon }}</p>
        <h3 class="tut-title">{{ panelOpen && step === 1 ? 'Find your location' : (!isMobile && current.desktopTitle) ? current.desktopTitle : current.title }}</h3>
        <p class="tut-desc">{{ panelOpen && step === 1 ? 'Hit "Current Location" to use your GPS, or search for any city. Save as many as you like and switch between them anytime.' : (!isMobile && current.desktopDesc) ? current.desktopDesc : current.desc }}</p>
        <div class="tut-actions">
          <button class="tut-skip" @click="emit('finish')">Skip tutorial</button>
          <button
            v-if="!current.autoAdvance"
            class="tut-next"
            @click="onNextOrDone"
          >{{ displayStepIndex === displayStepCount - 1 ? '✓ Done' : 'Next →' }}</button>
          <span v-else-if="!panelOpen" class="tut-hint">Add a location to continue</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'

const MOBILE_BREAKPOINT = 768

const STEPS = [
  {
    target: null,
    icon: '🌤️',
    title: 'Welcome to ClaudeWeather',
    desc: 'Checking the weather is basically a hobby at this point — you might as well do it in style. Live animated scenes, hour-by-hour breakdowns, 14 days out. All a tap away.',
  },
  {
    target: '.add-location-btn',
    icon: '📍',
    title: 'First things first',
    desc: 'Tap here to pick a location — use your current one or search for any city. You can save as many as you like.',
    autoAdvance: true,
  },
  {
    target: '.cond-body',
    icon: '👆',
    title: 'Tap a tile, see it graphed',
    desc: 'Temperature, wind, rain, humidity — tap any tile up here and it instantly plots in the charts below. Go on, try a few.',
  },
  {
    target: '[data-chart="daily"]',
    icon: '📅',
    title: 'Pick any day',
    desc: 'Tap a day in this chart to load its full hourly breakdown. Up to 14 days, always at your fingertips.',
  },
  {
    target: '[data-chart="hourly"]',
    icon: '👈',
    title: 'Swipe through the hours',
    desc: 'Drag the hourly chart to scroll through the day. Hit the arrows at either edge to jump to the next or previous day.',
    desktopTitle: 'Browse the hours',
    desktopDesc: 'The day picker at the top-right is another way to switch days — jump to a specific date, step back and forth with the arrows, or snap back to today.',
    yOffset: -40,
  },
  {
    target: '.settings-btn',
    icon: '⚙️',
    title: 'Make it feel like home',
    desc: 'Pick your theme, set your units, and choose which tiles matter to you. It\'s your weather — set it up just how you like.',
  },
]

const props = defineProps({
  step:      { type: Number,  default: null },
  panelOpen: { type: Boolean, default: false },
  hidden:    { type: Boolean, default: false },
})

const emit = defineEmits(['next', 'finish'])

const current = computed(() => STEPS[props.step] ?? STEPS[0])

const displayStepCount = computed(() => STEPS.length)
const displayStepIndex = computed(() => props.step ?? 0)

const spotRect  = ref(null)
const windowW   = ref(window.innerWidth)
const windowH   = ref(window.innerHeight)
const isMobile  = computed(() => windowW.value <= MOBILE_BREAKPOINT)

const PAD    = 10
const CARD_W = 290

function measure() {
  if (props.step === null) { spotRect.value = null; return }
  const sel = STEPS[props.step]?.target
  if (!sel) { spotRect.value = null; return }
  const el = document.querySelector(sel)
  spotRect.value = el ? el.getBoundingClientRect() : null
}

watch(() => props.step, async () => {
  spotRect.value = null
  await nextTick()
  measure()
  setTimeout(measure, 350) // retry after transitions settle
}, { immediate: true })

function onResize() {
  windowW.value = window.innerWidth
  windowH.value = window.innerHeight
  measure()
}

onMounted(() => window.addEventListener('resize', onResize, { passive: true }))
onUnmounted(() => window.removeEventListener('resize', onResize))

function onNextOrDone() {
  if (props.step < STEPS.length - 1) emit('next')
  else emit('finish')
}

const spotlightStyle = computed(() => {
  if (!spotRect.value) return {}
  const r = spotRect.value
  return {
    left:   `${r.left   - PAD}px`,
    top:    `${r.top    - PAD}px`,
    width:  `${r.width  + PAD * 2}px`,
    height: `${r.height + PAD * 2}px`,
  }
})

const cardStyle = computed(() => {
  const vw = windowW.value
  const vh = windowH.value
  const base = { width: `${CARD_W}px` }

  // While the locations panel is open, sit just to the left of the panel
  if (props.panelOpen && props.step === 1) {
    const panelW = Math.min(300, vw * 0.9)
    const left = Math.max(16, vw - panelW - CARD_W - 16)
    return { ...base, top: '210px', left: `${left}px` }
  }

  if (!spotRect.value) {
    return { ...base, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  }

  const r  = spotRect.value
  const cx = r.left + r.width / 2
  const CARD_H = 220

  // Prefer below, fall back to above
  const yOffset = STEPS[props.step]?.yOffset ?? 0
  let top
  if (r.bottom + PAD + 14 + CARD_H < vh) {
    top = r.bottom + PAD + 14 + yOffset
  } else {
    top = Math.max(16, r.top - PAD - 14 - CARD_H + yOffset)
  }

  // Center on target, clamped to viewport
  let left = cx - CARD_W / 2
  left = Math.max(16, Math.min(vw - CARD_W - 16, left))

  return { ...base, top: `${top}px`, left: `${left}px` }
})
</script>

<style scoped>
.tut-root {
  position: fixed;
  inset: 0;
  z-index: 5000;
  pointer-events: none;
}

/* Full-screen dim when no spotlight target yet */
.tut-dimmer {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.62);
}

/* The spotlight "hole": transparent box with a huge box-shadow that dims everything else */
.tut-spotlight {
  position: fixed;
  border-radius: 10px;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.62);
  outline: 2px solid rgba(56, 189, 248, 0.55);
  transition: left 0.35s ease, top 0.35s ease, width 0.35s ease, height 0.35s ease;
}

.tut-card {
  position: fixed;
  pointer-events: auto;
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
  z-index: 5001;
  transition: top 0.35s ease, left 0.35s ease;
}

.tut-dots {
  display: flex;
  gap: 5px;
  margin-bottom: 14px;
}

.tut-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--text-faint);
  transition: background 0.2s, width 0.2s, border-radius 0.2s;
}

.tut-dot.active {
  width: 18px;
  border-radius: 4px;
  background: #38bdf8;
}

.tut-icon {
  font-size: 1.8rem;
  margin: 0 0 6px;
}

.tut-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 8px;
}

.tut-desc {
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.55;
  margin: 0 0 18px;
}

.tut-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.tut-skip {
  background: none;
  border: none;
  color: var(--text-faint);
  font-size: 0.82rem;
  cursor: pointer;
  padding: 0;
  transition: color 0.15s;
}
.tut-skip:hover { color: var(--text-muted); }

.tut-next {
  padding: 8px 18px;
  border-radius: 9999px;
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid rgba(56, 189, 248, 0.35);
  color: #38bdf8;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.tut-next:hover { background: rgba(56, 189, 248, 0.25); }

.tut-hint {
  font-size: 0.8rem;
  color: var(--text-faint);
  font-style: italic;
}
</style>
