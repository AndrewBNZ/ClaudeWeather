<template>
  <Teleport to="body">
  <Transition name="settings-sheet-overlay">
    <div v-if="isOpen" class="settings-sheet-overlay" @click.self="$emit('close')">
      <div class="settings-dropdown" @click.stop>
        <div class="settings-header" :class="{ 'settings-header--sub': subPanel }">
          <!-- Back button (sub-panel only) -->
          <button v-if="subPanel" class="settings-header-back" @click.stop="navigateBack()" aria-label="Back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <!-- Title -->
          <span v-if="!subPanel" class="settings-panel-title">Settings</span>
          <span v-else class="settings-panel-title settings-panel-title--sub">{{ subPanelTitle }}</span>
          <!-- Right-side actions -->
          <div class="settings-header-actions">
            <button
              v-if="subPanel === 'customAlerts' && alertsEditorPage === 'editor'"
              class="setting-action-btn sub-panel-save-btn"
              :disabled="!customAlertsRef?.canSave"
              @click="customAlertsRef?.saveAlert()"
            >Save</button>
            <button class="settings-tab-close" @click="$emit('close')">✕</button>
          </div>
        </div>
      <div class="settings-tabs" :class="{ 'settings-tabs--collapsed': subPanel, 'settings-tabs--seq-forward': navDir === 'forward', 'settings-tabs--seq-back': seqBack }">
        <button :class="['settings-tab', { active: tab === 'display' }]"  @click="switchTab('display')">Display</button>
        <button :class="['settings-tab', { active: tab === 'layout' }]"   @click="switchTab('layout')">Layout</button>
        <button :class="['settings-tab', { active: tab === 'data' }]"     @click="switchTab('data')">Data</button>
      </div>
      <div class="settings-body" :data-slide="slideDir" :class="{ 'settings-body--navigating': navigating, 'settings-body--seq-back': seqBack }" @touchstart.passive="onBodyTouchStart" @touchend.passive="onBodyTouchEnd">
        <!-- Display tab -->
        <div class="settings-tab-pane" :data-pane="'display'" :class="paneClass('display')">
          <div class="settings-group">
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
            <button class="setting-row setting-row--nav" @click="navigate('units')">
              <div>
                <div class="setting-label">Units</div>
                <div class="setting-hint">{{ unitPrefs.temperature === 'fahrenheit' ? '°F' : '°C' }} · {{ { kmh: 'km/h', mph: 'mph', ms: 'm/s', kn: 'kn' }[unitPrefs.wind] }} · {{ unitPrefs.precipitation === 'inch' ? 'in' : 'mm' }}</div>
              </div>
              <svg class="setting-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
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
                <div class="setting-label">Style</div>
                <div class="setting-hint">{{ cardStyle === 'cards' ? 'Cards with rounded backgrounds' : 'Flat list with dividers' }}</div>
              </div>
              <div class="unit-pill">
                <button :class="['unit-pill-opt', 'unit-pill-opt--sm', { active: cardStyle === 'cards' }]" @click="cardStyle = 'cards'">Cards</button>
                <button :class="['unit-pill-opt', 'unit-pill-opt--sm', { active: cardStyle === 'flat' }]"  @click="cardStyle = 'flat'">Flat</button>
              </div>
            </div>
          </div>
          <div class="settings-group">
            <div class="setting-row">
              <div>
                <div class="setting-label">Installed version</div>
                <div class="setting-hint">{{ appVersion }}</div>
              </div>
              <button class="setting-action-btn" @click="openWhatsNew">What's New →</button>
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
        </div>

        <!-- Units display sub-panel -->
        <div class="settings-tab-pane" :data-pane="'units'" :class="paneClass('units')">
          <UnitsSettings />
        </div>

        <!-- Layout tab -->
        <div class="settings-tab-pane" :data-pane="'layout'" :class="paneClass('layout')">
          <div class="settings-group">
            <button class="setting-row setting-row--nav" @click="navigate('sceneConditions')">
              <div class="setting-row-label-group" style="flex:1;min-width:0;">
                <span class="card-icon" v-html="CARD_ICONS.sceneConditions"></span>
                <div>
                  <div class="setting-label">Current Conditions</div>
                  <div class="setting-hint" style="display: none;">Configure the scene overlay data points</div>
                </div>
              </div>
              <svg class="setting-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <div v-for="(card, i) in cardConfig" :key="card.type"
              :data-card-idx="i"
              class="setting-row setting-row--draggable"
              :class="{ 'tile-dragging': cardDragIndex === i, 'tile-drag-over': cardDragOver === i && cardDragIndex !== i, 'setting-row--nav': CARD_SUBPANEL[card.type] && card.enabled }"
              draggable="true"
              @click="CARD_SUBPANEL[card.type] && card.enabled && navigate(CARD_SUBPANEL[card.type])"
              @dragstart="onCardDragStart($event, i)"
              @dragover="onCardDragOver($event, i)"
              @dragend="onCardDragEnd"
              @drop="onCardDrop($event, i)"
              @touchstart.passive="onCardTouchStart($event, i)"
            >
              <span class="tile-drag-handle">⠿</span>
              <div class="setting-row-nav-btn setting-row-nav-btn--static">
                <div class="setting-row-label-group">
                  <span class="card-icon" v-html="CARD_ICONS[card.type]"></span>
                  <div>
                    <div class="setting-label">{{ CARD_META[card.type].label }}</div>
                    <div class="setting-hint" style="display: none;">{{ CARD_HINTS[card.type] }}</div>
                  </div>
                </div>
              </div>
              <button class="toggle-switch" :class="{ on: card.enabled }" @click.stop="toggleCard(card.type)">
                <span class="toggle-thumb" />
              </button>
              <button
                v-if="CARD_SUBPANEL[card.type] && card.enabled"
                class="setting-chevron-btn"
                @click.stop="navigate(CARD_SUBPANEL[card.type])"
              >
                <svg class="setting-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
              <div v-else class="setting-chevron-placeholder"></div>
            </div>
          </div>
        </div>

        <!-- Current Conditions layout sub-panel -->
        <div class="settings-tab-pane" :data-pane="'sceneConditions'" :class="paneClass('sceneConditions')">
          <SceneConditionsSettings />
        </div>

        <!-- Hourly Forecast layout sub-panel -->
        <div class="settings-tab-pane" :data-pane="'hourlyForecast'" :class="paneClass('hourlyForecast')">
          <HourlyForecastSettings />
        </div>

        <!-- Daily Forecast layout sub-panel -->
        <div class="settings-tab-pane" :data-pane="'dailyForecast'" :class="paneClass('dailyForecast')">
          <DailyForecastSettings />
        </div>

        <!-- Custom Alerts layout sub-panel -->
        <div class="settings-tab-pane settings-tab-pane--flush" :data-pane="'customAlerts'" :class="paneClass('customAlerts')">
          <CustomAlertsSettings ref="customAlertsRef" :active="subPanel === 'customAlerts'" :edit-alert-id="props.editAlertId" @page-change="onAlertsPageChange" />
        </div>

        <!-- Weather Warnings layout sub-panel -->
        <div class="settings-tab-pane" :data-pane="'weatherWarnings'" :class="paneClass('weatherWarnings')">
          <WeatherWarningsSettings :location-country="props.locationCountry" />
        </div>

        <!-- Data tab -->
        <div class="settings-tab-pane" :data-pane="'data'" :class="paneClass('data')">
          <div class="settings-group">
            <button class="setting-row setting-row--nav" @click="navigate('forecastModel')">
              <div>
                <div class="setting-label">Forecast model</div>
                <div class="setting-hint">{{ OPEN_METEO_MODELS.find(m => m.value === openMeteoModel)?.label }}</div>
              </div>
              <svg class="setting-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <button class="setting-row setting-row--nav" @click="navigate('pwsKey')">
              <div>
                <div class="setting-label">Weather Underground PWS</div>
                <div class="setting-hint">{{ pwsEnabled ? (pwsApiKey ? 'Set stations in locations panel' : 'Set your API key to get started') : 'WU data temporarily hidden' }}</div>
              </div>
              <div class="toggle-switch" :class="{ on: pwsEnabled }" @click.stop="pwsEnabled = !pwsEnabled">
                <span class="toggle-thumb" />
              </div>
              <svg class="setting-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <button class="setting-row setting-row--nav" @click="navigate('tempestToken')">
              <div>
                <div class="setting-label">Tempest PWS</div>
                <div class="setting-hint">{{ tempestEnabled ? (tempestToken ? 'Set stations in locations panel' : 'Set your access token to get started') : 'Tempest data temporarily hidden' }}</div>
              </div>
              <div class="toggle-switch" :class="{ on: tempestEnabled }" @click.stop="tempestEnabled = !tempestEnabled">
                <span class="toggle-thumb" />
              </div>
              <svg class="setting-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
          <div class="settings-group">
            <div class="setting-row">
              <div>
                <div class="setting-label">Reset</div>
                <div class="setting-hint">Delete all settings and locations</div>
              </div>
              <button class="setting-action-btn setting-action-btn--danger" @click="resetConfirmOpen = true">Reset →</button>
            </div>
          </div>
        </div>

        <!-- Forecast Model data sub-panel -->
        <div class="settings-tab-pane" :data-pane="'forecastModel'" :class="paneClass('forecastModel')">
          <ForecastModelSettings />
        </div>

        <!-- Weather Underground PWS data sub-panel -->
        <div class="settings-tab-pane" :data-pane="'pwsKey'" :class="paneClass('pwsKey')">
          <PwsKeySettings />
        </div>

        <!-- Tempest PWS data sub-panel -->
        <div class="settings-tab-pane" :data-pane="'tempestToken'" :class="paneClass('tempestToken')">
          <TempestTokenSettings />
        </div>

      </div>
      </div>
    </div>
  </Transition>
  </Teleport>

  <!-- Data Types modal -->
  <transition name="modal-fade">
    <DataTypesModal v-if="dataTypesModalOpen" @close="dataTypesModalOpen = false" />
  </transition>

  <!-- Reset confirmation modal -->
  <transition name="modal-fade">
    <div v-if="resetConfirmOpen" class="modal-overlay" @click.self="resetConfirmOpen = false">
      <div class="modal-dialog modal-dialog--confirm">
        <div class="modal-header">
          <span class="panel-title">Reset everything?</span>
          <button class="panel-close" @click="resetConfirmOpen = false">✕</button>
        </div>
        <p class="reset-confirm-body">Your settings and saved locations will be deleted and the app will restart.</p>
        <div class="reset-confirm-actions">
          <button class="setting-action-btn" @click="resetConfirmOpen = false">Cancel</button>
          <button class="setting-action-btn setting-action-btn--danger" @click="resetAll">Reset</button>
        </div>
      </div>
    </div>
  </transition>

