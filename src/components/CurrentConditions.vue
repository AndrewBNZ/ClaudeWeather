<template>
  <div class="conditions card" :class="{ blurred: blurred }">

    <!-- Scene header: location name + nav buttons overlaid on the scene -->
    <div class="scene-header">
      <div class="scene-location-group">
        <span class="scene-location">{{ locationName || 'ClaudeWeather' }}</span>
        <span class="scene-datetime">{{ localDateTime }}</span>
      </div>
      <div class="scene-btns">
        <button data-locations-btn class="scene-btn" @click="emit('open-locations')" title="Saved locations">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            <circle cx="12" cy="9" r="2.5"/>
          </svg>
        </button>
        <button data-settings-btn class="scene-btn" data-tut="settings" @click="emit('open-settings')" title="Preferences">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
            <line x1="4" y1="6" x2="20" y2="6"/>
            <line x1="4" y1="12" x2="20" y2="12"/>
            <line x1="4" y1="18" x2="20" y2="18"/>
            <circle cx="10" cy="6" r="2.5" fill="currentColor" stroke="none"/>
            <circle cx="16" cy="12" r="2.5" fill="currentColor" stroke="none"/>
            <circle cx="8" cy="18" r="2.5" fill="currentColor" stroke="none"/>
          </svg>
        </button>
      </div>
    </div>

    <WeatherScene
      @grass-color="emit('grass-color', $event)"
      :weather-code="data.weather_code"
      :wind-speed="data.wind_speed_10m"
      :cloud-cover="data.cloud_cover"
      :sunrise="todaySunrise"
      :sunset="todaySunset"
      :lat="lat"
      :utc-offset="utcOffset"
      :preview-tod="previewTod"
      :preview-weather="previewWeather"
      :preview-wind="previewWind"
      :show-fireworks="showFireworks || fireworksPreview"
      :shooting-star-trigger="shootingStarTrigger"
      :force-birds="simBirds"
      :force-aurora="simAurora"
      :force-fog="simFog"
    />

    <!-- Bottom-right action buttons -->
    <div class="bottom-bar">
      <button class="bottom-btn" title="Customise weather details" @click="emit('open-data-types')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
      <div v-if="showSim" class="sim-bar">
      <div v-if="simExpanded" class="sim-panel">
        <div class="sim-header">
          <div class="sim-title">Weather Simulator</div>
          <button class="sim-reset" :style="{ visibility: hasPreview ? 'visible' : 'hidden' }" @click="resetSim">↺ Reset</button>
        </div>
        <div class="sim-row">
          <span class="sim-row-label">Time</span>
          <button v-for="t in timeOfDays" :key="t.tod"
            class="sim-btn" :class="{ active: previewTod === t.tod }"
            @click="previewTod = previewTod === t.tod ? null : t.tod"
            :title="t.label">{{ t.emoji }}</button>
        </div>
        <div class="sim-row">
          <span class="sim-row-label">Weather</span>
          <button v-for="w in weatherPreviews" :key="w.group"
            class="sim-btn" :class="{ active: previewWeather === w.group }"
            @click="previewWeather = previewWeather === w.group ? null : w.group"
            :title="w.label">{{ w.emoji }}</button>
        </div>
        <div class="sim-row">
          <span class="sim-row-label">Wind</span>
          <button v-for="wl in windLevels" :key="wl.label"
            class="sim-btn" :class="{ active: previewWind === wl.speed }"
            @click="previewWind = previewWind === wl.speed ? null : wl.speed"
            :title="wl.label">{{ wl.emoji }}</button>
        </div>
        <div class="sim-row">
          <span class="sim-row-label">Effects</span>
          <button class="sim-btn" :class="{ active: fireworksPreview }" title="Fireworks" @click="triggerFireworksPreview">🎆</button>
          <button class="sim-btn" title="Shooting star" @click="triggerShootingStar">🌠</button>
          <button class="sim-btn" :class="{ active: simBirds }"  title="Birds"   @click="simBirds  = !simBirds">🐦</button>
          <button class="sim-btn" :class="{ active: simAurora }" title="Aurora"  @click="simAurora = !simAurora">🌌</button>
          <button class="sim-btn" :class="{ active: simFog }"    title="Fog"     @click="simFog    = !simFog">🌫️</button>
        </div>
      </div>
      <button class="sim-toggle" :class="{ 'sim-active': hasPreview, 'sim-open': simExpanded }" title="Weather Simulator" @click="simExpanded = !simExpanded">
        {{ simExpanded ? '▾' : '▴' }}
      </button>
    </div>
    </div>

    <!-- Scene footer (desktop only) -->
    <div class="scene-footer">
      Data from <a href="https://open-meteo.com" target="_blank" rel="noopener">Open-Meteo</a>
      <template v-if="updatedAt"> · Updated {{ updatedAt }}</template>
      <template v-if="!loading"> · <CountdownTimer :fetched-at="fetchedAt" :stale-ms="staleMs" /></template>
      <button class="scene-footer-refresh" @click="emit('refresh')" :disabled="loading" title="Refresh">
        <span :class="{ spinning: loading }">↻</span>
      </button>
    </div>

    <div class="cond-content">
    <div class="cond-body">
      <!-- Main temp block — clicking selects "temperature" -->
      <button
        class="cond-main selectable"
        :class="{ active: activeType === 'temperature' }"
        style="--sel-color: #f97316"
        @click="emit('select', 'temperature')"
      >
        <div class="weather-icon">{{ info.emoji }}</div>
        <div class="temp-block">
          <div class="temperature">
            {{ fmt(data.temperature_2m, 1) }}<span class="unit">{{ tempUnit }}</span>
          </div>
          <div v-if="todayHigh != null" class="hl-block">
            <div class="hl-item"><span class="hl-label">H</span> {{ fmt(todayHigh, 0) }}°</div>
            <div class="hl-item hl-low"><span class="hl-label">L</span> {{ fmt(todayLow, 0) }}°</div>
          </div>
          <div class="condition">{{ info.label }}</div>
        </div>
      </button>

      <!-- Detail items — each selects its data type -->
      <div class="cond-details">
        <button
          v-for="item in detailItems"
          :key="item.type"
          class="detail-item selectable"
          :class="{ active: activeType === item.type }"
          :style="{ '--sel-color': item.color }"
          @click="emit('select', item.type)"
        >
          <span v-if="item.iconHtml" class="detail-icon" v-html="item.iconHtml"></span>
          <span v-else class="detail-icon">{{ item.icon }}</span>
          <div>
            <div class="detail-label">{{ item.label }}</div>
            <div class="detail-value">{{ item.value }}</div>
          </div>
        </button>
      </div>
    </div>
    </div>

  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { getWeatherInfo } from '../utils/weatherCodes.js'
