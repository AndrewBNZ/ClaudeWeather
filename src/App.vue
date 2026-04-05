<template>
  <div class="app-shell">
    <!-- Sticky top bar — location name + action buttons, always visible above scroll -->
    <div v-if="weatherData" class="scene-top-bar" :class="{ blurred: settingsOpen, scrolled: topBarScrolled }">
        <button
          data-locations-btn
          class="scene-top-btn"
          :class="{ active: panelOpen }"
          :disabled="conditionsOpen"
          @click="panelOpen = !panelOpen; settingsOpen = false"
          title="Saved locations"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            <circle cx="12" cy="9" r="2.5"/>
          </svg>
        </button>
      <div class="scene-top-location">
          <span class="scene-top-name">{{ (locationName || 'ClaudeWeather').split(',')[0] }}</span>
          <span v-if="weatherData && localDateTime" class="scene-top-datetime">{{ localDateTime }}</span>
        </div>
        <button
          data-settings-btn
          class="scene-top-btn"
          data-tut="settings"
          :class="{ active: settingsOpen }"
          :disabled="conditionsOpen"
          @click="settingsOpen = !settingsOpen; panelOpen = false"
          title="Settings"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
            <line x1="4" y1="6" x2="20" y2="6"/>
            <line x1="4" y1="12" x2="20" y2="12"/>
            <line x1="4" y1="18" x2="20" y2="18"/>
            <circle cx="10" cy="6" r="2.5" fill="currentColor" stroke="none"/>
            <circle cx="16" cy="12" r="2.5" fill="currentColor" stroke="none"/>
            <circle cx="8" cy="18" r="2.5" fill="currentColor" stroke="none"/>
          </svg>
        </button>
    </div>

    <!-- Scrollable content area -->
    <div class="scroll-root" ref="scrollRootEl" :class="{ blurred: settingsOpen }">

      <!-- Offline -->
      <div v-if="isOffline && !weatherData" class="offline-card">
        <span class="offline-icon">📡</span>
        <p class="offline-title">No internet connection</p>
        <p class="offline-sub">Weather will load automatically when you're back online.</p>
      </div>

      <!-- Empty state — no location selected yet -->
      <div v-else-if="!location && !loading" class="empty-state">
        <div class="empty-icon">🌍</div>
        <p class="empty-title">Where in the world are you?</p>
        <button class="add-location-btn" data-locations-btn @click="panelOpen = true">+ Add a location</button>
      </div>

      <!-- Loading -->
      <div v-else-if="loading && !isOffline" class="loading-state">
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

      <!-- Main weather content -->
      <template v-else-if="weatherData">
        <!-- Scene block — scrolls away as user scrolls down -->
        <div class="scene-block" :style="{ '--grass-color': grassColor }">
          <SceneConditionsOverlay
            v-if="mergedCurrent"
            :data="mergedCurrent"
            :daily="weatherData?.daily ?? null"
            :unit-prefs="unitPrefs"
            :blocked="panelOpen || settingsOpen"
            :pws-data-active="!!(pwsData || tempestData)"
            :pws-name="activePwsStation?.name ?? null"
            @panel-change="conditionsOpen = $event"
            @open-settings="sub => { settingsOpen = true; panelOpen = false; nextTick(() => sub === 'layout' ? settingsPanel?.openTab('layout') : settingsPanel?.openToSubPanel(sub)) }"
          />

          <WeatherScene
            @grass-color="grassColor = $event"
            @open-sun-sheet="showSunSheet = true"
            @open-moon-sheet="showMoonSheet = true"
            :weather-code="mergedCurrent.weather_code"
            :wind-speed="mergedCurrent.wind_speed_10m"
            :cloud-cover="mergedCurrent.cloud_cover"
            :sunrise="todaySunrise"
            :sunset="todaySunset"
            :lat="location?.lat ?? 0"
            :utc-offset="weatherData.utc_offset_seconds ?? 0"
            :preview-tod="previewTod"
            :preview-weather="previewWeather"
            :preview-wind="previewWind"
            :show-fireworks="showFireworks || fireworksPreview"
            :shooting-star-trigger="shootingStarTrigger"
            :force-birds="simBirds"
            :force-aurora="simAurora"
            :force-fog="simFog"
          />

          <!-- Sim panel overlay — shown when simulator is enabled -->
          <div v-if="showSim" class="sim-bar">
            <div v-if="simExpanded" class="sim-panel">
              <div class="sim-header">
                <div class="sim-title">Weather Simulator</div>
                <button class="sim-reset" :style="{ visibility: hasSimPreview ? 'visible' : 'hidden' }" @click="resetSim">↺ Reset</button>
              </div>
              <div class="sim-row">
                <span class="sim-row-label">Time</span>
                <button v-for="t in simTimeOfDays" :key="t.tod"
                  class="sim-btn" :class="{ active: previewTod === t.tod }"
                  @click="previewTod = previewTod === t.tod ? null : t.tod"
                  :title="t.label">{{ t.emoji }}</button>
              </div>
              <div class="sim-row">
                <span class="sim-row-label">Weather</span>
                <button v-for="w in simWeatherPreviews" :key="w.group"
                  class="sim-btn" :class="{ active: previewWeather === w.group }"
                  @click="previewWeather = previewWeather === w.group ? null : w.group"
                  :title="w.label">{{ w.emoji }}</button>
              </div>
              <div class="sim-row">
                <span class="sim-row-label">Wind</span>
                <button v-for="wl in simWindLevels" :key="wl.label"
                  class="sim-btn" :class="{ active: previewWind === wl.speed }"
                  @click="previewWind = previewWind === wl.speed ? null : wl.speed"
                  :title="wl.speed === 0 ? `${wl.label} (0 km/h)` : `${wl.label} (${wl.speed} km/h)`">{{ wl.emoji }}</button>
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
            <button class="sim-toggle" :class="{ 'sim-active': hasSimPreview, 'sim-open': simExpanded }" title="Weather Simulator" @click="simExpanded = !simExpanded">
              {{ simExpanded ? '▾' : '▴' }}
            </button>
          </div>
        </div>

        <!-- Card stack -->
        <div class="card-stack" :class="{ 'card-stack--flat': cardStyle === 'flat' }">
          <Transition name="weather-fade" appear>
            <div class="card-stack-inner">
              <CardRenderer
                v-for="card in enabledCards"
                :key="card.type"
                :card-type="card.type"
                :weather="weatherData"
                :merged-current="mergedCurrent"
                :unit-prefs="unitPrefs"
                :selected-day="selectedDay"
                :utc-offset="weatherData.utc_offset_seconds ?? 0"
                :theme="resolvedTheme"
                :time-format="timeFormat"
                :active-type="activeDataType"
                :tile-config="tileConfig"
                :show-sim="showSim"
                :show-fireworks="showFireworks"
                :lat="location?.lat ?? 0"
                :lng="location?.lon ?? 0"
                :pws-name="activePwsStation?.name ?? null"
                :pws-data-active="!!(pwsData || tempestData)"
                :updated-at="updatedAt"
                :fetched-at="fetchedAt?.getTime() ?? null"
                :stale-ms="STALE_MS"
                :loading="loading"
                :can-manual-refresh="canManualRefresh"
                :model-label="OPEN_METEO_MODELS.find(m => m.value === openMeteoModel)?.label"
                :daily-forecast-layout="dailyForecastLayout"
                :hourly-forecast-layout="hourlyForecastLayout"
                :warnings-config="warningsConfig"
                :custom-alerts-config="customAlertsConfig"
                :custom-alert-results="customAlertResults"
                :focus-hour="focusHour"
                :location-country="location?.country ?? null"
                :forecast-data-point="forecastDataPoint"
                @select="activeDataType = $event"
                @day-selected="selectedDay = $event"
                @forecast-data-point="forecastDataPoint = $event"
                @open-data-types="settingsPanel?.openDataTypesModal()"
                @open-model-modal="settingsOpen = true; panelOpen = false; nextTick(() => settingsPanel?.openToSubPanel('forecastModel'))"
                @refresh="loadWeather(false, true)"
                @scroll-to-hour="onScrollToHour"
                @set-data-type="forecastDataPoint = $event"
                @open-alert-editor="onOpenAlertEditor"
                @open-card-settings="onOpenCardSettings"
              />
            </div>
          </Transition>
        </div>

        <!-- Customise Layout -->
        <div class="customise-layout-row" :class="{ 'customise-layout-row--flat': cardStyle === 'flat' }">
          <button class="customise-layout-btn" data-settings-btn @click="settingsOpen = true; panelOpen = false; nextTick(() => settingsPanel?.openTab('layout'))">Customise Layout</button>
        </div>

        <!-- Data footer -->
        <div class="data-footer">
          <div class="data-footer-row">
            Data from <a href="https://open-meteo.com" target="_blank" rel="noopener">Open-Meteo</a>
            · <button class="footer-model-btn" data-settings-btn @click="settingsOpen = true; panelOpen = false; nextTick(() => settingsPanel?.openToSubPanel('forecastModel'))">{{ OPEN_METEO_MODELS.find(m => m.value === openMeteoModel)?.label }}</button>
          </div>
          <div v-if="updatedAt || canManualRefresh" class="data-footer-row">
            <template v-if="updatedAt">Fetched {{ updatedAt }}</template>
            <button v-if="canManualRefresh" class="refresh-btn" @click="loadWeather(false, true)" :disabled="loading" title="Refresh">
              <span :class="{ spinning: loading }">↻</span>
            </button>
          </div>
        </div>
      </template>

    </div>

    <SettingsPanel
      ref="settingsPanel"
      :is-open="settingsOpen"
      :location-country="location?.country ?? null"
      :edit-alert-id="editAlertId"
      @close="settingsOpen = false; editAlertId = null"
    />

    <!-- PWS station picker modal -->
    <transition name="modal-fade">
      <PwsPickerModal
        v-if="pwsPickerLoc"
        :loc="pwsPickerLoc"
        :api-key="pwsEnabled ? pwsApiKey : ''"
        :tempest-token="tempestEnabled ? tempestToken : ''"
        :current-station="pwsPickerLoc.pwsStation ?? null"
        @select="pwsPickerLoc = onSetPws(pwsPickerLoc, $event)"
        @close="pwsPickerLoc = null"
      />
    </transition>

    <LocationsPanel
      :locations="savedLocations"
      :active-location="location"
      :is-open="panelOpen"
      :is-geo-active="isGeoActive"
      :geo-location-name="isGeoActive ? locationName : ''"
      :pws-api-key="(pwsEnabled && pwsApiKey) || (tempestEnabled && tempestToken) ? 'yes' : ''"
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

    <UpdateBanner />

    <!-- Sun / Moon detail sheets -->
    <Transition name="sun-sheet">
      <SunDetailSheet
        v-if="showSunSheet"
        :daily="weatherData?.daily ?? null"
        :lat="location?.lat ?? 0"
        :lon="location?.lon ?? 0"
        :time-format="timeFormat"
        :utc-offset="weatherData?.utc_offset_seconds ?? 0"
        @close="showSunSheet = false"
      />
    </Transition>
    <Transition name="moon-sheet">
      <MoonDetailSheet
        v-if="showMoonSheet"
        :daily="weatherData?.daily ?? null"
        :lat="location?.lat ?? 0"
        :lon="location?.lon ?? 0"
        :time-format="timeFormat"
        :utc-offset="weatherData?.utc_offset_seconds ?? 0"
        @close="showMoonSheet = false"
      />
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, shallowReactive, nextTick } from 'vue'
import WeatherScene               from './components/WeatherScene.vue'
import SunDetailSheet             from './cards/SunDetailSheet.vue'
import MoonDetailSheet            from './cards/MoonDetailSheet.vue'
import SceneConditionsOverlay     from './components/SceneConditionsOverlay.vue'
import CardRenderer               from './components/CardRenderer.vue'
import LocationsPanel    from './components/LocationsPanel.vue'
import TutorialGuide     from './components/TutorialGuide.vue'
import SettingsPanel     from './components/SettingsPanel.vue'
import { fetchWeather, clearWeatherCache } from './services/weatherApi.js'
import { evaluateCustomAlerts } from './services/customAlertEvaluator.js'
import { MODELS as OPEN_METEO_MODELS } from './services/adapters/openMeteo.js'
import { getPwsObservations }                        from './services/pwsApi.js'
import { connectTempest, disconnectTempest, tempestData } from './services/tempestWs.js'
import PwsPickerModal                                from './components/PwsPickerModal.vue'
import { reverseGeocodeDetails }                     from './services/geocoding.js'
import { APP_STORAGE_PREFIX }                        from './config.js'
import { useSettings, autoIsDark, resolvedTheme, isAutoNight } from './composables/useSettings.js'
import UpdateBanner from './components/UpdateBanner.vue'

