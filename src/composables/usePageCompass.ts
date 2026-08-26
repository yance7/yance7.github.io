import { computed, nextTick, onMounted, onUnmounted, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { useScrollProgress } from './useScrollProgress'
import type { PageCompassSection } from '../data/types'
import { chooseActiveSection } from '../utils/pageCompass'
import { decodeHashTarget } from '../utils/navigation'

export function usePageCompass(sections: MaybeRefOrGetter<readonly PageCompassSection[]>) {
  const sectionList = computed(() => toValue(sections))
  const { progress, percent } = useScrollProgress()
  const activeId = ref(sectionList.value[0]?.id ?? '')
  const activeIndex = computed(() => Math.max(0, sectionList.value.findIndex((section) => section.id === activeId.value)))
  const activeSection = computed(() => sectionList.value[activeIndex.value] ?? sectionList.value[0])

  let observer: IntersectionObserver | null = null
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
    const hashTarget = decodeHashTarget(window.location.hash)
    hashNavigationId = hashTarget && sectionList.value.some((section) => section.id === hashTarget) ? hashTarget : null
    hashNavigationSettled = false
    if (hashNavigationId) activeId.value = hashNavigationId
    void nextTick(observeTargets)
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

    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }

  function handleHashChange() {
    setupTargets()
  }

  onMounted(() => {
    mounted = true
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
    window.removeEventListener('hashchange', handleHashChange)
  })

  return {
    progress,
    percent,
    activeIndex,
    activeSection,
    activeId,
    selectSection,
    goTop
  }
}