import { DATA_TYPES } from '../utils/dataTypes.js'
import { TILE_ICONS } from '../utils/tileIcons.js'
import WeatherScene from './WeatherScene.vue'
import CountdownTimer from './CountdownTimer.vue'

// ── Sim preview state ──────────────────────────────────────────────────────
const timeOfDays = [
  { emoji: '🌅', label: 'Sunrise', tod: 'sunrise'  },
  { emoji: '☀️', label: 'Day',     tod: 'day'      },
  { emoji: '🌇', label: 'Sunset',  tod: 'sunset'   },
  { emoji: '🌙', label: 'Night',   tod: 'night'    },
]
const weatherPreviews = [
  { emoji: '✨',  label: 'Clear',         group: 'clear'  },
  { emoji: '⛅',  label: 'Partly cloudy', group: 'partly' },
  { emoji: '☁️',  label: 'Cloudy',        group: 'cloudy' },
  { emoji: '🌧️', label: 'Rain',           group: 'rain'   },
  { emoji: '🌨️', label: 'Snow',           group: 'snow'   },
  { emoji: '⛈️', label: 'Storm',          group: 'storm'  },
]
const windLevels = [
  { emoji: '🍃', label: 'Calm',    speed: 0  },
  { emoji: '🌬️', label: 'Breeze', speed: 15 },
  { emoji: '💨', label: 'Windy',   speed: 35 },
  { emoji: '🌪️', label: 'Storm',  speed: 75 },
]
const simExpanded    = ref(false)
const previewTod     = ref(null)  // string: 'night'|'sunrise'|'day'|'sunset'|null
const previewWeather = ref(null)  // string: 'clear'|'partly'|'cloudy'|'rain'|'snow'|'storm'|null
const previewWind    = ref(null)  // number: 0|15|35|75|null
const simBirds       = ref(false)
const simAurora      = ref(false)
const simFog         = ref(false)
const hasPreview     = computed(() =>
  previewTod.value !== null || previewWeather.value !== null || previewWind.value !== null ||
  simBirds.value || simAurora.value || simFog.value
)
function resetSim() {
  previewTod.value = null; previewWeather.value = null; previewWind.value = null
  simBirds.value = false; simAurora.value = false; simFog.value = false
}

