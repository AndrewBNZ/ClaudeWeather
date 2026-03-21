<template>
  <!-- Clickaway -->
  <Transition name="fade">
    <div v-if="isOpen" class="settings-clickaway" @click="$emit('close')" />
  </Transition>

  <!-- Dropdown -->
  <Transition name="settings-drop">
    <div v-if="isOpen" class="settings-dropdown" :style="dropdownStyle">
      <div class="settings-header">
        <span class="settings-panel-title">Preferences</span>
        <button class="settings-tab-close" @click="$emit('close')">✕</button>
      </div>
      <div class="settings-tabs">
        <button :class="['settings-tab', { active: tab === 'display' }]" @click="tab = 'display'">Display</button>
        <button :class="['settings-tab', { active: tab === 'data' }]"    @click="tab = 'data'">Data</button>
        <!-- Backup tab hidden until QR reliability is resolved -->
        <!-- <button :class="['settings-tab', { active: tab === 'backup' }]"  @click="tab = 'backup'">Backup</button> -->
      </div>
      <div class="settings-body">
        <!-- Display tab -->
        <div class="settings-tab-pane" :class="{ 'settings-tab-pane--hidden': tab !== 'display' }">
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

        <!-- Data tab -->
        <div class="settings-tab-pane" :class="{ 'settings-tab-pane--hidden': tab !== 'data' }">
          <div class="setting-row">
            <div>
              <div class="setting-label">Weather details</div>
              <div class="setting-hint">{{ tileConfig.filter(t => t.type !== 'pageBreak' && t.enabled).length }} of {{ tileConfig.filter(t => t.type !== 'pageBreak').length }} shown</div>
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
              <div class="setting-label">Forecast model</div>
              <div class="setting-hint">Experiment to find the best model for your area</div>
            </div>
            <button class="model-picker-btn" @click="modelInfoOpen = true">
              {{ OPEN_METEO_MODELS.find(m => m.value === openMeteoModel)?.label }}
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
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
              <div class="setting-label">Tempest Weather Station</div>
              <div class="setting-hint">{{ tempestEnabled ? (tempestToken ? 'Token saved on this device' : 'Set your access token to get started') : 'Tempest data temporarily hidden' }}</div>
            </div>
            <div class="setting-row-controls">
              <button v-if="tempestEnabled" class="setting-action-btn" @click="openTempestTokenModal">{{ tempestToken ? 'Change →' : 'Set token →' }}</button>
              <button class="toggle-switch" :class="{ on: tempestEnabled }" @click="tempestEnabled = !tempestEnabled">
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

        <!-- Backup tab -->
        <div class="settings-tab-pane" :class="{ 'settings-tab-pane--hidden': tab !== 'backup' }">
          <div class="setting-row">
            <div>
              <div class="setting-label">Export settings</div>
              <div class="setting-hint">Share your setup to another device</div>
            </div>
            <button class="setting-action-btn" @click="qrBackupOpen = true">Generate QR →</button>
          </div>
          <div class="setting-row">
            <div>
              <div class="setting-label">Import settings</div>
              <div class="setting-hint">Scan or upload a QR code</div>
            </div>
            <button class="setting-action-btn" @click="qrRestoreOpen = true">Restore →</button>
          </div>
        </div>
      </div>
    </div>
  </Transition>

  <!-- QR Backup modal -->
  <transition name="modal-fade">
    <QrBackupModal v-if="qrBackupOpen" @close="qrBackupOpen = false" />
  </transition>

  <!-- QR Restore modal -->
  <transition name="modal-fade">
    <QrRestoreModal v-if="qrRestoreOpen" @close="qrRestoreOpen = false" />
  </transition>

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
          <button class="modal-bulk-btn" @click="addPageBreak(tileConfig.length - 1)">+ Page</button>
        </div>
        <p class="modal-hint">Drag to reorder · tap to show/hide</p>
        <div class="tile-list">
          <template v-for="(tile, i) in tileConfig" :key="`${tile.type}-${i}`">
            <!-- Page break divider -->
            <div v-if="tile.type === 'pageBreak'"
              :data-tile-idx="i"
              class="tile-row tile-page-break"
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
              <span class="page-break-label">— Page {{ tileConfig.slice(0, i).filter(t => t.type === 'pageBreak').length + 2 }}</span>
              <button class="page-break-remove" @click.stop="removePageBreak(i)" title="Remove page break">✕</button>
            </div>
            <!-- Regular tile -->
            <div v-else
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
          </template>
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

  <!-- Forecast model info modal -->
  <transition name="modal-fade">
    <div v-if="modelInfoOpen" class="modal-overlay" @click.self="modelInfoOpen = false">
      <div class="modal-dialog modal-dialog--wide">
        <div class="modal-header">
          <span class="panel-title">Forecast model</span>
          <button class="panel-close" @click="modelInfoOpen = false">✕</button>
        </div>
        <p class="modal-hint">Tap a model to select it. Most users can leave this on Best Match.</p>
        <div class="model-list">
          <button
            v-for="m in OPEN_METEO_MODELS"
            :key="m.value"
            class="model-list-item"
            :class="{ active: openMeteoModel === m.value }"
            @click="openMeteoModel = m.value; modelInfoOpen = false"
          >
            <div class="model-list-name">{{ m.label }}</div>
            <div class="model-list-hint">{{ m.hint }}</div>
          </button>
        </div>
      </div>
    </div>
  </transition>

  <!-- Tempest token modal -->
  <transition name="modal-fade">
    <div v-if="tempestTokenModalOpen" class="modal-overlay" @click.self="tempestTokenModalOpen = false">
      <div class="modal-dialog modal-dialog--wide">
        <div class="modal-header">
          <span class="panel-title">Tempest Weather Station</span>
          <button class="panel-close" @click="tempestTokenModalOpen = false">✕</button>
        </div>
        <div class="modal-body pws-key-body">
          <div class="pws-key-about">
            <p>Connects {{ APP_NAME }} to your WeatherFlow Tempest station via WebSocket, streaming real-time conditions directly from your backyard. Stations are linked per location in the Locations panel.</p>
            <p>Generate a token in the Tempest app → <em>Settings → Data Authorizations → Create Token</em>, or at <strong>tempestwx.com</strong>.</p>
          </div>
          <input v-model="tempestTokenInput" class="pws-key-input" type="text" placeholder="Paste your personal access token" spellcheck="false" autocomplete="off" @keyup.enter="saveTempestToken" />
          <div class="pws-key-hint">Stored on this device only.</div>
          <div class="pws-key-actions">
            <button v-if="tempestToken" class="setting-action-btn setting-action-btn--danger" @click="clearTempestToken">Remove</button>
            <button class="setting-action-btn" @click="saveTempestToken" :disabled="!tempestTokenInput.trim()">Save</button>
          </div>
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
</template>

