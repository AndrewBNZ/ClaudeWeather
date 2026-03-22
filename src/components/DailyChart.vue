<template>
  <div class="chart-card card" data-chart="daily">
    <div class="chart-header">
      <h3 class="chart-title">Daily</h3>
      <span class="chart-subtitle"><span class="chart-icon" v-html="TILE_ICONS[props.activeType] || config.icon"></span> {{ config.label }}<span v-if="unitLabel" class="chart-unit" @click="emit('open-units-modal')">{{ unitLabel }}</span></span>
    </div>
    <div class="chart-wrap" ref="wrapRef">
      <div class="chart-scroll-inner" ref="scrollInnerRef" style="cursor: pointer">
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
import { DATA_TYPES, getDailyAvgFromHourly, getUnitLabel } from '../utils/dataTypes.js'
import { TILE_ICONS } from '../utils/tileIcons.js'
import { drawWindArrow } from '../utils/chartHelpers.js'
import { getWeatherInfo, getCompassDir } from '../utils/weatherCodes.js'

const APP_FONT = "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"

const props = defineProps({
  daily:       { type: Object, required: true },
  hourly:      { type: Object, required: true },
  activeType:  { type: String, required: true },
  unitPrefs:   { type: Object, required: true },
  selectedDay: { type: Number, default: 0 },
  theme:       { type: String, default: 'dark' },
  utcOffset:   { type: Number, default: 0 },
})

const emit = defineEmits(['day-selected', 'open-units-modal'])

const canvasRef       = ref(null)
const wrapRef         = ref(null)
const scrollInnerRef  = ref(null)
let   chartInstance   = null
let   ro              = null

function handleCanvasClick(e) {
  if (!chartInstance) return
  const x = e.offsetX
  const y = e.offsetY
  const { top, left, right } = chartInstance.chartArea

  if (y < top && x >= left && x <= right) {
    // Click landed in the axis label band — find closest tick
    const xScale = chartInstance.scales.x
    let closest = 0, minDist = Infinity
    xScale.ticks.forEach((_, i) => {
      const dist = Math.abs(xScale.getPixelForTick(i) - x)
      if (dist < minDist) { minDist = dist; closest = i }
    })
    emit('day-selected', closest)
    return
  }

  // Click inside chart area — use Chart.js hit detection
  const hits = chartInstance.getElementsAtEventForMode(e, 'index', { intersect: false }, true)
  if (hits.length) emit('day-selected', hits[0].index)
}

const config = computed(() => DATA_TYPES[props.activeType])
const unitLabel = computed(() => getUnitLabel(props.activeType, props.unitPrefs))

function dayLabel(isoDate) {
  const locDateStr = new Date(Date.now() + props.utcOffset * 1000).toISOString().slice(0, 10)
  if (isoDate === locDateStr) return 'Today'
  // Parse in UTC so browser timezone doesn't shift the displayed weekday/day
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d, 12))
  const weekday = date.toLocaleDateString('en', { weekday: 'short', timeZone: 'UTC' })
  const day     = date.toLocaleDateString('en', { day: 'numeric',  timeZone: 'UTC' })
  return `${weekday} ${day}`
}

function getDailyValues(cfg) {
  if (cfg.dailyAvg) return getDailyAvgFromHourly(props.hourly, cfg.hourlyKey)
  return props.daily[cfg.dailyMaxKey] ?? []
}

function sizeChart() {
  if (!chartInstance || !wrapRef.value || !scrollInnerRef.value) return
  const w = scrollInnerRef.value.clientWidth
  const h = wrapRef.value.clientHeight
  if (w && h) chartInstance.resize(w, h)
}

