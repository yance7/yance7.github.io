export interface RevealModeInput {
  supportsIntersectionObserver: boolean
  prefersReducedMotion: boolean
}

export type RevealMode = 'observer' | 'immediate'

export function isInInitialViewport(rect: Pick<DOMRect, 'top' | 'bottom'>, viewportHeight: number) {
  return rect.bottom > 0 && rect.top < viewportHeight
}

export function getRevealMode({ supportsIntersectionObserver, prefersReducedMotion }: RevealModeInput): RevealMode {
  if (!supportsIntersectionObserver || prefersReducedMotion) return 'immediate'
  return 'observer'
}
