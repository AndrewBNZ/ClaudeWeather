<template>
  <div class="ww-modal-overlay" @click.self="emit('close')">
    <div class="ww-modal" :style="{ '--severity-color': alertColor(alert) }">

      <!-- Header -->
      <div class="ww-modal-header">
        <div
          class="ww-modal-badge"
          :style="alert.severity && alert.severity !== 'Alert'
            ? { background: alertColor(alert), color: colorTextColor(alertColor(alert)) }
            : { background: 'transparent', color: alertColor(alert) }"
        >
          <template v-if="alert.severity && alert.severity !== 'Alert'">{{ alert.severity }}</template>
          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="display:block">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
          </svg>
        </div>
        <div class="ww-modal-title">{{ alert.headline || alert.event }}</div>
        <button class="ww-modal-close" @click="emit('close')">✕</button>
      </div>

      <!-- Scrollable body -->
      <div class="ww-modal-body">

        <!-- Area + Timing + Map + Description -->
        <div v-if="displayArea || displayOnset || displayExpires || hasPolygons || detailLoading || displayDescription" class="settings-group">
          <div v-if="displayArea" class="setting-row ww-area-row">
            <span class="setting-label">{{ displayArea }}</span>
          </div>
          <div v-if="displayOnset || displayExpires" class="setting-row ww-timing-row">
            <span class="ww-timing-value">
              <span v-if="displayOnset">{{ fmt(displayOnset) }}</span>
              <span v-if="displayOnset && displayExpires"> – </span>
              <span v-if="displayExpires">{{ fmt(displayExpires) }}</span>
            </span>
          </div>
          <div v-if="hasPolygons" ref="mapEl" class="ww-modal-map ww-modal-map--ingroup" />

          <!-- Loading detail -->
          <div v-if="detailLoading" class="ww-modal-loading">
            <div class="ww-skeleton" />
            <div class="ww-skeleton ww-skeleton--short" />
            <div class="ww-skeleton" />
          </div>
          <div v-else-if="displayDescription" class="setting-row ww-text-row">
            <p class="ww-modal-section">{{ displayDescription }}</p>
          </div>
        </div>

        <template v-if="!detailLoading">
          <!-- Instruction -->
          <div v-if="detail.instruction" class="settings-group">
            <div class="setting-row ww-text-row">
              <div class="ww-text-row-inner">
                <div class="ww-instruction-label">What to do</div>
                <p class="ww-modal-section">{{ detail.instruction }}</p>
              </div>
            </div>
          </div>

          <!-- Issued / Next update / External link -->
          <div v-if="displayEffective || detail.parameters?.NextUpdate || detail.web" class="settings-group">
            <div v-if="displayEffective" class="setting-row ww-meta-row">
              <span class="ww-timing-label">Issued</span>
              <span class="ww-timing-value">{{ fmt(displayEffective) }}</span>
            </div>
            <div v-if="detail.parameters?.NextUpdate" class="setting-row ww-meta-row">
              <span class="ww-timing-label">Next update</span>
              <span class="ww-timing-value">{{ fmt(detail.parameters.NextUpdate) }}</span>
            </div>
            <div v-if="detail.web" class="setting-row ww-meta-row">
              <span class="ww-timing-label">Source</span>
              <a :href="detail.web" target="_blank" rel="noopener" class="ww-modal-link">Full details ↗</a>
            </div>
          </div>
        </template>

      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { fetchAlertDetail } from '../services/capAlerts.js'

const props = defineProps({
  alert: { type: Object, required: true },
  lat:   { type: Number, default: null },
  lng:   { type: Number, default: null },
})
const emit = defineEmits(['close'])

const detail        = ref({ instruction: null, web: null, parameters: {}, sent: null, effective: null })
const detailLoading = ref(false)

// ── Map ───────────────────────────────────────────────────────────────────────
const mapEl = ref(null)
let leafletMap = null

const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
const TILE_DARK  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

const allPolygons = computed(() =>
  props.alert.areas.flatMap(a => a.polygons).filter(p => p.length >= 3)
)
const hasPolygons = computed(() => allPolygons.value.length > 0)

