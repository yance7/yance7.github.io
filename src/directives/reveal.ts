import type { Directive, DirectiveBinding } from 'vue'

type RevealVariant = 'fade-up' | 'fade-left' | 'fade-right' | 'clip' | 'scale' | 'blur'
type RevealValue = number | { delay?: number; variant?: RevealVariant }

const tracked = new WeakMap<HTMLElement, IntersectionObserver>()
let observer: IntersectionObserver | null = null

function getObserver() {
  if (!observer) {
    observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        const element = entry.target as HTMLElement
        element.classList.add('revealed')
        currentObserver.unobserve(element)
        tracked.delete(element)
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
    if (!('IntersectionObserver' in window)) {
      revealImmediately(element)
      return
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      revealImmediately(element)
      return
    }

    const { delay, variant } = resolveValue(binding.value)
    element.dataset.revealVariant = variant
    element.style.transitionDelay = delay > 0 ? `${delay}ms` : ''
    element.classList.add('reveal')

    const currentObserver = getObserver()
    tracked.set(element, currentObserver)
    currentObserver.observe(element)
  },

  updated(element, binding: DirectiveBinding<RevealValue>) {
    if (binding.value === binding.oldValue) return
    const { delay, variant } = resolveValue(binding.value)
    element.dataset.revealVariant = variant
    element.style.transitionDelay = delay > 0 ? `${delay}ms` : ''
  },

  unmounted(element) {
    tracked.get(element)?.unobserve(element)
    tracked.delete(element)
    element.style.removeProperty('transition-delay')
  }
}

export default reveal
