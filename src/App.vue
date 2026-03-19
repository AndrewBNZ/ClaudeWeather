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
              @open-data-types="dataTypesModalOpen = true"
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
                  @open-units-modal="unitsModalOpen = true"
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
                  @open-units-modal="unitsModalOpen = true"
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
                  @open-units-modal="unitsModalOpen = true"
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
                  @open-units-modal="unitsModalOpen = true"
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

    <!-- Settings dropdown -->
    <Transition name="fade">
      <div v-if="settingsOpen" class="settings-clickaway" @click="settingsOpen = false" />
    </Transition>
    <Transition name="settings-drop">
      <div v-if="settingsOpen" class="settings-dropdown" :style="settingsDropdownStyle">
        <div class="settings-tabs">
          <button :class="['settings-tab', { active: settingsTab === 'display' }]" @click="settingsTab = 'display'">Display</button>
          <button :class="['settings-tab', { active: settingsTab === 'data' }]"    @click="settingsTab = 'data'">Data</button>
        </div>
        <div class="settings-body">
          <div class="settings-tab-pane" :class="{ 'settings-tab-pane--hidden': settingsTab !== 'display' }">
            <div class="setting-row setting-row--col">
              <div>
                <div class="setting-label">Theme</div>
                <div class="setting-hint">{{ { system: "Follows your device's theme preferences", light: 'Always light', dark: 'Always dark', auto: 'Light between 6am and 8pm, dark at night' }[theme] }}</div>
              </div>
              <div class="unit-pill">
                <button :class="['unit-pill-opt', { active: theme === 'system' }]" @click="theme = 'system'">Device</button>
                <button :class="['unit-pill-opt', { active: theme === 'light' }]"  @click="theme = 'light'">Light</button>
                <button :class="['unit-pill-opt', { active: theme === 'dark' }]"   @click="theme = 'dark'">Dark</button>
                <button :class="['unit-pill-opt', { active: theme === 'auto' }]"   @click="theme = 'auto'">Auto</button>
              </div>
            </div>
            <div class="setting-row">
              <div>
                <div class="setting-label">Time format</div>
                <div class="setting-hint">{{ timeFormat === '12h' ? '12-hour (1:00 pm)' : '24-hour (13:00)' }}</div>
              </div>
              <div class="unit-pill">
                <button :class="['unit-pill-opt', 'unit-pill-opt--sm', { active: timeFormat === '12h' }]" @click="timeFormat = '12h'">12h</button>
                <button :class="['unit-pill-opt', 'unit-pill-opt--sm', { active: timeFormat === '24h' }]" @click="timeFormat = '24h'">24h</button>
              </div>
            </div>
            <div class="setting-row">
              <div>
                <div class="setting-label">Swap chart positions</div>
                <div class="setting-hint">{{ dailyFirst ? 'Daily on top' : 'Hourly on top' }}</div>
              </div>
              <button class="toggle-switch" :class="{ on: dailyFirst }" @click="dailyFirst = !dailyFirst">
                <span class="toggle-thumb" />
              </button>
            </div>
            <div class="setting-row">
              <div>
                <div class="setting-label">Weather simulator</div>
                <div class="setting-hint">Preview weather effects on the scene</div>
              </div>
              <button class="toggle-switch" :class="{ on: showSim }" @click="showSim = !showSim">
                <span class="toggle-thumb" />
              </button>
            </div>
          </div>
          <div class="settings-tab-pane" :class="{ 'settings-tab-pane--hidden': settingsTab !== 'data' }">
            <div class="setting-row">
              <div>
                <div class="setting-label">Weather details</div>
                <div class="setting-hint">{{ tileConfig.filter(t => t.enabled).length }} of {{ tileConfig.length }} shown</div>
              </div>
              <button class="setting-action-btn" @click="dataTypesModalOpen = true">Manage →</button>
            </div>
            <div class="setting-row">
              <div>
                <div class="setting-label">Units</div>
                <div class="setting-hint">{{ unitPrefs.temperature === 'fahrenheit' ? '°F' : '°C' }} · {{ { kmh: 'km/h', mph: 'mph', ms: 'm/s', kn: 'kn' }[unitPrefs.wind] }} · {{ unitPrefs.precipitation === 'inch' ? 'in' : 'mm' }}</div>
              </div>
              <button class="setting-action-btn" @click="unitsModalOpen = true">Manage →</button>
            </div>
            <div class="setting-row">
              <div>
                <div class="setting-label">Weather Underground PWS</div>
                <div class="setting-hint">{{ pwsEnabled ? (pwsApiKey ? 'Your API key is saved on this device' : 'Set your API key to get started') : 'PWS data temporarily hidden' }}</div>
              </div>
              <div class="setting-row-controls">
                <button v-if="pwsEnabled" class="setting-action-btn" @click="openPwsKeyModal">{{ pwsApiKey ? 'Change →' : 'Set key →' }}</button>
                <button class="toggle-switch" :class="{ on: pwsEnabled }" @click="pwsEnabled = !pwsEnabled">
                  <span class="toggle-thumb" />
                </button>
              </div>
            </div>
            <div class="setting-row">
              <div>
                <div class="setting-label">Reset</div>
                <div class="setting-hint">Delete all preferences and locations</div>
              </div>
              <button class="setting-action-btn setting-action-btn--danger" @click="resetConfirmOpen = true">Reset →</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Units modal -->
    <transition name="modal-fade">
      <div v-if="unitsModalOpen" class="modal-overlay" @click.self="unitsModalOpen = false">
        <div class="modal-dialog modal-dialog--wide">
          <div class="modal-header">
            <span class="panel-title">Units</span>
            <button class="panel-close" @click="unitsModalOpen = false">✕</button>
          </div>
          <div class="units-modal-body">
            <div v-for="group in UNIT_OPTIONS" :key="group.key" class="unit-group">
              <div class="unit-group-label"><span class="unit-group-icon" v-html="TILE_ICONS[group.iconKey]"></span>{{ group.label }}</div>
              <div class="unit-group-pills">
                <button
                  v-for="opt in group.options"
                  :key="opt.value"
                  class="unit-modal-pill"
                  :class="{ active: unitPrefs[group.key] === opt.value }"
                  @click="unitPrefs = { ...unitPrefs, [group.key]: opt.value }"
                >{{ opt.label }}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- Data Types modal -->
    <transition name="modal-fade">
      <div v-if="dataTypesModalOpen" class="modal-overlay" @click.self="dataTypesModalOpen = false">
        <div class="modal-dialog">
          <div class="modal-header">
            <span class="panel-title">Weather Details</span>
            <button class="panel-close" @click="dataTypesModalOpen = false">✕</button>
          </div>
          <div class="modal-bulk-actions">
            <button class="modal-bulk-btn" @click="setAllTiles(true)">All On</button>
            <button class="modal-bulk-btn" @click="setAllTiles(false)">All Off</button>
          </div>
          <p class="modal-hint">Drag to reorder · tap to show/hide</p>
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
              <span class="tile-icon-label"><span class="tile-svg-icon" v-html="TILE_ICONS[tile.type]"></span>{{ TILE_META[tile.type].label }}</span>
              <button class="toggle-switch" :class="{ on: tile.enabled }" @click.stop="toggleTile(i)">
                <span class="toggle-thumb" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- Reset confirmation modal -->
    <transition name="modal-fade">
      <div v-if="resetConfirmOpen" class="modal-overlay" @click.self="resetConfirmOpen = false">
        <div class="modal-dialog modal-dialog--confirm">
          <div class="modal-header">
            <span class="panel-title">Reset everything?</span>
            <button class="panel-close" @click="resetConfirmOpen = false">✕</button>
          </div>
          <p class="reset-confirm-body">Your preferences and saved locations will be deleted and the app will restart.</p>
          <div class="reset-confirm-actions">
            <button class="setting-action-btn" @click="resetConfirmOpen = false">Cancel</button>
            <button class="setting-action-btn setting-action-btn--danger" @click="resetAll">Reset</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- PWS API key modal -->
    <transition name="modal-fade">
      <div v-if="pwsKeyModalOpen" class="modal-overlay" @click.self="pwsKeyModalOpen = false">
        <div class="modal-dialog modal-dialog--wide">
          <div class="modal-header">
            <span class="panel-title">Weather Underground PWS</span>
            <button class="panel-close" @click="pwsKeyModalOpen = false">✕</button>
          </div>
          <div class="modal-body pws-key-body">
            <div class="pws-key-about">
              <p>Connects {{ APP_NAME }} to Weather Underground personal weather stations (PWS), replacing current conditions with real local readings. Stations are set per location in the Locations panel.</p>
              <p>Free for station owners actively uploading to WU. Sign in at <strong>wunderground.com</strong> → <em>My Profile → Member Settings → API Keys</em>.</p>
            </div>
            <input v-model="pwsKeyInput" class="pws-key-input" type="text" placeholder="Paste your WU API key" spellcheck="false" autocomplete="off" @keyup.enter="savePwsKey" />
            <div class="pws-key-hint">Stored on this device only.</div>
            <div class="pws-key-actions">
              <button v-if="pwsApiKey" class="setting-action-btn setting-action-btn--danger" @click="clearPwsKey">Remove</button>
              <button class="setting-action-btn" @click="savePwsKey" :disabled="!pwsKeyInput.trim()">Save</button>
            </div>
          </div>
        </div>
      </div>
    </transition>

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
import { fetchWeather, clearWeatherCache } from './services/weatherApi.js'
import { getPwsObservations }              from './services/pwsApi.js'
import PwsPickerModal                      from './components/PwsPickerModal.vue'
import { reverseGeocode }      from './services/geocoding.js'
import { TILE_ICONS }          from './utils/tileIcons.js'
import { APP_NAME, APP_STORAGE_PREFIX } from './config.js'

