<template>
  <div class="settings-group">
    <div class="setting-row">
      <div>
        <div class="setting-label">Title</div>
      </div>
      <button class="toggle-switch" :class="{ on: hourlyForecastLayout.showTitle }" @click="hourlyForecastLayout.showTitle = !hourlyForecastLayout.showTitle">
        <span class="toggle-thumb" />
      </button>
    </div>
    <div class="setting-row">
      <div>
        <div class="setting-label">Condition icons</div>
      </div>
      <button class="toggle-switch" :class="{ on: hourlyForecastLayout.showConditions }" @click="hourlyForecastLayout.showConditions = !hourlyForecastLayout.showConditions">
        <span class="toggle-thumb" />
      </button>
    </div>
    <div class="setting-row">
      <div>
        <div class="setting-label">Sunrise &amp; sunset</div>
      </div>
      <button class="toggle-switch" :class="{ on: hourlyForecastLayout.showSunriseSunset }" @click="hourlyForecastLayout.showSunriseSunset = !hourlyForecastLayout.showSunriseSunset">
        <span class="toggle-thumb" />
      </button>
    </div>
    <div class="setting-row">
      <div>
        <div class="setting-label">Data point picker</div>
        <div class="setting-hint">Pill buttons to quickly change the bar chart</div>
      </div>
      <button class="toggle-switch" :class="{ on: hourlyForecastLayout.showDataPointPicker }" @click="hourlyForecastLayout.showDataPointPicker = !hourlyForecastLayout.showDataPointPicker">
        <span class="toggle-thumb" />
      </button>
    </div>
    <div class="setting-row setting-row--col">
      <div>
        <div class="setting-label">Main data point</div>
        <div class="setting-hint">Shown as the primary bar chart</div>
      </div>
      <div class="slot-scroll" ref="mainScrollEl"><div class="data-point-grid">
        <button
          v-for="opt in HOURLY_MAIN_DATA_POINT_OPTIONS"
          :key="opt.type"
          :class="['data-point-opt', { active: hourlyForecastLayout.mainDataPoint === opt.type }]"
          @click="setHourlyMainDataPoint(opt.type)"
        ><span class="tile-svg-icon" v-html="TILE_ICONS[opt.iconKey]"></span>{{ opt.label }}</button>
      </div></div>
    </div>
  </div>
  <div class="settings-group settings-group--tile-list">
    <div class="setting-row settings-group__header" style="border-bottom: none; padding-bottom: 2px;">
      <div class="setting-label">Other data points</div>
    </div>
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
      <button class="check-btn" :class="{ on: pt.enabled || pt.isMain }" :disabled="pt.isMain" @click.stop="!pt.isMain && toggleHourlyOtherPoint(pt.type)" aria-label="Toggle visibility">
        <svg v-if="pt.enabled || pt.isMain" viewBox="0 0 10 10" fill="none"><polyline points="1.5,5 4,7.5 8.5,2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <span class="other-pts-col-divider"></span>
      <button
        class="check-btn" :class="{ on: pt.showInPicker || pt.isMain }"
        :disabled="pt.isMain"
        @click.stop="!pt.isMain && toggleHourlyOtherPointPicker(pt.type)" aria-label="Toggle in picker"
      >
        <svg v-if="pt.showInPicker || pt.isMain" viewBox="0 0 10 10" fill="none"><polyline points="1.5,5 4,7.5 8.5,2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </div>
  </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useSettings, HOURLY_MAIN_DATA_POINT_OPTIONS } from '../../composables/useSettings.js'
import { TILE_ICONS } from '../../utils/tileIcons.js'
import { DATA_TYPES, POINT_LABELS } from '../../utils/dataTypes.js'

const {
  hourlyForecastLayout,
  toggleHourlyOtherPoint, toggleHourlyOtherPointPicker, reorderHourlyOtherPoints, setHourlyMainDataPoint,
} = useSettings()

const mainScrollEl = ref(null)

onMounted(async () => {
  await nextTick()
  const el = mainScrollEl.value
  if (!el) return
  const active = el.querySelector('.data-point-opt.active')
  if (!active) return
  el.scrollLeft = active.offsetLeft + active.offsetWidth / 2 - el.offsetWidth / 2
})

const otherPoints = computed(() => {
  const mainType = hourlyForecastLayout.value.mainDataPoint
  return hourlyForecastLayout.value.otherDataPoints
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
  if (layoutDragIndex.value !== null && layoutDragIndex.value !== i) reorderHourlyOtherPoints(layoutDragIndex.value, i)
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
    reorderHourlyOtherPoints(layoutTouchIdx, layoutDragOver.value)
  }
  layoutTouchIdx = null; layoutTouchMoved = false; layoutDragIndex.value = null; layoutDragOver.value = null
  document.removeEventListener('touchmove', _onLayoutTouchMove)
  document.removeEventListener('touchend', _onLayoutTouchEnd)
}
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
