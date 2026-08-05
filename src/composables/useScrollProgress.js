import { ref, onMounted, onUnmounted } from 'vue'

export function useScrollProgress() {
  const progress = ref(0)

  function update() {
    const el = document.documentElement
    const max = el.scrollHeight - el.clientHeight
    progress.value = max > 0 ? Math.min(el.scrollTop / max, 1) : 0
  }

  let ticking = false
  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        update()
        ticking = false
      })
      ticking = true
    }
  }

  onMounted(() => {
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onScroll)
  })

  return { progress }
}
