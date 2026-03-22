<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-dialog modal-dialog--wide">
      <div class="modal-header">
        <span class="panel-title">Weather Station · {{ loc.name }}</span>
        <button class="panel-close" @click="emit('close')">✕</button>
      </div>
      <div class="pws-modal-body">

        <!-- Active station info row (always shown when a station is selected) -->
        <div v-if="currentStation" class="pws-station-section">
          <div class="pws-section-label">Active station</div>
          <div class="pws-active-row">
            <div class="pws-active-info">
              <div class="pws-active-name-row">
                <span class="pws-active-name">{{ currentStation.name }}</span>
                <span class="pws-active-type-badge" :class="'pws-type-' + currentStation.type">
                  {{ currentStation.type === 'tempest' ? 'Tempest' : 'Weather Underground' }}
                </span>
              </div>
              <span class="pws-active-id">{{ currentStation.id }}</span>
            </div>
            <button class="setting-action-btn setting-action-btn--danger" @click="emit('select', null)">Remove</button>
          </div>
        </div>

        <!-- Add / Change section -->
        <div class="pws-station-section">
          <div class="pws-section-label">{{ currentStation ? 'Change to' : 'Add station' }}</div>

          <!-- Source type selector (always visible) -->
          <div class="pws-source-selector">
            <button
              :class="['pws-source-btn', { active: sourceType === 'tempest', disabled: !tempestToken }]"
              :disabled="!tempestToken"
              :title="!tempestToken ? 'Add your Tempest personal access token in Settings → Data' : ''"
              @click="switchSource('tempest')"
            >Tempest</button>
            <button
              :class="['pws-source-btn', { active: sourceType === 'wu', disabled: !apiKey }]"
              :disabled="!apiKey"
              :title="!apiKey ? 'Add your Weather Underground API key in Settings → Data' : ''"
              @click="switchSource('wu')"
            >Weather Underground</button>
          </div>

          <!-- No token/key configured warning -->
          <div v-if="!hasCurrentSource" class="pws-no-token">
            {{ sourceType === 'tempest'
              ? 'Add your Tempest personal access token in Settings → Data to use this source.'
              : 'Add your Weather Underground API key in Settings → Data to use this source.' }}
          </div>

          <!-- ── Tempest: fetched station list ─────────────────────────── -->
          <template v-else-if="sourceType === 'tempest'">
            <div v-if="stationsLoading" class="pws-loading">Loading stations…</div>
            <div v-else-if="stationsError" class="pws-verify-error">
              {{ stationsError }}
              <button class="pws-retry-btn" @click="loadTempestStations">Retry</button>
            </div>
            <div v-else-if="tempestStations.length" class="pws-station-list">
              <div
                v-for="s in tempestStations"
                :key="s.stationId"
                class="pws-station-row"
                :class="{ 'is-active': String(s.stationId) === currentStation?.id }"
              >
                <div class="pws-station-row-info">
                  <span class="pws-station-row-name">{{ s.name }}</span>
                  <span class="pws-station-row-id">{{ s.stationId }}</span>
                </div>
                <button class="setting-action-btn pws-use-btn" @click="selectTempestStation(s)">Use station</button>
              </div>
            </div>
          </template>

          <!-- ── WU: manual input + verify ────────────────────────────── -->
          <template v-else>
            <div class="pws-manual-row">
              <input
                v-model="stationInput"
                class="pws-id-input"
                placeholder="e.g. IMANAWA12"
                spellcheck="false"
                autocomplete="off"
                @keyup.enter="verify"
              />
              <button class="setting-action-btn pws-use-btn" @click="verify" :disabled="!stationInput.trim() || verifying">
                {{ verifying ? '…' : 'Use station' }}
              </button>
            </div>
            <div class="pws-id-hint">
              Find the ID on wunderground.com by searching for a station — it appears in the page URL and on the station detail page.
            </div>
            <div v-if="verifyError" class="pws-verify-error">{{ verifyError }}</div>
          </template>
        </div>

        <p class="pws-hint">Tiles showing live station readings are marked with a blue dot.</p>

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
.pws-modal-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Source selector */
.pws-source-selector {
  display: flex;
  border: 1px solid var(--panel-border);
  border-radius: 6px;
  overflow: hidden;
  background: var(--btn-bg);
}

.pws-source-btn {
  flex: 1;
  padding: 5px 10px;
  border: none;
  border-right: 1px solid var(--panel-border);
  background: transparent;
  color: var(--text-faint);
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.pws-source-btn:last-child {
  border-right: none;
}
.pws-source-btn.active {
  background: rgba(255, 255, 255, 0.07);
  color: var(--text);
  font-weight: 600;
}
.pws-source-btn.disabled,
.pws-source-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.pws-no-token {
  font-size: 0.82rem;
  color: var(--text-faint);
  line-height: 1.5;
  padding: 10px 12px;
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--panel-border);
  border-radius: 8px;
}

/* Shared section label */
.pws-section-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-faint);
  margin-bottom: 8px;
}

/* Station section */
.pws-station-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pws-active-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: rgba(56, 189, 248, 0.08);
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 8px;
  margin-bottom: 4px;
}
.pws-active-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
  min-width: 0;
}
.pws-active-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.pws-active-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pws-active-type-badge {
  font-size: 0.68rem;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
  white-space: nowrap;
  flex-shrink: 0;
}
.pws-type-tempest,
.pws-type-wu {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.35);
}
.pws-active-id {
  font-size: 0.75rem;
  color: var(--text-faint);
  font-family: monospace;
}

/* Tempest station list */
.pws-loading {
  font-size: 0.83rem;
  color: var(--text-faint);
  padding: 8px 0;
}

.pws-station-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pws-station-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--panel-border);
  background: var(--btn-bg);
  cursor: pointer;
  text-align: left;
  transition: background 0.15s, border-color 0.15s;
}
.pws-station-row:hover {
  background: var(--btn-hover);
  border-color: rgba(56, 189, 248, 0.3);
}
.pws-station-row.is-active {
  background: rgba(56, 189, 248, 0.08);
  border-color: rgba(56, 189, 248, 0.4);
}
.pws-station-row-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}
.pws-station-row-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text);
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

/* WU input */
.pws-input-label {
  font-size: 0.75rem;
  color: var(--text-faint);
  margin-top: 2px;
}

.pws-manual-row {
  display: flex;
  gap: 8px;
}
.pws-id-input {
  flex: 1;
  background: var(--btn-bg);
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
  padding-top: 10px;
  border-top: 1px solid var(--panel-divider);
}
</style>
