<template>
  <div class="settings-group">
    <button
      v-for="set in ICON_SETS"
      :key="set.id"
      class="setting-row icon-set-row"
      :class="{ 'icon-set-row--active': iconSet === set.id }"
      @click="iconSet = set.id"
    >
      <div class="icon-set-info">
        <div class="setting-label">{{ set.label }}</div>
        <div class="icon-set-preview">
          <template v-for="(icon, i) in previewIcons(set.id)" :key="i">
            <img v-if="icon.type === 'img'" :src="icon.src" alt="" class="preview-icon preview-icon--img" />
            <span v-else class="preview-icon preview-icon--emoji">{{ icon.value }}</span>
          </template>
        </div>
      </div>
      <svg v-if="iconSet === set.id" class="check-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    </button>
  </div>
</template>

<script setup>
import { useSettings } from '../../composables/useSettings.js'
import { ICON_SETS, resolveIcon } from '../../utils/weatherIconSets.js'

const { iconSet } = useSettings()

// Representative codes: clear, partly cloudy, rain, snow, thunderstorm
const PREVIEW_CODES = [0, 2, 63, 73, 95]

function previewIcons(setId) {
  return PREVIEW_CODES.map(code => resolveIcon(code, setId, true))
}
</script>

<style scoped>
.icon-set-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  text-align: left;
  cursor: pointer;
}

.icon-set-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.icon-set-preview {
  display: flex;
  align-items: center;
  gap: 6px;
}

.preview-icon--emoji {
  font-size: 1.5rem;
  line-height: 1;
}

.preview-icon--img {
  width: 1.5rem;
  height: 1.5rem;
  object-fit: contain;
}

.check-icon {
  color: var(--accent, #4a9eff);
  flex-shrink: 0;
}
</style>
