<template>
  <div class="daily-card card" :style="cardSizeStyle">
    <div v-if="layout.showTitle" class="daily-header">
      <span class="card-title-icon" v-html="CARD_ICONS.dailyForecast"></span>
      <h3 class="daily-title">Daily Forecast</h3>
    </div>
    <div v-if="layout.chartStyle !== 'vertical'" class="forecast-grid">
      <!-- Sticky left column: icons only -->
      <div class="labels-col">
        <div class="lbl-day-row"></div>
        <div class="lbl-temp-row"></div>
        <div v-if="visibleOtherPoints.length || (layout.showConditions && layout.chartStyle === 'bar')" class="lbl-stats-wrap">
          <div v-if="layout.showConditions && layout.chartStyle === 'bar'" class="lbl-stat-row">
            <span class="stat-icon" v-html="TILE_ICONS['sceneConditions']"></span>
          </div>
          <div
            v-for="pt in visibleOtherPoints"
            :key="pt.type"
            class="lbl-stat-row"
            :style="{ color: ptColor(pt.type) }"
          >
            <span class="stat-icon" v-html="TILE_ICONS[DATA_TYPES[pt.type]?.iconKey ?? pt.type]"></span>
          </div>
        </div>
      </div>

      <!-- Scrollable day columns -->
      <div class="days-scroll" ref="daysScrollRef">
        <div class="days-row" :class="{ 'days-row--with-dates': datesNeedingDay.size > 0 || layout.showDate }">
          <div
            v-for="(date, i) in displayDays"
            :key="date"
            class="day-col"
            :ref="el => { if (el) dayColRefs[i] = el }"
            @click="emit('day-selected', i)"
          >
            <div class="day-lbl" :class="{ 'day-lbl--with-num': dayNumber(date) }">
              <span>{{ dayLabel(date) }}</span>
              <span v-if="dayNumber(date)" class="day-num">{{ dayNumber(date) }}</span>
            </div>

            <div class="temp-wrap" :class="{ 'temp-wrap--icons': layout.chartStyle === 'icons' || layout.chartStyle === 'line' }">
              <template v-if="layout.chartStyle === 'bar'">
                <div class="bar-track">
                  <template v-if="FLOATING_BAR_TYPES.has(activeDataPoint)">
                    <!-- Floating bar with hi/lo labels outside the fill -->
                    <div class="bar-fill bar-fill--floating" :style="barStyle(i)"></div>
                    <span class="t-hi t-hi--float" :style="barFloatHiStyle(i)">{{ fmtTemp(mainHi[i]) }}</span>
                    <span class="t-lo t-lo--float" :style="barFloatLoStyle(i)">{{ fmtTemp(mainLo[i]) }}</span>
                  </template>
                  <template v-else>
                    <!-- Simple bar with value inside at top -->
                    <div class="bar-fill" :style="barStyleSimple(i)">
                      <div v-if="activeDataPoint === 'wind'" class="t-val-inside t-wind-val">
                        <span v-if="windDirs[i] != null" class="wind-dir-arrow">
                          <svg viewBox="0 0 14 14" fill="none" aria-hidden="true"
                               :style="{ transform: `rotate(${windRotation(i)}deg)`, transformOrigin: '50% 50%' }">
                            <line x1="7" y1="12" x2="7" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            <polygon points="7,2 4,7 10,7" fill="currentColor"/>
                          </svg>
                        </span>
                        <span>{{ fmtMainValue(i) }}</span>
                      </div>
                      <span v-else class="t-val-inside">{{ fmtMainValue(i) }}</span>
                    </div>
                  </template>
                </div>
              </template>
              <template v-else>
                <!-- Icons chart style: floating icon with hi/lo labels -->
                <div class="icon-float-group" :style="iconGroupStyle(i)">
                  <span v-if="activeDataPoint === 'wind'" class="icon-val-hi wind-val-hi">
                    <span v-if="windDirs[i] != null" class="wind-dir-arrow">
                      <svg viewBox="0 0 14 14" fill="none" aria-hidden="true"
                           :style="{ transform: `rotate(${windRotation(i)}deg)`, transformOrigin: '50% 50%' }">
                        <line x1="7" y1="12" x2="7" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        <polygon points="7,2 4,7 10,7" fill="currentColor"/>
                      </svg>
                    </span>
                    <span>{{ fmtMainValue(i) }}</span>
                  </span>
                  <span v-else class="icon-val-hi">{{ FLOATING_BAR_TYPES.has(activeDataPoint) ? fmtTemp(mainHi[i]) : fmtMainValue(i) }}</span>
                  <WeatherIcon class="wx-float-icon" :code="wxCode(i)" />
                  <span class="icon-val-lo" :style="{ visibility: FLOATING_BAR_TYPES.has(activeDataPoint) ? 'visible' : 'hidden' }">{{ fmtTemp(mainLo[i]) }}</span>
                </div>
              </template>
            </div>

            <div v-if="visibleOtherPoints.length || (layout.showConditions && layout.chartStyle === 'bar')" class="stats">
              <div v-if="layout.showConditions && layout.chartStyle === 'bar'" class="wx-icon stat-row"><WeatherIcon :code="wxCode(i)" /></div>
              <template v-for="pt in visibleOtherPoints" :key="pt.type">
                <!-- Rain probability -->
                <div v-if="pt.type === 'rainProb'" class="stat-row" :style="{ color: rainColor }">
                  <span>{{ fmtProb(i) }}</span>
                </div>
                <!-- Rain amount -->
                <div v-else-if="pt.type === 'rainAmount'" class="stat-row" :style="{ color: rainColor }">
                  <span>{{ fmtPrecip(i) }}</span>
                </div>
                <!-- Wind: keep direction arrow inline with value -->
                <div v-else-if="pt.type === 'wind'" class="stat-row" :style="{ color: windColor }">
                  <span class="wind-dir-arrow">
                    <svg viewBox="0 0 14 14" fill="none" aria-hidden="true"
                         :style="{ transform: `rotate(${windRotation(i)}deg)`, transformOrigin: '50% 50%' }">
                      <line x1="7" y1="12" x2="7" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                      <polygon points="7,2 4,7 10,7" fill="currentColor"/>
                    </svg>
                  </span>
                  <span>{{ fmtWind(i) }}</span>
                </div>
                <!-- Wind gusts -->
                <div v-else-if="pt.type === 'gusts'" class="stat-row" :style="{ color: windColor }">
                  <span>{{ fmtGusts(i) }}</span>
                </div>
                <!-- Feels like -->
                <div v-else-if="pt.type === 'feelsLike'" class="stat-row" :style="{ color: DATA_TYPES.feelsLike.color }">
                  <span>{{ fmtTemp(feelsLikeMax[i]) }}</span>
                </div>
                <!-- UV index -->
                <div v-else-if="pt.type === 'uv'" class="stat-row" :style="{ color: DATA_TYPES.uv.color }">
                  <span>{{ fmtUv(i) }}</span>
                </div>
                <!-- Humidity -->
                <div v-else-if="pt.type === 'humidity'" class="stat-row" :style="{ color: DATA_TYPES.humidity.color }">
                  <span>{{ fmtHumidity(i) }}</span>
                </div>
                <!-- Cloud cover -->
                <div v-else-if="pt.type === 'cloudCover'" class="stat-row" :style="{ color: DATA_TYPES.cloudCover.color }">
                  <span>{{ fmtCloudCover(i) }}</span>
                </div>
                <!-- Pressure -->
                <div v-else-if="pt.type === 'pressure'" class="stat-row" :style="{ color: DATA_TYPES.pressure.color }">
                  <span>{{ fmtPressure(i) }}</span>
                </div>
                <!-- Visibility -->
                <div v-else-if="pt.type === 'visibility'" class="stat-row" :style="{ color: DATA_TYPES.visibility.color }">
                  <span>{{ fmtVisibility(i) }}</span>
                </div>
              </template>
            </div>
          </div>

          <!-- Line chart SVG overlay -->
          <svg
            v-if="layout.chartStyle === 'line' && dailyLinePoints.length > 1"
            class="daily-line-svg"
            :width="displayDays.length * COL_WIDTH"
            :height="DAY_COL_TOP_OFFSET + iconTrackH"
            aria-hidden="true"
          >
            <polyline
              :points="dailyLinePoints.join(' ')"
              fill="none"
              :stroke="activeColor"
              stroke-opacity="0.6"
              stroke-width="4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>

    <!-- Vertical list style -->
    <div v-if="layout.chartStyle === 'vertical'" class="vertical-list" :class="{ 'vertical-list--titled': layout.showTitle }">
      <!-- Header row: icons for each extra column -->
      <div
        v-if="visibleOtherPoints.length"
        class="vrow vrow-header"
        :style="{ gridTemplateColumns: [
          datesNeedingDay.size > 0 || layout.showDate ? '62px' : '48px',
          layout.showConditions ? '24px' : null,
          '1fr',
          ...visibleOtherPoints.slice(0, 3).map(() => '44px'),
        ].filter(Boolean).join(' ') }"
      >
        <div></div>
        <div v-if="layout.showConditions"></div>
        <div></div>
        <div
          v-for="pt in visibleOtherPoints.slice(0, 3)"
          :key="pt.type"
          class="vrow-extra-hdr"
          :style="{ color: ptColor(pt.type) }"
        >
          <span v-html="TILE_ICONS[DATA_TYPES[pt.type]?.iconKey ?? pt.type]"></span>
        </div>
      </div>

      <div
        v-for="(date, i) in displayDays"
        :key="date"
        class="vrow"
        :style="{ gridTemplateColumns: [
          datesNeedingDay.size > 0 || layout.showDate ? '62px' : '48px',
          layout.showConditions ? '24px' : null,
          '1fr',
          ...visibleOtherPoints.slice(0, 3).map(() => '44px'),
        ].filter(Boolean).join(' ') }"
        @click="emit('day-selected', i)"
      >
        <!-- Day label -->
        <div class="vrow-day">{{ dayLabel(date) }}{{ dayNumber(date) ? ` ${dayNumber(date)}` : '' }}</div>

        <!-- Condition icon -->
        <div v-if="layout.showConditions" class="vrow-icon">
          <WeatherIcon :code="wxCode(i)" />
        </div>

        <!-- Horizontal data bar -->
        <div class="vrow-bar-wrap">
          <template v-if="FLOATING_BAR_TYPES.has(activeDataPoint)">
            <span class="vbar-lo">{{ fmtTemp(mainLo[i]) }}</span>
            <div class="vbar-track">
              <div class="vbar-fill" :style="hBarStyle(i)"></div>
            </div>
            <span class="vbar-hi">{{ fmtTemp(mainHi[i]) }}</span>
          </template>
          <template v-else>
            <div class="vbar-track">
              <div class="vbar-fill vbar-fill--simple" :style="hBarStyleSimple(i)"></div>
            </div>
            <span class="vbar-val">{{ fmtMainValue(i) }}</span>
          </template>
        </div>

        <!-- Up to 3 other data points as separate columns -->
        <template v-for="pt in visibleOtherPoints.slice(0, 3)" :key="pt.type">
          <div class="vrow-extra" :style="{ color: ptColor(pt.type) }">
            <template v-if="pt.type === 'rainProb'">{{ fmtProb(i) }}</template>
            <template v-else-if="pt.type === 'rainAmount'">{{ fmtPrecip(i) }}</template>
            <template v-else-if="pt.type === 'wind'">
              <span v-if="windDirs[i] != null" class="wind-dir-arrow">
                <svg viewBox="0 0 14 14" fill="none" aria-hidden="true"
                     :style="{ transform: `rotate(${windRotation(i)}deg)`, transformOrigin: '50% 50%' }">
                  <line x1="7" y1="12" x2="7" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  <polygon points="7,2 4,7 10,7" fill="currentColor"/>
                </svg>
              </span>
              {{ fmtWind(i) }}
            </template>
            <template v-else-if="pt.type === 'gusts'">{{ fmtGusts(i) }}</template>
            <template v-else-if="pt.type === 'feelsLike'">{{ fmtTemp(feelsLikeMax[i]).replace('°', '') }}</template>
            <template v-else-if="pt.type === 'uv'">{{ fmtUv(i) }}</template>
            <template v-else-if="pt.type === 'humidity'">{{ fmtHumidity(i) }}</template>
            <template v-else-if="pt.type === 'cloudCover'">{{ fmtCloudCover(i) }}</template>
            <template v-else-if="pt.type === 'pressure'">{{ fmtPressure(i) }}</template>
            <template v-else-if="pt.type === 'visibility'">{{ fmtVisibility(i) }}</template>
          </div>
        </template>
      </div>
    </div>

    <DataPointPicker
      :show="layout.showDataPointPicker"
      :options="pickerOptions"
      :model-value="activeDataPoint"
      @update:model-value="selectDataPoint"
      style="margin-top: 8px"
    />
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { DATA_TYPES, DATA_TYPE_LIST, getDailyAvgFromHourly } from '../utils/dataTypes.js'
import { DEFAULT_DAILY_FORECAST_LAYOUT } from '../composables/useSettings.js'
import { TILE_ICONS, CARD_ICONS } from '../utils/tileIcons.js'
import DataPointPicker from '../components/ui/DataPointPicker.vue'
import WeatherIcon from '../components/WeatherIcon.vue'

