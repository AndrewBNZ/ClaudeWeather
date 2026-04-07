<template>
  <div
    v-if="showMode === 'always' || matchedAlerts.length > 0"
    v-bind="$attrs"
    class="card alerts-card"
  >
    <div v-if="matchedAlerts.length === 0" class="alerts-empty">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      <span>No active custom alerts</span>
    </div>

    <div
      v-for="entry in matchedAlerts"
      :key="entry.alert.id"
      class="alert-tile"
      :style="{
        background: hexToRgba(entry.alert.color, 0.12),
        borderLeftColor: entry.alert.color,
      }"
      @click="selectedEntry = entry; collapsed = false"
    >
      <div class="alert-tile-title">{{ entry.alert.title || 'Untitled' }}</div>
      <div class="alert-tile-when">{{ formatFirstMatch(entry.matchesByDay) }}</div>
    </div>
  </div>

  <Teleport to="body">
    <!-- Full modal (hidden when collapsed) -->
    <Transition name="alert-modal">
      <div v-if="selectedEntry && !collapsed" class="alert-modal-overlay" @click.self="selectedEntry = null">
        <div class="alert-modal" :style="{ borderTopColor: selectedEntry.alert.color }">
          <div class="alert-modal-header">
            <div class="alert-modal-header-text">
              <span class="alert-modal-title">{{ selectedEntry.alert.title || 'Untitled' }}</span>
              <span v-if="summarizeCriteria(selectedEntry.alert)" class="alert-modal-criteria">{{ summarizeCriteria(selectedEntry.alert) }}</span>
            </div>
            <div class="alert-modal-header-actions">
              <button class="alert-modal-edit" @click="onEditAlert" aria-label="Edit alert">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="alert-modal-close" @click="selectedEntry = null">✕</button>
            </div>
          </div>
          <div class="alert-modal-body">
            <div class="settings-group">
              <div
                v-for="day in selectedEntry.matchesByDay"
                :key="day.date"
                class="setting-row alert-day-row"
              >
                <div class="alert-day-inner">
                  <div class="setting-label">{{ formatDate(day.date) }}</div>
                  <div class="alert-hours">
                    <span
                      v-for="range in groupConsecutiveHours(day.hours)"
                      :key="range.start"
                      class="alert-hour-chip alert-hour-chip--clickable"
                      :class="{ 'alert-hour-chip--active': activeChip?.date === day.date && activeChip?.hour === range.start }"
                      :style="{
                        background: hexToRgba(selectedEntry.alert.color, activeChip?.date === day.date && activeChip?.hour === range.start ? 0.35 : 0.18),
                        color: selectedEntry.alert.color,
                      }"
                      @click="navigateToHour(day.date, range.start, range.end)"
                    >{{ formatHourRange(range.start, range.end) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Mini collapsed strip -->
    <Transition name="alert-mini">
      <div
        v-if="selectedEntry && collapsed"
        class="alert-modal-mini"
        :style="{ borderTopColor: selectedEntry.alert.color }"
      >
        <div class="alert-mini-header">
          <div class="alert-mini-title-row">
            <span class="alert-mini-dot" :style="{ background: selectedEntry.alert.color }"></span>
            <span class="alert-mini-title">{{ selectedEntry.alert.title || 'Untitled' }}</span>
          </div>
          <div class="alert-mini-actions">
            <button class="alert-modal-edit" @click="collapsed = false" aria-label="Expand">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15"/></svg>
            </button>
            <button class="alert-modal-close" @click="selectedEntry = null; collapsed = false">✕</button>
          </div>
        </div>
        <div class="alert-mini-days">
          <div
            v-for="day in selectedEntry.matchesByDay"
            :key="day.date"
            class="alert-mini-day-row"
          >
            <span class="alert-mini-day-label">{{ formatDate(day.date) }}</span>
            <div class="alert-hours">
              <span
                v-for="range in groupConsecutiveHours(day.hours)"
                :key="range.start"
                class="alert-hour-chip alert-hour-chip--clickable"
                :class="{ 'alert-hour-chip--active': activeChip?.date === day.date && activeChip?.hour === range.start }"
                :style="{
                  background: hexToRgba(selectedEntry.alert.color, activeChip?.date === day.date && activeChip?.hour === range.start ? 0.35 : 0.18),
                  color: selectedEntry.alert.color,
                }"
                @click="navigateToHour(day.date, range.start, range.end)"
              >{{ formatHourRange(range.start, range.end) }}</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

defineOptions({ inheritAttrs: false })

const emit = defineEmits(['scroll-to-hour', 'open-alert-editor', 'set-data-type', 'highlight-hours'])

const props = defineProps({
  customAlertsConfig: { type: Object, default: null },
  customAlertResults: { type: Object, default: null },
  timeFormat:         { type: String, default: '12h' },
  unitPrefs:          { type: Object, default: null },
})

const selectedEntry = ref(null)
const collapsed = ref(false)
const activeChip = ref(null) // { date, hour }

const showMode = computed(() => props.customAlertsConfig?.show ?? 'always')

const matchedAlerts = computed(() => {
  if (!props.customAlertResults) return []
  return [...props.customAlertResults.values()]
    .sort((a, b) => (a.alert.title || '').localeCompare(b.alert.title || ''))
})

function hexToRgba(hex, alpha) {
  if (!hex) return `rgba(99,102,241,${alpha})`
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function formatHour(h) {
  if (props.timeFormat === '24h') return `${String(h).padStart(2, '0')}:00`
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 || 12
  return `${h12}${ampm}`
}

function formatHourRange(start, end) {
  if (start === end) return formatHour(start)
  if (props.timeFormat === '24h') return `${formatHour(start)}–${formatHour(end)}`
  const startAmpm = start >= 12 ? 'pm' : 'am'
  const endAmpm   = end   >= 12 ? 'pm' : 'am'
  const startH = start % 12 || 12
  const endH   = end   % 12 || 12
  if (startAmpm === endAmpm) return `${startH}–${endH}${endAmpm}`
  return `${startH}${startAmpm}–${endH}${endAmpm}`
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDate(dateStr) {
  // dateStr = 'YYYY-MM-DD'
  const d = new Date(dateStr + 'T12:00:00')
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`
}

function navigateToHour(date, hour, rangeEnd = hour) {
  const tapType = selectedEntry.value?.alert?.tapDataType ?? 'none'
  collapsed.value = true
  activeChip.value = { date, hour }
  const hours = []
  for (let h = hour; h <= rangeEnd; h++) hours.push(h)
  emit('highlight-hours', { matchesByDay: [{ date, hours }], color: selectedEntry.value.alert.color })
  if (tapType !== 'none') emit('set-data-type', tapType)
  emit('scroll-to-hour', { date, hour })
}

watch(selectedEntry, (val) => {
  if (!val) {
    activeChip.value = null
    emit('highlight-hours', null)
  }
})

function groupConsecutiveHours(hours) {
  if (!hours?.length) return []
  const ranges = []
  let start = hours[0], end = hours[0]
  for (let i = 1; i < hours.length; i++) {
    if (hours[i] === end + 1) {
      end = hours[i]
    } else {
      ranges.push({ start, end })
      start = end = hours[i]
    }
  }
  ranges.push({ start, end })
  return ranges
}

function onEditAlert() {
  const id = selectedEntry.value?.alert?.id
  selectedEntry.value = null
  if (id) emit('open-alert-editor', id)
}

function formatFirstMatch(matchesByDay) {
  if (!matchesByDay?.length) return '—'
  const first = matchesByDay[0]
  return `${formatDate(first.date)}, ${formatHour(first.hours[0])}`
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function summarizeCriteria(alert) {
  const parts = []

  if (alert.daysOfWeek?.enabled && alert.daysOfWeek.days?.length) {
    const days = [...alert.daysOfWeek.days].sort((a, b) => a - b)
    // Check if it's a contiguous run
    const isRun = days.length > 1 && days[days.length - 1] - days[0] === days.length - 1
    if (isRun && days.length > 2) {
      parts.push(`${DAY_LABELS[days[0]]}–${DAY_LABELS[days[days.length - 1]]}`)
    } else {
      parts.push(days.map(d => DAY_LABELS[d]).join(', '))
    }
  }

  if (alert.betweenHours?.enabled) {
    const from = alert.betweenHours.from ?? 0
    const to   = alert.betweenHours.to ?? 23
    parts.push(`${formatHour(from)}–${formatHour(to)}`)
  }

  const tempUnit = props.unitPrefs?.temperature === 'fahrenheit' ? '°F' : '°C'
  if (alert.temperature?.enabled) {
    const { min, max } = alert.temperature
    if (min != null && max != null) parts.push(`Temp ${min}–${max}${tempUnit}`)
    else if (min != null)           parts.push(`Temp ≥ ${min}${tempUnit}`)
    else if (max != null)           parts.push(`Temp ≤ ${max}${tempUnit}`)
  }

  if (alert.rain?.enabled) {
    const { probMin, probMax, amountMin, amountMax } = alert.rain
    if (probMin != null || probMax != null) {
      const lo = probMin ?? 0, hi = probMax ?? 100
      parts.push(`Rain ${lo}–${hi}%`)
    }
    if (amountMin != null || amountMax != null) {
      const lo = amountMin ?? 0, hi = amountMax ?? '∞'
      parts.push(`${lo}–${hi} mm`)
    }
  }

  const windUnits = { kmh: 'km/h', mph: 'mph', ms: 'm/s', kn: 'kn' }
  const windUnit = windUnits[props.unitPrefs?.wind] ?? 'km/h'
  if (alert.wind?.enabled) {
    const { speedMin, speedMax, directions } = alert.wind
    if (speedMin != null && speedMax != null) parts.push(`Wind ${speedMin}–${speedMax} ${windUnit}`)
    else if (speedMin != null)                parts.push(`Wind ≥ ${speedMin} ${windUnit}`)
    else if (speedMax != null)                parts.push(`Wind ≤ ${speedMax} ${windUnit}`)
    if (directions?.length)                   parts.push(directions.join('/'))
  }

  if (alert.cloudCover?.enabled) {
    const { min, max } = alert.cloudCover
    if (min != null && max != null) parts.push(`Cloud ${min}–${max}%`)
    else if (min != null)           parts.push(`Cloud ≥ ${min}%`)
    else if (max != null)           parts.push(`Cloud ≤ ${max}%`)
  }

  return parts.join(' · ')
}
</script>

<style scoped>
.alerts-card {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.35rem;
  padding: 10px 12px;
}
@media (min-width: 900px) {
  .alerts-card { grid-template-columns: 1fr 1fr 1fr; }
}

.alerts-empty {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  opacity: 0.55;
  padding: 0.2rem 0;
}

.alert-tile {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.5rem 0.65rem;
  border-radius: 0.5rem;
  border-left: 3px solid transparent;
  cursor: pointer;
  transition: opacity 0.15s;
  min-width: 0;
}
.alert-tile:active { opacity: 0.7; }

.alert-tile-title {
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.alert-tile-when {
  font-size: 0.8rem;
  opacity: 0.6;
}

/* ── Detail modal ── */
.alert-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 220;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

@media (min-width: 1400px) {
  .alert-modal-overlay { align-items: center; }
}

.alert-modal {
  background: var(--sheet-bg, #1e2130);
  border: 1px solid var(--panel-border, rgba(255,255,255,0.08));
  border-top: 4px solid transparent;
  border-radius: 20px 20px 0 0;
  width: 100%;
  max-width: 480px;
  height: 65dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--shadow);
}

@media (min-width: 1400px) {
  .alert-modal {
    border-radius: 1rem;
  }
}

.alert-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--panel-border, rgba(255,255,255,0.08));
  flex-shrink: 0;
}

.alert-modal-header-text {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.alert-modal-title {
  font-size: 1rem;
  font-weight: 600;
}

.alert-modal-criteria {
  font-size: 0.75rem;
  opacity: 0.5;
  line-height: 1.4;
}

.alert-modal-header-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}

.alert-modal-edit {
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.45;
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
  line-height: 1;
}
.alert-modal-edit:hover { opacity: 0.8; }

.alert-modal-close {
  font-size: 1rem;
  opacity: 0.45;
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
  line-height: 1;
}
.alert-modal-close:hover { opacity: 0.8; }

.alert-modal-body {
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 12px 16px 1.25rem;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.12) transparent;
}
.alert-modal-body::-webkit-scrollbar { width: 4px; }
.alert-modal-body::-webkit-scrollbar-track { background: transparent; }
.alert-modal-body::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.12);
  border-radius: 2px;
}
.alert-modal-body::-webkit-scrollbar-thumb:hover {
  background: rgba(255,255,255,0.22);
}

.alert-day-row {
  min-height: unset;
  align-items: flex-start;
}

.alert-day-inner {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  width: 100%;
  padding: 2px 0;
}

.alert-hours {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.alert-hour-chip {
  padding: 0.2rem 0.6rem;
  border-radius: 1rem;
  font-size: 0.8rem;
  font-weight: 500;
  white-space: nowrap;
  border: 1.5px solid transparent;
}

.alert-hour-chip--clickable {
  cursor: pointer;
  transition: filter 0.15s, box-shadow 0.15s;
}
.alert-hour-chip--clickable:active { filter: brightness(1.3); }

.alert-hour-chip--active {
  border-color: currentColor;
}

/* ── Mini collapsed strip ── */
.alert-modal-mini {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-width: 480px;
  margin: 0 auto;
  background: var(--sheet-bg, #1e2130);
  border: 1px solid var(--panel-border, rgba(255,255,255,0.08));
  border-top: 4px solid transparent;
  border-radius: 16px 16px 0 0;
  padding: 10px 16px 20px;
  box-shadow: var(--shadow);
  z-index: 220;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.alert-mini-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.alert-mini-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.alert-mini-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.alert-mini-title {
  font-size: 0.9rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.alert-mini-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}

.alert-mini-days {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  overflow-y: auto;
  max-height: 120px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.12) transparent;
}

.alert-mini-day-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: nowrap;
  min-width: 0;
}

.alert-modal-mini .alert-hours {
  flex-wrap: nowrap;
  overflow-x: auto;
  scrollbar-width: none;
}
.alert-modal-mini .alert-hours::-webkit-scrollbar { display: none; }

.alert-mini-day-label {
  font-size: 0.75rem;
  opacity: 0.5;
  white-space: nowrap;
  flex-shrink: 0;
  width: 5.5rem;
}

/* Transitions */
.alert-modal-enter-active,
.alert-modal-leave-active {
  transition: opacity 0.22s ease;
}
.alert-modal-enter-active .alert-modal,
.alert-modal-leave-active .alert-modal {
  transition: transform 0.22s cubic-bezier(0.32, 0.72, 0, 1);
}
.alert-modal-enter-from,
.alert-modal-leave-to {
  opacity: 0;
}
.alert-modal-enter-from .alert-modal,
.alert-modal-leave-to .alert-modal {
  transform: translateY(100%);
}

.alert-mini-enter-active,
.alert-mini-leave-active {
  transition: transform 0.22s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.22s ease;
}
.alert-mini-enter-from,
.alert-mini-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
