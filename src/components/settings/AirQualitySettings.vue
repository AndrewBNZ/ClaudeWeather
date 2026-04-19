<template>
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

const { airQualityConfig } = useSettings()
</script>
