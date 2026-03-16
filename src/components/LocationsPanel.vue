<template>
  <Transition name="fade">
    <div v-if="isOpen" class="overlay" @click.self="emit('close')">
      <Transition name="slide">
        <div v-if="isOpen" class="panel">
          <div class="panel-header">
            <h2 class="panel-title">Locations</h2>
            <button class="close-btn" @click="emit('close')">✕</button>
          </div>

          <div class="search-wrap">
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
                <span class="loc-name-text">{{ loc.name }}</span>
              </button>
              <button class="loc-delete" @click.stop="emit('delete', loc)" title="Remove">✕</button>
            </li>

          </ul>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch } from 'vue'
import LocationSearch from './LocationSearch.vue'

const searchRef = ref(null)

const props = defineProps({
  locations:       { type: Array,   required: true },
  activeLocation:  { type: Object,  default: null },
  isOpen:          { type: Boolean, required: true },
  isGeoActive:     { type: Boolean, default: false },
  geoLocationName: { type: String,  default: '' },
})

const emit = defineEmits(['select', 'delete', 'close', 'location-selected', 'geo-locate', 'searching'])

watch(() => props.isOpen, (open) => {
  if (open && !props.locations.length) setTimeout(() => searchRef.value?.focus(), 300)
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
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
  backdrop-filter: blur(2px);
}

.panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 340px;
  height: 100vh;
  background: var(--panel-bg);
  border-left: 1px solid var(--panel-border);
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  z-index: 201;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 14px;
  border-bottom: 1px solid var(--panel-divider);
  flex-shrink: 0;
}

.panel-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1rem;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: color 0.15s, background 0.15s;
}
.close-btn:hover {
  color: var(--text);
  background: var(--btn-bg);
}

.search-wrap {
  padding: 6px 8px;
  border-bottom: 1px solid var(--panel-divider);
  flex-shrink: 0;
}

.location-list {
  list-style: none;
  overflow-y: auto;
  flex: 1;
  padding: 8px 0;
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
  padding: 12px 16px;
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
  font-size: 0.9rem;
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
  font-size: 0.76rem;
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
  padding: 14px 16px;
  background: none;
  border: none;
  color: var(--text);
  font-size: 0.9rem;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
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

.loc-delete {
  background: none;
  border: none;
  color: var(--text-faint);
  font-size: 0.75rem;
  cursor: pointer;
  padding: 14px 14px;
  transition: color 0.15s;
  flex-shrink: 0;
}
.loc-delete:hover { color: #f87171; }


/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to       { opacity: 0; }

.slide-enter-active, .slide-leave-active { transition: transform 0.25s ease; }
.slide-enter-from, .slide-leave-to       { transform: translateX(100%); }
</style>
