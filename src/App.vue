<template>
  <div class="app-shell">
    <header class="header">
      <div class="header-left">
        <span class="app-name">{{ locationName || 'ClaudeWeather' }}</span>
      </div>
      <div class="header-right">
        <button class="locations-btn" @click="panelOpen = true" title="Saved locations">
          ☰
          <span v-if="savedLocations.length" class="loc-count">{{ savedLocations.length }}</span>
        </button>
        <button class="settings-btn" @click="settingsOpen = true" title="Settings">⚙️</button>
      </div>
    </header>

    <main class="main">
      <!-- Empty state — no location selected yet -->
      <div v-if="!location && !loading" class="empty-state">
        <div class="empty-icon">🌍</div>
        <p class="empty-title">Where in the world are you?</p>
        <p class="empty-sub">Search for a city or allow location access to get started.</p>
        <button class="add-location-btn" @click="panelOpen = true">+ Add a location</button>
      </div>

      <!-- Loading -->
      <div v-else-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Fetching weather…</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="error-card card">
        <span class="error-icon">⚠️</span>
        <p>{{ error }}</p>
        <button class="retry-btn" @click="loadWeather">Try again</button>
      </div>

      <!-- Main content -->
      <template v-else-if="weatherData">
        <div class="weather-layout">
          <aside class="layout-left">
            <CurrentConditions
              :data="weatherData.current"
              :daily="weatherData.daily"
              :units="units"
              :active-type="activeDataType"
              :location-name="locationName"
              :show-sim="showSim"
              :tile-config="tileConfig"
              @select="activeDataType = $event"
            />
          </aside>
          <div class="layout-right">
            <div class="layout-chart">
              <HourlyChart
                :hourly="weatherData.hourly"
                :active-type="activeDataType"
                :units="units"
                :day-index="selectedDay"
                @select-day="selectedDay = $event"
              />
            </div>
            <div class="layout-chart">
              <DailyChart
                :daily="weatherData.daily"
                :hourly="weatherData.hourly"
                :active-type="activeDataType"
                :units="units"
                :selected-day="selectedDay"
                @day-selected="selectedDay = $event"
              />
            </div>
          </div>
        </div>

        <footer class="data-footer">
          Data from <a href="https://open-meteo.com" target="_blank" rel="noopener">Open-Meteo</a>
          · Updated {{ updatedAt }}
          <button class="refresh-btn" @click="loadWeather" :disabled="loading" title="Refresh data">
            <span :class="{ spinning: loading }">↻</span>
          </button>
        </footer>
      </template>
    </main>

    <!-- Settings panel -->
    <transition name="panel-slide">
      <div v-if="settingsOpen" class="panel-overlay" @click.self="settingsOpen = false">
        <div class="settings-panel">
          <div class="panel-header">
            <span class="panel-title">Settings</span>
            <button class="panel-close" @click="settingsOpen = false">✕</button>
          </div>
          <div class="settings-body">
            <div class="setting-row">
              <span class="setting-label">Units</span>
              <div class="unit-pill">
                <button :class="['unit-pill-opt', { active: units === 'metric' }]"    @click="units = 'metric'">Metric</button>
                <button :class="['unit-pill-opt', { active: units === 'imperial' }]"  @click="units = 'imperial'">Imperial</button>
              </div>
            </div>
            <div class="setting-row">
              <div>
                <div class="setting-label">Simulate Conditions</div>
                <div class="setting-hint">Preview weather effects on the scene</div>
              </div>
              <button class="toggle-switch" :class="{ on: showSim }" @click="showSim = !showSim">
                <span class="toggle-thumb" />
              </button>
            </div>

            <div class="setting-section">
              <div class="setting-row" style="padding-bottom: 4px">
                <div>
                  <div class="setting-label">Data Types</div>
                  <div class="setting-hint">Drag to reorder · tap to show/hide</div>
                </div>
              </div>
              <div class="tile-list">
                <div
                  v-for="(tile, i) in tileConfig"
                  :key="tile.type"
                  :data-tile-idx="i"
                  class="tile-row"
                  :class="{ 'tile-dragging': tileDragIndex === i, 'tile-drag-over': tileDragOver === i && tileDragIndex !== i }"
                  draggable="true"
                  @dragstart="onTileDragStart($event, i)"
                  @dragover="onTileDragOver($event, i)"
                  @dragend="onTileDragEnd"
                  @drop="onTileDrop($event, i)"
                  @touchstart.passive="onTileTouchStart($event, i)"
                  @touchmove="onTileTouchMove"
                  @touchend="onTileTouchEnd"
                >
                  <span class="tile-drag-handle">⠿</span>
                  <span class="tile-icon-label">{{ TILE_META[tile.type].icon }} {{ TILE_META[tile.type].label }}</span>
                  <button class="toggle-switch" :class="{ on: tile.enabled }" @click.stop="toggleTile(i)">
                    <span class="toggle-thumb" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <LocationsPanel
      :locations="savedLocations"
      :active-location="location"
      :is-open="panelOpen"
      @select="onPanelSelect"
      @delete="onPanelDelete"
      @close="panelOpen = false"
      @location-selected="onLocationSelected"
      @geo-locate="onGeoLocate"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import CurrentConditions from './components/CurrentConditions.vue'