const DAY_COL_TOP_OFFSET = 36 // day-col padding-top(6) + day-lbl height(26) + margin-bottom(4)

// ── Props & emits ───────────────────────────────────────────────────────────

const props = defineProps({
  daily:               { type: Object, default: null },
  hourly:              { type: Object, default: null },
  unitPrefs:           { type: Object, required: true },
  selectedDay:         { type: Number, default: 0 },
  utcOffset:           { type: Number, default: 0 },
  dailyForecastLayout: { type: Object, default: null },
  forecastDataPoint:   { type: String, default: null },
})

const emit = defineEmits(['day-selected', 'forecast-data-point'])

const dayColRefs = ref([])
const daysScrollRef = ref(null)

// ── Layout config (with fallback) ────────────────────────────────────────────

const layout = computed(() => props.dailyForecastLayout ?? DEFAULT_DAILY_FORECAST_LAYOUT)

const CHART_SIZE_MULT = { S: 1, M: 1.6, L: 2.2 }
const cardSizeStyle = computed(() => {
  const mult = CHART_SIZE_MULT[layout.value.chartSize] ?? 1
  return { '--chart-size-mult': mult }
})

const visibleOtherPoints = computed(() => {
  const mainType = layout.value.mainDataPoint
  return layout.value.otherDataPoints?.filter(p => p.enabled && p.type !== mainType) ?? []
})

