<template>
  <!-- "Show this card" -->
  <div class="settings-group">
    <div class="setting-row setting-row--col">
      <div class="setting-label">Show this card</div>
      <div class="unit-pill">
        <button
          :class="['unit-pill-opt', { active: customAlertsConfig.show === 'always' }]"
          @click="customAlertsConfig.show = 'always'"
        >Always</button>
        <button
          :class="['unit-pill-opt', { active: customAlertsConfig.show === 'active-only' }]"
          @click="customAlertsConfig.show = 'active-only'"
        >If an alert is active</button>
      </div>
    </div>
  </div>

  <!-- Alert list -->
  <div class="settings-group" style="margin-top: 0.75rem">
    <div v-for="{ alert, i } in sortedAlerts" :key="alert.id" class="alert-list-row" @click="$emit('edit', i)">
      <span class="alert-list-dot" :style="{ background: alert.color }" />
      <span class="alert-list-title">{{ alert.title || 'Untitled' }}</span>
      <div class="alert-list-actions">
        <button
          class="toggle-switch"
          :class="{ on: alert.enabled }"
          @click.stop="toggleAlertEnabled(i)"
          :title="alert.enabled ? 'Disable alert' : 'Enable alert'"
        ><span class="toggle-thumb" /></button>
        <button class="alert-delete-btn" @click.stop="deleteAlert(i)" title="Delete alert">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </button>
        <svg class="alert-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
    </div>
  </div>

  <button class="alerts-add-btn" @click="$emit('edit', -1)">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
    Add Alert
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { useSettings } from '../../composables/useSettings.js'

defineEmits(['edit'])

const { customAlerts, customAlertsConfig } = useSettings()

const sortedAlerts = computed(() =>
  customAlerts.value
    .map((alert, i) => ({ alert, i }))
    .sort((a, b) => (a.alert.title || '').localeCompare(b.alert.title || ''))
)

function deleteAlert(index) {
  customAlerts.value = customAlerts.value.filter((_, i) => i !== index)
}

function toggleAlertEnabled(index) {
  customAlerts.value = customAlerts.value.map((a, i) =>
    i === index ? { ...a, enabled: !a.enabled } : a
  )
}
</script>

<style scoped>
.alert-list-row {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 10px 20px;
  min-height: 60px;
  box-sizing: border-box;
  border-top: 1px solid var(--row-border, rgba(255,255,255,0.07));
  cursor: pointer;
  transition: background 0.12s;
}
.alert-list-row:hover { background: var(--btn-hover); }

.alert-list-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.alert-list-title {
  flex: 1;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.alert-list-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
}

.alert-delete-btn {
  padding: 0.25rem;
  background: none;
  border: none;
  color: inherit;
  opacity: 0.35;
  cursor: pointer;
  line-height: 0;
  border-radius: 0.25rem;
}
.alert-delete-btn:hover { opacity: 0.75; color: #f87171; }

.alert-chevron {
  color: var(--text-faint, rgba(255,255,255,0.25));
  flex-shrink: 0;
  margin-left: 0.1rem;
}

.alerts-add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  margin: 0.4rem 0 0.1rem;
  padding: 10px 20px;
  min-height: 60px;
  box-sizing: border-box;
  border: 1px dashed var(--btn-border, rgba(255,255,255,0.15));
  border-radius: 0.5rem;
  background: transparent;
  color: var(--text-muted, rgba(255,255,255,0.5));
  font-size: 0.84rem;
  width: 100%;
  cursor: pointer;
  transition: opacity 0.15s;
}
.alerts-add-btn:hover { color: var(--text, #fff); }
</style>
