<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-dialog modal-dialog--wide">
      <div class="modal-header">
        <span class="panel-title">Weather Underground PWS</span>
        <button class="panel-close" @click="$emit('close')">✕</button>
      </div>
      <div class="modal-body pws-key-body">
        <div class="pws-key-about">
          <p>Replace current conditions with real local readings from Weather Underground stations. Stations are linked per location in the Locations panel.</p>
          <p>Requires an API key, which are available for free to weather station owners who are actively uploading their data to WU.</p>
          <p>Sign in at <strong>wunderground.com</strong> → <em>My Profile → Member Settings → API Keys</em>.</p>
        </div>
        <input v-model="keyInput" class="pws-key-input" type="text" placeholder="Paste your WU API key" spellcheck="false" autocomplete="off" @keyup.enter="save" />
        <div class="pws-key-hint">API key stored on this device only.<br/>Station data will refresh every 5 mins when the app is open.</div>
        <div class="pws-key-actions">
          <button v-if="pwsApiKey" class="setting-action-btn setting-action-btn--danger" @click="clear">Remove</button>
          <button class="setting-action-btn" @click="save" :disabled="!keyInput.trim()">Save</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useSettings } from '../../composables/useSettings.js'

const emit = defineEmits(['close'])

const { pwsApiKey } = useSettings()
const keyInput = ref(pwsApiKey.value)

function save()  { pwsApiKey.value = keyInput.value.trim(); emit('close') }
function clear() { pwsApiKey.value = ''; emit('close') }
</script>
