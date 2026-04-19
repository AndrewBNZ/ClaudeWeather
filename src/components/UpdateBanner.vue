<template>
  <!-- What's New modal -->
  <Transition name="modal-fade">
    <div v-if="showWhatsNew" class="modal-overlay" @click.self="showWhatsNew = false">
      <div class="whats-new-modal">
        <div class="whats-new-header">
          <span class="whats-new-title">What's New</span>
          <div class="whats-new-nav">
            <button class="wn-nav-btn" :disabled="viewIndex >= changelog.length - 1" @click="viewIndex++" title="Older release">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span class="wn-nav-version">v{{ changelog[viewIndex].version }}</span>
            <button class="wn-nav-btn" :disabled="viewIndex === 0" @click="viewIndex--" title="Newer release">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <button class="wn-nav-btn" :disabled="viewIndex === 0" @click="viewIndex = 0" title="Jump to latest">
              <!-- double-right chevron -->
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
            </button>
          </div>
        </div>
        <div class="whats-new-scroll">
          <ul class="whats-new-list">
            <li v-for="(entry, i) in changelog[viewIndex].entries" :key="i">{{ entry }}</li>
          </ul>
        </div>
        <button class="whats-new-close" @click="showWhatsNew = false">Got it</button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import changelog from '../changelog.js'
import { APP_STORAGE_PREFIX } from '../config.js'
import { showWhatsNew } from '../composables/useWhatsNew.js'
import { useToast } from '../composables/useToast.js'

const VERSION_KEY = `${APP_STORAGE_PREFIX}-version`
const currentVersion = __APP_VERSION__

const { needRefresh, updateServiceWorker } = useRegisterSW()
const { addToast, removeToast } = useToast()

function doUpdate() {
  updateServiceWorker(true)
}

watch(needRefresh, (val) => {
  if (val) {
    addToast({ id: 'app-update', message: 'App update available', action: { label: 'Update now', fn: doUpdate }, color: 'blue' })
  } else {
    removeToast('app-update')
  }
})

function semverGt(a, b) {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return true
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return false
  }
  return false
}

// Index into changelog (0 = newest). Reset to 0 each time modal opens.
const viewIndex = ref(0)
watch(showWhatsNew, (val) => { if (val) viewIndex.value = 0 })

onMounted(() => {
  const stored = localStorage.getItem(VERSION_KEY)
  if (stored && stored !== currentVersion) {
    const hasEntries = changelog.some(e => semverGt(e.version, stored))
    if (hasEntries) showWhatsNew.value = true
  }
  try { localStorage.setItem(VERSION_KEY, currentVersion) } catch {}
})
</script>

<style scoped>
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
  height: 340px;
  max-height: 80dvh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
}

.whats-new-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.whats-new-title {
  font-size: 1.15rem;
  font-weight: 600;
  color: #fff;
}

.whats-new-nav {
  display: flex;
  align-items: center;
  gap: 2px;
}

.wn-nav-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  transition: color 0.15s, background 0.15s;
}
.wn-nav-btn:hover:not(:disabled) {
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.08);
}
.wn-nav-btn:disabled {
  opacity: 0.25;
  cursor: default;
}

.wn-nav-version {
  font-size: 0.78rem;
  font-weight: 600;
  color: rgba(56, 189, 248, 0.85);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  min-width: 48px;
  text-align: center;
}

.whats-new-scroll {
  overflow-y: auto;
  flex: 1;
  margin-bottom: 20px;
  scrollbar-width: none;
}
.whats-new-scroll::-webkit-scrollbar { display: none; }


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

.whats-new-empty {
  margin: 0;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.45);
  text-align: center;
  padding: 24px 0;
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
