<template>
  <div class="sc-overlay" :style="landscape ? { alignItems: 'flex-start', paddingTop: '42%' } : {}"  >
    <div class="sc-inner" @pointerdown="onPointerDown" @pointerup="onPointerUp" @pointercancel="onPointerCancel" @click="onClick" @contextmenu.prevent="onContextMenu">
      <!-- Left: icon + temp + condition -->
      <div class="sc-left">
        <span v-if="sceneOverlayLayout.showIcon" class="sc-icon">{{ info.emoji }}</span>
        <div v-if="sceneOverlayLayout.showTemp" class="sc-temp-group">
          <span class="sc-temp">{{ fmt(data.temperature_2m, 1) }}<span class="sc-unit">{{ tempUnit }}</span></span>
          <div v-if="todayHigh != null" class="sc-hl">
            <span>H {{ fmt(todayHigh, 0) }}°</span>
            <span class="sc-hl-low">L {{ fmt(todayLow, 0) }}°</span>
          </div>
        </div>
      </div>

      <!-- Right: configurable slots -->
      <div v-if="sceneOverlayLayout.showSlots" class="sc-right">
        <div v-if="showConditionSlot" class="sc-right-item">{{ info.label }}</div>
        <div v-if="dataSlots.length" class="sc-data-grid">
          <template v-for="slot in dataSlots" :key="slot.type">
            <span class="sc-tile-icon" v-html="slot.icon"></span>
            <span class="sc-data-val">{{ slot.value }}</span>
            <span class="sc-data-unit">{{ slot.unit }}</span>
            <svg v-if="slot.type === 'wind' && data.wind_direction_10m != null" class="sc-wind-arrow" width="17" height="17" viewBox="0 0 14 14" fill="none" aria-hidden="true"
                 :style="{ transform: `rotate(${data.wind_direction_10m + 180}deg)`, transformOrigin: '50% 50%' }">
              <line x1="7" y1="12" x2="7" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <polygon points="7,2 4,7 10,7" fill="currentColor"/>
            </svg>
            <span v-else-if="slot.type !== 'wind'"></span>
            <span v-else></span>
          </template>
        </div>
      </div>
    </div>
  </div>

  <SceneConditionsPanel
    v-model="showPanel"
    :data="data"
    :daily="daily"
    :unit-prefs="unitPrefs"
    :pws-data-active="pwsDataActive"
    :pws-name="pwsName"
  />
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { getWeatherInfo } from '../utils/weatherCodes.js'
import { DATA_TYPES } from '../utils/dataTypes.js'
import { TILE_ICONS } from '../utils/tileIcons.js'
import { useSettings } from '../composables/useSettings.js'
import SceneConditionsPanel from './SceneConditionsPanel.vue'

const props = defineProps({
  data:         { type: Object,  required: true },
  daily:        { type: Object,  default: null },
  unitPrefs:    { type: Object,  required: true },
  blocked:      { type: Boolean, default: false },
  pwsDataActive:{ type: Boolean, default: false },
  pwsName:      { type: String,  default: null },
  landscape:    { type: Boolean, default: false },
})

const emit = defineEmits(['panel-change', 'open-settings'])

const { sceneOverlayLayout } = useSettings()

const showPanel = ref(false)

// ── Tap-and-hold ──────────────────────────────────────────────────────────────
let holdTimer = null
let holdFired = false

function onPointerDown() {
  if (props.blocked) return
  holdFired = false
  holdTimer = setTimeout(() => {
    holdFired = true
    navigator.vibrate?.(30)
    emit('open-settings', 'sceneConditions')
  }, 500)
}

function onPointerUp() {
  if (holdTimer) { clearTimeout(holdTimer); holdTimer = null }
}

function onPointerCancel() {
  if (holdTimer) { clearTimeout(holdTimer); holdTimer = null }
}

// Android Chrome fires pointercancel when contextmenu fires, which would clear
// the timer before settings opens. Open settings directly from contextmenu instead.
function onContextMenu() {
  if (props.blocked) return
  if (holdTimer) { clearTimeout(holdTimer); holdTimer = null }
  holdFired = true
  emit('open-settings', 'sceneConditions')
}

