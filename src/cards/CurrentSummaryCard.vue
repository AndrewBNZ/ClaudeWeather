<template>
  <div class="card current-summary-card">
    <!-- Main temp block -->
    <button
      class="summary-main selectable"
      :class="{ active: activeType === 'temperature' }"
      style="--sel-color: #f97316"
      @click="emit('select', 'temperature')"
    >
      <span v-if="pwsDataActive" class="pws-dot" :title="`Temperature from ${pwsName}`"></span>
      <div class="summary-icon">{{ info.emoji }}</div>
      <div class="summary-temp-col">
        <div class="summary-temp">
          {{ fmt(data.temperature_2m, 1) }}<span class="summary-unit">{{ tempUnit }}</span>
        </div>
        <div class="summary-condition">{{ info.label }}</div>
        <div v-if="todayHigh != null" class="summary-hl">
          <span class="hl-item"><span class="hl-label">H</span> {{ fmt(todayHigh, 0) }}°</span>
          <span class="hl-item hl-low"><span class="hl-label">L</span> {{ fmt(todayLow, 0) }}°</span>
        </div>
      </div>
      <div class="summary-meta">
        <div class="summary-datetime">{{ localDateTime }}</div>
      </div>
    </button>

    <!-- Footer: attribution + refresh -->
    <div class="summary-footer">
      <span>Open-Meteo</span>
      <template v-if="modelLabel"> · <button class="footer-model-btn" @click="emit('open-model-modal')">{{ modelLabel }}</button></template>
      <template v-if="updatedAt"> · {{ updatedAt }}</template>
      <button v-if="canManualRefresh" class="refresh-btn" @click="emit('refresh')" :disabled="loading" title="Refresh">
        <span :class="{ spinning: loading }">↻</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { getWeatherInfo } from '../utils/weatherCodes.js'
import { DATA_TYPES } from '../utils/dataTypes.js'

const props = defineProps({
  data:         { type: Object,  required: true },
  daily:        { type: Object,  default: null },
  unitPrefs:    { type: Object,  required: true },
  activeType:   { type: String,  required: true },
  utcOffset:    { type: Number,  default: 0 },
  timeFormat:   { type: String,  default: '12h' },
  pwsName:      { type: String,  default: null },
  pwsDataActive:{ type: Boolean, default: false },
  updatedAt:    { type: String,  default: '' },
  loading:      { type: Boolean, default: false },
  canManualRefresh: { type: Boolean, default: true },
  modelLabel:   { type: String,  default: '' },
})

const emit = defineEmits(['select', 'open-model-modal', 'refresh'])

const info       = computed(() => getWeatherInfo(props.data.weather_code))
const todayHigh  = computed(() => props.daily?.temperature_2m_max?.[0] ?? null)
const todayLow   = computed(() => props.daily?.temperature_2m_min?.[0] ?? null)
const tempUnit   = computed(() => DATA_TYPES.temperature.getUnit(props.unitPrefs))

function fmt(v, decimals) {
  if (v == null) return '–'
  return Number(v).toFixed(decimals)
}

// Live local clock
const clockNow = ref(Date.now())
let clockTimer = null
onMounted(() => { clockTimer = setInterval(() => { clockNow.value = Date.now() }, 1000) })
onBeforeUnmount(() => { clearInterval(clockTimer) })

const localDateTime = computed(() => {
  const ms = clockNow.value + (props.utcOffset ?? 0) * 1000
  const d = new Date(ms)
  const days   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const day    = days[d.getUTCDay()]
  const month  = months[d.getUTCMonth()]
  const date   = d.getUTCDate()
  const h      = d.getUTCHours()
  const m      = String(d.getUTCMinutes()).padStart(2, '0')
  const timeStr = props.timeFormat === '24h'
    ? `${String(h).padStart(2, '0')}:${m}`
    : `${h % 12 || 12}:${m} ${h < 12 ? 'am' : 'pm'}`
  return `${day}, ${month} ${date} · ${timeStr}`
})
</script>

<style scoped>
.current-summary-card {
  padding: 0;
  overflow: hidden;
}

.summary-main {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 16px 16px 12px;
  background: none;
  border: 1px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  color: inherit;
  transition: background 0.18s, border-color 0.18s;
}
.summary-main:hover:not(.active) {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.07);
}
.summary-main.active {
  background: color-mix(in srgb, #f97316 15%, transparent);
  border-color: color-mix(in srgb, #f97316 50%, transparent);
}

.summary-icon {
  font-size: 3.2rem;
  line-height: 1;
  filter: drop-shadow(0 2px 8px rgba(0,0,0,0.25));
  flex-shrink: 0;
}

.summary-temp-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.summary-temp {
  font-size: 2.2rem;
  font-weight: 700;
  letter-spacing: -1px;
  line-height: 1;
  color: var(--text);
}
.summary-unit {
  font-size: 1.4rem;
  font-weight: 400;
  color: var(--text-muted);
  margin-left: 2px;
}
.summary-condition {
  font-size: 0.95rem;
  color: var(--text-muted);
}
.summary-hl {
  display: flex;
  gap: 10px;
  margin-top: 2px;
}
.hl-item {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-muted);
  white-space: nowrap;
}
.hl-low { opacity: 0.75; }
.hl-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-faint);
  letter-spacing: 0.01em;
}

.summary-meta {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}
.summary-datetime {
  font-size: 0.78rem;
  color: var(--text-faint);
  white-space: nowrap;
}

.pws-dot {
  position: absolute;
  top: 10px;
  left: 10px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #38bdf8;
}

.summary-footer {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 0.75rem;
  color: var(--text-faint);
  padding: 6px 16px 12px;
  flex-wrap: wrap;
}

.footer-model-btn {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  font-size: inherit;
  color: var(--text-faint);
  cursor: pointer;
}
.footer-model-btn:hover { color: var(--text-muted); }

.refresh-btn {
  background: none;
  border: none;
  color: var(--text-faint);
  font-size: 1rem;
  cursor: pointer;
  padding: 0 2px;
  vertical-align: middle;
  line-height: 1;
  transition: color 0.15s;
}
.refresh-btn:hover:not(:disabled) { color: var(--text-muted); }
.refresh-btn:disabled { cursor: default; }

@keyframes spin { to { transform: rotate(360deg); } }
.spinning { display: inline-block; animation: spin 0.8s linear infinite; }
</style>