</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import { useSettings, CARD_META } from '../composables/useSettings.js'
import { CARD_ICONS } from '../utils/tileIcons.js'
import { showWhatsNew } from '../composables/useWhatsNew.js'
import { MODELS as OPEN_METEO_MODELS } from '../services/adapters/openMeteo.js'
import DailyForecastSettings      from './settings/DailyForecastSettings.vue'
import HourlyForecastSettings    from './settings/HourlyForecastSettings.vue'
import SceneConditionsSettings   from './settings/SceneConditionsSettings.vue'
import WeatherWarningsSettings   from './settings/WeatherWarningsSettings.vue'
import CustomAlertsSettings      from './settings/CustomAlertsSettings.vue'
import ForecastModelSettings from './settings/ForecastModelSettings.vue'
import PwsKeySettings        from './settings/PwsKeySettings.vue'
import TempestTokenSettings  from './settings/TempestTokenSettings.vue'
import DataTypesModal        from './settings/DataTypesModal.vue'
import UnitsSettings         from './settings/UnitsSettings.vue'

const props = defineProps({
  isOpen:          Boolean,
  locationCountry: { type: String, default: null },
  editAlertId:     { type: String, default: null },
})
const emit = defineEmits(['close'])
function jumpToSubPanel(sub) {
  const DATA_SUBPANELS    = ['forecastModel', 'pwsKey', 'tempestToken']
  const DISPLAY_SUBPANELS = ['units']
  activePane.value = sub
  prevPane.value   = null
  if (DATA_SUBPANELS.includes(sub))    { tab.value = 'data';    subPanel.value = sub }
  else if (DISPLAY_SUBPANELS.includes(sub)) { tab.value = 'display'; subPanel.value = sub }
  else                                  { tab.value = 'layout';  subPanel.value = sub }
}

