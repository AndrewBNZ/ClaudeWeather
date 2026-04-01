// Handles long-press (touch) and right-click (mouse) for card settings access.
// Returns v-bind-compatible event handlers to attach to a wrapper element.
export function useCardPress(callback) {
  let timer   = null
  let startX  = 0
  let startY  = 0

  function onTouchstart(e) {
    if (e.touches.length !== 1) return
    startX = e.touches[0].clientX
    startY = e.touches[0].clientY
    timer = setTimeout(() => {
      timer = null
      navigator.vibrate?.(40)
      callback()
    }, 500)
  }

  function onTouchmove(e) {
    if (timer === null) return
    const dx = e.touches[0].clientX - startX
    const dy = e.touches[0].clientY - startY
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      clearTimeout(timer)
      timer = null
    }
  }

  function onTouchend() {
    if (timer !== null) { clearTimeout(timer); timer = null }
  }

  function onContextmenu(e) {
    e.preventDefault()
    callback()
  }

  // Suppress the OS-level long-press callout (iOS share sheet, Android menu)
  const style = { webkitTouchCallout: 'none', userSelect: 'none' }

  return { onTouchstart, onTouchmove, onTouchend, onContextmenu, style }
}
