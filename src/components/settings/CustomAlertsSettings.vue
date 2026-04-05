<template>
  <div class="alerts-panel">
    <div class="alerts-pages" :class="{ 'at-editor': page === 'editor' }">

      <!-- ── PAGE: List ── -->
      <div class="alerts-page alerts-page--list">

        <!-- "Show this card" -->
        <div class="settings-group">
          <div class="setting-row setting-row--col">
            <div class="setting-label">Show this card</div>
            <div class="unit-pill">
              <button
                :class="['unit-pill-opt', { active: customAlertsConfig.show === 'always' }]"
                @click="customAlertsConfig.show = 'always'"
              >Always</button>
              <button
                :class="['unit-pill-opt', { active: customAlertsConfig.show === 'active-only' }]"
                @click="customAlertsConfig.show = 'active-only'"
              >If an alert is active</button>
            </div>
          </div>
        </div>

        <!-- Alert list -->
        <div class="settings-group" style="margin-top: 0.75rem">
          <div v-for="{ alert, i } in sortedAlerts" :key="alert.id" class="alert-list-row" @click="openEditor(i)">
            <span class="alert-list-dot" :style="{ background: alert.color }" />
            <span class="alert-list-title">{{ alert.title || 'Untitled' }}</span>
            <div class="alert-list-actions">
              <button
                class="toggle-switch"
                :class="{ on: alert.enabled }"
                @click.stop="toggleAlertEnabled(i)"
                :title="alert.enabled ? 'Disable alert' : 'Enable alert'"
              ><span class="toggle-thumb" /></button>
              <button class="alert-delete-btn" @click.stop="deleteAlert(i)" title="Delete alert">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </button>
              <svg class="alert-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </div>
        </div>

        <button class="alerts-add-btn" @click="openEditor(-1)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Alert
        </button>
      </div>

      <!-- ── PAGE: Editor ── -->
      <div v-if="page === 'editor'" class="alerts-page alerts-page--editor">

        <!-- Title / colour / enabled -->
        <div class="settings-group">
          <div class="setting-row">
            <div class="setting-label">Title</div>
            <input
              class="alert-title-input"
              v-model="editingAlert.title"
              placeholder="e.g. Perfect cycling weather"
              maxlength="50"
            />
          </div>
          <div class="setting-row setting-row--col" style="gap: 0.5rem">
            <div class="setting-label">Colour</div>
            <div class="color-palette">
              <button
                v-for="c in COLOR_PALETTE"
                :key="c"
                :class="['color-swatch', { selected: editingAlert.color === c }]"
                :style="{ background: c }"
                @click="editingAlert.color = c"
                :title="c"
              />
            </div>
          </div>
          <div class="setting-row">
            <div class="setting-label">Enabled</div>
            <button
              class="toggle-switch"
              :class="{ on: editingAlert.enabled }"
              @click="editingAlert.enabled = !editingAlert.enabled"
            ><span class="toggle-thumb" /></button>
          </div>
          <AlertTapDataTypePicker v-model="editingAlert.tapDataType" />
        </div>

        <!-- ── Criteria ── -->
        <div class="criteria-section-label">Criteria</div>
        <div class="criteria-hint">An alert fires when all enabled criteria match.</div>

        <div class="settings-group" style="margin-top: 0.75rem">

          <!-- Days of week -->
          <div v-if="editingAlert.daysOfWeek" class="setting-row" :class="{ 'setting-row--col': editingAlert.daysOfWeek.enabled }">
            <div class="criterion-header">
              <span class="setting-label">Days of week</span>
              <button
                class="toggle-switch"
                :class="{ on: editingAlert.daysOfWeek.enabled }"
                @click="editingAlert.daysOfWeek.enabled = !editingAlert.daysOfWeek.enabled"
              ><span class="toggle-thumb" /></button>
            </div>
            <div v-if="editingAlert.daysOfWeek.enabled" class="criterion-body">
              <div class="day-pills">
                <button
                  v-for="(label, idx) in DAY_LABELS"
                  :key="idx"
                  :class="['day-pill', { active: editingAlert.daysOfWeek.days.includes(idx) }]"
                  @click="toggleDay(idx)"
                >{{ label }}</button>
              </div>
            </div>
          </div>

          <!-- Between hours -->
          <div v-if="editingAlert.betweenHours" class="setting-row" :class="{ 'setting-row--col': editingAlert.betweenHours.enabled }">
            <div class="criterion-header">
              <span class="setting-label">Between hours</span>
              <button
                class="toggle-switch"
                :class="{ on: editingAlert.betweenHours.enabled }"
                @click="editingAlert.betweenHours.enabled = !editingAlert.betweenHours.enabled"
              ><span class="toggle-thumb" /></button>
            </div>
            <div v-if="editingAlert.betweenHours.enabled" class="criterion-body">
              <RangeSlider
                :low="editingAlert.betweenHours.from ?? 0"
                :high="editingAlert.betweenHours.to ?? 23"
                :min="0" :max="23" :step="1"
                :format="formatHourLabel"
                @update:low="v => editingAlert.betweenHours.from = v ?? 0"
                @update:high="v => editingAlert.betweenHours.to = v ?? 23"
              />
            </div>
          </div>

          <!-- Temperature -->
          <div v-if="editingAlert.temperature" class="setting-row" :class="{ 'setting-row--col': editingAlert.temperature.enabled }">
            <div class="criterion-header">
              <span class="setting-label">Temperature</span>
              <button
                class="toggle-switch"
                :class="{ on: editingAlert.temperature.enabled }"
                @click="editingAlert.temperature.enabled = !editingAlert.temperature.enabled"
              ><span class="toggle-thumb" /></button>
            </div>
            <div v-if="editingAlert.temperature.enabled" class="criterion-body">
              <RangeSlider
                :low="editingAlert.temperature.min"
                :high="editingAlert.temperature.max"
                :min="tempRange.min" :max="tempRange.max" :step="1"
                :unit="tempUnit"
                @update:low="v => editingAlert.temperature.min = v"
                @update:high="v => editingAlert.temperature.max = v"
              />
            </div>
          </div>

          <!-- Rain -->
          <div v-if="editingAlert.rain" class="setting-row" :class="{ 'setting-row--col': editingAlert.rain.enabled }">
            <div class="criterion-header">
              <span class="setting-label">Rain</span>
              <button
                class="toggle-switch"
                :class="{ on: editingAlert.rain.enabled }"
                @click="editingAlert.rain.enabled = !editingAlert.rain.enabled"
              ><span class="toggle-thumb" /></button>
            </div>
            <div v-if="editingAlert.rain.enabled" class="criterion-body">
              <div class="criterion-sub-label">Probability (%)</div>
              <RangeSlider
                :low="editingAlert.rain.probMin"
                :high="editingAlert.rain.probMax"
                :min="0" :max="100" :step="5"
                unit="%"
                @update:low="v => editingAlert.rain.probMin = v"
                @update:high="v => editingAlert.rain.probMax = v"
              />
              <div class="criterion-sub-label" style="margin-top: 0.6rem">Amount (mm)</div>
              <RangeSlider
                :low="editingAlert.rain.amountMin"
                :high="editingAlert.rain.amountMax"
                :min="0" :max="50" :step="1"
                unit="mm"
                @update:low="v => editingAlert.rain.amountMin = v"
                @update:high="v => editingAlert.rain.amountMax = v"
              />
            </div>
          </div>

          <!-- Wind -->
          <div v-if="editingAlert.wind" class="setting-row" :class="{ 'setting-row--col': editingAlert.wind.enabled }">
            <div class="criterion-header">
              <span class="setting-label">Wind</span>
              <button
                class="toggle-switch"
                :class="{ on: editingAlert.wind.enabled }"
                @click="editingAlert.wind.enabled = !editingAlert.wind.enabled"
              ><span class="toggle-thumb" /></button>
            </div>
            <div v-if="editingAlert.wind.enabled" class="criterion-body">
              <div class="criterion-sub-label">Speed ({{ windUnit }})</div>
              <RangeSlider
                :low="editingAlert.wind.speedMin"
                :high="editingAlert.wind.speedMax"
                :min="0" :max="windRange" :step="1"
                :unit="` ${windUnit}`"
                @update:low="v => editingAlert.wind.speedMin = v"
                @update:high="v => editingAlert.wind.speedMax = v"
              />
              <div class="criterion-sub-label" style="margin-top: 0.6rem">Direction</div>
              <div class="compass-wrap">
                <div class="compass-rose">
                  <button
                    v-for="dir in COMPASS_DIRS"
                    :key="dir"
                    :class="['compass-btn', `compass-btn--${dir.toLowerCase()}`, { active: editingAlert.wind.directions?.includes(dir) }]"
                    @click="toggleWindDir(dir)"
                  >{{ dir }}</button>
                  <button
                    :class="['compass-any', { active: !editingAlert.wind.directions?.length }]"
                    @click="editingAlert.wind.directions = []"
                  >Any</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Cloud cover -->
          <div v-if="editingAlert.cloudCover" class="setting-row" :class="{ 'setting-row--col': editingAlert.cloudCover.enabled }">
            <div class="criterion-header">
              <span class="setting-label">Cloud cover</span>
              <button
                class="toggle-switch"
                :class="{ on: editingAlert.cloudCover.enabled }"
                @click="editingAlert.cloudCover.enabled = !editingAlert.cloudCover.enabled"
              ><span class="toggle-thumb" /></button>
            </div>
            <div v-if="editingAlert.cloudCover.enabled" class="criterion-body">
              <RangeSlider
                :low="editingAlert.cloudCover.min"
                :high="editingAlert.cloudCover.max"
                :min="0" :max="100" :step="5"
                unit="%"
                @update:low="v => editingAlert.cloudCover.min = v"
                @update:high="v => editingAlert.cloudCover.max = v"
              />
            </div>
          </div>

        </div>

      </div><!-- end editor page -->
    </div><!-- end alerts-pages -->
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useSettings } from '../../composables/useSettings.js'
import RangeSlider from '../RangeSlider.vue'
import AlertTapDataTypePicker from './AlertTapDataTypePicker.vue'