const {
  timeFormat, showSim, cardStyle,
  tileConfig, cardConfig, unitPrefs, pwsEnabled, pwsApiKey, tempestEnabled, tempestToken, openMeteoModel, activeDataType,
  dailyForecastLayout, hourlyForecastLayout, warningsConfig,
  customAlertsConfig, customAlerts,
} = useSettings()

// ── Card stack ────────────────────────────────────────────────────────────────
const enabledCards      = computed(() => cardConfig.value.filter(c => c.enabled))
const customAlertResults = computed(() => {
  if (!weatherData.value?.hourly || !customAlerts.value?.length) return new Map()
  return evaluateCustomAlerts(customAlerts.value, weatherData.value.hourly)
})
const editAlertId       = ref(null)
const focusHour         = ref(null)

const CARD_SUBPANEL = { combinedHourly: 'hourlyForecast', dailyForecast: 'dailyForecast', customAlerts: 'customAlerts', weatherWarnings: 'weatherWarnings' }

function onOpenCardSettings(cardType) {
  const sub = CARD_SUBPANEL[cardType]
  if (!sub) return
  settingsOpen.value = true
  nextTick(() => settingsPanel.value?.openToSubPanel(sub))
}

function onOpenAlertEditor(alertId) {
  editAlertId.value = alertId
  onOpenCardSettings('customAlerts')
}

