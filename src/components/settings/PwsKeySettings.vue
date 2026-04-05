<template>
  <div class="settings-group">
    <div class="setting-row setting-row--col">
      <div>
        <div class="setting-label">Weather Underground PWS</div>
        <div class="setting-hint">Replace current conditions with real local readings from Weather Underground stations. Stations are linked per location in the Locations panel.</div>
      </div>
    </div>
    <div class="setting-row setting-row--col">
      <div class="setting-hint">Requires an API key, available for free to weather station owners actively uploading to WU. Sign in at <strong>wunderground.com</strong> → <em>My Profile → Member Settings → API Keys</em>.</div>
    </div>
    <div class="setting-row setting-row--col pws-input-row">
      <input v-model="keyInput" class="pws-key-input" type="text" placeholder="Paste your WU API key" spellcheck="false" autocomplete="off" @keyup.enter="save" />
      <div class="setting-hint">API key stored on this device only. Station data will refresh every 5 mins when the app is open.</div>
      <div class="pws-key-actions">
        <button v-if="pwsApiKey" class="setting-action-btn setting-action-btn--danger" @click="clear">Remove</button>
        <button class="setting-action-btn" @click="save" :disabled="!keyInput.trim()">Save</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useSettings } from '../../composables/useSettings.js'

const { pwsApiKey } = useSettings()
const keyInput = ref(pwsApiKey.value)

function save()  { pwsApiKey.value = keyInput.value.trim() }
function clear() { pwsApiKey.value = ''; keyInput.value = '' }
</script>

<style scoped>
.pws-input-row { gap: 10px; }
.pws-key-actions { display: flex; gap: 8px; justify-content: flex-end; width: 100%; }
</style>