const props = defineProps({
  active:      { type: Boolean, default: false },
  editAlertId: { type: String,  default: null },
})

const emit = defineEmits(['page-change'])

const { customAlerts, customAlertsConfig, unitPrefs } = useSettings()

const sortedAlerts = computed(() =>
  customAlerts.value
    .map((alert, i) => ({ alert, i }))
    .sort((a, b) => (a.alert.title || '').localeCompare(b.alert.title || ''))
)

const page         = ref('list')

const editingIndex = ref(-1)
const editingAlert = reactive({})

// Reset to list when the panel is hidden (navigated away from)
watch(() => props.active, (isActive, wasActive) => {
  if (wasActive && !isActive) {
    page.value = 'list'
    emit('page-change', { page: 'list' })
  }
})

// Open editor directly for a specific alert (e.g. from card modal Edit button)
watch(() => props.editAlertId, (id) => {
  if (!id) return
  const index = customAlerts.value.findIndex(a => a.id === id)
  if (index !== -1) openEditor(index)
}, { immediate: true })

const DAY_LABELS   = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const COMPASS_DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
const COLOR_PALETTE = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#94a3b8',
]

const tempUnit = computed(() => unitPrefs.value.temperature === 'fahrenheit' ? '°F' : '°C')
const windUnit = computed(() => ({
  kmh: 'km/h', mph: 'mph', ms: 'm/s', kn: 'kn',
}[unitPrefs.value.wind] ?? 'km/h'))

