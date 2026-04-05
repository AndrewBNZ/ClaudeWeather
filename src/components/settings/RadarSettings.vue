<template>
  <div class="settings-group">
    <div class="setting-row">
      <div>
        <div class="setting-label">Weather warnings</div>
        <div class="setting-hint">Draws areas on the map. Tap to view details.</div>
      </div>
      <button class="toggle-switch" :class="{ on: radarConfig.showWarnings }" @click="radarConfig.showWarnings = !radarConfig.showWarnings">
        <span class="toggle-thumb" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { useSettings } from '../../composables/useSettings.js'

const { radarConfig } = useSettings()
</script>