function onScrollToHour({ date, hour }) {
  const daily = weatherData.value?.daily
  if (!daily?.time) return
  const dayIndex = daily.time.indexOf(date)
  if (dayIndex === -1) return
  selectedDay.value = dayIndex
  focusHour.value = dayIndex * 24 + hour
  setTimeout(() => {
    const root = scrollRootEl.value
    const el   = document.querySelector('.hourly-forecast-card')
    if (!el || !root) return
    const TOP_BAR_OFFSET = 64
    const elRect   = el.getBoundingClientRect()
    const rootRect = root.getBoundingClientRect()
    root.scrollTo({ top: root.scrollTop + elRect.top - rootRect.top - TOP_BAR_OFFSET, behavior: 'smooth' })
  }, 250)
}

// ── Sim panel state (moved from CurrentConditions) ────────────────────────────
const simTimeOfDays = [
  { emoji: '🌅', label: 'Sunrise', tod: 'sunrise'  },
  { emoji: '☀️', label: 'Day',     tod: 'day'      },
  { emoji: '🌇', label: 'Sunset',  tod: 'sunset'   },
  { emoji: '🌙', label: 'Night',   tod: 'night'    },
]
const simWeatherPreviews = [
  { emoji: '✨',  label: 'Clear',         group: 'clear'  },
  { emoji: '⛅',  label: 'Partly cloudy', group: 'partly' },
  { emoji: '☁️',  label: 'Cloudy',        group: 'cloudy' },
  { emoji: '🌧️', label: 'Rain',           group: 'rain'   },
  { emoji: '🌨️', label: 'Snow',           group: 'snow'   },
  { emoji: '⛈️', label: 'Storm',          group: 'storm'  },
]
const simWindLevels = [
  { emoji: '🍃', label: 'Calm',   speed: 0  },
  { emoji: '🌬️', label: 'Breeze', speed: 15 },
  { emoji: '💨', label: 'Windy',  speed: 35 },
  { emoji: '🌪️', label: 'Storm',  speed: 75 },
]
const simExpanded    = ref(false)
const previewTod     = ref(null)
const previewWeather = ref(null)
const previewWind    = ref(null)
const simBirds       = ref(false)
const simAurora      = ref(false)
const simFog         = ref(false)
const hasSimPreview  = computed(() =>
  previewTod.value !== null || previewWeather.value !== null || previewWind.value !== null ||
  simBirds.value || simAurora.value || simFog.value
)
function resetSim() {
  previewTod.value = null; previewWeather.value = null; previewWind.value = null
  simBirds.value = false; simAurora.value = false; simFog.value = false
}
watch(showSim, (val) => { if (val) simExpanded.value = true; else resetSim() })

