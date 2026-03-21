<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-dialog modal-dialog--wide">
      <div class="modal-header">
        <span class="panel-title">PWS · {{ loc.name }}</span>
        <button class="panel-close" @click="emit('close')">✕</button>
      </div>
      <div class="pws-modal-body">

        <!-- Station entry -->
        <div class="pws-station-section">
          <div v-if="currentStation" class="pws-section-label">Active station</div>
          <div v-else class="pws-input-label">Station ID</div>

          <!-- Active station info row -->
          <div v-if="currentStation" class="pws-active-row">
            <div class="pws-active-info">
              <span class="pws-active-name">{{ currentStation.name }}</span>
              <span class="pws-active-id">{{ currentStation.id }}</span>
            </div>
            <button class="setting-action-btn setting-action-btn--danger" @click="emit('select', null)">Remove</button>
          </div>

          <!-- Input + verify -->
          <div class="pws-input-label" v-if="currentStation">Change to</div>
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
              {{ verifying ? '…' : 'Verify' }}
            </button>
          </div>

          <div class="pws-id-hint">Find the ID on wunderground.com by searching for a station — it appears in the page URL and on the station detail page.</div>

          <div v-if="verifyError" class="pws-verify-error">{{ verifyError }}</div>

          <div v-if="verified" class="pws-verified">
            <span class="pws-verified-check">✓</span>
            <span class="pws-verified-name">{{ verified.name }}</span>
            <span class="pws-verified-temp">{{ verified.temp }}</span>
            <button class="setting-action-btn pws-use-btn" @click="useVerified">Use this station</button>
          </div>
        </div>

        <p class="pws-hint">Tiles showing live station readings are marked with a blue dot.</p>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { getPwsObservations } from '../services/pwsApi.js'

const props = defineProps({
  loc:            { type: Object, required: true },
  apiKey:         { type: String, required: true },
  currentStation: { type: Object, default: null },
})

const emit = defineEmits(['select', 'close'])

const stationInput = ref(props.currentStation?.id ?? '')
const verifying    = ref(false)
const verifyError  = ref(null)
const verified     = ref(null)

async function verify() {
  const id = stationInput.value.trim()
  if (!id) return
  verifying.value   = true
  verifyError.value = null
  verified.value    = null
  try {
    const obs = await getPwsObservations(id, props.apiKey)
    if (!obs) throw new Error('No data returned for this station ID.')
    const tempC = obs.metric?.temp
    const name  = obs.neighborhood || obs.stationID || id
    verified.value = {
      id,
      name,
      temp: tempC != null ? `${tempC.toFixed(1)} °C` : '',
    }
  } catch (e) {
    verifyError.value = e.message?.includes('401')
      ? 'Invalid API key or station not accessible.'
      : (e.message || 'Could not verify station.')
  } finally {
    verifying.value = false
  }
}

function useVerified() {
  emit('select', { id: verified.value.id, name: verified.value.name })
}
</script>

<style scoped>
.pws-modal-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
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
.pws-active-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pws-active-id {
  font-size: 0.75rem;
  color: var(--text-faint);
  font-family: monospace;
}

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
  text-transform: uppercase;
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
}

.pws-verified {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 10px;
  background: rgba(56, 189, 248, 0.08);
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 8px;
  font-size: 0.875rem;
}
.pws-verified-check { color: #4ade80; font-weight: 700; }
.pws-verified-name  { color: var(--text); font-weight: 600; flex: 1; min-width: 0; }
.pws-verified-temp  { color: var(--text-faint); white-space: nowrap; }
.pws-use-btn        { margin-left: auto; }

.pws-hint {
  font-size: 0.78rem;
  color: var(--text-faint);
  line-height: 1.5;
  margin: 0;
  padding-top: 10px;
  border-top: 1px solid var(--panel-divider);
}
</style>
