<template>
  <!-- Live preview -->
  <div v-if="weather" class="fs-preview-label">Preview</div>
  <div v-if="weather" class="fs-preview">
    <HourlyForecastCard
      v-if="type === 'hourly'"
      :hourly="weather.hourly"
      :daily="weather.daily"
      :unit-prefs="unitPrefs"
      :selected-day="0"
      :utc-offset="weather.utc_offset_seconds ?? 0"
      :time-format="timeFormat"
      :hourly-forecast-layout="hourlyForecastLayout"
      :forecast-data-point="null"
    />
    <CombinedForecastCard
      v-else-if="type === 'combined'"
      :daily="weather.daily"
      :hourly="weather.hourly"
      :unit-prefs="unitPrefs"
      :selected-day="0"
      :utc-offset="weather.utc_offset_seconds ?? 0"
      :time-format="timeFormat"
      :combined-forecast-layout="combinedForecastLayout"
      :forecast-data-point="null"
    />
    <DailyForecastCard
      v-else
      :daily="weather.daily"
      :hourly="weather.hourly"
      :unit-prefs="unitPrefs"
      :selected-day="0"
      :utc-offset="weather.utc_offset_seconds ?? 0"
      :daily-forecast-layout="dailyForecastLayout"
      :forecast-data-point="null"
    />
  </div>

  <div class="settings-group">
    <div class="setting-row">
      <div>
        <div class="setting-label">Title</div>
      </div>
      <button class="toggle-switch" :class="{ on: layout.showTitle }" @click="layout.showTitle = !layout.showTitle">
        <span class="toggle-thumb" />
      </button>
    </div>
    <div v-if="type === 'daily'" class="setting-row">
      <div>
        <div class="setting-label">Dates</div>
      </div>
      <button class="toggle-switch" :class="{ on: layout.showDate }" @click="layout.showDate = !layout.showDate">
        <span class="toggle-thumb" />
      </button>
    </div>
    <div v-if="type === 'hourly' || type === 'combined'" class="setting-row">
      <div>
        <div class="setting-label">Sunrise &amp; sunset</div>
      </div>
      <button class="toggle-switch" :class="{ on: layout.showSunriseSunset }" @click="layout.showSunriseSunset = !layout.showSunriseSunset">
        <span class="toggle-thumb" />
      </button>
    </div>
    </div>
   <div class="settings-group">
    <div class="setting-row setting-row--col">
      <div class="setting-label">Chart style</div>
      <div class="unit-pill">
        <button :class="['unit-pill-opt', { active: layout.chartStyle === 'bar' }]"      @click="layout.chartStyle = 'bar'">Bars</button>
        <button :class="['unit-pill-opt', { active: layout.chartStyle === 'icons' }]"   @click="layout.chartStyle = 'icons'">Icons</button>
        <button :class="['unit-pill-opt', { active: layout.chartStyle === 'strip' }]"   @click="layout.chartStyle = 'strip'">Strip</button>
        <button :class="['unit-pill-opt', { active: layout.chartStyle === 'line' }]"    @click="layout.chartStyle = 'line'">Line</button>
        <button v-if="type === 'daily'" :class="['unit-pill-opt', { active: layout.chartStyle === 'vertical' }]" @click="layout.chartStyle = 'vertical'">Vertical</button>
      </div>
    </div>
    <div v-if="layout.chartStyle !== 'vertical' && layout.chartStyle !== 'strip'" class="setting-row setting-row--col">
      <div class="setting-label">Size</div>
      <div class="unit-pill">
        <button :class="['unit-pill-opt', { active: layout.chartSize === 'S' }]"  @click="layout.chartSize = 'S'">S</button>
        <button :class="['unit-pill-opt', { active: layout.chartSize === 'M' }]"  @click="layout.chartSize = 'M'">M</button>
        <button :class="['unit-pill-opt', { active: layout.chartSize === 'L' }]"  @click="layout.chartSize = 'L'">L</button>
      </div>
    </div>
    <div v-if="type === 'daily' || type === 'combined'" class="setting-row setting-row--col">
      <div class="setting-label">{{ type === 'combined' ? 'Days in strip' : 'Days' }}</div>
      <div class="unit-pill">
        <button :class="['unit-pill-opt', { active: layout.numDays === 3 }]"    @click="layout.numDays = 3">3</button>
        <button :class="['unit-pill-opt', { active: layout.numDays === 7 }]"    @click="layout.numDays = 7">7</button>
        <button :class="['unit-pill-opt', { active: layout.numDays === 14 }]"   @click="layout.numDays = 14">14</button>
        <button v-if="type === 'daily'" :class="['unit-pill-opt', { active: layout.numDays === null }]" @click="layout.numDays = null">All</button>
      </div>
    </div>
    <div class="setting-row">
      <div>
        <div class="setting-label">Data point picker</div>
        <div class="setting-hint">Enables quick data type switching</div>
      </div>
      <button class="toggle-switch" :class="{ on: layout.showDataPointPicker }" @click="layout.showDataPointPicker = !layout.showDataPointPicker">
        <span class="toggle-thumb" />
      </button>
    </div>
    <div class="setting-row setting-row--col">
      <div>
        <div class="setting-label">Chart data point</div>
      </div>
      <div class="slot-scroll" ref="mainScrollEl"><div class="data-point-grid">
        <button
          v-for="opt in mainOptions"
          :key="opt.type"
          :class="['data-point-opt', { active: layout.mainDataPoint === opt.type }]"
          @click="setMainDataPoint(opt.type)"
        ><span class="tile-svg-icon" v-html="TILE_ICONS[opt.iconKey]"></span>{{ opt.label }}</button>
      </div></div>
    </div>
  </div>
  <div class="settings-group">
    <button class="setting-row setting-row--nav" @click="$emit('navigate', type === 'daily' ? 'dailyOtherPoints' : type === 'combined' ? 'combinedOtherPoints' : 'hourlyOtherPoints')">
      <div>
        <div class="setting-label">Other data points</div>
        <div class="setting-hint">Show additional data on the chart and picker</div>
      </div>
      <svg class="setting-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useSettings, MAIN_DATA_POINT_OPTIONS, HOURLY_MAIN_DATA_POINT_OPTIONS } from '../../composables/useSettings.js'
