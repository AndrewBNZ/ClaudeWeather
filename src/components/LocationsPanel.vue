<template>
  <Teleport to="body">
    <Transition name="sheet-overlay" @leave="onSheetLeave">
      <div
        v-if="isOpen"
        class="locations-sheet-overlay"
        @click.self="emit('close')"
      >
          <div ref="sheetRef" class="locations-sheet" @click.stop>
            <!-- Drag handle -->
            <div class="sheet-handle-bar" @touchstart.passive="onDragStart" @mousedown="onDragStart">
              <div class="sheet-handle"></div>
            </div>

            <!-- Header -->
            <div class="sheet-header">
              <span class="sheet-title">Locations</span>
              <button class="sheet-close" @click="emit('close')">✕</button>
            </div>

            <!-- Search -->
            <div class="sheet-search">
              <LocationSearch
                ref="searchRef"
                :location-name="''"
                @location-selected="onLocationSelected"
                @searching="emit('searching', $event)"
              />
            </div>

            <!-- Location list -->
            <div class="sheet-list">
              <!-- Permanent "Current Location" entry -->
              <ul class="sheet-group">
                <li class="sheet-item current-loc-item" :class="{ active: isGeoActive }">
                  <button class="sheet-item-btn" @click="geoLocate" :disabled="geoLoading">
                    <span class="loc-icon">
                      <span v-if="geoLoading" class="geo-spinner"></span>
                      <span v-else>📍</span>
                    </span>
                    <span class="loc-name-inner">
                      <span class="loc-name-text">Current Location</span>
                      <span v-if="isGeoActive && geoLocationName" class="loc-geo-sub">{{ geoLocationName }}</span>
                    </span>
                  </button>
                  <svg v-if="isGeoActive" class="setting-checkmark" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                </li>
              </ul>

              <!-- Saved locations -->
              <ul v-if="locations.length" class="sheet-group">
                <li
                  v-for="loc in locations"
                  :key="`${loc.lat},${loc.lon}`"
                  class="sheet-item"
                  :class="{ active: !isGeoActive && isActive(loc) }"
                >
                  <button class="sheet-item-btn" @click="emit('select', loc)">
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
                    <svg width="18" height="18" viewBox="0 -1 20 22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="7" y1="18" x2="13" y2="18"/>
                      <line x1="10" y1="18" x2="10" y2="11.5"/>
                      <path d="M7 11a4.2 4.2 0 0 1 6 0"/>
                      <path d="M4.5 8.5a7.7 7.7 0 0 1 11 0"/>
                      <circle cx="10" cy="11.5" r="1.5" fill="currentColor" stroke="none"/>
                    </svg>
                  </button>
                  <button class="loc-delete" @click.stop="emit('delete', loc)" title="Remove">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6"/>
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                  </button>
                  <span class="loc-checkmark-slot">
                    <svg v-if="!isGeoActive && isActive(loc)" class="setting-checkmark" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                  </span>
                </li>
              </ul>
            </div>
          </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import LocationSearch from './LocationSearch.vue'

const searchRef = ref(null)

// ── Drag-to-dismiss ──────────────────────────────────────────────────────────
const dragStartY       = ref(0)
const dragDelta        = ref(0)
const isDragging       = ref(false)
const sheetRef         = ref(null)
const dragDismissOffset = ref(0)

function onSheetLeave(el, done) {
  const sheet = el.querySelector('.locations-sheet')
  if (!sheet) { done(); return }
  const startPx = dragDismissOffset.value
  dragDismissOffset.value = 0
  sheet.style.transition = 'none'
  sheet.style.transform  = `translateY(${startPx}px)`
  sheet.getBoundingClientRect() // flush layout
  sheet.style.transition = 'transform 0.45s cubic-bezier(0.32, 0.72, 0, 1)'
  sheet.style.transform  = 'translateY(100%)'
  sheet.addEventListener('transitionend', () => {
    sheet.style.transition = ''
    sheet.style.transform  = ''
    done()
  }, { once: true })
}

function onDragStart(e) {
  dragStartY.value = e.touches ? e.touches[0].clientY : e.clientY
  dragDelta.value  = 0
  isDragging.value = true

  const onMove = (e) => {
    const y = e.touches ? e.touches[0].clientY : e.clientY
    dragDelta.value = Math.max(0, y - dragStartY.value)
    if (sheetRef.value) sheetRef.value.style.transform = `translateY(${dragDelta.value}px)`
  }

  const onEnd = () => {
    isDragging.value = false
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onEnd)
    document.removeEventListener('touchmove', onMove)
    document.removeEventListener('touchend', onEnd)

    if (dragDelta.value > 120) {
      dragDismissOffset.value = dragDelta.value
      emit('close')
    } else {
      // Snap back
      if (sheetRef.value) {
        sheetRef.value.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)'
        sheetRef.value.style.transform  = ''
        sheetRef.value.addEventListener('transitionend', () => {
          if (sheetRef.value) sheetRef.value.style.transition = ''
        }, { once: true })
      }
    }
  }

  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onEnd)
  document.addEventListener('touchmove', onMove, { passive: true })
  document.addEventListener('touchend', onEnd)
}

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
    if (!props.locations.length) setTimeout(() => searchRef.value?.focus(), 300)
  }
})

