<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-dialog modal-dialog--wide">
      <div class="modal-header">
        <span class="panel-title">Forecast model</span>
        <button class="panel-close" @click="$emit('close')">✕</button>
      </div>
      <p class="modal-hint">You may need to experiment to find the best model for your location.<br/>If unsure, select Auto, or ECMWF.</p>
      <div class="model-list">
        <button
          v-for="m in OPEN_METEO_MODELS"
          :key="m.value"
          class="model-list-item"
          :class="{ active: openMeteoModel === m.value }"
          @click="openMeteoModel = m.value; $emit('close')"
        >
          <div class="model-list-name">{{ m.label }}</div>
          <div class="model-list-hint">{{ m.hint }}</div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useSettings } from '../../composables/useSettings.js'
import { MODELS as OPEN_METEO_MODELS } from '../../services/adapters/openMeteo.js'

defineEmits(['close'])

const { openMeteoModel } = useSettings()
</script>
