<template>
  <div class="settings-section-heading">Forecast Data</div>
  <div class="settings-group">
    <div class="setting-row setting-row--nav" style="cursor:default;">
      <div>
        <div class="setting-label">Forecast provider</div>
        <div class="setting-hint">{{ WEATHER_PROVIDERS.find(p => p.id === getWeatherProvider())?.label }}</div>
      </div>
      <div class="setting-chevron-placeholder"></div>
    </div>
    <button class="setting-row setting-row--nav" @click="$emit('navigate', 'forecastModel')">
      <div>
        <div class="setting-label">Forecast model</div>
        <div class="setting-hint">{{ OPEN_METEO_MODELS.find(m => m.value === openMeteoModel)?.label }}</div>
      </div>
      <svg class="setting-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </button>
  </div>
  <div class="settings-section-heading">Personal Weather Stations</div>
  <div class="settings-group">
    <button class="setting-row setting-row--nav" @click="$emit('navigate', 'tempestToken')">
      <div>
        <div class="setting-label">Tempest</div>
        <div class="setting-hint">{{ tempestEnabled ? (tempestToken ? 'Set stations in locations panel' : 'Set your access token to get started') : 'Tempest data temporarily hidden' }}</div>
      </div>
      <div class="toggle-switch" :class="{ on: tempestEnabled }" @click.stop="tempestEnabled = !tempestEnabled">
        <span class="toggle-thumb" />
      </div>
      <svg class="setting-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </button>
    <button class="setting-row setting-row--nav" @click="$emit('navigate', 'pwsKey')">
      <div>
        <div class="setting-label">Weather Underground</div>
        <div class="setting-hint">{{ pwsEnabled ? (pwsApiKey ? 'Set stations in locations panel' : 'Set your API key to get started') : 'WU data temporarily hidden' }}</div>
      </div>
      <div class="toggle-switch" :class="{ on: pwsEnabled }" @click.stop="pwsEnabled = !pwsEnabled">
        <span class="toggle-thumb" />
      </div>
      <svg class="setting-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </button>
  </div>
  <div class="settings-group">
    <div class="setting-row">
      <div>
        <div class="setting-label">Reset</div>
        <div class="setting-hint">Delete all settings and locations</div>
      </div>
      <button class="setting-action-btn setting-action-btn--danger" @click="$emit('reset')">Reset →</button>
    </div>
  </div>
</template>

<script setup>
import { useSettings } from '../../../composables/useSettings.js'
import { MODELS as OPEN_METEO_MODELS } from '../../../services/adapters/openMeteo.js'
import { WEATHER_PROVIDERS, getWeatherProvider } from '../../../services/weatherApi.js'

defineEmits(['navigate', 'reset'])

const { openMeteoModel, pwsEnabled, pwsApiKey, tempestEnabled, tempestToken } = useSettings()
</script>
