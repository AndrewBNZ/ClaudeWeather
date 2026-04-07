import { ref } from 'vue'

const toasts = ref([])

export function useToast() {
  function addToast({ id, message, action, color = 'blue' }) {
    if (toasts.value.some(t => t.id === id)) return
    toasts.value.push({ id, message, action, color })
  }

  function removeToast(id) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  return { toasts, addToast, removeToast }
}
