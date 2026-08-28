import { onMounted, onUnmounted, ref } from 'vue'

export type HeaderState = 'resting' | 'floating'

export function useAdaptiveHeader() {
  const headerState = ref<HeaderState>('resting')
  const sentinelRef = ref<HTMLElement | null>(null)
  let observer: IntersectionObserver | null = null

  function updateState(entry: IntersectionObserverEntry) {
    headerState.value = entry.isIntersecting ? 'resting' : 'floating'
  }

  onMounted(() => {
    headerState.value = window.scrollY > 0 ? 'floating' : 'resting'
    const sentinel = sentinelRef.value

    if (!sentinel || !('IntersectionObserver' in window)) return

    observer = new IntersectionObserver(([entry]) => {
      if (entry) updateState(entry)
    }, { threshold: 0 })
    observer.observe(sentinel)
  })

  onUnmounted(() => {
    observer?.disconnect()
    observer = null
  })

  return { headerState, sentinelRef }
}
