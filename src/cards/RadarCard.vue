<template>
  <div v-bind="$attrs" style="display:contents">
    <RadarMap
      :lat="lat"
      :lng="lng"
      :theme="theme"
      :time-format="timeFormat"
      :alerts="showWarnings ? alerts : []"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import RadarMap from '../components/RadarMap.vue'

defineOptions({ inheritAttrs: false })
import { fetchAlerts } from '../services/capAlerts.js'
import { useSettings } from '../composables/useSettings.js'

const props = defineProps({
  lat:             { type: Number, default: 0 },
  lng:             { type: Number, default: 0 },
  theme:           { type: String, default: 'dark' },
  timeFormat:      { type: String, default: '12h' },
  locationCountry: { type: String, default: null },
  warningsConfig:  { type: Object, default: null },
})

const { radarConfig } = useSettings()
const showWarnings = computed(() => radarConfig.value.showWarnings ?? true)

const alerts = ref([])

async function load() {
  if (!showWarnings.value) return
  const feedOverride = props.warningsConfig?.feedOverride ?? null
  const { alerts: fetched } = await fetchAlerts(props.locationCountry, feedOverride)
  alerts.value = fetched
}

watch([showWarnings, () => props.locationCountry, () => props.warningsConfig?.feedOverride], load)

let refreshTimer = null
onMounted(() => {
  load()
  refreshTimer = setInterval(load, 15 * 60 * 1000)
})
onUnmounted(() => clearInterval(refreshTimer))
</script>