const geoLoading = ref(false)

function isActive(loc) {
  return props.activeLocation &&
    loc.lat == props.activeLocation.lat &&
    loc.lon == props.activeLocation.lon
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
/* ── Overlay / backdrop ──────────────────────────────────────────────────── */
.locations-sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 205;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

/* ── Sheet card ──────────────────────────────────────────────────────────── */
.locations-sheet {
  width: 100%;
  max-width: 640px;
  height: 92dvh;
  height: 92vh; /* fallback */
  height: 92dvh;
  background: var(--sheet-bg);
  border-radius: 20px 20px 0 0;
  border: 1px solid var(--panel-border);
  border-bottom: none;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 -4px 48px rgba(0, 0, 0, 0.5);
}

/* ── Drag handle ─────────────────────────────────────────────────────────── */
.sheet-handle-bar {
  display: flex;
  justify-content: center;
  padding: 10px 0 6px;
  flex-shrink: 0;
  cursor: grab;
}
.sheet-handle {
  width: 36px;
  height: 4px;
  background: var(--sheet-handle);
  border-radius: 9999px;
}

/* ── Header ──────────────────────────────────────────────────────────────── */
.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 16px 10px;
  flex-shrink: 0;
}
.sheet-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text);
}
.sheet-close {
  background: var(--btn-bg);
  border: 1px solid var(--btn-border);
  color: var(--text-muted);
  font-size: 0.85rem;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.sheet-close:hover { background: var(--btn-hover); color: var(--text); }

/* ── Search section ──────────────────────────────────────────────────────── */
.sheet-search {
  padding: 0 12px 10px;
  flex-shrink: 0;
}
.sheet-search :deep(.search-input) {
  background: var(--sheet-input-bg);
  font-size: 1rem;
  padding: 10px 14px 10px 30px;
  border-radius: 12px;
}

/* ── Location list ───────────────────────────────────────────────────────── */
.sheet-list {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  padding: 4px 12px;
  padding-bottom: max(24px, env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ── iOS-style grouped list ──────────────────────────────────────────────── */
.sheet-group {
  list-style: none;
  background: var(--sheet-item-bg);
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
}

/* ── Location row ────────────────────────────────────────────────────────── */
.sheet-item {
  display: flex;
  align-items: center;
  transition: background 0.15s;
  min-height: 60px;
}
.sheet-item + .sheet-item {
  border-top: 1px solid var(--row-border);
}
.sheet-item:hover { background: var(--btn-hover); }

/* ── Primary button inside each card ────────────────────────────────────── */
.sheet-item-btn {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  background: none;
  border: none;
  color: var(--text);
  font-size: 0.9rem;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}
.sheet-item.active .sheet-item-btn { color: #38bdf8; font-weight: 600; }
.current-loc-item .sheet-item-btn:disabled { cursor: not-allowed; opacity: 0.6; }

/* ── Shared inner elements ───────────────────────────────────────────────── */
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
  gap: 2px;
  min-width: 0;
}
.loc-name-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
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

/* ── Action buttons ──────────────────────────────────────────────────────── */
.loc-pws-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 10px 8px;
  color: var(--text-muted);
  opacity: 0.35;
  line-height: 0;
  transition: color 0.15s, opacity 0.15s;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}
.loc-pws-btn:hover { color: #38bdf8; opacity: 0.75; }
.loc-pws-btn.has-station { color: #38bdf8; opacity: 1; }


.loc-checkmark-slot {
  width: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.loc-delete {
  background: none;
  border: none;
  color: var(--text-muted);
  opacity: 0.35;
  cursor: pointer;
  padding: 10px 14px;
  line-height: 0;
  border-radius: 0.25rem;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  transition: opacity 0.15s, color 0.15s;
}
.loc-delete:hover { opacity: 0.75; color: #f87171; }

</style>

<style>
/* ── LocationsPanel transitions (unscoped — teleported to body) ──────────── */
.sheet-overlay-enter-active,
.sheet-overlay-leave-active {
  transition: opacity 0.35s cubic-bezier(0.32, 0.72, 0, 1);
}
.sheet-overlay-enter-from,
.sheet-overlay-leave-to { opacity: 0; }

.sheet-overlay-enter-active .locations-sheet,
.sheet-overlay-leave-active .locations-sheet {
  transition: transform 0.45s cubic-bezier(0.32, 0.72, 0, 1);
}
.sheet-overlay-enter-from .locations-sheet,
.sheet-overlay-leave-to .locations-sheet {
  transform: translateY(100%);
}
</style>
