<template>
  <div v-if="props.lat || props.lng" class="fs-preview-label">Preview</div>
  <div v-if="props.lat || props.lng" class="fs-preview">
    <AirQualityCard :lat="props.lat" :lng="props.lng" :utc-offset="props.utcOffset" />
  </div>
  <div class="settings-group">
    <div class="setting-row">
      <div>
        <div class="setting-label">Title</div>
      </div>
      <button class="toggle-switch" :class="{ on: airQualityConfig.showTitle }" @click="airQualityConfig.showTitle = !airQualityConfig.showTitle">
        <span class="toggle-thumb" />
      </button>
    </div>
  </div>
  <div class="settings-group">
    <div class="setting-row">
      <div>
        <div class="setting-label">24h trend</div>
        <div class="setting-hint">Show a bar chart of AQI over the next 24 hours.</div>
      </div>
      <button class="toggle-switch" :class="{ on: airQualityConfig.showTrend }" @click="airQualityConfig.showTrend = !airQualityConfig.showTrend">
        <span class="toggle-thumb" />
      </button>
    </div>
    <div class="setting-row">
      <div>
        <div class="setting-label">Show US AQI</div>
        <div class="setting-hint">Display the US AQI value alongside European AQI.</div>
      </div>
      <button class="toggle-switch" :class="{ on: airQualityConfig.showUsAqi }" @click="airQualityConfig.showUsAqi = !airQualityConfig.showUsAqi">
        <span class="toggle-thumb" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { useSettings } from '../../composables/useSettings.js'
import AirQualityCard from '../../cards/AirQualityCard.vue'

const props = defineProps({
  lat:       { type: Number, default: 0 },
  lng:       { type: Number, default: 0 },
  utcOffset: { type: Number, default: 0 },
})
const { airQualityConfig } = useSettings()
</script>

<style scoped>
.fs-preview-label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-faint);
  padding: 0 4px;
}

.fs-preview {
  background: var(--sheet-item-bg);
  border-radius: 12px;
  overflow: hidden;
  pointer-events: none;
  border: 2px dashed rgba(0,0,0,0.15);
}

.fs-preview :deep(.card) {
  border-radius: 0;
  box-shadow: none;
  background: transparent;
}
</style>
