import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  MIMO_PARTICLE_SETTINGS,
  MimoParticleEngine,
  createMimoParticleScene,
  followMimoParticle,
  followMimoPointer,
  getMimoFontSize,
  getMimoParticleBudget,
  getMimoRepulsion
} from '../src/utils/mimoParticleModel'

describe('MiMo particle settings', () => {
  it('uses the reported font, sampling, drawing and entrance values', () => {
    expect(MIMO_PARTICLE_SETTINGS).toMatchObject({
      fontFamily: 'Amiri, serif', fontWeight: '400', gridStep: 2,
      alphaThreshold: 40, pointSize: 1.8, radius: 120, maxOffset: 40,
      pointerBlend: 0.18, particleBlend: 0.55,
      entranceSeconds: 1.6, entranceDelaySeconds: 0.42, driftAmplitude: 0.15,
      colorStart: '#2d3a1e', colorEnd: '#3e4f2a'
    })
  })

  it('calculates the area budget with the original lower and upper bounds', () => {
    expect(getMimoParticleBudget(350, 300)).toBe(1166)
    expect(getMimoParticleBudget(1260, 480)).toBe(5200)
    expect(getMimoParticleBudget(100, 100)).toBe(900)
  })

  it('uses viewport-based clamp typography and then the 92% width cap', () => {
    expect(getMimoFontSize(390, 350, 250)).toBe(96)
    expect(getMimoFontSize(1440, 1260, 250)).toBe(224)
    expect(getMimoFontSize(1440, 350, 250)).toBeCloseTo(128.8)
    expect(getMimoFontSize(1440, 1, 250)).toBe(18)
  })

  it('computes linear repulsion from the particle current position', () => {
    expect(getMimoRepulsion({ x: 60, y: 0 }, { x: 0, y: 0 }, true)).toEqual({ x: 20, y: 0 })
    expect(getMimoRepulsion({ x: 120, y: 0 }, { x: 0, y: 0 }, true)).toEqual({ x: 0, y: 0 })
    expect(getMimoRepulsion({ x: 0.1, y: 0 }, { x: 0, y: 0 }, true)).toEqual({ x: 0, y: 0 })
    expect(getMimoRepulsion({ x: 60, y: 0 }, { x: 0, y: 0 }, false)).toEqual({ x: 0, y: 0 })
  })

  it('applies exactly one 0.18 and 0.55 blend per rendered frame', () => {
    expect(followMimoPointer({ x: 0, y: 0 }, { x: 100, y: 50 })).toEqual({ x: 18, y: 9 })
    const particle = followMimoParticle({ x: 0, y: 0 }, { x: 100, y: 50 })
    expect(particle.x).toBeCloseTo(55)
    expect(particle.y).toBeCloseTo(27.5)
  })

  it('samples the cropped mask on a 2px grid with strictly greater than 40 alpha', () => {
    const rgba = new Uint8ClampedArray(8 * 4 * 4)
    rgba[3] = 40
    rgba[(0 * 8 + 2) * 4 + 3] = 41
    rgba[(1 * 8 + 3) * 4 + 3] = 255
    rgba[(2 * 8 + 4) * 4 + 3] = 255
    const scene = createMimoParticleScene({ width: 100, height: 100, maskWidth: 8, maskHeight: 4, rgba })
    expect(scene.particles.map(point => [point.homeX, point.homeY])).toEqual([[48, 48], [50, 50]])
  })

  it('uses the original seed, depth and cubic entrance before one position blend', () => {
    const rgba = new Uint8ClampedArray(4)
    rgba[3] = 255
    const scene = createMimoParticleScene({ width: 1000, height: 400, maskWidth: 1, maskHeight: 1, rgba })
    const engine = new MimoParticleEngine(scene, { startedAt: 0 })
    const point = scene.particles[0]!
    const seed = 49297 / 233280
    const depth = 0.45 + 97 / 1000 * 0.9
    const spread = 180 * (0.35 + 0.75 * depth)
    const startX = point.homeX + Math.cos(seed * Math.PI * 2) * spread + (seed - 0.5) * 81
    const startY = point.homeY + Math.sin(seed * Math.PI * 2) * spread + (depth - 0.9) * 81
    engine.gather()
    expect(point.x).toBeCloseTo(startX, 10)
    expect(point.y).toBeCloseTo(startY, 10)
    engine.advanceTo(0.2)
    const progress = (0.2 - seed * 0.42) / 1.6
    const eased = 1 - (1 - progress) ** 3
    expect(point.x).toBeCloseTo(startX + (point.homeX - startX) * eased * 0.55, 10)
    expect(point.opacity).toBeCloseTo(0.35 + 0.65 * progress, 10)
  })

  it('continues the exact depth-scaled micro drift when the pointer is inactive', () => {
    const scene = createMimoParticleScene({ width: 100, height: 100, maskWidth: 1, maskHeight: 1, rgba: [0, 0, 0, 255] })
    const engine = new MimoParticleEngine(scene, { startedAt: 0 })
    const point = scene.particles[0]!
    const seed = 49297 / 233280
    const depth = 0.45 + 97 / 1000 * 0.9
    engine.advanceTo(10)
    expect(point.x).toBeCloseTo(point.homeX + 0.15 * Math.sin(9 + 10 * seed) * depth * 0.55, 10)
    expect(point.y).toBeCloseTo(point.homeY + 0.15 * Math.cos(7.5 + 10 * depth) * depth * 0.55, 10)
    expect(engine.needsFrame).toBe(true)
  })

  it('accepts mouse movement while preserving the active nonmouse owner', () => {
    const scene = createMimoParticleScene({ width: 100, height: 100, maskWidth: 1, maskHeight: 1, rgba: [0, 0, 0, 255] })
    const engine = new MimoParticleEngine(scene, { startedAt: 0 })
    engine.pointer.start(17)
    engine.pointer.move({ x: 30, y: 40, pointerType: 'pen', pointerId: 17, at: 0 })
    engine.pointer.move({ x: 80, y: 90, pointerType: 'mouse', pointerId: 1, at: .1 })
    expect(engine.pointer.position).toEqual({ x: 80, y: 90 })
    expect(engine.pointer.matches(17)).toBe(true)
    engine.pointer.deactivate()
    engine.pointer.move({ x: 60, y: 70, pointerType: 'pen', pointerId: 17, at: .2 })
    expect(engine.pointer.position).toEqual({ x: 60, y: 70 })
    expect(engine.pointer.connected).toBe(false)
    expect(engine.pointer.matches(17)).toBe(true)
    engine.pointer.release(.3)
    expect(engine.pointer.matches(17)).toBe(false)
  })

  it('uses the actual RAF timestamp for entrance progress and microdrift', () => {
    const source = readFileSync('src/components/HomeHeroParticles.vue', 'utf8')
    expect(source).toContain('function animate(timestamp: number)')
    expect(source).toContain('const at = timestamp / 1000')
  })

  it('starts the entrance when drawing is ready, after renderer preparation', () => {
    const scene = createMimoParticleScene({ width: 100, height: 100, maskWidth: 1, maskHeight: 1, rgba: [0, 0, 0, 255] })
    const engine = new MimoParticleEngine(scene, { startedAt: 0 })
    engine.gather(1)
    engine.advanceTo(1.05)
    expect(scene.particles[0]!.opacity).toBe(.35)
    expect(engine.gatheringUntil).toBeCloseTo(3.02)
  })
})
