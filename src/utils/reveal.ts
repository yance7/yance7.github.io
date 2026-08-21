export interface RevealModeInput {
  supportsIntersectionObserver: boolean
  prefersReducedMotion: boolean
}

export type RevealMode = 'observer' | 'immediate'

export function getRevealMode({ supportsIntersectionObserver, prefersReducedMotion }: RevealModeInput): RevealMode {
  if (!supportsIntersectionObserver || prefersReducedMotion) return 'immediate'
  return 'observer'
}