// ── Persistence ───────────────────────────────────────────────────────────────
const P = APP_STORAGE_PREFIX
const PWS_KEY_STG       = `${P}-pws-key`
const PWS_ENABLED_STG   = `${P}-pws-enabled`
const TUTORIAL_KEY      = `${P}-tutorial-done`
const TUTORIAL_STEP_KEY = `${P}-tutorial-step`
const LOCATIONS_KEY   = `${P}-locations`
const ACTIVE_KEY      = `${P}-active`
const GEO_ACTIVE_KEY  = `${P}-geo-active`
const DATATYPE_KEY    = `${P}-datatype`
const UNIT_PREFS_KEY  = `${P}-unitprefs`
const LEGACY_UNITS_KEY = `${P}-units`
const SIM_KEY         = `${P}-sim`
const TILES_KEY       = `${P}-tiles`
const CHART_ORDER_KEY = `${P}-chartorder`
const TIME_FORMAT_KEY = `${P}-timeformat`
const LEGACY_KEY      = `${P}-location`
const THEME_KEY       = `${P}-theme`

// ── Unit preferences ──────────────────────────────────────────────────────────
const DEFAULT_UNIT_PREFS = { temperature: 'celsius', wind: 'kmh', precipitation: 'mm', pressure: 'hpa', visibility: 'km' }

