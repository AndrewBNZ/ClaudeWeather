<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-dialog modal-dialog--wide">
      <div class="modal-header">
        <span class="panel-title">Import settings</span>
        <button class="panel-close" @click="$emit('close')">✕</button>
      </div>

      <!-- Phase: pick method -->
      <div v-if="phase === 'pick'" class="modal-body qr-restore-pick">
        <p class="qr-instruction">Choose how to scan the QR code from another device.</p>

        <div class="qr-pick-options">
          <button class="qr-pick-btn" @click="startCamera">
            <span class="qr-pick-icon">📷</span>
            <span class="qr-pick-label">Scan with camera</span>
            <span class="qr-pick-hint">Point at the QR code</span>
          </button>
          <button class="qr-pick-btn" @click="triggerUpload">
            <span class="qr-pick-icon">🖼️</span>
            <span class="qr-pick-label">Upload image</span>
            <span class="qr-pick-hint">Screenshot or saved photo</span>
          </button>
        </div>

        <input ref="fileInputRef" type="file" accept="image/*" class="qr-file-input" @change="onFileChange" />

        <!-- Camera preview -->
        <div v-if="cameraActive" class="qr-camera-wrap">
          <video ref="videoRef" autoplay playsinline muted class="qr-video" />
          <p class="qr-camera-hint">Point your camera at the QR code</p>
          <button class="setting-action-btn qr-stop-btn" @click="stopCamera">Cancel camera</button>
        </div>

        <div v-if="pickError" class="qr-pick-error">{{ pickError }}</div>
      </div>

      <!-- Phase: confirm -->
      <div v-else-if="phase === 'confirm'" class="modal-body qr-restore-confirm">
        <p class="qr-instruction">The following settings will be applied:</p>

        <div class="qr-diff-list">
          <div v-if="!diff.length" class="qr-diff-none">No changes — settings are already identical.</div>
          <div v-for="(item, i) in diff" :key="i" class="qr-diff-row">
            <span class="qr-diff-label">{{ item.label }}</span>
            <span class="qr-diff-value">
              <template v-if="item.from !== null && item.to !== null">
                <span class="qr-diff-from">{{ item.from }}</span>
                <span class="qr-diff-arrow"> → </span>
                <span class="qr-diff-to">{{ item.to }}</span>
              </template>
              <template v-else-if="item.from === null">{{ item.to }}</template>
              <template v-else>{{ item.from }}</template>
            </span>
          </div>
        </div>

        <p class="qr-reload-note">The app will reload to apply the restored settings.</p>

        <div class="qr-confirm-actions">
          <button class="setting-action-btn" @click="phase = 'pick'; stopCamera()">Back</button>
          <button class="setting-action-btn qr-restore-confirm-btn" @click="applySettingsNow">Restore settings</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import jsQR from 'jsqr'
import { decodeSettings, diffSettings, applySettings } from '../composables/useSettingsBackup.js'

defineEmits(['close'])

const phase        = ref('pick')
const pickError    = ref('')
const diff         = ref([])
const decodedPayload = ref(null)

// Camera
const videoRef     = ref(null)
const cameraActive = ref(false)
let   stream       = null
let   scanInterval = null

// File upload
const fileInputRef = ref(null)

function triggerUpload() {
  pickError.value = ''
  fileInputRef.value.value = ''
  fileInputRef.value.click()
}

async function onFileChange(e) {
  const file = e.target.files[0]
  if (!file) return
  pickError.value = ''
  try {
    const result = await decodeFromFile(file)
    handleDecoded(result)
  } catch (err) {
    pickError.value = err.message
  }
}

function decodeFromFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas  = document.createElement('canvas')
      canvas.width  = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      const result = jsQR(imageData.data, imageData.width, imageData.height)
      if (result) resolve(result.data)
      else reject(new Error('No QR code found in this image. Try a clearer photo.'))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not load the image.')) }
    img.src = url
  })
}

