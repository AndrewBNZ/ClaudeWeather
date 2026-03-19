<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-dialog modal-dialog--wide">
      <div class="modal-header">
        <span class="panel-title">Export settings</span>
        <button class="panel-close" @click="$emit('close')">✕</button>
      </div>

      <div class="modal-body qr-backup-body">
        <p class="qr-instruction">Scan this QR code on another device to copy your settings and locations.</p>

        <div class="qr-canvas-wrap">
          <canvas ref="canvasRef" />
          <div v-if="error" class="qr-error">{{ error }}</div>
        </div>

        <div v-if="hasPwsKey" class="qr-warning">
          Your PWS API key is included — don't share this QR code publicly.
        </div>

        <div class="qr-backup-actions">
          <button class="setting-action-btn" :disabled="!!error" @click="download">Download PNG</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import QRCode from 'qrcode'
import { encodeSettings } from '../composables/useSettingsBackup.js'
import { APP_STORAGE_PREFIX } from '../config.js'

defineEmits(['close'])

const canvasRef = ref(null)
const error     = ref('')
const hasPwsKey = !!localStorage.getItem(`${APP_STORAGE_PREFIX}-pws-key`)

onMounted(async () => {
  try {
    const encoded = encodeSettings()
    await QRCode.toCanvas(canvasRef.value, encoded, {
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'L',
      color: { dark: '#000000', light: '#ffffff' },
    })
  } catch (e) {
    error.value = 'Could not generate QR code.'
    console.error(e)
  }
})

function download() {
  canvasRef.value.toBlob(blob => {
    const url = URL.createObjectURL(blob)
    const a   = document.createElement('a')
    a.href     = url
    a.download = 'claudeweather-backup.png'
    a.click()
    URL.revokeObjectURL(url)
  })
}
</script>

<style>
.qr-backup-body {
  align-items: stretch;
}

.qr-instruction {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.qr-canvas-wrap {
  display: flex;
  justify-content: center;
  padding: 8px 0;
}

.qr-canvas-wrap canvas {
  border-radius: 8px;
  max-width: 100%;
}

.qr-warning {
  font-size: 0.78rem;
  color: #fb923c;
  background: rgba(251, 146, 60, 0.08);
  border-left: 3px solid rgba(251, 146, 60, 0.5);
  border-radius: 4px;
  padding: 8px 12px;
  line-height: 1.45;
}

.qr-error {
  font-size: 0.85rem;
  color: #f87171;
  padding: 12px 0;
}

.qr-backup-actions {
  display: flex;
  justify-content: flex-end;
}
</style>