import HourlyChart       from './components/HourlyChart.vue'
import DailyChart        from './components/DailyChart.vue'
import LocationsPanel    from './components/LocationsPanel.vue'
import { fetchWeather }        from './services/weatherApi.js'
import { reverseGeocode }      from './services/geocoding.js'

// ── Persistence ───────────────────────────────────────────────────────────────
const LOCATIONS_KEY  = 'claudeweather-locations'
const ACTIVE_KEY     = 'claudeweather-active'
const DATATYPE_KEY   = 'claudeweather-datatype'
const UNITS_KEY      = 'claudeweather-units'
const SIM_KEY        = 'claudeweather-sim'
const TILES_KEY      = 'claudeweather-tiles'
const LEGACY_KEY     = 'claudeweather-location'

// ── Tile configuration ────────────────────────────────────────────────────────
const TILE_META = {
  rain:        { icon: '🌧️', label: 'Rain' },
  wind:        { icon: '💨', label: 'Wind' },
  feelsLike:   { icon: '🤔', label: 'Feels Like' },
  humidity:    { icon: '💧', label: 'Humidity' },
  uv:          { icon: '☀️', label: 'UV Index' },
  cloudCover:  { icon: '☁️', label: 'Cloud Cover' },
  pressure:    { icon: '↕️', label: 'Pressure' },
  visibility:  { icon: '👁️', label: 'Visibility' },
}
const DEFAULT_TILES = [
  { type: 'rain',        enabled: true },
  { type: 'wind',        enabled: true },
  { type: 'feelsLike',   enabled: true },
  { type: 'humidity',    enabled: true },
  { type: 'uv',          enabled: true },
  { type: 'cloudCover',  enabled: true },
  { type: 'pressure',    enabled: true },
  { type: 'visibility',  enabled: true },
]
function loadTileConfig() {
  try {
    const raw = JSON.parse(localStorage.getItem(TILES_KEY))
    if (Array.isArray(raw) && raw.every(t => t.type)) {
      const known = new Set(Object.keys(TILE_META))
      const valid = raw.filter(t => known.has(t.type))
      const seen  = new Set(valid.map(t => t.type))
      for (const d of DEFAULT_TILES) { if (!seen.has(d.type)) valid.push({ ...d }) }
      return valid
    }
  } catch {}
  return DEFAULT_TILES.map(t => ({ ...t }))
}

function persistLocations(arr) {
  try { localStorage.setItem(LOCATIONS_KEY, JSON.stringify(arr)) } catch {}
}

function persistActive(loc) {
  try { localStorage.setItem(ACTIVE_KEY, JSON.stringify({ lat: loc.lat, lon: loc.lon })) } catch {}
}

