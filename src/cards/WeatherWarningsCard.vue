<template>
  <div v-if="showMode === 'always' || visibleAlerts.length > 0" v-bind="$attrs" class="card warnings-card">

    <div v-if="showTitle" class="card-header">
      <h3 class="card-title">Weather Warnings</h3>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="warnings-loading">
      <div class="warnings-skeleton" />
      <div class="warnings-skeleton warnings-skeleton--short" />
    </div>

    <!-- CORS / network error -->
    <div v-else-if="fetchError === 'cors'" class="warnings-error">
      <span class="warnings-error-icon">⚠️</span>
      <span>Warnings feed blocked by browser security. Try a different network or device.</span>
    </div>
    <div v-else-if="fetchError" class="warnings-error">
      <span class="warnings-error-icon">⚠️</span>
      <span>Could not load warnings feed.</span>
      <button class="warnings-retry-btn" @click="load">Retry</button>
    </div>

    <!-- No feed for this country -->
    <div v-else-if="noFeed" class="warnings-no-feed">
      <span class="warnings-no-feed-icon">🌐</span>
      <span v-if="locationCountry">No warnings feed configured for {{ locationCountry }}.</span>
      <span v-else>No location country detected. Open card settings to set a feed manually.</span>
    </div>

    <!-- Alerts present -->
    <template v-else-if="visibleAlerts.length > 0">
      <div
        v-for="alert in visibleAlerts"
        :key="alert.id"
        class="warning-tile"
        :style="{
          background: hexToRgba(alertColor(alert), 0.12),
          borderLeftColor: alertColor(alert),
        }"
        @click="selectedAlert = alert"
      >
        <div class="warning-tile-content">
          <div class="warning-tile-text">
            <div class="warning-headline">{{ alert.headline || alert.event }}</div>
            <div class="warning-meta">
              <span v-if="areaLabel(alert)" class="warning-meta-area">{{ areaLabel(alert) }}</span>
              <span v-if="alert.expires" class="warning-meta-expires">Expires {{ formatExpiry(alert.expires) }}</span>
            </div>
          </div>
          <div class="warning-tile-icon">
            <svg v-if="getWarningIconType(alert) === 'wind'" class="warning-icon-svg" :style="{ background: alertColor(alert) }" width="28" height="28" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="10" :fill="alertColor(alert)"/><g transform="translate(10, 10) scale(0.55)"><path :d="`M-5 -3c2-2 4-2 6 0s4 2 8 0`" :stroke="getIconColor(alert)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path :d="`M-5 1c2-2 4-2 6 0s4 2 7 0`" :stroke="getIconColor(alert)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path :d="`M-5 5c2-2 4-2 5 0`" :stroke="getIconColor(alert)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></g></svg>
            <svg v-else-if="getWarningIconType(alert) === 'rain'" class="warning-icon-svg" :style="{ background: alertColor(alert) }" width="28" height="28" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="10" :fill="alertColor(alert)"/><g transform="translate(10, 10) scale(0.55)"><path :d="`M-5 3a4 4 0 0 1 .4-8A5.5 5.5 0 0 1 5.6 -2H6a2.5 2.5 0 0 1 0 5`" :stroke="getIconColor(alert)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><line x1="-2" y1="5.5" x2="-3" y2="8" :stroke="getIconColor(alert)" stroke-width="1.5" stroke-linecap="round"/><line x1="2" y1="5.5" x2="1" y2="8" :stroke="getIconColor(alert)" stroke-width="1.5" stroke-linecap="round"/></g></svg>
            <svg v-else class="warning-icon-svg" :style="{ background: alertColor(alert) }" width="28" height="28" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="10" :fill="alertColor(alert)"/><g transform="translate(10, 10) scale(0.4)"><path d="M1 11h11L6 0 1 11zm6-2h-1v-1h1v1zm0-2h-1v-2h1v2z" :fill="getIconColor(alert)"/></g></svg>
          </div>
        </div>
      </div>
    </template>

    <!-- No active alerts (show=always) -->
    <div v-else class="warnings-none">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
      <span>No active weather warnings{{ locationFilter === 'location' ? ' (at this location)' : '' }}</span>
    </div>
  </div>

  <!-- Detail modal -->
  <Teleport to="body">
    <Transition name="ww-modal">
      <WeatherWarningModal
        v-if="selectedAlert"
        :alert="selectedAlert"
        :lat="props.lat"
        :lng="props.lng"
        @close="selectedAlert = null"
      />
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