async function startCamera() {
  pickError.value = ''
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    cameraActive.value = true
    // Wait for video element to be rendered
    await new Promise(r => setTimeout(r, 50))
    videoRef.value.srcObject = stream
    scanInterval = setInterval(scanFrame, 150)
  } catch (err) {
    const denied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
    pickError.value = denied
      ? 'Camera access denied. Try uploading a screenshot instead.'
      : 'Could not access camera. Try uploading a screenshot instead.'
  }
}

function scanFrame() {
  const video = videoRef.value
  if (!video || video.readyState < 2) return
  const canvas  = document.createElement('canvas')
  canvas.width  = video.videoWidth
  canvas.height = video.videoHeight
  if (!canvas.width || !canvas.height) return
  const ctx = canvas.getContext('2d')
  ctx.drawImage(video, 0, 0)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const result = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' })
  if (result?.data) {
    stopCamera()
    handleDecoded(result.data)
  }
}

function stopCamera() {
  clearInterval(scanInterval)
  scanInterval = null
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null }
  cameraActive.value = false
}

function handleDecoded(encoded) {
  try {
    const payload = decodeSettings(encoded)
    decodedPayload.value = payload
    diff.value = diffSettings(payload)
    phase.value = 'confirm'
  } catch (err) {
    pickError.value = err.message
  }
}

function applySettingsNow() {
  applySettings(decodedPayload.value)
}

onUnmounted(() => stopCamera())
</script>

<style>
.qr-restore-pick,
.qr-restore-confirm {
  align-items: stretch;
}

.qr-pick-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.qr-pick-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 12px;
  border-radius: 12px;
  border: 1px solid var(--btn-border);
  background: var(--btn-bg);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  text-align: center;
}
.qr-pick-btn:hover { background: var(--btn-hover); border-color: rgba(56, 189, 248, 0.35); }

.qr-pick-icon  { font-size: 1.6rem; line-height: 1; }
.qr-pick-label { font-size: 0.88rem; font-weight: 600; color: var(--text); }
.qr-pick-hint  { font-size: 0.75rem; color: var(--text-faint); }

.qr-file-input { display: none; }

.qr-camera-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.qr-video {
  width: 100%;
  max-width: 300px;
  border-radius: 10px;
  background: #000;
  aspect-ratio: 1;
  object-fit: cover;
}


.qr-camera-hint { font-size: 0.78rem; color: var(--text-faint); margin: 0; }
.qr-stop-btn    { margin-top: 2px; }

.qr-pick-error {
  font-size: 0.82rem;
  color: #f87171;
  line-height: 1.45;
  padding: 4px 0;
}

/* Confirm phase */
.qr-diff-list {
  border: 1px solid var(--panel-border);
  border-radius: 10px;
  overflow: hidden;
}

.qr-diff-none {
  padding: 14px 16px;
  font-size: 0.85rem;
  color: var(--text-faint);
}

.qr-diff-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  border-top: 1px solid var(--row-border);
  font-size: 0.83rem;
}
.qr-diff-row:first-child { border-top: none; }

.qr-diff-label { color: var(--text-muted); font-weight: 500; flex-shrink: 0; }
.qr-diff-value { color: var(--text); text-align: right; }
.qr-diff-from  { color: var(--text-faint); text-decoration: line-through; }
.qr-diff-arrow { color: var(--text-faint); }
.qr-diff-to    { color: #38bdf8; }

.qr-reload-note {
  font-size: 0.78rem;
  color: var(--text-faint);
  margin: 0;
  line-height: 1.45;
}

.qr-confirm-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.qr-restore-confirm-btn {
  background: rgba(56, 189, 248, 0.12);
  color: #38bdf8;
  border-color: rgba(56, 189, 248, 0.3);
}
.qr-restore-confirm-btn:hover {
  background: rgba(56, 189, 248, 0.2);
  color: #38bdf8;
}
</style>
