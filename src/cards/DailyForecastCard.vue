<template>
  <DailyChart
    :daily="daily"
    :hourly="hourly"
    :active-type="activeType"
    :unit-prefs="unitPrefs"
    :selected-day="selectedDay"
    :theme="theme"
    :utc-offset="utcOffset"
    :show-summary="true"
    :silent-refresh="false"
    @day-selected="emit('day-selected', $event)"
    @open-units-modal="() => {}"
  />
</template>

<script setup>
import DailyChart from '../components/DailyChart.vue'

defineProps({
  daily:      { type: Object, default: null },
  hourly:     { type: Object, default: null },
  activeType: { type: String, default: 'temperature' },
  unitPrefs:  { type: Object, required: true },
  selectedDay:{ type: Number, default: 0 },
  theme:      { type: String, default: 'dark' },
  utcOffset:  { type: Number, default: 0 },
})

const emit = defineEmits(['day-selected'])
</script>
