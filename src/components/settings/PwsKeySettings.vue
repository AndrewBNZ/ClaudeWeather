<template>
  <div class="pws-key-about">
    <p>Replace current conditions with real local readings from Weather Underground stations. Stations are linked per location in the Locations panel.</p>
    <p>Requires an API key, available for free to weather station owners actively uploading to WU.</p>
    <p>Sign in at <strong>wunderground.com</strong> → <em>My Profile → Member Settings → API Keys</em>.</p>
  </div>
  <div class="settings-group">
    <div class="setting-row setting-row--col pws-input-row">
      <div class="setting-label">API Key</div>
      <input v-model="keyInput" class="pws-key-input" type="text" placeholder="Paste your WU API key" spellcheck="false" autocomplete="off" @keyup.enter="save" />
      <div class="setting-hint">Stored on this device only.<br/>Station data refreshes every 5 mins.</div>
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

const emit = defineEmits(['back'])
const { pwsApiKey } = useSettings()
const keyInput = ref(pwsApiKey.value)

function save()  { pwsApiKey.value = keyInput.value.trim(); emit('back') }
function clear() { pwsApiKey.value = ''; keyInput.value = ''; emit('back') }
</script>

<style scoped>
.pws-input-row { gap: 10px; }
.pws-key-actions { display: flex; gap: 8px; justify-content: flex-end; width: 100%; }
</style>
