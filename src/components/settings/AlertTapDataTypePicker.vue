<template>
  <div class="setting-row setting-row--col">
    <div class="setting-label">On tap, show chart</div>
    <div class="slot-scroll" ref="scrollEl"><div class="data-point-grid">
      <button
        v-for="opt in ALERT_TAP_DATA_TYPE_OPTIONS"
        :key="opt.type"
        :class="['data-point-opt', { active: (modelValue ?? 'none') === opt.type }]"
        @click="$emit('update:modelValue', opt.type)"
      >
        <span v-if="opt.iconKey" class="tile-svg-icon" v-html="TILE_ICONS[opt.iconKey]"></span>
        {{ opt.label }}
      </button>
    </div></div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { ALERT_TAP_DATA_TYPE_OPTIONS } from '../../composables/useSettings.js'
import { TILE_ICONS } from '../../utils/tileIcons.js'

defineProps({ modelValue: { type: String, default: 'none' } })
defineEmits(['update:modelValue'])

const scrollEl = ref(null)

onMounted(async () => {
  await nextTick()
  const el = scrollEl.value
  if (!el) return
  const active = el.querySelector('.data-point-opt.active')
  if (!active) return
  const elRect     = el.getBoundingClientRect()
  const activeRect = active.getBoundingClientRect()
  el.scrollLeft += activeRect.left - elRect.left - (elRect.width / 2 - activeRect.width / 2)
})
</script>

<style scoped>
.slot-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  overscroll-behavior-x: contain;
  touch-action: pan-x;
}
.slot-scroll::-webkit-scrollbar { display: none; }
.slot-scroll :deep(.data-point-grid) {
  flex-wrap: nowrap;
  align-items: center;
  padding-bottom: 2px;
}
.slot-scroll :deep(.data-point-opt) {
  flex-shrink: 0;
  white-space: nowrap;
}
</style>
