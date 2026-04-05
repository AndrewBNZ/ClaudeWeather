<template>
  <div class="radar-card card" :class="{ 'radar-expanded': isExpanded }">
    <div class="radar-header">
      <span class="radar-title">Radar</span>
      <span v-if="dataTime" class="radar-subtitle">Updated {{ dataTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: props.timeFormat === '12h' }).toLowerCase() }}</span>
      <div class="radar-controls">
        <button class="zoom-btn" @click="zoomIn" title="Zoom in">+</button>
        <button class="zoom-btn" @click="zoomOut" title="Zoom out">−</button>
        <button class="zoom-btn expand-btn" @click="toggleExpand" :title="isExpanded ? 'Collapse' : 'Expand'">
          <svg v-if="!isExpanded" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
            <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/>
            <line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/>
          </svg>
        </button>
      </div>
    </div>
    <div ref="mapEl" class="radar-map">
      <transition name="fade">
        <div v-if="isLoading" class="radar-loading">
          <div class="radar-spinner"></div>
        </div>
      </transition>
      <!-- Multi-alert picker -->
      <div
        v-if="pickerAlerts.length"
        class="radar-picker"
        :class="{ 'radar-picker--below': pickerPos.flipped }"
        :style="{ left: pickerPos.x + 'px', top: pickerPos.y + 'px' }"
      >
        <button
          v-for="alert in pickerAlerts"
          :key="alert.id"
          class="radar-picker-item"
          :style="{ '--alert-color': alertColor(alert) }"
          @click.stop="openFromPicker(alert)"
        >
          <span class="radar-picker-dot"></span>
          {{ alert.headline || alert.event }}
        </button>
      </div>
    </div>
    <div class="radar-legend">
      <div class="legend-bar"></div>
      <div class="legend-labels">
        <span>0</span>
        <span>0.1</span>
        <span>0.5</span>
        <span>1</span>
        <span>5</span>
        <span>10</span>
        <span>20+ mm/h</span>
      </div>
    </div>
    <div class="radar-footer">
      Map ©<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors ·
      Precipitation © <a href="https://openweathermap.org" target="_blank" rel="noopener">OpenWeatherMap</a>
    </div>
  </div>

  <!-- Warning detail modal -->
  <Teleport to="body">
    <Transition name="ww-modal">
      <WeatherWarningModal
        v-if="selectedAlert"
        :alert="selectedAlert"
        :lat="props.lat"
        :lng="props.lng"
        @close="selectedAlert = null"
      />
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import WeatherWarningModal from '../cards/WeatherWarningModal.vue'
import { isPointInPolygon } from '../services/capAlerts.js'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  lat:        { type: Number, required: true },
  lng:        { type: Number, required: true },
  theme:      { type: String, default: 'dark' },
  timeFormat: { type: String, default: '12h' },
  alerts:     { type: Array,  default: () => [] },
})

const OWM_KEY = import.meta.env.VITE_OWM_KEY

const REFRESH_MS = 10 * 60 * 1000 // 10 minutes, matching OWM update cadence

const mapEl         = ref(null)
const dataTime      = ref(null)
const isLoading     = ref(false)
const isExpanded    = ref(false)
const selectedAlert = ref(null)
const pickerAlerts  = ref([])
const pickerPos     = ref({ x: 0, y: 0 })

let map = null
let tileBase = null
let tilePrecip = null
let marker = null
let refreshTimer = null
let warningLayers = []

const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
const TILE_DARK  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

const SEVERITY_COLORS = {
  extreme:  '#d32f2f',
  severe:   '#e65100',
  moderate: '#f9a825',
  minor:    '#1565c0',
}

function alertColor(alert) {
  return alert.colourHex ?? SEVERITY_COLORS[(alert.severity ?? '').toLowerCase()] ?? '#546e7a'
}

