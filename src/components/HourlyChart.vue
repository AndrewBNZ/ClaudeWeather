<template>
  <div class="chart-card card" data-chart="hourly">
    <div class="chart-header">
      <div class="chart-title-group">
        <h3 class="chart-title">Hourly</h3><span class="chart-title-date">{{ dayOptions[dayIndex] }}</span>
        <span class="chart-subtitle">{{ config.icon }} {{ config.label }}<span v-if="unitLabel" class="chart-unit" @click="emit('open-units-modal')">{{ unitLabel }}</span></span>
      </div>
      <div class="day-nav">
        <div class="day-btn-group" ref="dropdownRef">
          <button
            class="day-step-btn"
            :disabled="dayIndex === 0"
            @click="emit('select-day', 0)"
            title="Jump to today"
          ><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="19 18 13 12 19 6"/><line x1="5" y1="6" x2="5" y2="18"/></svg></button>
          <button
            class="day-step-btn"
            :disabled="dayIndex === 0"
            @click="emit('select-day', dayIndex - 1)"
            :title="dayIndex > 0 ? `Back: ${dayOptions[dayIndex - 1]}` : ''"
          ><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>
          <button class="day-select-btn" ref="selectBtnRef" @click="toggleDropdown">
            {{ dayOptions[dayIndex] }}
            <span class="day-select-arrow" :class="{ open: dropdownOpen }">▾</span>
          </button>
          <button
            class="day-step-btn"
            :disabled="dayIndex >= dayOptions.length - 1"
            @click="emit('select-day', dayIndex + 1)"
            :title="dayIndex < dayOptions.length - 1 ? `Next: ${dayOptions[dayIndex + 1]}` : ''"
          ><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button>
        </div>
        <Teleport to="body">
          <div v-if="dropdownOpen" class="day-dropdown" :style="dropdownStyle">
            <button
              v-for="(opt, i) in dayOptionsParts"
              :key="i"
              class="day-dropdown-item"
              :class="{ active: i === dayIndex }"
              @click="selectDay(i)"
            >
              <span class="day-dow">{{ opt.label }}</span>
              <span class="day-date">{{ opt.date }}</span>
            </button>
          </div>
        </Teleport>
      </div>
    </div>
    <div class="chart-area">
      <div v-if="noRainData" class="chart-empty-msg">No rain forecast for this day</div>
      <div class="chart-wrap" ref="chartWrapRef" :style="{ '--type-color': config.color }">
        <div class="chart-scroll-inner">
          <canvas ref="canvasRef"></canvas>
        </div>
      </div>
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
import { DATA_TYPES, getUnitLabel } from '../utils/dataTypes.js'
import { drawWindArrow } from '../utils/chartHelpers.js'
import { getWeatherInfo, getCompassDir } from '../utils/weatherCodes.js'

const APP_FONT = "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"

const props = defineProps({
  hourly:     { type: Object, required: true },
  daily:      { type: Object, default: null },
  activeType: { type: String, required: true },
  unitPrefs:  { type: Object, required: true },
  dayIndex:   { type: Number, default: 0 },
  theme:      { type: String, default: 'dark' },
  utcOffset:  { type: Number, default: 0 },
  timeFormat: { type: String, default: '12h' },
})

const emit = defineEmits(['select-day', 'open-units-modal'])

const canvasRef     = ref(null)
const chartWrapRef  = ref(null)
const dropdownRef   = ref(null)
const selectBtnRef  = ref(null)
const dropdownOpen  = ref(false)
const dropdownStyle = ref({})
let   chartInstance = null

const navBtnBg     = computed(() => props.theme === 'light' ? 'rgba(0,0,0,0.05)'   : 'rgba(255,255,255,0.12)')
const navBtnBorder = computed(() => props.theme === 'light' ? 'rgba(0,0,0,0.1)'    : 'rgba(255,255,255,0.2)')
const navBtnColor  = computed(() => props.theme === 'light' ? '#64748b'             : 'color-mix(in srgb, var(--text-muted) 25%, var(--text))')

