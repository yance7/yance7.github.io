import { computed, onMounted, onUnmounted, ref } from 'vue'
import { getScrollProgress } from '../utils/scrollProgress'

export function useScrollProgress() {
  const progress = ref(0)
  const percent = computed(() => Math.round(progress.value * 100))
  let frame = 0
  let resizeObserver: ResizeObserver | null = null

  function update() {
    const root = document.documentElement
    const scrollTop = window.scrollY || root.scrollTop
    progress.value = getScrollProgress(scrollTop, root.scrollHeight, root.clientHeight)
  }

  function scheduleUpdate() {
    if (frame) return
    frame = requestAnimationFrame(() => {
      update()
      frame = 0
    })
  }

  onMounted(() => {
    update()
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate, { passive: true })
    window.visualViewport?.addEventListener('resize', scheduleUpdate, { passive: true })
    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(() => scheduleUpdate())
      resizeObserver.observe(document.documentElement)
    }
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', scheduleUpdate)
    window.removeEventListener('resize', scheduleUpdate)
    window.visualViewport?.removeEventListener('resize', scheduleUpdate)
    resizeObserver?.disconnect()
    resizeObserver = null
    cancelAnimationFrame(frame)
    frame = 0
  })

  return { progress, percent }
}