const fireworksPreview = ref(false)
let fwPreviewTimer = null
function triggerFireworksPreview() {
  if (fwPreviewTimer) clearTimeout(fwPreviewTimer)
  fireworksPreview.value = true
  fwPreviewTimer = setTimeout(() => { fireworksPreview.value = false }, 5000)
}

const shootingStarTrigger = ref(0)
function triggerShootingStar() { shootingStarTrigger.value++ }

// ── Persistence keys (location / tutorial only) ───────────────────────────────
const P = APP_STORAGE_PREFIX
const TUTORIAL_KEY      = `${P}-tutorial-done`
const TUTORIAL_STEP_KEY = `${P}-tutorial-step`
const LOCATIONS_KEY     = `${P}-locations`
const ACTIVE_KEY        = `${P}-active`
const GEO_ACTIVE_KEY    = `${P}-geo-active`
const LEGACY_KEY        = `${P}-location`

function persistLocations(arr) { try { localStorage.setItem(LOCATIONS_KEY, JSON.stringify(arr)) } catch {} }
function persistActive(loc)    { try { const v = { lat: loc.lat, lon: loc.lon }; if (loc.country) v.country = loc.country; localStorage.setItem(ACTIVE_KEY, JSON.stringify(v)) } catch {} }
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
const settingsOpen    = ref(false)
const conditionsOpen  = ref(false)
const settingsPanel  = ref(null)
const pwsPickerLoc   = ref(null)
const pwsData            = ref(null)
const grassColor         = ref('#43A047')
const scrollRootEl       = ref(null)
const topBarScrolled     = ref(false)
const locationName       = ref('')
const isOffline          = ref(!navigator.onLine)
const isGeoActive        = ref(localStorage.getItem(GEO_ACTIVE_KEY) === 'true')
const location           = ref(null)
const selectedDay        = ref(0)
const forecastDataPoint  = ref(null)
const weatherData        = ref(null)
const silentRefresh      = ref(false)
const loading            = ref(false)
const error              = ref(null)
const fetchedAt          = ref(null)
const tickNow            = ref(Date.now())