// ── Live local clock ───────────────────────────────────────────────────────
const clockNow = ref(Date.now())
let clockTimer = null
onMounted(() => { clockTimer = setInterval(() => { clockNow.value = Date.now() }, 1000) })

const localDateTime = computed(() => {
  const ms = clockNow.value + (props.utcOffset ?? 0) * 1000
  const d = new Date(ms)
  const days   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const day    = days[d.getUTCDay()]
  const month  = months[d.getUTCMonth()]
  const date   = d.getUTCDate()
  const h      = d.getUTCHours()
  const m      = String(d.getUTCMinutes()).padStart(2, '0')
  const timeStr = props.timeFormat === '24h'
    ? `${String(h).padStart(2, '0')}:${m}`
    : `${h % 12 || 12}:${m} ${h < 12 ? 'am' : 'pm'}`
  return `${day}, ${month} ${date} · ${timeStr}`
})

const fireworksPreview = ref(false)
let fwPreviewTimer = null
function triggerFireworksPreview() {
  if (fwPreviewTimer) clearTimeout(fwPreviewTimer)
  fireworksPreview.value = true
  fwPreviewTimer = setTimeout(() => { fireworksPreview.value = false }, 5000)
}

onBeforeUnmount(() => { clearTimeout(fwPreviewTimer); clearInterval(clockTimer) })

const shootingStarTrigger = ref(0)
function triggerShootingStar() { shootingStarTrigger.value++ }

const props = defineProps({
  data:         { type: Object, required: true },
  daily:        { type: Object, default: null },
  unitPrefs:    { type: Object, required: true },
  activeType:   { type: String, required: true },
  locationName: { type: String, default: '' },
  lat:           { type: Number,  default: 0 },
  utcOffset:     { type: Number,  default: 0 },
  showSim:       { type: Boolean, default: false },
  showFireworks: { type: Boolean, default: false },
  tileConfig:    { type: Array, default: null },
  updatedAt:    { type: String, default: '' },
  fetchedAt:    { type: Number, default: null },
  staleMs:      { type: Number, default: 0 },
  loading:      { type: Boolean, default: false },
  timeFormat:   { type: String, default: '12h' },
  blurred:      { type: Boolean, default: false },
})

const emit = defineEmits(['select', 'grass-color', 'open-locations', 'open-settings', 'refresh', 'open-data-types'])

watch(() => props.showSim, (val) => { if (val) simExpanded.value = true; else resetSim() })

const info      = computed(() => getWeatherInfo(props.data.weather_code))
const todayHigh    = computed(() => props.daily?.temperature_2m_max?.[0] ?? null)
const todayLow     = computed(() => props.daily?.temperature_2m_min?.[0] ?? null)
const todaySunrise = computed(() => props.daily?.sunrise?.[0] ?? null)
const todaySunset  = computed(() => props.daily?.sunset?.[0] ?? null)


const windArrowSvg = computed(() => {
  const c = '#06b6d4'
  const dir = props.data.wind_direction_10m
  if (dir == null) {
    return `<svg width="23" height="23" viewBox="0 0 20 20" fill="none" stroke="${c}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 7c2-2 4-2 6 0s4 2 8 0"/>
      <path d="M3 11c2-2 4-2 6 0s4 2 7 0"/>
      <path d="M3 15c2-2 4-2 5 0"/>
    </svg>`
  }
  const angle = (dir + 180) % 360
  return `<svg width="23" height="23" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="10" r="9.5" fill="rgba(15,23,42,0.75)" stroke="${c}" stroke-width="1.5"/>
    <g transform="rotate(${angle},10,10)">
      <line x1="10" y1="16" x2="10" y2="10" stroke="${c}" stroke-width="1.5" stroke-linecap="round"/>
      <polygon points="10,4 7,10 13,10" fill="${c}"/>
    </g>
  </svg>`
})
const tempUnit = computed(() => DATA_TYPES.temperature.getUnit(props.unitPrefs))