defineExpose({
  openUnitsModal:     () => navigate('units'),
  openDataTypesModal: () => { dataTypesModalOpen.value = true },
  openModelModal:     () => navigate('forecastModel'),
  openToSubPanel:     (sub) => jumpToSubPanel(sub),
  openTab:            (tabName) => { tab.value = tabName; subPanel.value = null; activePane.value = tabName; prevPane.value = null },
})

function openWhatsNew() { showWhatsNew.value = true }

const appVersion = __APP_VERSION__

const {
  theme, cardStyle, timeFormat, showSim,
  cardConfig, unitPrefs, pwsEnabled, pwsApiKey, tempestEnabled, tempestToken, openMeteoModel,
  toggleCard, reorderCards,
} = useSettings()

const CARD_SUBPANEL = { combinedHourly: 'hourlyForecast', dailyForecast: 'dailyForecast', customAlerts: 'customAlerts', weatherWarnings: 'weatherWarnings' }
const CARD_HINTS = {
  combinedHourly:  'Configure the hourly forecast card',
  dailyForecast:   'Configure the daily forecast card',
  sunriseMoon:     'Sunrise, sunset and moon phase',
  radar:           'Radar map',
  customAlerts:    'Set up custom weather alerts',
  weatherWarnings: 'Configure the weather warnings feed',
}