// ── Data point picker (local — doesn't persist to settings) ──────────────────

const pickerOptions = computed(() => {
  const mainType = layout.value.mainDataPoint
  const seen = new Set()
  const opts = []
  for (const pt of layout.value.otherDataPoints ?? []) {
    if (seen.has(pt.type)) continue
    seen.add(pt.type)
    if (pt.type === mainType || pt.showInPicker) {
      opts.push({ type: pt.type, label: DATA_TYPES[pt.type]?.shortLabel ?? pt.type })
    }
  }
  return opts
})

const activeDataPoint = ref(props.forecastDataPoint ?? layout.value.mainDataPoint)
watch(() => layout.value.mainDataPoint, (v) => { activeDataPoint.value = v })
watch(() => props.forecastDataPoint, (v) => { if (v) activeDataPoint.value = v })

watch(() => props.selectedDay, (i) => {
  nextTick(() => {
    const col = dayColRefs.value[i]
    const scroller = daysScrollRef.value
    if (!col || !scroller) return
    const colLeft = col.offsetLeft
    const colRight = colLeft + col.offsetWidth
    const scrollLeft = scroller.scrollLeft
    const clientWidth = scroller.clientWidth
    if (colLeft < scrollLeft) {
      scroller.scrollTo({ left: colLeft, behavior: 'smooth' })
    } else if (colRight > scrollLeft + clientWidth) {
      scroller.scrollTo({ left: colRight - clientWidth, behavior: 'smooth' })
    }
  })
})

