import { describe, expect, it } from 'vitest'
import { createHomeHeroParticleScene, getHomeHeroParticleCandidates, getHomeHeroParticleGridStep, getHomeHeroParticlePixelRatio } from '../src/utils/homeHeroParticleScene'

describe('HomeHero glyph scene', () => {
  it('redistributes the entire remaining budget after multiple singleton buckets fill', () => {
    const width = 74
    const height = 20
    const rgba = new Uint8ClampedArray(width * height * 4)
    rgba[3] = 255
    rgba[24 * 4 + 3] = 255
    for (let y = 0; y < 20; y += 2) {
      for (let x = 50; x < 70; x += 2) {
        if (x === 68 && y === 18) continue
        rgba[(y * width + x) * 4 + 3] = 255
      }
    }
    const scene = createHomeHeroParticleScene({ width, height, rgba, gridStep: 2, maxParticles: 100 })
    expect(scene.sampledCount).toBe(101)
    expect(scene.particles).toHaveLength(100)
    expect(new Set(scene.particles).size).toBe(100)
  })
  it('keeps near-cap allocation unique when a bucket has only one ink point', () => {
    const width = 50
    const height = 20
    const rgba = new Uint8ClampedArray(width * height * 4)
    rgba[3] = 255
    for (let y = 0; y < 20; y += 2) {
      for (let x = 26; x < 46; x += 2) {
        if (x === 44 && y === 18) continue
        rgba[(y * width + x) * 4 + 3] = 255
      }
    }
    const scene = createHomeHeroParticleScene({ width, height, rgba, gridStep: 2, maxParticles: 99 })
    expect(scene.particles).toHaveLength(99)
    expect(new Set(scene.particles).size).toBe(99)
    expect(new Set(scene.particles.map(p => `${p.homeX}:${p.homeY}`)).size).toBe(99)
    expect(scene.particles.every((p, id) => p.id === id)).toBe(true)
    expect(scene.particles.filter(p => p.homeX < 24)).toHaveLength(1)
  })
  it('samples real ink pixels at cell edges and rejects fractional dimensions', () => {
    const rgba = new Uint8ClampedArray(4 * 4 * 4)
    rgba[3] = 255
    const scene = createHomeHeroParticleScene({ width: 4, height: 4, rgba, gridStep: 2 })
    expect(scene.particles).toHaveLength(1)
    expect(scene.particles[0]).toMatchObject({ homeX: 0.5, homeY: 0.5 })
    expect(createHomeHeroParticleScene({ width: 4.2, height: 4, rgba, gridStep: 2 }).particles).toHaveLength(0)
    expect(createHomeHeroParticleScene({ width: 4, height: 4, rgba, gridStep: 2.5 }).particles).toHaveLength(0)
  })

  it('caps a dense glyph while retaining an isolated fine serif and spatial coverage', () => {
    const width = 240
    const height = 120
    const rgba = new Uint8ClampedArray(width * height * 4)
    for (let y = 20; y < 100; y += 1) {
      for (let x = 20; x < 180; x += 1) rgba[(y * width + x) * 4 + 3] = 255
    }
    for (let x = 202; x < 222; x += 1) rgba[(9 * width + x) * 4 + 3] = 255
    const scene = createHomeHeroParticleScene({ width, height, rgba, gridStep: 2, maxParticles: 600 })
    expect(scene.particles).toHaveLength(600)
    expect(scene.particles.some(p => p.homeX > 200 && p.homeY < 12)).toBe(true)
    for (const [left, top] of [[20, 20], [100, 20], [20, 60], [100, 60]]) {
      expect(scene.particles.filter(p => p.homeX >= left! && p.homeX < left! + 80 && p.homeY >= top! && p.homeY < top! + 40).length).toBeGreaterThan(100)
    }
    expect(new Set(scene.particles.map(p => `${p.homeX}:${p.homeY}`)).size).toBe(600)
  })
  it.each([[390, 320], [1080, 430]])('samples only the mask ink at %i by %i', (width, height) => {
    const rgba = new Uint8ClampedArray(width * height * 4)
    for (let y = 100; y < 140; y += 1) for (let x = 100; x < 160; x += 1) rgba[(y * width + x) * 4 + 3] = 255
    const scene = createHomeHeroParticleScene({ width, height, rgba, gridStep: 5 })
    expect(scene.particles).toHaveLength(96)
    expect(scene.particles.every(p => p.homeX >= 100 && p.homeX < 160 && p.homeY >= 100 && p.homeY < 140)).toBe(true)
    expect(scene.particles.every(p => Number.isFinite(p.x) && p.x >= 0 && p.x < width && p.y >= 0 && p.y < height)).toBe(true)
    expect(createHomeHeroParticleScene({ width, height, rgba, gridStep: 5 }).particles).toEqual(scene.particles)
    const candidates = getHomeHeroParticleCandidates(scene, { fromX: 100, fromY: 120, x: 300, y: 120 }, 20)
    expect(candidates.size).toBeGreaterThan(0)
    expect([...candidates].every(id => (scene.particles[id]?.homeX ?? 200) < 160)).toBe(true)
    expect([...candidates].every(id => Math.abs((scene.particles[id]?.homeY ?? -100) - 120) < 20)).toBe(true)
  })

  it('does not populate transparent card background', () => {
    const scene = createHomeHeroParticleScene({ width: 160, height: 100, gridStep: 2, rgba: new Uint8ClampedArray(160 * 100 * 4) })
    expect(scene.particles).toHaveLength(0)
    expect(scene.cells.size).toBe(0)
  })

  it('keeps a one-pixel serif when using the normal and constrained density', () => {
    const width = 60
    const height = 20
    const rgba = new Uint8ClampedArray(width * height * 4)
    for (let x = 2; x < 58; x += 1) rgba[(9 * width + x) * 4 + 3] = 255
    for (const constrained of [false, true]) {
      const scene = createHomeHeroParticleScene({ width, height, rgba, gridStep: getHomeHeroParticleGridStep(constrained) })
      expect(scene.particles.length).toBeGreaterThanOrEqual(18)
      expect(scene.particles.every(p => Math.abs(p.homeY - 9.5) <= 2)).toBe(true)
    }
  })

  it('handles an empty initialization and keeps DPR independent of CSS geometry', () => {
    expect(createHomeHeroParticleScene({ width: 0, height: 0, rgba: [], gridStep: 5 }).particles).toEqual([])
    expect(getHomeHeroParticlePixelRatio(Number.NaN, false)).toBe(1)
    expect(getHomeHeroParticlePixelRatio(3, true)).toBe(1.25)
  })
})
