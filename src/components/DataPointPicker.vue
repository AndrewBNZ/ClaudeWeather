<template>
  <div v-if="show && options.length" class="dp-picker" :class="{ 'dp-picker--inset': inset }">
    <button
      v-for="opt in options"
      :key="opt.type"
      class="dp-pill"
      :class="{ active: modelValue === opt.type }"
      :style="modelValue === opt.type ? { '--pill-color': DATA_TYPES[opt.type].color } : {}"
      @click="$emit('update:modelValue', opt.type)"
    >
      <span class="dp-pill-icon" v-html="TILE_ICONS[DATA_TYPES[opt.type]?.iconKey ?? opt.type]"></span>
      {{ opt.label ?? DATA_TYPES[opt.type]?.shortLabel ?? opt.type }}
    </button>
  </div>
</template>

<script setup>
import { DATA_TYPES } from '../utils/dataTypes.js'
import { TILE_ICONS } from '../utils/tileIcons.js'

defineProps({
  show:       { type: Boolean, default: true },
  options:    { type: Array,   default: () => [] }, // [{ type: String, label?: String }]
  modelValue: { type: String,  default: null },
  // inset: add horizontal padding (use when the parent card has no own horizontal padding)
  inset:      { type: Boolean, default: false },
})

defineEmits(['update:modelValue'])
</script>

<style scoped>
.dp-picker {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 10px;
}
.dp-picker::-webkit-scrollbar { display: none; }
.dp-picker--inset { padding-left: 16px; padding-right: 16px; }

.dp-pill {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid var(--card-border);
  background: transparent;
  color: var(--text-muted);
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  white-space: nowrap;
}
.dp-pill-icon { display: flex; align-items: center; }
.dp-pill-icon :deep(svg) { width: 13px; height: 13px; }

.dp-pill.active {
  background: color-mix(in srgb, var(--pill-color) 18%, transparent);
  border-color: var(--pill-color);
  color: var(--pill-color);
  font-weight: 600;
}

@media (max-width: 1000px) {
  .dp-picker--inset { padding-left: 10px; padding-right: 10px; }
  .dp-picker { padding-bottom: 8px; }
}

@media (orientation: landscape) and (max-height: 900px) and (max-width: 1366px) {
  .dp-picker--inset { padding-left: 10px; padding-right: 10px; }
  .dp-picker { padding-bottom: 6px; }
}
</style>