function selectDataPoint(type) {
  activeDataPoint.value = type
  emit('forecast-data-point', type)
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const rainColor = DATA_TYPES.rainAmount.color
const windColor = DATA_TYPES.wind.color

function ptColor(type) {
  if (type === 'rainProb' || type === 'rainAmount') return rainColor
  if (type === 'wind' || type === 'gusts') return windColor
  return DATA_TYPES[type]?.color ?? 'inherit'
}

const days        = computed(() => props.daily?.time ?? [])
const displayDays = computed(() => {
  const n = layout.value.numDays
  return n != null ? days.value.slice(0, n) : days.value
})
const maxTemps = computed(() => props.daily?.temperature_2m_max ?? [])
const minTemps = computed(() => props.daily?.temperature_2m_min ?? [])
const windDirs = computed(() => props.daily?.wind_direction_10m_dominant ?? [])

const precipUnit = computed(() =>
  props.unitPrefs.precipitation === 'inch' ? 'in' : 'mm'
)
const precipDecimals = computed(() =>
  props.unitPrefs.precipitation === 'inch' ? 2 : 1
)
const windUnit = computed(() =>
  ({ kmh: 'km/h', mph: 'mph', ms: 'm/s', kn: 'kn' })[props.unitPrefs.wind] ?? 'km/h'
)

// Most common weather code between 7am–9pm for the day
function dominantDaytimeCode(dayIndex) {
  const hourlyWx = props.hourly?.weather_code
  if (!hourlyWx) return props.daily?.weather_code?.[dayIndex] ?? null
  const start   = dayIndex * 24
  const daytime = hourlyWx.slice(start + 7, start + 21).filter(v => v != null)
  if (!daytime.length) return props.daily?.weather_code?.[dayIndex] ?? null
  const freq = {}
  for (const c of daytime) freq[c] = (freq[c] ?? 0) + 1
  return Number(Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0])
}

function wxCode(i) {
  return dominantDaytimeCode(i)
}

// Set of iso dates that are a duplicate weekday (i.e. the weekday already appeared earlier in the list)
const datesNeedingDay = computed(() => {
  const seen = new Set(), needsDay = new Set()
  for (const isoDate of displayDays.value) {
    const [y, m, d] = isoDate.split('-').map(Number)
    const wd = new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('en', { weekday: 'short', timeZone: 'UTC' })
    if (seen.has(wd)) needsDay.add(isoDate)
    else seen.add(wd)
  }
  return needsDay
})
const COL_WIDTH = 50

function dayLabel(isoDate) {
  const locDateStr = new Date(Date.now() + props.utcOffset * 1000).toISOString().slice(0, 10)
  if (isoDate === locDateStr) return 'Today'
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d, 12))
  return date.toLocaleDateString('en', { weekday: 'short', timeZone: 'UTC' })
}

function dayNumber(isoDate) {
  const locDateStr = new Date(Date.now() + props.utcOffset * 1000).toISOString().slice(0, 10)
  if (isoDate === locDateStr) return null
  if (!layout.value.showDate && !datesNeedingDay.value.has(isoDate)) return null
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d, 12))
  return date.toLocaleDateString('en', { day: 'numeric', timeZone: 'UTC' })
}

