<template>
  <div class="settings-group">
    <button class="setting-row setting-row--nav" @click="$emit('navigate', 'sceneConditions')">
      <div class="setting-row-label-group" style="flex:1;min-width:0;">
        <span class="card-icon" v-html="CARD_ICONS.sceneConditions"></span>
        <div>
          <div class="setting-label">Current Conditions</div>
          <div class="setting-hint" style="display: none;">Configure the scene overlay data points</div>
        </div>
      </div>
      <svg class="setting-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </button>
    <div v-for="(card, i) in cardConfig" :key="card.type"
      :data-card-idx="i"
      class="setting-row setting-row--draggable"
      :class="{ 'tile-dragging': cardDragIndex === i, 'tile-drag-over': cardDragOver === i && cardDragIndex !== i, 'setting-row--nav': CARD_SUBPANEL[card.type] && card.enabled }"
      draggable="true"
      @click="CARD_SUBPANEL[card.type] && card.enabled && $emit('navigate', CARD_SUBPANEL[card.type])"
      @dragstart="onCardDragStart($event, i)"
      @dragover="onCardDragOver($event, i)"
      @dragend="onCardDragEnd"
      @drop="onCardDrop($event, i)"
      @touchstart.passive="onCardTouchStart($event, i)"
    >
      <span class="tile-drag-handle">⠿</span>
      <div class="setting-row-nav-btn setting-row-nav-btn--static">
        <div class="setting-row-label-group">
          <span class="card-icon" v-html="CARD_ICONS[card.type]"></span>
          <div>
            <div class="setting-label">{{ CARD_META[card.type].label }}</div>
            <div class="setting-hint" style="display: none;">{{ CARD_HINTS[card.type] }}</div>
          </div>
        </div>
      </div>
      <button class="toggle-switch" :class="{ on: card.enabled }" @click.stop="toggleCard(card.type)">
        <span class="toggle-thumb" />
      </button>
      <button
        v-if="CARD_SUBPANEL[card.type] && card.enabled"
        class="setting-chevron-btn"
        @click.stop="$emit('navigate', CARD_SUBPANEL[card.type])"
      >
        <svg class="setting-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      <div v-else class="setting-chevron-placeholder"></div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useSettings, CARD_META } from '../../../composables/useSettings.js'
import { CARD_ICONS } from '../../../utils/tileIcons.js'

defineEmits(['navigate'])

const { cardConfig, toggleCard, reorderCards } = useSettings()

const CARD_SUBPANEL = { combinedHourly: 'hourlyForecast', dailyForecast: 'dailyForecast', customAlerts: 'customAlerts', weatherWarnings: 'weatherWarnings', radar: 'radar' }
const CARD_HINTS = {
  combinedHourly:  'Configure the hourly forecast card',
  dailyForecast:   'Configure the daily forecast card',
  sunriseMoon:     'Sunrise, sunset and moon phase',
  radar:           'Radar map',
  customAlerts:    'Set up custom weather alerts',
  weatherWarnings: 'Configure the weather warnings feed',
}

const cardDragIndex = ref(null)
const cardDragOver  = ref(null)
let   cardTouchIdx   = null
let   cardTouchMoved = false

function onCardDragStart(e, i) { cardDragIndex.value = i; e.dataTransfer.effectAllowed = 'move' }
function onCardDragOver(e, i)  { e.preventDefault(); cardDragOver.value = i }
function onCardDragEnd()       { cardDragIndex.value = null; cardDragOver.value = null }
function onCardDrop(e, i) {
  e.preventDefault()
  if (cardDragIndex.value !== null && cardDragIndex.value !== i) reorderCards(cardDragIndex.value, i)
  cardDragIndex.value = null; cardDragOver.value = null
}
function onCardTouchStart(e, i) {
  if (!e.target.closest('.tile-drag-handle')) return
  cardTouchIdx = i; cardTouchMoved = false; cardDragIndex.value = i
  document.addEventListener('touchmove', _onCardTouchMove, { passive: false })
  document.addEventListener('touchend', _onCardTouchEnd)
}
function _onCardTouchMove(e) {
  e.preventDefault()
  cardTouchMoved = true
  const touch = e.touches[0]
  const el    = document.elementFromPoint(touch.clientX, touch.clientY)
  const row   = el?.closest('[data-card-idx]')
  cardDragOver.value = row ? parseInt(row.dataset.cardIdx) : null
}
function _onCardTouchEnd() {
  if (cardTouchMoved && cardTouchIdx !== null && cardDragOver.value !== null && cardTouchIdx !== cardDragOver.value) {
    reorderCards(cardTouchIdx, cardDragOver.value)
  }
  cardTouchIdx = null; cardTouchMoved = false; cardDragIndex.value = null; cardDragOver.value = null
  document.removeEventListener('touchmove', _onCardTouchMove)
  document.removeEventListener('touchend', _onCardTouchEnd)
}
</script>
