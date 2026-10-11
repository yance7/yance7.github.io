import { describe, expect, it } from 'vitest'
import { createHomeHeroParticleScene, getHomeHeroParticleCandidates, getHomeHeroParticlePixelRatio } from '../src/utils/homeHeroParticleScene'

describe('HomeHero shared particle lattice', () => {
  it.each([[390, 320], [1080, 430]])('classifies a bounded deterministic scene at %i by %i', (width, height) => {
    const rgba = new Uint8ClampedArray(width * height * 4)
    for (let y = 100; y < 140; y += 1) for (let x = 100; x < 160; x += 1) rgba[(y * width + x) * 4 + 3] = 255
    const scene = createHomeHeroParticleScene({ width, height, rgba, gridStep: 5 })
    expect(scene.wordCount).toBeGreaterThan(0)
    expect(scene.fieldCount + scene.wordCount).toBe(scene.particles.length)
    expect(scene.particles.every(p => Number.isFinite(p.x) && p.x >= 0 && p.x < width && p.y >= 0 && p.y < height)).toBe(true)
    expect(createHomeHeroParticleScene({ width, height, rgba, gridStep: 5 }).particles).toEqual(scene.particles)
    const candidates = getHomeHeroParticleCandidates(scene, { fromX: 100, fromY: 120, x: 300, y: 120 }, 20)
    expect([...candidates].some(id => scene.particles[id]?.homeX === 202.5)).toBe(true)
    expect([...candidates].every(id => Math.abs((scene.particles[id]?.homeY ?? -100) - 120) < 20)).toBe(true)
  })

  it('handles an empty initialization and keeps DPR independent of CSS geometry', () => {
    expect(createHomeHeroParticleScene({ width: 0, height: 0, rgba: [], gridStep: 5 }).particles).toEqual([])
    expect(getHomeHeroParticlePixelRatio(Number.NaN, false)).toBe(1)
    expect(getHomeHeroParticlePixelRatio(3, true)).toBe(1.25)
  })
})
