<template>
  <div class="app-shell">
    <header v-if="!weatherData" class="header">
      <div class="header-right">
        <button data-locations-btn class="locations-btn" :class="{ active: panelOpen }" @click="panelOpen = !panelOpen" title="Saved locations">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            <circle cx="12" cy="9" r="2.5"/>
          </svg>
        </button>
        <button data-settings-btn class="settings-btn" data-tut="settings" :class="{ active: settingsOpen }" @click="settingsOpen = !settingsOpen" title="Preferences">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
            <line x1="4" y1="6" x2="20" y2="6"/>
            <line x1="4" y1="12" x2="20" y2="12"/>
            <line x1="4" y1="18" x2="20" y2="18"/>
            <circle cx="10" cy="6" r="2.5" fill="currentColor" stroke="none"/>
            <circle cx="16" cy="12" r="2.5" fill="currentColor" stroke="none"/>
            <circle cx="8" cy="18" r="2.5" fill="currentColor" stroke="none"/>
          </svg>
        </button>
      </div>
    </header>

    <main class="main">
      <!-- Empty state — no location selected yet -->
      <div v-if="!location && !loading" class="empty-state">
        <div class="empty-icon">🌍</div>
        <p class="empty-title">Where in the world are you?</p>
        <button class="add-location-btn" @click="panelOpen = true">+ Add a location</button>
      </div>

      <!-- Loading -->
      <div v-else-if="loading" class="loading-state">
        <div class="loading-icon">🌤️</div>
        <div class="loading-dots">
          <span></span><span></span><span></span>
        </div>
        <p class="loading-label">Fetching weather</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="error-card card">
        <span class="error-icon">⚠️</span>
        <p>{{ error }}</p>
        <button class="retry-btn" @click="loadWeather(false, true)">Try again</button>
      </div>

      <!-- Main content -->
      <Transition v-else-if="weatherData" name="weather-fade" appear>
        <div class="weather-layout">
          <aside class="layout-left" :style="{ '--grass-color': grassColor }">
            <CurrentConditions
              :data="mergedCurrent"
              :pws-name="activePwsStation?.name ?? null"
              :pws-data-active="!!pwsData"
              :daily="weatherData.daily"
              :unit-prefs="unitPrefs"
              :active-type="activeDataType"
              :location-name="locationName"
              :lat="location?.lat ?? 0"
              :utc-offset="weatherData.utc_offset_seconds ?? 0"
              :time-format="timeFormat"
              :show-sim="showSim"
              :show-fireworks="showFireworks"
              :tile-config="tileConfig"
              :updated-at="updatedAt"
              :fetched-at="fetchedAt?.getTime() ?? null"
              :stale-ms="STALE_MS"
              :loading="loading"
              :blurred="panelOpen || settingsOpen"
              :locations-open="panelOpen"
              :settings-open="settingsOpen"
              @select="activeDataType = $event"
              @grass-color="grassColor = $event"
              @open-locations="panelOpen = !panelOpen"
              @open-settings="settingsOpen = !settingsOpen"
              @open-data-types="settingsPanel?.openDataTypesModal()"
              @refresh="loadWeather(false, true)"
            />
          </aside>
          <div class="layout-right">
            <Transition name="chart-switch" mode="out-in">
            <div :key="activeDataType === 'radar' ? 'radar' : 'charts'" class="layout-charts-inner">
            <template v-if="activeDataType === 'radar'">
              <div class="layout-chart">
                <RadarMap
                  :lat="location.lat"
                  :lng="location.lon"
                  :theme="resolvedTheme"
                  :time-format="timeFormat"
                />
              </div>
            </template>
            <template v-else-if="!dailyFirst">
              <div class="layout-chart">
                <HourlyChart
                  :hourly="weatherData.hourly"
                  :daily="weatherData.daily"
                  :active-type="activeDataType"
                  :unit-prefs="unitPrefs"
                  :day-index="selectedDay"
                  :theme="resolvedTheme"
                  :utc-offset="weatherData.utc_offset_seconds ?? 0"
                  :time-format="timeFormat"
                  :pws-current="mergedCurrent"
                  :pws-data-active="!!pwsData"
                  @select-day="selectedDay = $event"
                  @open-units-modal="settingsPanel?.openUnitsModal()"
                />
              </div>
              <div class="layout-chart">
                <DailyChart
                  :daily="weatherData.daily"
                  :hourly="weatherData.hourly"
                  :active-type="activeDataType"
                  :unit-prefs="unitPrefs"
                  :selected-day="selectedDay"
                  :theme="resolvedTheme"
                  :utc-offset="weatherData.utc_offset_seconds ?? 0"
                  @day-selected="selectedDay = $event"
                  @open-units-modal="settingsPanel?.openUnitsModal()"
                />
              </div>
            </template>
            <template v-else>
              <div class="layout-chart">
                <DailyChart
                  :daily="weatherData.daily"
                  :hourly="weatherData.hourly"
                  :active-type="activeDataType"
                  :unit-prefs="unitPrefs"
                  :selected-day="selectedDay"
                  :theme="resolvedTheme"
                  :utc-offset="weatherData.utc_offset_seconds ?? 0"
                  @day-selected="selectedDay = $event"
                  @open-units-modal="settingsPanel?.openUnitsModal()"
                />
              </div>
              <div class="layout-chart">
                <HourlyChart
                  :hourly="weatherData.hourly"
                  :daily="weatherData.daily"
                  :active-type="activeDataType"
                  :unit-prefs="unitPrefs"
                  :day-index="selectedDay"
                  :theme="resolvedTheme"
                  :utc-offset="weatherData.utc_offset_seconds ?? 0"
                  :time-format="timeFormat"
                  :pws-current="mergedCurrent"
                  :pws-data-active="!!pwsData"
                  @select-day="selectedDay = $event"
                  @open-units-modal="settingsPanel?.openUnitsModal()"
                />
              </div>
            </template>
            </div>
            </Transition>
            <div class="data-footer">
              Data from <a href="https://open-meteo.com" target="_blank" rel="noopener">Open-Meteo</a>
              <template v-if="updatedAt"> · Updated {{ updatedAt }}</template>
              <template v-if="!loading"> · <CountdownTimer :fetched-at="fetchedAt?.getTime() ?? null" :stale-ms="STALE_MS" /></template>
              <button class="refresh-btn" @click="loadWeather(false, true)" :disabled="loading" title="Refresh">
                <span :class="{ spinning: loading }">↻</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </main>

    <SettingsPanel
      ref="settingsPanel"
      :is-open="settingsOpen"
      @close="settingsOpen = false"
    />

    <!-- PWS station picker modal -->
    <transition name="modal-fade">
      <PwsPickerModal
        v-if="pwsPickerLoc"
        :loc="pwsPickerLoc"
        :api-key="pwsApiKey"
        :current-station="pwsPickerLoc.pwsStation ?? null"
        @select="onSetPws(pwsPickerLoc, $event); pwsPickerLoc = null"
        @close="pwsPickerLoc = null"
      />
    </transition>

    <LocationsPanel
      :locations="savedLocations"
      :active-location="location"
      :is-open="panelOpen"
      :is-geo-active="isGeoActive"
      :geo-location-name="isGeoActive ? locationName : ''"
      :pws-api-key="pwsEnabled ? pwsApiKey : ''"
      @select="onPanelSelect"
      @delete="onPanelDelete"
      @close="panelOpen = false; tutSearching = false"
      @location-selected="onLocationSelected"
      @geo-locate="onGeoLocate"
      @searching="tutSearching = $event"
      @open-pws-picker="pwsPickerLoc = $event"
    />

    <TutorialGuide
      :step="tutorialStep"
      :panel-open="panelOpen"
      :hidden="tutSearching || tutPendingLocation"
      @next="onTutorialNext"
      @finish="finishTutorial"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import CurrentConditions from './components/CurrentConditions.vue'