<script setup>
import { ref, watch } from 'vue'
import { useSettings, UNIT_OPTIONS, TILE_META } from '../composables/useSettings.js'
import { TILE_ICONS } from '../utils/tileIcons.js'
import { APP_NAME } from '../config.js'
import { MODELS as OPEN_METEO_MODELS } from '../services/adapters/openMeteo.js'
import QrBackupModal  from './QrBackupModal.vue'
import QrRestoreModal from './QrRestoreModal.vue'

const props = defineProps({ isOpen: Boolean })
defineEmits(['close'])
defineExpose({ openUnitsModal: () => { unitsModalOpen.value = true }, openDataTypesModal: () => { dataTypesModalOpen.value = true }, openModelModal: () => { modelInfoOpen.value = true } })

const {
  theme, timeFormat, dailyFirst, showSim,
  tileConfig, unitPrefs, pwsEnabled, pwsApiKey, tempestEnabled, tempestToken, openMeteoModel,
  toggleTile, setAllTiles, reorderTiles, addPageBreak, removePageBreak,
} = useSettings()

// ── Local state ───────────────────────────────────────────────────────────────
const tab              = ref('display')
const dropdownStyle    = ref({})
const dataTypesModalOpen = ref(false)
const unitsModalOpen     = ref(false)
const resetConfirmOpen   = ref(false)
const modelInfoOpen          = ref(false)
const pwsKeyModalOpen        = ref(false)
const tempestTokenModalOpen  = ref(false)
const qrBackupOpen           = ref(false)
const qrRestoreOpen          = ref(false)
const pwsKeyInput            = ref('')
const tempestTokenInput      = ref('')
const tileDragIndex      = ref(null)
const tileDragOver       = ref(null)
let   tileTouchIdx       = null
let   tileTouchMoved     = false

