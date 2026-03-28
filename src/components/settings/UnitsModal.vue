<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-dialog modal-dialog--wide">
      <div class="modal-header">
        <span class="panel-title">Units</span>
        <button class="panel-close" @click="$emit('close')">✕</button>
      </div>
      <div class="units-modal-body">
        <div v-for="group in UNIT_OPTIONS" :key="group.key" class="unit-group">
          <div class="unit-group-label"><span class="unit-group-icon" v-html="TILE_ICONS[group.iconKey]"></span>{{ group.label }}</div>
          <div class="unit-group-pills">
            <button
              v-for="opt in group.options"
              :key="opt.value"
              class="unit-modal-pill"
              :class="{ active: unitPrefs[group.key] === opt.value }"
              @click="unitPrefs = { ...unitPrefs, [group.key]: opt.value }"
            >{{ opt.label }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useSettings, UNIT_OPTIONS } from '../../composables/useSettings.js'
import { TILE_ICONS } from '../../utils/tileIcons.js'

defineEmits(['close'])

const { unitPrefs } = useSettings()
</script>