const canManualRefresh = computed(() => !fetchedAt.value || tickNow.value - fetchedAt.value.getTime() >= 60_000)

const updatedAt = computed(() =>
  fetchedAt.value
    ? fetchedAt.value.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: timeFormat.value === '12h' }).toLowerCase()
    : ''
)

const localDateTime = computed(() => {
  if (!weatherData.value) return ''
  const offsetMs = (weatherData.value.utc_offset_seconds ?? 0) * 1000
  const d = new Date(tickNow.value + offsetMs)
  const days   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const dow = days[d.getUTCDay()]
  const date = d.getUTCDate()
  const mon  = months[d.getUTCMonth()]
  const h = d.getUTCHours()
  const m = String(d.getUTCMinutes()).padStart(2,'0')
  if (timeFormat.value === '24h') return `${dow} ${date} ${mon} · ${String(h).padStart(2,'0')}:${m}`
  const ampm = h >= 12 ? 'pm' : 'am'
  return `${dow} ${date} ${mon} · ${h % 12 || 12}:${m} ${ampm}`
})

const activePwsStation = computed(() => {
  if (!location.value) return null
  const loc = savedLocations.value.find(l => l.lat === location.value.lat && l.lon === location.value.lon)
  return loc?.pwsStation ?? null
})

// Tempest station is active when the linked station has type 'tempest'
const activeTempestStation = computed(() => {
  const s = activePwsStation.value
  return s?.type === 'tempest' ? s : null
})

// ── Sunrise/sunset ────────────────────────────────────────────────────────────
const todaySunrise = computed(() => weatherData.value?.daily?.sunrise?.[0] ?? null)
const todaySunset  = computed(() => weatherData.value?.daily?.sunset?.[0] ?? null)

// ── Celestial detail sheets ───────────────────────────────────────────────────
const showSunSheet  = ref(false)
const showMoonSheet = ref(false)

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

// ── Tempest ───────────────────────────────────────────────────────────────────
function convertTempestFields(obs, prefs) {
  const result  = {}
  const toTemp  = c => prefs.temperature === 'fahrenheit' ? c * 9 / 5 + 32 : c
  if (obs.air_temperature  != null) result.temperature_2m     = toTemp(obs.air_temperature)
  if (obs.relative_humidity != null) result.relative_humidity_2m = obs.relative_humidity
  if (obs.wind_avg != null) {
    const c = { kmh: 3.6, mph: 2.237, ms: 1, kn: 1.944 }
    result.wind_speed_10m = obs.wind_avg * (c[prefs.wind] ?? 3.6)
  }
  if (obs.wind_direction != null) result.wind_direction_10m = obs.wind_direction
  if (obs.station_pressure != null) {
    const c = { hpa: 1, inhg: 0.02953, mmhg: 0.75006 }
    result.surface_pressure = obs.station_pressure * (c[prefs.pressure] ?? 1)
  }
  if (obs.uv != null) result.uv_index = obs.uv
  if (obs.rain_prev_min != null)
    result.precipitation = prefs.precipitation === 'inch' ? obs.rain_prev_min * 0.0393701 : obs.rain_prev_min
  return result
}

function syncTempestWs() {
  if (tempestEnabled.value && activeTempestStation.value && tempestToken.value) {
    connectTempest(tempestToken.value, activeTempestStation.value.deviceId)
  } else {
    disconnectTempest()
  }
}

watch(tempestEnabled,       syncTempestWs)
watch(tempestToken,         syncTempestWs)
watch(activeTempestStation, syncTempestWs)

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

// Stable reactive object — only changed fields update, preventing a full
// downstream re-render cascade on every rapid_wind message (every 3s).
const mergedCurrent = shallowReactive({})

