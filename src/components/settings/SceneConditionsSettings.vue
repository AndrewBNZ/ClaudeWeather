<template>
  <div v-for="(slot, idx) in sceneOverlayLayout.slots" :key="idx" class="setting-row setting-row--col">
    <div>
      <div class="setting-label">Slot {{ idx + 1 }}</div>
    </div>
    <div class="slot-scroll" :ref="el => { if (el) scrollEls[idx] = el }"><div class="data-point-grid">
      <button
        v-for="opt in SCENE_OVERLAY_SLOT_OPTIONS"
        :key="opt.type"
        :class="['data-point-opt', { active: slot === opt.type }]"
        @click="setSceneOverlaySlot(idx, opt.type)"
      >
        <span v-if="opt.iconKey" class="tile-svg-icon" v-html="TILE_ICONS[opt.iconKey]"></span>
        {{ opt.label }}
      </button>
    </div></div>
  </div>
</template>

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

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useSettings, SCENE_OVERLAY_SLOT_OPTIONS } from '../../composables/useSettings.js'
import { TILE_ICONS } from '../../utils/tileIcons.js'

const { sceneOverlayLayout, setSceneOverlaySlot } = useSettings()

const scrollEls = ref([])

onMounted(async () => {
  await nextTick()
  scrollEls.value.forEach(el => {
    if (!el) return
    const active = el.querySelector('.data-point-opt.active')
    if (!active) return
    const center = el.offsetWidth / 2
    el.scrollLeft = active.offsetLeft + active.offsetWidth / 2 - center
  })
})
</script>
