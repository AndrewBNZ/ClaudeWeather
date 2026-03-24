<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-dialog modal-dialog--wide">
      <div class="modal-header">
        <span class="panel-title">Tempest PWS</span>
        <button class="panel-close" @click="$emit('close')">✕</button>
      </div>
      <div class="modal-body pws-key-body">
        <div class="pws-key-about">
          <p>Replace current conditions with real local readings from your Tempest weather stations. Stations are linked per location in the Locations panel.</p>
          <p>You can only see data from your own stations. Requires an access token, which are available for free to Tempest owners.</p>
          <p>Generate a token in the Tempest app → <em>Settings → Data Authorizations → Create Token</em>, or at <strong>tempestwx.com</strong>.</p>
        </div>
        <input v-model="tokenInput" class="pws-key-input" type="text" placeholder="Paste your personal access token" spellcheck="false" autocomplete="off" @keyup.enter="save" />
        <div class="pws-key-hint">Token stored on this device only.<br/>Station data will live-stream to the app when open.</div>
        <div class="pws-key-actions">
          <button v-if="tempestToken" class="setting-action-btn setting-action-btn--danger" @click="clear">Remove</button>
          <button class="setting-action-btn" @click="save" :disabled="!tokenInput.trim()">Save</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useSettings } from '../../composables/useSettings.js'

const emit = defineEmits(['close'])

const { tempestToken } = useSettings()
const tokenInput = ref(tempestToken.value)

function save()  { tempestToken.value = tokenInput.value.trim(); emit('close') }
function clear() { tempestToken.value = ''; emit('close') }
</script>