import HourlyChart       from './components/HourlyChart.vue'
import DailyChart        from './components/DailyChart.vue'
import RadarMap          from './components/RadarMap.vue'
import LocationsPanel    from './components/LocationsPanel.vue'
import TutorialGuide     from './components/TutorialGuide.vue'
import CountdownTimer    from './components/CountdownTimer.vue'
import SettingsPanel     from './components/SettingsPanel.vue'
import { fetchWeather, clearWeatherCache } from './services/weatherApi.js'
import { getPwsObservations }              from './services/pwsApi.js'
import PwsPickerModal                      from './components/PwsPickerModal.vue'
import { reverseGeocode }                  from './services/geocoding.js'
import { APP_STORAGE_PREFIX }              from './config.js'
import { useSettings, autoIsDark, resolvedTheme, isAutoNight } from './composables/useSettings.js'

const {
  timeFormat, dailyFirst, showSim,
  tileConfig, unitPrefs, pwsEnabled, pwsApiKey, activeDataType,
} = useSettings()

// ── Persistence keys (location / tutorial only) ───────────────────────────────
const P = APP_STORAGE_PREFIX
const TUTORIAL_KEY      = `${P}-tutorial-done`
const TUTORIAL_STEP_KEY = `${P}-tutorial-step`
const LOCATIONS_KEY     = `${P}-locations`
const ACTIVE_KEY        = `${P}-active`
const GEO_ACTIVE_KEY    = `${P}-geo-active`
const LEGACY_KEY        = `${P}-location`