const UNIT_OPTIONS = [
  { key: 'temperature',  iconKey: 'temperature', label: 'Temperature',  options: [{ value: 'celsius', label: '°C' }, { value: 'fahrenheit', label: '°F' }] },
  { key: 'wind',         iconKey: 'wind',        label: 'Wind Speed',   options: [{ value: 'kmh', label: 'km/h' }, { value: 'mph', label: 'mph' }, { value: 'ms', label: 'm/s' }, { value: 'kn', label: 'knots' }] },
  { key: 'precipitation',iconKey: 'rain',        label: 'Precipitation',options: [{ value: 'mm', label: 'mm' }, { value: 'inch', label: 'in' }] },
  { key: 'pressure',     iconKey: 'pressure',    label: 'Pressure',     options: [{ value: 'hpa', label: 'hPa' }, { value: 'inhg', label: 'inHg' }, { value: 'mmhg', label: 'mmHg' }] },
  { key: 'visibility',   iconKey: 'visibility',  label: 'Visibility',   options: [{ value: 'km', label: 'km' }, { value: 'mi', label: 'mi' }] },
]

function loadUnitPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(UNIT_PREFS_KEY))
    if (saved && typeof saved === 'object') return { ...DEFAULT_UNIT_PREFS, ...saved }
  } catch {}
  // Migrate from old metric/imperial toggle
  const legacy = localStorage.getItem(LEGACY_UNITS_KEY)
  if (legacy === 'imperial') return { temperature: 'fahrenheit', wind: 'mph', precipitation: 'inch', pressure: 'hpa', visibility: 'mi' }
  return { ...DEFAULT_UNIT_PREFS }
}

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
  radar:       { icon: '🛰️', label: 'Radar' },
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
  { type: 'radar',       enabled: true },
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
const theme          = ref(localStorage.getItem(THEME_KEY) ?? 'system')
const systemDark     = window.matchMedia('(prefers-color-scheme: dark)')
const systemIsDark   = ref(systemDark.matches)
function isAutoNight() { const h = new Date().getHours(); return h < 6 || h >= 20 }
const autoIsDark     = ref(isAutoNight())
const resolvedTheme  = computed(() => {
  if (theme.value === 'light') return 'light'
  if (theme.value === 'dark')  return 'dark'
  if (theme.value === 'auto')  return autoIsDark.value ? 'dark' : 'light'
  return systemIsDark.value ? 'dark' : 'light'
})
function applyTheme(v) {
  let isLight
  if (v === 'light')       isLight = true
  else if (v === 'dark')   isLight = false
  else if (v === 'auto')   isLight = !autoIsDark.value
  else                     isLight = !systemDark.matches
  document.documentElement.classList.toggle('light-theme', isLight)
}
applyTheme(theme.value)

