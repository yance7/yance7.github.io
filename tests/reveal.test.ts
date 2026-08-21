import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { getRevealMode } from '../src/utils/reveal'

describe('reveal mode contract', () => {
  it('chooses immediate mode when IntersectionObserver is unavailable or motion is reduced', () => {
    expect(getRevealMode({ supportsIntersectionObserver: false, prefersReducedMotion: false })).toBe('immediate')
    expect(getRevealMode({ supportsIntersectionObserver: true, prefersReducedMotion: true })).toBe('immediate')
    expect(getRevealMode({ supportsIntersectionObserver: true, prefersReducedMotion: false })).toBe('observer')
  })

  it('keeps the directive on one observer lifecycle without the duplicate fallback path', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/directives/reveal.ts'), 'utf8')

    expect(source).not.toContain('startFallback')
    expect(source).not.toContain('fallbackRaf')
    expect(source).not.toContain('revealPassedElements')
  })
})