function persistLocations(arr) { try { localStorage.setItem(LOCATIONS_KEY, JSON.stringify(arr)) } catch {} }
function persistActive(loc)    { try { localStorage.setItem(ACTIVE_KEY, JSON.stringify({ lat: loc.lat, lon: loc.lon })) } catch {} }
function loadActiveKey()       { try { return JSON.parse(localStorage.getItem(ACTIVE_KEY)) } catch { return null } }

function loadSavedLocations() {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCATIONS_KEY))
    if (Array.isArray(raw)) return raw
  } catch {}
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

// ── State ─────────────────────────────────────────────────────────────────────
const savedLocations     = ref(loadSavedLocations())
const panelOpen          = ref(false)
const tutSearching       = ref(false)
const tutPendingLocation = ref(false)
const settingsOpen   = ref(false)
const settingsPanel  = ref(null)
const pwsPickerLoc   = ref(null)
const pwsData            = ref(null)
const grassColor         = ref('#43A047')
const locationName       = ref('')
const isGeoActive        = ref(localStorage.getItem(GEO_ACTIVE_KEY) === 'true')
const location           = ref(null)
const selectedDay        = ref(0)
const weatherData        = ref(null)
const loading            = ref(false)
const error              = ref(null)
const fetchedAt          = ref(null)

const updatedAt = computed(() =>
  fetchedAt.value
    ? fetchedAt.value.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: timeFormat.value === '12h' }).toLowerCase()
    : ''
)

const activePwsStation = computed(() => {
  if (!location.value) return null
  const loc = savedLocations.value.find(l => l.lat === location.value.lat && l.lon === location.value.lon)
  return loc?.pwsStation ?? null
})

// ── Tutorial ──────────────────────────────────────────────────────────────────
const tutorialStep = ref(
  !localStorage.getItem(TUTORIAL_KEY)
    ? (parseInt(localStorage.getItem(TUTORIAL_STEP_KEY) ?? '0') || 0)
    : null
)

watch(tutorialStep, (v) => {
  try {
    if (v !== null) localStorage.setItem(TUTORIAL_STEP_KEY, String(v))
    else localStorage.removeItem(TUTORIAL_STEP_KEY)
  } catch {}
})

function onTutorialNext() {
  if (tutorialStep.value !== null && tutorialStep.value < 5) tutorialStep.value++
  else finishTutorial()
}

const showFireworks    = ref(false)
const pendingFireworks = ref(false)

function launchFireworks() {
  if (!weatherData.value) return
  showFireworks.value = true
  setTimeout(() => { showFireworks.value = false }, 5000)
}

function finishTutorial(deferFireworks = false) {
  try { localStorage.setItem(TUTORIAL_KEY, 'true') } catch {}
  try { localStorage.removeItem(TUTORIAL_STEP_KEY) } catch {}
  tutorialStep.value = null
  if (deferFireworks) pendingFireworks.value = true
  else launchFireworks()
}

// Auto-advance step 1 once a location is added and weather has loaded
watch([savedLocations, weatherData, isGeoActive], ([locs, data, geo]) => {
  if (tutorialStep.value === 1 && (locs.length > 0 || geo) && data) {
    setTimeout(() => { tutorialStep.value = 2; tutPendingLocation.value = false }, 600)
  }
}, { immediate: true })

// Finish tutorial on last step when settings opens; fire fireworks when it closes
watch(settingsOpen, (open) => {
  if (open && tutorialStep.value === 5) { finishTutorial(true); return }
  if (!open && pendingFireworks.value) { pendingFireworks.value = false; launchFireworks() }
})