// ── Card drag-and-drop ────────────────────────────────────────────────────────
const cardDragIndex = ref(null)
const cardDragOver  = ref(null)
let   cardTouchIdx   = null
let   cardTouchMoved = false

function onCardDragStart(e, i) { cardDragIndex.value = i; e.dataTransfer.effectAllowed = 'move' }
function onCardDragOver(e, i)  { e.preventDefault(); cardDragOver.value = i }
function onCardDragEnd()       { cardDragIndex.value = null; cardDragOver.value = null }
function onCardDrop(e, i) {
  e.preventDefault()
  if (cardDragIndex.value !== null && cardDragIndex.value !== i) reorderCards(cardDragIndex.value, i)
  cardDragIndex.value = null; cardDragOver.value = null
}
function onCardTouchStart(e, i) {
  if (!e.target.closest('.tile-drag-handle')) return
  cardTouchIdx = i; cardTouchMoved = false; cardDragIndex.value = i
  document.addEventListener('touchmove', _onCardTouchMove, { passive: false })
  document.addEventListener('touchend', _onCardTouchEnd)
}
function _onCardTouchMove(e) {
  e.preventDefault()
  cardTouchMoved = true
  const touch = e.touches[0]
  const el    = document.elementFromPoint(touch.clientX, touch.clientY)
  const row   = el?.closest('[data-card-idx]')
  cardDragOver.value = row ? parseInt(row.dataset.cardIdx) : null
}
function _onCardTouchEnd() {
  if (cardTouchMoved && cardTouchIdx !== null && cardDragOver.value !== null && cardTouchIdx !== cardDragOver.value) {
    reorderCards(cardTouchIdx, cardDragOver.value)
  }
  cardTouchIdx = null; cardTouchMoved = false; cardDragIndex.value = null; cardDragOver.value = null
  document.removeEventListener('touchmove', _onCardTouchMove)
  document.removeEventListener('touchend', _onCardTouchEnd)
}

// ── Local state ───────────────────────────────────────────────────────────────
const tab            = ref('display')
const subPanel       = ref(null)
const subPanelTitles = { units: 'Units', sceneConditions: 'Current Conditions', hourlyForecast: 'Hourly Forecast', dailyForecast: 'Daily Forecast', customAlerts: 'Custom Alerts', weatherWarnings: 'Weather Warnings', forecastModel: 'Forecast Model', pwsKey: 'Weather Underground PWS', tempestToken: 'Tempest PWS' }
const alertsEditorPage  = ref('list')   // 'list' | 'editor'
const alertsEditorTitle = ref('')
const subPanelTitle  = computed(() => {
  if (subPanel.value === 'customAlerts' && alertsEditorPage.value === 'editor') return alertsEditorTitle.value
  return subPanelTitles[subPanel.value] ?? ''
})

const customAlertsRef = ref(null)

watch(() => props.isOpen, (open) => {
  if (!open) {
    tab.value           = 'display'
    subPanel.value      = null
    activePane.value    = 'display'
    prevPane.value      = null
    alertsEditorPage.value  = 'list'
    alertsEditorTitle.value = ''
  }
})

function onAlertsPageChange({ page, title }) {
  alertsEditorPage.value  = page
  alertsEditorTitle.value = title ?? ''
}

// ── Panel slide navigation ────────────────────────────────────────────────────
// activePane tracks which pane is visible; prevPane is the one animating out.
// slideDir drives CSS: 'forward' → new pane slides in from right; 'back' → from left.
const activePane   = ref('display')   // display | layout | data | <subpanel key>
const prevPane     = ref(null)
const slideDir     = ref('forward')
const animating    = ref(false)
const navigating   = ref(false)       // true only during an explicit navigation, not on initial open

const SLIDE_DURATION = 280
const TABS_DURATION  = 240
const navDir  = ref(null)   // 'forward' | 'back' | null — drives sequenced tab/pane delay
const seqBack = ref(false)  // true only when leaving a sub-panel (tabs need to expand first)

function paneClass(name) {
  if (name === activePane.value) return 'settings-tab-pane--active'
  if (name === prevPane.value)   return 'settings-tab-pane--leaving'
  return 'settings-tab-pane--hidden'
}

const TOP_TABS = ['display', 'layout', 'data']

