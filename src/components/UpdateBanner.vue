<template>
  <!-- Update available banner -->
  <Transition name="update-banner">
    <div v-if="needRefresh" class="update-banner" role="status">
      <span class="update-banner-text">Update available</span>
      <button class="update-banner-btn" @click="doUpdate">Update now</button>
      <button class="update-banner-dismiss" @click="needRefresh = false" aria-label="Dismiss">✕</button>
    </div>
  </Transition>

  <!-- What's New modal -->
  <Transition name="modal-fade">
    <div v-if="showWhatsNew" class="modal-overlay" @click.self="showWhatsNew = false">
      <div class="whats-new-modal">
        <div class="whats-new-header">
          <span class="whats-new-title">What's New</span>
        </div>
        <div class="whats-new-scroll">
          <template v-for="group in newEntries" :key="group.version">
            <div class="whats-new-version-label">v{{ group.version }}</div>
            <ul class="whats-new-list">
              <li v-for="(entry, i) in group.entries" :key="i">{{ entry }}</li>
            </ul>
          </template>
        </div>
        <button class="whats-new-close" @click="showWhatsNew = false">Got it</button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import changelog from '../changelog.js'
import { APP_STORAGE_PREFIX } from '../config.js'
import { showWhatsNew } from '../composables/useWhatsNew.js'

const VERSION_KEY = `${APP_STORAGE_PREFIX}-version`
const currentVersion = __APP_VERSION__

const { needRefresh, updateServiceWorker } = useRegisterSW()

function doUpdate() {
  updateServiceWorker(true)
}

function semverGt(a, b) {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return true
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return false
  }
  return false
}

const lastSeenVersion = ref(null)

// All changelog entries newer than the last seen version, newest first.
// Falls back to current version when already up to date (e.g. opened from settings).
const newEntries = computed(() => {
  if (lastSeenVersion.value && lastSeenVersion.value !== currentVersion) {
    return changelog.filter(e => semverGt(e.version, lastSeenVersion.value))
  }
  return changelog.filter(e => e.version === currentVersion)
})

onMounted(() => {
  const stored = localStorage.getItem(VERSION_KEY)
  lastSeenVersion.value = stored
  if (stored && stored !== currentVersion) {
    const hasEntries = changelog.some(e => semverGt(e.version, stored))
    if (hasEntries) showWhatsNew.value = true
  }
  try { localStorage.setItem(VERSION_KEY, currentVersion) } catch {}
})
</script>

<style scoped>
/* ── Update banner ───────────────────────────────────────────────────────── */
.update-banner {
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9000;
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(10, 18, 32, 0.88);
  border: 1px solid rgba(56, 189, 248, 0.45);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-radius: 12px;
  padding: 10px 14px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.88rem;
  white-space: nowrap;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
}

.update-banner-text {
  color: rgba(255, 255, 255, 0.75);
}

.update-banner-btn {
  background: rgba(56, 189, 248, 0.2);
  border: 1px solid rgba(56, 189, 248, 0.55);
  color: rgb(56, 189, 248);
  border-radius: 8px;
  padding: 4px 12px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.15s;
}
.update-banner-btn:hover {
  background: rgba(56, 189, 248, 0.32);
}

.update-banner-dismiss {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.8rem;
  cursor: pointer;
  padding: 2px 4px;
  line-height: 1;
  transition: color 0.15s;
}
.update-banner-dismiss:hover {
  color: rgba(255, 255, 255, 0.7);
}

.update-banner-enter-from,
.update-banner-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(12px);
}
.update-banner-enter-active,
.update-banner-leave-active {
  transition: opacity 0.25s, transform 0.25s;
}

/* ── What's New modal ────────────────────────────────────────────────────── */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9100;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.whats-new-modal {
  background: rgba(12, 22, 38, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 24px;
  width: 100%;
  max-width: 360px;
  max-height: 80dvh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
}

.whats-new-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.whats-new-title {
  font-size: 1.15rem;
  font-weight: 600;
  color: #fff;
}

.whats-new-scroll {
  overflow-y: auto;
  flex: 1;
  margin-bottom: 20px;
  scrollbar-width: none;
}
.whats-new-scroll::-webkit-scrollbar { display: none; }

.whats-new-version-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: rgba(56, 189, 248, 0.85);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 8px;
}
.whats-new-version-label:not(:first-child) {
  margin-top: 16px;
}

.whats-new-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.whats-new-list li {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
  padding-left: 16px;
  position: relative;
  line-height: 1.45;
}

.whats-new-list li::before {
  content: '·';
  position: absolute;
  left: 4px;
  color: rgb(56, 189, 248);
}

.whats-new-close {
  flex-shrink: 0;
  width: 100%;
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid rgba(56, 189, 248, 0.4);
  color: rgb(56, 189, 248);
  border-radius: 10px;
  padding: 10px;
  font-size: 0.92rem;
  cursor: pointer;
  transition: background 0.15s;
}
.whats-new-close:hover {
  background: rgba(56, 189, 248, 0.25);
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s;
}
</style>
