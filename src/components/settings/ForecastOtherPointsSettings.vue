<template>
  <div class="settings-group settings-group--tile-list">
    <div class="other-pts-header">
      <span class="setting-hint">Drag to reorder</span>
      <span class="other-pts-header-spacer"></span>
      <span class="other-pts-col-lbl">Chart</span>
      <span class="other-pts-col-divider"></span>
      <span class="other-pts-col-lbl">Pick</span>
    </div>
    <div class="tile-list">
      <div
        v-for="pt in otherPoints"
        :key="pt.type"
        :data-layout-idx="pt._idx"
        class="tile-row"
        :class="{ 'tile-dragging': layoutDragIndex === pt._idx, 'tile-drag-over': layoutDragOver === pt._idx && layoutDragIndex !== pt._idx }"
        draggable="true"
        @dragstart="onLayoutDragStart($event, pt._idx)"
        @dragover="onLayoutDragOver($event, pt._idx)"
        @dragend="onLayoutDragEnd"
        @drop="onLayoutDrop($event, pt._idx)"
        @touchstart.passive="onLayoutTouchStart($event, pt._idx)"
      >
        <span class="tile-drag-handle" aria-hidden="true">⠿</span>
        <span class="tile-icon-label"><span class="tile-svg-icon" v-html="TILE_ICONS[DATA_TYPES[pt.type]?.iconKey ?? pt.type]"></span>{{ POINT_LABELS[pt.type] ?? pt.type }}</span>
        <button class="check-btn" :class="{ on: pt.enabled || pt.isMain }" :disabled="pt.isMain" @click.stop="!pt.isMain && toggleOtherPoint(pt.type)" aria-label="Toggle visibility">
          <svg v-if="pt.enabled || pt.isMain" viewBox="0 0 10 10" fill="none"><polyline points="1.5,5 4,7.5 8.5,2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <span class="other-pts-col-divider"></span>
        <button
          class="check-btn" :class="{ on: pt.showInPicker || pt.isMain }"
          :disabled="pt.isMain"
          @click.stop="!pt.isMain && toggleOtherPointPicker(pt.type)" aria-label="Toggle in picker"
        >
          <svg v-if="pt.showInPicker || pt.isMain" viewBox="0 0 10 10" fill="none"><polyline points="1.5,5 4,7.5 8.5,2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSettings } from '../../composables/useSettings.js'
import { TILE_ICONS } from '../../utils/tileIcons.js'
import { DATA_TYPES, POINT_LABELS } from '../../utils/dataTypes.js'

const props = defineProps({
  type: { type: String, required: true }, // 'daily' | 'hourly'
})

const {
  dailyForecastLayout, hourlyForecastLayout,
  toggleDailyOtherPoint, toggleDailyOtherPointPicker, reorderDailyOtherPoints,
  toggleHourlyOtherPoint, toggleHourlyOtherPointPicker, reorderHourlyOtherPoints,
} = useSettings()

const isDaily = computed(() => props.type === 'daily')
const layout  = computed(() => isDaily.value ? dailyForecastLayout.value : hourlyForecastLayout.value)

const toggleOtherPoint       = computed(() => isDaily.value ? toggleDailyOtherPoint       : toggleHourlyOtherPoint)
const toggleOtherPointPicker = computed(() => isDaily.value ? toggleDailyOtherPointPicker : toggleHourlyOtherPointPicker)
const reorderOtherPoints     = computed(() => isDaily.value ? reorderDailyOtherPoints     : reorderHourlyOtherPoints)

const otherPoints = computed(() => {
  const mainType = layout.value.mainDataPoint
  return layout.value.otherDataPoints
    .map((p, i) => ({ ...p, _idx: i, isMain: p.type === mainType }))
})

const layoutDragIndex  = ref(null)
const layoutDragOver   = ref(null)
let   layoutTouchIdx   = null
let   layoutTouchMoved = false

function onLayoutDragStart(e, i) { layoutDragIndex.value = i; e.dataTransfer.effectAllowed = 'move' }
function onLayoutDragOver(e, i)  { e.preventDefault(); layoutDragOver.value = i }
function onLayoutDragEnd()       { layoutDragIndex.value = null; layoutDragOver.value = null }
function onLayoutDrop(e, i) {
  e.preventDefault()
  if (layoutDragIndex.value !== null && layoutDragIndex.value !== i) reorderOtherPoints.value(layoutDragIndex.value, i)
  layoutDragIndex.value = null; layoutDragOver.value = null
}
function onLayoutTouchStart(e, i) {
  if (!e.target.closest('.tile-drag-handle')) return
  layoutTouchIdx = i; layoutTouchMoved = false; layoutDragIndex.value = i
  document.addEventListener('touchmove', _onLayoutTouchMove, { passive: false })
  document.addEventListener('touchend', _onLayoutTouchEnd)
}
function _onLayoutTouchMove(e) {
  e.preventDefault()
  layoutTouchMoved = true
  const touch = e.touches[0]
  const el    = document.elementFromPoint(touch.clientX, touch.clientY)
  const row   = el?.closest('[data-layout-idx]')
  layoutDragOver.value = row ? parseInt(row.dataset.layoutIdx) : null
}
function _onLayoutTouchEnd() {
  if (layoutTouchMoved && layoutTouchIdx !== null && layoutDragOver.value !== null && layoutTouchIdx !== layoutDragOver.value) {
    reorderOtherPoints.value(layoutTouchIdx, layoutDragOver.value)
  }
  layoutTouchIdx = null; layoutTouchMoved = false; layoutDragIndex.value = null; layoutDragOver.value = null
  document.removeEventListener('touchmove', _onLayoutTouchMove)
  document.removeEventListener('touchend', _onLayoutTouchEnd)
}
</script>