// ── PWS ───────────────────────────────────────────────────────────────────────
function convertPwsFields(obs, prefs) {
  const m = obs.metric
  if (!m) return {}
  const result  = {}
  const toTemp  = c => prefs.temperature === 'fahrenheit' ? c * 9 / 5 + 32 : c
  if (m.temp != null) result.temperature_2m = toTemp(m.temp)
  if (m.temp != null) {
    if (m.temp >= 27 && m.heatIndex != null) result.apparent_temperature = toTemp(m.heatIndex)
    else if (m.temp <= 10 && m.windChill != null) result.apparent_temperature = toTemp(m.windChill)
  }
  if (obs.humidity != null) result.relative_humidity_2m = obs.humidity
  if (m.windSpeed != null) {
    const c = { kmh: 1, mph: 0.621371, ms: 0.277778, kn: 0.539957 }
    result.wind_speed_10m = m.windSpeed * (c[prefs.wind] ?? 1)
  }
  if (obs.winddir != null) result.wind_direction_10m = obs.winddir
  if (m.precipRate != null)
    result.precipitation = prefs.precipitation === 'inch' ? m.precipRate * 0.0393701 : m.precipRate
  if (m.pressure != null) {
    const c = { hpa: 1, inhg: 0.02953, mmhg: 0.75006 }
    result.surface_pressure = m.pressure * (c[prefs.pressure] ?? 1)
  }
  return result
}

const mergedCurrent = computed(() => {
  if (!weatherData.value) return null
  if (!pwsData.value) return weatherData.value.current
  return { ...weatherData.value.current, ...convertPwsFields(pwsData.value, unitPrefs.value) }
})

async function loadPwsData() {
  if (!pwsEnabled.value || !activePwsStation.value || !pwsApiKey.value) { pwsData.value = null; return }
  try {
    pwsData.value = await getPwsObservations(activePwsStation.value.id, pwsApiKey.value)
  } catch {
    pwsData.value = null
  }
}

function onSetPws(loc, station) {
  savedLocations.value = savedLocations.value.map(l => {
    if (l.lat !== loc.lat || l.lon !== loc.lon) return l
    const updated = { ...l }
    if (station) updated.pwsStation = station
    else delete updated.pwsStation
    return updated
  })
  persistLocations(savedLocations.value)
  if (location.value?.lat === loc.lat && location.value?.lon === loc.lon) {
    if (station) loadPwsData()
    else pwsData.value = null
  }
}

watch(pwsEnabled, (v) => {
  if (!v) pwsData.value = null
  else loadPwsData()
})

// ── Weather ───────────────────────────────────────────────────────────────────
const STALE_MS = 15 * 60 * 1000

function isStale() {
  if (!fetchedAt.value || !weatherData.value) return true
  const now = new Date()
  if (now - fetchedAt.value > STALE_MS) return true
  if (now.toDateString() !== fetchedAt.value.toDateString()) return true
  return false
}

function checkAndRefresh() {
  if (location.value && isStale()) loadWeather(false, true)
}

async function loadWeather(silent = false, forceRefresh = false) {
  if (!location.value) return
  if (!silent || !weatherData.value) loading.value = true
  error.value = null
  try {
    const { data, timestamp } = await fetchWeather(location.value.lat, location.value.lon, unitPrefs.value, { forceRefresh })
    const locHour = new Date(Date.now() + data.utc_offset_seconds * 1000).getUTCHours()
    data.current.precipitation_probability =
      data.hourly?.precipitation_probability?.[locHour] ?? null
    weatherData.value = data
    if (locationName.value === 'Locating…' && data.timezone_abbreviation) {
      locationName.value = data.timezone ?? locationName.value
    }
    fetchedAt.value = new Date(timestamp)
    loadPwsData()
  } catch (e) {
    error.value = e.message ?? 'Failed to load weather data.'
  } finally {
    loading.value = false
  }
}

watch(location, (loc) => { if (loc) { selectedDay.value = 0; loadWeather() } })

watch(unitPrefs, (newVal, oldVal) => {
  const apiChanged = ['temperature', 'wind', 'precipitation'].some(k => newVal[k] !== oldVal[k])
  if (location.value && apiChanged) loadWeather()
}, { deep: true })

watch(activeDataType, checkAndRefresh)
watch(selectedDay,    checkAndRefresh)

// ── Location management ───────────────────────────────────────────────────────
function addToSaved(lat, lon, name) {
  const already = savedLocations.value.some(l => l.lat === lat && l.lon === lon)
  if (!already) {
    savedLocations.value = [...savedLocations.value, { lat, lon, name }]
    persistLocations(savedLocations.value)
  }
}

