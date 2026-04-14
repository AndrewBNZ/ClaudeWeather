<template>
  <div class="alerts-panel">
    <div class="alerts-pages" :class="{ 'at-editor': page === 'editor' }">

      <!-- ── PAGE: List ── -->
      <div class="alerts-page alerts-page--list">
        <CustomAlertsList @edit="openEditor" />
      </div>

      <!-- ── PAGE: Editor ── -->
      <div v-if="page === 'editor'" class="alerts-page alerts-page--editor">
        <CustomAlertsEditor
          ref="editorRef"
          :alert-index="editingIndex"
          @save="onSave"
          @cancel="onCancel"
        />
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import CustomAlertsList   from './CustomAlertsList.vue'
import CustomAlertsEditor from './CustomAlertsEditor.vue'
import { useSettings } from '../../composables/useSettings.js'

const props = defineProps({
  active:      { type: Boolean, default: false },
  editAlertId: { type: String,  default: null },
})

const emit = defineEmits(['page-change'])

const { customAlerts } = useSettings()

const page         = ref('list')
const editingIndex = ref(-1)
const editorRef    = ref(null)

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

function openEditor(index) {
  editingIndex.value = index
  page.value = 'editor'
  emit('page-change', { page: 'editor', title: index >= 0 ? 'Edit Alert' : 'New Alert' })
}

function onSave() {
  page.value = 'list'
  emit('page-change', { page: 'list' })
}

function onCancel() {
  page.value = 'list'
  emit('page-change', { page: 'list' })
}

const alertEnabled = computed({
  get: () => editorRef.value?.alertEnabled ?? true,
  set: (v) => { if (editorRef.value) editorRef.value.alertEnabled = v },
})
function cancelEditor() { editorRef.value?.cancelEditor() }

defineExpose({ cancelEditor, alertEnabled })
</script>

<style scoped>
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
</style>