// ── Dropdown positioning ──────────────────────────────────────────────────────
watch(() => props.isOpen, (open) => {
  if (!open) return
  const btn  = document.querySelector('[data-settings-btn]')
  if (!btn) return
  const rect    = btn.getBoundingClientRect()
  const card    = document.querySelector('.conditions')
  const cardRect = card?.getBoundingClientRect()
  const maxHeight = `${window.innerHeight - rect.bottom - 14}px`
  if (cardRect) {
    dropdownStyle.value = {
      top:   `${rect.bottom + 6}px`,
      left:  `${cardRect.left + 8}px`,
      right: `${window.innerWidth - cardRect.right + 8}px`,
      maxHeight,
    }
  } else {
    const panelWidth = 320
    const rightEdge  = Math.min(rect.right, window.innerWidth - 8)
    const leftEdge   = Math.max(rightEdge - panelWidth, 8)
    dropdownStyle.value = { top: `${rect.bottom + 6}px`, left: `${leftEdge}px`, width: `${panelWidth}px`, maxHeight }
  }
})

// ── PWS key modal ─────────────────────────────────────────────────────────────
function openPwsKeyModal() { pwsKeyInput.value = pwsApiKey.value; pwsKeyModalOpen.value = true }
function savePwsKey()      { pwsApiKey.value = pwsKeyInput.value.trim(); pwsKeyModalOpen.value = false }
function clearPwsKey()     { pwsApiKey.value = ''; pwsKeyModalOpen.value = false }

// ── Tempest token modal ───────────────────────────────────────────────────────
function openTempestTokenModal() { tempestTokenInput.value = tempestToken.value; tempestTokenModalOpen.value = true }
function saveTempestToken()      { tempestToken.value = tempestTokenInput.value.trim(); tempestTokenModalOpen.value = false }
function clearTempestToken()     { tempestToken.value = ''; tempestTokenModalOpen.value = false }

// ── Reset ─────────────────────────────────────────────────────────────────────
function resetAll() { try { localStorage.clear() } catch {}; window.location.reload() }

// ── Tile drag-and-drop ────────────────────────────────────────────────────────
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
  const el    = document.elementFromPoint(touch.clientX, touch.clientY)
  const row   = el?.closest('[data-tile-idx]')
  tileDragOver.value = row ? parseInt(row.dataset.tileIdx) : null
}
function onTileTouchEnd() {
  if (tileTouchMoved && tileTouchIdx !== null && tileDragOver.value !== null && tileTouchIdx !== tileDragOver.value) {
    reorderTiles(tileTouchIdx, tileDragOver.value)
  }
  tileTouchIdx = null; tileTouchMoved = false; tileDragIndex.value = null; tileDragOver.value = null
}
</script>

<style>
/* ── Settings dropdown ───────────────────────────────────────────────────── */
.settings-clickaway {
  position: fixed;
  inset: 0;
  z-index: 200;
}

.settings-dropdown {
  position: fixed;
  z-index: 203;
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  display: flex;
  flex-direction: column;
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

.settings-tab.active { color: var(--text); }
.settings-tab.active::after { opacity: 1; }

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px 10px 16px;
  border-bottom: 1px solid var(--panel-border);
}

.settings-panel-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.settings-tab-close {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1rem;
  padding: 2px 4px;
  cursor: pointer;
  transition: color 0.15s;
  flex-shrink: 0;
}
.settings-tab-close:hover { color: var(--text); }

.settings-body {
  display: grid;
  flex: 1;
  min-height: 0;
}

.settings-tab-pane {
  grid-area: 1 / 1;
  padding: 8px 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  max-height: 100%;
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

.settings-drop-enter-active, .settings-drop-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
  transform-origin: top right;
}
.settings-drop-enter-from, .settings-drop-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-6px);
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
  padding: 0 20px 16px;
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

/* ── Tile list (Data Types modal) ────────────────────────────────────────── */
.tile-list { display: flex; flex-direction: column; }
.modal-dialog .tile-list { overflow-y: auto; padding-bottom: 8px; }

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

.tile-drag-handle { color: var(--text-faint); font-size: 1.1rem; flex-shrink: 0; line-height: 1; }

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
</style>