const tileConfig     = ref(loadTileConfig())
const savedLocations = ref(loadSavedLocations())
const panelOpen             = ref(false)
const tutSearching          = ref(false)
const tutPendingLocation    = ref(false)
const settingsOpen          = ref(false)
const settingsTab           = ref('display')
const settingsDropdownStyle = ref({})
const dataTypesModalOpen  = ref(false)
const unitsModalOpen      = ref(false)
const resetConfirmOpen    = ref(false)
const pwsKeyModalOpen     = ref(false)
const pwsKeyInput         = ref('')
const pwsPickerLoc        = ref(null)
const pwsApiKey           = ref(localStorage.getItem(PWS_KEY_STG) ?? '')
const pwsEnabled          = ref(localStorage.getItem(PWS_ENABLED_STG) !== 'false')
const pwsData             = ref(null)
const showSim        = ref(localStorage.getItem(SIM_KEY) === 'true')
const dailyFirst     = ref(localStorage.getItem(CHART_ORDER_KEY) === 'true')
const timeFormat     = ref(localStorage.getItem(TIME_FORMAT_KEY) ?? '12h')
const isGeoActive    = ref(localStorage.getItem(GEO_ACTIVE_KEY) === 'true')
const location       = ref(null)   // { lat, lon }
const unitPrefs      = ref(loadUnitPrefs())
const activeDataType = ref(localStorage.getItem(DATATYPE_KEY) ?? 'temperature')
const selectedDay    = ref(0)      // 0 = today, 1–6 = forecast days
const weatherData    = ref(null)
const loading        = ref(false)
const error          = ref(null)
const updatedAt      = computed(() =>
  fetchedAt.value
    ? fetchedAt.value.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: timeFormat.value === '12h' }).toLowerCase()
    : ''
)
const activePwsStation = computed(() => {
  if (!location.value) return null
  const loc = savedLocations.value.find(l => l.lat === location.value.lat && l.lon === location.value.lon)
  return loc?.pwsStation ?? null
})

