<template>
  <div class="card air-quality-card">
    <div v-if="airQualityConfig.showTitle" class="aq-header">
      <span class="aq-title-icon" v-html="CARD_ICONS.airQuality"></span>
      <h3 class="aq-title">Air Quality</h3>
    </div>

    <div v-if="loading" class="aq-loading">
      <div class="aq-skeleton aq-skeleton-num" />
      <div class="aq-skeleton aq-skeleton-label" />
    </div>

    <div v-else-if="error" class="aq-error">
      <span>Air quality unavailable</span>
    </div>

    <template v-else>
      <div class="aq-main">
        <!-- Left: AQI gauge -->
        <div class="aq-gauge">
          <div class="aq-aqi-num" :style="{ color: category.color }">{{ aqiDisplay }}</div>
          <div class="aq-category-pill" :style="{ background: category.color + '33', color: category.color }">
            {{ category.label }}
          </div>
          <div class="aq-aqi-label">European AQI</div>
          <div v-if="airQualityConfig.showUsAqi && usAqi !== null" class="aq-us-aqi">
            US AQI: {{ usAqi }}
          </div>
        </div>

        <!-- Right: pollutants -->
        <div class="aq-pollutants">
          <div class="aq-pollutant-row">
            <span class="aq-pollutant-label">PM2.5</span>
            <span class="aq-pollutant-value">{{ pm25Display }}</span>
            <span class="aq-pollutant-unit">µg/m³</span>
          </div>
          <div class="aq-divider" />
          <div class="aq-pollutant-row">
            <span class="aq-pollutant-label">PM10</span>
            <span class="aq-pollutant-value">{{ pm10Display }}</span>
            <span class="aq-pollutant-unit">µg/m³</span>
          </div>
        </div>
      </div>

      <!-- 24h trend -->
      <div v-if="airQualityConfig.showTrend && trendBars.length" class="aq-trend">
        <div class="aq-trend-label">24h AQI trend</div>
        <svg class="aq-trend-svg" :viewBox="`0 0 ${trendBars.length * 6} 28`" preserveAspectRatio="none">
          <rect
            v-for="(bar, i) in trendBars"
            :key="i"
            :x="i * 6 + 1"
            :y="28 - bar.h"
            :width="4"
            :height="bar.h"
            :fill="bar.color"
            rx="1"
          />
        </svg>
        <div class="aq-trend-times">
          <span>Now</span>
          <span>+24h</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { fetchAirQuality } from '../services/airQualityApi.js'
import { useSettings } from '../composables/useSettings.js'
import { CARD_ICONS } from '../utils/tileIcons.js'

const { airQualityConfig } = useSettings()

const props = defineProps({
  lat: { type: Number, default: 0 },
  lng: { type: Number, default: 0 },
  utcOffset: { type: Number, default: 0 },
})

const aqData  = ref(null)
const loading = ref(true)
const error   = ref(false)
let controller = null

const AQI_CATEGORIES = [
  { max: 20,  label: 'Good',            color: '#22c55e' },
  { max: 40,  label: 'Fair',            color: '#84cc16' },
  { max: 60,  label: 'Moderate',        color: '#eab308' },
  { max: 80,  label: 'Poor',            color: '#f97316' },
  { max: 100, label: 'Very Poor',       color: '#ef4444' },
  { max: Infinity, label: 'Extremely Poor', color: '#7f1d1d' },
]

function getCategory(aqi) {
  if (aqi == null) return { label: '—', color: 'var(--text-muted)' }
  return AQI_CATEGORIES.find(c => aqi <= c.max) ?? AQI_CATEGORIES.at(-1)
}

