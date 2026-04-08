<template>
  <div class="settings-group">
    <!-- Show title -->
    <div class="setting-row">
      <div class="setting-label">Title</div>
      <button
        class="toggle-switch"
        :class="{ on: warningsConfig.showTitle ?? true }"
        @click="warningsConfig.showTitle = !(warningsConfig.showTitle ?? true)"
      ><span class="toggle-thumb" /></button>
    </div>

    <!-- Show when -->
    <div class="setting-row setting-row--col">
      <div class="setting-label">Show this card</div>
      <div class="unit-pill">
        <button :class="['unit-pill-opt', { active: warningsConfig.show === 'always' }]"      @click="warningsConfig.show = 'always'">Always</button>
        <button :class="['unit-pill-opt', { active: warningsConfig.show === 'active-only' }]" @click="warningsConfig.show = 'active-only'">If a warning exists</button>
      </div>
    </div>

    <!-- Location filter -->
    <div class="setting-row setting-row--col">
      <div class="setting-label">Show warnings for</div>
      <div class="unit-pill">
        <button :class="['unit-pill-opt', { active: (warningsConfig.locationFilter ?? 'location') === 'location' }]" @click="warningsConfig.locationFilter = 'location'">Selected location</button>
        <button :class="['unit-pill-opt', { active: warningsConfig.locationFilter === 'all' }]"                      @click="warningsConfig.locationFilter = 'all'">Everywhere</button>
      </div>
    </div>

    <!-- Feed / country override -->
    <div class="setting-row setting-row--col">
      <div>
        <div class="setting-label">Source</div>
        <div class="setting-hint">
          <template v-if="!showCustomUrl">{{ autoLabel }}</template>
          <template v-else>Custom RSS/Atom feed URL</template>
        </div>
      </div>
      <div class="unit-pill feed-pill">
        <button
          v-for="opt in feedOptions"
          :key="opt.value"
          :class="['unit-pill-opt', { active: selectedFeed === opt.value }]"
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
  if (override === null || override === undefined) return 'auto'
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
    if (selectedFeed.value !== 'custom') {
      customUrl.value = ''
      warningsConfig.value = { ...warningsConfig.value, feedOverride: '' }
    }
  } else {
    // A named country entry — store its rssUrl as override
    warningsConfig.value = { ...warningsConfig.value, feedOverride: CAP_FEEDS[value].rssUrl }
  }
}

function applyCustomUrl() {
  const url = customUrl.value.trim()
  warningsConfig.value = { ...warningsConfig.value, feedOverride: url }
}
</script>

<style scoped>
.feed-pill {
  border-radius: 10px;
  flex-wrap:     wrap;
  height:        auto;
}

.feed-pill .unit-pill-opt { flex: 1 1 auto; text-align: center; }

.custom-url-wrap {
  width:      100%;
  margin-top: 0.5rem;
}
.custom-url-input {
  width:         100%;
  padding:       0.4rem 0.6rem;
  border-radius: 0.4rem;
  border:        1px solid var(--btn-border);
  background:    var(--input-bg);
  color:         var(--text);
  font-size:     0.82rem;
  box-sizing:    border-box;
}
.custom-url-input::placeholder { color: var(--text-faint); }
</style>
