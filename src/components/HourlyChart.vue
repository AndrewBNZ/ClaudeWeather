<template>
  <div class="chart-card card">
    <div class="chart-header">
      <div class="chart-title-group">
        <h3 class="chart-title">Hourly</h3>
        <span class="chart-subtitle">{{ config.icon }} {{ config.label }}</span>
      </div>
      <div class="day-nav">
        <button
          v-if="dayIndex > 0"
          class="today-jump-btn"
          @click="emit('select-day', 0)"
          title="Jump to today"
        >Today</button>
        <select
          class="day-select"
          :value="dayIndex"
          @change="emit('select-day', Number($event.target.value))"
        >
          <option v-for="(opt, i) in dayOptions" :key="i" :value="i">{{ opt }}</option>
        </select>
      </div>
    </div>
    <div class="chart-and-nav">
      <button
        v-if="dayIndex > 0"
        class="prev-day-btn"
        @click="emit('select-day', dayIndex - 1)"
        :title="`Back: ${dayOptions[dayIndex - 1]}`"
      >‹</button>
      <div class="chart-wrap" ref="chartWrapRef">
        <div class="chart-scroll-inner">
          <canvas ref="canvasRef"></canvas>
        </div>
      </div>
      <button
        v-if="dayIndex < dayOptions.length - 1"
        class="next-day-btn"
        @click="emit('select-day', dayIndex + 1)"
        :title="`Next: ${dayOptions[dayIndex + 1]}`"
      >›</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Chart, Tooltip } from 'chart.js'

// Tooltip follows the probability line dot on rain charts
Tooltip.positioners.linePoint = function(items) {
  const line = items.find(item => item.datasetIndex === 1) ?? items[0]
  if (!line) return false
  return { x: line.element.x, y: line.element.y }
}
import { DATA_TYPES } from '../utils/dataTypes.js'
import { getWeatherInfo, getCompassDir } from '../utils/weatherCodes.js'

const props = defineProps({
  hourly:     { type: Object, required: true },
  activeType: { type: String, required: true },
  units:      { type: String, required: true },
  dayIndex:   { type: Number, default: 0 },
})

const emit = defineEmits(['select-day'])

const canvasRef     = ref(null)
const chartWrapRef  = ref(null)
let   chartInstance = null

function scrollToCurrentHour(currentHour) {
  if (currentHour < 0 || !chartWrapRef.value) return
  const wrap = chartWrapRef.value
  const maxScroll = wrap.scrollWidth - wrap.clientWidth
  if (maxScroll <= 0) return
  const pos = (currentHour / 24) * wrap.scrollWidth - wrap.clientWidth / 4
  wrap.scrollLeft = Math.max(0, Math.min(pos, maxScroll))
}

const config = computed(() => DATA_TYPES[props.activeType])