function buildMap() {
  if (map) return

  map = L.map(mapEl.value, {
    center: [props.lat, props.lng],
    zoom: 7,
    zoomControl: false,
    attributionControl: false,
  })

  tileBase = L.tileLayer(props.theme === 'dark' ? TILE_DARK : TILE_LIGHT, {
    maxZoom: 18,
  }).addTo(map)

  isLoading.value = true
  tilePrecip = L.tileLayer(precipUrl(), {
    maxZoom: 10,
    opacity: 0.7,
    updateWhenIdle: true,
    updateWhenZooming: false,
    keepBuffer: 0,
  }).addTo(map)
  tilePrecip.on('loading', () => { isLoading.value = true })
  tilePrecip.on('load',    () => { isLoading.value = false })

  marker = L.circleMarker([props.lat, props.lng], {
    radius: 7,
    color: '#ffffff',
    fillColor: '#10b981',
    fillOpacity: 1,
    weight: 2,
  }).addTo(map)

  map.on('movestart', () => { pickerAlerts.value = [] })

  renderWarnings()
}

function renderWarnings() {
  if (!map) return

  warningLayers.forEach(l => l.remove())
  warningLayers = []
  map.off('click', onMapClick)

  for (const alert of props.alerts) {
    const color = alertColor(alert)
    for (const area of alert.areas) {
      for (const polygon of area.polygons) {
        if (polygon.length < 3) continue
        const layer = L.polygon(polygon, {
          color,
          fillColor: color,
          fillOpacity: 0.2,
          weight: 2,
        })
        layer.addTo(map)
        warningLayers.push(layer)
      }
    }
  }

  if (props.alerts.length) map.on('click', onMapClick)
}

function onMapClick(e) {
  pickerAlerts.value = []

  const { lat, lng } = e.latlng
  const hits = props.alerts.filter(alert =>
    alert.areas.some(area =>
      area.polygons.some(poly => isPointInPolygon(lat, lng, poly))
    )
  )

  if (hits.length === 0) return
  if (hits.length === 1) { selectedAlert.value = hits[0]; return }

  // Multiple overlapping alerts — show picker near the click, clamped inside the map
  const point = map.latLngToContainerPoint(e.latlng)
  const mapSize = map.getSize()
  const PICKER_W = 260
  const x = Math.min(Math.max(point.x, PICKER_W / 2), mapSize.x - PICKER_W / 2)
  // Prefer above click; flip below if too close to top
  const y = point.y > 120 ? point.y : point.y + 10
  pickerPos.value = { x, y, flipped: point.y <= 120 }
  pickerAlerts.value = hits
}

function openFromPicker(alert) {
  pickerAlerts.value = []
  selectedAlert.value = alert
}

function precipUrl() {
  const bucket = Math.floor(Date.now() / REFRESH_MS)
  dataTime.value = new Date(bucket * REFRESH_MS)
  return `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${OWM_KEY}&_=${bucket}`
}

function refreshPrecip() {
  isLoading.value = true
  tilePrecip?.setUrl(precipUrl())
}

function zoomIn()  { map?.zoomIn() }
function zoomOut() { map?.zoomOut() }

async function toggleExpand() {
  isExpanded.value = !isExpanded.value
  // Lock/unlock body scroll
  document.body.style.overflow = isExpanded.value ? 'hidden' : ''
  await nextTick()
  map?.invalidateSize()
}

watch(() => props.theme, (t) => {
  if (!tileBase) return
  tileBase.setUrl(t === 'dark' ? TILE_DARK : TILE_LIGHT)
})

watch(() => [props.lat, props.lng], ([lat, lng]) => {
  if (!map) return
  map.setView([lat, lng])
  marker?.setLatLng([lat, lng])
})

watch(() => props.alerts, () => {
  renderWarnings()
}, { deep: true })

onMounted(() => {
  setTimeout(buildMap, 50)
  refreshTimer = setInterval(refreshPrecip, REFRESH_MS)
})

