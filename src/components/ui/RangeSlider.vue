<template>
  <div class="rs-wrap">
    <div class="rs-labels">
      <span class="rs-val">{{ formatVal(localLow) }}</span>
      <span class="rs-val">{{ formatVal(localHigh) }}</span>
    </div>
    <div class="rs-track-wrap" ref="trackEl" @pointerdown="onTrackDown">
      <div class="rs-track" />
      <div
        class="rs-fill"
        :style="{ left: lowPct + '%', width: (highPct - lowPct) + '%' }"
      />
      <div
        class="rs-thumb"
        :class="{ dragging: dragging === 'low' }"
        :style="{ left: lowPct + '%' }"
        @pointerdown.stop="startDrag('low', $event)"
      />
      <div
        class="rs-thumb"
        :class="{ dragging: dragging === 'high' }"
        :style="{ left: highPct + '%' }"
        @pointerdown.stop="startDrag('high', $event)"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  low:      { type: Number, default: null },
  high:     { type: Number, default: null },
  min:      { type: Number, required: true },
  max:      { type: Number, required: true },
  step:     { type: Number, default: 1 },
  unit:     { type: String, default: '' },
  format:   { type: Function, default: null },
})

const emit = defineEmits(['update:low', 'update:high'])

// Internal state — initialise from props, falling back to range ends
const localLow  = ref(props.low  ?? props.min)
const localHigh = ref(props.high ?? props.max)

watch(() => props.low,  v => { localLow.value  = v ?? props.min })
watch(() => props.high, v => { localHigh.value = v ?? props.max })

const lowPct  = computed(() => ((localLow.value  - props.min) / (props.max - props.min)) * 100)
const highPct = computed(() => ((localHigh.value - props.min) / (props.max - props.min)) * 100)

function formatVal(v) {
  if (props.format) return props.format(v)
  return `${v}${props.unit}`
}

function snap(raw) {
  const clamped = Math.max(props.min, Math.min(props.max, raw))
  return Math.round((clamped - props.min) / props.step) * props.step + props.min
}

// Drag state
const trackEl = ref(null)
const dragging = ref(null)

function startDrag(handle, e) {
  dragging.value = handle
  e.currentTarget.setPointerCapture(e.pointerId)
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp, { once: true })
}

function onTrackDown(e) {
  if (!trackEl.value) return
  const rect = trackEl.value.getBoundingClientRect()
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  const val = snap(props.min + pct * (props.max - props.min))
  // Assign to whichever handle is closer
  const distLow  = Math.abs(val - localLow.value)
  const distHigh = Math.abs(val - localHigh.value)
  const handle = distLow <= distHigh ? 'low' : 'high'
  dragging.value = handle
  setHandle(handle, val)
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp, { once: true })
}

function onMove(e) {
  if (!dragging.value || !trackEl.value) return
  const rect = trackEl.value.getBoundingClientRect()
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  const val = snap(props.min + pct * (props.max - props.min))
  setHandle(dragging.value, val)
}

function onUp() {
  dragging.value = null
  window.removeEventListener('pointermove', onMove)
}

function setHandle(handle, val) {
  if (handle === 'low') {
    const newLow = Math.min(val, localHigh.value)
    localLow.value = newLow
    emit('update:low', newLow === props.min ? null : newLow)
  } else {
    const newHigh = Math.max(val, localLow.value)
    localHigh.value = newHigh
    emit('update:high', newHigh === props.max ? null : newHigh)
  }
}
</script>

<style scoped>
.rs-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.1rem 0;
  user-select: none;
}

.rs-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
  opacity: 0.8;
}

.rs-val {
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.rs-track-wrap {
  position: relative;
  height: 28px;
  display: flex;
  align-items: center;
  cursor: pointer;
}

.rs-track {
  position: absolute;
  left: 0;
  right: 0;
  height: 4px;
  border-radius: 2px;
  background: var(--btn-border, rgba(255,255,255,0.13));
}

.rs-fill {
  position: absolute;
  height: 4px;
  border-radius: 2px;
  background: #38bdf8;
  pointer-events: none;
}

.rs-thumb {
  position: absolute;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #38bdf8;
  transform: translateX(-50%);
  cursor: grab;
  transition: box-shadow 0.12s, transform 0.1s;
  touch-action: none;
}
.rs-thumb:hover,
.rs-thumb.dragging {
  box-shadow: 0 0 0 5px rgba(56, 189, 248, 0.22);
  transform: translateX(-50%) scale(1.1);
  cursor: grabbing;
}
</style>
