<template>
  <div class="pws-key-about">
    <p>Replace current conditions with real local readings from your Tempest weather stations. Stations are linked per location in the Locations panel.</p>
    <p>You can only see data from your own stations. Requires an access token, available for free to Tempest owners.</p>
    <p>Generate one in the Tempest app → <em>Settings → Data Authorizations → Create Token</em>, or at <strong>tempestwx.com</strong>.</p>
  </div>
  <div class="settings-group">
    <div class="setting-row setting-row--col pws-input-row">
      <div class="setting-label">Access Token</div>
      <input v-model="tokenInput" class="pws-key-input" type="text" placeholder="Paste your personal access token" spellcheck="false" autocomplete="off" @keyup.enter="save" />
      <div class="setting-hint">Stored on this device only.<br/>Station data will stream in real-time when app is open.</div>
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

const emit = defineEmits(['back'])
const { tempestToken } = useSettings()
const tokenInput = ref(tempestToken.value)

function save()  { tempestToken.value = tokenInput.value.trim(); emit('back') }
function clear() { tempestToken.value = ''; tokenInput.value = ''; emit('back') }
</script>

<style scoped>
.pws-input-row { gap: 10px; }
.pws-key-actions { display: flex; gap: 8px; justify-content: flex-end; width: 100%; }
</style>
