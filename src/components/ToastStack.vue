<template>
  <TransitionGroup name="toast" tag="div" class="toast-stack">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="toast"
      :class="`toast--${toast.color}`"
      role="status"
    >
      <span class="toast__message">{{ toast.message }}</span>
      <button v-if="toast.action" class="toast__action" @click="toast.action.fn(); removeToast(toast.id)">
        {{ toast.action.label }}
      </button>
      <button class="toast__dismiss" @click="removeToast(toast.id)" aria-label="Dismiss">✕</button>
    </div>
  </TransitionGroup>
</template>

<script setup>
import { useToast } from '../composables/useToast.js'

const { toasts, removeToast } = useToast()
</script>

<style scoped>
.toast-stack {
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: calc(100% - 32px);
  max-width: 540px;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 0.88rem;
  white-space: nowrap;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
  pointer-events: all;
  width: 100%;
}

.toast__message {
  flex: 1;
  min-width: 0;
  white-space: normal;
  color: rgba(255, 255, 255, 0.85);
}

/* colour variants */
.toast--blue {
  background: rgba(10, 18, 32, 0.88);
  border: 1px solid rgba(56, 189, 248, 0.45);
}
.toast--amber {
  background: rgba(10, 18, 32, 0.88);
  border: 1px solid rgba(251, 191, 36, 0.45);
}

.toast__action {
  border-radius: 8px;
  padding: 4px 12px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
  flex-shrink: 0;
}
.toast--blue .toast__action {
  background: rgba(56, 189, 248, 0.2);
  border: 1px solid rgba(56, 189, 248, 0.55);
  color: rgb(56, 189, 248);
}
.toast--blue .toast__action:hover { background: rgba(56, 189, 248, 0.32); }
.toast--amber .toast__action {
  background: rgba(251, 191, 36, 0.15);
  border: 1px solid rgba(251, 191, 36, 0.4);
  color: rgba(251, 191, 36, 0.9);
}
.toast--amber .toast__action:hover { background: rgba(251, 191, 36, 0.28); }

.toast__dismiss {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.35);
  font-size: 0.8rem;
  cursor: pointer;
  padding: 2px 4px;
  line-height: 1;
  transition: color 0.15s;
  flex-shrink: 0;
}
.toast__dismiss:hover { color: rgba(255, 255, 255, 0.7); }

/* enter/leave */
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.25s, transform 0.25s;
}
</style>
