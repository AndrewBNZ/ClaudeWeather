<template>
  <div class="search-wrap">
    <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="22" y1="22" x2="16.65" y2="16.65"/>
    </svg>
    <input
      ref="inputRef"
      v-model="query"
      class="search-input"
      type="text"
      placeholder="Search for a city or town"
      autocomplete="off"
      @input="onInput"
      @keydown.enter="selectFirst"
      @keydown.esc="closeDropdown"
      @blur="onBlur"
      @focus="onFocus"
    />

    <Teleport to="body">
      <transition name="drop">
        <ul v-if="showDropdown && results.length" class="dropdown" :style="dropdownStyle">
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
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { searchLocations, formatLocationName } from '../services/geocoding.js'

const inputRef = ref(null)
defineExpose({ focus: () => inputRef.value?.focus() })

defineProps({
  locationName: String,
})

const emit = defineEmits(['location-selected', 'searching'])

const query        = ref('')
const results      = ref([])
const showDropdown = ref(false)
const inputRect    = ref(null)
let searchTimer    = null

const dropdownStyle = computed(() => {
  if (!inputRect.value) return {}
  const r = inputRect.value
  return {
    position: 'fixed',
    top:   `${r.bottom + 6}px`,
    left:  `${r.left}px`,
    width: `${r.width}px`,
  }
})

function updateRect() {
  inputRect.value = inputRef.value?.getBoundingClientRect() ?? null
}

function formatSub(r) {
  const parts = []
  if (r.admin1)  parts.push(r.admin1)
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
    const q = query.value
    try {
      const res = await searchLocations(q)
      if (query.value !== q) return  // query changed while fetching
      results.value = res
      if (res.length > 0) updateRect()
      showDropdown.value = res.length > 0
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
    lat:     r.latitude,
    lon:     r.longitude,
    name:    formatLocationName(r),
    country: r.country,
  })
}

function selectFirst() {
  if (results.value.length) selectResult(results.value[0])
}

function closeDropdown() {
  showDropdown.value = false
}

function onFocus() {
  if (results.value.length) {
    updateRect()
    showDropdown.value = true
  }
}

function onBlur() {
  setTimeout(() => { showDropdown.value = false }, 150)
  emit('searching', false)
}
</script>

<style scoped>
.search-wrap {
  position: relative;
  flex: 1;
}

.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 15px;
  height: 15px;
  color: var(--text-faint);
  pointer-events: none;
}

.search-input {
  width: 100%;
  background: var(--input-bg);
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 8px 12px 8px 36px;
  color: var(--text);
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}
.search-input::placeholder { color: var(--text-faint); }
.search-input:focus {
  border-color: rgba(56, 189, 248, 0.5);
  border: 1px solid var(--input-border);
}

.dropdown {
  background: var(--dropdown-bg);
  border: 1px solid var(--input-border);
  border-radius: 10px;
  list-style: none;
  overflow: hidden;
  z-index: 9999;
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

.result-name { color: var(--text); font-weight: 500; font-size: 0.9rem; }
.result-sub  { color: var(--text-muted); font-size: 0.8rem; }

.drop-enter-active, .drop-leave-active { transition: opacity 0.15s, transform 0.15s; }
.drop-enter-from, .drop-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
