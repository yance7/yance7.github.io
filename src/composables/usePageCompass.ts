import { computed, nextTick, onMounted, onUnmounted, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { useScrollProgress } from './useScrollProgress'
import type { PageCompassSection } from '../data/types'
import {
  chooseActiveSection,
  MOBILE_COMPASS_SCROLL_DELTA,
  MOBILE_COMPASS_TOP_THRESHOLD,
  transitionMobileCompassState,
  type CompassScrollState
} from '../utils/pageCompass'
import { decodeHashTarget } from '../utils/navigation'

export function usePageCompass(sections: MaybeRefOrGetter<readonly PageCompassSection[]>) {
  const sectionList = computed(() => toValue(sections))
  const { progress, percent } = useScrollProgress()
  const initialMobileViewport = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(max-width: 760px)').matches
  const activeId = ref(sectionList.value[0]?.id ?? '')
  const mobileViewport = ref(initialMobileViewport)
  const mobileCompassState = ref<CompassScrollState>(initialMobileViewport ? 'quiet' : 'visible')
  const mobileFocusWithin = ref(false)
  // Focus visibility outranks scroll-driven hiding so keyboard users never lose the active control.
  const mobileVisible = computed(() => (
    !mobileViewport.value || mobileFocusWithin.value || mobileCompassState.value === 'visible'
  ))
  const mobileDataState = computed(() => mobileVisible.value ? 'visible' : mobileCompassState.value)
  const activeIndex = computed(() => Math.max(0, sectionList.value.findIndex((section) => section.id === activeId.value)))
  const activeSection = computed(() => sectionList.value[activeIndex.value] ?? sectionList.value[0])
  const previousSection = computed(() => sectionList.value[activeIndex.value - 1])
  const nextSection = computed(() => sectionList.value[activeIndex.value + 1])
  const progressStyle = computed(() => ({ '--page-progress': `${percent.value * 3.6}deg` }))

  let observer: IntersectionObserver | null = null
  let mobileQuery: MediaQueryList | null = null
  let removeMobileQueryListener: (() => void) | null = null
  let mobileIdleTimer: number | null = null
  let lastScrollY = 0
  let mounted = false
  let hashNavigationId: string | null = null
  let hashNavigationSettled = false
  const visibleEntries = new Map<string, IntersectionObserverEntry>()

  function disconnectTargets() {
    observer?.disconnect()
    observer = null
    visibleEntries.clear()
  }

  function chooseFromVisibleEntries() {
    if (hashNavigationId) {
      const target = document.getElementById(hashNavigationId)
      const targetTop = target?.getBoundingClientRect().top
      const readingWindow = Math.max(160, window.innerHeight * .24)
      const hasTargetTop = typeof targetTop === 'number' && Number.isFinite(targetTop)
      const hashTargetIsInReadingWindow = hasTargetTop
        && targetTop! >= -24
        && targetTop! <= readingWindow
      if (!hashNavigationSettled) {
        if (hashTargetIsInReadingWindow) hashNavigationSettled = true
        activeId.value = hashNavigationId
        return
      }
      if (hashTargetIsInReadingWindow) {
        activeId.value = hashNavigationId
        return
      }
      hashNavigationId = null
      hashNavigationSettled = false
    }

    const fallbackId = sectionList.value[activeIndex.value]?.id ?? sectionList.value[0]?.id ?? ''
    const candidates = Array.from(visibleEntries.entries()).map(([id, entry]) => ({
      id,
      index: sectionList.value.findIndex((section) => section.id === id),
      top: entry.boundingClientRect.top,
      isIntersecting: entry.isIntersecting
    })).filter((candidate) => candidate.index >= 0)
    const nextId = chooseActiveSection(candidates, window.innerHeight * .24, fallbackId)
    if (nextId) activeId.value = nextId
  }

  function observeTargets() {
    disconnectTargets()
    const targets = sectionList.value
      .map((section) => document.getElementById(section.id))
      .filter((target): target is HTMLElement => Boolean(target))

    if (!targets.length || !('IntersectionObserver' in window)) return
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const id = (entry.target as HTMLElement).id
        if (entry.isIntersecting) visibleEntries.set(id, entry)
        else visibleEntries.delete(id)
      })
      chooseFromVisibleEntries()
    }, { rootMargin: '-24% 0px -64% 0px', threshold: 0 })
    targets.forEach((target) => observer?.observe(target))
  }

  function setupTargets() {
    if (!mounted) return
    // Resolve the hash after async page content mounts, then observe the final section nodes.
    const hashTarget = decodeHashTarget(window.location.hash)
    hashNavigationId = hashTarget && sectionList.value.some((section) => section.id === hashTarget) ? hashTarget : null
    hashNavigationSettled = false
    if (hashNavigationId) {
      activeId.value = hashNavigationId
    }
    void nextTick(observeTargets)
  }

  function clearMobileIdleTimer() {
    if (mobileIdleTimer === null) return
    window.clearTimeout(mobileIdleTimer)
    mobileIdleTimer = null
  }

  function currentScrollY() {
    return Math.max(0, window.scrollY || document.documentElement.scrollTop)
  }

  function releaseHashNavigation() {
    if (!hashNavigationId) return
    chooseFromVisibleEntries()
  }

  function scheduleMobileIdleReveal() {
    clearMobileIdleTimer()
    mobileIdleTimer = window.setTimeout(() => {
      mobileIdleTimer = null
      mobileCompassState.value = currentScrollY() <= MOBILE_COMPASS_TOP_THRESHOLD ? 'quiet' : 'visible'
    }, 420)
  }

  function handleMobileScroll() {
    const scrollY = currentScrollY()
    releaseHashNavigation()
    const nextState = transitionMobileCompassState({
      state: mobileCompassState.value,
      scrollTop: scrollY,
      previousScrollTop: lastScrollY,
      topThreshold: MOBILE_COMPASS_TOP_THRESHOLD,
      directionThreshold: MOBILE_COMPASS_SCROLL_DELTA
    })
    lastScrollY = scrollY
    if (!mobileViewport.value) return

    mobileCompassState.value = nextState
    if (scrollY > MOBILE_COMPASS_TOP_THRESHOLD) scheduleMobileIdleReveal()
    else clearMobileIdleTimer()
  }

  function handleCompassFocusOut(event: FocusEvent) {
    const currentTarget = event.currentTarget
    const relatedTarget = event.relatedTarget
    if (currentTarget instanceof HTMLElement && relatedTarget instanceof Node && currentTarget.contains(relatedTarget)) return
    mobileFocusWithin.value = false
  }

  function handleCompassFocusIn() {
    mobileFocusWithin.value = true
  }

  function selectSection(id: string) {
    if (!sectionList.value.some((section) => section.id === id)) return
    hashNavigationId = id
    hashNavigationSettled = false
    activeId.value = id
  }

  function goTop() {
    hashNavigationId = null
    hashNavigationSettled = false
    activeId.value = sectionList.value[0]?.id ?? ''

    if (window.location.hash) {
      window.history.replaceState(
        window.history.state,
        '',
        `${window.location.pathname}${window.location.search}`
      )
    }

    window.scrollTo(0, 0)
    window.requestAnimationFrame(() => window.scrollTo(0, 0))
  }

  function handleHashChange() {
    setupTargets()
  }

  function syncMobileViewport(event?: MediaQueryListEvent) {
    mobileViewport.value = event?.matches ?? mobileQuery?.matches ?? window.innerWidth <= 760
    lastScrollY = currentScrollY()
    clearMobileIdleTimer()
    mobileCompassState.value = !mobileViewport.value || lastScrollY > MOBILE_COMPASS_TOP_THRESHOLD ? 'visible' : 'quiet'
  }

  function addMobileQueryListener(query: MediaQueryList) {
    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', syncMobileViewport)
      return () => query.removeEventListener('change', syncMobileViewport)
    }
    query.addListener(syncMobileViewport)
    return () => query.removeListener(syncMobileViewport)
  }

  onMounted(() => {
    mounted = true
    mobileQuery = window.matchMedia('(max-width: 760px)')
    syncMobileViewport()
    removeMobileQueryListener = addMobileQueryListener(mobileQuery)
    window.addEventListener('scroll', handleMobileScroll, { passive: true })
    window.addEventListener('hashchange', handleHashChange)
    setupTargets()
  })

  watch(sectionList, () => {
    activeId.value = sectionList.value[0]?.id ?? ''
    setupTargets()
  }, { deep: true })

  onUnmounted(() => {
    mounted = false
    disconnectTargets()
    removeMobileQueryListener?.()
    removeMobileQueryListener = null
    window.removeEventListener('scroll', handleMobileScroll)
    window.removeEventListener('hashchange', handleHashChange)
    clearMobileIdleTimer()
  })

  return {
    progress,
    percent,
    activeIndex,
    activeSection,
    previousSection,
    nextSection,
    mobileState: mobileCompassState,
    mobileViewport,
    mobileVisible,
    mobileDataState,
    progressStyle,
    activeId,
    handleCompassFocusIn,
    handleCompassFocusOut,
    selectSection,
    goTop
  }
}