function initMap() {
  if (!mapEl.value || !hasPolygons.value || leafletMap) return

  const isLight = document.documentElement.classList.contains('light-theme')
  leafletMap = L.map(mapEl.value, {
    zoomControl:      true,
    attributionControl: false,
    dragging:         true,
    scrollWheelZoom:  false,
    doubleClickZoom:  true,
    touchZoom:        true,
    keyboard:         false,
  })

  L.tileLayer(isLight ? TILE_LIGHT : TILE_DARK, { maxZoom: 18 }).addTo(leafletMap)

  const color = alertColor(props.alert)
  const allCoords = []
  allPolygons.value.forEach(polygon => {
    L.polygon(polygon, {
      color,
      fillColor:   color,
      fillOpacity: 0.25,
      weight:      2,
    }).addTo(leafletMap)
    allCoords.push(...polygon)
  })

  leafletMap.invalidateSize()
  if (allCoords.length) {
    leafletMap.fitBounds(L.latLngBounds(allCoords), { padding: [12, 12] })
  }

  if (props.lat != null && props.lng != null) {
    L.circleMarker([props.lat, props.lng], {
      radius: 6,
      color: '#ffffff',
      fillColor: '#10b981',
      fillOpacity: 1,
      weight: 2,
    }).addTo(leafletMap)
  }
}

onMounted(async () => {
  await nextTick()
  // Delay map init until after the slide-up transition finishes (300ms)
  // to prevent Leaflet flickering while the container is mid-animation.
  setTimeout(initMap, 310)

  if (!props.alert.link) return
  detailLoading.value = true
  detail.value = await fetchAlertDetail(props.alert.link)
  detailLoading.value = false
})

onUnmounted(() => {
  leafletMap?.remove()
  leafletMap = null
})

// Prefer values from the full CAP detail; fall back to RSS-parsed alert fields
const displayArea        = computed(() => detail.value.areaDesc        ?? (props.alert.areas.map(a => a.desc).filter(Boolean).join(', ') || null))
const displayEffective   = computed(() => detail.value.sent ?? props.alert.pubDate ?? null)
const displayOnset       = computed(() => detail.value.onset           ?? props.alert.onset       ?? null)
const displayExpires     = computed(() => detail.value.expires         ?? props.alert.expires     ?? null)
const displayDescription = computed(() => detail.value.description     ?? props.alert.description ?? null)

const SEVERITY_COLORS = {
  extreme:  '#d32f2f',
  severe:   '#e65100',
  moderate: '#f9a825',
  minor:    '#1565c0',
}
function alertColor(alert) {
  return alert.colourHex ?? SEVERITY_COLORS[(alert.severity ?? '').toLowerCase()] ?? '#546e7a'
}

function fmt(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    })
  } catch { return iso }
}

// Decide whether to render color pill text as black or white
function colorTextColor(hex) {
  if (!hex || !hex.startsWith('#')) return '#fff'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 0.299 + g * 0.587 + b * 0.114) > 186 ? '#000' : '#fff'
}
</script>

<style scoped>
/* Slide-up transition — overlay fades, sheet slides up from bottom */
.ww-modal-enter-active,
.ww-modal-leave-active {
  transition: opacity 0.22s ease;
}
.ww-modal-enter-from,
.ww-modal-leave-to {
  opacity: 0;
}
.ww-modal-enter-active .ww-modal,
.ww-modal-leave-active .ww-modal {
  transition: transform 0.22s cubic-bezier(0.32, 0.72, 0, 1);
}
.ww-modal-enter-from .ww-modal,
.ww-modal-leave-to .ww-modal {
  transform: translateY(100%);
}

.ww-modal-overlay {
  position:        fixed;
  inset:           0;
  background:      rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display:         flex;
  align-items:     flex-end;
  justify-content: center;
  z-index:         10000;
}

@media (min-width: 1400px) {
  .ww-modal-overlay { align-items: center; }
}