defineOptions({ inheritAttrs: false })
import { fetchAlerts, filterAlertsForLocation } from '../services/capAlerts.js'
import WeatherWarningModal from './WeatherWarningModal.vue'

const selectedAlert = ref(null)

const props = defineProps({
  lat:             { type: Number, default: 0 },
  lng:             { type: Number, default: 0 },
  locationCountry: { type: String, default: null },
  warningsConfig:  { type: Object, default: null },
})

const alerts     = ref([])
const loading    = ref(true)
const fetchError = ref(null)
const noFeed     = ref(false)

const showMode       = computed(() => props.warningsConfig?.show           ?? 'always')
const showTitle      = computed(() => props.warningsConfig?.showTitle      ?? true)
const locationFilter = computed(() => props.warningsConfig?.locationFilter ?? 'location')

const SEVERITY_ORDER = { extreme: 3, severe: 2, moderate: 1, minor: 0 }
const COLOUR_CODE_ORDER = { red: 3, orange: 2, yellow: 1 }

function alertRank(alert) {
  const bySeverity = SEVERITY_ORDER[(alert.severity ?? '').toLowerCase()]
  if (bySeverity != null) return bySeverity
  return COLOUR_CODE_ORDER[(alert.colourCode ?? '').toLowerCase()] ?? -1
}

function sortAlerts(list) {
  return [...list].sort((a, b) => {
    const rankDiff = alertRank(b) - alertRank(a)
    if (rankDiff !== 0) return rankDiff
    const titleA = (a.headline || a.event || '').toLowerCase()
    const titleB = (b.headline || b.event || '').toLowerCase()
    if (titleA !== titleB) return titleA.localeCompare(titleB)
    const areaA = a.areas.map(x => x.desc).filter(Boolean).join(', ').toLowerCase()
    const areaB = b.areas.map(x => x.desc).filter(Boolean).join(', ').toLowerCase()
    return areaA.localeCompare(areaB)
  })
}

const visibleAlerts = computed(() => {
  const filtered = locationFilter.value === 'all'
    ? alerts.value
    : filterAlertsForLocation(alerts.value, props.lat, props.lng)
  return sortAlerts(filtered)
})

const SEVERITY_COLORS = {
  extreme:  '#d32f2f',
  severe:   '#e65100',
  moderate: '#f9a825',
  minor:    '#1565c0',
}

function alertColor(alert) {
  return alert.colourHex ?? SEVERITY_COLORS[(alert.severity ?? '').toLowerCase()] ?? '#546e7a'
}

function hexToRgba(hex, alpha) {
  if (!hex || !hex.startsWith('#')) return `rgba(84,110,122,${alpha})`
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function getIconColor(alert) {
  const color = alertColor(alert)
  if (!color || !color.startsWith('#')) return '#fff'
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)
  return (r * 0.299 + g * 0.587 + b * 0.114) > 186 ? '#000' : '#fff'
}

function getWarningIconType(alert) {
  const searchText = `${alert.event || ''} ${alert.headline || ''}`.toLowerCase()
  if (searchText.includes('wind')) return 'wind'
  if (searchText.includes('rain') || searchText.includes('heavy rain') || searchText.includes('rainfall')) return 'rain'
  return 'exclamation'
}

function areaLabel(alert) {
  return alert.areas.map(a => a.desc).filter(Boolean).join(', ')
}

