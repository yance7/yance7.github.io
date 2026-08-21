import type { Directive, DirectiveBinding } from 'vue'
import { getRevealMode } from '../utils/reveal'

type RevealVariant = 'fade-up' | 'fade-left' | 'fade-right' | 'clip' | 'scale' | 'blur'
type RevealValue = number | { delay?: number; variant?: RevealVariant }

const tracked = new Set<HTMLElement>()
let observer: IntersectionObserver | null = null

function revealElement(element: HTMLElement, currentObserver: IntersectionObserver) {
  element.classList.add('revealed')
  currentObserver.unobserve(element)
  tracked.delete(element)
}

function getObserver() {
  if (!observer) {
    observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        const element = entry.target as HTMLElement
        revealElement(element, currentObserver)
      })

      const viewportBottom = window.innerHeight
      tracked.forEach((element) => {
        if (element.getBoundingClientRect().top < viewportBottom) {
          revealElement(element, currentObserver)
        }
      })
    }, { threshold: 0.08, rootMargin: '0px 0px -60px 0px' })
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

    const { delay, variant } = resolveValue(binding.value)
    element.dataset.revealVariant = variant
    element.style.transitionDelay = delay > 0 ? `${delay}ms` : ''
    element.classList.add('reveal')

    const currentObserver = getObserver()
    tracked.add(element)
    currentObserver.observe(element)
  },

  updated(element, binding: DirectiveBinding<RevealValue>) {
    if (binding.value === binding.oldValue) return
    const { delay, variant } = resolveValue(binding.value)
    element.dataset.revealVariant = variant
    element.style.transitionDelay = delay > 0 ? `${delay}ms` : ''
  },

  unmounted(element) {
    observer?.unobserve(element)
    tracked.delete(element)
    element.style.removeProperty('transition-delay')
  }
}

export default reveal