function navigate(target) {
  if (animating.value || target === activePane.value) return
  const fromTop = TOP_TABS.includes(activePane.value)
  const toTop   = TOP_TABS.includes(target)
  prevPane.value   = activePane.value
  // forward: going into a sub-panel, or moving right along tabs
  // back: leaving a sub-panel to a top tab, or moving left along tabs
  if (!fromTop && toTop) {
    slideDir.value = 'back'
  } else if (fromTop && !toTop) {
    slideDir.value = 'forward'
  } else if (toTop && fromTop) {
    const order = TOP_TABS
    slideDir.value = order.indexOf(target) > order.indexOf(activePane.value) ? 'forward' : 'back'
  } else {
    slideDir.value = 'forward'
  }
  seqBack.value    = !fromTop && toTop  // only sequence when leaving a sub-panel
  activePane.value = target
  // sync tab / subPanel for header logic
  const DATA_SUBPANELS    = ['forecastModel', 'pwsKey', 'tempestToken']
  const DISPLAY_SUBPANELS = ['units']
  if (toTop) {
    tab.value = target; subPanel.value = null
  } else if (DATA_SUBPANELS.includes(target)) {
    tab.value = 'data'; subPanel.value = target
  } else if (DISPLAY_SUBPANELS.includes(target)) {
    tab.value = 'display'; subPanel.value = target
  } else {
    tab.value = 'layout'; subPanel.value = target
  }
  _runAnim()
}

function navigateBack() {
  if (animating.value) return
  if (subPanel.value === 'customAlerts' && alertsEditorPage.value === 'editor') {
    customAlertsRef.value?.cancelEditor()
    return
  }
  const DATA_SUBPANELS    = ['forecastModel', 'pwsKey', 'tempestToken']
  const DISPLAY_SUBPANELS = ['units']
  const target = DATA_SUBPANELS.includes(subPanel.value) ? 'data' : DISPLAY_SUBPANELS.includes(subPanel.value) ? 'display' : 'layout'
  prevPane.value   = activePane.value
  slideDir.value   = 'back'
  seqBack.value    = true
  activePane.value = target
  tab.value = target; subPanel.value = null
  _runAnim()
}

function _runAnim() {
  animating.value  = true
  navigating.value = true
  navDir.value     = slideDir.value
  const total = SLIDE_DURATION + TABS_DURATION
  nextTick(() => {
    setTimeout(() => {
      prevPane.value  = null
      animating.value = false
    }, SLIDE_DURATION)
    setTimeout(() => {
      navigating.value = false
      navDir.value     = null
      seqBack.value    = false
    }, total)
  })
}

// Keep tab clicks in sync (Display / Layout / Data tabs)
function switchTab(name) {
  navigate(name)
}

// ── Swipe left/right to switch top-level tabs ─────────────────────────────────
let swipeTouchStartX = 0
let swipeTouchStartY = 0

function onBodyTouchStart(e) {
  swipeTouchStartX = e.touches[0].clientX
  swipeTouchStartY = e.touches[0].clientY
}

function onBodyTouchEnd(e) {
  if (subPanel.value || animating.value) return
  const dx = e.changedTouches[0].clientX - swipeTouchStartX
  const dy = e.changedTouches[0].clientY - swipeTouchStartY
  // Only act if horizontal movement dominates and exceeds threshold
  if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return
  const order = TOP_TABS
  const cur   = order.indexOf(tab.value)
  const next  = dx < 0 ? cur + 1 : cur - 1
  if (next >= 0 && next < order.length) navigate(order[next])
}

const dataTypesModalOpen = ref(false)
const resetConfirmOpen   = ref(false)

// ── Reset ─────────────────────────────────────────────────────────────────────
function resetAll() { try { localStorage.clear() } catch {}; window.location.reload() }
</script>

<style>
/* ── Settings sheet overlay ──────────────────────────────────────────────── */
.settings-sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 203;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

/* ── Settings sheet ──────────────────────────────────────────────────────── */
.settings-dropdown {
  width: 100%;
  max-width: 640px;
  height: 92dvh;
  background: var(--sheet-bg);
  border-radius: 20px 20px 0 0;
  border: 1px solid var(--panel-border);
  border-bottom: none;
  box-shadow: 0 -4px 48px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.settings-tabs {
  display: flex;
  border-bottom: 1px solid var(--panel-border);
  max-height: 52px;
  overflow: hidden;
}

/* Only animate tabs when explicitly navigating (not on sheet open) */
.settings-tabs--seq-forward,
.settings-tabs--seq-back {
  transition: max-height 0.28s cubic-bezier(0.4, 0, 0.2, 1),
              opacity    0.28s cubic-bezier(0.4, 0, 0.2, 1),
              border-bottom-color 0.28s;
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

.settings-tab.active { color: var(--text); }
.settings-tab.active::after { opacity: 1; }

.settings-tabs--collapsed {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  border-bottom-color: transparent;
  pointer-events: none;
}

/* Forward: collapse tabs after pane slides in */
.settings-tabs--seq-forward.settings-tabs--collapsed {
  transition-delay: 280ms;
}

/* Back: expand tabs immediately (pane slides in after) */
.settings-tabs--seq-back {
  transition-delay: 0ms;
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px 10px 16px;
  border-bottom: 1px solid var(--panel-border);
  gap: 8px;
}

/* Sub-panel variant: back btn on left, centred title, actions on right */
.settings-header--sub {
  padding-left: 8px;
}

.settings-header-back {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--text-muted);
  padding: 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
  flex-shrink: 0;
}
.settings-header-back:hover { color: var(--text); background: var(--btn-hover); }

.settings-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.settings-panel-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text);
  flex: 1;
}


