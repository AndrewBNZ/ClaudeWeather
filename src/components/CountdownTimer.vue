<template>
  <span v-if="text" class="countdown-timer">{{ text }}</span>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  fetchedAt: { type: Number, default: null },  // ms timestamp
  staleMs:   { type: Number, required: true },
})

const now = ref(Date.now())
let timer = null
onMounted(()       => { timer = setInterval(() => { now.value = Date.now() }, 10000) })
onBeforeUnmount(() => clearInterval(timer))

const text = computed(() => {
  if (!props.fetchedAt) return ''
  const remaining = Math.max(0, props.fetchedAt + props.staleMs - now.value)
  if (remaining === 0) return ''
  const totalSecs = Math.ceil(remaining / 1000)
  const m = Math.floor(totalSecs / 60)
  const s = totalSecs % 60
  return `${m}:${String(s).padStart(2, '0')}`
})
</script>
