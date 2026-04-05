<template>
  <div class="settings-group">
    <div class="setting-row setting-row--col">
      <div>
        <div class="setting-label">Tempest PWS</div>
        <div class="setting-hint">Replace current conditions with real local readings from your Tempest weather stations. Stations are linked per location in the Locations panel.</div>
      </div>
    </div>
    <div class="setting-row setting-row--col">
      <div class="setting-hint">You can only see data from your own stations. Requires an access token, available for free to Tempest owners. Generate one in the Tempest app → <em>Settings → Data Authorizations → Create Token</em>, or at <strong>tempestwx.com</strong>.</div>
    </div>
    <div class="setting-row setting-row--col pws-input-row">
      <input v-model="tokenInput" class="pws-key-input" type="text" placeholder="Paste your personal access token" spellcheck="false" autocomplete="off" @keyup.enter="save" />
      <div class="setting-hint">Token stored on this device only. Station data will live-stream to the app when open.</div>
      <div class="pws-key-actions">
        <button v-if="tempestToken" class="setting-action-btn setting-action-btn--danger" @click="clear">Remove</button>
        <button class="setting-action-btn" @click="save" :disabled="!tokenInput.trim()">Save</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useSettings } from '../../composables/useSettings.js'

const { tempestToken } = useSettings()
const tokenInput = ref(tempestToken.value)

function save()  { tempestToken.value = tokenInput.value.trim() }
function clear() { tempestToken.value = ''; tokenInput.value = '' }
</script>

<style scoped>
.pws-input-row { gap: 10px; }
.pws-key-actions { display: flex; gap: 8px; justify-content: flex-end; width: 100%; }
</style>