// Slider ranges
const tempRange  = computed(() => unitPrefs.value.temperature === 'fahrenheit' ? { min: -4,  max: 122 } : { min: -20, max: 50 })
const windRange  = computed(() => ({ kmh: 150, mph: 90, ms: 40, kn: 80 }[unitPrefs.value.wind] ?? 150))

function formatHourLabel(h) {
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12  = h % 12 || 12
  return `${h12}${ampm}`
}

function makeNewAlert() {
  return {
    id:      crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
    title:   '',
    color:   '#3b82f6',
    enabled: true,
    tapDataType:  'none',
    daysOfWeek:   { enabled: false, days: [0, 1, 2, 3, 4, 5, 6] },
    betweenHours: { enabled: false, from: 8, to: 18 },
    temperature:  { enabled: false, min: null, max: null },
    rain:         { enabled: false, probMin: null, probMax: null, amountMin: null, amountMax: null },
    wind:         { enabled: false, speedMin: null, speedMax: null, directions: [] },
    cloudCover:   { enabled: false, min: null, max: null },
  }
}

function openEditor(index) {
  const src = index >= 0 ? customAlerts.value[index] : makeNewAlert()
  const copy = JSON.parse(JSON.stringify(src))
  // Migrate old single-direction string to directions array
  if (copy.wind && !Array.isArray(copy.wind.directions)) {
    copy.wind.directions = copy.wind.direction ? [copy.wind.direction] : []
    delete copy.wind.direction
  }
  Object.keys(editingAlert).forEach(k => delete editingAlert[k])
  Object.assign(editingAlert, copy)
  editingIndex.value = index
  page.value = 'editor'
  emit('page-change', { page: 'editor', title: index >= 0 ? 'Edit Alert' : 'New Alert' })
}