function updateDropdownPos() {
  if (!selectBtnRef.value) return
  const r = selectBtnRef.value.getBoundingClientRect()
  dropdownStyle.value = {
    position: 'fixed',
    top: `${r.bottom + 6}px`,
    right: `${document.documentElement.clientWidth - r.right}px`,
    zIndex: 9999,
  }
}

function toggleDropdown() {
  if (!dropdownOpen.value) {
    updateDropdownPos()
    window.addEventListener('scroll', updateDropdownPos, true)
    window.addEventListener('resize', updateDropdownPos)
  } else {
    window.removeEventListener('scroll', updateDropdownPos, true)
    window.removeEventListener('resize', updateDropdownPos)
  }
  dropdownOpen.value = !dropdownOpen.value
}

function selectDay(i) {
  emit('select-day', i)
  dropdownOpen.value = false
  window.removeEventListener('scroll', updateDropdownPos, true)
  window.removeEventListener('resize', updateDropdownPos)
}

function onDocClick(e) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target)) {
    dropdownOpen.value = false
    window.removeEventListener('scroll', updateDropdownPos, true)
    window.removeEventListener('resize', updateDropdownPos)
  }
}

function scrollToCurrentHour(currentHour) {
  if (currentHour < 0 || !chartWrapRef.value) return
  const wrap = chartWrapRef.value
  const maxScroll = wrap.scrollWidth - wrap.clientWidth
  if (maxScroll <= 0) return
  const pos = (currentHour / 24) * wrap.scrollWidth - wrap.clientWidth / 4
  wrap.scrollLeft = Math.max(0, Math.min(pos, maxScroll))
}

const config = computed(() => DATA_TYPES[props.activeType])
const unitLabel = computed(() => getUnitLabel(props.activeType, props.unitPrefs))

const noRainData = computed(() => {
  if (props.activeType !== 'rain' || !props.hourly) return false
  const start = props.dayIndex * 24
  const amounts = (props.hourly.precipitation ?? []).slice(start, start + 25)
  const probs   = (props.hourly.precipitation_probability ?? []).slice(start, start + 25)
  return amounts.every(v => !v) && Math.max(...probs.filter(v => v != null), 0) < 20
})

const dayOptions = computed(() => {
  const opts = []
  for (let i = 0; i < 14; i++) {
    const isoDate = props.hourly?.time?.[i * 24]
    if (!isoDate) break
    if (i === 0) { opts.push('Today'); continue }
    opts.push(new Date(isoDate.slice(0, 10) + 'T12:00:00').toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' }))
  }
  return opts
})

const dayOptionsParts = computed(() =>
  dayOptions.value.map((opt, i) => {
    const isoDate = props.hourly?.time?.[i * 24]
    const dateStr = isoDate
      ? new Date(isoDate.slice(0, 10) + 'T12:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })
      : ''
    if (i === 0) return { label: 'Today', date: dateStr }
    const comma = opt.indexOf(', ')
    return { label: opt.slice(0, comma), date: opt.slice(comma + 2) }
  })
)

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
      ctx.fillStyle = props.theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.14)'
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
    ctx.strokeStyle = props.theme === 'light' ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.12)'
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
        const isCurrent = i === currentHour

        const radius = isCurrent ? 13 : 11
        drawWindArrow(ctx, x, y, dir, color, { isCurrent })

        // Speed number below the arrow circle (no rotation)
        const v = values[i]
        if (v != null) {
          ctx.save()
          ctx.font = `${isCurrent ? 'bold 14px' : '13px'} ${APP_FONT}`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'top'
          const _isLight = props.theme === 'light'
        ctx.fillStyle = isCurrent ? (_isLight ? '#0f172a' : '#ffffff') : (_isLight ? '#334155' : '#cbd5e1')
          ctx.fillText(`${Math.round(v)}`, x, y + radius + 4)
          ctx.restore()
        }
      })
    },
  }
}