function formatExpiry(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

async function load() {
  loading.value    = true
  fetchError.value = null
  noFeed.value     = false

  const { alerts: fetched, error, noFeed: nf } = await fetchAlerts(
    props.locationCountry,
    props.warningsConfig?.feedOverride ?? null,
  )
  alerts.value     = fetched
  fetchError.value = error
  noFeed.value     = !!nf
  loading.value    = false
}

// Reload when location or feed config changes
watch([() => props.locationCountry, () => props.warningsConfig?.feedOverride], load)

// Refresh every 15 minutes
let refreshTimer = null
onMounted(() => {
  load()
  refreshTimer = setInterval(load, 15 * 60 * 1000)
})
onUnmounted(() => clearInterval(refreshTimer))
</script>

<style scoped>
.warnings-card {
  display:               grid;
  grid-template-columns: 1fr 1fr;
  gap:                   0.35rem;
  padding:               10px 12px;
}
@media (min-width: 900px) {
  .warnings-card { grid-template-columns: 1fr 1fr 1fr; }
}

.card-header {
  grid-column: 1 / -1;
  margin-bottom: 0px;
}

.card-title {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
}

/* Full-width states inside the grid */
.warnings-loading,
.warnings-error,
.warnings-no-feed,
.warnings-none {
  grid-column: 1 / -1;
}

/* Loading skeletons */
.warnings-loading {
  display:        flex;
  flex-direction: column;
  gap:            0.5rem;
}
.warnings-skeleton {
  height:        1.1rem;
  border-radius: 0.4rem;
  background:    var(--card-border);
  animation:     pulse 1.4s ease-in-out infinite;
}
.warnings-skeleton--short { width: 55%; }

@keyframes pulse {
  0%, 100% { opacity: 1 }
  50%       { opacity: 0.4 }
}

/* Error / no-feed states */
.warnings-error,
.warnings-no-feed,
.warnings-none {
  display:     flex;
  align-items: center;
  gap:         0.5rem;
  font-size:   0.85rem;
  opacity:     0.55;
  padding:     0.2rem 0;
}
.warnings-error-icon,
.warnings-no-feed-icon { font-size: 1rem; flex-shrink: 0; }

.warnings-retry-btn {
  margin-left:      auto;
  padding:          0.2rem 0.6rem;
  border:           1px solid var(--btn-border);
  border-radius:    0.4rem;
  background:       transparent;
  color:            inherit;
  font-size:        0.8rem;
  cursor:           pointer;
}

/* Alert tiles */
.warning-tile {
  display:        flex;
  padding:        0.5rem 0.65rem;
  border-radius:  0.5rem;
  border-left:    3px solid transparent;
  cursor:         pointer;
  transition:     opacity 0.15s;
  min-width:      0;
}
.warning-tile:active { opacity: 0.7; }

.warning-tile-content {
  display:    flex;
  gap:        0.5rem;
  min-width:  0;
  align-items: center;
}

.warning-tile-text {
  display:        flex;
  flex-direction: column;
  gap:            0.2rem;
  min-width:      0;
  flex:           1;
}

.warning-tile-icon {
  display:      flex;
  flex-shrink:  0;
  align-items:  center;
  justify-content: center;
}

.warning-icon-svg {
  border-radius: 50%;
  display:       block;
}

.warning-headline {
  font-size:     0.8rem;
  font-weight:   600;
  line-height:   1.3;
  white-space:   nowrap;
  overflow:      hidden;
  text-overflow: ellipsis;
}

.warning-meta {
  display:    flex;
  gap:        0 0.4rem;
  font-size:  0.8rem;
  opacity:    0.6;
  min-width:  0;
}

.warning-meta-area {
  white-space:   nowrap;
  overflow:      hidden;
  text-overflow: ellipsis;
  flex-shrink:   1;
  min-width:     0;
}

.warning-meta-expires {
  white-space: nowrap;
  flex-shrink: 0;
}
</style>
