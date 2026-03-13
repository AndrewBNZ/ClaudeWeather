<template>
  <div class="app-shell">
    <header class="header">
      <div class="header-left">
        <span class="app-icon">⛅</span>
        <span class="app-name">ClaudeWeather</span>
      </div>
      <div class="header-right">
        <button class="locations-btn" @click="panelOpen = true" title="Saved locations">
          ☰
          <span v-if="savedLocations.length" class="loc-count">{{ savedLocations.length }}</span>
        </button>
        <button class="unit-toggle" @click="toggleUnits" :title="units === 'metric' ? 'Switch to Imperial' : 'Switch to Metric'">
          <span :class="['unit-opt', { active: units === 'metric' }]">°C</span>
          <span class="unit-sep">/</span>
          <span :class="['unit-opt', { active: units === 'imperial' }]">°F</span>
        </button>
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
              :units="units"
              :active-type="activeDataType"
              :location-name="locationName"
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
const LEGACY_KEY     = 'claudeweather-location'

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
const savedLocations = ref(loadSavedLocations())
const panelOpen      = ref(false)
const location       = ref(null)   // { lat, lon }
const units          = ref('metric')
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

function toggleUnits() {
  units.value = units.value === 'metric' ? 'imperial' : 'metric'
}

// Re-fetch whenever location changes; also reset to today
watch(location, (loc) => { if (loc) { selectedDay.value = 0; loadWeather() } })
// Re-fetch whenever units change
watch(units, () => { if (location.value) loadWeather() })
// Check staleness when user switches data type or day; persist data type selection
watch(activeDataType, (t) => { localStorage.setItem(DATATYPE_KEY, t); checkAndRefresh() })
watch(selectedDay,    checkAndRefresh)

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

.app-icon { font-size: 1.5rem; }

.app-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: #f1f5f9;
  letter-spacing: -0.3px;
}

.unit-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 9999px;
  padding: 6px 14px;
  color: #94a3b8;
  font-size: 0.9rem;
  font-weight: 600;
  transition: background 0.2s;
}
.unit-toggle:hover { background: rgba(255,255,255,0.1); }

.unit-opt { transition: color 0.2s; }
.unit-opt.active { color: #38bdf8; }
.unit-sep { color: #334155; }

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

@keyframes spin {
  to { transform: rotate(360deg); }
}
.spinning {
  display: inline-block;
  animation: spin 0.8s linear infinite;
}
</style>
