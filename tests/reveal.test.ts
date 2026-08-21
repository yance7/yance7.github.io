import { describe, expect, it } from 'vitest'
import { getRevealMode } from '../src/utils/reveal'

describe('reveal mode contract', () => {
  it('chooses immediate mode when IntersectionObserver is unavailable or motion is reduced', () => {
    expect(getRevealMode({ supportsIntersectionObserver: false, prefersReducedMotion: false })).toBe('immediate')
    expect(getRevealMode({ supportsIntersectionObserver: true, prefersReducedMotion: true })).toBe('immediate')
    expect(getRevealMode({ supportsIntersectionObserver: true, prefersReducedMotion: false })).toBe('observer')
  })
})
