<template>
  <div class="chart-card card">
    <div class="chart-header">
      <h3 class="chart-title">Daily</h3>
      <span class="chart-subtitle">{{ config.icon }} {{ config.label }}</span>
    </div>
    <div class="chart-wrap" style="cursor: pointer">
      <canvas ref="canvasRef"></canvas>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Chart, Tooltip } from 'chart.js'

Tooltip.positioners.linePoint = function(items) {
  const line = items.find(item => item.datasetIndex === 1) ?? items[0]
  if (!line) return false
  return { x: line.element.x, y: line.element.y }
}
import { DATA_TYPES, getDailyHumidityFromHourly } from '../utils/dataTypes.js'
import { getWeatherInfo } from '../utils/weatherCodes.js'

const props = defineProps({
  daily:       { type: Object, required: true },
  hourly:      { type: Object, required: true },
  activeType:  { type: String, required: true },
  units:       { type: String, required: true },
  selectedDay: { type: Number, default: 0 },
})

const emit = defineEmits(['day-selected'])

const canvasRef     = ref(null)
let   chartInstance = null

const config = computed(() => DATA_TYPES[props.activeType])

function dayLabel(isoDate) {
  const d = new Date(isoDate + 'T12:00:00')
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Today'
  return d.toLocaleDateString('en', { weekday: 'short', day: 'numeric' })
}

function getDailyValues(cfg) {
  if (cfg.id === 'humidity') {
    return getDailyHumidityFromHourly(props.hourly)
  }
  return props.daily[cfg.dailyMaxKey] ?? []
}

