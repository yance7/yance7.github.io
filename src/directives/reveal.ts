import type { Directive, DirectiveBinding } from 'vue'
import { getRevealMode, isInInitialViewport, normalizeRevealDelay, revealMaxDelay } from '../utils/reveal'

type RevealValue = number | { delay?: number }

let observer: IntersectionObserver | null = null
let bottomResizeObserver: ResizeObserver | null = null
let reachedDocumentEnd = false
const observedElements = new Set<HTMLElement>()
const documentEndBuffer = revealMaxDelay

function revealElement(element: HTMLElement, currentObserver: IntersectionObserver) {
  element.classList.add('revealed')
  currentObserver.unobserve(element)
  observedElements.delete(element)
  disconnectObserverIfIdle()
}

function isNearDocumentEnd() {
  return window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - documentEndBuffer
}

function disconnectBottomFallback() {
  window.removeEventListener('scroll', handleScroll)
  bottomResizeObserver?.disconnect()
  bottomResizeObserver = null
}

function disconnectObserverIfIdle() {
  if (observedElements.size) return
  observer?.disconnect()
  observer = null
  disconnectBottomFallback()
  reachedDocumentEnd = false
}

function revealRemainingAtDocumentEnd() {
  if (reachedDocumentEnd || !isNearDocumentEnd()) return
  reachedDocumentEnd = true

  document.querySelectorAll<HTMLElement>('.reveal:not(.revealed)').forEach((element) => {
    element.classList.add('revealed')
    observer?.unobserve(element)
    observedElements.delete(element)
  })
  disconnectObserverIfIdle()
}

function handleScroll() {
  if (reachedDocumentEnd || !isNearDocumentEnd()) return
  revealRemainingAtDocumentEnd()
}

function getObserver() {
  if (!observer) {
    observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        const element = entry.target as HTMLElement
        revealElement(element, currentObserver)
      })
    }, { threshold: 0.08, rootMargin: '0px 0px 120px 0px' })
    window.addEventListener('scroll', handleScroll, { passive: true })
    if ('ResizeObserver' in window) {
      bottomResizeObserver = new ResizeObserver(() => {
        if (!reachedDocumentEnd && isNearDocumentEnd()) revealRemainingAtDocumentEnd()
      })
      bottomResizeObserver.observe(document.documentElement)
    }
  }
  return observer
}

function resolveDelay(value: RevealValue | undefined) {
  return normalizeRevealDelay(typeof value === 'number' ? value : value?.delay)
}

function revealImmediately(element: HTMLElement) {
  element.classList.add('reveal', 'revealed')
  element.style.removeProperty('transition-delay')
}

const reveal: Directive<HTMLElement, RevealValue> = {
  mounted(element, binding) {
    const delay = resolveDelay(binding.value)
    element.classList.add('reveal')
    element.style.transitionDelay = delay > 0 ? `${delay}ms` : ''

    const mode = getRevealMode({
      supportsIntersectionObserver: 'IntersectionObserver' in window,
      prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
    })
    if (mode === 'immediate') {
      revealImmediately(element)
      return
    }

    if (isInInitialViewport(element.getBoundingClientRect(), window.innerHeight)) {
      revealImmediately(element)
      return
    }

    if (reachedDocumentEnd) {
      revealImmediately(element)
      return
    }

    const currentObserver = getObserver()
    observedElements.add(element)
    currentObserver.observe(element)
    revealRemainingAtDocumentEnd()
  },

  updated(element, binding: DirectiveBinding<RevealValue>) {
    if (binding.value === binding.oldValue) return
    const delay = resolveDelay(binding.value)
    element.style.transitionDelay = delay > 0 ? `${delay}ms` : ''
  },

  unmounted(element) {
    observer?.unobserve(element)
    observedElements.delete(element)
    element.style.removeProperty('transition-delay')
    disconnectObserverIfIdle()
  }
}

export default reveal