function buildChart() {
  if (!canvasRef.value || !wrapRef.value || !props.daily) return

  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }

  const cfg      = DATA_TYPES[props.activeType]
  const unit     = cfg.getUnit(props.unitPrefs)
  const decimals = cfg.getDecimals ? cfg.getDecimals(props.unitPrefs) : cfg.decimals
  const isMobile = window.innerWidth <= 1000
  const isLandscapeMode = window.innerWidth > window.innerHeight && window.innerWidth <= 1366 && window.innerHeight <= 900
  const isLight  = props.theme === 'light'
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
      borderSkipped: false,
    }]
  } else if (cfg.id === 'rain') {
    const precipValues = (props.daily.precipitation_sum ?? []).map(v =>
      v != null ? +Number(v).toFixed(decimals) : null
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
    if (cfg.scale) rawVals = rawVals.map(v => v != null ? cfg.scale(v, props.unitPrefs) : null)
    const values = rawVals.map(v =>
      v != null ? +Number(v).toFixed(decimals) : null
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

  // Derive the representative condition from hourly data (most frequent code 7am–9pm)
  // rather than using the API's "most severe" daily code, which can surface brief fog etc.
  function dominantDaytimeCode(dayIndex) {
    const hourlyWx = props.hourly?.weather_code
    if (!hourlyWx) return props.daily.weather_code?.[dayIndex] ?? null
    const start = dayIndex * 24
    const daytime = hourlyWx.slice(start + 7, start + 21).filter(v => v != null)
    if (!daytime.length) return props.daily.weather_code?.[dayIndex] ?? null
    const freq = {}
    for (const c of daytime) freq[c] = (freq[c] ?? 0) + 1
    return Number(Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0])
  }
  const wxCodes = (props.daily.time ?? []).map((_, i) => dominantDaytimeCode(i))

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
      sharedYMax = Math.ceil(hi + pad * (isMobile ? 2 : isLandscapeMode ? 3.5 : 1))
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
        const topY = Math.min(y, base)
        const botY = Math.max(y, base)
        const dataPoint = dataset.data[i]

        // Emoji above the bar (raised to clear the high-temp number)
        const emoji = wxCodes[i] != null ? getWeatherInfo(wxCodes[i])?.emoji : null
        if (emoji) {
          ctx.save()
          ctx.font = `22px ${APP_FONT}`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'bottom'
          ctx.fillText(emoji, x, topY - 16)
          ctx.restore()
        }

        if (!Array.isArray(dataPoint)) return

        // High temp at top of bar
        if (dataPoint[1] != null) {
          ctx.save()
          ctx.font = `${i === props.selectedDay ? 'bold ' : ''}13px ${APP_FONT}`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'bottom'
          ctx.fillStyle = props.theme === 'light' ? '#1e293b' : '#e2e8f0'
          ctx.fillText(`${Math.round(dataPoint[1])}`, x, topY - 2)
          ctx.restore()
        }

        // Low temp at bottom of bar
        if (dataPoint[0] != null) {
          ctx.save()
          ctx.font = `${i === props.selectedDay ? 'bold ' : ''}13px ${APP_FONT}`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'top'
          ctx.fillStyle = props.theme === 'light' ? '#64748b' : '#94a3b8'
          ctx.fillText(`${Math.round(dataPoint[0])}`, x, botY + 2)
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

        drawWindArrow(ctx, x, y - 30, dir, cfg.color)

        // Wind speed number just above bar
        const val = windVals?.[i]
        if (val != null) {
          ctx.save()
          ctx.font = `${i === props.selectedDay ? 'bold ' : ''}13px ${APP_FONT}`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'bottom'
          ctx.fillStyle = props.theme === 'light' ? '#1e293b' : '#e2e8f0'
          ctx.fillText(`${Math.round(val)}`, x, y - 2)
          ctx.restore()
        }
      })
    },
  } : null

  // Generic plugin: draw condition emoji + value above each simple bar type
  const labelSuffix = (cfg.id === 'humidity' || cfg.id === 'cloudCover') ? '%' : ''
  const useBarLabels = !isRain && !isTemp && !isWind
  let barDisplayVals = null
  if (useBarLabels) {
    let raw = getDailyValues(cfg)
    if (cfg.scale) raw = raw.map(v => v != null ? cfg.scale(v, props.unitPrefs) : null)
    barDisplayVals = raw.map(v => v != null ? +Number(v).toFixed(decimals) : null)
  }
  const barLabelPlugin = useBarLabels ? {
    id: 'barLabels',
    afterDatasetsDraw(chart) {
      const { ctx } = chart
      const meta = chart.getDatasetMeta(0)
      meta.data.forEach((bar, i) => {
        const { x, y } = bar.getProps(['x', 'y'], true)

        const emoji = wxCodes[i] != null ? getWeatherInfo(wxCodes[i])?.emoji : null
        if (emoji) {
          ctx.save()
          ctx.font = `22px ${APP_FONT}`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'bottom'
          ctx.fillText(emoji, x, y - 16)
          ctx.restore()
        }

        const val = barDisplayVals?.[i]
        if (val != null) {
          ctx.save()
          ctx.font = `${i === props.selectedDay ? 'bold ' : ''}13px ${APP_FONT}`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'bottom'
          ctx.fillStyle = props.theme === 'light' ? '#1e293b' : '#e2e8f0'
          ctx.fillText(`${val}${labelSuffix}`, x, y - 2)
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

        const emoji = wxCodes[i] != null ? getWeatherInfo(wxCodes[i])?.emoji : null
        if (emoji) {
          ctx.save()
          ctx.font = `22px ${APP_FONT}`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'bottom'
          ctx.fillText(emoji, x, y - 16)
          ctx.restore()
        }

        const val = precipVals?.[i]
        if (val != null) {
          ctx.save()
          ctx.font = `${i === props.selectedDay ? 'bold ' : ''}13px ${APP_FONT}`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'bottom'
          ctx.fillStyle = props.theme === 'light' ? '#1e293b' : '#e2e8f0'
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
      responsive: false,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: isRain,
          ...(isRain ? { position: 'linePoint' } : {}),
          backgroundColor: isLight ? 'rgba(255,255,255,0.97)' : 'rgba(15, 23, 42, 0.95)',
          borderColor: cfg.color,
          borderWidth: 1,
          titleColor: isLight ? '#64748b' : '#94a3b8',
          bodyColor: isLight ? '#1e293b' : '#f1f5f9',
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
      layout: { padding: { top: isMobile ? 4 : isLandscapeMode ? 28 : 8, left: 4, right: 4 } },
      scales: {
        x: {
          position: 'top',
          grid:  { display: false },
          ticks: { color: '#64748b', padding: 0, font: { family: APP_FONT } },
          border: { color: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)' },
        },
        y: {
          ...(sharedYMin != null ? { min: sharedYMin, max: sharedYMax } : {}),
          ...(isWind || isHumidity || isUV || isRain || isCloudCover || isPressure || isVisibility ? { grace: isMobile ? '55%' : isLandscapeMode ? '55%' : '20%' } : {}),
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

function scheduleBuild() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    buildChart()
    requestAnimationFrame(sizeChart)
  }))
}
watch(
  [() => props.activeType, () => props.unitPrefs, () => props.daily, () => props.hourly, () => props.theme],
  scheduleBuild
)
watch(() => props.selectedDay, () => {
  if (!chartInstance) return
  const cfg      = DATA_TYPES[props.activeType]
  const dayCount = props.daily.time.length
  const sel      = props.selectedDay
  function barBg(baseAlpha, dimAlpha) {
    return Array.from({ length: dayCount }, (_, i) => cfg.color + (i === sel ? baseAlpha : dimAlpha))
  }
  if (cfg.floatingBar && cfg.dailyMinKey) {
    chartInstance.data.datasets[0].backgroundColor = barBg('ee', '44')
    chartInstance.data.datasets[0].borderColor      = barBg('ff', '66')
  } else if (cfg.id === 'rain') {
    chartInstance.data.datasets[0].backgroundColor = barBg('ee', '44')
    chartInstance.data.datasets[0].borderColor      = barBg('ff', '66')
  } else {
    chartInstance.data.datasets[0].backgroundColor = barBg('dd', '44')
    chartInstance.data.datasets[0].borderColor      = barBg('ff', '66')
  }
  chartInstance.update('none')
})
onMounted(() => {
  canvasRef.value.addEventListener('click', handleCanvasClick)
  ro = new ResizeObserver(() => requestAnimationFrame(sizeChart))
  ro.observe(wrapRef.value)
  scheduleBuild()
})
onBeforeUnmount(() => {
  canvasRef.value?.removeEventListener('click', handleCanvasClick)
  ro?.disconnect()
  chartInstance?.destroy()
})
</script>

<style scoped>
.chart-card {
  padding: 20px 20px 16px;
}

.chart-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.chart-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
}
.chart-title::after {
  content: ' Forecast';
}

.chart-subtitle {
  font-size: 1rem;
  color: var(--text-muted);
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.chart-icon { display: flex; align-items: center; flex-shrink: 0; align-self: center; }
.chart-icon svg { width: 18px; height: 18px; }

.chart-unit {
  margin-left: 5px;
  font-size: 0.8rem;
  line-height: 1;
  opacity: 0.6;
  cursor: pointer;
}
.chart-unit:hover {
  opacity: 1;
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

@media (max-width: 1000px) {
  .chart-card {
    padding: 8px 10px 8px;
  }
  .chart-subtitle {
    display: none;
  }
  .chart-wrap {
    height: 190px;
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

@media (orientation: landscape) and (max-height: 900px) and (max-width: 1366px) {
  .chart-card {
    padding: 8px 10px;
  }
  .chart-wrap {
    height: 160px;
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

@media (max-width: 1000px) and (hover: hover) and (pointer: fine) {
  .chart-wrap {
    scrollbar-width: thin;
    scrollbar-color: rgba(148, 163, 184, 0.25) transparent;
  }
  .chart-wrap::-webkit-scrollbar {
    display: block;
    height: 3px;
  }
  .chart-wrap::-webkit-scrollbar-track {
    background: transparent;
  }
  .chart-wrap::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.25);
    border-radius: 2px;
  }
  .chart-wrap::-webkit-scrollbar-thumb:hover {
    background: rgba(148, 163, 184, 0.45);
  }
}
</style>