function loadActiveKey() {
  try { return JSON.parse(localStorage.getItem(ACTIVE_KEY)) } catch { return null }
}

function loadSavedLocations() {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCATIONS_KEY))
    if (Array.isArray(raw)) return raw
  } catch {}
  // Migrate from legacy single-location key
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY))
    if (legacy?.lat != null) {
      const arr = [{ lat: legacy.lat, lon: legacy.lon, name: legacy.name ?? '' }]
      persistLocations(arr)
      return arr
    }
  } catch {}
  return []
}

// ── State ────────────────────────────────────────────────────────────────────
const tileConfig     = ref(loadTileConfig())
const savedLocations = ref(loadSavedLocations())
const panelOpen      = ref(false)
const settingsOpen   = ref(false)
const showSim        = ref(localStorage.getItem(SIM_KEY) === 'true')
const location       = ref(null)   // { lat, lon }
const units          = ref(localStorage.getItem(UNITS_KEY) ?? 'metric')
const activeDataType = ref(localStorage.getItem(DATATYPE_KEY) ?? 'temperature')
const selectedDay    = ref(0)      // 0 = today, 1–6 = forecast days
const weatherData    = ref(null)
const loading        = ref(false)
const error          = ref(null)
const updatedAt      = ref('')
const locationName   = ref('')
const fetchedAt      = ref(null)   // Date of last successful fetch

// ── Helpers ───────────────────────────────────────────────────────────────────
const STALE_MS = 15 * 60 * 1000  // 15 minutes

function isStale() {
  if (!fetchedAt.value || !weatherData.value) return true
  const now = new Date()
  if (now - fetchedAt.value > STALE_MS) return true
  if (now.toDateString() !== fetchedAt.value.toDateString()) return true
  return false
}

function checkAndRefresh() {
  if (location.value && isStale()) loadWeather()
}

function addToSaved(lat, lon, name) {
  const already = savedLocations.value.some(l => l.lat === lat && l.lon === lon)
  if (!already) {
    savedLocations.value = [...savedLocations.value, { lat, lon, name }]
    persistLocations(savedLocations.value)
  }
}

// ── Actions ───────────────────────────────────────────────────────────────────
function onLocationSelected({ lat, lon, name }) {
  location.value     = { lat, lon }
  locationName.value = name
  persistActive({ lat, lon })
  addToSaved(lat, lon, name)
}

async function onGeoLocate({ lat, lon }) {
  location.value     = { lat, lon }
  locationName.value = 'Locating…'
  try {
    const name = await reverseGeocode(lat, lon)
    locationName.value = name
    persistActive({ lat, lon })
    addToSaved(lat, lon, name)
  } catch {
    locationName.value = `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`
    persistActive({ lat, lon })
    addToSaved(lat, lon, locationName.value)
  }
  panelOpen.value = false
}

function onPanelSelect(loc) {
  location.value     = { lat: loc.lat, lon: loc.lon }
  locationName.value = loc.name
  persistActive(loc)
  panelOpen.value    = false
}

function onPanelDelete(loc) {
  savedLocations.value = savedLocations.value.filter(
    l => !(l.lat === loc.lat && l.lon === loc.lon)
  )
  persistLocations(savedLocations.value)
  // If deleting the active location, switch to first remaining or clear
  if (location.value?.lat === loc.lat && location.value?.lon === loc.lon) {
    const next = savedLocations.value[0] ?? null
    location.value     = next ? { lat: next.lat, lon: next.lon } : null
    locationName.value = next?.name ?? ''
    if (!next) weatherData.value = null
  }
}