function buildChart() {
  if (!canvasRef.value || !props.daily) return

  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }

  const cfg    = DATA_TYPES[props.activeType]
  const unit   = cfg.getUnit(props.units)
  const labels = props.daily.time.map(dayLabel)

  let datasets

  const dayCount = props.daily.time.length
  const sel = props.selectedDay

  // Helper: per-bar background — selected bar is full opacity, others dimmed
  function barBg(baseAlpha, dimAlpha) {
    return Array.from({ length: dayCount }, (_, i) =>
      cfg.color + (i === sel ? baseAlpha : dimAlpha)
    )
  }

  if (cfg.floatingBar && cfg.dailyMinKey) {
    // Temperature / Feels Like: floating bar from min to max
    const maxVals = props.daily[cfg.dailyMaxKey] ?? []
    const minVals = props.daily[cfg.dailyMinKey] ?? []
    const floatData = maxVals.map((max, i) => [
      minVals[i] != null ? +minVals[i].toFixed(1) : null,
      max        != null ? +max.toFixed(1)        : null,
    ])

    datasets = [{
      label: cfg.label,
      data: floatData,
      backgroundColor: barBg('ee', '44'),
      borderColor: barBg('ff', '66'),
      borderWidth: 1.5,
      borderRadius: 4,
    }]
  } else if (cfg.id === 'rain') {
    const precipValues = (props.daily.precipitation_sum ?? []).map(v =>
      v != null ? +Number(v).toFixed(cfg.decimals) : null
    )
    const probValues = props.daily.precipitation_probability_max ?? []
    datasets = [
      {
        type: 'bar',
        label: 'Amount',
        data: precipValues,
        backgroundColor: barBg('ee', '44'),
        borderColor: barBg('ff', '66'),
        borderWidth: 1.5,
        borderRadius: 4,
        yAxisID: 'y',
      },
      {
        type: 'line',
        label: 'Probability',
        data: probValues,
        borderColor: '#93c5fd',
        backgroundColor: 'transparent',
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: '#93c5fd',
        pointBorderColor: 'transparent',
        yAxisID: 'y1',
      },
    ]
  } else {
    const values = getDailyValues(cfg).map(v =>
      v != null ? +Number(v).toFixed(cfg.decimals) : null
    )
    datasets = [{
      label: cfg.label,
      data: values,
      backgroundColor: barBg('dd', '44'),
      borderColor: barBg('ff', '66'),
      borderWidth: 1.5,
      borderRadius: 4,
    }]
  }

  const isRain = cfg.id === 'rain'
  const isTemp = cfg.id === 'temperature' || cfg.id === 'feelsLike'
  const isWind = cfg.id === 'wind'
  const gustMax = isWind ? (props.daily.wind_gusts_10m_max ?? []) : null
  const wxCodes = props.daily.weather_code ?? []

  // Plugin: draw weather emoji above each bar for temperature types
  const emojiPlugin = isTemp ? {
    id: 'weatherEmoji',
    afterDatasetsDraw(chart) {
      const { ctx } = chart
      const meta = chart.getDatasetMeta(0)
      meta.data.forEach((bar, i) => {
        const emoji = getWeatherInfo(wxCodes[i])?.emoji
        if (!emoji) return
        const { x, y } = bar.getProps(['x', 'y'], true)
        ctx.save()
        ctx.font = '18px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        ctx.fillText(emoji, x, y - 4)
        ctx.restore()
      })
    },
  } : null

  chartInstance = new Chart(canvasRef.value, {
    type: 'bar',
    data: { labels, datasets },
    plugins: emojiPlugin ? [emojiPlugin] : [],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      interaction: { mode: 'index', intersect: false },
      onClick: (event, _, chart) => {
        const hits = chart.getElementsAtEventForMode(event, 'index', { intersect: false }, true)
        if (hits.length) emit('day-selected', hits[0].index)
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...(isRain ? { position: 'linePoint' } : {}),
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          borderColor: cfg.color,
          borderWidth: 1,
          titleColor: '#94a3b8',
          bodyColor: '#f1f5f9',
          padding: 10,
          callbacks: {
            label: (ctx) => {
              const condition = getWeatherInfo(wxCodes[ctx.dataIndex])?.label ?? ''
              const condStr = condition ? `  ${condition}` : ''
              if (Array.isArray(ctx.raw)) return ` ${ctx.raw[0]}${unit} – ${ctx.raw[1]}${unit}${condStr}`
              if (isRain && ctx.datasetIndex === 1) return ` ${ctx.parsed.y}% chance of rain`
              const v = ctx.parsed.y
              const base = ` ${v != null ? v : '–'}${unit ? ' ' + unit : ''}`
              if (isWind && gustMax) {
                const gust = gustMax[ctx.dataIndex]
                return gust != null ? `${base}  gusts ${Number(gust).toFixed(1)} ${unit}${condStr}` : `${base}${condStr}`
              }
              return `${base}${condStr}`
            },
          },
        },
      },
      layout: { padding: { top: isTemp ? 28 : 0 } },
      scales: {
        x: {
          grid:  { display: false },
          ticks: { color: '#64748b' },
          border: { color: 'rgba(255,255,255,0.06)' },
        },
        y: {
          grid:  { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#64748b', callback: (v) => `${v}${unit}` },
          border: { color: 'rgba(255,255,255,0.06)' },
        },
        ...(isRain ? {
          y1: {
            position: 'right',
            min: 0,
            max: 100,
            grid:  { drawOnChartArea: false },
            ticks: { color: '#93c5fd', callback: (v) => `${v}%` },
            border: { color: 'rgba(255,255,255,0.06)' },
          },
        } : {}),
      },
    },
  })
}

watch(() => props.activeType,  buildChart)
watch(() => props.units,       buildChart)
watch(() => props.daily,       buildChart)
watch(() => props.hourly,      buildChart)
watch(() => props.selectedDay, buildChart)
onMounted(buildChart)
onBeforeUnmount(() => { chartInstance?.destroy() })
</script>

<style scoped>
.chart-card {
  padding: 20px 20px 16px;
}

.chart-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 16px;
}

.chart-title {
  font-size: 1rem;
  font-weight: 600;
  color: #e2e8f0;
}

.chart-subtitle {
  font-size: 1rem;
  color: #94a3b8;
}

.chart-wrap {
  position: relative;
  height: 250px;
}

/* Chart.js manages canvas dimensions; don't constrain with CSS */
</style>
