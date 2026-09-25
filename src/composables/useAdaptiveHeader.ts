import { onMounted, onUnmounted, ref } from 'vue'

export type HeaderState = 'resting' | 'floating'

export function useAdaptiveHeader() {
  const headerState = ref<HeaderState>('resting')
  const sentinelRef = ref<HTMLElement | null>(null)
  let observer: IntersectionObserver | null = null
  let fragmentObserver: MutationObserver | null = null
  let fragmentFrame: number | undefined

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

    if (targetExists()) return

    fragmentObserver = new MutationObserver(() => {
      if (targetExists() && shell.dataset.pageLoadState === 'ready') {
        fragmentObserver?.disconnect()
        fragmentObserver = null
        fragmentFrame = window.requestAnimationFrame(() => {
          fragmentFrame = undefined
          updateState()
        })
        return
      }

      if (shell.dataset.pageLoadState === 'ready' || shell.dataset.pageLoadState === 'error') {
        fragmentObserver?.disconnect()
        fragmentObserver = null
      }
    })
    fragmentObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-page-load-state'],
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
    if (fragmentFrame !== undefined) window.cancelAnimationFrame(fragmentFrame)
    fragmentFrame = undefined
  })

  return { headerState, sentinelRef }
}
