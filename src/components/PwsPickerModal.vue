<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-dialog modal-dialog--wide">
      <div class="pws-modal-header">
        <div class="pws-modal-header-text">
          <span class="pws-modal-title">Personal Weather Station</span>
          <span class="pws-modal-subtitle">{{ loc.name }}</span>
        </div>
        <button class="pws-modal-close" @click="emit('close')">✕</button>
      </div>
      <div class="modal-body">

        <!-- Active station group -->
        <div v-if="currentStation" class="settings-group">
          <div class="setting-row">
            <div class="pws-active-info">
              <div class="pws-active-name-row">
                <span class="setting-label">{{ currentStation.name }}</span>
                <span class="pws-active-type-badge" :class="'pws-type-' + currentStation.type">
                  {{ currentStation.type === 'tempest' ? 'Tempest' : 'WU' }}
                </span>
              </div>
              <span class="pws-active-id">{{ currentStation.id }}</span>
            </div>
            <button class="setting-action-btn setting-action-btn--danger" @click="emit('select', null)">Remove</button>
          </div>
        </div>

        <!-- Source + station picker group -->
        <div v-if="!currentStation" class="settings-group">

          <!-- Source type selector -->
          <div class="setting-row setting-row--col pws-source-row">
            <div class="unit-pill">
              <button
                :class="['unit-pill-opt', { active: sourceType === 'tempest', 'pws-pill-disabled': !tempestToken }]"
                :disabled="!tempestToken"
                :title="!tempestToken ? 'Add your Tempest personal access token in Settings → Data' : ''"
                @click="switchSource('tempest')"
              >Tempest</button>
              <button
                :class="['unit-pill-opt', { active: sourceType === 'wu', 'pws-pill-disabled': !apiKey }]"
                :disabled="!apiKey"
                :title="!apiKey ? 'Add your Weather Underground API key in Settings → Data' : ''"
                @click="switchSource('wu')"
              >Weather Underground</button>
            </div>
          </div>

          <!-- No token/key configured warning -->
          <div v-if="!hasCurrentSource" class="setting-row pws-no-token">
            {{ sourceType === 'tempest'
              ? 'Add your Tempest personal access token in Settings → Data to use this source.'
              : 'Add your Weather Underground API key in Settings → Data to use this source.' }}
          </div>

          <!-- ── Tempest: fetched station list ─────────────────────────── -->
          <template v-else-if="sourceType === 'tempest'">
            <div v-if="stationsLoading" class="setting-row pws-loading">Loading stations…</div>
            <div v-else-if="stationsError" class="setting-row pws-verify-error">
              {{ stationsError }}
              <button class="pws-retry-btn" @click="loadTempestStations">Retry</button>
            </div>
            <template v-else-if="tempestStations.length">
              <div
                v-for="s in tempestStations"
                :key="s.stationId"
                class="setting-row pws-station-row"
                :class="{ 'is-active': String(s.stationId) === currentStation?.id }"
              >
                <div class="pws-station-row-info">
                  <span class="setting-label">{{ s.name }}</span>
                  <span class="pws-station-row-id">{{ s.stationId }}</span>
                </div>
                <button class="setting-action-btn" @click="selectTempestStation(s)">Use</button>
              </div>
            </template>
          </template>

          <!-- ── WU: manual input + verify ────────────────────────────── -->
          <template v-else>
            <div class="setting-row setting-row--col pws-wu-row">
              <div class="pws-manual-row">
                <input
                  v-model="stationInput"
                  class="pws-id-input"
                  placeholder="e.g. IMANAWA12"
                  spellcheck="false"
                  autocomplete="off"
                  @keyup.enter="verify"
                />
                <button class="setting-action-btn" @click="verify" :disabled="!stationInput.trim() || verifying">
                  {{ verifying ? '…' : 'Use' }}
                </button>
              </div>
              <div class="pws-id-hint">
                Find the ID on wunderground.com — it appears in the page URL and on the station detail page.
              </div>
              <div v-if="verifyError" class="pws-verify-error">{{ verifyError }}</div>
            </div>
          </template>

        </div>

        <p class="pws-hint">Current conditions which are coming from a weather station (instead of the forecast) will be indicated with a blue PWS icon.</p>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { getPwsObservations }   from '../services/pwsApi.js'
import { fetchTempestStations } from '../services/tempestApi.js'

const props = defineProps({
  loc:            { type: Object, required: true },
  apiKey:         { type: String, default: '' },
  tempestToken:   { type: String, default: '' },
  currentStation: { type: Object, default: null },
})

const emit = defineEmits(['select', 'close'])

const initialType = props.currentStation?.type
  ?? (props.tempestToken ? 'tempest' : 'wu')