function fmtTemp(v) {
  if (v == null) return '–'
  return `${Math.round(v)}°`
}

function fmtProb(i) {
  const v = props.daily?.precipitation_probability_max?.[i]
  if (v == null) return '–'
  return `${v}%`
}

function fmtPrecip(i) {
  const v = props.daily?.precipitation_sum?.[i]
  if (v == null) return '–'
  return `${Number(v).toFixed(precipDecimals.value)}`
}

function fmtWind(i) {
  const v = props.daily?.wind_speed_10m_max?.[i]
  if (v == null) return '–'
  return `${Math.round(v)}`
}

function fmtGusts(i) {
  const v = props.daily?.wind_gusts_10m_max?.[i]
  if (v == null) return '–'
  return `${Math.round(v)}`
}

function fmtUv(i) {
  const v = uvMax.value[i]
  if (v == null) return '–'
  return `${Math.round(v * 10) / 10}`
}

function fmtHumidity(i) {
  const v = dailyHumidity.value[i]
  if (v == null) return '–'
  return `${Math.round(v)}%`
}

function fmtCloudCover(i) {
  const v = dailyCloudCover.value[i]
  if (v == null) return '–'
  return `${Math.round(v)}%`
}

function fmtPressure(i) {
  const v = dailyPressure.value[i]
  if (v == null) return '–'
  const decimals = DATA_TYPES.pressure.getDecimals(props.unitPrefs)
  return `${Number(v).toFixed(decimals)}`
}

function fmtVisibility(i) {
  const v = dailyVisibility.value[i]
  if (v == null) return '–'
  return `${Number(v).toFixed(1)}`
}

// Wind arrow rotation: meteorological dir is where wind comes FROM → arrow points TO (dir + 180)
function windRotation(i) {
  const d = windDirs.value[i]
  return d != null ? d + 180 : 0
}

// ── Main data point values ────────────────────────────────────────────────────

const feelsLikeMax = computed(() => props.daily?.apparent_temperature_max ?? [])
const feelsLikeMin = computed(() => props.daily?.apparent_temperature_min ?? [])
const uvMax        = computed(() => props.daily?.uv_index_max ?? [])
const dailyHumidity   = computed(() => getDailyAvgFromHourly(props.hourly ?? {}, 'relative_humidity_2m'))
const dailyCloudCover = computed(() => getDailyAvgFromHourly(props.hourly ?? {}, 'cloud_cover'))
const dailyPressure   = computed(() => {
  const raw = getDailyAvgFromHourly(props.hourly ?? {}, 'surface_pressure')
  const scale = DATA_TYPES.pressure.scale
  return raw.map(v => v != null ? scale(v, props.unitPrefs) : null)
})
const dailyVisibility = computed(() => {
  const raw = getDailyAvgFromHourly(props.hourly ?? {}, 'visibility')
  return raw.map(v => v != null ? DATA_TYPES.visibility.scale(v, props.unitPrefs) : null)
})

const FLOATING_BAR_TYPES = new Set(['temperature', 'feelsLike'])

const mainHi = computed(() => {
  const mdp = activeDataPoint.value
  if (mdp === 'feelsLike')  return feelsLikeMax.value
  if (mdp === 'rainAmount') return props.daily?.precipitation_sum ?? []
  if (mdp === 'rainProb')   return props.daily?.precipitation_probability_max ?? []
  if (mdp === 'wind')       return props.daily?.wind_speed_10m_max ?? []
  if (mdp === 'gusts')      return props.daily?.wind_gusts_10m_max ?? []
  if (mdp === 'uv')         return uvMax.value
  if (mdp === 'humidity')   return dailyHumidity.value
  if (mdp === 'cloudCover') return dailyCloudCover.value
  if (mdp === 'pressure')   return dailyPressure.value
  if (mdp === 'visibility') return dailyVisibility.value
  return maxTemps.value
})
const mainLo = computed(() => {
  const mdp = activeDataPoint.value
  if (mdp === 'feelsLike') return feelsLikeMin.value
  return minTemps.value
})

function fmtMainValue(i) {
  const mdp = activeDataPoint.value
  if (mdp === 'feelsLike') return fmtTemp(feelsLikeMax.value[i])
  if (mdp === 'rainAmount') {
    const v = props.daily?.precipitation_sum?.[i]
    return v != null ? `${Number(v).toFixed(precipDecimals.value)}` : '–'
  }
  if (mdp === 'rainProb') {
    const v = props.daily?.precipitation_probability_max?.[i]
    return v != null ? `${Math.round(v)}%` : '–'
  }
  if (mdp === 'gusts') {
    const v = props.daily?.wind_gusts_10m_max?.[i]
    return v != null ? `${Math.round(v)}` : '–'
  }
  if (mdp === 'wind') {
    const v = props.daily?.wind_speed_10m_max?.[i]
    return v != null ? `${Math.round(v)}` : '–'
  }
  if (mdp === 'uv') {
    const v = uvMax.value[i]
    return v != null ? `${Math.round(v * 10) / 10}` : '–'
  }
  if (mdp === 'humidity')   return fmtHumidity(i)
  if (mdp === 'cloudCover') return fmtCloudCover(i)
  if (mdp === 'pressure')   return fmtPressure(i)
  if (mdp === 'visibility') return fmtVisibility(i)
  return fmtTemp(maxTemps.value[i])
}

