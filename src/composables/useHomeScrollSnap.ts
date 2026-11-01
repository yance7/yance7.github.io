import { nextTick, onBeforeUnmount, onMounted, watch, type Ref } from 'vue'

// Browser navigation, focus, find and keyboard scroll retain control until
// the next pointer scroll. No wheel movement is consumed or rewritten.
export function useHomeScrollSnap(isHome: boolean, ready: Ref<boolean>) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  let desktop: MediaQueryList | undefined
  let reduced: MediaQueryList | undefined
  let bodyObserver: MutationObserver | undefined
  let fontsObserver: MutationObserver | undefined
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
  let suspended = Boolean(window.location.hash || document.documentElement.dataset.initialHash)
  const root = document.documentElement
  if (savedPosition && Number.isFinite(savedPosition.top) && Number.isFinite(savedPosition.left)) {
    suspended = true
    root.dataset.homeScrollRestore = 'true'
    // The browser's later load-time restoration must not compete with either
    // our font-gated restore or input that cancels it.
    previousHistoryRestoration = window.history.state?.homeReadingRestoration ?? window.history.scrollRestoration
    window.history.replaceState({ ...window.history.state, homeReadingRestoration: previousHistoryRestoration }, '')
    window.history.scrollRestoration = 'manual'
  } else savedPosition = undefined

  function update() {
    const footer = document.querySelector<HTMLElement>('.site-footer')
    const footerInView = footer && footer.getBoundingClientRect().top < window.innerHeight
    // Release the last chapter's tail before the footer enters the viewport.
    // Otherwise proximity can pull scrollIntoView back to the final snap target.
    const lastSection = document.querySelector<HTMLElement>('#home-beyond')
    const pastLastChapter = lastSection && lastSection.getBoundingClientRect().top < 0
    const enabled = mounted && isHome && ready.value && desktop?.matches && !reduced?.matches
      && !suspended && !footerInView && !pastLastChapter && document.body.style.overflow !== 'hidden'
    root.classList.toggle('home-scroll-snap', Boolean(enabled))
  }
  function suspend() {
    cancelRestoration()
    suspended = true
    update()
  }
  function handlePointerScroll() {
    cancelRestoration()
    suspended = false
    update()
  }
  function cancelRestoration() {
    restorationCancelled = true
    savedPosition = undefined
    delete root.dataset.homeScrollRestore
    fontsObserver?.disconnect()
    fontsObserver = undefined
  }
  function saveReadingPosition() {
    leaving = true
    window.history.replaceState({
      ...window.history.state,
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
    suspend()
  }
  function restoreReadingPosition() {
    if (!mounted || !ready.value || !savedPosition || restorationCancelled) return
    // Locale font CSS loads after mount; document.fonts.ready can resolve
    // before that stylesheet starts loading. main.ts publishes the final state.
    if (root.dataset.fontsReady !== 'ready' && root.dataset.fontsReady !== 'fallback') return
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
      update()
    })
  }
  function handleKey(event: KeyboardEvent) {
    if (['Tab', 'PageDown', 'PageUp', 'Home', 'End', 'ArrowDown', 'ArrowUp', ' '].includes(event.key)
      || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f')) suspend()
  }
  function handleAnchor(event: MouseEvent) {
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null
    if (!link) return
    const url = new URL(link.href, window.location.href)
    if (url.origin === window.location.origin && url.pathname === window.location.pathname
      && url.search === window.location.search && url.hash) {
      sameDocumentNavigation = true
      releaseHistoryRestoration()
      suspend()
    }
  }
  function handlePageShow(event: PageTransitionEvent) {
    leaving = false
    if (event.persisted) suspend()
  }
  function handleHistoryChange() {
    // The initial cross-document traversal can emit popstate after mount.
    // Only a subsequent same-document navigation releases this page's lease.
    if (!sameDocumentNavigation && window.location.href === initialHref) return
    sameDocumentNavigation = true
    releaseHistoryRestoration()
    suspend()
  }
  watch(ready, () => {
    update()
    restoreReadingPosition()
  })
  onMounted(() => {
    if (!isHome) return
    mounted = true
    desktop = window.matchMedia('(min-width: 1025px) and (hover: hover) and (pointer: fine)')
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (returning
      || window.scrollY > 0) suspended = true
    desktop.addEventListener('change', update)
    reduced.addEventListener('change', update)
    document.addEventListener('click', handleAnchor, true)
    document.addEventListener('focusin', suspend)
    document.addEventListener('keydown', handleKey)
    document.addEventListener('pointerdown', suspend, { passive: true })
    document.addEventListener('touchstart', suspend, { passive: true })
    window.addEventListener('hashchange', handleHashChange)
    window.addEventListener('popstate', handleHistoryChange)
    window.addEventListener('pageshow', handlePageShow)
    window.addEventListener('pagehide', saveReadingPosition)
    window.addEventListener('wheel', handlePointerScroll, { passive: true })
    window.addEventListener('scroll', update, { passive: true })
    bodyObserver = new MutationObserver(update)
    bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['style'] })
    if (savedPosition) {
      fontsObserver = new MutationObserver(restoreReadingPosition)
      fontsObserver.observe(root, { attributes: true, attributeFilter: ['data-fonts-ready'] })
    }
    update()
    restoreReadingPosition()
  })
  onBeforeUnmount(() => {
    mounted = false
    cancelRestoration()
    if (!leaving) releaseHistoryRestoration()
    root.classList.remove('home-scroll-snap')
    desktop?.removeEventListener('change', update)
    reduced?.removeEventListener('change', update)
    document.removeEventListener('click', handleAnchor, true)
    document.removeEventListener('focusin', suspend)
    document.removeEventListener('keydown', handleKey)
    document.removeEventListener('pointerdown', suspend)
    document.removeEventListener('touchstart', suspend)
    window.removeEventListener('hashchange', handleHashChange)
    window.removeEventListener('popstate', handleHistoryChange)
    window.removeEventListener('pageshow', handlePageShow)
    window.removeEventListener('pagehide', saveReadingPosition)
    window.removeEventListener('wheel', handlePointerScroll)
    window.removeEventListener('scroll', update)
    bodyObserver?.disconnect()
  })
}
