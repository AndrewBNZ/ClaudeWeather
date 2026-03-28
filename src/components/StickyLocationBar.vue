<template>
  <div class="sticky-bar" :class="{ blurred: blurred }">
    <span class="sticky-location">{{ locationName || 'ClaudeWeather' }}</span>
    <div class="sticky-actions">
      <button
        data-locations-btn
        class="sticky-btn"
        :class="{ active: locationsOpen }"
        @click="emit('open-locations')"
        title="Saved locations"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="2.5"/>
        </svg>
      </button>
      <button
        data-settings-btn
        class="sticky-btn"
        data-tut="settings"
        :class="{ active: settingsOpen }"
        @click="emit('open-settings')"
        title="Preferences"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
          <line x1="4" y1="6" x2="20" y2="6"/>
          <line x1="4" y1="12" x2="20" y2="12"/>
          <line x1="4" y1="18" x2="20" y2="18"/>
          <circle cx="10" cy="6" r="2.5" fill="currentColor" stroke="none"/>
          <circle cx="16" cy="12" r="2.5" fill="currentColor" stroke="none"/>
          <circle cx="8" cy="18" r="2.5" fill="currentColor" stroke="none"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  locationName:  { type: String,  default: '' },
  locationsOpen: { type: Boolean, default: false },
  settingsOpen:  { type: Boolean, default: false },
  blurred:       { type: Boolean, default: false },
})

const emit = defineEmits(['open-locations', 'open-settings'])
</script>

<style scoped>
.sticky-bar {
  position: sticky;
  top: 0;
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--header-bg);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--header-border);
  transition: filter 0.2s;
}

.sticky-bar.blurred {
  filter: blur(2px);
  pointer-events: none;
}

.sticky-location {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text);
  letter-spacing: -0.01em;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sticky-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.sticky-btn {
  background: var(--btn-bg);
  border: 1px solid var(--btn-border);
  backdrop-filter: blur(8px);
  border-radius: 9999px;
  width: 38px;
  height: 32px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  cursor: pointer;
  transition: background 0.2s;
}
.sticky-btn:hover { background: var(--btn-hover); }
.sticky-btn.active {
  background: rgba(56, 189, 248, 0.15);
  border-color: var(--accent);
  color: var(--accent);
}
.sticky-btn.active:hover { background: rgba(56, 189, 248, 0.22); }
</style>
