<template>
  <RadarMap
    :lat="lat"
    :lng="lng"
    :theme="theme"
    :time-format="timeFormat"
  />
</template>

<script setup>
import RadarMap from '../components/RadarMap.vue'

defineProps({
  lat:        { type: Number, default: 0 },
  lng:        { type: Number, default: 0 },
  theme:      { type: String, default: 'dark' },
  timeFormat: { type: String, default: '12h' },
})
</script>