function convertPwsFields(obs, prefs) {
  const m = obs.metric
  if (!m) return {}
  const result = {}
  const toTemp = c => prefs.temperature === 'fahrenheit' ? c * 9 / 5 + 32 : c
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

function openPwsKeyModal() {
  pwsKeyInput.value = pwsApiKey.value
  pwsKeyModalOpen.value = true
}
function savePwsKey() {
  pwsApiKey.value = pwsKeyInput.value.trim()
  try { localStorage.setItem(PWS_KEY_STG, pwsApiKey.value) } catch {}
  pwsKeyModalOpen.value = false
}
function clearPwsKey() {
  pwsApiKey.value = ''
  try { localStorage.removeItem(PWS_KEY_STG) } catch {}
  pwsKeyModalOpen.value = false
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

const grassColor     = ref('#43A047')
const locationName   = ref('')
const fetchedAt      = ref(null)   // Date of last successful fetch

// ── Tutorial ──────────────────────────────────────────────────────────────────
// Resume from saved step if tutorial not yet done, otherwise hidden
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

const showFireworks   = ref(false)
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
  if (deferFireworks) {
    pendingFireworks.value = true
  } else {
    launchFireworks()
  }
}

function resetAll() {
  try { localStorage.clear() } catch {}
  window.location.reload()
}

// Auto-advance step 1 once a location is added and weather has loaded
watch([savedLocations, weatherData, isGeoActive], ([locs, data, geo]) => {
  if (tutorialStep.value === 1 && (locs.length > 0 || geo) && data) {
    setTimeout(() => { tutorialStep.value = 2; tutPendingLocation.value = false }, 600)
  }
}, { immediate: true })

// Finish tutorial when user opens settings on the last step; fire when they close it
watch(settingsOpen, (open) => {
  if (open && tutorialStep.value === 5) { finishTutorial(true); return }
  if (!open && pendingFireworks.value) { pendingFireworks.value = false; launchFireworks() }
  if (open) {
    const btn = document.querySelector('[data-settings-btn]')
    if (btn) {
      const rect = btn.getBoundingClientRect()
      const card = document.querySelector('.conditions')
      const cardRect = card?.getBoundingClientRect()
      if (cardRect) {
        settingsDropdownStyle.value = { top: `${rect.bottom + 6}px`, left: `${cardRect.left + 8}px`, right: `${window.innerWidth - cardRect.right + 8}px` }
      } else {
        const panelWidth = 320
        const rightEdge = Math.min(rect.right, window.innerWidth - 8)
        const leftEdge = Math.max(rightEdge - panelWidth, 8)
        settingsDropdownStyle.value = { top: `${rect.bottom + 6}px`, left: `${leftEdge}px`, width: `${panelWidth}px` }
      }
    }
  }
})

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
  if (location.value && isStale()) loadWeather(false, true)
}

function addToSaved(lat, lon, name) {
  const already = savedLocations.value.some(l => l.lat === lat && l.lon === lon)
  if (!already) {
    savedLocations.value = [...savedLocations.value, { lat, lon, name }]
    persistLocations(savedLocations.value)
  }
}

// ── Actions ───────────────────────────────────────────────────────────────────
function clearGeoActive() {
  if (isGeoActive.value && location.value) {
    clearWeatherCache(location.value.lat, location.value.lon)
  }
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

// Apply a geolocated position — shared by panel button and startup auto-geolocate
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
  // If deleting the active location (and not in geo mode), switch to first remaining or clear
  if (!isGeoActive.value && location.value?.lat === loc.lat && location.value?.lon === loc.lon) {
    const next = savedLocations.value[0] ?? null
    location.value     = next ? { lat: next.lat, lon: next.lon } : null
    locationName.value = next?.name ?? ''
    if (!next) weatherData.value = null
  }
}

