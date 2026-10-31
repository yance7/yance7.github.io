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
  it.each([
    { maskWidth: 0, maskHeight: 0, rgba: [] },
    { maskWidth: 2, maskHeight: 2, rgba: new Uint8ClampedArray(16) }
  ])('keeps empty and transparent masks empty: $maskWidth x $maskHeight', mask => {
    const scene = createMimoParticleScene({ width: 100, height: 100, ...mask })
    const engine = new MimoParticleEngine(scene, { startedAt: 0 })
    engine.gather()
    engine.advanceTo(3)
    expect(scene.particles).toEqual([])
    expect(scene.sampledCount).toBe(0)
    expect(engine.active.size).toBe(0)
    expect(engine.phase).toBe('settled')
  })

  it('resets entrance, ownership, active state and exact glyph positions using the supplied clock', () => {
    const scene = createMimoParticleScene({ width: 100, height: 100, maskWidth: 4, maskHeight: 4, rgba: new Uint8ClampedArray(64).fill(255) })
    const engine = new MimoParticleEngine(scene, { startedAt: 0 })
    engine.gather()
    engine.pointer.start(17)
    engine.pointer.move({ x: 30, y: 40, pointerType: 'pen', pointerId: 17, at: .1 })
    engine.advanceTo(.2)
    expect(engine.phase).toBe('gathering')
    expect(engine.active.size).toBeGreaterThan(0)

    engine.reset(4)
    expect(scene.particles.every(point => point.x === point.homeX && point.y === point.homeY && point.opacity === 1)).toBe(true)
    expect(engine.active.size).toBe(0)
    expect(engine.moving).toBe(false)
    expect(engine.phase).toBe('settled')
    expect(engine.pointer.connected).toBe(false)
    expect(engine.pointer.matches(17)).toBe(false)
    engine.gather()
    expect(engine.gatheringUntil).toBeCloseTo(6.02)
  })

  it('ignores another nonmouse owner and nonfinite coordinates without reactivating input', () => {
    const scene = createMimoParticleScene({ width: 100, height: 100, maskWidth: 1, maskHeight: 1, rgba: [0, 0, 0, 255] })
    const engine = new MimoParticleEngine(scene, { startedAt: 0 })
    engine.pointer.start(17)
    engine.pointer.move({ x: 30, y: 40, pointerType: 'pen', pointerId: 17, at: 0 })
    engine.pointer.move({ x: 80, y: 90, pointerType: 'touch', pointerId: 18, at: .1 })
    engine.pointer.move({ x: Number.NaN, y: 50, pointerType: 'pen', pointerId: 17, at: .2 })
    expect(engine.pointer.position).toEqual({ x: 30, y: 40 })
    expect(engine.pointer.matches(17)).toBe(true)
    engine.pointer.deactivate()
    engine.pointer.move({ x: Number.POSITIVE_INFINITY, y: 50, pointerType: 'mouse', pointerId: 1, at: .3 })
    expect(engine.pointer.position).toEqual({ x: 30, y: 40 })
    expect(engine.pointer.connected).toBe(false)
  })

  it('uses the reported font, sampling, drawing and entrance values', () => {
    expect(MIMO_PARTICLE_SETTINGS).toMatchObject({
      fontFamily: 'Amiri, serif', fontWeight: '400', gridStep: 2,
      alphaThreshold: 40, pointSize: 1.8, radius: 120, maxOffset: 40,
      pointerBlend: 0.18, particleBlend: 0.55,
      entranceSeconds: 1.6, entranceDelaySeconds: 0.42, driftAmplitude: 0.15
    })
  })

  it('bounds point allocation without penalizing ordinary small screens', () => {
    expect(getMimoParticleBudget()).toBe(12000)
  })

  it.each([
    { width: 350, height: 300, maskWidth: 170, maskHeight: 34, count: 1445 },
    { width: 1114, height: 478, maskWidth: 206, maskHeight: 138, count: 7107 }
  ])('retains the complete ordinary $count-point mask instead of halving it', fixture => {
    const rgba = new Uint8ClampedArray(fixture.maskWidth * fixture.maskHeight * 4).fill(255)
    const scene = createMimoParticleScene({ ...fixture, rgba })
    expect(scene.sampledCount).toBe(fixture.count)
    expect(scene.particles).toHaveLength(fixture.count)
    expect(new Set(scene.particles.map(point => `${point.homeX}:${point.homeY}`)).size).toBe(fixture.count)
  })

  it('bounds an oversized mask without a stride cliff and preserves its contour and counter edges', () => {
    const maskWidth = 280
    const maskHeight = 240
    const rgba = new Uint8ClampedArray(maskWidth * maskHeight * 4).fill(255)
    for (let row = 30; row < 70; row++) for (let column = 40; column < 60; column++) {
      rgba[((row * 2) * maskWidth + column * 2) * 4 + 3] = 0
    }
    const mask = { width: 1200, height: 500, maskWidth, maskHeight, rgba }
    const scene = createMimoParticleScene(mask)
    expect(scene.sampledCount).toBe(16000)
    expect(scene.particles).toHaveLength(12000)
    expect(scene.particles.length).toBeLessThanOrEqual(getMimoParticleBudget())
    const homes = new Set(scene.particles.map(point => `${point.column}:${point.row}`))
    for (const [column, row] of [[0, 0], [139, 0], [0, 119], [139, 119], [39, 30], [60, 30], [40, 29], [40, 70]]) {
      expect(homes.has(`${column}:${row}`), `missing contour ${column}:${row}`).toBe(true)
    }
    expect(new Set(scene.particles.map(point => point.row)).size).toBe(120)
    expect(createMimoParticleScene(mask).particles).toEqual(scene.particles)
  })

  it('keeps almost all samples when a mask only slightly exceeds the bound', () => {
    const scene = createMimoParticleScene({ width: 1200, height: 500, maskWidth: 242, maskHeight: 200,
      rgba: new Uint8ClampedArray(242 * 200 * 4).fill(255) })
    expect(scene.sampledCount).toBe(12100)
    expect(scene.particles).toHaveLength(12000)
    expect(scene.particles.length / scene.sampledCount).toBeGreaterThan(.99)
  })

  it('uniformly bounds a pathological mask whose every point is a contour', () => {
    const maskWidth = 400
    const maskHeight = 400
    const rgba = new Uint8ClampedArray(maskWidth * maskHeight * 4)
    for (let y = 0; y < maskHeight; y += 2) for (let x = 0; x < maskWidth; x += 2) {
      if ((x / 2 + y / 2) % 2 === 0) rgba[(y * maskWidth + x) * 4 + 3] = 255
    }
    const mask = { width: 1200, height: 500, maskWidth, maskHeight, rgba }
    const scene = createMimoParticleScene(mask)
    expect(scene.sampledCount).toBe(20000)
    expect(scene.particles).toHaveLength(12000)
    expect(new Set(scene.particles.map(point => point.row)).size).toBe(200)
    expect(new Set(scene.particles.map(point => `${point.row}:${point.column}`)).size).toBe(12000)
    for (let row = 0; row < 200; row++) expect(scene.particles.filter(point => point.row === row)).toHaveLength(60)
  })

  it('keeps representative motion identical when more samples are retained', () => {
    const dense = createMimoParticleScene({ width: 600, height: 300, maskWidth: 20, maskHeight: 20,
      rgba: new Uint8ClampedArray(20 * 20 * 4).fill(255) })
    const sparse = { ...dense, particles: [{ ...dense.particles[0]! }] }
    const engines = [sparse, dense].map(scene => new MimoParticleEngine(scene, { startedAt: 0 }))
    engines.forEach(engine => engine.gather(0))
    for (const time of [.1, .3, .6, 1]) {
      engines.forEach(engine => engine.advanceTo(time))
      expect(dense.particles[0]).toEqual(sparse.particles[0])
    }
    engines.forEach(engine => {
      engine.reset(3)
      engine.pointer.move({ x: 310, y: 160, pointerType: 'mouse', pointerId: 1, at: 3 })
    })
    for (const time of [3.01, 3.02, 3.03]) {
      engines.forEach(engine => engine.advanceTo(time))
      expect(dense.particles[0]).toEqual(sparse.particles[0])
    }
    engines.forEach(engine => engine.pointer.release(3.04))
    for (let frame = 1; frame <= 9; frame++) {
      engines.forEach(engine => engine.advanceTo(3.04 + frame / 60))
      expect(dense.particles[0]).toEqual(sparse.particles[0])
    }
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

  it.each([1 / 60, 1 / 3, 2])('recovers the full repulsion envelope in nine draws at a %s second frame interval', interval => {
    const scene = createMimoParticleScene({ width: 600, height: 300, maskWidth: 20, maskHeight: 20, rgba: new Uint8ClampedArray(20 * 20 * 4).fill(255) })
    const engine = new MimoParticleEngine(scene, { startedAt: 0 })
    scene.particles.forEach((point, index) => {
      point.x = point.homeX + 40.3 * Math.cos(index)
      point.y = point.homeY + 40.3 * Math.sin(index)
    })
    for (let draw = 1; draw <= 9; draw++) engine.advanceTo(draw * interval)
    expect(Math.max(...scene.particles.map(point => Math.hypot(point.x - point.homeX, point.y - point.homeY)))).toBeLessThan(.5)
    expect(engine.active.size).toBe(0)
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

  it('uses the live clock only when a RAF timestamp is materially stale', () => {
    const source = readFileSync('src/components/HomeHeroParticles.vue', 'utf8')
    expect(source).toContain('function animate(frameTimestamp?: number)')
    expect(source).toContain('const RAF_CLOCK_DRIFT_LIMIT_MS = 100')
    expect(source).toContain('Math.abs(start - frameTimestamp) > RAF_CLOCK_DRIFT_LIMIT_MS')
    expect(source).toContain('const at = (frameIsStale ? start : frameTimestamp!) / 1000')
    expect(source).toContain('if (staleFrameClock && engine?.active.size) frameFallback = window.setTimeout(() => animate(), 250)')
    expect(source).toContain('if (!engine?.active.size)')
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