.ww-modal {
  background:    var(--sheet-bg, #1e2130);
  border:        1px solid var(--panel-border, rgba(255,255,255,0.08));
  color:         var(--text);
  border-radius: 20px 20px 0 0;
  width:         100%;
  max-width:     480px;
  height: 65dvh;
  overflow:      hidden;
  display:       flex;
  flex-direction: column;
  box-shadow:    var(--shadow);
  border-top:    4px solid var(--severity-color);
}

@media (min-width: 1400px) {
  .ww-modal {
    border-radius: 1rem;
  }
}

.ww-modal-body {
  overflow-y:    auto;
  flex:          1;
  display:       flex;
  flex-direction: column;
  gap:            0.75rem;
  padding:       12px 16px 1.25rem;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.12) transparent;
}
.ww-modal-body::-webkit-scrollbar { width: 4px; }
.ww-modal-body::-webkit-scrollbar-track { background: transparent; }
.ww-modal-body::-webkit-scrollbar-thumb {
  background:    rgba(255,255,255,0.12);
  border-radius: 2px;
}
.ww-modal-body::-webkit-scrollbar-thumb:hover {
  background:    rgba(255,255,255,0.22);
}

/* Header */
.ww-modal-header {
  display:       flex;
  align-items:   center;
  gap:           0rem;
  padding:       14px 16px;
  border-bottom: 1px solid var(--panel-border, rgba(255,255,255,0.08));
  flex-shrink:   0;
}

.ww-modal-badge {
  flex-shrink:    0;
  padding:        0.2rem 0.5rem;
  border-radius:  0.35rem;
  font-size:      0.7rem;
  font-weight:    700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color:          #fff;
  line-height:    1.5;
}

.ww-modal-title {
  flex:        1;
  font-size:   1rem;
  font-weight: 600;
  line-height: 1.3;
}

.ww-modal-close {
  flex-shrink:  0;
  background:   none;
  border:       none;
  color:        inherit;
  opacity:      0.45;
  font-size:    1rem;
  cursor:       pointer;
  padding:      0.2rem 0.4rem;
  line-height:  1;
}
.ww-modal-close:hover { opacity: 0.8; }

/* Area / timing rows */
.ww-area-row { min-height: unset; }
.ww-timing-row,
.ww-meta-row {
  min-height: unset;
  justify-content: space-between;
  gap: 12px;
}
.ww-area-row { padding-bottom: 4px; }
.ww-area-row + .ww-timing-row {
  border-top: none;
  padding-top: 0;
}
.ww-timing-label {
  font-size:   0.82rem;
  color:       var(--text-faint);
  flex-shrink: 0;
}
.ww-timing-value {
  font-size:   0.82rem;
  color:       var(--text-muted);
  text-align:  right;
}

/* Area map */
.ww-modal-map {
  height:        180px;
  min-height:    180px;
  flex-shrink:   0;
  border-radius: 0.5rem;
  overflow:      hidden;
  border:        1px solid var(--card-border);
}
.ww-modal-map--ingroup {
  margin: 0 12px;
  border-radius: 0.5rem;
}

/* Loading */
.ww-modal-loading { display: flex; flex-direction: column; gap: 0.5rem; }
.ww-skeleton {
  height:        1rem;
  border-radius: 0.4rem;
  background:    var(--card-border);
  animation:     pulse 1.4s ease-in-out infinite;
}
.ww-skeleton--short { width: 55%; }
@keyframes pulse {
  0%, 100% { opacity: 1 }
  50%       { opacity: 0.4 }
}

/* Text content rows */
.ww-text-row { min-height: unset; align-items: flex-start; }
.ww-text-row-inner { display: flex; flex-direction: column; gap: 0.35rem; width: 100%; }

.ww-modal-section {
  font-size:   0.85rem;
  line-height: 1.55;
  opacity:     0.85;
  margin:      0;
  white-space: pre-wrap;
}

.ww-instruction-label {
  font-size:      0.7rem;
  font-weight:    700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity:        0.5;
}

/* External link */
.ww-modal-link {
  font-size:       0.82rem;
  color:           var(--text-muted);
  text-decoration: none;
  text-align:      right;
}
.ww-modal-link:hover { color: var(--text); }
</style>