const euroAqi    = computed(() => aqData.value?.current?.european_aqi ?? null)
const usAqi      = computed(() => aqData.value?.current?.us_aqi       ?? null)
const pm25       = computed(() => aqData.value?.current?.pm2_5        ?? null)
const pm10       = computed(() => aqData.value?.current?.pm10         ?? null)
const category   = computed(() => getCategory(euroAqi.value))
const aqiDisplay = computed(() => euroAqi.value != null ? Math.round(euroAqi.value) : '—')
const pm25Display = computed(() => pm25.value != null ? pm25.value.toFixed(1) : '—')
const pm10Display = computed(() => pm10.value != null ? pm10.value.toFixed(1) : '—')

const trendBars = computed(() => {
  const hourly = aqData.value?.hourly
  if (!hourly?.time?.length) return []

  const nowMs   = Date.now()
  const localMs = nowMs + props.utcOffset * 1000
  const nowIso  = new Date(localMs).toISOString().slice(0, 13)

  const startIdx = hourly.time.findIndex(t => t >= nowIso)
  if (startIdx < 0) return []

  const slice = hourly.european_aqi.slice(startIdx, startIdx + 24)
  const valid = slice.filter(v => v != null)
  if (!valid.length) return []

  const max = Math.max(...valid, 1)
  return slice.map(v => {
    const aqi = v ?? 0
    return {
      h:     Math.max(2, Math.round((aqi / max) * 24)),
      color: getCategory(aqi).color,
    }
  })
})

async function load() {
  if (!props.lat && !props.lng) return
  controller?.abort()
  controller = new AbortController()
  loading.value = true
  error.value   = false
  try {
    aqData.value  = await fetchAirQuality(props.lat, props.lng, { signal: controller.signal })
  } catch (e) {
    if (e.name !== 'AbortError') error.value = true
  } finally {
    loading.value = false
  }
}

watch(() => [props.lat, props.lng], load)
onMounted(load)
onUnmounted(() => controller?.abort())
</script>

<style scoped>
.air-quality-card {
  padding: 10px 12px;
}

.aq-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
}

.aq-title-icon {
  display: flex;
  flex-shrink: 0;
  color: var(--text-muted);
}
.aq-title-icon :deep(svg) { width: 16px; height: 16px; }
.aq-title-icon :deep(svg), .aq-title-icon :deep(svg *) { stroke: currentColor; fill: none; }

.aq-title {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
}

.aq-loading {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  padding: 8px 0;
}

.aq-skeleton {
  background: var(--row-border);
  border-radius: 6px;
  animation: aq-pulse 1.4s ease-in-out infinite;
}
.aq-skeleton-num   { width: 60px; height: 40px; }
.aq-skeleton-label { width: 100px; height: 18px; }

@keyframes aq-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

.aq-error {
  text-align: center;
  color: var(--text-muted);
  font-size: 0.85rem;
  padding: 8px 0;
}

/* Main row */
.aq-main {
  display: flex;
  gap: 16px;
  align-items: center;
}

/* Gauge (left) */
.aq-gauge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.aq-aqi-num {
  font-size: 2.4rem;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -1px;
}

.aq-category-pill {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 8px;
  border-radius: 99px;
}

.aq-aqi-label {
  font-size: 0.7rem;
  color: var(--text-muted);
  margin-top: 2px;
}

.aq-us-aqi {
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* Pollutants (right) */
.aq-pollutants {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.aq-pollutant-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
  padding: 6px 0;
}

.aq-pollutant-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  width: 38px;
  flex-shrink: 0;
}

.aq-pollutant-value {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text);
}

.aq-pollutant-unit {
  font-size: 0.68rem;
  color: var(--text-muted);
}

.aq-divider {
  height: 1px;
  background: var(--row-border);
}

/* Trend */
.aq-trend {
  margin-top: 12px;
}

.aq-trend-label {
  font-size: 0.7rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}

.aq-trend-svg {
  width: 100%;
  height: 28px;
  display: block;
}

.aq-trend-times {
  display: flex;
  justify-content: space-between;
  font-size: 0.65rem;
  color: var(--text-muted);
  margin-top: 2px;
}
</style>