function saveAlert() {
  if (!editingAlert.title?.trim()) return
  const copy = JSON.parse(JSON.stringify(editingAlert))
  if (editingIndex.value >= 0) {
    const arr = [...customAlerts.value]
    arr[editingIndex.value] = copy
    customAlerts.value = arr
  } else {
    customAlerts.value = [...customAlerts.value, copy]
  }
  page.value = 'list'
  emit('page-change', { page: 'list' })
}

function cancelEditor() {
  page.value = 'list'
  emit('page-change', { page: 'list' })
}

const canSave = computed(() => !!editingAlert.title?.trim())
defineExpose({ cancelEditor, saveAlert, canSave })

function deleteAlert(index) {
  customAlerts.value = customAlerts.value.filter((_, i) => i !== index)
}

function toggleAlertEnabled(index) {
  const arr = customAlerts.value.map((a, i) =>
    i === index ? { ...a, enabled: !a.enabled } : a
  )
  customAlerts.value = arr
}

function toggleWindDir(dir) {
  const dirs = editingAlert.wind.directions ?? []
  if (dirs.includes(dir)) {
    editingAlert.wind.directions = dirs.filter(d => d !== dir)
  } else {
    editingAlert.wind.directions = [...dirs, dir]
  }
}

function toggleDay(idx) {
  const days = editingAlert.daysOfWeek.days
  const pos = days.indexOf(idx)
  if (pos >= 0) {
    editingAlert.daysOfWeek.days = days.filter(d => d !== idx)
  } else {
    editingAlert.daysOfWeek.days = [...days, idx].sort((a, b) => a - b)
  }
}


</script>

<style scoped>
.slot-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  overscroll-behavior-x: contain;
  touch-action: pan-x;
}
.slot-scroll::-webkit-scrollbar { display: none; }
.slot-scroll :deep(.data-point-grid) {
  flex-wrap: nowrap;
  align-items: center;
  padding-bottom: 2px;
}
.slot-scroll :deep(.data-point-opt) {
  flex-shrink: 0;
  white-space: nowrap;
}

