<template>
  <div class="card detail-tiles-card"
    @touchstart.passive="onSwipeTouchStart"
    @touchend.passive="onSwipeTouchEnd"
  >
    <Transition :name="'page-' + pageDirection">
      <div class="tiles-grid" :key="currentPage">
        <button
          v-for="item in detailPages[currentPage]"
          :key="item.type"
          class="tile selectable"
          :class="{ active: activeType === item.type }"
          :style="{ '--sel-color': item.color }"
          @click="emit('select', item.type)"
        >
          <span v-if="pwsDataActive && item.pwsSource" class="pws-dot" :title="`${item.label} from ${pwsName}`"></span>
          <span v-if="item.type === 'wind' && data.wind_direction_10m != null" class="tile-icon wind-arrow-icon">
            <svg width="23" height="23" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="10" r="9.5" fill="rgba(15,23,42,0.75)" stroke="#06b6d4" stroke-width="1.5"/>
              <g class="wind-arrow-g" :style="{ transform: `rotate(${windDisplayAngle}deg)`, transformOrigin: '10px 10px' }">
                <line x1="10" y1="16" x2="10" y2="10" stroke="#06b6d4" stroke-width="1.5" stroke-linecap="round"/>
                <polygon points="10,4 7,10 13,10" fill="#06b6d4"/>
              </g>
            </svg>
          </span>
          <span v-else-if="item.iconHtml" class="tile-icon" v-html="item.iconHtml"></span>
          <div>
            <div class="tile-label">{{ item.label }}</div>
            <div class="tile-value">
              {{ item.value }}
              <span v-if="item.type === 'wind' && windTrend" class="wind-trend" :class="windTrend">{{ windTrend === 'up' ? '▲' : '▼' }}</span>
            </div>
          </div>
        </button>
      </div>
    </Transition>

    <!-- Page navigation -->
    <div v-if="detailPages.length > 1" class="page-nav">
      <button class="page-arrow" :disabled="currentPage === 0" @click="goToPage(currentPage - 1)" aria-label="Previous page">‹</button>
      <div class="page-dots">
        <button
          v-for="(_, i) in detailPages"
          :key="i"
          class="page-dot"
          :class="{ active: i === currentPage }"
          @click="goToPage(i)"
          :aria-label="`Page ${i + 1}`"
        />
      </div>
      <button class="page-arrow" :disabled="currentPage === detailPages.length - 1" @click="goToPage(currentPage + 1)" aria-label="Next page">›</button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { DATA_TYPES } from '../utils/dataTypes.js'
import { TILE_ICONS } from '../utils/tileIcons.js'

const props = defineProps({
  data:         { type: Object,  required: true },
  unitPrefs:    { type: Object,  required: true },
  activeType:   { type: String,  required: true },
  tileConfig:   { type: Array,   default: null },
  pwsName:      { type: String,  default: null },
  pwsDataActive:{ type: Boolean, default: false },
})

const emit = defineEmits(['select'])

const tempUnit = computed(() => DATA_TYPES.temperature.getUnit(props.unitPrefs))

function fmt(v, decimals) {
  if (v == null) return '–'
  return Number(v).toFixed(decimals)
}

const uvLabel = computed(() => {
  const uv = props.data.uv_index
  if (uv == null) return ''
  if (uv < 3)  return ' Low'
  if (uv < 6)  return ' Moderate'
  if (uv < 8)  return ' High'
  if (uv < 11) return ' Very High'
  return ' Extreme'
})

// Wind trend tracking
const windHistory = ref([])
watch(
  [() => props.data.wind_speed_10m, () => props.pwsDataActive],
  ([speed, active]) => {
    if (!active || speed == null) { windHistory.value = []; return }
    const last = windHistory.value[windHistory.value.length - 1]
    if (last == null || Math.abs(speed - last) >= 0.3) {
      windHistory.value = [...windHistory.value.slice(-4), speed]
    }
  }
)
const windTrend = computed(() => {
  if (!props.pwsDataActive) return null
  const h = windHistory.value
  if (h.length < 3) return null
  const half = Math.floor(h.length / 2)
  const older = h.slice(0, half).reduce((a, b) => a + b, 0) / half
  const newer = h.slice(half + 1).reduce((a, b) => a + b, 0) / (h.length - half - 1)
  const diff = newer - older
  if (diff > 1.5) return 'up'
  if (diff < -1.5) return 'down'
  return null
})

// Wind arrow smooth rotation
const windDisplayAngle = ref(0)
watch(() => props.data.wind_direction_10m, (dir) => {
  if (dir == null) return
  const target = (dir + 180) % 360
  if (windDisplayAngle.value === 0 && target !== 0) { windDisplayAngle.value = target; return }
  let delta = ((target - (windDisplayAngle.value % 360)) + 540) % 360 - 180
  windDisplayAngle.value += delta
}, { immediate: true })