// Per-chart plugin that draws weather condition emoji + temperature value at each data point.
function makeWeatherEmojiPlugin(codes, values, currentHour, suffix = '') {
  return {
    id: 'weatherEmoji',
    afterDatasetsDraw(chart) {
      const { ctx } = chart
      const meta = chart.getDatasetMeta(0)
      meta.data.forEach((point, i) => {
        const { x, y } = point.getProps(['x', 'y'], true)
        const isCurrent = i === currentHour
        const emojiSize = isCurrent ? 26 : 22

        // Emoji centered on the data point
        const emoji = getWeatherInfo(codes[i])?.emoji
        if (emoji) {
          ctx.save()
          ctx.font = `${emojiSize}px ${APP_FONT}`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(emoji, x, y)
          ctx.restore()
        }

        // Value number below the emoji
        const v = values[i]
        if (v != null) {
          ctx.save()
          ctx.font = `${isCurrent ? 'bold 14px' : '13px'} ${APP_FONT}`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'top'
          const _isLight = props.theme === 'light'
        ctx.fillStyle = isCurrent ? (_isLight ? '#0f172a' : '#ffffff') : (_isLight ? '#334155' : '#cbd5e1')
          ctx.fillText(`${Math.round(v)}${suffix}`, x, y + emojiSize / 2 + 2)
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
          ctx.font = `${isCurrent ? 26 : 22}px ${APP_FONT}`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'bottom'
          ctx.fillText(emoji, x, y - 16)
          ctx.restore()
        }

        ctx.save()
        ctx.font = `${isCurrent ? 'bold 14px' : '13px'} ${APP_FONT}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        const _isLight = props.theme === 'light'
        ctx.fillStyle = isCurrent ? (_isLight ? '#0f172a' : '#ffffff') : (_isLight ? '#334155' : '#cbd5e1')
        ctx.fillText(`${Number(val).toFixed(1)}`, x, y - 2)
        ctx.restore()
      })
    },
  }
}

// Parses "2025-06-21T05:23" → 5.383 (fractional hour)
function parseSunHour(isoStr) {
  if (!isoStr) return null
  const t = isoStr.slice(11)
  const [h, m] = t.split(':').map(Number)
  return h + m / 60
}

// Draws sunrise/sunset vertical markers with emoji icons on the chart.
function makeSunriseSunsetPlugin(sunriseHour, sunsetHour) {
  return {
    id: 'sunriseSunset',
    afterDatasetsDraw(chart) {
      if (sunriseHour == null && sunsetHour == null) return
      const { ctx, chartArea, scales } = chart
      const xMin = scales.x.getPixelForValue(0)
      const xMax = scales.x.getPixelForValue(24)

      for (const [hour, emoji, lightColor, darkColor] of [
        [sunriseHour, '☀️', 'rgba(245,158,11,0.55)',  'rgba(251,191,36,0.45)'],
        [sunsetHour,  '🌙', 'rgba(99,102,241,0.55)',  'rgba(139,92,246,0.5)'],
      ]) {
        if (hour == null || hour < 0 || hour > 24) continue
        const x = xMin + (hour / 24) * (xMax - xMin)

        ctx.save()
        ctx.beginPath()
        ctx.moveTo(x, chartArea.top + 24)
        ctx.lineTo(x, chartArea.bottom)
        ctx.strokeStyle = props.theme === 'light' ? lightColor : darkColor
        ctx.lineWidth = 1.5
        ctx.setLineDash([4, 3])
        ctx.stroke()

        ctx.font = `16px ${APP_FONT}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(emoji, x, chartArea.top + 2)
        ctx.restore()
      }
    },
  }
}

function hourLabel(isoStr) {
  const h = parseInt(isoStr.slice(11, 13))
  if (props.timeFormat === '24h') return String(h).padStart(2, '0')
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
  const unit     = cfg.getUnit(props.unitPrefs)
  const decimals = cfg.getDecimals ? cfg.getDecimals(props.unitPrefs) : cfg.decimals
  const isMobile = window.innerWidth <= 1000

  const locDate    = new Date(Date.now() + props.utcOffset * 1000)
  const locHour    = locDate.getUTCHours()
  const locDateStr = locDate.toISOString().slice(0, 10)
  const start = props.dayIndex * 24
  const labels = props.hourly.time.slice(start, start + 25).map(hourLabel)
  let values = props.hourly[cfg.hourlyKey].slice(start, start + 25)
  if (cfg.scale) values = values.map(v => v != null ? cfg.scale(v, props.unitPrefs) : null)
  // Only highlight current hour when viewing the location's current date
  const dayDateStr  = props.hourly.time[start]?.slice(0, 10)
  const currentHour = dayDateStr === locDateStr ? locHour : -1

  const isWind = cfg.id === 'wind'
  const isRain = cfg.id === 'rain'
  const isTemp = cfg.id === 'temperature' || cfg.id === 'feelsLike'

  // Global min/max across all 14 days with padding so inline labels stay inside the chart area
  let globalYMin, globalYMax
  if (!isRain) {
    let allVals = (props.hourly[cfg.hourlyKey] ?? []).filter(v => v != null)
    if (cfg.scale) allVals = allVals.map(v => cfg.scale(v, props.unitPrefs))
    if (allVals.length) {
      const lo = Math.min(...allVals)
      const hi = Math.max(...allVals)
      const pad = Math.max((hi - lo) * 0.18, 2)
      globalYMin = Math.floor(lo - pad)
      globalYMax = Math.ceil(hi + pad)
    }
  }

  const windDirs   = isWind ? (props.hourly.wind_direction_10m ?? []).slice(start, start + 25) : null
  const probValues = isRain ? (props.hourly.precipitation_probability ?? []).slice(start, start + 25) : null
  const wxCodes    = (props.hourly.weather_code ?? []).slice(start, start + 25)

  // All non-rain charts: hide default dots (custom plugin draws icon + number instead)
  const pointRadii  = isRain ? labels.map((_, i) => i === currentHour ? 6 : 3) : 0
  const pointColors = isRain ? labels.map((_, i) => i === currentHour ? '#ffffff' : cfg.color) : cfg.color
  const labelSuffix = (cfg.id === 'humidity' || cfg.id === 'cloudCover') ? '%' : ''
  const sunriseHour = parseSunHour(props.daily?.sunrise?.[props.dayIndex])
  const sunsetHour  = parseSunHour(props.daily?.sunset?.[props.dayIndex])
  const sunPlugin   = makeSunriseSunsetPlugin(sunriseHour, sunsetHour)

  const extraPlugins = [
    makePastShadingPlugin(currentHour, props.dayIndex),
    crosshairPlugin,
    sunPlugin,
    ...(isWind ? [makeWindArrowPlugin(windDirs, values, cfg.color, currentHour)]
      : !isRain ? [makeWeatherEmojiPlugin(wxCodes, values, currentHour, labelSuffix)]
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
      plugins: [makePastShadingPlugin(currentHour, props.dayIndex), crosshairPlugin, sunPlugin, makeRainLabelPlugin(wxCodes, values, currentHour)],
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
                ? ` ${Number(ctx.parsed.y).toFixed(decimals)} ${unit}`
                : ` ${ctx.parsed.y}% chance of rain`,
            },
          },
        },
        scales: {
          x: {
            position: 'top',
            grid:  { color: props.theme === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.04)' },
            ticks: { color: '#64748b', padding: 0, maxRotation: 0, autoSkip: false, font: { family: APP_FONT } },
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
          enabled: false,
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          borderColor: cfg.color,
          borderWidth: 1,
          titleColor: '#94a3b8',
          bodyColor: '#f1f5f9',
          padding: 10,
          callbacks: {
            label: (ctx) => {
              const v = ctx.parsed.y
              const formatted = `${v != null ? Number(v).toFixed(decimals) : '–'}${unit ? ' ' + unit : ''}`
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
          grid:  { color: props.theme === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.04)' },
          ticks: { color: '#64748b', padding: 0, maxRotation: 0, autoSkip: false, font: { family: APP_FONT } },
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
  const locDate = new Date(Date.now() + props.utcOffset * 1000)
  const scrollHour = props.dayIndex === 0 ? locDate.getUTCHours() : 6
  scrollToCurrentHour(scrollHour)
}

function scheduleAndScroll() { requestAnimationFrame(() => requestAnimationFrame(buildAndScroll)) }
watch(
  [() => props.activeType, () => props.unitPrefs, () => props.theme, () => props.hourly, () => props.dayIndex, () => props.timeFormat],
  scheduleAndScroll
)
function onWindowResize() { requestAnimationFrame(() => chartInstance?.resize()) }
onMounted(() => {
  document.addEventListener('click', onDocClick, true)
  window.addEventListener('resize', onWindowResize)
  requestAnimationFrame(() => requestAnimationFrame(buildAndScroll))
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick, true)
  window.removeEventListener('scroll', updateDropdownPos, true)
  window.removeEventListener('resize', updateDropdownPos)
  window.removeEventListener('resize', onWindowResize)
  chartInstance?.destroy()
})
</script>

<style scoped>
.chart-card {
  padding: 20px 20px 16px;
}

.chart-header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 10px;
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
  color: var(--text);
  white-space: nowrap;
}
.chart-title::after {
  content: ' Forecast';
}


.day-nav {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
}

.day-btn-group {
  position: relative;
  display: flex;
  align-items: stretch;
}
.day-btn-group > .day-step-btn,
.day-btn-group > .day-select-btn {
  border-radius: 0;
  border-right-width: 0;
}
.day-btn-group > .day-step-btn:first-child {
  border-radius: 8px 0 0 8px;
}
.day-btn-group > .day-step-btn:last-of-type {
  border-radius: 0 8px 8px 0;
  border-right-width: 1px;
}

.day-select-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.85rem;
  font-weight: 600;
  font-family: inherit;
  color: v-bind(navBtnColor);
  background: v-bind(navBtnBg);
  border: 1px solid v-bind(navBtnBorder);
  border-radius: 8px;
  padding: 6px 10px;
  min-width: 125px;
  justify-content: center;
  cursor: pointer;
  outline: none;
  transition: background 0.15s, border-color 0.15s;
  white-space: nowrap;
}
.day-select-btn:hover {
  background: var(--btn-hover);
  border-color: v-bind(navBtnBorder);
}

.day-select-arrow {
  font-size: 0.75rem;
  opacity: 0.7;
  display: inline-block;
  transition: transform 0.15s;
}
.day-select-arrow.open {
  transform: rotate(180deg);
}

.day-dropdown {
  position: fixed;
  min-width: 125px;
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: 10px;
  padding: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.day-dropdown-item {
  font-size: 0.85rem;
  font-family: inherit;
  font-weight: 500;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  color: var(--text-muted);
  background: transparent;
  border: none;
  border-radius: 7px;
  padding: 6px 10px;
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
  white-space: nowrap;
}
.day-date {
  opacity: 0.6;
  font-variant-numeric: tabular-nums;
}
.day-dropdown-item:hover {
  background: var(--btn-hover);
  border-color: v-bind(navBtnBorder);
  color: var(--text);
}
.day-dropdown-item.active {
  background: var(--btn-hover);
  border-color: v-bind(navBtnBorder);
  color: var(--text);
  font-weight: 600;
}

.chart-subtitle {
  font-size: 1rem;
  color: var(--text-muted);
}

.chart-unit {
  margin-left: 5px;
  font-size: 0.8rem;
  opacity: 0.6;
  cursor: pointer;
}
.chart-unit:hover {
  opacity: 1;
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

@media (max-width: 1000px) {
  .day-dropdown {
    max-height: 232px; /* ~7 items visible */
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .day-dropdown::-webkit-scrollbar {
    display: none;
  }
}

.chart-title-date {
  display: none;
  font-size: 0.8rem;
  font-weight: 500;
  color: v-bind(navBtnColor);
  margin-left: auto;
}

@media (max-width: 400px) {
  .day-select-btn {
    display: none;
  }
  .chart-title-date {
    display: inline;
  }
}

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
    min-width: 1200px;
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
    min-width: 1200px;
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

.day-step-btn {
  width: 32px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: v-bind(navBtnColor);
  background: v-bind(navBtnBg);
  border: 1px solid v-bind(navBtnBorder);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  padding: 6px 0;
}
.day-step-btn:hover:not(:disabled) {
  background: var(--btn-hover);
  border-color: v-bind(navBtnBorder);
}
.day-step-btn:disabled {
  opacity: 0.25;
  cursor: default;
}

.chart-area {
  position: relative;
}

.chart-empty-msg {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  color: var(--text-muted);
  pointer-events: none;
  z-index: 1;
}

/* Chart.js manages canvas dimensions; don't constrain with CSS */
</style>