.settings-tab-close {
  background: var(--btn-bg);
  border: 1px solid var(--btn-border);
  color: var(--text-muted);
  font-size: 0.85rem;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  flex-shrink: 0;
}
.settings-tab-close:hover { background: var(--btn-hover); color: var(--text); }

.settings-body {
  display: grid;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.settings-tab-pane {
  grid-area: 1 / 1;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  max-height: 100%;
  background: var(--sheet-bg);
  /* slide transition */
  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1),
              opacity   0.28s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform;
}
.settings-tab-pane--flush {
  padding: 0;
  gap: 0;
}

/* Visible pane — sits at natural position */
.settings-tab-pane--active {
  transform: translateX(0);
  opacity: 1;
  pointer-events: auto;
  visibility: visible;
}

/* Pane animating out */
[data-slide='forward'] .settings-tab-pane--leaving {
  transform: translateX(-30%);
  opacity: 0;
  pointer-events: none;
}
[data-slide='back'] .settings-tab-pane--leaving {
  transform: translateX(30%);
  opacity: 0;
  pointer-events: none;
}
/* Back: delay outgoing pane until tabs have expanded */
.settings-body--seq-back[data-slide='back'] .settings-tab-pane--leaving {
  transition-delay: 240ms;
}

/* Pane waiting off-screen (not participating in current transition) */
.settings-tab-pane--hidden {
  visibility: hidden;
  pointer-events: none;
  transition: none;
}

/* Incoming pane start position — applied before transition begins (only during navigation, not on initial open) */
.settings-body--navigating[data-slide='forward'] .settings-tab-pane--active:not(.settings-tab-pane--leaving) {
  animation: slide-in-right 0.28s cubic-bezier(0.4, 0, 0.2, 1) both;
}
/* Back: pane slides in after tabs have expanded */
.settings-body--navigating.settings-body--seq-back[data-slide='back'] .settings-tab-pane--active:not(.settings-tab-pane--leaving) {
  animation: slide-in-left 0.28s cubic-bezier(0.4, 0, 0.2, 1) 240ms both;
}
.settings-body--navigating:not(.settings-body--seq-back)[data-slide='back'] .settings-tab-pane--active:not(.settings-tab-pane--leaving) {
  animation: slide-in-left 0.28s cubic-bezier(0.4, 0, 0.2, 1) both;
}

@keyframes slide-in-right {
  from { transform: translateX(30%); opacity: 0; }
  to   { transform: translateX(0);   opacity: 1; }
}
@keyframes slide-in-left {
  from { transform: translateX(-30%); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}

.card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: rgba(255,255,255,0.06);
}
.card-icon svg { display: block; }

.setting-row-label-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.setting-row--draggable { cursor: default; gap: 10px; }
.setting-row--draggable.setting-row--nav { cursor: pointer; }
.setting-row--draggable .tile-drag-handle { cursor: grab; }
.setting-row--draggable .setting-row-nav-btn { flex: 1; min-width: 0; }

.settings-group {
  background: var(--sheet-item-bg);
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 20px;
  min-height: 60px;
  box-sizing: border-box;
}
.setting-row + .setting-row {
  border-top: 1px solid var(--row-border);
}

.setting-row--col {
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
}

.setting-row--nav {
  width: 100%;
  text-align: left;
  font-family: inherit;
  font-size: inherit;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text);
}
.setting-row--nav:hover { background: var(--btn-hover); }