const dayOptions = computed(() => {
  const opts = []
  for (let i = 0; i < 14; i++) {
    const isoDate = props.hourly?.time?.[i * 24]
    if (!isoDate) break
    if (i === 0) { opts.push('Today'); continue }
    opts.push(new Date(isoDate.slice(0, 10) + 'T12:00:00').toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' }))
  }
  return opts
})

// Shades past hours with a semi-transparent overlay (today only).
function makePastShadingPlugin(currentHour, dayIndex) {
  return {
    id: 'pastShading',
    afterDatasetsDraw(chart) {
      if (dayIndex !== 0 || currentHour <= 0) return
      const meta = chart.getDatasetMeta(0)
      if (!meta.data[currentHour]) return
      const { ctx, chartArea } = chart
      const x = meta.data[currentHour].getProps(['x'], true).x
      ctx.save()
      ctx.fillStyle = 'rgba(0, 0, 0, 0.32)'
      ctx.fillRect(chartArea.left, chartArea.top, x - chartArea.left, chartArea.bottom - chartArea.top)
      ctx.restore()
    },
  }
}

// Draws a vertical crosshair line at the hovered index.
const crosshairPlugin = {
  id: 'crosshair',
  afterDatasetsDraw(chart) {
    const active = chart.tooltip?.getActiveElements()
    if (!active?.length) return
    const { ctx, chartArea } = chart
    const x = active[0].element.x
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(x, chartArea.top)
    ctx.lineTo(x, chartArea.bottom)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.stroke()
    ctx.restore()
  },
}

// Per-chart plugin that draws rotated arrows for wind direction.
// Wind direction is meteorological (degrees the wind comes FROM).
// Arrows point in the direction the wind is blowing TO (FROM + 180°).
function makeWindArrowPlugin(directions, values, color, currentHour) {
  return {
    id: 'windArrows',
    afterDatasetsDraw(chart) {
      const { ctx } = chart
      const meta = chart.getDatasetMeta(0)
      meta.data.forEach((point, i) => {
        const dir = directions[i]
        if (dir == null) return
        const { x, y } = point.getProps(['x', 'y'], true)
        const angle = (dir + 180) * (Math.PI / 180)
        const isCurrent = i === currentHour

        ctx.save()
        ctx.translate(x, y)

        // Background circle for contrast
        const radius = isCurrent ? 13 : 11
        ctx.beginPath()
        ctx.arc(0, 0, radius, 0, Math.PI * 2)
        ctx.fillStyle = isCurrent ? 'rgba(30, 41, 59, 0.95)' : 'rgba(15, 23, 42, 0.80)'
        ctx.fill()
        ctx.strokeStyle = isCurrent ? color : color + '99'
        ctx.lineWidth = isCurrent ? 1.5 : 1
        ctx.stroke()

        ctx.rotate(angle)

        const arrowColor = isCurrent ? '#ffffff' : color
        ctx.strokeStyle = arrowColor
        ctx.fillStyle   = arrowColor
        ctx.lineWidth   = isCurrent ? 2 : 1.5
        ctx.lineCap     = 'round'

        // Shaft
        ctx.beginPath()
        ctx.moveTo(0, 7)
        ctx.lineTo(0, -3)
        ctx.stroke()

        // Arrowhead
        ctx.beginPath()
        ctx.moveTo(0, -8)
        ctx.lineTo(-4, -2)
        ctx.lineTo(4, -2)
        ctx.closePath()
        ctx.fill()

        ctx.restore()

        // Speed number below the arrow circle (no rotation)
        const v = values[i]
        if (v != null) {
          ctx.save()
          ctx.font = `${isCurrent ? 'bold 14px' : '13px'} sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'top'
          ctx.fillStyle = isCurrent ? '#ffffff' : '#cbd5e1'
          ctx.fillText(`${Math.round(v)}`, x, y + radius + 4)
          ctx.restore()
        }
      })
    },
  }
}

// Per-chart plugin that draws weather condition emoji + temperature value at each data point.
function makeWeatherEmojiPlugin(codes, values, unit, currentHour) {
  return {
    id: 'weatherEmoji',
    afterDatasetsDraw(chart) {
      const { ctx } = chart
      const meta = chart.getDatasetMeta(0)
      meta.data.forEach((point, i) => {
        const { x, y } = point.getProps(['x', 'y'], true)
        const isCurrent = i === currentHour
        const emojiSize = isCurrent ? 22 : 18

        // Emoji centered on the data point
        const emoji = getWeatherInfo(codes[i])?.emoji
        if (emoji) {
          ctx.save()
          ctx.font = `${emojiSize}px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(emoji, x, y)
          ctx.restore()
        }

        // Value number below the emoji
        const v = values[i]
        if (v != null) {
          ctx.save()
          ctx.font = `${isCurrent ? 'bold 14px' : '13px'} sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'top'
          ctx.fillStyle = isCurrent ? '#ffffff' : '#cbd5e1'
          ctx.fillText(`${Math.round(v)}`, x, y + emojiSize / 2 + 2)
          ctx.restore()
        }
      })
    },
  }
}

// Per-chart plugin that draws condition emoji + precipitation amount above each rain bar.
function makeRainLabelPlugin(codes, precipValues, currentHour) {
  return {
    id: 'rainLabels',
    afterDatasetsDraw(chart) {
      const { ctx } = chart
      const meta = chart.getDatasetMeta(0)
      meta.data.forEach((bar, i) => {
        const val = precipValues[i]
        if (!val) return
        const { x, y } = bar.getProps(['x', 'y'], true)
        const isCurrent = i === currentHour

        const emoji = getWeatherInfo(codes[i])?.emoji
        if (emoji) {
          ctx.save()
          ctx.font = `${isCurrent ? 22 : 18}px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'bottom'
          ctx.fillText(emoji, x, y - 16)
          ctx.restore()
        }

        ctx.save()
        ctx.font = `${isCurrent ? 'bold 14px' : '13px'} sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        ctx.fillStyle = isCurrent ? '#ffffff' : '#cbd5e1'
        ctx.fillText(`${Number(val).toFixed(1)}`, x, y - 2)
        ctx.restore()
      })
    },
  }
}

function hourLabel(isoStr) {
  const h = parseInt(isoStr.slice(11, 13))
  if (h === 0)  return '12am'
  if (h < 12)  return `${h}am`
  if (h === 12) return '12pm'
  return `${h - 12}pm`
}

function buildChart() {
  if (!canvasRef.value || !props.hourly) return

  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }

  const cfg      = DATA_TYPES[props.activeType]
  const unit     = cfg.getUnit(props.units)
  const isMobile = window.innerWidth < 640

  const now = new Date()
  const start = props.dayIndex * 24
  const labels = props.hourly.time.slice(start, start + 24).map(hourLabel)
  let values = props.hourly[cfg.hourlyKey].slice(start, start + 24)
  if (cfg.scale) values = values.map(v => v != null ? cfg.scale(v, props.units) : null)
  // Only highlight current hour when viewing today
  const currentHour = props.dayIndex === 0 ? now.getHours() : -1

  const isWind = cfg.id === 'wind'
  const isRain = cfg.id === 'rain'
  const isTemp = cfg.id === 'temperature' || cfg.id === 'feelsLike'

  // Global min/max across all 14 days with padding so inline labels stay inside the chart area
  let globalYMin, globalYMax
  if (!isRain) {
    let allVals = (props.hourly[cfg.hourlyKey] ?? []).filter(v => v != null)
    if (cfg.scale) allVals = allVals.map(v => cfg.scale(v, props.units))
    if (allVals.length) {
      const lo = Math.min(...allVals)
      const hi = Math.max(...allVals)
      const pad = Math.max((hi - lo) * 0.18, 2)
      globalYMin = Math.floor(lo - pad)
      globalYMax = Math.ceil(hi + pad)
    }
  }

  const windDirs   = isWind ? (props.hourly.wind_direction_10m ?? []).slice(start, start + 24) : null
  const probValues = isRain ? (props.hourly.precipitation_probability ?? []).slice(start, start + 24) : null
  const wxCodes    = (props.hourly.weather_code ?? []).slice(start, start + 24)

  // All non-rain charts: hide default dots (custom plugin draws icon + number instead)
  const pointRadii  = isRain ? labels.map((_, i) => i === currentHour ? 6 : 3) : 0
  const pointColors = isRain ? labels.map((_, i) => i === currentHour ? '#ffffff' : cfg.color) : cfg.color
  const extraPlugins = [
    makePastShadingPlugin(currentHour, props.dayIndex),
    crosshairPlugin,
    ...(isWind ? [makeWindArrowPlugin(windDirs, values, cfg.color, currentHour)]
      : !isRain ? [makeWeatherEmojiPlugin(wxCodes, values, unit, currentHour)]
      : []),
  ]

  // Rain: bar chart for amount + probability line on a second right axis
  if (isRain) {
    chartInstance = new Chart(canvasRef.value, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            type: 'bar',
            label: 'Amount',
            data: values,
            backgroundColor: cfg.color + 'bb',
            borderColor: cfg.color,
            borderWidth: 1,
            borderRadius: 3,
            yAxisID: 'y',
          },
          {
            type: 'line',
            label: 'Probability',
            data: probValues,
            borderColor: '#93c5fd',
            backgroundColor: 'transparent',
            borderWidth: 2,
            tension: 0.4,
            spanGaps: true,
            pointRadius: labels.map((_, i) => i === currentHour ? 5 : 2),
            pointBackgroundColor: labels.map((_, i) => i === currentHour ? '#ffffff' : '#93c5fd'),
            pointBorderColor: 'transparent',
            yAxisID: 'y1',
          },
        ],
      },
      plugins: [makePastShadingPlugin(currentHour, props.dayIndex), crosshairPlugin, makeRainLabelPlugin(wxCodes, values, currentHour)],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        layout: { padding: { left: 4, right: 4 } },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: !isMobile,
            position: 'linePoint',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            borderColor: cfg.color,
            borderWidth: 1,
            titleColor: '#94a3b8',
            bodyColor: '#f1f5f9',
            padding: 10,
            callbacks: {
              label: (ctx) => ctx.datasetIndex === 0
                ? ` ${Number(ctx.parsed.y).toFixed(cfg.decimals)} ${unit}`
                : ` ${ctx.parsed.y}% chance of rain`,
            },
          },
        },
        scales: {
          x: {
            position: 'top',
            grid:  { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#64748b', maxRotation: 0, autoSkip: true, maxTicksLimit: 12 },
            border: { color: 'rgba(255,255,255,0.06)' },
          },
          y: {
            position: 'left',
            grace: '20%',
            grid:  { display: false },
            ticks: { display: false, color: '#64748b', callback: (v) => `${v}${unit}` },
            border: { display: false },
          },
          y1: {
            position: 'right',
            min: 0,
            max: 100,
            grid:  { drawOnChartArea: false },
            ticks: { display: false, color: '#93c5fd', callback: (v) => `${v}%` },
            border: { display: false },
          },
        },
      },
    })
    return
  }

  chartInstance = new Chart(canvasRef.value, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: cfg.label,
        data: values,
        borderColor: cfg.color,
        backgroundColor: cfg.color + '22',
        fill: 'start',
        tension: 0.4,
        spanGaps: true,
        pointRadius: pointRadii,
        pointHoverRadius: isWind ? 0 : 7,
        pointHitRadius: 12,
        pointBackgroundColor: pointColors,
        pointBorderColor: pointColors,
        borderWidth: 2,
      }],
    },
    plugins: extraPlugins,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      layout: { padding: { left: 4, right: 4, top: isRain ? 0 : (isMobile ? 8 : 16) } },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: !isMobile,
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          borderColor: cfg.color,
          borderWidth: 1,
          titleColor: '#94a3b8',
          bodyColor: '#f1f5f9',
          padding: 10,
          callbacks: {
            label: (ctx) => {
              const v = ctx.parsed.y
              const formatted = `${v != null ? Number(v).toFixed(cfg.decimals) : '–'}${unit ? ' ' + unit : ''}`
              if (isWind && windDirs) {
                const dir = getCompassDir(windDirs[ctx.dataIndex])
                return ` ${formatted} ${dir}`
              }
              if (isTemp) {
                const condition = getWeatherInfo(wxCodes[ctx.dataIndex])?.label ?? ''
                return ` ${formatted}  ${condition}`
              }
              return ` ${formatted}`
            },
          },
        },
      },
      scales: {
        x: {
          position: 'top',
          grid:  { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#64748b', maxRotation: 0, autoSkip: true, maxTicksLimit: 12 },
          border: { color: 'rgba(255,255,255,0.06)' },
        },
        y: {
          ...(!isRain && globalYMin != null ? { min: globalYMin, max: globalYMax } : {}),
          grid:  { display: false },
          ticks: {
            display: isRain,
            color: '#64748b',
            callback: (v) => `${v}${unit}`,
          },
          border: { display: false },
        },
      },
    },
  })
}

async function buildAndScroll() {
  buildChart()
  await nextTick()
  const currentHour = props.dayIndex === 0 ? new Date().getHours() : -1
  scrollToCurrentHour(currentHour)
}

function scheduleAndScroll() { requestAnimationFrame(() => requestAnimationFrame(buildAndScroll)) }
watch(() => props.activeType, scheduleAndScroll)
watch(() => props.units,      scheduleAndScroll)
watch(() => props.hourly,     scheduleAndScroll)
watch(() => props.dayIndex,   scheduleAndScroll)
onMounted(() => requestAnimationFrame(() => requestAnimationFrame(buildAndScroll)))
onBeforeUnmount(() => { chartInstance?.destroy() })
</script>

<style scoped>
.chart-card {
  padding: 20px 20px 16px;
}

.chart-header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 16px;
}

.chart-title-group {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex: 1;
}

.chart-title {
  font-size: 1rem;
  font-weight: 600;
  color: #e2e8f0;
  white-space: nowrap;
}

.today-jump-btn {
  font-size: 0.85rem;
  font-weight: 600;
  font-family: inherit;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 3px 10px;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
}
.today-jump-btn:hover {
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.1);
}

.day-nav {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
}

.day-select {
  font-size: 0.85rem;
  font-weight: 600;
  font-family: inherit;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.08);
  border: 1px solid rgba(56, 189, 248, 0.25);
  border-radius: 8px;
  padding: 3px 8px;
  cursor: pointer;
  outline: none;
  transition: background 0.15s, border-color 0.15s;
}
.day-select:hover,
.day-select:focus {
  background: rgba(56, 189, 248, 0.15);
  border-color: rgba(56, 189, 248, 0.45);
}
.day-select option {
  background: #0f172a;
  color: #e2e8f0;
}

.chart-subtitle {
  font-size: 1rem;
  color: #94a3b8;
}

.chart-and-nav {
  display: flex;
  align-items: stretch;
}

.chart-wrap {
  position: relative;
  height: 220px;
  flex: 1;
  min-width: 0;
}

.chart-scroll-inner {
  position: relative;
  height: 100%;
}

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
    min-width: 900px;
  }
}

.prev-day-btn,
.next-day-btn {
  width: 28px;
  flex-shrink: 0;
  border: none;
  color: rgba(56, 189, 248, 0.4);
  font-size: 1.4rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.prev-day-btn {
  background: linear-gradient(to left, transparent, rgba(56, 189, 248, 0.06));
  border-right: 2px solid rgba(56, 189, 248, 0.2);
  border-radius: 4px 0 0 4px;
}
.prev-day-btn:hover {
  background: linear-gradient(to left, transparent, rgba(56, 189, 248, 0.15));
  border-right-color: rgba(56, 189, 248, 0.6);
  color: #38bdf8;
}

.next-day-btn {
  background: linear-gradient(to right, transparent, rgba(56, 189, 248, 0.06));
  border-left: 2px solid rgba(56, 189, 248, 0.2);
  border-radius: 0 4px 4px 0;
}
.next-day-btn:hover {
  background: linear-gradient(to right, transparent, rgba(56, 189, 248, 0.15));
  border-left-color: rgba(56, 189, 248, 0.6);
  color: #38bdf8;
}

/* Chart.js manages canvas dimensions; don't constrain with CSS */
</style>
