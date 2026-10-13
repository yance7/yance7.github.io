import { onMounted, onUnmounted, ref } from 'vue'

export type HeaderState = 'resting' | 'floating'

export function useAdaptiveHeader() {
  const headerState = ref<HeaderState>('resting')
  const sentinelRef = ref<HTMLElement | null>(null)
  let observer: IntersectionObserver | null = null
  let fragmentObserver: MutationObserver | null = null

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

  function observeDeferredInitialFragment() {
    const initialHash = document.documentElement.dataset.initialHash || window.location.hash
    const shell = document.querySelector<HTMLElement>('.site-shell')
    if (!initialHash || !shell || !('MutationObserver' in window)) return

    let fragmentId: string
    try {
      fragmentId = decodeURIComponent(initialHash.slice(1))
    } catch {
      return
    }

    const targetExists = () => document.getElementById(fragmentId)
      || Array.from(document.querySelectorAll<HTMLElement>('[data-anchor-id]'))
        .some((target) => target.dataset.anchorId === fragmentId)

    const root = document.documentElement
    const fontsComplete = () => root.dataset.fontsReady === 'ready' || root.dataset.fontsReady === 'fallback'
    if (!root.dataset.initialHash && fontsComplete()) return

    fragmentObserver = new MutationObserver(() => {
      const pageState = shell.dataset.pageLoadState
      const hasTarget = Boolean(targetExists())
      if (pageState === 'ready' && hasTarget) updateState()

      // Fragment restoration and deferred fonts can finish after the page chunk.
      // Read the real geometry at those boundaries, even if scroll/IO is late.
      const fragmentFinished = !root.dataset.initialHash
        && (fontsComplete() || window.location.hash !== initialHash)
      if (fragmentFinished || pageState === 'error' || (pageState === 'ready' && !hasTarget)) {
        updateState()
        fragmentObserver?.disconnect()
        fragmentObserver = null
      }
    })
    fragmentObserver.observe(root, {
      attributes: true,
      attributeFilter: ['data-page-load-state', 'data-initial-hash', 'data-fonts-ready'],
      childList: true,
      subtree: true
    })
  }

  onMounted(() => {
    updateState()
    observeDeferredInitialFragment()
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
    fragmentObserver?.disconnect()
    fragmentObserver = null
  })

  return { headerState, sentinelRef }
}