// ── Temperature bar (floating) ────────────────────────────────────────────────

const globalTempMin = computed(() => {
  const vals = minTemps.value.filter(v => v != null)
  return vals.length ? Math.min(...vals) : 0
})

const globalTempMax = computed(() => {
  const vals = maxTemps.value.filter(v => v != null)
  return vals.length ? Math.max(...vals) : 1
})

function barFloatGeometry(i) {
  const lo     = globalTempMin.value
  const hi     = globalTempMax.value
  const range  = hi - lo || 1
  const hiSrc  = activeDataPoint.value === 'feelsLike' ? feelsLikeMax.value : maxTemps.value
  const loSrc  = activeDataPoint.value === 'feelsLike' ? feelsLikeMin.value : minTemps.value
  const dayMax = hiSrc[i] ?? hi
  const dayMin = loSrc[i] ?? lo
  // Reserve LABEL_H px at top and bottom for hi/lo labels so they stay inside the container
  const LABEL_H = 14, MIN_H = 26
  const innerH = barTrackH.value - LABEL_H * 2  // available for bars
  const usable = innerH - MIN_H         // range of bar height variation
  const rawH     = ((dayMax - dayMin) / range) * usable
  const heightPx = MIN_H + rawH
  // topPx is within the inner zone (offset by LABEL_H from container top)
  const topPx    = LABEL_H + ((hi - dayMax) / range) * (innerH - heightPx)
  return { topPx, heightPx }
}

function barStyle(i) {
  const { topPx, heightPx } = barFloatGeometry(i)
  const bg = DATA_TYPES[activeDataPoint.value]?.color ?? DATA_TYPES.temperature.color
  return { top: `${topPx}px`, height: `${heightPx}px`, background: bg }
}

function barFloatHiStyle(i) {
  const { topPx } = barFloatGeometry(i)
  return { top: `${topPx}px`, transform: 'translateY(-100%)' }
}

function barFloatLoStyle(i) {
  const { topPx, heightPx } = barFloatGeometry(i)
  return { top: `${topPx + heightPx + 2}px` }
}

// ── Icons chart style — vertical icon position ────────────────────────────────

// The icon group is ~52px tall (hi label ~16px + icon ~20px + lo label ~16px).
// We position its centre within the track area of temp-wrap (excludes top/bottom padding).
// topPct is 0% = highest value position, 100% = lowest.
const ICON_GROUP_H = 56 // px — approximate height of icon group (hi ~16px + icon ~24px at 1.5rem + lo ~16px)
const ICON_TRACK_H_BASE = 115 // matches .temp-wrap--icons height at S size
const BAR_TRACK_H_BASE  = 100 // matches .temp-wrap / .bar-track height at S size
const iconTrackH = computed(() => ICON_TRACK_H_BASE * (CHART_SIZE_MULT[layout.value.chartSize] ?? 1))
const barTrackH  = computed(() => BAR_TRACK_H_BASE  * (CHART_SIZE_MULT[layout.value.chartSize] ?? 1))

function iconGroupStyle(i) {
  const lo    = globalTempMin.value
  const hi    = globalTempMax.value
  const range = hi - lo || 1
  let ratio   // 0 = top of track (highest), 1 = bottom (lowest)
  if (FLOATING_BAR_TYPES.has(activeDataPoint.value)) {
    const val  = mainHi.value[i] ?? hi
    ratio = (hi - val) / range
  } else {
    const val    = mainHi.value[i] ?? 0
    const maxVal = globalMainMax.value || 1
    ratio = 1 - val / maxVal
  }
  // Clamp so icon group never clips outside the container
  const usable = iconTrackH.value - ICON_GROUP_H
  const topPx  = Math.max(0, Math.min(usable, ratio * usable))
  return { top: `${topPx}px` }
}

// ── Simple bottom-up bar (rain / wind / uv) ──────────────────────────────────

const globalMainMax = computed(() => {
  const vals = mainHi.value.filter(v => v != null)
  return vals.length ? Math.max(...vals) : 1
})

function barStyleSimple(i) {
  const val    = mainHi.value[i] ?? 0
  const maxVal = globalMainMax.value || 1
  const bg     = DATA_TYPES[activeDataPoint.value]?.color ?? DATA_TYPES.temperature.color
  const MIN_H = 26
  if (val === 0) return { bottom: '0', top: 'auto', height: '0px', background: bg }
  const ratio    = val / maxVal
  const heightPx = MIN_H + ratio * (barTrackH.value - MIN_H)
  return { bottom: '0', top: 'auto', height: `${heightPx}px`, background: bg }
}

