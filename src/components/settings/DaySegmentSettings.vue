<template>
  <div class="settings-group">
    <div class="setting-row">
      <div>
        <div class="setting-label">Title</div>
      </div>
      <button class="toggle-switch" :class="{ on: layout.showTitle }" @click="layout.showTitle = !layout.showTitle">
        <span class="toggle-thumb" />
      </button>
    </div>
    <div class="setting-row setting-row--col">
      <div class="setting-label">Size</div>
      <div class="unit-pill">
        <button :class="['unit-pill-opt', { active: layout.size === 'S' }]" @click="layout.size = 'S'">S</button>
        <button :class="['unit-pill-opt', { active: layout.size === 'M' }]" @click="layout.size = 'M'">M</button>
        <button :class="['unit-pill-opt', { active: layout.size === 'L' }]" @click="layout.size = 'L'">L</button>
      </div>
    </div>
  </div>

  <div class="settings-group settings-group--tile-list">
    <div class="other-pts-header">
      <span class="setting-hint">Drag to reorder</span>
      <span class="other-pts-header-spacer"></span>
      <span class="other-pts-col-lbl">Show</span>
    </div>
    <div class="tile-list">
      <div
        v-for="pt in dataPoints"
        :key="pt.type"
        :data-seg-idx="pt._idx"
        class="tile-row"
        :class="{
          'tile-dragging':  dragIndex === pt._idx,
          'tile-drag-over': dragOver === pt._idx && dragIndex !== pt._idx,
        }"
        draggable="true"
        @dragstart="onDragStart($event, pt._idx)"
        @dragover="onDragOver($event, pt._idx)"
        @dragend="onDragEnd"
        @drop="onDrop($event, pt._idx)"
        @touchstart.passive="onTouchStart($event, pt._idx)"
      >
        <span class="tile-drag-handle" aria-hidden="true">⠿</span>
        <span class="tile-icon-label">
          <span class="tile-svg-icon" v-html="TILE_ICONS[DATA_TYPES[pt.type]?.iconKey ?? pt.type]"></span>
          {{ POINT_LABELS[pt.type] ?? pt.type }}
        </span>
        <button
          class="check-btn" :class="{ on: pt.enabled }"
          @click.stop="toggleDaySegmentPoint(pt.type)"
          aria-label="Toggle visibility"
        >
          <svg v-if="pt.enabled" viewBox="0 0 10 10" fill="none">
            <polyline points="1.5,5 4,7.5 8.5,2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
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

const { daySegmentLayout, toggleDaySegmentPoint, reorderDaySegmentPoints } = useSettings()

const layout = computed(() => daySegmentLayout.value)

const dataPoints = computed(() =>
  layout.value.dataPoints.map((p, i) => ({ ...p, _idx: i }))
)

// ── Drag & drop reorder ──────────────────────────────────────────────────────

const dragIndex = ref(null)
const dragOver  = ref(null)
let touchIdx    = null
let touchMoved  = false

function onDragStart(e, i) { dragIndex.value = i; e.dataTransfer.effectAllowed = 'move' }
function onDragOver(e, i)  { e.preventDefault(); dragOver.value = i }
function onDragEnd()       { dragIndex.value = null; dragOver.value = null }
function onDrop(e, i) {
  e.preventDefault()
  if (dragIndex.value !== null && dragIndex.value !== i) reorderDaySegmentPoints(dragIndex.value, i)
  dragIndex.value = null; dragOver.value = null
}
function onTouchStart(e, i) {
  if (!e.target.closest('.tile-drag-handle')) return
  touchIdx = i; touchMoved = false; dragIndex.value = i
  document.addEventListener('touchmove', _onTouchMove, { passive: false })
  document.addEventListener('touchend', _onTouchEnd)
}
function _onTouchMove(e) {
  e.preventDefault()
  touchMoved = true
  const touch = e.touches[0]
  const el    = document.elementFromPoint(touch.clientX, touch.clientY)
  const row   = el?.closest('[data-seg-idx]')
  dragOver.value = row ? parseInt(row.dataset.segIdx) : null
}
function _onTouchEnd() {
  if (touchMoved && touchIdx !== null && dragOver.value !== null && touchIdx !== dragOver.value) {
    reorderDaySegmentPoints(touchIdx, dragOver.value)
  }
  touchIdx = null; touchMoved = false; dragIndex.value = null; dragOver.value = null
  document.removeEventListener('touchmove', _onTouchMove)
  document.removeEventListener('touchend', _onTouchEnd)
}
</script>
