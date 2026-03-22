<template>
  <!-- Dropdown card -->
  <Transition name="drop">
    <div v-if="isOpen" class="dropdown" :style="dropdownStyle">
      <div class="dropdown-header">
        <span class="dropdown-title">Locations</span>
        <button class="dropdown-close" @click="emit('close')">✕</button>
      </div>
      <div class="search-section">
        <LocationSearch
          ref="searchRef"
          :location-name="''"
          @location-selected="onLocationSelected"
          @searching="emit('searching', $event)"
        />
      </div>

      <ul class="location-list">
        <!-- Permanent "Current Location" entry -->
        <li class="location-item current-loc-item" :class="{ active: isGeoActive }">
          <button class="loc-name" @click="geoLocate" :disabled="geoLoading">
            <span class="loc-icon">
              <span v-if="geoLoading" class="geo-spinner"></span>
              <span v-else>📍</span>
            </span>
            <span class="loc-name-inner">
              <span class="loc-name-text">Current Location</span>
              <span v-if="isGeoActive && geoLocationName" class="loc-geo-sub">{{ geoLocationName }}</span>
            </span>
          </button>
        </li>

        <!-- Saved locations -->
        <li
          v-for="loc in locations"
          :key="`${loc.lat},${loc.lon}`"
          class="location-item"
          :class="{ active: !isGeoActive && isActive(loc) }"
        >
          <button class="loc-name" @click="emit('select', loc)">
            <span class="loc-name-inner">
              <span class="loc-name-text">{{ loc.name }}</span>
            </span>
          </button>
          <button
            v-if="pwsApiKey"
            class="loc-pws-btn"
            :class="{ 'has-station': !!loc.pwsStation }"
            :title="loc.pwsStation ? 'Change PWS station' : 'Set PWS station'"
            @click.stop="emit('open-pws-picker', loc)"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <line x1="7" y1="18" x2="13" y2="18"/>
              <line x1="10" y1="18" x2="10" y2="11.5"/>
              <path d="M7 11a4.2 4.2 0 0 1 6 0"/>
              <path d="M4.5 8.5a7.7 7.7 0 0 1 11 0"/>
              <circle cx="10" cy="11.5" r="1.5" fill="currentColor" stroke="none"/>
            </svg>
          </button>
          <button class="loc-delete" @click.stop="emit('delete', loc)" title="Remove">✕</button>
        </li>
      </ul>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch } from 'vue'
import LocationSearch from './LocationSearch.vue'

const searchRef = ref(null)
const dropdownStyle = ref({})

const props = defineProps({
  locations:       { type: Array,   required: true },
  activeLocation:  { type: Object,  default: null },
  isOpen:          { type: Boolean, required: true },
  isGeoActive:     { type: Boolean, default: false },
  geoLocationName: { type: String,  default: '' },
  pwsApiKey:       { type: String,  default: '' },
})

const emit = defineEmits(['select', 'delete', 'close', 'location-selected', 'geo-locate', 'searching', 'open-pws-picker'])

watch(() => props.isOpen, (open) => {
  if (open) {
    const btn = document.querySelector('[data-locations-btn]')
    if (btn) {
      const rect = btn.getBoundingClientRect()
      const card = document.querySelector('.conditions')
      const cardRect = card?.getBoundingClientRect()
      const maxHeight = `${window.innerHeight - rect.bottom - 14}px`
      if (cardRect) {
        dropdownStyle.value = { top: `${rect.bottom + 6}px`, left: `${cardRect.left + 8}px`, right: `${window.innerWidth - cardRect.right + 8}px`, maxHeight }
      } else {
        const panelWidth = 320
        const rightEdge = Math.min(rect.right, window.innerWidth - 8)
        const leftEdge = Math.max(rightEdge - panelWidth, 8)
        dropdownStyle.value = { top: `${rect.bottom + 6}px`, left: `${leftEdge}px`, width: `${panelWidth}px`, maxHeight }
      }
    }
    if (!props.locations.length) setTimeout(() => searchRef.value?.focus(), 300)
  }
})

const geoLoading = ref(false)

function isActive(loc) {
  return props.activeLocation &&
    loc.lat === props.activeLocation.lat &&
    loc.lon === props.activeLocation.lon
}

function onLocationSelected(payload) {
  emit('location-selected', payload)
  emit('close')
}

function geoLocate() {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser.')
    return
  }
  geoLoading.value = true
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      geoLoading.value = false
      emit('geo-locate', { lat: pos.coords.latitude, lon: pos.coords.longitude })
    },
    () => {
      geoLoading.value = false
      alert('Unable to retrieve your location. Please search manually.')
    },
    { timeout: 10000 }
  )
}
</script>

<style scoped>
.dropdown {
  position: fixed;
  z-index: 203;
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dropdown-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px 10px 16px;
  border-bottom: 1px solid var(--panel-divider);
  flex-shrink: 0;
}

.dropdown-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.dropdown-close {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1rem;
  padding: 2px 4px;
  cursor: pointer;
  transition: color 0.15s;
}
.dropdown-close:hover { color: var(--text); }

.search-section {
  padding: 8px;
  border-bottom: 1px solid var(--panel-divider);
  flex-shrink: 0;
}

.location-list {
  list-style: none;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  padding: 6px 0;
  border-radius: 0 0 12px 12px;
}

.location-item {
  display: flex;
  align-items: center;
  border-left: 3px solid transparent;
  transition: background 0.15s, border-color 0.15s;
}
.location-item:hover {
  background: var(--btn-bg);
}
.location-item.active {
  border-left-color: #38bdf8;
  background: rgba(56, 189, 248, 0.06);
}

/* Current Location item */
.current-loc-item .loc-name {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 7px 14px;
  background: none;
  border: none;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}
.current-loc-item .loc-name:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.loc-icon {
  flex-shrink: 0;
  width: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
}
.loc-name-inner {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.current-loc-item .loc-name-text {
  font-size: 0.875rem;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.current-loc-item.active .loc-name-text {
  color: #38bdf8;
  font-weight: 600;
}
.loc-geo-sub {
  font-size: 0.74rem;
  color: var(--text-faint);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.geo-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(56, 189, 248, 0.3);
  border-top-color: #38bdf8;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  display: inline-block;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Saved location items */
.loc-name {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: none;
  border: none;
  color: var(--text);
  font-size: 0.875rem;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
}

.loc-name-inner {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.loc-name-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
.location-item.active .loc-name {
  color: #38bdf8;
  font-weight: 600;
}

.loc-pws-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 10px 6px;
  color: var(--text-faint);
  opacity: 0.4;
  transition: color 0.15s, opacity 0.15s;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}
.loc-pws-btn:hover {
  color: #38bdf8;
  opacity: 0.8;
}
.loc-pws-btn.has-station {
  color: #38bdf8;
  opacity: 1;
}

.loc-delete {
  background: none;
  border: none;
  color: var(--text-faint);
  font-size: 0.9rem;
  cursor: pointer;
  padding: 10px 12px;
  transition: color 0.15s;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}
.loc-delete:hover { color: #f87171; }

/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to       { opacity: 0; }

.drop-enter-active, .drop-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
  transform-origin: top right;
}
.drop-enter-from, .drop-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-6px);
}
</style>
