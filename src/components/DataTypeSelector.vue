<template>
  <div class="selector card">
    <button
      v-for="dt in types"
      :key="dt.id"
      class="type-btn"
      :class="{ active: activeType === dt.id }"
      :style="activeType === dt.id ? { '--btn-color': dt.color } : {}"
      @click="emit('select', dt.id)"
    >
      <span class="btn-icon">{{ dt.icon }}</span>
      <span class="btn-label">{{ dt.label }}</span>
      <span v-if="activeType === dt.id" class="btn-unit">{{ dt.getUnit(units) }}</span>
    </button>
  </div>
</template>

<script setup>
import { DATA_TYPE_LIST } from '../utils/dataTypes.js'

defineProps({
  activeType: { type: String, required: true },
  units:      { type: String, required: true },
})

const emit  = defineEmits(['select'])
const types = DATA_TYPE_LIST
</script>

<style scoped>
.selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px;
}

.type-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 9999px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04);
  color: #94a3b8;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background 0.2s, color 0.2s, border-color 0.2s, transform 0.15s;
  white-space: nowrap;
}

.type-btn:hover:not(.active) {
  background: rgba(255,255,255,0.08);
  color: #e2e8f0;
  transform: translateY(-1px);
}

.type-btn.active {
  background: color-mix(in srgb, var(--btn-color) 20%, transparent);
  border-color: color-mix(in srgb, var(--btn-color) 50%, transparent);
  color: var(--btn-color);
}

.btn-icon   { font-size: 1rem; }
.btn-label  { font-weight: 600; }
.btn-unit   { font-size: 0.75rem; opacity: 0.75; }
</style>
