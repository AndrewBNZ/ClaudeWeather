<template>
  <Transition name="fade">
    <div v-if="isOpen" class="overlay" @click.self="emit('close')">
      <Transition name="slide">
        <div v-if="isOpen" class="panel">
          <div class="panel-header">
            <h2 class="panel-title">Locations</h2>
            <button v-if="locations.length > 0" class="close-btn" @click="emit('close')">✕</button>
          </div>

          <div class="search-wrap">
            <LocationSearch
              :location-name="''"
              @location-selected="onLocationSelected"
              @geo-locate="emit('geo-locate', $event)"
            />
          </div>

          <div v-if="locations.length === 0" class="empty">
            <p>No saved locations yet.</p>
            <p class="empty-sub">Search for a city or use the location button above.</p>
          </div>

          <ul v-else class="location-list">
            <li
              v-for="loc in locations"
              :key="`${loc.lat},${loc.lon}`"
              class="location-item"
              :class="{ active: isActive(loc) }"
            >
              <button class="loc-name" @click="emit('select', loc)">
                <span class="loc-icon">📍</span>
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
import LocationSearch from './LocationSearch.vue'

const props = defineProps({
  locations:      { type: Array,   required: true },
  activeLocation: { type: Object,  default: null },
  isOpen:         { type: Boolean, required: true },
})

const emit = defineEmits(['select', 'delete', 'close', 'location-selected', 'geo-locate'])

function isActive(loc) {
  return props.activeLocation &&
    loc.lat === props.activeLocation.lat &&
    loc.lon === props.activeLocation.lon
}

function onLocationSelected(payload) {
  emit('location-selected', payload)
  emit('close')
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
  background: #111827;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
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
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.panel-title {
  font-size: 1rem;
  font-weight: 600;
  color: #e2e8f0;
}

.close-btn {
  background: none;
  border: none;
  color: #64748b;
  font-size: 1rem;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: color 0.15s, background 0.15s;
}
.close-btn:hover {
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.06);
}

.search-wrap {
  padding: 14px 14px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.empty {
  padding: 32px 20px;
  text-align: center;
  color: #64748b;
}
.empty-sub {
  font-size: 0.85rem;
  margin-top: 6px;
  color: #475569;
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
  background: rgba(255, 255, 255, 0.04);
}
.location-item.active {
  border-left-color: #38bdf8;
  background: rgba(56, 189, 248, 0.06);
}

.loc-name {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background: none;
  border: none;
  color: #e2e8f0;
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

.loc-icon { font-size: 14px; flex-shrink: 0; }

.loc-delete {
  background: none;
  border: none;
  color: #475569;
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
