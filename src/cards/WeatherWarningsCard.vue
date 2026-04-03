<template>
  <div v-if="showMode === 'always' || visibleAlerts.length > 0" v-bind="$attrs" class="card warnings-card">
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
        class="warning-row"
        :style="{ '--severity-color': alertColor(alert) }"
        @click="selectedAlert = alert"
      >
        <div class="warning-badge" :style="{ background: alertColor(alert), color: badgeTextColor(alert) }">
          <template v-if="alert.severity && alert.severity !== 'Alert'">{{ alert.severity }}</template>
          <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="display:block">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
          </svg>
        </div>
        <div class="warning-body">
          <div class="warning-headline">{{ alert.headline || alert.event }}</div>
          <div v-if="areaLabel(alert)" class="warning-area">{{ areaLabel(alert) }}</div>
          <div v-if="alert.expires" class="warning-expires">Expires {{ formatExpiry(alert.expires) }}</div>
        </div>
        <div class="warning-chevron">›</div>
      </div>
    </template>

    <!-- No active alerts (show=always) -->
    <div v-else class="warnings-none">
      <span class="warnings-none-icon">✅</span>
      <span>No active weather warnings</span>
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
const locationFilter = computed(() => props.warningsConfig?.locationFilter ?? 'location')

const visibleAlerts = computed(() =>
  locationFilter.value === 'all'
    ? alerts.value
    : filterAlertsForLocation(alerts.value, props.lat, props.lng)
)

const SEVERITY_COLORS = {
  extreme:  '#d32f2f',
  severe:   '#e65100',
  moderate: '#f9a825',
  minor:    '#1565c0',
}

function alertColor(alert) {
  return alert.colourHex ?? SEVERITY_COLORS[(alert.severity ?? '').toLowerCase()] ?? '#546e7a'
}

function badgeTextColor(alert) {
  const hex = alert.colourHex
  if (!hex || !hex.startsWith('#')) return '#fff'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 0.299 + g * 0.587 + b * 0.114) > 186 ? '#000' : '#fff'
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
  display:        flex;
  flex-direction: column;
  gap:            0.5rem;
  padding: 10px 12px;
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
  opacity:     0.65;
  padding:     0.25rem 0;
}
.warnings-error-icon,
.warnings-no-feed-icon,
.warnings-none-icon { font-size: 1rem; flex-shrink: 0; }

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

/* Alert rows */
.warning-row {
  display:     flex;
  gap:         0.75rem;
  align-items: flex-start;
  padding:     0.5rem 0;
  border-top:  1px solid var(--row-border);
  cursor:      pointer;
}
.warning-row:first-child { border-top: none; }

.warning-badge {
  flex-shrink:   0;
  padding:       0.2rem 0.5rem;
  border-radius: 0.35rem;
  font-size:     0.7rem;
  font-weight:   700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color:         #fff;
  line-height:   1.4;
}

.warning-body { flex: 1; min-width: 0; }

.warning-headline {
  font-size:   0.9rem;
  font-weight: 600;
  line-height: 1.3;
}

.warning-area,
.warning-expires {
  font-size:  0.78rem;
  opacity:    0.6;
  margin-top: 0.2rem;
}

.warning-area {
  white-space:   nowrap;
  overflow:      hidden;
  text-overflow: ellipsis;
}

.warning-chevron {
  flex-shrink: 0;
  font-size:   1.5rem;
  opacity:     0.3;
  align-self:  center;
  margin-left: 0.25rem;
}
</style>
