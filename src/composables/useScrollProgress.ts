import { onMounted, onUnmounted, ref } from 'vue'

export function useScrollProgress() {
  const progress = ref(0)
  const showTop = ref(false)
  let frame = 0

  function update() {
    const root = document.documentElement
    const scrollRange = root.scrollHeight - root.clientHeight
    const scrollTop = window.scrollY || root.scrollTop
    progress.value = scrollRange > 0 ? Math.min(scrollTop / scrollRange, 1) : 0
    showTop.value = scrollTop > 480
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
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', scheduleUpdate)
    window.removeEventListener('resize', scheduleUpdate)
    cancelAnimationFrame(frame)
    frame = 0
  })

  return { progress, showTop }
}
