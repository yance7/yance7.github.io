import type { Directive, DirectiveBinding } from 'vue'
import { getRevealMode, isInInitialViewport } from '../utils/reveal'

type RevealVariant = 'fade-up' | 'fade-left' | 'fade-right' | 'clip' | 'scale' | 'blur'
type RevealValue = number | { delay?: number; variant?: RevealVariant }

let observer: IntersectionObserver | null = null
let bottomRevealFrame: number | null = null
let reachedDocumentEnd = false
const documentEndBuffer = 240

function revealElement(element: HTMLElement, currentObserver: IntersectionObserver) {
  element.classList.add('revealed')
  currentObserver.unobserve(element)
}

function revealRemainingAtDocumentEnd() {
  if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - documentEndBuffer) {
    reachedDocumentEnd = true
  }
  if (!reachedDocumentEnd) return

  document.querySelectorAll<HTMLElement>('.reveal:not(.revealed)').forEach((element) => {
    element.classList.add('revealed')
    observer?.unobserve(element)
  })
}

function handleScroll() {
  if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - documentEndBuffer) {
    reachedDocumentEnd = true
  }
  if (bottomRevealFrame !== null) return

  bottomRevealFrame = window.requestAnimationFrame(() => {
    bottomRevealFrame = null
    revealRemainingAtDocumentEnd()
  })
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
      const resizeObserver = new ResizeObserver(() => {
        if (reachedDocumentEnd) revealRemainingAtDocumentEnd()
      })
      resizeObserver.observe(document.documentElement)
    }
  }
  return observer
}

function resolveValue(value: RevealValue | undefined) {
  if (typeof value === 'number') return { delay: value, variant: 'fade-up' as RevealVariant }
  return {
    delay: value?.delay ?? 0,
    variant: value?.variant ?? 'fade-up' as RevealVariant
  }
}

function revealImmediately(element: HTMLElement) {
  element.classList.add('revealed')
  element.style.removeProperty('transition-delay')
}

const reveal: Directive<HTMLElement, RevealValue> = {
  mounted(element, binding) {
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

    const { delay, variant } = resolveValue(binding.value)
    element.dataset.revealVariant = variant
    element.style.transitionDelay = delay > 0 ? `${delay}ms` : ''
    element.classList.add('reveal')

    const currentObserver = getObserver()
    currentObserver.observe(element)
    revealRemainingAtDocumentEnd()
  },

  updated(element, binding: DirectiveBinding<RevealValue>) {
    if (binding.value === binding.oldValue) return
    const { delay, variant } = resolveValue(binding.value)
    element.dataset.revealVariant = variant
    element.style.transitionDelay = delay > 0 ? `${delay}ms` : ''
  },

  unmounted(element) {
    observer?.unobserve(element)
    element.style.removeProperty('transition-delay')
  }
}

export default reveal