const allTiles = computed(() => {
  const d = props.data
  const u = props.unitPrefs
  function tile(typeId, value, extra = {}) {
    const cfg = DATA_TYPES[typeId]
    return { type: cfg.id, iconHtml: TILE_ICONS[typeId], label: cfg.label, color: cfg.color, value, ...extra }
  }
  return {
    rain:       { type: 'rain', iconHtml: TILE_ICONS.rain, label: DATA_TYPES.rainAmount.label, color: DATA_TYPES.rainAmount.color, value: `${fmt(d.precipitation, 2)} ${DATA_TYPES.rainAmount.getUnit(u)}${d.precipitation_probability != null ? ' · ' + d.precipitation_probability + '%' : ''}`, pwsSource: true },
    wind:       tile('wind',       `${fmt(d.wind_speed_10m, 1)} ${DATA_TYPES.wind.getUnit(u)}`, { pwsSource: true }),
    feelsLike:  tile('feelsLike',  `${fmt(d.apparent_temperature, 1)}${tempUnit.value}`,         { iconHtml: TILE_ICONS.feelsLike,  pwsSource: true }),
    humidity:   tile('humidity',   `${fmt(d.relative_humidity_2m, 0)}%`,                         { iconHtml: TILE_ICONS.humidity,   pwsSource: true }),
    uv:         tile('uv',         `${fmt(d.uv_index, 1)}${uvLabel.value}`,                      { iconHtml: TILE_ICONS.uv }),
    cloudCover: tile('cloudCover', `${fmt(d.cloud_cover, 0)}%`,                                  { iconHtml: TILE_ICONS.cloudCover }),
    pressure:   tile('pressure',   `${fmt(DATA_TYPES.pressure.scale(d.surface_pressure, u), DATA_TYPES.pressure.getDecimals(u))} ${DATA_TYPES.pressure.getUnit(u)}`, { iconHtml: TILE_ICONS.pressure,   pwsSource: true }),
    visibility: tile('visibility', `${fmt(DATA_TYPES.visibility.scale(d.visibility, u), DATA_TYPES.visibility.decimals)} ${DATA_TYPES.visibility.getUnit(u)}`,       { iconHtml: TILE_ICONS.visibility }),
    radar:      tile('radar',      'Precipitation', { iconHtml: TILE_ICONS.radar }),
  }
})

const detailPages = computed(() => {
  if (!props.tileConfig) return [Object.values(allTiles.value)]
  const pages = [[]]
  for (const t of props.tileConfig) {
    if (t.type === 'pageBreak') {
      pages.push([])
    } else if (t.enabled && allTiles.value[t.type]) {
      pages[pages.length - 1].push(allTiles.value[t.type])
    }
  }
  return pages.filter(p => p.length > 0)
})

const currentPage   = ref(0)
const pageDirection = ref('left')

function goToPage(n) {
  pageDirection.value = n > currentPage.value ? 'left' : 'right'
  currentPage.value = n
}

watch(detailPages, (pages) => {
  if (currentPage.value >= pages.length) currentPage.value = Math.max(0, pages.length - 1)
})

let swipeTouchStartX = null
function onSwipeTouchStart(e) { swipeTouchStartX = e.touches[0].clientX }
function onSwipeTouchEnd(e) {
  if (swipeTouchStartX === null) return
  const dx = e.changedTouches[0].clientX - swipeTouchStartX
  swipeTouchStartX = null
  if (Math.abs(dx) < 40) return
  if (dx < 0 && currentPage.value < detailPages.value.length - 1) goToPage(currentPage.value + 1)
  else if (dx > 0 && currentPage.value > 0) goToPage(currentPage.value - 1)
}
</script>

<style scoped>
.detail-tiles-card {
  padding: 12px 12px 14px;
  position: relative;
  overflow: hidden;
}

.tiles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  grid-auto-rows: 68px;
  gap: 8px;
}

.tile {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  color: inherit;
  transition: background 0.18s, border-color 0.18s, transform 0.12s;
}
.tile:hover:not(.active) {
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
}
.tile.active {
  background: color-mix(in srgb, var(--sel-color) 18%, transparent);
  border-color: color-mix(in srgb, var(--sel-color) 55%, transparent);
}

.tile-icon { flex-shrink: 0; display: flex; align-items: center; }
.tile-label { font-size: 0.72rem; color: var(--text-faint); margin-bottom: 1px; }
.tile-value { font-size: 0.88rem; font-weight: 600; color: var(--text); }

.pws-dot {
  position: absolute;
  top: 7px;
  left: 7px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #38bdf8;
}

.wind-trend {
  font-size: 0.6rem;
  margin-left: 3px;
  vertical-align: middle;
}
.wind-trend.up   { color: #ef4444; }
.wind-trend.down { color: #22c55e; }

/* Page navigation */
.page-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding-top: 10px;
}
.page-arrow {
  background: none;
  border: none;
  color: var(--text-faint);
  font-size: 2rem;
  line-height: 1;
  width: 28px;
  height: 28px;
  padding: 0 0 2px;
  cursor: pointer;
  transition: color 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.page-arrow:hover:not(:disabled) { color: var(--text); }
.page-arrow:disabled { opacity: 0.2; cursor: default; }

.page-dots { display: flex; align-items: center; gap: 6px; }
.page-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  border: none;
  background: var(--text-faint);
  opacity: 0.4;
  padding: 0;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s, opacity 0.2s;
}
.page-dot.active {
  opacity: 1;
  background: var(--text-muted);
  transform: scale(1.3);
}

/* Page slide transitions */
.page-left-enter-active, .page-left-leave-active,
.page-right-enter-active, .page-right-leave-active {
  transition: transform 0.28s ease, opacity 0.28s ease;
}
.page-left-leave-active, .page-right-leave-active {
  position: absolute;
  top: 12px; left: 12px; right: 12px;
}
.page-left-enter-from  { transform: translateX(100%); opacity: 0; }
.page-left-leave-to    { transform: translateX(-100%); opacity: 0; }
.page-right-enter-from { transform: translateX(-100%); opacity: 0; }
.page-right-leave-to   { transform: translateX(100%); opacity: 0; }
</style>