.setting-row--selectable {
  width: 100%;
  text-align: left;
  font-family: inherit;
  font-size: inherit;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text);
  justify-content: space-between;
}
.setting-row--selectable:hover { background: var(--btn-hover); }
.setting-row--selectable.active .setting-label { color: var(--accent, #4fa3e3); }
.setting-checkmark { color: var(--accent, #4fa3e3); flex-shrink: 0; }

.setting-row-nav-btn {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: none;
  border: none;
  font-family: inherit;
  font-size: inherit;
  color: var(--text);
  text-align: left;
  cursor: pointer;
  padding: 0;
}
.setting-row-nav-btn--static { cursor: default; pointer-events: none; }
.setting-row-nav-btn:not(.setting-row-nav-btn--static):hover .setting-chevron { color: var(--text); }

.setting-chevron-btn {
  background: none;
  border: none;
  padding: 0 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.setting-chevron-btn:hover .setting-chevron { color: var(--text); }

.setting-chevron-placeholder {
  width: 24px;
  flex-shrink: 0;
}

.setting-chevron {
  color: var(--text-faint);
  flex-shrink: 0;
  transition: color 0.15s;
}

/* Toggle + chevron pairing on nav rows */
.setting-row--nav > div:first-child { flex: 1; min-width: 0; }
.setting-row--nav .toggle-switch { flex-shrink: 0; }

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
.toggle-switch.on { background: #38bdf8; border-color: #38bdf8; }
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
.toggle-switch.on .toggle-thumb { transform: translateX(20px); }

.panel-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.panel-close {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1rem;
  padding: 2px 4px;
  cursor: pointer;
  transition: color 0.15s;
  flex-shrink: 0;
}
.panel-close:hover { color: var(--text); }

.settings-sheet-overlay-enter-active,
.settings-sheet-overlay-leave-active {
  transition: opacity 0.35s cubic-bezier(0.32, 0.72, 0, 1);
}
.settings-sheet-overlay-enter-from,
.settings-sheet-overlay-leave-to { opacity: 0; }

.settings-sheet-overlay-enter-active .settings-dropdown,
.settings-sheet-overlay-leave-active .settings-dropdown {
  transition: transform 0.45s cubic-bezier(0.32, 0.72, 0, 1);
}
.settings-sheet-overlay-enter-from .settings-dropdown,
.settings-sheet-overlay-leave-to .settings-dropdown {
  transform: translateY(100%);
}

/* ── Unit pills (in settings rows) ──────────────────────────────────────── */
.unit-pill {
  display: flex;
  border: 1px solid var(--pill-border);
  border-radius: 9999px;
  overflow: hidden;
}

.setting-row--col .unit-pill { border-radius: 10px; }
.setting-row--col .unit-pill-opt { flex: 1; text-align: center; }

.unit-pill-opt {
  padding: 5px 14px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
  background: none;
  border: none;
  transition: background 0.15s, color 0.15s;
}

.unit-pill-opt--sm { padding: 4px 10px; font-size: 0.8rem; }
.unit-pill-opt.active { background: rgba(56,189,248,0.18); color: #38bdf8; }

/* ── Action buttons ──────────────────────────────────────────────────────── */
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

.model-picker-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 9999px;
  background: var(--btn-bg);
  border: 1px solid var(--btn-border);
  color: var(--text-muted);
  font-size: 0.83rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.model-picker-btn:hover { background: var(--btn-hover); color: var(--text); }

.model-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 0 8px;
}
.model-list-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s, border-color 0.12s;
}
.model-list-item:hover { background: var(--btn-bg); }
.model-list-item.active {
  background: rgba(56, 189, 248, 0.1);
  border-color: rgba(56, 189, 248, 0.35);
}
.model-list-name {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text);
}
.model-list-item.active .model-list-name { color: #38bdf8; }
.model-list-hint {
  font-size: 0.75rem;
  color: var(--text-faint);
}

.setting-action-btn:hover { background: var(--btn-hover); color: var(--text); }

.setting-action-btn--danger { color: #f87171; border-color: rgba(248, 113, 113, 0.3); }
.setting-action-btn--danger:hover { background: rgba(248, 113, 113, 0.12); color: #f87171; }

.reset-confirm-actions .setting-action-btn--danger {
  background: #ee0033;
  color: #fff;
  border-color: transparent;
}
.reset-confirm-actions .setting-action-btn--danger:hover { background: #cc0029; color: #fff; }

/* ── Modals ──────────────────────────────────────────────────────────────── */
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

.modal-dialog--wide    { width: 460px; }
.modal-dialog--confirm { width: 320px; }

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px 10px 16px;
  border-bottom: 1px solid var(--panel-border);
  flex-shrink: 0;
}

.modal-bulk-actions { display: flex; gap: 8px; padding: 10px 20px 8px; }

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
.modal-bulk-btn:hover { background: var(--btn-hover); color: var(--text); }

.modal-hint { font-size: 0.75rem; color: var(--text-faint); padding: 10px 20px 8px; margin: 0; }

.modal-body {
  padding: 14px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s; }
.modal-fade-enter-active .modal-dialog,
.modal-fade-leave-active .modal-dialog { transition: transform 0.2s ease, opacity 0.2s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.modal-fade-enter-from .modal-dialog,
.modal-fade-leave-to .modal-dialog { transform: scale(0.95); opacity: 0; }

/* ── Reset confirm ───────────────────────────────────────────────────────── */
.reset-confirm-body {
  padding: 16px 20px 16px;
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.5;
}
.reset-confirm-actions { display: flex; gap: 8px; padding: 0 20px 20px; justify-content: flex-end; }

/* ── PWS key modal ───────────────────────────────────────────────────────── */
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

.pws-key-about { display: flex; flex-direction: column; gap: 8px; }
.pws-key-about p { margin: 0; font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5; }
.pws-key-about strong { color: inherit; font-weight: 600; }
.pws-key-about em { font-style: normal; color: inherit; }

.pws-key-hint { font-size: 0.78rem; color: var(--text-faint); line-height: 1.5; }
.pws-key-actions { display: flex; gap: 8px; justify-content: flex-end; }

/* ── Units modal ─────────────────────────────────────────────────────────── */
.units-modal-body { display: flex; flex-direction: column; gap: 0; overflow-y: auto; padding-bottom: 8px; }

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

.unit-group-pills { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }

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
.unit-modal-pill:hover:not(.active) { background: var(--btn-hover); color: var(--text); }
.unit-modal-pill.active { background: rgba(56, 189, 248, 0.18); border-color: rgba(56, 189, 248, 0.5); color: #38bdf8; }

/* ── Tile list (Data Types modal & Daily Forecast sub-panel) ─────────────── */
.other-pts-header {
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 10px;
  margin-bottom: 4px;
}
.other-pts-header-spacer { flex: 1; }
.other-pts-col-lbl {
  width: 32px;
  text-align: center;
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.other-pts-col-divider {
  display: block;
  width: 1px;
  height: 24px;
  background: var(--tile-border);
  flex-shrink: 0;
}
.other-pts-drag-hint {
  font-size: 0.68rem;
  color: var(--text-faint);
  font-style: italic;
}
.toggle-switch-placeholder { width: 44px; flex-shrink: 0; }

.check-btn {
  flex-shrink: 0;
  width: 32px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  position: relative;
}
.check-btn::after {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 20px;
  border-radius: 5px;
  border: 1.5px solid var(--toggle-border);
  background: transparent;
  transition: background 0.15s, border-color 0.15s;
}
.check-btn.on::after { background: #38bdf8; border-color: #38bdf8; }
.check-btn:disabled { opacity: 0.5; cursor: default; }
.check-btn svg { position: relative; z-index: 1; width: 10px; height: 10px; color: #fff; }
.check-btn-placeholder { width: 32px; flex-shrink: 0; }

.tile-list { display: flex; flex-direction: column; }
.modal-dialog .tile-list { overflow-y: auto; padding-bottom: 8px; }
.modal-dialog .model-list { overflow-y: auto; }

.tile-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  cursor: default;
  user-select: none;
  border-top: 1px solid var(--tile-border);
  transition: background 0.15s, opacity 0.15s;
}
.tile-row:active { cursor: default; }

.tile-drag-handle { color: var(--text-faint); font-size: 1.1rem; flex-shrink: 0; line-height: 1; cursor: grab; touch-action: none; }

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

.tile-dragging { opacity: 0.35; }
.tile-drag-over { background: rgba(56, 189, 248, 0.08); border-top-color: rgba(56, 189, 248, 0.35); }

.tile-page-break {
  padding-top: 7px;
  padding-bottom: 7px;
  border-top-color: rgba(56, 189, 248, 0.25);
}
.page-break-label {
  flex: 1;
  font-size: 0.78rem;
  font-weight: 600;
  color: #38bdf8;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.page-break-remove {
  font-size: 0.7rem;
  color: var(--text-faint);
  background: none;
  border: none;
  padding: 2px 4px;
  cursor: pointer;
  line-height: 1;
  border-radius: 4px;
  transition: color 0.15s, background 0.15s;
}
.page-break-remove:hover { color: #f87171; background: rgba(248,113,113,0.1); }

.sub-panel-save-btn {
  flex-shrink: 0;
  height: 28px;
  padding-top: 0;
  padding-bottom: 0;
}


.data-point-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.data-point-opt {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 9999px;
  border: 1px solid var(--pill-border);
  background: none;
  color: var(--text-muted);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.data-point-opt:hover:not(.active) { background: var(--btn-hover); color: var(--text); }
.data-point-opt.active { background: rgba(56, 189, 248, 0.18); border-color: rgba(56, 189, 248, 0.5); color: #38bdf8; }

.layout-section-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 14px 20px 0;
}

@media (max-width: 599px) {
  .settings-dropdown {
    border-radius: 12px 12px 0 0;
  }
}
</style>
