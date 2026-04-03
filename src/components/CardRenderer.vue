<template>
  <component
    :is="cardComponent"
    v-bind="{ ...cardProps, ...pressHandlers }"
    v-on="cardEvents"
  />
</template>

<script setup>
import { computed } from 'vue'
import { CARD_REGISTRY } from '../cards/cardRegistry.js'
import { CARD_SETTINGS_REGISTRY } from '../cards/cardSettingsRegistry.js'
import { useCardPress } from '../composables/useCardPress.js'

const props = defineProps({
  cardType:     { type: String,  required: true },
  weather:      { type: Object,  default: null },
  mergedCurrent:{ type: Object,  default: null },
  unitPrefs:    { type: Object,  required: true },
  selectedDay:  { type: Number,  default: 0 },
  utcOffset:    { type: Number,  default: 0 },
  theme:        { type: String,  default: 'dark' },
  timeFormat:   { type: String,  default: '12h' },
  activeType:   { type: String,  default: 'temperature' },
  tileConfig:   { type: Array,   default: null },
  showSim:      { type: Boolean, default: false },
  showFireworks:{ type: Boolean, default: false },
  lat:          { type: Number,  default: 0 },
  lng:          { type: Number,  default: 0 },
  pwsName:      { type: String,  default: null },
  pwsDataActive:{ type: Boolean, default: false },
  updatedAt:    { type: String,  default: '' },
  fetchedAt:    { type: Number,  default: null },
  staleMs:      { type: Number,  default: 0 },
  loading:      { type: Boolean, default: false },
  canManualRefresh: { type: Boolean, default: true },
  modelLabel:          { type: String,  default: '' },
  dailyForecastLayout:  { type: Object,  default: null },
  hourlyForecastLayout: { type: Object,  default: null },
  forecastDataPoint:    { type: String,  default: null },
  warningsConfig:       { type: Object,  default: null },
  locationCountry:      { type: String,  default: null },
  customAlertsConfig:   { type: Object,  default: null },
  customAlertResults:   { type: Object,  default: null },
  focusHour:            { type: Number,  default: null },
})

const emit = defineEmits([
  'select', 'grass-color', 'open-locations', 'open-settings',
  'open-data-types', 'open-model-modal', 'refresh', 'day-selected',
  'open-card-settings', 'forecast-data-point', 'scroll-to-hour', 'open-alert-editor',
])

const cardComponent = computed(() => CARD_REGISTRY[props.cardType])

const cardProps = computed(() => ({
  data:           props.mergedCurrent,
  daily:          props.weather?.daily ?? null,
  hourly:         props.weather?.hourly ?? null,
  unitPrefs:      props.unitPrefs,
  selectedDay:    props.selectedDay,
  utcOffset:      props.utcOffset,
  theme:          props.theme,
  timeFormat:     props.timeFormat,
  activeType:     props.activeType,
  tileConfig:     props.tileConfig,
  showSim:        props.showSim,
  showFireworks:  props.showFireworks,
  lat:            props.lat,
  lng:            props.lng,
  pwsName:        props.pwsName,
  pwsDataActive:  props.pwsDataActive,
  updatedAt:      props.updatedAt,
  fetchedAt:      props.fetchedAt,
  staleMs:        props.staleMs,
  loading:        props.loading,
  canManualRefresh: props.canManualRefresh,
  modelLabel:          props.modelLabel,
  dailyForecastLayout:  props.dailyForecastLayout,
  hourlyForecastLayout: props.hourlyForecastLayout,
  forecastDataPoint:    props.forecastDataPoint,
  warningsConfig:       props.warningsConfig,
  locationCountry:      props.locationCountry,
  customAlertsConfig:   props.customAlertsConfig,
  customAlertResults:   props.customAlertResults,
  focusHour:            props.focusHour,
}))

const cardEvents = computed(() => ({
  select:           (v) => emit('select', v),
  'grass-color':    (v) => emit('grass-color', v),
  'open-locations': ()  => emit('open-locations'),
  'open-settings':  ()  => emit('open-settings'),
  'open-data-types':()  => emit('open-data-types'),
  'open-model-modal':() => emit('open-model-modal'),
  refresh:          ()  => emit('refresh'),
  'day-selected':   (v) => emit('day-selected', v),
  'forecast-data-point': (v) => emit('forecast-data-point', v),
  'scroll-to-hour':      (v) => emit('scroll-to-hour', v),
  'open-alert-editor':   (v) => emit('open-alert-editor', v),
}))

// Long-press (touch) + right-click opens card settings when available
const pressHandlers = useCardPress(() => {
  if (CARD_SETTINGS_REGISTRY[props.cardType]) emit('open-card-settings', props.cardType)
})
</script>
