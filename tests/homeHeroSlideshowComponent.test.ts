import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(process.cwd())
const hero = readFileSync(resolve(root, 'src/components/HomeHero.vue'), 'utf8')
const slideshow = readFileSync(resolve(root, 'src/components/HomeHeroSlideshow.vue'), 'utf8')
const styles = readFileSync(resolve(root, 'src/styles/home-hero.css'), 'utf8')

describe('home hero slideshow component contract', () => {
  it('keeps one stable particle component beside the slideshow in a geometry-neutral wrapper', () => {
    const wrapper = hero.match(/<div ref="visual" class="home-hero-visual">([\s\S]*?)<\/div>/)?.[1] ?? ''

    expect(wrapper).toContain('<HomeHeroSlideshow')
    expect(wrapper).toContain('<HomeHeroParticles')
    expect(wrapper.indexOf('<HomeHeroSlideshow')).toBeLessThan(wrapper.indexOf('<HomeHeroParticles'))
    expect(hero.match(/<HomeHeroParticles\b/g)).toHaveLength(1)
    expect(hero).not.toMatch(/<HomeHeroParticles[^>]*\b:key=/)
    expect(styles).toMatch(/\.home-hero-visual\s*\{[^}]*position:\s*relative[^}]*isolation:\s*isolate[^}]*width:\s*100%[^}]*min-width:\s*0/s)
  })

  it('keeps the eager first photo visible while delaying accessible controls until photo paint', () => {
    expect(slideshow).toContain('controlsEnabled: boolean')
    expect(slideshow).toContain('v-if="props.controlsEnabled"')
    expect(slideshow).toContain('loading="eager"')
    expect(slideshow).toContain(':srcset="imageSrcset(controller.currentSlide.value')
    expect(hero).toContain(':controls-enabled="props.runtimeEnabled"')
  })

  it('keeps decorative photo layers hidden from assistive technology and controls outside them', () => {
    const mediaAt = slideshow.indexOf('home-hero-slideshow__media')
    const controlsAt = slideshow.indexOf('home-hero-slideshow__controls')
    const mediaMarkup = slideshow.slice(mediaAt, controlsAt)
    const controlsMarkup = slideshow.slice(controlsAt)

    expect(mediaAt).toBeGreaterThanOrEqual(0)
    expect(controlsAt).toBeGreaterThan(mediaAt)
    expect(mediaMarkup).toContain('aria-hidden="true"')
    expect(mediaMarkup).toContain('alt=""')
    expect(mediaMarkup).not.toContain('<button')
    expect(controlsMarkup).toContain('role="group"')
    expect(controlsMarkup).toContain('type="button"')
    expect(controlsMarkup).toContain('index === controller.displayIndicatorIndex.value')
    expect(controlsMarkup).toContain('aria-current')
    expect(controlsMarkup).toContain('aria-live="polite"')
  })

  it('defines fixed particle and scrim layers with reduced-motion and forced-color behavior', () => {
    expect(styles).toMatch(/\.home-hero-slideshow__scrim\s*\{[^}]*position:\s*absolute/s)
    expect(styles).toMatch(/\.home-hero-visual\s*>\s*\.home-hero-particles\s*\{[^}]*--hero-particle:\s*#f4f0e8/s)
    expect(styles).toMatch(/prefers-reduced-motion:\s*reduce/)
    expect(styles).toMatch(/forced-colors:\s*active/)
  })
})