.alerts-panel {
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.alerts-pages {
  display: flex;
  width: 200%;
  flex: 1;
  min-height: 0;
  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}
.alerts-pages.at-editor {
  transform: translateX(-50%);
}

.alerts-page {
  width: 50%;
  flex-shrink: 0;
  min-width: 0;
  overflow-y: auto;
  padding: 12px;
  box-sizing: border-box;
}

.alerts-page--editor {
  padding-bottom: 1.5rem;
}

/* ── List page ── */
.alerts-empty-hint {
  font-size: 0.82rem;
  opacity: 0.5;
  padding: 0.4rem 0 0.2rem;
}

.alert-list-row {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 10px 20px;
  min-height: 60px;
  box-sizing: border-box;
  border-top: 1px solid var(--row-border, rgba(255,255,255,0.07));
  cursor: pointer;
  transition: background 0.12s;
}
.alert-list-row:hover { background: var(--btn-hover); }

.alert-list-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.alert-list-title {
  flex: 1;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.alert-list-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
}

.alert-delete-btn {
  padding: 0.25rem;
  background: none;
  border: none;
  color: inherit;
  opacity: 0.35;
  cursor: pointer;
  line-height: 0;
  border-radius: 0.25rem;
}
.alert-delete-btn:hover { opacity: 0.75; color: #f87171; }

.alert-chevron {
  color: var(--text-faint, rgba(255,255,255,0.25));
  flex-shrink: 0;
  margin-left: 0.1rem;
}

.alerts-add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  margin: 0.4rem 0 0.1rem;
  padding: 10px 20px;
  min-height: 60px;
  box-sizing: border-box;
  border: 1px dashed var(--btn-border, rgba(255,255,255,0.15));
  border-radius: 0.5rem;
  background: transparent;
  color: var(--text-muted, rgba(255,255,255,0.5));
  font-size: 0.84rem;
  width: 100%;
  cursor: pointer;
  transition: opacity 0.15s;
}
.alerts-add-btn:hover { color: var(--text, #fff); }

/* ── Editor page ── */
.alert-title-input {
  flex: 1;
  padding: 0.32rem 0.55rem;
  border-radius: 0.4rem;
  border: 1px solid var(--btn-border, rgba(255,255,255,0.15));
  background: var(--input-bg, rgba(255,255,255,0.05));
  color: var(--text, #fff);
  font-size: 0.85rem;
}
.alert-title-input::placeholder { color: var(--text-faint, rgba(255,255,255,0.3)); }

/* Color palette */
.color-palette {
  display: flex;
  gap: 0.45rem;
  flex-wrap: wrap;
  padding: 0.15rem 0;
}

.color-swatch {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
  transition: transform 0.12s, border-color 0.12s;
}
.color-swatch:hover { transform: scale(1.1); }
.color-swatch.selected {
  border-color: rgba(255, 255, 255, 0.9);
  transform: scale(1.18);
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2), 0 0 0 3px rgba(0, 0, 0, 0.35);
}

/* Criteria */
.criteria-section-label {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  opacity: 0.45;
  padding: 0.7rem 0 0.1rem;
}

.criteria-hint {
  font-size: 0.78rem;
  opacity: 0.45;
  margin-bottom: 0.2rem;
  line-height: 1.4;
}

.criterion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.criterion-body {
  width: 100%;
  padding-top: 0.25rem;
}

.criterion-sub-label {
  font-size: 0.78rem;
  opacity: 0.55;
  margin-bottom: 0.2rem;
}

/* Day / direction pills */
.day-pills {
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
}

.day-pill {
  padding: 0.22rem 0.5rem;
  border-radius: 1rem;
  font-size: 0.78rem;
  background: var(--btn-bg, rgba(255,255,255,0.07));
  border: 1px solid var(--btn-border, rgba(255,255,255,0.12));
  color: var(--text-muted, rgba(255,255,255,0.55));
  cursor: pointer;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
}
.day-pill:hover { opacity: 0.85; }
.day-pill.active {
  background: rgba(56, 189, 248, 0.18);
  color: #38bdf8;
  border-color: rgba(56, 189, 248, 0.38);
}

/* ── Compass rose ── */
.compass-wrap {
  display: flex;
  justify-content: center;
  padding: 0.5rem 0 0.25rem;
}

.compass-rose {
  position: relative;
  width: 140px;
  height: 140px;
}

/* Each compass button is absolutely positioned around the circle */
.compass-btn {
  position: absolute;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 600;
  background: var(--btn-bg, rgba(255,255,255,0.07));
  border: 1px solid var(--btn-border, rgba(255,255,255,0.12));
  color: var(--text-muted, rgba(255,255,255,0.55));
  cursor: pointer;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
  transform: translate(-50%, -50%);
}
.compass-btn:hover { opacity: 0.85; }
.compass-btn.active {
  background: rgba(56, 189, 248, 0.18);
  color: #38bdf8;
  border-color: rgba(56, 189, 248, 0.5);
}

/* Position each direction — centred on a 140px square, radius ~42px */
.compass-btn--n  { top:  8%;   left: 50%; }
.compass-btn--ne { top: 20%;   left: 80%; }
.compass-btn--e  { top: 50%;   left: 92%; }
.compass-btn--se { top: 80%;   left: 80%; }
.compass-btn--s  { top: 92%;   left: 50%; }
.compass-btn--sw { top: 80%;   left: 20%; }
.compass-btn--w  { top: 50%;   left:  8%; }
.compass-btn--nw { top: 20%;   left: 20%; }

/* "Any" button in the centre */
.compass-any {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.68rem;
  font-weight: 600;
  background: var(--btn-bg, rgba(255,255,255,0.07));
  border: 1px solid var(--btn-border, rgba(255,255,255,0.12));
  color: var(--text-muted, rgba(255,255,255,0.55));
  cursor: pointer;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
}
.compass-any:hover { opacity: 0.85; }
.compass-any.active {
  background: rgba(56, 189, 248, 0.18);
  color: #38bdf8;
  border-color: rgba(56, 189, 248, 0.5);
}
</style>
