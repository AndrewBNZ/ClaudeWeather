<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-dialog">
      <div class="modal-header">
        <span class="panel-title">Weather Details</span>
        <button class="panel-close" @click="$emit('close')">✕</button>
      </div>
      <div class="modal-bulk-actions">
        <button class="modal-bulk-btn" @click="setAllTiles(true)">All On</button>
        <button class="modal-bulk-btn" @click="setAllTiles(false)">All Off</button>
        <button class="modal-bulk-btn" @click="addPageBreak(tileConfig.length - 1)">+ Page</button>
      </div>
      <p class="modal-hint">Drag to reorder · tap to show/hide</p>
      <div class="tile-list">
        <template v-for="(tile, i) in tileConfig" :key="`${tile.type}-${i}`">
          <div v-if="tile.type === 'pageBreak'"
            :data-tile-idx="i"
            class="tile-row tile-page-break"
            :class="{ 'tile-dragging': tileDragIndex === i, 'tile-drag-over': tileDragOver === i && tileDragIndex !== i }"
            draggable="true"
            @dragstart="onTileDragStart($event, i)"
            @dragover="onTileDragOver($event, i)"
            @dragend="onTileDragEnd"
            @drop="onTileDrop($event, i)"
            @touchstart.passive="onTileTouchStart($event, i)"
          >
            <span class="tile-drag-handle">⠿</span>
            <span class="page-break-label">— Page {{ tileConfig.slice(0, i).filter(t => t.type === 'pageBreak').length + 2 }}</span>
            <button class="page-break-remove" @click.stop="removePageBreak(i)" title="Remove page break">✕</button>
          </div>
          <div v-else
            :data-tile-idx="i"
            class="tile-row"
            :class="{ 'tile-dragging': tileDragIndex === i, 'tile-drag-over': tileDragOver === i && tileDragIndex !== i }"
            draggable="true"
            @dragstart="onTileDragStart($event, i)"
            @dragover="onTileDragOver($event, i)"
            @dragend="onTileDragEnd"
            @drop="onTileDrop($event, i)"
            @touchstart.passive="onTileTouchStart($event, i)"
          >
            <span class="tile-drag-handle">⠿</span>
            <span class="tile-icon-label"><span class="tile-svg-icon" v-html="TILE_ICONS[tile.type]"></span>{{ TILE_META[tile.type].label }}</span>
            <button class="toggle-switch" :class="{ on: tile.enabled }" @click.stop="toggleTile(i)">
              <span class="toggle-thumb" />
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useSettings, TILE_META } from '../../composables/useSettings.js'
import { TILE_ICONS } from '../../utils/tileIcons.js'

defineEmits(['close'])

const { tileConfig, toggleTile, setAllTiles, reorderTiles, addPageBreak, removePageBreak } = useSettings()

const tileDragIndex  = ref(null)
const tileDragOver   = ref(null)
let   tileTouchIdx   = null
let   tileTouchMoved = false

function onTileDragStart(e, i) { tileDragIndex.value = i; e.dataTransfer.effectAllowed = 'move' }
function onTileDragOver(e, i)  { e.preventDefault(); tileDragOver.value = i }
function onTileDragEnd()       { tileDragIndex.value = null; tileDragOver.value = null }
function onTileDrop(e, i) {
  e.preventDefault()
  if (tileDragIndex.value !== null && tileDragIndex.value !== i) reorderTiles(tileDragIndex.value, i)
  tileDragIndex.value = null; tileDragOver.value = null
}
function onTileTouchStart(e, i) {
  if (!e.target.closest('.tile-drag-handle')) return
  tileTouchIdx = i; tileTouchMoved = false; tileDragIndex.value = i
  document.addEventListener('touchmove', _onTileTouchMove, { passive: false })
  document.addEventListener('touchend', _onTileTouchEnd)
}
function _onTileTouchMove(e) {
  e.preventDefault()
  tileTouchMoved = true
  const touch = e.touches[0]
  const el    = document.elementFromPoint(touch.clientX, touch.clientY)
  const row   = el?.closest('[data-tile-idx]')
  tileDragOver.value = row ? parseInt(row.dataset.tileIdx) : null
}
function _onTileTouchEnd() {
  if (tileTouchMoved && tileTouchIdx !== null && tileDragOver.value !== null && tileTouchIdx !== tileDragOver.value) {
    reorderTiles(tileTouchIdx, tileDragOver.value)
  }
  tileTouchIdx = null; tileTouchMoved = false; tileDragIndex.value = null; tileDragOver.value = null
  document.removeEventListener('touchmove', _onTileTouchMove)
  document.removeEventListener('touchend', _onTileTouchEnd)
}
</script>