const uvLabel = computed(() => {
  const uv = props.data.uv_index
  if (uv == null) return ''
  if (uv < 3)  return ' Low'
  if (uv < 6)  return ' Moderate'
  if (uv < 8)  return ' High'
  if (uv < 11) return ' Very High'
  return ' Extreme'
})

const allTiles = computed(() => {
  const d = props.data
  const u = props.unitPrefs
  function tile(typeId, value, extra = {}) {
    const cfg = DATA_TYPES[typeId]
    return { type: cfg.id, icon: cfg.icon, label: cfg.label, color: cfg.color, value, ...extra }
  }
  return {
    rain:       tile('rain',       `${fmt(d.precipitation, 2)} ${DATA_TYPES.rain.getUnit(u)}${d.precipitation_probability != null ? ' · ' + d.precipitation_probability + '%' : ''}`, { iconHtml: TILE_ICONS.rain }),
    wind:       tile('wind',       `${fmt(d.wind_speed_10m, 1)} ${DATA_TYPES.wind.getUnit(u)}`, { iconHtml: windArrowSvg.value }),
    feelsLike:  tile('feelsLike',  `${fmt(d.apparent_temperature, 1)}${tempUnit.value}`,         { iconHtml: TILE_ICONS.feelsLike }),
    humidity:   tile('humidity',   `${fmt(d.relative_humidity_2m, 0)}%`,                         { iconHtml: TILE_ICONS.humidity }),
    uv:         tile('uv',         `${fmt(d.uv_index, 1)}${uvLabel.value}`,                      { iconHtml: TILE_ICONS.uv }),
    cloudCover: tile('cloudCover', `${fmt(d.cloud_cover, 0)}%`,                                  { iconHtml: TILE_ICONS.cloudCover }),
    pressure:   tile('pressure',   `${fmt(DATA_TYPES.pressure.scale(d.surface_pressure, u), DATA_TYPES.pressure.getDecimals(u))} ${DATA_TYPES.pressure.getUnit(u)}`, { iconHtml: TILE_ICONS.pressure }),
    visibility: tile('visibility', `${fmt(DATA_TYPES.visibility.scale(d.visibility, u), DATA_TYPES.visibility.decimals)} ${DATA_TYPES.visibility.getUnit(u)}`,       { iconHtml: TILE_ICONS.visibility }),
    radar:      tile('radar',      'Precipitation', { iconHtml: TILE_ICONS.radar }),
  }
})

const detailItems = computed(() => {
  if (!props.tileConfig) return Object.values(allTiles.value)
  return props.tileConfig
    .filter(t => t.enabled)
    .map(t => allTiles.value[t.type])
    .filter(Boolean)
})

function fmt(v, decimals) {
  if (v == null) return '–'
  return Number(v).toFixed(decimals)
}

</script>

<style scoped>
.conditions {
  position: relative;
  overflow: hidden;
  padding: 0;
}

.conditions > *:not(.scene-header) {
  transition: filter 0.25s ease;
}
.conditions.blurred > *:not(.scene-header) {
  filter: blur(4px);
}

/* ── Scene header (location name + nav buttons) ─────────────────────────── */
.scene-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 12px 14px;
  pointer-events: none;
}
.scene-header > * { pointer-events: all; }

.scene-location-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
  margin-right: 10px;
}

.scene-location {
  font-size: 1.35rem;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 6px rgba(0,0,0,0.55), 0 0 16px rgba(0,0,0,0.25);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

@media (max-width: 600px) {
  .scene-location {
    font-size: 1.1rem;
    padding-top: 3px;
  }
}

.scene-datetime {
  font-size: 0.78rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.75);
  text-shadow: 0 1px 4px rgba(0,0,0,0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: 0.01em;
}

.scene-btns {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.scene-btn {
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-radius: 9999px;
  width: 36px;
  height: 32px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}
.scene-btn:hover { background: rgba(0, 0, 0, 0.5); }

.cond-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 78px 18px 16px;
}



.cond-body {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
}

/* ── Shared selectable styles ───────────────────────────────────────────── */
.selectable {
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 12px;
  transition: background 0.18s, border-color 0.18s, transform 0.12s;
  background: none;
  font-family: inherit;
  text-align: left;
  color: inherit;
}

.selectable:hover:not(.active) {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.08);
  transform: translateY(-1px);
}

