<template>
  <div class="setting-hint">You may need to experiment to find the best model for your location. If unsure, select Auto, or ECMWF.</div>
  <div class="settings-group">
    <button
      v-for="m in OPEN_METEO_MODELS"
      :key="m.value"
      class="setting-row setting-row--selectable"
      :class="{ active: openMeteoModel === m.value }"
      @click="openMeteoModel = m.value"
    >
      <div>
        <div class="setting-label">{{ m.label }}</div>
        <div class="setting-hint">{{ m.hint }}</div>
      </div>
      <svg v-if="openMeteoModel === m.value" class="setting-checkmark" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
    </button>
  </div>
</template>

<script setup>
import { useSettings } from '../../composables/useSettings.js'
import { MODELS as OPEN_METEO_MODELS } from '../../services/adapters/openMeteo.js'

const { openMeteoModel } = useSettings()
</script>