// ── Vertical style — horizontal bars ─────────────────────────────────────────

// Floating bar (temperature / feelsLike): position + width within the global range
function hBarStyle(i) {
  const lo    = globalTempMin.value
  const hi    = globalTempMax.value
  const range = hi - lo || 1
  const hiSrc = activeDataPoint.value === 'feelsLike' ? feelsLikeMax.value : maxTemps.value
  const loSrc = activeDataPoint.value === 'feelsLike' ? feelsLikeMin.value : minTemps.value
  const dayMax = hiSrc[i] ?? hi
  const dayMin = loSrc[i] ?? lo
  const leftPct  = ((dayMin - lo) / range) * 100
  const widthPct = ((dayMax - dayMin) / range) * 100
  const bg = DATA_TYPES[activeDataPoint.value]?.color ?? DATA_TYPES.temperature.color
  return { left: `${leftPct}%`, width: `${Math.max(widthPct, 4)}%`, background: bg }
}

// Simple bottom-anchored bar (rain / wind / uv etc): fills from left proportional to value
function hBarStyleSimple(i) {
  const val    = mainHi.value[i] ?? 0
  const maxVal = globalMainMax.value || 1
  const bg     = DATA_TYPES[activeDataPoint.value]?.color ?? DATA_TYPES.temperature.color
  const widthPct = val === 0 ? 0 : Math.max((val / maxVal) * 100, 4)
  return { width: `${widthPct}%`, background: bg }
}

// ── Line chart ────────────────────────────────────────────────────────────────

const activeColor = computed(() => DATA_TYPES[activeDataPoint.value]?.color ?? '#f97316')

const dailyLinePoints = computed(() => {
  if (layout.value.chartStyle !== 'line') return []
  const lo    = globalTempMin.value
  const hi    = globalTempMax.value
  const range = hi - lo || 1
  const usable = iconTrackH.value - ICON_GROUP_H
  return displayDays.value.map((_, i) => {
    let ratio
    if (FLOATING_BAR_TYPES.has(activeDataPoint.value)) {
      const val = mainHi.value[i] ?? hi
      ratio = (hi - val) / range
    } else {
      const val    = mainHi.value[i] ?? 0
      const maxVal = globalMainMax.value || 1
      ratio = 1 - val / maxVal
    }
    const topPx = Math.max(0, Math.min(usable, ratio * usable))
    const cx = i * COL_WIDTH + COL_WIDTH / 2
    const cy = DAY_COL_TOP_OFFSET + topPx + ICON_GROUP_H / 2
    return `${cx},${cy}`
  })
})
</script>

<style scoped>
.daily-card {
  padding: 10px 12px;
}

.daily-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 5px;
}

.card-title-icon {
  display: flex;
  flex-shrink: 0;
  color: var(--text-muted);
}
.card-title-icon :deep(svg) {
  width: 16px;
  height: 16px;
}
.card-title-icon :deep(svg), .card-title-icon :deep(svg *) {
  stroke: currentColor;
  fill: none;
}

.daily-title {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
}

/* ── Forecast grid: sticky labels + scrollable days ── */
.forecast-grid {
  --h-day:  20px;
  --h-temp: 100px;
  --h-stat: 18px;
  display: flex;
  overflow: hidden;
  gap: 6px;
}

/* ── Sticky left labels column ────────────────────── */
.labels-col {
  flex-shrink: 0;
  display: none;
  flex-direction: column;
  align-items: center;
  padding-top: 6px; /* match day-col top padding */
  padding-right: 4px;
}

.lbl-day-row {
  height: var(--h-day);
  flex-shrink: 0;
}


.lbl-temp-row {
  height: var(--h-temp);
  flex-shrink: 0;
}

.lbl-stats-wrap {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-top: 6px;
  margin-top: 2px;
  width: 100%;
  align-items: center;
}

.lbl-stat-row {
  height: var(--h-stat);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* ── Scrollable days ──────────────────────────────── */
.days-scroll {
  flex: 1;
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}
.days-scroll::-webkit-scrollbar { display: none; }

.days-row {
  display: flex;
  zzzgap: 2px;
  min-width: 100%;
  position: relative;
}

/* ── Day column ───────────────────────────────────── */
.day-col {
  flex: 0 0 50px;
  width: 50px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 0 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
  position: relative;
  z-index: 2;
}
@media (hover: hover) {
  .day-col:hover {
    background: var(--card-hover);
  }
}

.daily-line-svg {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 1;
  overflow: visible;
}

/* ── Day label ────────────────────────────────────── */
.day-lbl {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  font-size: 0.8rem;
  color: var(--text-faint);
  text-align: center;
  flex-shrink: 0;
  height: 26px;
  margin-bottom: 4px;
  line-height: 1.1;
}

.days-row--with-dates .day-lbl {
  height: 36px;
}

.day-num {
  font-size: 0.65rem;
  color: var(--text-faint);
  line-height: 1;
}

/* ── Condition icon (now inside stats, first stat-row) ── */
.wx-icon {
  height: var(--h-stat);
  font-size: 1rem;
  line-height: 1;
  margin-bottom: 5px;
}

/* ── Temperature section ──────────────────────────── */
.temp-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  flex-shrink: 0;
  height: calc(100px * var(--chart-size-mult, 1));
  overflow: hidden;
}