onUnmounted(() => {
  clearInterval(refreshTimer)
  document.body.style.overflow = ''
  map?.remove()
  map = null
})
</script>

<style scoped>
.radar-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.radar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  flex-shrink: 0;
}

.radar-subtitle {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted, #64748b);
  margin-left: auto;
}

.radar-title {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
}

.title-icon {
  display: flex;
  align-items: center;
}

.radar-controls {
  display: flex;
  gap: 4px;
  margin-left: 8px;
}

.zoom-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--btn-border);
  background: var(--btn-bg);
  color: var(--text);
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s;
}

.zoom-btn:hover {
  background: var(--btn-hover);
}

.expand-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.expand-btn svg {
  width: 14px;
  height: 14px;
}

.radar-map {
  height: 380px;
  position: relative;
}

.radar-picker {
  position: absolute;
  z-index: 1100;
  background: var(--panel-bg, #1e2130);
  border: 1px solid var(--panel-border, rgba(255,255,255,0.1));
  border-radius: 10px;
  padding: 4px;
  min-width: 180px;
  max-width: 260px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.4);
  transform: translate(-50%, calc(-100% - 10px));
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
}

.radar-picker--below {
  transform: translate(-50%, 10px);
}

.radar-picker-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border: none;
  background: none;
  color: var(--text);
  font-size: 0.8rem;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  border-radius: 7px;
  line-height: 1.3;
  transition: background 0.12s;
}

.radar-picker-item:hover {
  background: var(--btn-hover, rgba(255,255,255,0.08));
}

.radar-picker-dot {
  flex-shrink: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--alert-color, #546e7a);
}

.radar-loading {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1000;
  background: var(--card-bg, rgba(15,23,42,0.75));
  border-radius: 6px;
  padding: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.radar-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.2);
  border-top-color: #10b981;
  border-radius: 50%;
  animation: radar-spin 0.7s linear infinite;
}

@keyframes radar-spin {
  to { transform: rotate(360deg); }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.radar-map :deep(.leaflet-tile-pane img) {
  margin-bottom: -1px;
  margin-right: -1px;
}

.radar-legend {
  flex-shrink: 0;
  padding: 6px 14px 4px;
}

.legend-bar {
  height: 8px;
  border-radius: 4px;
  background: linear-gradient(to right,
    transparent 0%,
    #9ecae1 8%,
    #4393c3 22%,
    #2166ac 38%,
    #08519c 54%,
    #6a0dad 72%,
    #ae017e 88%,
    #dd3497 100%
  );
  opacity: 0.85;
}

.legend-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 3px;
  font-size: 0.65rem;
  color: var(--text-muted, #64748b);
}

.radar-footer {
  flex-shrink: 0;
  padding: 4px 14px 6px;
  font-size: 0.7rem;
  color: var(--text-muted, #64748b);
}

.radar-footer a {
  color: inherit;
  text-decoration: underline;
}

.radar-expanded {
  position: fixed !important;
  inset: 0;
  z-index: 9999;
  border-radius: 0 !important;
  margin: 0 !important;
  animation: radar-expand 0.2s ease;
}

@keyframes radar-expand {
  from { opacity: 0.6; transform: scale(0.97); }
  to   { opacity: 1;   transform: scale(1); }
}

.radar-expanded .radar-map {
  flex: 1;
  height: auto;
}

/* Warning modal transition — matches WeatherWarningModal pattern */
.ww-modal-enter-active,
.ww-modal-leave-active {
  transition: opacity 0.22s ease;
}
.ww-modal-enter-from,
.ww-modal-leave-to {
  opacity: 0;
}
.ww-modal-enter-active :deep(.ww-modal),
.ww-modal-leave-active :deep(.ww-modal) {
  transition: transform 0.22s cubic-bezier(0.32, 0.72, 0, 1);
}
.ww-modal-enter-from :deep(.ww-modal),
.ww-modal-leave-to :deep(.ww-modal) {
  transform: translateY(100%);
}
</style>
