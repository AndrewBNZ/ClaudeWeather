<template>
  <div class="card-sheet-overlay" @click.self="$emit('close')">
    <div class="card-sheet">
      <div class="card-sheet-header">
        <span class="panel-title">{{ title }}</span>
        <button class="panel-close" @click="$emit('close')">✕</button>
      </div>
      <div class="card-sheet-body">
        <Suspense>
          <component :is="settingsComponent" />
        </Suspense>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { CARD_SETTINGS_REGISTRY } from '../cards/cardSettingsRegistry.js'

const props = defineProps({ cardType: { type: String, required: true } })
defineEmits(['close'])

const entry            = computed(() => CARD_SETTINGS_REGISTRY[props.cardType])
const title            = computed(() => entry.value?.title ?? '')
const settingsComponent = computed(() => entry.value?.component ?? null)
</script>

<style>
.card-sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 210;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.card-sheet {
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: 20px 20px 0 0;
  width: 100%;
  max-width: 560px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 -4px 32px rgba(0, 0, 0, 0.4);
}

.card-sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--panel-border);
  flex-shrink: 0;
}

.card-sheet-body {
  overflow-y: auto;
  flex: 1;
  padding: 8px 0;
}

/* Slide-up entrance — parent uses <transition name="card-sheet"> */
.card-sheet-enter-active,
.card-sheet-leave-active { transition: opacity 0.25s ease; }
.card-sheet-enter-active .card-sheet,
.card-sheet-leave-active .card-sheet { transition: transform 0.25s ease; }
.card-sheet-enter-from,
.card-sheet-leave-to { opacity: 0; }
.card-sheet-enter-from .card-sheet,
.card-sheet-leave-to .card-sheet { transform: translateY(100%); }
</style>
