<template>
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
    <div class="setting-row">
      <div>
        <div class="setting-label">Condition icons</div>
      </div>
      <button class="toggle-switch" :class="{ on: layout.showConditions }" @click="layout.showConditions = !layout.showConditions">
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
        <button :class="['unit-pill-opt', { active: layout.chartStyle === 'line' }]"    @click="layout.chartStyle = 'line'">Line</button>
        <button v-if="type === 'daily'" :class="['unit-pill-opt', { active: layout.chartStyle === 'vertical' }]" @click="layout.chartStyle = 'vertical'">Vertical</button>
      </div>
    </div>
    <div v-if="type === 'daily'" class="setting-row setting-row--col">
      <div class="setting-label">Days</div>
      <div class="unit-pill">
        <button :class="['unit-pill-opt', { active: layout.numDays === 3 }]"    @click="layout.numDays = 3">3</button>
        <button :class="['unit-pill-opt', { active: layout.numDays === 7 }]"    @click="layout.numDays = 7">7</button>
        <button :class="['unit-pill-opt', { active: layout.numDays === 14 }]"   @click="layout.numDays = 14">14</button>
        <button :class="['unit-pill-opt', { active: layout.numDays === null }]" @click="layout.numDays = null">All</button>
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

const props = defineProps({
  type: { type: String, required: true }, // 'daily' | 'hourly' | 'combined'
})
defineEmits(['navigate'])

const {
  dailyForecastLayout, hourlyForecastLayout, combinedForecastLayout,
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