async function loadWeather(silent = false, forceRefresh = false) {
  if (!location.value) return
  if (!silent || !weatherData.value) loading.value = true
  error.value   = null
  try {
    const { data, timestamp } = await fetchWeather(location.value.lat, location.value.lon, unitPrefs.value, { forceRefresh })
    // Stitch current hour's precipitation probability into the current object
    // (Open-Meteo only provides this in hourly, not current)
    const locHour = new Date(Date.now() + data.utc_offset_seconds * 1000).getUTCHours()
    data.current.precipitation_probability =
      data.hourly?.precipitation_probability?.[locHour] ?? null
    weatherData.value = data
    // Use timezone abbreviation from response as a location hint when geolocating
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

// Re-fetch whenever location changes; also reset to today
watch(location, (loc) => { if (loc) { selectedDay.value = 0; loadWeather() } })
// Persist unit prefs; only re-fetch when API-side units change (temp/wind/precip)
watch(unitPrefs, (newVal, oldVal) => {
  try { localStorage.setItem(UNIT_PREFS_KEY, JSON.stringify(newVal)) } catch {}
  const apiChanged = ['temperature', 'wind', 'precipitation'].some(k => newVal[k] !== oldVal[k])
  if (location.value && apiChanged) loadWeather()
}, { deep: true })
watch(showSim,    (v) => localStorage.setItem(SIM_KEY, String(v)))
watch(pwsEnabled, (v) => {
  localStorage.setItem(PWS_ENABLED_STG, String(v))
  if (!v) pwsData.value = null
  else loadPwsData()
})
watch(dailyFirst, (v) => localStorage.setItem(CHART_ORDER_KEY, String(v)))
watch(timeFormat, (v) => localStorage.setItem(TIME_FORMAT_KEY, v))
systemDark.addEventListener('change', (e) => { systemIsDark.value = e.matches; if (theme.value === 'system') applyTheme('system') })
watch(autoIsDark, () => { if (theme.value === 'auto') applyTheme('auto') })
watch(theme,      (v) => {
  localStorage.setItem(THEME_KEY, v)
  applyTheme(v)
})
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

function setAllTiles(enabled) {
  tileConfig.value = tileConfig.value.map(t => ({ ...t, enabled }))
  if (!enabled) activeDataType.value = 'temperature'
}

function onTileDragStart(e, i) { tileDragIndex.value = i; e.dataTransfer.effectAllowed = 'move' }
function onTileDragOver(e, i)  { e.preventDefault(); tileDragOver.value = i }
function onTileDragEnd()       { tileDragIndex.value = null; tileDragOver.value = null }
function onTileDrop(e, i) {
  e.preventDefault()
  if (tileDragIndex.value !== null && tileDragIndex.value !== i) reorderTiles(tileDragIndex.value, i)
  tileDragIndex.value = null; tileDragOver.value = null
}

function onTileTouchStart(_e, i) { tileTouchIdx = i; tileTouchMoved = false; tileDragIndex.value = i }
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

let autoTimer = null

// ── Auto-refresh ──────────────────────────────────────────────────────────────
let refreshTimer = null
onMounted(() => {
  autoTimer = setInterval(() => { autoIsDark.value = isAutoNight() }, 60_000)
  refreshTimer = setInterval(() => {
    if (location.value && isStale()) loadWeather(true, true)
  }, 30_000)

  // If "Current Location" was the last active selection, re-geolocate silently
  if (isGeoActive.value) {
    loading.value = true
    if (!navigator.geolocation) {
      loading.value = false
      clearGeoActive()
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => { await applyGeoLocation(pos.coords.latitude, pos.coords.longitude) },
      () => { loading.value = false; clearGeoActive() },
      { timeout: 10000 }
    )
  }
})
function onVisibilityChange() {
  if (document.visibilityState === 'visible') {
    checkAndRefresh()
  }
}
document.addEventListener('visibilitychange', onVisibilityChange)
onUnmounted(() => {
  clearInterval(refreshTimer)
  clearInterval(autoTimer)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})

// On load: restore last active location (or fall back to first saved).
// Skip if "Current Location" is active — onMounted will geolocate instead.
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
.locations-btn.active:hover, .settings-btn.active:hover {
  background: rgba(56, 189, 248, 0.22);
}

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

  /* Pin the weather layout to a known height so both columns can share
     the same source of truth. 75px ≈ main-padding(28) + gap+footer(47).
     Both columns then fill this via align-items:stretch. */
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

  /* Inner wrapper inherits the flex-column fill so layout-chart children still stretch */
  .layout-charts-inner {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  /* Each chart tile gets an equal share of the right column */
  .layout-chart {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* Card fills the tile, becomes a flex column so chart-wrap can grow */
  .layout-chart .chart-card {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  /* HourlyChart's chart-area must stretch to pass height down to chart-wrap */
  .layout-chart .chart-area {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  /* Chart canvas area fills remaining card height instead of fixed px */
  .layout-chart .chart-wrap {
    flex: 1;
    min-height: 140px;
    height: auto !important;
  }

  /* Radar card fills the tile; map grows to fill card */
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

.loading-dots {
  display: flex;
  gap: 7px;
}
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
.data-footer a {
  color: var(--text-faint);
  text-decoration: none;
}
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

@keyframes spin {
  to { transform: rotate(360deg); }
}
.spinning {
  display: inline-block;
  animation: spin 0.8s linear infinite;
}

/* ── Settings dropdown ───────────────────────────────────────────────────── */
.settings-clickaway {
  position: fixed;
  inset: 0;
  z-index: 200;
}

.settings-dropdown {
  position: fixed;
  z-index: 201;
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.settings-tabs {
  display: flex;
  border-bottom: 1px solid var(--panel-border);
}

.settings-tab {
  flex: 1;
  padding: 14px 0;
  background: none;
  border: none;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.15s;
  position: relative;
}

.settings-tab::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 10%;
  right: 10%;
  height: 2px;
  background: var(--accent);
  border-radius: 2px;
  opacity: 0;
  transition: opacity 0.15s;
}

.settings-tab.active {
  color: var(--text);
}

.settings-tab.active::after {
  opacity: 1;
}

.panel-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text);
}

.panel-close {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1.1rem;
  padding: 4px 8px;
  transition: color 0.15s;
}
.panel-close:hover { color: var(--text); }

.settings-body {
  display: grid;
}

.settings-tab-pane {
  grid-area: 1 / 1;
  padding: 8px 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  max-height: calc(100dvh - 80px);
}

.settings-tab-pane--hidden {
  visibility: hidden;
  pointer-events: none;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--row-border);
}

.setting-row--col {
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
}

.setting-row-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.setting-label {
  font-size: 0.9rem;
  color: var(--text);
  font-weight: 500;
}

.setting-hint {
  font-size: 0.75rem;
  color: var(--text-faint);
  margin-top: 2px;
}


.toggle-switch {
  flex-shrink: 0;
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background: var(--toggle-bg);
  border: 1px solid var(--toggle-border);
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
  border-top: 1px solid var(--tile-border);
  transition: background 0.15s, opacity 0.15s;
  touch-action: none;
}
.tile-row:active { cursor: grabbing; }

.tile-drag-handle {
  color: var(--text-faint);
  font-size: 1.1rem;
  flex-shrink: 0;
  line-height: 1;
}

.tile-icon-label {
  flex: 1;
  font-size: 0.88rem;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 8px;
}
.tile-svg-icon { display: flex; align-items: center; flex-shrink: 0; }
.tile-svg-icon svg { width: 18px; height: 18px; }

.tile-dragging {
  opacity: 0.35;
}

.tile-drag-over {
  background: rgba(56, 189, 248, 0.08);
  border-top-color: rgba(56, 189, 248, 0.35);
}

.settings-drop-enter-active, .settings-drop-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
  transform-origin: top right;
}
.settings-drop-enter-from, .settings-drop-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-6px);
}