async function loadWeather() {
  if (!location.value) return
  loading.value = true
  error.value   = null
  try {
    const data = await fetchWeather(location.value.lat, location.value.lon, units.value)
    // Stitch current hour's precipitation probability into the current object
    // (Open-Meteo only provides this in hourly, not current)
    data.current.precipitation_probability =
      data.hourly?.precipitation_probability?.[new Date().getHours()] ?? null
    weatherData.value = data
    // Use timezone abbreviation from response as a location hint when geolocating
    if (locationName.value === 'Locating…' && data.timezone_abbreviation) {
      locationName.value = data.timezone ?? locationName.value
    }
    fetchedAt.value = new Date()
    updatedAt.value = fetchedAt.value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch (e) {
    error.value = e.message ?? 'Failed to load weather data.'
  } finally {
    loading.value = false
  }
}

// Re-fetch whenever location changes; also reset to today
watch(location, (loc) => { if (loc) { selectedDay.value = 0; loadWeather() } })
// Re-fetch whenever units change; persist preference
watch(units, (v) => { localStorage.setItem(UNITS_KEY, v); if (location.value) loadWeather() })
watch(showSim,    (v) => localStorage.setItem(SIM_KEY, String(v)))
watch(tileConfig, (v) => { try { localStorage.setItem(TILES_KEY, JSON.stringify(v)) } catch {} }, { deep: true })
// Check staleness when user switches data type or day; persist data type selection
watch(activeDataType, (t) => { localStorage.setItem(DATATYPE_KEY, t); checkAndRefresh() })
watch(selectedDay,    checkAndRefresh)

// ── Tile drag-and-drop ────────────────────────────────────────────────────────
const tileDragIndex = ref(null)
const tileDragOver  = ref(null)
let   tileTouchIdx  = null
let   tileTouchMoved = false

function reorderTiles(from, to) {
  const arr = [...tileConfig.value]
  const [item] = arr.splice(from, 1)
  arr.splice(to, 0, item)
  tileConfig.value = arr
}

function toggleTile(i) {
  const arr = tileConfig.value.map((t, idx) => idx === i ? { ...t, enabled: !t.enabled } : t)
  if (!arr[i].enabled && activeDataType.value === arr[i].type) activeDataType.value = 'temperature'
  tileConfig.value = arr
}

function onTileDragStart(e, i) { tileDragIndex.value = i; e.dataTransfer.effectAllowed = 'move' }
function onTileDragOver(e, i)  { e.preventDefault(); tileDragOver.value = i }
function onTileDragEnd()       { tileDragIndex.value = null; tileDragOver.value = null }
function onTileDrop(e, i) {
  e.preventDefault()
  if (tileDragIndex.value !== null && tileDragIndex.value !== i) reorderTiles(tileDragIndex.value, i)
  tileDragIndex.value = null; tileDragOver.value = null
}

function onTileTouchStart(e, i) { tileTouchIdx = i; tileTouchMoved = false; tileDragIndex.value = i }
function onTileTouchMove(e) {
  if (tileTouchIdx === null) return
  e.preventDefault()
  tileTouchMoved = true
  const touch = e.touches[0]
  const el  = document.elementFromPoint(touch.clientX, touch.clientY)
  const row = el?.closest('[data-tile-idx]')
  tileDragOver.value = row ? parseInt(row.dataset.tileIdx) : null
}
function onTileTouchEnd() {
  if (tileTouchMoved && tileTouchIdx !== null && tileDragOver.value !== null && tileTouchIdx !== tileDragOver.value) {
    reorderTiles(tileTouchIdx, tileDragOver.value)
  }
  tileTouchIdx = null; tileTouchMoved = false; tileDragIndex.value = null; tileDragOver.value = null
}

// On load: restore last active location (or fall back to first saved); auto-open panel for new users
const activeSaved = (() => {
  const active = loadActiveKey()
  if (active) {
    const match = savedLocations.value.find(l => l.lat === active.lat && l.lon === active.lon)
    if (match) return match
  }
  return savedLocations.value[0] ?? null
})()
if (activeSaved) {
  location.value     = { lat: activeSaved.lat, lon: activeSaved.lon }
  locationName.value = activeSaved.name
} else {
  panelOpen.value = true
}

</script>

<style>
/* ── Global layout ───────────────────────────────────────────────────────── */
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 24px;
  background: rgba(11, 17, 32, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.header-left, .header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.header-left {
  min-width: 0;
  flex: 1;
  margin-right: 16px;
}

.locations-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 9999px;
  padding: 6px 14px;
  color: #94a3b8;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}
.locations-btn:hover { background: rgba(255,255,255,0.1); }

.loc-count {
  font-size: 0.75rem;
  font-weight: 700;
  background: #38bdf8;
  color: #0b1120;
  border-radius: 9999px;
  padding: 1px 6px;
  line-height: 1.4;
}

.app-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: #f1f5f9;
  letter-spacing: -0.3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.settings-btn {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 9999px;
  padding: 6px 12px;
  color: #94a3b8;
  font-size: 1.1rem;
  transition: background 0.2s;
}
.settings-btn:hover { background: rgba(255,255,255,0.1); }

/* ── Main ───────────────────────────────────────────────────────────────── */
.main {
  flex: 1;
  max-width: 960px;
  width: 100%;
  margin: 0 auto;
  padding: 20px 20px 40px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ── Two-column layout (tablet / desktop) ───────────────────────────────── */
.weather-layout {
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: 1;
  min-height: 0;
}

.layout-right {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

@media (max-width: 767px) {
  .main {
    padding-top: 0;
  }
  .layout-left {
    margin-left: -20px;
    margin-right: -20px;
  }
  .layout-left .conditions {
    border-radius: 0;
    border-left: none;
    border-right: none;
    border-top: none;
  }
}

@media (min-width: 768px) {
  .main {
    max-width: none;
    padding: 16px 20px;
  }

  /* Pin the weather layout to a known height so both columns can share
     the same source of truth. 135px ≈ header(56) + main-padding(32) +
     gap+footer(47). Both columns then fill this via align-items:stretch. */
  .weather-layout {
    flex-direction: row;
    align-items: stretch;
    height: calc(100vh - 135px);
  }

  .layout-left {
    width: 33.333%;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
  }

  /* Left column card fills the full pinned height */
  .layout-left .conditions {
    flex: 1;
  }

  /* Right column fills the pinned height and distributes it between charts */
  .layout-right {
    flex: 1;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
  }

  /* Each chart tile gets an equal share of the right column */
  .layout-chart {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  /* Stable fixed height for the canvas area. Using flex:1/auto causes
     Chart.js's ResizeObserver to fire on attachment and cancel the creation
     animation. A concrete calc() value keeps the container size unchanged
     across data/day switches so the 400ms animation plays correctly.
     calc: each tile = (100vh-135-14)/2 = 50vh-74.5px; minus card chrome
     (top-pad 20 + header+margin ~40 + bottom-pad 16 = 76px) = 50vh-151px. */
  .layout-chart .chart-wrap {
    height: calc(50vh - 155px) !important;
    min-height: 140px;
  }
}

/* ── Empty / Loading / Error states ────────────────────────────────────── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 80px 20px;
  text-align: center;
}
.empty-icon   { font-size: 4rem; margin-bottom: 8px; }
.empty-title  { font-size: 1.2rem; font-weight: 600; color: #e2e8f0; }
.empty-sub    { color: #64748b; max-width: 320px; }

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 80px 20px;
  color: #64748b;
}

.error-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px;
  text-align: center;
  color: #f87171;
}
.error-icon { font-size: 2rem; }
.retry-btn {
  margin-top: 4px;
  padding: 8px 20px;
  border-radius: 9999px;
  background: rgba(248, 113, 113, 0.15);
  border: 1px solid rgba(248, 113, 113, 0.3);
  color: #f87171;
  font-weight: 600;
  transition: background 0.2s;
}
.retry-btn:hover { background: rgba(248, 113, 113, 0.25); }

.add-location-btn {
  margin-top: 8px;
  padding: 10px 24px;
  border-radius: 9999px;
  background: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.3);
  color: #38bdf8;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.add-location-btn:hover { background: rgba(56, 189, 248, 0.22); }

/* ── Footer ─────────────────────────────────────────────────────────────── */
.data-footer {
  text-align: center;
  font-size: 0.78rem;
  color: #334155;
  padding-top: 8px;
}
.data-footer a {
  color: #475569;
  text-decoration: none;
}
.data-footer a:hover { color: #64748b; }

.refresh-btn {
  background: none;
  border: none;
  color: #475569;
  font-size: 1rem;
  cursor: pointer;
  padding: 0 2px;
  vertical-align: middle;
  transition: color 0.15s;
  line-height: 1;
}
.refresh-btn:hover:not(:disabled) { color: #94a3b8; }
.refresh-btn:disabled { cursor: default; }

/* ── Settings panel ─────────────────────────────────────────────────────── */
.panel-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  z-index: 200;
  display: flex;
  justify-content: flex-end;
}

.settings-panel {
  width: 300px;
  max-width: 90vw;
  height: 100%;
  background: #0f1829;
  border-left: 1px solid rgba(255,255,255,0.08);
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
}

.panel-title {
  font-size: 1rem;
  font-weight: 700;
  color: #f1f5f9;
}

.panel-close {
  background: none;
  border: none;
  color: #64748b;
  font-size: 1.1rem;
  padding: 4px 8px;
  transition: color 0.15s;
}
.panel-close:hover { color: #94a3b8; }

.settings-body {
  padding: 8px 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.setting-label {
  font-size: 0.9rem;
  color: #e2e8f0;
  font-weight: 500;
}

.setting-hint {
  font-size: 0.75rem;
  color: #475569;
  margin-top: 2px;
}

.unit-pill {
  display: flex;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 9999px;
  overflow: hidden;
}

.unit-pill-opt {
  padding: 5px 14px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #64748b;
  background: none;
  border: none;
  transition: background 0.15s, color 0.15s;
}
.unit-pill-opt.active {
  background: rgba(56,189,248,0.18);
  color: #38bdf8;
}

.toggle-switch {
  flex-shrink: 0;
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.15);
  position: relative;
  cursor: pointer;
  padding: 0;
  transition: background 0.2s, border-color 0.2s;
}
.toggle-switch.on {
  background: #38bdf8;
  border-color: #38bdf8;
}
.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: white;
  transition: transform 0.2s;
  display: block;
}
.toggle-switch.on .toggle-thumb {
  transform: translateX(20px);
}

/* ── Tile list ───────────────────────────────────────────────────────────── */
.setting-section {
  padding-top: 8px;
}

.setting-section-title {
  font-size: 0.72rem;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 12px 20px 4px;
}

.tile-list {
  display: flex;
  flex-direction: column;
}

.tile-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  cursor: grab;
  user-select: none;
  border-top: 1px solid rgba(255,255,255,0.04);
  transition: background 0.15s, opacity 0.15s;
  touch-action: none;
}
.tile-row:active { cursor: grabbing; }

.tile-drag-handle {
  color: #334155;
  font-size: 1.1rem;
  flex-shrink: 0;
  line-height: 1;
}

.tile-icon-label {
  flex: 1;
  font-size: 0.88rem;
  color: #e2e8f0;
}

.tile-dragging {
  opacity: 0.35;
}

.tile-drag-over {
  background: rgba(56, 189, 248, 0.08);
  border-top-color: rgba(56, 189, 248, 0.35);
}

.panel-slide-enter-active, .panel-slide-leave-active {
  transition: opacity 0.2s;
}
.panel-slide-enter-active .settings-panel,
.panel-slide-leave-active .settings-panel {
  transition: transform 0.25s ease;
}
.panel-slide-enter-from .settings-panel,
.panel-slide-leave-to .settings-panel {
  transform: translateX(100%);
}
.panel-slide-enter-from, .panel-slide-leave-to {
  opacity: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
.spinning {
  display: inline-block;
  animation: spin 0.8s linear infinite;
}
</style>