/* ── Icons chart style ────────────────────────────── */
.temp-wrap--icons {
  position: relative;
  overflow: visible;
  height: calc(115px * var(--chart-size-mult, 1)); /* icons/line mode uses its own track height */
}

.icon-float-group {
  position: absolute;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}

.wx-float-icon {
  font-size: 1.5rem;
  line-height: 1;
  flex-shrink: 0;
}

.icon-val-hi {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text);
  line-height: 1.2;
}

.wind-val-hi {
  display: flex;
  align-items: center;
  gap: 2px;
}

.icon-val-lo {
  font-size: 0.8rem;
  color: var(--text-muted);
  line-height: 1.2;
}

.bar-track {
  position: relative;
  width: calc(100% - 8px);
  height: calc(100px * var(--chart-size-mult, 1));
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
}

.bar-fill {
  position: absolute;
  left: 0;
  right: 0;
  border-radius: 6px;
  min-height: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 3px;
  overflow: hidden;
}

.bar-fill--floating {
  border-radius: 6px;
}

.t-val-inside {
  color: #fff;
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}

.t-wind-val {
  display: flex;
  align-items: center;
  gap: 2px;
}

.t-hi--float {
  position: absolute;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text);
  line-height: 1;
}

.t-lo--float {
  position: absolute;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 0.8rem;
  color: var(--text-muted);
  line-height: 1;
  padding-top: 1px;
}

/* ── Stats section ────────────────────────────────── */
.stats {
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 100%;
  padding-top: 6px;
  margin-top: 4px;
}

.stat-row {
  height: var(--h-stat);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 0.8rem;
  color: var(--text-muted);
  white-space: nowrap;
}

/* Wind direction arrow (inline, smaller than the label icon) */
.wind-dir-arrow {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.wind-dir-arrow svg {
  width: 10px;
  height: 10px;
}

/* Shared icon sizing for labels col */
.stat-icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.stat-icon :deep(svg) {
  width: 14px;
  height: 14px;
}
.wx-icon {
  font-size: 1.5rem;
}

/* ── Vertical list style ──────────────────────────── */
.vertical-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.vertical-list--titled {
  margin-top: -25px;
}

.vrow {
  display: grid;
  grid-template-columns: 52px 28px 1fr 44px;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}

@media (hover: hover) {
  .vrow:hover {
    background: var(--card-hover);
  }
}

.vrow-day {
  font-size: 0.8rem;
  color: var(--text-faint);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.vrow-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  line-height: 1;
}

.vrow-bar-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.vbar-lo,
.vbar-hi,
.vbar-val {
  font-size: 0.8rem;
  color: var(--text-muted);
  white-space: nowrap;
  flex-shrink: 0;
  min-width: 22px;
  text-align: right;
}

.vbar-hi {
  text-align: left;
  font-weight: 600;
  color: var(--text);
}

.vbar-track {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: var(--card-hover);
  position: relative;
  overflow: hidden;
  min-width: 20px;
}

.vbar-fill {
  position: absolute;
  top: 0;
  height: 100%;
  border-radius: 4px;
}

.vbar-fill--simple {
  left: 0;
}

.vrow-header {
  cursor: default;
  padding-top: 0;
  padding-bottom: 0;
}
@media (hover: hover) {
  .vrow-header:hover {
    background: transparent;
  }
}

.vrow-extra-hdr {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
.vrow-extra-hdr :deep(svg) {
  width: 13px;
  height: 13px;
  opacity: 0.7;
}
.vrow-extra-hdr :deep(svg), .vrow-extra-hdr :deep(svg *) {
  stroke: currentColor;
  fill: none;
}

.vrow-extra {
  font-size: 0.8rem;
  white-space: nowrap;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
}

/* ── Show scrollbar on non-touch devices ──────────── */
@media (hover: hover) and (pointer: fine) {
  .days-scroll {
    scrollbar-width: thin;
    scrollbar-color: var(--card-border) transparent;
  }
  .days-scroll::-webkit-scrollbar { display: block; height: 4px; }
  .days-scroll::-webkit-scrollbar-thumb { background: var(--card-border); border-radius: 2px; }
  .days-scroll::-webkit-scrollbar-track { background: transparent; }
}

/* ── Responsive ───────────────────────────────────── */
@media (max-width: 1000px) {
  .daily-card {
    padding: 8px 10px 10px;
  }
}
</style>