function _assignChanged(target, source) {
  for (const [k, v] of Object.entries(source)) {
    if (target[k] !== v) target[k] = v
  }
}

function _rebuildMerged() {
  if (!weatherData.value) return
  const base = weatherData.value.current
  for (const k of Object.keys(mergedCurrent)) { if (!(k in base)) delete mergedCurrent[k] }
  _assignChanged(mergedCurrent, base)
  if (tempestData.value)     _assignChanged(mergedCurrent, convertTempestFields(tempestData.value, unitPrefs.value))
  else if (pwsData.value)    _assignChanged(mergedCurrent, convertPwsFields(pwsData.value, unitPrefs.value))
}

// Full rebuild when base weather data, PWS source, or units change
watch([weatherData, pwsData, unitPrefs], _rebuildMerged, { immediate: true })
// Partial update on rapid_wind — only changed fields (wind_speed, wind_direction)
// propagate downstream, keeping other tiles and computeds idle
watch(tempestData, () => {
  if (weatherData.value && tempestData.value)
    _assignChanged(mergedCurrent, convertTempestFields(tempestData.value, unitPrefs.value))
})

async function loadPwsData() {
  // Only fetch WU data — Tempest data arrives via WebSocket instead
  const station = activePwsStation.value
  if (!pwsEnabled.value || !station || !pwsApiKey.value || station.type === 'tempest') {
    pwsData.value = null
    return
  }
  try {
    pwsData.value = await getPwsObservations(station.id, pwsApiKey.value)
  } catch {
    pwsData.value = null
  }
}

function onSetPws(loc, station) {
  let updatedLoc = loc
  savedLocations.value = savedLocations.value.map(l => {
    if (l.lat !== loc.lat || l.lon !== loc.lon) return l
    const updated = { ...l }
    if (station) updated.pwsStation = station
    else delete updated.pwsStation
    updatedLoc = updated
    return updated
  })
  persistLocations(savedLocations.value)
  if (location.value?.lat === loc.lat && location.value?.lon === loc.lon) {
    if (station?.type === 'tempest') { pwsData.value = null; syncTempestWs() }
    else if (station) { disconnectTempest(); loadPwsData() }
    else { pwsData.value = null; disconnectTempest() }
  }
  return updatedLoc
}

watch(pwsEnabled, (v) => {
  if (!v) pwsData.value = null
  else loadPwsData()
})

// ── Weather ───────────────────────────────────────────────────────────────────
const STALE_MS = 5 * 60 * 1000

function isStale() {
  if (!fetchedAt.value || !weatherData.value) return true
  const now = new Date()
  if (now - fetchedAt.value > STALE_MS) return true
  if (now.toDateString() !== fetchedAt.value.toDateString()) return true
  return false
}

function checkAndRefresh() {
  if (location.value && isStale()) loadWeather(true, true)
}

