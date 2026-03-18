<template>
  <div class="radar-card card">
    <div class="radar-header">
      <span class="radar-title"><span class="title-icon" v-html="TILE_ICONS.radar"></span> Precipitation Radar</span>
      <span v-if="dataTime" class="radar-subtitle">Updated {{ dataTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: props.timeFormat === '12h' }).toLowerCase() }}</span>
      <div class="radar-controls">
        <button class="zoom-btn" @click="zoomIn" title="Zoom in">+</button>
        <button class="zoom-btn" @click="zoomOut" title="Zoom out">−</button>
      </div>
    </div>
    <div ref="mapEl" class="radar-map" />
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
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { TILE_ICONS } from '../utils/tileIcons.js'

const props = defineProps({
  lat:        { type: Number, required: true },
  lng:        { type: Number, required: true },
  theme:      { type: String, default: 'dark' },
  timeFormat: { type: String, default: '12h' },
})

const OWM_KEY = import.meta.env.VITE_OWM_KEY

const REFRESH_MS = 10 * 60 * 1000 // 10 minutes, matching OWM update cadence

const mapEl = ref(null)
const dataTime = ref(null)
let map = null
let tileBase = null
let tilePrecip = null
let marker = null
let refreshTimer = null

const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
const TILE_DARK  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

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

  tilePrecip = L.tileLayer(precipUrl(), {
    maxZoom: 10,
    opacity: 0.7,
    updateWhenIdle: true,
    updateWhenZooming: false,
    keepBuffer: 0,
  }).addTo(map)

  marker = L.circleMarker([props.lat, props.lng], {
    radius: 7,
    color: '#ffffff',
    fillColor: '#10b981',
    fillOpacity: 1,
    weight: 2,
  }).addTo(map)
}

function precipUrl() {
  const bucket = Math.floor(Date.now() / REFRESH_MS)
  dataTime.value = new Date(bucket * REFRESH_MS)
  return `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${OWM_KEY}&_=${bucket}`
}

function refreshPrecip() {
  tilePrecip?.setUrl(precipUrl())
}

function zoomIn()  { map?.zoomIn() }
function zoomOut() { map?.zoomOut() }

watch(() => props.theme, (t) => {
  if (!tileBase) return
  tileBase.setUrl(t === 'dark' ? TILE_DARK : TILE_LIGHT)
})

watch(() => [props.lat, props.lng], ([lat, lng]) => {
  if (!map) return
  map.setView([lat, lng])
  marker?.setLatLng([lat, lng])
})

onMounted(() => {
  setTimeout(buildMap, 50)
  refreshTimer = setInterval(refreshPrecip, REFRESH_MS)
})

onUnmounted(() => {
  clearInterval(refreshTimer)
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
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-muted, #64748b);
  margin-left: auto;
}

.radar-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
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

.radar-map {
  height: 380px;
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
</style>
