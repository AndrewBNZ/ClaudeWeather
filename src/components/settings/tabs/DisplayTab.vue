<template>
  <div class="settings-group">
    <div class="setting-row setting-row--col">
      <div>
        <div class="setting-label">Theme</div>
        <div class="setting-hint">{{ { system: "Follows your device's theme preferences", light: 'Always light', dark: 'Always dark', auto: 'Light between 6am and 8pm, dark at night' }[theme] }}</div>
      </div>
      <div class="unit-pill">
        <button :class="['unit-pill-opt', { active: theme === 'auto' }]"   @click="theme = 'auto'">Auto</button>
        <button :class="['unit-pill-opt', { active: theme === 'system' }]" @click="theme = 'system'">Device</button>
        <button :class="['unit-pill-opt', { active: theme === 'light' }]"  @click="theme = 'light'">Light</button>
        <button :class="['unit-pill-opt', { active: theme === 'dark' }]"   @click="theme = 'dark'">Dark</button>
      </div>
    </div>
    <div class="setting-row">
      <div>
        <div class="setting-label">Style</div>
        <div class="setting-hint">{{ cardStyle === 'cards' ? 'Cards with rounded backgrounds' : 'Flat list of weather info' }}</div>
      </div>
      <div class="unit-pill">
        <button :class="['unit-pill-opt', 'unit-pill-opt--sm', { active: cardStyle === 'cards' }]" @click="cardStyle = 'cards'">Cards</button>
        <button :class="['unit-pill-opt', 'unit-pill-opt--sm', { active: cardStyle === 'flat' }]"  @click="cardStyle = 'flat'">Flat</button>
      </div>
    </div>
    <button class="setting-row setting-row--nav" @click="$emit('navigate', 'weatherIcons')">
      <div>
        <div class="setting-label">Weather icons</div>
        <div class="setting-hint">{{ ICON_SETS.find(s => s.id === iconSet)?.label ?? 'Emoji' }}</div>
      </div>
      <svg class="setting-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </button>
  </div>
  <div class="settings-group">
    <button class="setting-row setting-row--nav" @click="$emit('navigate', 'units')">
      <div>
        <div class="setting-label">Units</div>
        <div class="setting-hint">{{ unitPrefs.temperature === 'fahrenheit' ? '°F' : '°C' }} · {{ { kmh: 'km/h', mph: 'mph', ms: 'm/s', kn: 'kn' }[unitPrefs.wind] }} · {{ unitPrefs.precipitation === 'inch' ? 'in' : 'mm' }}</div>
      </div>
      <svg class="setting-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </button>
    <div class="setting-row">
      <div>
        <div class="setting-label">Time format</div>
        <div class="setting-hint">{{ timeFormat === '12h' ? '12-hour (1:00 pm)' : '24-hour (13:00)' }}</div>
      </div>
      <div class="unit-pill">
        <button :class="['unit-pill-opt', 'unit-pill-opt--sm', { active: timeFormat === '12h' }]" @click="timeFormat = '12h'">12h</button>
        <button :class="['unit-pill-opt', 'unit-pill-opt--sm', { active: timeFormat === '24h' }]" @click="timeFormat = '24h'">24h</button>
      </div>
    </div>
  </div>
  <div class="settings-group">
    <div class="setting-row">
      <div>
        <div class="setting-label">Installed version</div>
        <div class="setting-hint">{{ appVersion }}</div>
      </div>
      <button class="setting-action-btn" @click="openWhatsNew">What's New →</button>
    </div>
    <div class="setting-row">
      <div>
        <div class="setting-label">Weather simulator</div>
        <div class="setting-hint">Preview weather effects on the scene</div>
      </div>
      <button class="toggle-switch" :class="{ on: showSim }" @click="showSim = !showSim">
        <span class="toggle-thumb" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { useSettings } from '../../../composables/useSettings.js'
import { showWhatsNew } from '../../../composables/useWhatsNew.js'

defineEmits(['navigate'])

const { theme, cardStyle, timeFormat, showSim, unitPrefs, landscapeMode, iconSet, ICON_SETS } = useSettings()

const appVersion = __APP_VERSION__

function openWhatsNew() { showWhatsNew.value = true }
</script>