function clearGeoActive() {
  if (isGeoActive.value && location.value) clearWeatherCache(location.value.lat, location.value.lon)
  isGeoActive.value = false
  try { localStorage.removeItem(GEO_ACTIVE_KEY) } catch {}
}

function onLocationSelected({ lat, lon, name }) {
  if (tutorialStep.value === 1) tutPendingLocation.value = true
  clearGeoActive()
  location.value     = { lat, lon }
  locationName.value = name
  persistActive({ lat, lon })
  addToSaved(lat, lon, name)
}

async function applyGeoLocation(lat, lon) {
  isGeoActive.value  = true
  location.value     = { lat, lon }
  locationName.value = 'Locating…'
  try { localStorage.setItem(GEO_ACTIVE_KEY, 'true') } catch {}
  try {
    const name = await reverseGeocode(lat, lon)
    locationName.value = name
    persistActive({ lat, lon })
  } catch {
    locationName.value = `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`
    persistActive({ lat, lon })
  }
}

async function onGeoLocate({ lat, lon }) {
  if (tutorialStep.value === 1) tutPendingLocation.value = true
  await applyGeoLocation(lat, lon)
  panelOpen.value = false
}

function onPanelSelect(loc) {
  clearGeoActive()
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
  clearWeatherCache(loc.lat, loc.lon)
  if (!isGeoActive.value && location.value?.lat === loc.lat && location.value?.lon === loc.lon) {
    const next = savedLocations.value[0] ?? null
    location.value     = next ? { lat: next.lat, lon: next.lon } : null
    locationName.value = next?.name ?? ''
    if (!next) weatherData.value = null
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
let autoTimer    = null
let refreshTimer = null

onMounted(() => {
  autoTimer    = setInterval(() => { autoIsDark.value = isAutoNight() }, 60_000)
  refreshTimer = setInterval(() => { if (location.value && isStale()) loadWeather(true, true) }, 30_000)

  if (isGeoActive.value) {
    loading.value = true
    if (!navigator.geolocation) { loading.value = false; clearGeoActive(); return }
    navigator.geolocation.getCurrentPosition(
      async (pos) => { await applyGeoLocation(pos.coords.latitude, pos.coords.longitude) },
      () => { loading.value = false; clearGeoActive() },
      { timeout: 10000 }
    )
  }
})

function onVisibilityChange() { if (document.visibilityState === 'visible') checkAndRefresh() }
document.addEventListener('visibilitychange', onVisibilityChange)

onUnmounted(() => {
  clearInterval(refreshTimer)
  clearInterval(autoTimer)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})

// Restore last active location on load
if (!isGeoActive.value) {
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
  }
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
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 12px 16px;
  background: var(--header-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--header-border);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.locations-btn, .settings-btn {
  background: var(--btn-bg);
  border: 1px solid var(--btn-border);
  backdrop-filter: blur(8px);
  border-radius: 9999px;
  width: 42px;
  height: 34px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 1.1rem;
  cursor: pointer;
  transition: background 0.2s;
}
.locations-btn:hover, .settings-btn:hover { background: var(--btn-hover); }
.locations-btn.active, .settings-btn.active {
  background: rgba(56, 189, 248, 0.15);
  border-color: var(--accent);
  color: var(--accent);
}
.locations-btn.active:hover, .settings-btn.active:hover { background: rgba(56, 189, 248, 0.22); }

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

.layout-charts-inner {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

@media (max-width: 999px) {
  .app-shell {
    height: 100dvh;
    overflow: hidden;
  }
  .main {
    padding: 0;
    gap: 10px;
    max-width: none;
    overflow: hidden;
  }
  .layout-right {
    gap: 10px;
    padding: 0 10px;
  }
  .weather-layout {
    display: block;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    scrollbar-width: none;
  }
  .weather-layout::-webkit-scrollbar { display: none; }
  .layout-left {
    position: sticky;
    top: 0;
  }
  .layout-left::after {
    content: '';
    position: absolute;
    bottom: -18px;
    left: 0;
    right: 0;
    height: 26px;
    background: linear-gradient(to bottom, var(--grass-color) 0%, var(--grass-color) 35%, transparent 100%);
    pointer-events: none;
  }
  .layout-right {
    position: sticky;
    top: 72px;
    z-index: 1;
    margin-top: -18px;
  }
  .layout-left .conditions {
    border-radius: 0;
    border-left: none;
    border-right: none;
    border-top: none;
    border-bottom: none;
  }
}

/* ── Mobile/tablet landscape: side-by-side with scrollable charts ──────── */
@media (orientation: landscape) and (max-height: 900px) and (max-width: 1366px) {
  .main {
    padding: 0;
    gap: 0;
    max-width: none;
  }
  .weather-layout {
    flex-direction: row;
    align-items: stretch;
    height: 100dvh;
    gap: 0;
  }
  .layout-left {
    width: 35%;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    margin-left: 0;
    margin-right: 0;
  }
  .layout-left .conditions {
    flex: 1;
    border-radius: 0;
    border: none;
  }
  .layout-right {
    flex: 1;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px;
    box-sizing: border-box;
  }
  .layout-charts-inner {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    gap: 8px;
  }
  .layout-chart {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .layout-chart .chart-card {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .layout-chart .chart-area {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .layout-chart .chart-wrap {
    flex: 1;
    min-height: 80px;
    height: auto !important;
  }
  .layout-chart .radar-card {
    flex: 1;
    min-height: 0;
  }
  .layout-chart .radar-map {
    flex: 1;
    min-height: 0;
    height: auto;
  }
}

@media (min-width: 1500px) {
  .main {
    max-width: none;
    padding: 14px;
  }
  .weather-layout {
    flex-direction: row;
    align-items: stretch;
    height: calc(100vh - 75px);
  }
  .layout-left {
    width: 33.333%;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
  }
  .layout-left .conditions { flex: 1; }
  .layout-right {
    flex: 1;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
  }
  .layout-charts-inner {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
  .layout-chart {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .layout-chart .chart-card {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .layout-chart .chart-area {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .layout-chart .chart-wrap {
    flex: 1;
    min-height: 140px;
    height: auto !important;
  }
  .layout-chart .radar-card { flex: 1; min-height: 0; }
  .layout-chart .radar-map  { flex: 1; min-height: 0; height: auto; }
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
.empty-title  { font-size: 1.2rem; font-weight: 600; color: var(--text); }
.empty-sub    { color: var(--text-muted); max-width: 320px; }

.chart-switch-enter-active,
.chart-switch-leave-active {
  transition: opacity 0.18s ease;
}
.chart-switch-enter-from,
.chart-switch-leave-to {
  opacity: 0;
}

.weather-fade-enter-active {
  transition: opacity 0.5s ease-out, transform 0.5s ease-out;
}
.weather-fade-enter-from {
  opacity: 0;
  transform: translateY(40px) scale(0.95);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 80px 20px;
  color: var(--text-muted);
  animation: fade-in 0.4s ease;
}

.loading-icon {
  font-size: 3.2rem;
  animation: loading-float 2.4s ease-in-out infinite;
  filter: drop-shadow(0 4px 12px rgba(56, 189, 248, 0.25));
}

.loading-dots { display: flex; gap: 7px; }
.loading-dots span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
  opacity: 0.35;
  animation: loading-bounce 1.3s ease-in-out infinite;
}
.loading-dots span:nth-child(2) { animation-delay: 0.18s; }
.loading-dots span:nth-child(3) { animation-delay: 0.36s; }

.loading-label {
  font-size: 0.9rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 500;
}

@keyframes loading-float {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-8px); }
}

@keyframes loading-bounce {
  0%, 80%, 100% { transform: translateY(0);    opacity: 0.35; }
  40%           { transform: translateY(-7px); opacity: 1; }
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
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
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 0.78rem;
  color: var(--text-faint);
  padding: 8px 0 16px;
}
.data-footer a { color: var(--text-faint); text-decoration: none; }
.data-footer a:hover { color: var(--text-muted); }
.footer-countdown { font-variant-numeric: tabular-nums; }
@media (min-width: 1500px) { .data-footer { display: none; } }
@media (orientation: landscape) and (max-height: 900px) and (max-width: 1366px) { .data-footer { display: none; } }

.refresh-btn {
  background: none;
  border: none;
  color: var(--text-faint);
  font-size: 1rem;
  cursor: pointer;
  padding: 0 2px;
  vertical-align: middle;
  transition: color 0.15s;
  line-height: 1;
}
.refresh-btn:hover:not(:disabled) { color: var(--text-muted); }
.refresh-btn:disabled { cursor: default; }

@keyframes spin { to { transform: rotate(360deg); } }
.spinning { display: inline-block; animation: spin 0.8s linear infinite; }
</style>
