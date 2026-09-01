import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import revealDirective from '../src/directives/reveal'
import { getRevealMode, isInInitialViewport, normalizeRevealDelay } from '../src/utils/reveal'

describe('reveal mode contract', () => {
  it('chooses immediate mode when IntersectionObserver is unavailable or motion is reduced', () => {
    expect(getRevealMode({ supportsIntersectionObserver: false, prefersReducedMotion: false })).toBe('immediate')
    expect(getRevealMode({ supportsIntersectionObserver: true, prefersReducedMotion: true })).toBe('immediate')
    expect(getRevealMode({ supportsIntersectionObserver: true, prefersReducedMotion: false })).toBe('observer')
  })

  it('treats content already in the initial viewport as immediately visible', () => {
    expect(isInInitialViewport({ top: 80, bottom: 160 }, 844)).toBe(true)
    expect(isInInitialViewport({ top: -40, bottom: 20 }, 844)).toBe(true)
    expect(isInInitialViewport({ top: 844, bottom: 920 }, 844)).toBe(false)
    expect(isInInitialViewport({ top: -120, bottom: -8 }, 844)).toBe(false)
  })

  it('keeps initial viewport content visible before completing the immediate reveal', () => {
    const originalWindow = globalThis.window
    const classListCalls: string[][] = []
    const element = {
      classList: {
        add: (...tokens: string[]) => classListCalls.push(tokens),
        remove: () => undefined
      },
      style: {
        transitionDelay: '',
        removeProperty: () => undefined
      },
      getBoundingClientRect: () => ({ top: 80, bottom: 160 })
    } as unknown as HTMLElement

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        IntersectionObserver: class {},
        innerHeight: 844,
        matchMedia: () => ({ matches: false })
      }
    })
    const originalIntersectionObserver = globalThis.IntersectionObserver
    Object.defineProperty(globalThis, 'IntersectionObserver', { configurable: true, value: class {} })

    try {
      const revealHooks = revealDirective as unknown as {
        mounted?: (target: HTMLElement, binding: never) => void
      }
      revealHooks.mounted?.(element, { value: undefined } as never)
      expect(classListCalls[0]).toEqual(['reveal', 'revealed'])
    } finally {
      Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow })
      Object.defineProperty(globalThis, 'IntersectionObserver', {
        configurable: true,
        value: originalIntersectionObserver
      })
    }
  })

  it('normalizes stagger delays into the shared reveal budget', () => {
    expect(normalizeRevealDelay(-10)).toBe(0)
    expect(normalizeRevealDelay(61.4)).toBe(61)
    expect(normalizeRevealDelay(800)).toBe(240)
    expect(normalizeRevealDelay(Number.NaN)).toBe(0)
  })

  it('keeps the directive on one observer lifecycle without the duplicate fallback path', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/directives/reveal.ts'), 'utf8')

    expect(source).not.toContain('startFallback')
    expect(source).not.toContain('fallbackRaf')
    expect(source).not.toContain('revealPassedElements')
  })
})
