import { onBeforeUnmount, onMounted, watch, type Ref } from 'vue'

// Browser navigation, focus, find and keyboard scroll retain control until
// the next pointer scroll. No wheel movement is consumed or rewritten.
export function useHomeScrollSnap(isHome: boolean, ready: Ref<boolean>) {
  let desktop: MediaQueryList | undefined
  let reduced: MediaQueryList | undefined
  let bodyObserver: MutationObserver | undefined
  let fontsObserver: MutationObserver | undefined
  let mounted = false
  let restorationFrame: number | undefined
  let restorationCancelled = false
  const returning = performance.getEntriesByType('navigation')
    .some(entry => (entry as PerformanceNavigationTiming).type === 'back_forward')
  let savedPosition = isHome && returning && !window.location.hash
    ? window.history?.state?.homeReadingPosition as { top: number, left: number } | undefined
    : undefined
  let suspended = Boolean(window.location.hash || document.documentElement.dataset.initialHash)
  const root = document.documentElement
  if (savedPosition && Number.isFinite(savedPosition.top) && Number.isFinite(savedPosition.left)) {
    suspended = true
    root.dataset.homeScrollRestore = 'true'
  } else savedPosition = undefined

  function update() {
    const footer = document.querySelector<HTMLElement>('.site-footer')
    const footerInView = footer && footer.getBoundingClientRect().top < window.innerHeight
    const enabled = mounted && isHome && ready.value && desktop?.matches && !reduced?.matches
      && !suspended && !footerInView && document.body.style.overflow !== 'hidden'
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
    if (restorationFrame !== undefined) window.cancelAnimationFrame(restorationFrame)
    restorationFrame = undefined
  }
  function saveReadingPosition() {
    window.history.replaceState({
      ...window.history.state,
      homeReadingPosition: { top: window.scrollY, left: window.scrollX }
    }, '')
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
    // Native restoration can run while the async page still has only Hero's
    // height. Restore its history-entry position once content/fonts are ready.
    restorationFrame = window.requestAnimationFrame(() => {
      restorationFrame = undefined
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
    if (url.pathname === window.location.pathname && url.hash) suspend()
  }
  function handlePageShow(event: PageTransitionEvent) {
    if (event.persisted) suspend()
  }
  function handleHistoryChange() {
    suspended = true
    update()
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
    window.addEventListener('hashchange', suspend)
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
    root.classList.remove('home-scroll-snap')
    desktop?.removeEventListener('change', update)
    reduced?.removeEventListener('change', update)
    document.removeEventListener('click', handleAnchor, true)
    document.removeEventListener('focusin', suspend)
    document.removeEventListener('keydown', handleKey)
    document.removeEventListener('pointerdown', suspend)
    document.removeEventListener('touchstart', suspend)
    window.removeEventListener('hashchange', suspend)
    window.removeEventListener('popstate', handleHistoryChange)
    window.removeEventListener('pageshow', handlePageShow)
    window.removeEventListener('pagehide', saveReadingPosition)
    window.removeEventListener('wheel', handlePointerScroll)
    window.removeEventListener('scroll', update)
    bodyObserver?.disconnect()
  })
}