const sourceType      = ref(initialType)
const stationInput    = ref(props.currentStation?.id ?? '')
const verifying       = ref(false)
const verifyError     = ref(null)
const tempestStations = ref([])
const stationsLoading = ref(false)
const stationsError   = ref(null)

const hasCurrentSource = computed(() =>
  sourceType.value === 'tempest' ? !!props.tempestToken : !!props.apiKey
)

async function loadTempestStations() {
  if (!props.tempestToken) return
  stationsLoading.value = true
  stationsError.value   = null
  tempestStations.value = []
  try {
    tempestStations.value = await fetchTempestStations(props.tempestToken)
  } catch (e) {
    stationsError.value = e.message || 'Could not load stations.'
  } finally {
    stationsLoading.value = false
  }
}

function selectTempestStation(s) {
  emit('select', {
    type:      'tempest',
    id:        String(s.stationId),
    deviceId:  s.deviceId,
    name:      s.name,
  })
}

function switchSource(type) {
  sourceType.value   = type
  stationInput.value = ''
  verifyError.value  = null
  if (type === 'tempest' && !tempestStations.value.length) loadTempestStations()
}

async function verify() {
  const id = stationInput.value.trim()
  if (!id) return
  verifying.value   = true
  verifyError.value = null
  try {
    const obs = await getPwsObservations(id, props.apiKey)
    if (!obs) throw new Error('No data returned for this station ID.')
    const name = obs.neighborhood || obs.stationID || id
    emit('select', { type: 'wu', id, name })
  } catch (e) {
    const msg = e.message || ''
    verifyError.value = msg.includes('401') ? 'Invalid API key or station not accessible.'
      : msg.includes('404') ? 'Station not found. Check the ID and try again.'
      : 'Could not verify station.'
  } finally {
    verifying.value = false
  }
}

// Load station list when Tempest tab is first shown
onMounted(() => {
  if (sourceType.value === 'tempest' && props.tempestToken) loadTempestStations()
})

// Reload if token changes while modal is open (edge case)
watch(() => props.tempestToken, (v) => {
  if (sourceType.value === 'tempest' && v) loadTempestStations()
})
</script>

<style scoped>
/* ── Header ── */
.pws-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--panel-border);
  flex-shrink: 0;
}

.pws-modal-header-text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.pws-modal-title {
  font-size: 1rem;
  font-weight: 600;
}

.pws-modal-subtitle {
  font-size: 0.75rem;
  opacity: 0.5;
}

.pws-modal-close {
  font-size: 1rem;
  opacity: 0.45;
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
  line-height: 1;
  flex-shrink: 0;
}
.pws-modal-close:hover { opacity: 0.8; }

/* Active station info */
.pws-active-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}
.pws-active-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.pws-active-type-badge {
  font-size: 0.68rem;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
  white-space: nowrap;
  flex-shrink: 0;
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.35);
}
.pws-active-id {
  font-size: 0.75rem;
  color: var(--text-faint);
  font-family: monospace;
}

/* Source selector */
.pws-source-row { gap: 0; min-height: unset; }
.pws-source-row .unit-pill-opt { white-space: nowrap; }
.pws-pill-disabled { opacity: 0.35; cursor: not-allowed; }

/* Warning / loading rows */
.pws-no-token {
  font-size: 0.82rem;
  color: var(--text-faint);
  line-height: 1.5;
  min-height: unset;
}
.pws-loading {
  font-size: 0.83rem;
  color: var(--text-faint);
  min-height: unset;
}

/* Tempest station rows */
.pws-station-row { cursor: default; }
.pws-station-row.is-active .setting-label { color: #38bdf8; }
.pws-station-row-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}
.pws-station-row-id {
  font-size: 0.75rem;
  color: var(--text-faint);
  font-family: monospace;
}

.pws-retry-btn {
  background: none;
  border: none;
  color: #38bdf8;
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0 4px;
  text-decoration: underline;
}

/* WU input row */
.pws-wu-row { gap: 8px; min-height: unset; }
.pws-manual-row {
  display: flex;
  gap: 8px;
  width: 100%;
}
.pws-id-input {
  flex: 1;
  background: var(--sheet-input-bg);
  border: 1px solid var(--panel-border);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 0.875rem;
  font-family: monospace;
  color: var(--text);
  outline: none;
  transition: border-color 0.15s;
}
.pws-id-input:focus { border-color: #38bdf8; }
.pws-id-hint {
  font-size: 0.75rem;
  color: var(--text-faint);
  line-height: 1.5;
}
.pws-verify-error {
  font-size: 0.8rem;
  color: #f87171;
  display: flex;
  align-items: center;
  gap: 6px;
}

.pws-hint {
  font-size: 0.78rem;
  color: var(--text-faint);
  line-height: 1.5;
  margin: 0;
}
</style>
