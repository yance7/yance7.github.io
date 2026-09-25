import { onMounted, onUnmounted, ref } from 'vue'

export type HeaderState = 'resting' | 'floating'

export function useAdaptiveHeader() {
  const headerState = ref<HeaderState>('resting')
  const sentinelRef = ref<HTMLElement | null>(null)
  let observer: IntersectionObserver | null = null

  function updateState() {
    const sentinel = sentinelRef.value
    if (!sentinel) {
      headerState.value = window.scrollY > 0 ? 'floating' : 'resting'
      return
    }

    const { top, bottom } = sentinel.getBoundingClientRect()
    const isInViewport = bottom > 0 && top < window.innerHeight
    headerState.value = isInViewport ? 'resting' : 'floating'
  }

  onMounted(() => {
    updateState()
    window.addEventListener('scroll', updateState, { passive: true })
    const sentinel = sentinelRef.value

    if (!sentinel || !('IntersectionObserver' in window)) return

    observer = new IntersectionObserver(updateState, { threshold: 0 })
    observer.observe(sentinel)
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', updateState)
    observer?.disconnect()
    observer = null
  })

  return { headerState, sentinelRef }
}