import { TILE_ICONS } from '../../utils/tileIcons.js'
import HourlyForecastCard    from '../../cards/HourlyForecastCard.vue'
import DailyForecastCard     from '../../cards/DailyForecastCard.vue'
import CombinedForecastCard  from '../../cards/CombinedForecastCard.vue'

const props = defineProps({
  type:      { type: String, required: true }, // 'daily' | 'hourly' | 'combined'
  weather:   { type: Object, default: null },
  unitPrefs: { type: Object, default: null },
})
defineEmits(['navigate'])

const {
  dailyForecastLayout, hourlyForecastLayout, combinedForecastLayout, timeFormat,
  setDailyMainDataPoint, setHourlyMainDataPoint, setCombinedMainDataPoint,
} = useSettings()

const layout = computed(() => {
  if (props.type === 'daily')    return dailyForecastLayout.value
  if (props.type === 'combined') return combinedForecastLayout.value
  return hourlyForecastLayout.value
})

const mainOptions = computed(() =>
  props.type === 'daily' ? MAIN_DATA_POINT_OPTIONS : HOURLY_MAIN_DATA_POINT_OPTIONS
)

const setMainDataPoint = computed(() => {
  if (props.type === 'daily')    return setDailyMainDataPoint
  if (props.type === 'combined') return setCombinedMainDataPoint
  return setHourlyMainDataPoint
})

const mainScrollEl = ref(null)

onMounted(async () => {
  await nextTick()
  const el = mainScrollEl.value
  if (!el) return
  const active = el.querySelector('.data-point-opt.active')
  if (!active) return
  el.scrollLeft = active.offsetLeft + active.offsetWidth / 2 - el.offsetWidth / 2
})
</script>

<style scoped>
.fs-preview-label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-faint);
  padding: 0 4px;
}

.fs-preview {
  background: var(--card);
  border-radius: 12px;
  pointer-events: none;
  border: 2px dashed rgba(0,0,0,0.15);
}

.fs-preview :deep(.card) {
  border-radius: 0;
  box-shadow: none;
  background: transparent;
}

.slot-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  overscroll-behavior-x: contain;
  touch-action: pan-x;
}
.slot-scroll::-webkit-scrollbar { display: none; }
.slot-scroll :deep(.data-point-grid) {
  flex-wrap: nowrap;
  align-items: center;
  padding-bottom: 2px;
}
.slot-scroll :deep(.data-point-opt) {
  flex-shrink: 0;
  white-space: nowrap;
}
</style>
