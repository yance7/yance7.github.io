export interface RevealModeInput {
  supportsIntersectionObserver: boolean
  prefersReducedMotion: boolean
}

export type RevealMode = 'observer' | 'immediate'
export type RevealProfile = 'default' | 'home'

export function getRevealObserverOptions(profile: RevealProfile = 'default'): IntersectionObserverInit {
  return profile === 'home'
    ? { threshold: 0.1, rootMargin: '0px 0px -8% 0px' }
    : { threshold: 0.08, rootMargin: '0px 0px 120px 0px' }
}

export const revealMaxDelay = 240

export function normalizeRevealDelay(delay = 0) {
  if (!Number.isFinite(delay)) return 0
  return Math.min(revealMaxDelay, Math.max(0, Math.round(delay)))
}

export function isInInitialViewport(rect: Pick<DOMRect, 'top' | 'bottom'>, viewportHeight: number) {
  return rect.bottom > 0 && rect.top < viewportHeight
}

export function getRevealMode({ supportsIntersectionObserver, prefersReducedMotion }: RevealModeInput): RevealMode {
  if (!supportsIntersectionObserver || prefersReducedMotion) return 'immediate'
  return 'observer'
}