/* ── PWS key modal ───────────────────────────────────────────────────────── */
.modal-body {
  padding: 0 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pws-key-input {
  width: 100%;
  box-sizing: border-box;
  background: var(--btn-bg);
  border: 1px solid var(--panel-border);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 0.875rem;
  font-family: monospace;
  color: var(--text);
  outline: none;
  transition: border-color 0.15s;
}
.pws-key-input:focus { border-color: #38bdf8; }

.pws-key-about {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.pws-key-about p {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.5;
}
.pws-key-about strong { color: inherit; font-weight: 600; }
.pws-key-about em { font-style: normal; color: inherit; }

.pws-key-hint {
  font-size: 0.78rem;
  color: var(--text-faint);
  line-height: 1.5;
}

.pws-key-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* ── Data Types modal ────────────────────────────────────────────────────── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-dialog {
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: 16px;
  width: 340px;
  max-width: calc(100vw - 32px);
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-dialog--wide {
  width: 460px;
}

.modal-dialog--confirm {
  width: 320px;
}

.reset-confirm-body {
  padding: 0 20px 16px;
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.reset-confirm-actions {
  display: flex;
  gap: 8px;
  padding: 0 20px 20px;
  justify-content: flex-end;
}


.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 12px;
}

.modal-bulk-actions {
  display: flex;
  gap: 8px;
  padding: 0 20px 8px;
}

.modal-bulk-btn {
  padding: 4px 12px;
  border-radius: 9999px;
  border: 1px solid var(--btn-border);
  background: var(--btn-bg);
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 600;
  transition: background 0.15s, color 0.15s;
}

.modal-bulk-btn:hover {
  background: var(--btn-hover);
  color: var(--text);
}

.modal-hint {
  font-size: 0.75rem;
  color: var(--text-faint);
  padding: 0 20px 8px;
  margin: 0;
}

.modal-dialog .tile-list {
  overflow-y: auto;
  padding-bottom: 8px;
}

.units-modal-body {
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow-y: auto;
  padding-bottom: 8px;
}

.unit-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 20px;
  border-top: 1px solid var(--tile-border);
}

.unit-group-label {
  font-size: 0.88rem;
  color: var(--text);
  font-weight: 500;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 8px;
}
.unit-group-icon { display: flex; align-items: center; flex-shrink: 0; }
.unit-group-icon svg { width: 18px; height: 18px; }

.unit-group-pills {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.unit-modal-pill {
  padding: 5px 12px;
  border-radius: 9999px;
  border: 1px solid var(--pill-border);
  background: none;
  color: var(--text-muted);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.unit-modal-pill:hover:not(.active) {
  background: var(--btn-hover);
  color: var(--text);
}
.unit-modal-pill.active {
  background: rgba(56, 189, 248, 0.18);
  border-color: rgba(56, 189, 248, 0.5);
  color: #38bdf8;
}

.unit-pill {
  display: flex;
  border: 1px solid var(--pill-border);
  border-radius: 9999px;
  overflow: hidden;
}

.setting-row--col .unit-pill {
  border-radius: 10px;
}

.setting-row--col .unit-pill-opt {
  flex: 1;
  text-align: center;
}

.unit-pill-opt--sm {
  padding: 4px 10px;
  font-size: 0.8rem;
}

.unit-pill-opt {
  padding: 5px 14px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
  background: none;
  border: none;
  transition: background 0.15s, color 0.15s;
}
.unit-pill-opt.active {
  background: rgba(56,189,248,0.18);
  color: #38bdf8;
}

.setting-action-btn {
  flex-shrink: 0;
  padding: 6px 14px;
  border-radius: 9999px;
  background: var(--btn-bg);
  border: 1px solid var(--btn-border);
  color: var(--text-muted);
  font-size: 0.83rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.setting-action-btn:hover {
  background: var(--btn-hover);
  color: var(--text);
}

.setting-action-btn--danger {
  color: #f87171;
  border-color: rgba(248, 113, 113, 0.3);
}
.setting-action-btn--danger:hover {
  background: rgba(248, 113, 113, 0.12);
  color: #f87171;
}

.reset-confirm-actions .setting-action-btn--danger {
  background: #ee0033;
  color: #fff;
  border-color: transparent;
}
.reset-confirm-actions .setting-action-btn--danger:hover {
  background: #cc0029;
  color: #fff;
}

.modal-fade-enter-active, .modal-fade-leave-active {
  transition: opacity 0.2s;
}
.modal-fade-enter-active .modal-dialog,
.modal-fade-leave-active .modal-dialog {
  transition: transform 0.2s ease, opacity 0.2s;
}
.modal-fade-enter-from, .modal-fade-leave-to {
  opacity: 0;
}
.modal-fade-enter-from .modal-dialog,
.modal-fade-leave-to .modal-dialog {
  transform: scale(0.95);
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
