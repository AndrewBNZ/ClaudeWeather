<template>
  <div class="location-bar">
    <button class="geo-btn" @click="geoLocate" :disabled="geoLoading" title="Use my location">
      <span v-if="geoLoading" class="geo-spinner"></span>
      <span v-else>📍</span>
    </button>

    <div class="search-wrap">
      <input
        ref="inputRef"
        v-model="query"
        class="search-input"
        type="text"
        placeholder="Search for a location…"
        autocomplete="off"
        @input="onInput"
        @keydown.enter="selectFirst"
        @keydown.esc="closeDropdown"
        @blur="onBlur"
        @focus="onFocus"
      />

      <transition name="drop">
        <ul v-if="showDropdown && results.length" class="dropdown">
          <li
            v-for="r in results"
            :key="r.id"
            @mousedown.prevent="selectResult(r)"
          >
            <span class="result-name">{{ r.name }}</span>
            <span class="result-sub">{{ formatSub(r) }}</span>
          </li>
        </ul>
      </transition>
    </div>

    <span v-if="locationName" class="current-loc">{{ locationName }}</span>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { searchLocations, formatLocationName } from '../services/geocoding.js'

const props = defineProps({
  locationName: String,
})

const emit = defineEmits(['location-selected', 'geo-locate', 'searching'])

const query       = ref('')
const results     = ref([])
const showDropdown = ref(false)
const geoLoading  = ref(false)
let searchTimer   = null

function formatSub(r) {
  const parts = []
  if (r.admin1) parts.push(r.admin1)
  if (r.country) parts.push(r.country)
  return parts.join(', ')
}

function onInput() {
  clearTimeout(searchTimer)
  if (query.value.trim().length < 2) {
    results.value = []
    showDropdown.value = false
    emit('searching', false)
    return
  }
  emit('searching', true)
  searchTimer = setTimeout(async () => {
    try {
      results.value = await searchLocations(query.value)
      showDropdown.value = results.value.length > 0
    } catch {
      results.value = []
    }
  }, 300)
}

function selectResult(r) {
  query.value = ''
  showDropdown.value = false
  results.value = []
  emit('location-selected', {
    lat: r.latitude,
    lon: r.longitude,
    name: formatLocationName(r),
  })
}

function selectFirst() {
  if (results.value.length) selectResult(results.value[0])
}

function closeDropdown() {
  showDropdown.value = false
}

function onFocus() {
  if (results.value.length) showDropdown.value = true
}

function onBlur() {
  setTimeout(() => { showDropdown.value = false }, 150)
  emit('searching', false)
}

async function geoLocate() {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser.')
    return
  }
  geoLoading.value = true
  emit('searching', true)
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      geoLoading.value = false
      emit('searching', false)
      emit('geo-locate', { lat: pos.coords.latitude, lon: pos.coords.longitude })
    },
    () => {
      geoLoading.value = false
      emit('searching', false)
      alert('Unable to retrieve your location. Please search manually.')
    },
    { timeout: 10000 }
  )
}
</script>

<style scoped>
.location-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
}

.geo-btn {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.25);
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, transform 0.15s;
}
.geo-btn:hover:not(:disabled) {
  background: rgba(56, 189, 248, 0.22);
  transform: scale(1.08);
}
.geo-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.geo-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(56, 189, 248, 0.3);
  border-top-color: #38bdf8;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.search-wrap {
  position: relative;
  flex: 1;
}

.search-input {
  width: 100%;
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 8px;
  padding: 8px 12px;
  color: var(--text);
  outline: none;
  transition: border-color 0.2s;
}
.search-input::placeholder { color: var(--text-faint); }
.search-input:focus {
  border-color: rgba(56, 189, 248, 0.5);
}

.dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: var(--dropdown-bg);
  border: 1px solid var(--input-border);
  border-radius: 10px;
  list-style: none;
  overflow: hidden;
  z-index: 100;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
}

.dropdown li {
  display: flex;
  flex-direction: column;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.15s;
  gap: 2px;
}
.dropdown li:hover { background: rgba(56, 189, 248, 0.1); }
.dropdown li + li { border-top: 1px solid var(--row-border); }

.result-name { color: var(--text); font-weight: 500; }
.result-sub  { color: var(--text-muted); font-size: 0.8rem; }

.current-loc {
  color: var(--text-muted);
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
}

.drop-enter-active, .drop-leave-active { transition: opacity 0.15s, transform 0.15s; }
.drop-enter-from, .drop-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
