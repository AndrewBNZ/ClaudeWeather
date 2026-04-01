<template>
  <!-- Show when -->
  <div class="setting-row">
    <div>
      <div class="setting-label">Show card</div>
      <div class="setting-hint">When to display the Weather Warnings card</div>
    </div>
  </div>
  <div class="setting-row setting-row--col" style="padding-top: 0;">
    <div class="show-mode-options">
      <button
        class="show-mode-btn"
        :class="{ active: warningsConfig.show === 'always' }"
        @click="warningsConfig.show = 'always'"
      >Always</button>
      <button
        class="show-mode-btn"
        :class="{ active: warningsConfig.show === 'active-only' }"
        @click="warningsConfig.show = 'active-only'"
      >Only when active alert</button>
    </div>
  </div>

  <!-- Feed / country override -->
  <div class="setting-row" style="border-bottom: none;">
    <div>
      <div class="setting-label">Feed</div>
      <div class="setting-hint">
        <template v-if="!showCustomUrl">
          {{ autoLabel }}
        </template>
        <template v-else>
          Custom RSS/Atom feed URL
        </template>
      </div>
    </div>
  </div>
  <div class="setting-row setting-row--col" style="padding-top: 0; border-bottom: none;">
    <div class="feed-options">
      <button
        v-for="opt in feedOptions"
        :key="opt.value"
        class="show-mode-btn"
        :class="{ active: selectedFeed === opt.value }"
        @click="selectFeed(opt.value)"
      >{{ opt.label }}</button>
    </div>
    <div v-if="showCustomUrl" class="custom-url-wrap">
      <input
        v-model="customUrl"
        class="custom-url-input"
        type="url"
        placeholder="https://…/alerts.rss"
        @blur="applyCustomUrl"
        @keydown.enter="applyCustomUrl"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { CAP_FEEDS } from '../../services/capAlerts.js'
import { useSettings } from '../../composables/useSettings.js'

const props = defineProps({
  locationCountry: { type: String, default: null },
})

const { warningsConfig } = useSettings()

// Build feed option list: Auto + one per registered country + Custom
const feedOptions = computed(() => {
  const opts = [{ value: 'auto', label: 'Auto' }]
  for (const [country, feed] of Object.entries(CAP_FEEDS)) {
    opts.push({ value: country, label: feed.name })
  }
  opts.push({ value: 'custom', label: 'Custom URL' })
  return opts
})

// Which option is currently selected
const selectedFeed = computed(() => {
  const override = warningsConfig.value.feedOverride
  if (!override) return 'auto'
  // Check if it matches a known country entry
  for (const [country, feed] of Object.entries(CAP_FEEDS)) {
    if (override === feed.rssUrl) return country
  }
  return 'custom'
})

const showCustomUrl = computed(() => selectedFeed.value === 'custom')

const autoLabel = computed(() => {
  if (props.locationCountry && CAP_FEEDS[props.locationCountry]) {
    return `Auto — using ${CAP_FEEDS[props.locationCountry].name} (${props.locationCountry})`
  }
  if (props.locationCountry) {
    return `Auto — no feed configured for ${props.locationCountry}`
  }
  return 'Auto — country not yet detected'
})

const customUrl = ref(
  selectedFeed.value === 'custom' ? (warningsConfig.value.feedOverride ?? '') : ''
)

function selectFeed(value) {
  if (value === 'auto') {
    warningsConfig.value = { ...warningsConfig.value, feedOverride: null }
  } else if (value === 'custom') {
    // Just switch to custom mode; URL applied on blur/enter
    if (selectedFeed.value !== 'custom') customUrl.value = ''
  } else {
    // A named country entry — store its rssUrl as override
    warningsConfig.value = { ...warningsConfig.value, feedOverride: CAP_FEEDS[value].rssUrl }
  }
}

function applyCustomUrl() {
  const url = customUrl.value.trim()
  warningsConfig.value = { ...warningsConfig.value, feedOverride: url || null }
}
</script>

<style scoped>
.show-mode-options,
.feed-options {
  display:   flex;
  flex-wrap: wrap;
  gap:       0.4rem;
  width:     100%;
}

.show-mode-btn {
  padding:       0.3rem 0.75rem;
  border-radius: 0.5rem;
  border:        1px solid rgba(255,255,255,0.15);
  background:    transparent;
  color:         inherit;
  font-size:     0.82rem;
  cursor:        pointer;
  transition:    background 0.15s, border-color 0.15s;
}
.show-mode-btn.active {
  background:   rgba(255,255,255,0.15);
  border-color: rgba(255,255,255,0.4);
}

.custom-url-wrap {
  width:      100%;
  margin-top: 0.5rem;
}
.custom-url-input {
  width:         100%;
  padding:       0.4rem 0.6rem;
  border-radius: 0.4rem;
  border:        1px solid rgba(255,255,255,0.2);
  background:    rgba(255,255,255,0.06);
  color:         inherit;
  font-size:     0.82rem;
  box-sizing:    border-box;
}
.custom-url-input::placeholder { opacity: 0.4; }
</style>
