import { nextTick, onBeforeUnmount, onMounted, watch, type Ref } from 'vue'

// Preserves and restores the home reading position across back-forward
// navigation after locale and hero fonts settle, without vertical scroll-snap.
export function useHomeScrollSnap(isHome: boolean, ready: Ref<boolean>) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  let fontsObserver: MutationObserver | undefined
  let greetingFontObserver: MutationObserver | undefined
  let mounted = false
  let restorationCancelled = false
  let leaving = false
  let previousHistoryRestoration: ScrollRestoration | undefined
  const initialHref = window.location.href
  let sameDocumentNavigation = false
  const returning = performance.getEntriesByType('navigation')
    .some(entry => (entry as PerformanceNavigationTiming).type === 'back_forward')
  let savedPosition = isHome && returning && !window.location.hash && !document.documentElement.dataset.initialHash
    ? window.history?.state?.homeReadingPosition as { top: number, left: number } | undefined
    : undefined
  const root = document.documentElement
  if (isHome && !window.location.hash && !root.dataset.initialHash) {
    previousHistoryRestoration = window.history.state?.homeReadingRestoration ?? window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
  }
  if (savedPosition && Number.isFinite(savedPosition.top) && Number.isFinite(savedPosition.left)) {
    root.dataset.homeScrollRestore = 'true'
    // The browser's later load-time restoration must not compete with either
    // our font-gated restore or input that cancels it.
    window.history.scrollRestoration = 'manual'
  } else savedPosition = undefined

  function cancelRestoration() {
    restorationCancelled = true
    savedPosition = undefined
    delete root.dataset.homeScrollRestore
    fontsObserver?.disconnect()
    fontsObserver = undefined
    greetingFontObserver?.disconnect()
    greetingFontObserver = undefined
  }
  function saveReadingPosition() {
    leaving = true
    window.history.replaceState({
      ...window.history.state,
      homeReadingRestoration: previousHistoryRestoration ?? window.history.scrollRestoration,
      homeReadingPosition: { top: window.scrollY, left: window.scrollX }
    }, '')
  }
  function releaseHistoryRestoration() {
    if (previousHistoryRestoration !== undefined && window.history.scrollRestoration === 'manual') {
      window.history.scrollRestoration = previousHistoryRestoration
    }
  }
  function handleHashChange() {
    sameDocumentNavigation = true
    releaseHistoryRestoration()
    cancelRestoration()
  }
  function restoreReadingPosition() {
    if (!mounted || !ready.value || !savedPosition || restorationCancelled) return
    // Locale font CSS loads after mount; document.fonts.ready can resolve
    // before that stylesheet starts loading. main.ts publishes the final state.
    if (root.dataset.fontsReady !== 'ready' && root.dataset.fontsReady !== 'fallback') return
    const greeting = document.querySelector<HTMLElement>('.home-hero-typewriter')
    if (greeting?.dataset.fontState === 'loading') {
      if (!greetingFontObserver) {
        greetingFontObserver = new MutationObserver(restoreReadingPosition)
        greetingFontObserver.observe(greeting, { attributes: true, attributeFilter: ['data-font-state'] })
      }
      if (greeting.dataset.fontState === 'loading') return
    }
    greetingFontObserver?.disconnect()
    greetingFontObserver = undefined
    const position = savedPosition
    savedPosition = undefined
    fontsObserver?.disconnect()
    fontsObserver = undefined
    // Wait for Vue's content commit, rather than a foreground animation frame.
    // History restoration must not depend on foreground RAF delivery.
    void nextTick(() => {
      if (!mounted || restorationCancelled) return
      window.scrollTo({ top: position.top, left: position.left, behavior: 'instant' })
      delete root.dataset.homeScrollRestore
    })
  }
  function handleKey(event: KeyboardEvent) {
    if (['Tab', 'PageDown', 'PageUp', 'Home', 'End', 'ArrowDown', 'ArrowUp', ' '].includes(event.key)
      || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f')) cancelRestoration()
  }
  function handleAnchor(event: MouseEvent) {
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null
    if (!link) return
    const url = new URL(link.href, window.location.href)
    if (url.origin === window.location.origin && url.pathname === window.location.pathname
      && url.search === window.location.search && url.hash) {
      sameDocumentNavigation = true
      releaseHistoryRestoration()
      cancelRestoration()
    }
  }
  function handlePageShow(event: PageTransitionEvent) {
    leaving = false
    if (event.persisted) cancelRestoration()
  }
  function handleHistoryChange() {
    // The initial cross-document traversal can emit popstate after mount.
    // Only a subsequent same-document navigation releases this page's lease.
    if (!sameDocumentNavigation && window.location.href === initialHref) return
    sameDocumentNavigation = true
    releaseHistoryRestoration()
    cancelRestoration()
  }
  watch(ready, () => {
    restoreReadingPosition()
  })
  onMounted(() => {
    if (!isHome) return
    mounted = true
    document.addEventListener('click', handleAnchor, true)
    document.addEventListener('focusin', cancelRestoration)
    document.addEventListener('keydown', handleKey)
    document.addEventListener('pointerdown', cancelRestoration, { passive: true })
    document.addEventListener('touchstart', cancelRestoration, { passive: true })
    window.addEventListener('hashchange', handleHashChange)
    window.addEventListener('popstate', handleHistoryChange)
    window.addEventListener('pageshow', handlePageShow)
    window.addEventListener('pagehide', saveReadingPosition)
    window.addEventListener('wheel', cancelRestoration, { passive: true })
    if (savedPosition) {
      fontsObserver = new MutationObserver(restoreReadingPosition)
      fontsObserver.observe(root, { attributes: true, attributeFilter: ['data-fonts-ready'] })
    }
    restoreReadingPosition()
  })
  onBeforeUnmount(() => {
    mounted = false
    cancelRestoration()
    if (!leaving) releaseHistoryRestoration()
    document.removeEventListener('click', handleAnchor, true)
    document.removeEventListener('focusin', cancelRestoration)
    document.removeEventListener('keydown', handleKey)
    document.removeEventListener('pointerdown', cancelRestoration)
    document.removeEventListener('touchstart', cancelRestoration)
    window.removeEventListener('hashchange', handleHashChange)
    window.removeEventListener('popstate', handleHistoryChange)
    window.removeEventListener('pageshow', handlePageShow)
    window.removeEventListener('pagehide', saveReadingPosition)
    window.removeEventListener('wheel', cancelRestoration)
  })
}
