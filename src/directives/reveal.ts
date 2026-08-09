import type { Directive, DirectiveBinding } from 'vue'

type RevealVariant = 'fade-up' | 'fade-left' | 'fade-right' | 'clip' | 'scale' | 'blur'
type RevealValue = number | { delay?: number; variant?: RevealVariant }

const tracked = new WeakMap<HTMLElement, IntersectionObserver>()
const pending = new Set<HTMLElement>()
let observer: IntersectionObserver | null = null
let fallbackListening = false
let fallbackRaf = 0

function stopFallbackIfIdle() {
  if (pending.size || !fallbackListening) return
  window.removeEventListener('scroll', scheduleFallback)
  window.removeEventListener('resize', scheduleFallback)
  fallbackListening = false
}

function revealPassedElements() {
  fallbackRaf = 0
  const revealLine = window.innerHeight - 60

  pending.forEach((element) => {
    const rect = element.getBoundingClientRect()
    if (rect.top > revealLine) return

    if (rect.bottom < 0) revealImmediately(element)
    else element.classList.add('revealed')
    tracked.get(element)?.unobserve(element)
    tracked.delete(element)
    pending.delete(element)
  })

  stopFallbackIfIdle()
}

function scheduleFallback() {
  if (fallbackRaf) return
  fallbackRaf = requestAnimationFrame(revealPassedElements)
}

function startFallback() {
  if (!fallbackListening) {
    window.addEventListener('scroll', scheduleFallback, { passive: true })
    window.addEventListener('resize', scheduleFallback)
    fallbackListening = true
  }
  scheduleFallback()
}

function getObserver() {
  if (!observer) {
    observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        const element = entry.target as HTMLElement
        element.classList.add('revealed')
        currentObserver.unobserve(element)
        tracked.delete(element)
        pending.delete(element)
        stopFallbackIfIdle()
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
    pending.add(element)
    currentObserver.observe(element)
    startFallback()
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
    pending.delete(element)
    stopFallbackIfIdle()
    element.style.removeProperty('transition-delay')
  }
}

export default reveal
