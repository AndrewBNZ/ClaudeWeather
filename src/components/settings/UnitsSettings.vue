<template>
  <div class="settings-group">
    <div v-for="group in UNIT_OPTIONS" :key="group.key" class="setting-row setting-row--col">
      <div class="setting-row-label-group">
        <span class="unit-group-icon" v-html="TILE_ICONS[group.iconKey]"></span>
        <div class="setting-label">{{ group.label }}</div>
      </div>
      <div class="unit-pill">
        <button
          v-for="opt in group.options"
          :key="opt.value"
          class="unit-pill-opt"
          :class="{ active: unitPrefs[group.key] === opt.value }"
          @click="unitPrefs = { ...unitPrefs, [group.key]: opt.value }"
        >{{ opt.label }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useSettings, UNIT_OPTIONS } from '../../composables/useSettings.js'
import { TILE_ICONS } from '../../utils/tileIcons.js'

const { unitPrefs } = useSettings()
</script>
