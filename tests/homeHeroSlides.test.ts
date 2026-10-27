import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import assetManifest from '../src/data/homeHeroAssets.json'
import { homeHeroSlides } from '../src/data/homeHeroSlides'

const root = resolve(process.cwd())
const candidateWidths = [640, 896, 1280, 2240]

describe('home hero slide assets', () => {
  it('publishes exactly seven stable slides in the approved order', () => {
    const ids = ['hero-01', 'hero-02', 'hero-03', 'hero-04', 'hero-05', 'hero-06', 'hero-07']

    expect(homeHeroSlides).toHaveLength(7)
    expect(homeHeroSlides.map((slide) => slide.id)).toEqual(ids)
    expect(assetManifest.slides.map((slide) => slide.id)).toEqual(ids)
  })

  it('provides matching hashed WebP and JPEG candidates at all requested widths', () => {
    for (const [index, slide] of homeHeroSlides.entries()) {
      const manifestSlide = assetManifest.slides[index]!
      expect(slide.sources.webp.map((candidate) => candidate.width)).toEqual(candidateWidths)
      expect(slide.sources.jpeg.map((candidate) => candidate.width)).toEqual(candidateWidths)
      expect(slide.sources).toEqual(manifestSlide.sources)

      for (const [format, candidates] of Object.entries(slide.sources)) {
        for (const candidate of candidates) {
          expect(candidate.src).toMatch(new RegExp(`^/assets/home-hero/${slide.id}-\\d+-[a-f0-9]{16}\\.${format === 'jpeg' ? 'jpg' : 'webp'}$`))
          expect(candidate.src).not.toMatch(/downloads|users[\\/]/i)
          expect(candidate.width).toBeLessThanOrEqual(slide.width)
          expect(candidate.height).toBeGreaterThan(0)
          expect(candidate.bytes).toBeGreaterThan(0)

          const file = resolve(root, 'public', candidate.src.slice(1))
          expect(existsSync(file), candidate.src).toBe(true)
          const bytes = readFileSync(file)
          expect(bytes.byteLength).toBe(candidate.bytes)
          expect(createHash('sha256').update(bytes).digest('hex')).toBe(candidate.sha256)
          expect(candidate.src).toContain(candidate.sha256.slice(0, 16))
        }
      }
    }
  })

  it('keeps valid desktop and mobile focal points and per-photo scrim strengths', () => {
    for (const slide of homeHeroSlides) {
      for (const position of [slide.position.desktop, slide.position.mobile]) {
        expect(position).toMatch(/^\d{1,3}% \d{1,3}%$/)
        const [x, y] = position.split(' ').map((value) => Number.parseInt(value, 10))
        expect(x).toBeGreaterThanOrEqual(0)
        expect(x).toBeLessThanOrEqual(100)
        expect(y).toBeGreaterThanOrEqual(0)
        expect(y).toBeLessThanOrEqual(100)
      }

      expect(slide.scrim).toBeGreaterThanOrEqual(0.3)
      expect(slide.scrim).toBeLessThanOrEqual(0.38)
      expect(slide.labelKey).toMatch(/^page\.home\.slideshow\.photos\.[1-7]$/)
    }
  })

  it('contains no user download paths in the runtime asset manifest', () => {
    const serialized = JSON.stringify(assetManifest)
    expect(serialized).not.toMatch(/downloads|[a-z]:\\users\\/i)
  })
})