function onClick() {
  if (!holdFired && !props.blocked) showPanel.value = true
}

watch(showPanel, (open) => emit('panel-change', open))

const info      = computed(() => getWeatherInfo(props.data.weather_code))
const tempUnit  = computed(() => DATA_TYPES.temperature.getUnit(props.unitPrefs))
const todayHigh = computed(() => props.daily?.temperature_2m_max?.[0] ?? null)
const todayLow  = computed(() => props.daily?.temperature_2m_min?.[0] ?? null)

// ── Slot rendering ────────────────────────────────────────────────────────────
const showConditionSlot = computed(() => sceneOverlayLayout.value.slots.includes('condition'))

const dataSlots = computed(() => {
  const d  = props.data
  const up = props.unitPrefs
  return sceneOverlayLayout.value.slots
    .filter(s => s !== 'condition' && s !== 'none')
    .map(type => {
      const cfg = DATA_TYPES[type]
      if (!cfg) return null
      const icon = TILE_ICONS[cfg.iconKey ?? type]
      let value = '–'
      if (cfg.hourlyKey && d[cfg.hourlyKey] != null) {
        const raw = cfg.scale ? cfg.scale(d[cfg.hourlyKey], up) : d[cfg.hourlyKey]
        const dec = Math.min(cfg.getDecimals ? cfg.getDecimals(up) : (cfg.decimals ?? 0), 1)
        value = Number(raw).toFixed(dec)
      }
      const unit = cfg.getUnit ? cfg.getUnit(up) : ''
      return { type, icon, value, unit }
    })
    .filter(Boolean)
})

function fmt(v, decimals) {
  if (v == null) return '–'
  return Number(v).toFixed(decimals)
}
</script>

<style scoped>
/* ── Scene overlay (tap target) ─────────────────────────────────────────── */
.sc-overlay {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
}


.sc-inner {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 24px;
  pointer-events: auto;
  cursor: pointer;
  -webkit-touch-callout: none;
  user-select: none;
}

/* Left column */
.sc-left {
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 10px;
  flex: 1;
}

.sc-icon {
  font-size: 3rem;
  line-height: 1;
  filter: drop-shadow(0 2px 8px rgba(0,0,0,0.45));
  flex-shrink: 0;
  margin-top: 3px;
}

.sc-temp-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sc-temp {
  font-size: 2.2rem;
  font-weight: 700;
  letter-spacing: -1px;
  line-height: 1;
  color: #fff;
  text-shadow: 0 1px 8px rgba(0,0,0,0.55);
}

.sc-unit {
  font-size: 1.3rem;
  font-weight: 400;
  margin-left: 2px;
  color: rgba(255,255,255,0.8);
}

.sc-hl {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 0.95rem;
  font-weight: 600;
  color: rgba(255,255,255,0.8);
  text-shadow: 0 1px 4px rgba(0,0,0,0.5);
}

.sc-hl-low {
  opacity: 0.7;
}

/* Right column */
.sc-right {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
  flex: 1;
}

.sc-right-item {
  font-size: 0.85rem;
  font-weight: 500;
  color: rgba(255,255,255,0.85);
  text-shadow: 0 1px 4px rgba(0,0,0,0.5);
  white-space: nowrap;
}

.sc-data-grid {
  display: grid;
  grid-template-columns: 20px 3.5ch auto auto;
  align-items: center;
  gap: 7px 5px;
  font-size: 0.85rem;
  font-weight: 500;
  color: rgba(255,255,255,0.85);
  text-shadow: 0 1px 4px rgba(0,0,0,0.5);
}

.sc-data-val {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.sc-data-unit {
  white-space: nowrap;
}

.sc-data-secondary {
  opacity: 0.65;
  font-size: 0.78rem;
}

.sc-tile-icon {
  display: inline-flex;
  align-items: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}
.sc-tile-icon :deep(svg) {
  width: 20px;
  height: 20px;
}

.sc-wind-arrow {
  color: rgba(255,255,255,0.75);
  vertical-align: middle;
  flex-shrink: 0;
}
</style>
