<template>
  <div class="chart-card card">
    <div class="chart-header">
      <h3 class="chart-title">Daily</h3>
      <span class="chart-subtitle">{{ config.icon }} {{ config.label }}</span>
    </div>
    <div class="chart-wrap">
      <div class="chart-scroll-inner" style="cursor: pointer">
        <canvas ref="canvasRef"></canvas>
      </div>
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
import { DATA_TYPES, getDailyAvgFromHourly } from '../utils/dataTypes.js'
import { getWeatherInfo, getCompassDir } from '../utils/weatherCodes.js'

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
  const weekday = d.toLocaleDateString('en', { weekday: 'short' })
  const day     = d.toLocaleDateString('en', { day: 'numeric' })
  return `${weekday} ${day}`
}

function getDailyValues(cfg) {
  if (cfg.dailyAvg) return getDailyAvgFromHourly(props.hourly, cfg.hourlyKey)
  return props.daily[cfg.dailyMaxKey] ?? []
}

function buildChart() {
  if (!canvasRef.value || !props.daily) return

  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }

  const cfg      = DATA_TYPES[props.activeType]
  const unit     = cfg.getUnit(props.units)
  const isMobile = window.innerWidth < 640
  const labels   = props.daily.time.map(dayLabel)

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
    let rawVals = getDailyValues(cfg)
    if (cfg.scale) rawVals = rawVals.map(v => v != null ? cfg.scale(v, props.units) : null)
    const values = rawVals.map(v =>
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

  const isRain     = cfg.id === 'rain'
  const isTemp     = cfg.id === 'temperature' || cfg.id === 'feelsLike'
  const isWind     = cfg.id === 'wind'
  const isHumidity   = cfg.id === 'humidity'
  const isUV         = cfg.id === 'uv'
  const isCloudCover = cfg.id === 'cloudCover'
  const isPressure   = cfg.id === 'pressure'
  const isVisibility = cfg.id === 'visibility'
  const gustMax = isWind ? (props.daily.wind_gusts_10m_max ?? []) : null
  const windDirs = isWind ? (props.daily.wind_direction_10m_dominant ?? []) : null
  const wxCodes = props.daily.weather_code ?? []

  // Shared Y scale for temp + feelsLike so both charts use the same range
  let sharedYMin, sharedYMax
  if (isTemp) {
    const allVals = [
      ...(props.daily.temperature_2m_max     ?? []),
      ...(props.daily.temperature_2m_min     ?? []),
      ...(props.daily.apparent_temperature_max ?? []),
      ...(props.daily.apparent_temperature_min ?? []),
    ].filter(v => v != null)
    if (allVals.length) {
      const lo  = Math.min(...allVals)
      const hi  = Math.max(...allVals)
      const pad = (hi - lo) * 0.20
      sharedYMin = Math.floor(lo - pad)
      sharedYMax = Math.ceil(hi + pad)
    }
  }

  // Plugin: draw emoji + high/low temps on temperature floating bars
  const emojiPlugin = isTemp ? {
    id: 'weatherEmoji',
    afterDatasetsDraw(chart) {
      const { ctx } = chart
      const meta = chart.getDatasetMeta(0)
      const dataset = chart.data.datasets[0]
      meta.data.forEach((bar, i) => {
        const { x, y, base } = bar.getProps(['x', 'y', 'base'], true)
        const dataPoint = dataset.data[i]

        // Emoji above the bar (raised to clear the high-temp number)
        const emoji = getWeatherInfo(wxCodes[i])?.emoji
        if (emoji) {
          ctx.save()
          ctx.font = '18px sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'bottom'
          ctx.fillText(emoji, x, y - 16)
          ctx.restore()
        }

        if (!Array.isArray(dataPoint)) return

        // High temp at top of bar
        if (dataPoint[1] != null) {
          ctx.save()
          ctx.font = 'bold 13px sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'bottom'
          ctx.fillStyle = '#e2e8f0'
          ctx.fillText(`${Math.round(dataPoint[1])}`, x, y - 2)
          ctx.restore()
        }

        // Low temp at bottom of bar
        if (dataPoint[0] != null) {
          ctx.save()
          ctx.font = '13px sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'top'
          ctx.fillStyle = '#94a3b8'
          ctx.fillText(`${Math.round(dataPoint[0])}`, x, base + 2)
          ctx.restore()
        }
      })
    },
  } : null

  // Plugin: draw wind direction arrow + speed number above each bar
  const windVals = isWind ? (props.daily[cfg.dailyMaxKey] ?? []) : null
  const windArrowPlugin = isWind ? {
    id: 'windArrows',
    afterDatasetsDraw(chart) {
      const { ctx } = chart
      const meta = chart.getDatasetMeta(0)
      meta.data.forEach((bar, i) => {
        const dir = windDirs?.[i]
        if (dir == null) return
        const { x, y } = bar.getProps(['x', 'y'], true)
        const angle = (dir + 180) * (Math.PI / 180)

        // Wind direction arrow circle
        ctx.save()
        ctx.translate(x, y - 30)

        ctx.beginPath()
        ctx.arc(0, 0, 11, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'
        ctx.fill()
        ctx.strokeStyle = cfg.color + 'aa'
        ctx.lineWidth = 1
        ctx.stroke()

        ctx.rotate(angle)
        ctx.strokeStyle = cfg.color
        ctx.fillStyle   = cfg.color
        ctx.lineWidth   = 1.5
        ctx.lineCap     = 'round'

        ctx.beginPath()
        ctx.moveTo(0, 6)
        ctx.lineTo(0, -2)
        ctx.stroke()

        ctx.beginPath()
        ctx.moveTo(0, -7)
        ctx.lineTo(-3.5, -1)
        ctx.lineTo(3.5, -1)
        ctx.closePath()
        ctx.fill()

        ctx.restore()

        // Wind speed number just above bar
        const val = windVals?.[i]
        if (val != null) {
          ctx.save()
          ctx.font = 'bold 13px sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'bottom'
          ctx.fillStyle = '#e2e8f0'
          ctx.fillText(`${Math.round(val)}`, x, y - 2)
          ctx.restore()
        }
      })
    },
  } : null

  // Generic plugin: draw condition emoji + value above each simple bar type
  const useBarLabels = !isRain && !isTemp && !isWind
  let barDisplayVals = null
  if (useBarLabels) {
    let raw = getDailyValues(cfg)
    if (cfg.scale) raw = raw.map(v => v != null ? cfg.scale(v, props.units) : null)
    barDisplayVals = raw.map(v => v != null ? +Number(v).toFixed(cfg.decimals) : null)
  }
  const barLabelPlugin = useBarLabels ? {
    id: 'barLabels',
    afterDatasetsDraw(chart) {
      const { ctx } = chart
      const meta = chart.getDatasetMeta(0)
      meta.data.forEach((bar, i) => {
        const { x, y } = bar.getProps(['x', 'y'], true)

        const emoji = getWeatherInfo(wxCodes[i])?.emoji
        if (emoji) {
          ctx.save()
          ctx.font = '18px sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'bottom'
          ctx.fillText(emoji, x, y - 16)
          ctx.restore()
        }

        const val = barDisplayVals?.[i]
        if (val != null) {
          ctx.save()
          ctx.font = 'bold 13px sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'bottom'
          ctx.fillStyle = '#e2e8f0'
          ctx.fillText(`${val}`, x, y - 2)
          ctx.restore()
        }
      })
    },
  } : null

  // Plugin: draw condition emoji + precipitation amount above each bar
  const precipVals = isRain ? (props.daily.precipitation_sum ?? []) : null
  const rainPlugin = isRain ? {
    id: 'rainLabels',
    afterDatasetsDraw(chart) {
      const { ctx } = chart
      const meta = chart.getDatasetMeta(0)
      meta.data.forEach((bar, i) => {
        const { x, y } = bar.getProps(['x', 'y'], true)

        const emoji = getWeatherInfo(wxCodes[i])?.emoji
        if (emoji) {
          ctx.save()
          ctx.font = '18px sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'bottom'
          ctx.fillText(emoji, x, y - 16)
          ctx.restore()
        }

        const val = precipVals?.[i]
        if (val != null) {
          ctx.save()
          ctx.font = 'bold 13px sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'bottom'
          ctx.fillStyle = '#e2e8f0'
          ctx.fillText(`${Number(val).toFixed(1)}`, x, y - 2)
          ctx.restore()
        }
      })
    },
  } : null

  const extraPlugins = [emojiPlugin, windArrowPlugin, barLabelPlugin, rainPlugin].filter(Boolean)

  chartInstance = new Chart(canvasRef.value, {
    type: 'bar',
    data: { labels, datasets },
    plugins: extraPlugins,
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
              if (isWind) {
                const dirStr = windDirs?.[ctx.dataIndex] != null ? `  ${getCompassDir(windDirs[ctx.dataIndex])}` : ''
                const gust = gustMax?.[ctx.dataIndex]
                const gustStr = gust != null ? `  gusts ${Number(gust).toFixed(1)} ${unit}` : ''
                return `${base}${dirStr}${gustStr}${condStr}`
              }
              return `${base}${condStr}`
            },
          },
        },
      },
      layout: { padding: { top: isMobile ? 4 : 8, left: 4, right: 4 } },
      scales: {
        x: {
          position: 'top',
          grid:  { display: false },
          ticks: { color: '#64748b' },
          border: { color: 'rgba(255,255,255,0.06)' },
        },
        y: {
          ...(sharedYMin != null ? { min: sharedYMin, max: sharedYMax } : {}),
          ...(isWind || isHumidity || isUV || isRain || isCloudCover || isPressure || isVisibility ? { grace: '20%' } : {}),
          grid:  { display: false },
          ticks: { display: false, color: '#64748b', callback: (v) => `${v}${unit}` },
          border: { display: false },
        },
        ...(isRain ? {
          y1: {
            position: 'right',
            min: 0,
            max: 100,
            grid:  { drawOnChartArea: false },
            ticks: { display: false, color: '#93c5fd', callback: (v) => `${v}%` },
            border: { display: false },
          },
        } : {}),
      },
    },
  })
}

function scheduleBuild() { requestAnimationFrame(() => requestAnimationFrame(buildChart)) }
watch(() => props.activeType,  scheduleBuild)
watch(() => props.units,       scheduleBuild)
watch(() => props.daily,       scheduleBuild)
watch(() => props.hourly,      scheduleBuild)
watch(() => props.selectedDay, scheduleBuild)
onMounted(() => requestAnimationFrame(() => requestAnimationFrame(buildChart)))
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

.chart-scroll-inner {
  position: relative;
  height: 100%;
}

/* Chart.js manages canvas dimensions; don't constrain with CSS */

@media (max-width: 639px) {
  .chart-card {
    padding: 12px 12px 10px;
  }
  .chart-subtitle {
    display: none;
  }
  .chart-wrap {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .chart-wrap::-webkit-scrollbar {
    display: none;
  }
  .chart-scroll-inner {
    min-width: 700px;
  }
}
</style>
