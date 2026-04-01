<template>
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
</template>

<script setup>
import { ref } from 'vue'
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
let searchTimer    = null

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
  if (results.value.length) showDropdown.value = true
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

.search-input {
  width: 100%;
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 8px;
  padding: 8px 12px;
  color: var(--text);
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
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

.drop-enter-active, .drop-leave-active { transition: opacity 0.15s, transform 0.15s; }
.drop-enter-from, .drop-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