.selectable.active {
  background: color-mix(in srgb, var(--sel-color) 20%, transparent);
  border-color: color-mix(in srgb, var(--sel-color) 60%, transparent);
}


/* ── Main temp block ────────────────────────────────────────────────────── */
.cond-main {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(6px);
}

.weather-icon {
  font-size: 36px;
  line-height: 1;
  filter: drop-shadow(0 0 16px rgba(255,255,255,0.2));
}

.temp-block { display: flex; flex-direction: column; gap: 2px; }

.temperature {
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -1px;
  line-height: 1;
  color: #f1f5f9;
  text-shadow: 0 1px 8px rgba(0,0,0,0.6), 0 2px 20px rgba(0,0,0,0.4);
}
.unit {
  font-size: 1.5rem;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.72);
  margin-left: 3px;
  text-shadow: 0 1px 6px rgba(0,0,0,0.7);
}
.condition {
  font-size: 0.92rem;
  color: rgba(255, 255, 255, 0.72);
  text-shadow: 0 1px 6px rgba(0,0,0,0.7);
}

.hl-block {
  display: flex;
  flex-direction: row;
  gap: 8px;
}
.hl-item {
  font-size: 0.82rem;
  font-weight: 600;
  color: #e2e8f0;
  white-space: nowrap;
  text-shadow: 0 1px 6px rgba(0,0,0,0.7);
}
.hl-low { color: #cbd5e1; }
.hl-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: #cbd5e1;
  letter-spacing: 0.01em;
}

/* ── Detail grid ────────────────────────────────────────────────────────── */
.cond-details {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  grid-auto-rows: 68px;
  gap: 8px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(6px);
  overflow: hidden;
  box-sizing: border-box;
}

.detail-icon { font-size: 23px; flex-shrink: 0; display: flex; align-items: center; }
.detail-icon svg { width: 23px; height: 23px; }

