<template>
  <div class="ww-modal-overlay" @click.self="emit('close')">
    <div class="ww-modal" :style="{ '--severity-color': alertColor(alert) }">

      <!-- Header -->
      <div class="ww-modal-header">
        <div class="ww-modal-badge" :style="{ background: alertColor(alert), color: colorTextColor(alertColor(alert)) }">
          <template v-if="alert.severity && alert.severity !== 'Alert'">{{ alert.severity }}</template>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="display:block">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
          </svg>
        </div>
        <div class="ww-modal-title">{{ alert.headline || alert.event }}</div>
        <button class="ww-modal-close" @click="emit('close')">✕</button>
      </div>

      <!-- Scrollable body -->
      <div class="ww-modal-body">

        <!-- Area + Timing -->
        <div class="ww-modal-location">
          <div v-if="displayArea" class="ww-modal-area">{{ displayArea }}</div>
          <div v-if="displayOnset || displayExpires" class="ww-modal-meta">
            <span v-if="displayOnset">{{ fmt(displayOnset) }}</span>
            <span>-</span>
            <span v-if="displayExpires">{{ fmt(displayExpires) }}</span>
          </div>
        </div>

        <!-- Area map -->
        <div v-if="hasPolygons" ref="mapEl" class="ww-modal-map" />

        <!-- Loading detail -->
        <div v-if="detailLoading" class="ww-modal-loading">
          <div class="ww-skeleton" />
          <div class="ww-skeleton ww-skeleton--short" />
          <div class="ww-skeleton" />
        </div>

        <template v-else>
          <!-- Description -->
          <p v-if="displayDescription" class="ww-modal-section">{{ displayDescription }}</p>

          <!-- Instruction -->
          <div v-if="detail.instruction" class="ww-modal-instruction">
            <div class="ww-instruction-label">What to do</div>
            <p>{{ detail.instruction }}</p>
          </div>

          <!-- Issued / Next update / External link -->
          <div class="ww-modal-footer">
            <div v-if="displayEffective" class="ww-modal-next-update">
              Issued {{ fmt(displayEffective) }}
            </div>
            <div v-if="detail.parameters?.NextUpdate" class="ww-modal-next-update">
              Next update {{ fmt(detail.parameters.NextUpdate) }}
            </div>
            <a v-if="detail.web" :href="detail.web" target="_blank" rel="noopener" class="ww-modal-link">
              Full details ↗
            </a>
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
  z-index:         1000;
}

@media (min-width: 480px) {
  .ww-modal-overlay { align-items: center; }
}

.ww-modal {
  background:    var(--panel-bg, #1e2130);
  border:        1px solid var(--panel-border, rgba(255,255,255,0.08));
  color:         var(--text);
  border-radius: 20px 20px 0 0;
  width:         100%;
  max-width:     480px;
  height:        50dvh;
  overflow:      hidden;
  display:       flex;
  flex-direction: column;
  box-shadow:    var(--shadow);
  border-top:    4px solid var(--severity-color);
}

@media (min-width: 480px) {
  .ww-modal {
    border-radius: 1rem;
  }
}

.ww-modal-body {
  overflow-y:    auto;
  flex:          1;
  display:       flex;
  flex-direction: column;
  gap:            0.85rem;
  padding:       12px 16px 1.25rem;
}


/* Header */
.ww-modal-header {
  display:       flex;
  align-items:   center;
  gap:           0.6rem;
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

/* Area */
.ww-modal-location {
  display:        flex;
  flex-direction: column;
  gap:            0.2rem;
}

.ww-modal-area {
  font-size:   0.85rem;
  font-weight: 600;
  opacity:     0.75;
}

/* Timing meta */
.ww-modal-meta {
  display:   flex;
  flex-wrap: wrap;
  gap:       0.25rem 0.75rem;
  font-size: 0.85rem;
  opacity:   0.6;
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

/* Body sections */
.ww-modal-section {
  font-size:   0.85rem;
  line-height: 1.55;
  opacity:     0.85;
  margin:      0;
  white-space: pre-wrap;
}

.ww-modal-instruction {
  background:    var(--card-border, rgba(255,255,255,0.08));
  border-radius: 0.5rem;
  padding:       0.75rem;
}
:global(.light-theme) .ww-modal-instruction {
  background: rgba(0, 0, 0, 0.04);
}
.ww-instruction-label {
  font-size:     0.7rem;
  font-weight:   700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity:       0.5;
  margin-bottom: 0.4rem;
}
.ww-modal-instruction p {
  font-size:   0.85rem;
  line-height: 1.5;
  margin:      0;
  white-space: pre-wrap;
}

/* Pills */
.ww-modal-pills {
  display:   flex;
  flex-wrap: wrap;
  gap:       0.4rem;
}
.ww-pill {
  padding:       0.2rem 0.55rem;
  border-radius: 999px;
  font-size:     0.72rem;
  font-weight:   600;
  background:    var(--btn-bg);
  color:         var(--text-muted);
}

/* Footer group */
.ww-modal-footer {
  display:        flex;
  flex-direction: column;
  gap:            0.2rem;
}

/* Next update */
.ww-modal-next-update {
  font-size: 0.85rem;
  opacity:   0.45;
}

/* External link */
.ww-modal-link {
  display:     inline-block;
  font-size:   0.85rem;
  color:       var(--text-muted);
  text-decoration: none;
}
.ww-modal-link:hover { color: var(--text); }
</style>
