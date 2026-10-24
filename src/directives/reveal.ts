import type { Directive } from 'vue'
import { getRevealMode, getRevealObserverOptions, isInInitialViewport, normalizeRevealDelay, revealMaxDelay, type RevealProfile } from '../utils/reveal'
import { decodeHashTarget } from '../utils/navigation'

type RevealValue = number | { delay?: number, profile?: RevealProfile }
const observers = new Map<RevealProfile, IntersectionObserver>()
const observedElements = new Map<HTMLElement, RevealProfile>()
const mountedElements = new Set<HTMLElement>()
const revealedElements = new WeakSet<HTMLElement>()
let bottomResizeObserver: ResizeObserver | null = null
let motionQuery: MediaQueryList | null = null
let listening = false
let restoreFrame: number | undefined
let immediateFrame: number | undefined
const immediateElements = new Set<HTMLElement>()

function resolveOptions(value: RevealValue | undefined) {
  return {
    delay: normalizeRevealDelay(typeof value === 'number' ? value : value?.delay),
    profile: typeof value === 'object' ? value.profile ?? 'default' : 'default'
  }
}

function disconnectIfIdle() {
  for (const [profile, observer] of observers) {
    if ([...observedElements.values()].includes(profile)) continue
    observer.disconnect()
    observers.delete(profile)
  }
  if (!observedElements.size && listening) {
    window.removeEventListener('scroll', handleScroll)
    bottomResizeObserver?.disconnect()
    bottomResizeObserver = null
  }
  // Focus/hash can arrive during a reveal's delay or fade after unobserve.
  // Keep navigation and preference listeners for this mounted page instance.
  if (mountedElements.size || !listening) return
  window.removeEventListener('hashchange', handleHashChange)
  window.removeEventListener('popstate', handleRestore)
  window.removeEventListener('pageshow', handleRestore)
  document.removeEventListener('focusin', handleFocus)
  motionQuery?.removeEventListener('change', handleMotionChange)
  motionQuery = null
  if (restoreFrame !== undefined) window.cancelAnimationFrame(restoreFrame)
  restoreFrame = undefined
  listening = false
}

function revealElement(element: HTMLElement, immediate = false) {
  revealedElements.add(element)
  if (immediate) {
    element.dataset.revealImmediate = 'true'
    element.style.transitionDelay = '0ms'
    immediateElements.add(element)
    if (immediateFrame === undefined) {
      immediateFrame = window.requestAnimationFrame(() => {
        immediateFrame = undefined
        immediateElements.forEach(target => { delete target.dataset.revealImmediate })
        immediateElements.clear()
      })
    }
  }
  element.classList.add('revealed')
  if (immediate) element.getBoundingClientRect()
  const profile = observedElements.get(element)
  if (profile) observers.get(profile)?.unobserve(element)
  observedElements.delete(element)
  disconnectIfIdle()
}

export function revealForNavigation(target: HTMLElement) {
  for (const element of mountedElements) {
    if (!element.contains(target) && !target.contains(element)) continue
    if (
      revealedElements.has(element)
      && element.classList.contains('revealed')
      && getComputedStyle(element).opacity === '1'
    ) continue
    revealElement(element, true)
  }
}

function handleFocus(event: FocusEvent) {
  if (event.target instanceof HTMLElement) revealForNavigation(event.target)
}

function handleHashChange() {
  const id = decodeHashTarget(window.location.hash)
  const target = id ? document.getElementById(id) : null
  if (target) revealForNavigation(target)
}

function handleRestore() {
  if (restoreFrame !== undefined) window.cancelAnimationFrame(restoreFrame)
  restoreFrame = window.requestAnimationFrame(() => {
    restoreFrame = undefined
    for (const element of [...observedElements.keys()]) {
      if (isInInitialViewport(element.getBoundingClientRect(), window.innerHeight)) revealElement(element, true)
    }
    handleHashChange()
  })
}

function handleMotionChange() {
  if (!motionQuery?.matches) return
  for (const element of [...document.querySelectorAll<HTMLElement>('.reveal')]) revealElement(element, true)
}

function handleScroll() {
  if (window.scrollY + window.innerHeight < document.documentElement.scrollHeight - revealMaxDelay) return
  for (const element of [...observedElements.keys()]) revealElement(element)
}

function startListeners() {
  if (listening) return
  listening = true
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('hashchange', handleHashChange)
  window.addEventListener('popstate', handleRestore)
  window.addEventListener('pageshow', handleRestore)
  document.addEventListener('focusin', handleFocus)
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  motionQuery.addEventListener('change', handleMotionChange)
  if ('ResizeObserver' in window) {
    bottomResizeObserver = new ResizeObserver(handleScroll)
    bottomResizeObserver.observe(document.documentElement)
  }
}

function getObserver(profile: RevealProfile) {
  let observer = observers.get(profile)
  if (!observer) {
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) revealElement(entry.target as HTMLElement)
      })
    }, getRevealObserverOptions(profile))
    observers.set(profile, observer)
  }
  return observer
}

function revealImmediately(element: HTMLElement) {
  revealedElements.add(element)
  element.classList.add('reveal', 'revealed')
  element.style.removeProperty('transition-delay')
}

const reveal: Directive<HTMLElement, RevealValue> = {
  mounted(element, binding) {
    mountedElements.add(element)
    const { delay, profile } = resolveOptions(binding.value)
    if (profile === 'home') element.dataset.revealProfile = profile
    const mode = getRevealMode({
      supportsIntersectionObserver: 'IntersectionObserver' in window,
      prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
    })
    const id = decodeHashTarget(window.location?.hash ?? '')
    const hashSection = id ? element.closest('[id]')?.id === id : false
    if (mode === 'immediate' || isInInitialViewport(element.getBoundingClientRect(), window.innerHeight) || hashSection
      || (profile === 'home' && document.documentElement.dataset.homeScrollRestore === 'true')) {
      revealImmediately(element)
      return
    }
    // Keep content visible if observation cannot be installed.
    try {
      const observer = getObserver(profile)
      observer.observe(element)
      observedElements.set(element, profile)
      startListeners()
      element.dataset.revealPreparing = 'true'
      element.classList.add('reveal')
      element.style.transitionDelay = delay > 0 ? `${delay}ms, ${delay}ms, 0ms, 0ms, 0ms, 0ms` : ''
      element.getBoundingClientRect()
      delete element.dataset.revealPreparing
      handleScroll()
    } catch {
      delete element.dataset.revealPreparing
      revealElement(element, true)
      revealImmediately(element)
    }
  },
  updated(element, binding) {
    const { delay, profile } = resolveOptions(binding.value)
    // Vue can replace className when a component's unrelated state changes.
    // The directive owns reveal state independently of those dynamic classes.
    element.classList.add('reveal')
    if (revealedElements.has(element)) element.classList.add('revealed')
    if (profile === 'home' && revealedElements.has(element)) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      revealElement(element, true)
      return
    }
    element.style.transitionDelay = delay > 0 ? `${delay}ms, ${delay}ms, 0ms, 0ms, 0ms, 0ms` : ''
  },
  unmounted(element) {
    mountedElements.delete(element)
    revealedElements.delete(element)
    const profile = observedElements.get(element)
    if (profile) observers.get(profile)?.unobserve(element)
    observedElements.delete(element)
    immediateElements.delete(element)
    if (!immediateElements.size && immediateFrame !== undefined) {
      window.cancelAnimationFrame(immediateFrame)
      immediateFrame = undefined
    }
    element.style.removeProperty('transition-delay')
    disconnectIfIdle()
  }
}

export default reveal