.detail-label {
  font-size: 0.83rem;
  color: rgba(255, 255, 255, 0.72);
  letter-spacing: 0.01em;
  font-weight: 500;
  text-shadow: 0 1px 3px rgba(0,0,0,0.55), 0 2px 6px rgba(0,0,0,0.25);
}
.detail-value {
  font-size: 0.85rem;
  color: #f1f5f9;
  font-weight: 600;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Bottom-right action bar ────────────────────────────────────────────── */
.bottom-bar {
  position: absolute;
  bottom: 28px;
  right: 10px;
  z-index: 3;
  display: flex;
  align-items: flex-end;
  gap: 6px;
  pointer-events: all;
}

.bottom-btn {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  border-radius: 6px;
  width: 30px;
  height: 30px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  flex-shrink: 0;
}
.bottom-btn:hover {
  background: rgba(8, 14, 30, 0.75);
  border-color: rgba(255, 255, 255, 0.4);
}

/* ── Sim controls ───────────────────────────────────────────────────────── */
.sim-bar {
  position: relative;
  pointer-events: all;
}

.sim-panel {
  position: absolute;
  bottom: calc(100% + 6px);
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  background: rgba(8, 14, 30, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  padding: 7px 8px;
  backdrop-filter: blur(8px);
  white-space: nowrap;
}

.sim-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 8px;
  padding-bottom: 3px;
}

.sim-title {
  font-size: 0.65rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 1.00);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.sim-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.sim-row-label {
  font-size: 0.62rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  width: 46px;
  flex-shrink: 0;
  margin-right: 4px;
}

.sim-btn {
  width: 28px;
  height: 28px;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, border-color 0.15s;
  padding: 0;
  line-height: 1;
}
.sim-btn:hover {
  background: rgba(30, 50, 90, 0.85);
  border-color: rgba(255,255,255,0.4);
}
.sim-btn.active {
  background: rgba(255, 255, 255, 0.92);
  border-color: rgba(255, 255, 255, 0.95);
  box-shadow: 0 0 8px 2px rgba(255, 255, 255, 0.35);
}

.sim-reset {
  font-size: 0.72rem;
  color: #93c5fd;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(147, 197, 253, 0.35);
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  white-space: nowrap;
}
.sim-reset:hover {
  background: rgba(56, 130, 246, 0.3);
  border-color: rgba(147, 197, 253, 0.6);
}

.sim-toggle {
  font-size: 0.92rem;
  color: rgba(255,255,255,0.7);
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 6px;
  width: 30px;
  height: 30px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  backdrop-filter: blur(6px);
  transition: background 0.15s, border-color 0.15s;
  line-height: 1;
}
.sim-toggle:hover,
.sim-toggle.sim-open {
  background: rgba(8, 14, 30, 0.75);
  border-color: rgba(255,255,255,0.4);
}
.sim-toggle.sim-active {
  border-color: rgba(255, 210, 80, 0.9);
  animation: sim-pulse 2s ease-in-out infinite;
}
@keyframes sim-pulse {
  0%, 100% { box-shadow: 0 0 4px 1px rgba(255, 210, 80, 0.25); border-color: rgba(255, 210, 80, 0.5); }
  50%       { box-shadow: 0 0 8px 3px rgba(255, 210, 80, 0.55); border-color: rgba(255, 210, 80, 1.0); }
}

/* ── Scene footer (desktop only) ───────────────────────────────────────── */
.scene-footer {
  display: none;
  position: absolute;
  bottom: 10px;
  left: 14px;
  z-index: 2;
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.55);
  text-shadow: 0 1px 4px rgba(0,0,0,0.5);
  pointer-events: none;
}
.scene-footer > * { pointer-events: all; }
.scene-footer a {
  color: rgba(255, 255, 255, 0.55);
  text-decoration: none;
}
.scene-footer a:hover { color: rgba(255, 255, 255, 0.85); }
.scene-footer-countdown { font-variant-numeric: tabular-nums; }
.scene-footer-refresh {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.55);
  font-size: 0.95rem;
  padding: 0 0 0 6px;
  cursor: pointer;
  line-height: 1;
  transition: color 0.15s;
}
.scene-footer-refresh:hover:not(:disabled) { color: rgba(255, 255, 255, 0.9); }
.scene-footer-refresh:disabled { cursor: default; }

/* ── Grass bar ─────────────────────────────────────────────────────────── */

@media (orientation: landscape) and (max-height: 900px) and (max-width: 1366px) {
  .cond-content {
    padding: 72px 12px 40px;
    gap: 8px;
  }
  .cond-body {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 5px;
  }
  .cond-main {
    padding: 4px 6px;
    gap: 3px;
  }
  .weather-icon { font-size: 30px; }
  .temperature  { font-size: 1.7rem; }
  .unit         { font-size: 1rem; }
  .condition    { font-size: 0.82rem; }
  .cond-details {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    grid-auto-rows: 46px;
    gap: 5px;
  }
  .detail-item {
    padding: 2px 6px;
    gap: 7px;
  }
  .detail-icon { font-size: 17px; }
  .detail-label { font-size: 0.76rem; }
  .detail-value { font-size: 0.78rem; }
}

@media (min-width: 640px) and (max-width: 1499px) {
  .cond-content {
    padding-bottom: 36px;
  }
}

@media (min-width: 1500px),
       (orientation: landscape) and (max-height: 900px) and (max-width: 1366px) {
  .scene-footer { display: block; }
}

@media (max-width: 999px) {
  .conditions {
    min-height: 410px;
  }
}

@media (max-width: 639px) {
  .cond-content {
    padding: 78px 12px 40px;
    gap: 8px;
  }
  .cond-body {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 5px;
  }
  .cond-main {
    padding: 4px 6px;
    gap: 3px;
  }
  .weather-icon { font-size: 30px; }
  .temperature  { font-size: 1.7rem; }
  .unit         { font-size: 1rem; }
  .condition    { font-size: 0.82rem; }
  .cond-details {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    grid-auto-rows: 54px;
    gap: 5px;
  }
  .detail-item {
    padding: 4px 6px;
    gap: 7px;
  }
  .detail-icon { font-size: 17px; }
  .detail-label { font-size: 0.76rem; }
  .detail-value { font-size: 0.78rem; }
}
</style>
