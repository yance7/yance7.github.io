import { ref, onMounted, onUnmounted } from 'vue'

export function useScrollProgress() {
  const progress = ref(0)
  const showTop = ref(false)

  function update() {
    const el = document.documentElement
    const max = el.scrollHeight - el.clientHeight
    const top = window.scrollY || el.scrollTop
    progress.value = max > 0 ? Math.min(top / max, 1) : 0
    showTop.value = top > 480
  }

  let frame = 0
  function onScroll() {
    if (frame) return
    frame = requestAnimationFrame(() => {
      update()
      frame = 0
    })
  }

  onMounted(() => {
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onScroll)
    cancelAnimationFrame(frame)
    frame = 0
  })

  return { progress, showTop }
}
