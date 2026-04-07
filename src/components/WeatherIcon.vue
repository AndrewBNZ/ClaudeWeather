<template>
  <img
    v-if="icon.type === 'img'"
    class="weather-icon"
    :src="icon.src"
    :alt="label"
  />
  <span v-else class="weather-icon weather-icon--emoji">{{ icon.value }}</span>
</template>

<script setup>
import { computed } from 'vue'
import { resolveIcon } from '../utils/weatherIconSets.js'
import { getWeatherInfo } from '../utils/weatherCodes.js'
import { useSettings } from '../composables/useSettings.js'

const props = defineProps({
  code:  { type: Number, default: null },
  isDay: { type: Boolean, default: true },
})

const { iconSet } = useSettings()

const icon  = computed(() => resolveIcon(props.code, iconSet.value, props.isDay))
const label = computed(() => getWeatherInfo(props.code)?.label ?? 'Weather')
</script>

<style scoped>
.weather-icon {
  display: inline-block;
  line-height: 1;
}

/* img icons scale to match the parent's font-size so callers control size
   by setting font-size on the parent element (same as emoji) */
img.weather-icon {
  width: 1em;
  height: 1em;
  object-fit: contain;
  vertical-align: middle;
}
</style>