async function loadWeather(silent = false, forceRefresh = false) {
  if (!location.value) return
  if (!navigator.onLine) { isOffline.value = true; loading.value = false; return }
  isOffline.value = false
  if (!silent || !weatherData.value) loading.value = true
  error.value = null
  try {
    const { data, timestamp } = await fetchWeather(location.value.lat, location.value.lon, unitPrefs.value, { forceRefresh })
    const locHour = new Date(Date.now() + data.utc_offset_seconds * 1000).getUTCHours()
    data.current.precipitation_probability =
      data.hourly?.precipitation_probability?.[locHour] ?? null
    silentRefresh.value = silent
    weatherData.value = data
    const maxDay = (data.daily?.time?.length ?? 1) - 1
    if (selectedDay.value > maxDay) selectedDay.value = maxDay
    if (locationName.value === 'Locating…' && data.timezone_abbreviation) {
      locationName.value = data.timezone ?? locationName.value
    }
    fetchedAt.value = new Date(timestamp)
    loadPwsData()
    syncTempestWs()
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

watch(openMeteoModel, () => { if (location.value) loadWeather(false, true) })

watch(activeDataType, checkAndRefresh)
watch(selectedDay,    checkAndRefresh)

// ── Location management ───────────────────────────────────────────────────────
function addToSaved(lat, lon, name, country) {
  const already = savedLocations.value.some(l => l.lat === lat && l.lon === lon)
  if (!already) {
    savedLocations.value = [...savedLocations.value, { lat, lon, name, ...(country ? { country } : {}) }]
    persistLocations(savedLocations.value)
  }
}

function clearGeoActive() {
  if (isGeoActive.value && location.value) clearWeatherCache(location.value.lat, location.value.lon)
  isGeoActive.value = false
  try { localStorage.removeItem(GEO_ACTIVE_KEY) } catch {}
}

function onLocationSelected({ lat, lon, name, country }) {
  if (tutorialStep.value === 1) tutPendingLocation.value = true
  clearGeoActive()
  location.value     = { lat, lon, ...(country ? { country } : {}) }
  locationName.value = name
  persistActive(location.value)
  addToSaved(lat, lon, name, country)
}

async function applyGeoLocation(lat, lon) {
  isGeoActive.value  = true
  location.value     = { lat, lon }
  locationName.value = 'Locating…'
  try { localStorage.setItem(GEO_ACTIVE_KEY, 'true') } catch {}
  try {
    const details = await reverseGeocodeDetails(lat, lon)
    const name = [details.name, details.admin1, details.country].filter(Boolean).join(', ')
    locationName.value = name
    location.value     = { lat, lon, ...(details.country ? { country: details.country } : {}) }
    persistActive(location.value)
  } catch {
    locationName.value = `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`
    persistActive(location.value)
  }
}

async function onGeoLocate({ lat, lon }) {
  if (tutorialStep.value === 1) tutPendingLocation.value = true
  await applyGeoLocation(lat, lon)
  panelOpen.value = false
}

function onPanelSelect(loc) {
  clearGeoActive()
  location.value     = { lat: loc.lat, lon: loc.lon, ...(loc.country ? { country: loc.country } : {}) }
  locationName.value = loc.name
  persistActive(location.value)
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
  refreshTimer = setInterval(() => { tickNow.value = Date.now(); if (location.value && isStale()) loadWeather(true, true) }, 30_000)
  scrollRootEl.value?.addEventListener('scroll', onScrollRoot, { passive: true })

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

function onScrollRoot() { topBarScrolled.value = (scrollRootEl.value?.scrollTop ?? 0) > 35 }

function onVisibilityChange() { if (document.visibilityState === 'visible') checkAndRefresh() }
document.addEventListener('visibilitychange', onVisibilityChange)

function onDocumentClick(e) {
  if (settingsOpen.value && !e.target.closest('.settings-dropdown') && !e.target.closest('[data-settings-btn]') && !e.target.closest('.modal-overlay') && !e.target.closest('.alert-modal-overlay')) {
    settingsOpen.value = false
  }
  if (panelOpen.value && !e.target.closest('.locations-sheet') && !e.target.closest('[data-locations-btn]')) {
    panelOpen.value = false
    tutSearching.value = false
  }
}
document.addEventListener('click', onDocumentClick)

function onOnline()  { isOffline.value = false; if (location.value) loadWeather() }
function onOffline() { isOffline.value = true }
window.addEventListener('online',  onOnline)
window.addEventListener('offline', onOffline)

onUnmounted(() => {
  clearInterval(refreshTimer)
  clearInterval(autoTimer)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  document.removeEventListener('click', onDocumentClick)
  window.removeEventListener('online',  onOnline)
  window.removeEventListener('offline', onOffline)
  scrollRootEl.value?.removeEventListener('scroll', onScrollRoot)
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
    location.value     = { lat: activeSaved.lat, lon: activeSaved.lon, ...(activeSaved.country ? { country: activeSaved.country } : {}) }
    locationName.value = activeSaved.name
  }
}
</script>

<style>
/* ── Global layout ───────────────────────────────────────────────────────── */
.app-shell {
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

/* ── Scroll container ────────────────────────────────────────────────────── */
.scroll-root {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  transition: filter 0.2s;
}
.scroll-root::-webkit-scrollbar { display: none; }
.scroll-root.blurred { filter: blur(2px); pointer-events: none; }

/* ── Scene block ─────────────────────────────────────────────────────────── */
.scene-block {
  position: relative;
  height: 300px;
  overflow: hidden;
  max-width: 640px;
  margin-left: auto;
  margin-right: auto;
}

.scene-top-bar {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 640px;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  pointer-events: none;
  transition: filter 0.2s, background 0.25s, backdrop-filter 0.25s;
}
.scene-top-bar.scrolled {
  background: rgba(10, 18, 32, 0.75);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}
.scene-top-bar.blurred {
  filter: blur(2px);
  pointer-events: none;
}
.scene-top-location {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  max-width: calc(100% - 120px);
  pointer-events: none;
  text-align: center;
}
.scene-top-name {
  display: block;
  font-size: 1.2rem;
  font-weight: 600;
  color: #fff;
  text-shadow: 0 1px 6px rgba(0,0,0,0.45);
  letter-spacing: -0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
.scene-top-datetime {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.75rem;
  font-weight: 400;
  color: rgba(255,255,255,0.7);
  text-shadow: 0 1px 4px rgba(0,0,0,0.4);
  white-space: nowrap;
  letter-spacing: 0.01em;
  transition: opacity 0.2s;
}
.scene-top-bar.scrolled .scene-top-datetime {
  opacity: 0;
  pointer-events: none;
}
.scene-top-btn {
  pointer-events: all;
  background: rgba(0,0,0,0.22);
  border: 1px solid rgba(255,255,255,0.22);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-radius: 9999px;
  width: 44px;
  height: 36px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.9);
  cursor: pointer;
  transition: background 0.2s;
}
.scene-top-btn:hover { background: rgba(0,0,0,0.38); }
.scene-top-btn.active {
  background: rgba(56,189,248,0.25);
  border-color: rgba(56,189,248,0.6);
  color: rgb(56,189,248);
}
.scene-top-btn.active:hover { background: rgba(56,189,248,0.35); }

/* ── Card stack ──────────────────────────────────────────────────────────── */
.card-stack {
  padding: 12px;
}

.card-stack-inner {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 640px;
  margin: 0 auto;
  width: 100%;
}

@media (min-width: 600px) {
  .card-stack { padding: 16px; }
  .card-stack--flat { padding-bottom: 40px; }
}

/* ── Flat card style ─────────────────────────────────────────────────────── */
.card-stack--flat {
}

.card-stack--flat .card-stack-inner {
  gap: 0;
}

.card-stack--flat .card {
  background: transparent;
  border-radius: 0;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.1);
}

.light-theme .card-stack--flat {
  background: #ffffff;
}

.light-theme .card-stack--flat .card {
  box-shadow: 0 1px 0 #e5e7eb;
}

.card-stack--flat .card:last-child {
  box-shadow: none;
}

/* ── Sim panel (positioned inside scene-block) ───────────────────────────── */
.sim-bar {
  position: absolute;
  bottom: 10px;
  right: 10px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
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
  color: #fff;
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
.sim-btn:hover { background: rgba(30, 50, 90, 0.85); border-color: rgba(255,255,255,0.4); }
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
.sim-reset:hover { background: rgba(56, 130, 246, 0.3); border-color: rgba(147, 197, 253, 0.6); }

.sim-toggle {
  font-size: 1.05rem;
  color: #fff;
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 9999px;
  width: 48px;
  height: 38px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: background 0.2s, border-color 0.2s;
  line-height: 1;
}
.sim-toggle:hover, .sim-toggle.sim-open { background: rgba(0, 0, 0, 0.5); }
.sim-toggle.sim-active {
  border-color: rgba(255, 210, 80, 0.9);
  animation: sim-pulse 2s ease-in-out infinite;
}
@keyframes sim-pulse {
  0%, 100% { box-shadow: 0 0 4px 1px rgba(255, 210, 80, 0.25); border-color: rgba(255, 210, 80, 0.5); }
  50%       { box-shadow: 0 0 8px 3px rgba(255, 210, 80, 0.55); border-color: rgba(255, 210, 80, 1.0); }
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

.offline-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px;
  text-align: center;
  color: #94a3b8;
}
.offline-icon { font-size: 2rem; }
.offline-title { font-size: 1.1rem; font-weight: 600; color: #cbd5e1; margin: 0; }
.offline-sub { font-size: 0.875rem; margin: 0; max-width: 240px; }

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

/* ── Customise Layout ───────────────────────────────────────────────────── */
.customise-layout-row {
  display: flex;
  justify-content: center;
  padding: 4px 16px 0;
}

.customise-layout-btn {
  background: var(--btn-bg);
  border: 1px solid var(--panel-border, rgba(255,255,255,0.08));
  border-radius: 8px;
  color: var(--text-muted);
  font-size: 0.82rem;
  font-weight: 500;
  padding: 7px 18px;
  cursor: pointer;
}
.customise-layout-btn:hover { color: var(--text); }
.customise-layout-row--flat { padding-top: 16px; }

/* ── Footer ─────────────────────────────────────────────────────────────── */
.data-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  font-size: 0.78rem;
  color: var(--text-faint);
  padding: 8px 0 16px;
}
.data-footer-row {
  display: flex;
  align-items: center;
  gap: 2px;
}
.data-footer a { color: var(--text-faint); text-decoration: none; }
.data-footer a:hover { color: var(--text-muted); }
.footer-model-btn { background: none; border: none; padding: 0; font: inherit; font-size: inherit; color: var(--text-faint); cursor: pointer; }
.footer-model-btn:hover { color: var(--text-muted); }

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
