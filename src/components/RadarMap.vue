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
        <div class="radar-picker-title">Multiple warnings — tap to view</div>
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
      Map ©<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors<br/>
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

const SEVERITY_ORDER = { extreme: 3, severe: 2, moderate: 1, minor: 0 }
const COLOUR_CODE_ORDER = { red: 3, orange: 2, yellow: 1 }

function severityRank(alert) {
  const bySeverity = SEVERITY_ORDER[(alert.severity ?? '').toLowerCase()]
  if (bySeverity != null) return bySeverity
  return COLOUR_CODE_ORDER[(alert.colourCode ?? '').toLowerCase()] ?? -1
}

function sortedByPriority(alerts) {
  return [...alerts].sort((a, b) => severityRank(a) - severityRank(b))
}

function alertColor(alert) {
  return alert.colourHex ?? SEVERITY_COLORS[(alert.severity ?? '').toLowerCase()] ?? '#546e7a'
}

function getWarningIconType(alert) {
  const searchText = `${alert.event || ''} ${alert.headline || ''}`.toLowerCase()
  if (searchText.includes('wind')) return 'wind'
  if (searchText.includes('rain') || searchText.includes('heavy rain') || searchText.includes('rainfall')) return 'rain'
  return null
}

function getIconColor(alert) {
  const color = alertColor(alert)
  if (!color || !color.startsWith('#')) return '#fff'
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)
  return (r * 0.299 + g * 0.587 + b * 0.114) > 186 ? '#000' : '#fff'
}

function calculatePolygonCentroid(polygon) {
  // Calculate the centroid by averaging all polygon coordinates
  let lat = 0, lng = 0
  for (const [pLat, pLng] of polygon) {
    lat += pLat
    lng += pLng
  }
  return [lat / polygon.length, lng / polygon.length]
}

function getIconPositionForAlert(alert, allAlerts, existingPositions) {
  // Find the largest polygon for this alert
  let largestPolygon = null
  let largestSize = 0

  for (const area of alert.areas) {
    for (const polygon of area.polygons) {
      if (polygon.length > largestSize) {
        largestSize = polygon.length
        largestPolygon = polygon
      }
    }
  }

  if (!largestPolygon) return null

  let position = calculatePolygonCentroid(largestPolygon)

  // If too close to another icon, offset outward
  const OFFSET_THRESHOLD = 0.02 // ~2km in degrees
  const OFFSET_AMOUNT = 0.015

  for (const existing of existingPositions) {
    const dist = Math.hypot(position[0] - existing[0], position[1] - existing[1])
    if (dist < OFFSET_THRESHOLD) {
      // Offset in the direction away from the existing position
      const angle = Math.atan2(position[0] - existing[0], position[1] - existing[1])
      position = [
        position[0] + Math.sin(angle) * OFFSET_AMOUNT,
        position[1] + Math.cos(angle) * OFFSET_AMOUNT
      ]
    }
  }

  return position
}

function createWarningIcon(alert) {
  const iconType = getWarningIconType(alert)
  if (!iconType) return null

  const color = alertColor(alert)
  const iconColor = getIconColor(alert)

  // Calculate z-index based on severity (higher = more severe = higher z-index)
  const rank = severityRank(alert)
  const zIndex = 1000 + (rank * 100)

  let svgPath
  if (iconType === 'wind') {
    svgPath = `
      <svg width="28" height="28" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 6px rgba(0,0,0,0.4))">
        <circle cx="10" cy="10" r="9" fill="${color}" stroke="white" stroke-width="1.2" stroke-linejoin="round"/>
        <g transform="translate(10, 10) scale(0.55)">
          <path d="M-5 -3c2-2 4-2 6 0s4 2 8 0" stroke="${iconColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <path d="M-5 1c2-2 4-2 6 0s4 2 7 0" stroke="${iconColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <path d="M-5 5c2-2 4-2 5 0" stroke="${iconColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        </g>
      </svg>
    `
  } else if (iconType === 'rain') {
    svgPath = `
      <svg width="28" height="28" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 6px rgba(0,0,0,0.4))">
        <circle cx="10" cy="10" r="9" fill="${color}" stroke="white" stroke-width="1.2" stroke-linejoin="round"/>
        <g transform="translate(10, 10) scale(0.55)">
          <path d="M-5 3a4 4 0 0 1 .4-8A5.5 5.5 0 0 1 5.6 -2H6a2.5 2.5 0 0 1 0 5" stroke="${iconColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <line x1="-2" y1="5.5" x2="-3" y2="8" stroke="${iconColor}" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="2" y1="5.5" x2="1" y2="8" stroke="${iconColor}" stroke-width="1.5" stroke-linecap="round"/>
        </g>
      </svg>
    `
  }

  const html = `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;margin:-14px 0 0 -14px;z-index:${zIndex};">${svgPath}</div>`

  return L.divIcon({
    html,
    className: 'radar-warning-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
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

  const sortedAlerts = sortedByPriority(props.alerts)
  const existingPositions = []

  for (const alert of sortedAlerts) {
    const color = alertColor(alert)
    const iconType = getWarningIconType(alert)

    // Render all polygons
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

    // Add icon marker if it's a wind/rain alert
    if (iconType) {
      const position = getIconPositionForAlert(alert, sortedAlerts, existingPositions)
      if (position) {
        const icon = createWarningIcon(alert)
        const marker = L.marker(position, { icon }).addTo(map)
        warningLayers.push(marker)
        existingPositions.push(position)
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
  pickerAlerts.value = sortedByPriority(hits).reverse()
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
  // Lock/unlock body scroll; toggle class for top-bar suppression
  document.body.style.overflow = isExpanded.value ? 'hidden' : ''
  document.body.classList.toggle('radar-fullscreen', isExpanded.value)
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
  document.body.classList.remove('radar-fullscreen')
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
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
  text-transform: uppercase;
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

.radar-picker-title {
  padding: 5px 10px 3px;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-muted, #64748b);
  white-space: nowrap;
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  /* Restore background when expanded in flat style (card bg is transparent in flat mode) */
  background: var(--panel-bg) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

@keyframes radar-expand {
  from { opacity: 0.6; transform: scale(0.97); }
  to   { opacity: 1;   transform: scale(1); }
}

.radar-expanded .radar-map {
  flex: 1;
  height: auto;
}

.radar-warning-icon {
  filter: drop-shadow(0 2px 6px rgba(0,0,0,0.4));
}

.radar-warning-icon svg {
  filter: drop-shadow(0 0 0 2px white);
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
