import { describe, expect, it } from 'vitest'
import {
  advanceHomeHeroParticles,
  createHomeHeroPointerInput,
  getHomeHeroGlyphInfluence,
  type HomeHeroParticle,
  type HomeHeroPointerInput
} from '../src/utils/homeHeroParticlePhysics'
import { sampleHomeHeroTextMask } from '../src/utils/homeHeroParticleScene'

function createParticle(overrides: Partial<HomeHeroParticle> = {}): HomeHeroParticle {
  return {
    id: 1,
    homeX: 80,
    homeY: 40,
    x: 80,
    y: 40,
    vx: 0,
    vy: 0,
    row: 0,
    column: 0,
    settledForMs: 0,
    ...overrides
  }
}

function stepFor(
  particles: HomeHeroParticle[],
  pointer: HomeHeroPointerInput | null,
  seconds: number
) {
  const step = 1 / 120
  const count = Math.ceil(seconds / step)
  for (let index = 0; index < count; index += 1) {
    advanceHomeHeroParticles(particles, pointer, Math.min(step, seconds - index * step))
  }
}

describe('HomeHero text particle sampling', () => {
  it('samples opaque letter cells into stable, row-major targets', () => {
    const width = 6
    const height = 4
    const rgba = new Uint8ClampedArray(width * height * 4)
    const paint = (x: number, y: number, alpha: number) => {
      rgba[(y * width + x) * 4 + 3] = alpha
    }
    paint(1, 1, 240)
    paint(3, 1, 240)
    paint(1, 3, 240)
    paint(3, 3, 48)

    const particles = sampleHomeHeroTextMask({ width, height, rgba, gridStep: 2, alphaThreshold: 96 })

    expect(particles.map(({ id, row, column, homeX, homeY }) => ({
      id, row, column, homeX, homeY
    }))).toEqual([
      { id: 0, row: 0, column: 0, homeX: 1.5, homeY: 1.5 },
      { id: 1, row: 0, column: 1, homeX: 3.5, homeY: 1.5 },
      { id: 2, row: 1, column: 0, homeX: 1.5, homeY: 3.5 }
    ])
    expect(particles.every(({ x, y, homeX, homeY, vx, vy }) => (
      x === homeX && y === homeY && vx === 0 && vy === 0
    ))).toBe(true)
  })

  it('returns no targets for invalid or empty masks', () => {
    expect(sampleHomeHeroTextMask({ width: 0, height: 4, rgba: new Uint8ClampedArray(), gridStep: 5 })).toEqual([])
    expect(sampleHomeHeroTextMask({ width: 4, height: 4, rgba: new Uint8ClampedArray(64), gridStep: 0 })).toEqual([])
  })
})

describe('HomeHero particle physics', () => {
  it('uses a bounded continuous spatial influence independent of pointer speed', () => {
    expect(getHomeHeroGlyphInfluence(120, 120)).toBe(0)
    expect(getHomeHeroGlyphInfluence(0, 120)).toBeGreaterThan(30)
    expect(getHomeHeroGlyphInfluence(0, 120)).toBeLessThanOrEqual(55)
    expect(getHomeHeroGlyphInfluence(60, 120)).toBeGreaterThan(0)
    expect(getHomeHeroGlyphInfluence(60, 120)).toBeLessThan(getHomeHeroGlyphInfluence(10, 120))
    expect(Math.abs(getHomeHeroGlyphInfluence(33.6 - 0.001, 120) - getHomeHeroGlyphInfluence(33.6 + 0.001, 120))).toBeLessThan(0.01)
  })

  it('recovers monotonically without oscillating through the glyph', () => {
    const particle = createParticle({ x: 125, y: 18, vx: 125, vy: -90 })
    for (let i = 0; i < 120; i += 1) {
      const previousX = particle.x
      const previousY = particle.y
      advanceHomeHeroParticles([particle], null, 1 / 120)
      expect(particle.x).toBeGreaterThanOrEqual(particle.homeX)
      expect(particle.x).toBeLessThanOrEqual(previousX)
      expect(particle.y).toBeLessThanOrEqual(particle.homeY)
      expect(particle.y).toBeGreaterThanOrEqual(previousY)
    }
    expect(particle.x).toBe(particle.homeX)
    expect(particle.y).toBe(particle.homeY)
  })

  it('consumes the full recovery interval when a foreground frame is delayed', () => {
    const particle = createParticle({ x: 120 })
    expect(advanceHomeHeroParticles([particle], null, 0.5)).toBe(false)
    expect(particle.x).toBe(particle.homeX)
    expect(particle.y).toBe(particle.homeY)
  })

  it('low-pass filters pointer velocity while preserving its swept segment', () => {
    const pointer = createHomeHeroPointerInput(
      { x: 10, y: 20, vx: 0, vy: 0 },
      { x: 110, y: 20 },
      0.1
    )

    expect(pointer).toMatchObject({ fromX: 10, fromY: 20, x: 110, y: 20 })
    expect(pointer.vx).toBeGreaterThan(0)
    expect(pointer.vx).toBeLessThan(1000)
    expect(pointer.vy).toBe(0)
  })

  it('pushes nearby points along the pointer sweep', () => {
    const particle = createParticle({ x: 50, y: 18, homeX: 50, homeY: 18 })
    const pointer = createHomeHeroPointerInput(null, { x: 100, y: 0 }, 1 / 120)
    const sweep = { ...pointer, fromX: 0, fromY: 0, vx: 900, vy: 0 }

    advanceHomeHeroParticles([particle], sweep, 1 / 120)

    expect(particle.y).toBeGreaterThan(18)
    expect(particle.settledForMs).toBe(0)
  })

  it('transfers more forward velocity during a fast sweep than a slow sweep', () => {
    const particle = createParticle({ x: 50, y: 18, homeX: 50, homeY: 18 })
    const slow = createParticle({ x: 50, y: 18, homeX: 50, homeY: 18 })
    const pointer = { fromX: 0, fromY: 0, x: 100, y: 0, vx: 900, vy: 0 }

    advanceHomeHeroParticles([particle], pointer, 1 / 120)

    advanceHomeHeroParticles([slow], { ...pointer, vx: 90 }, 1 / 120)
    expect(particle.vx).toBeGreaterThan(2.5)
    expect(particle.vx).toBeGreaterThan(slow.vx)
  })

  it('returns displaced particles to their sampled home and settles without drift', () => {
    const particle = createParticle({ x: 125, y: 18, vx: 125, vy: -90 })

    stepFor([particle], null, 2.5)

    expect(Math.hypot(particle.x - particle.homeX, particle.y - particle.homeY)).toBeLessThan(0.25)
    expect(Math.hypot(particle.vx, particle.vy)).toBeLessThan(2.5)
    expect(particle.settledForMs).toBeGreaterThanOrEqual(40)
    expect(particle.x).toBe(particle.homeX)
    expect(particle.y).toBe(particle.homeY)
    expect(particle.vx).toBe(0)
    expect(particle.vy).toBe(0)
  })

  it('bounds sustained offsets for extreme pointer input on desktop and mobile', () => {
    const input = { x: 80, y: 40, fromX: 80, fromY: 40, vx: 1e9, vy: 1e9 }
    for (const mobile of [false, true]) {
      const particle = createParticle()
      for (let frame = 0; frame < 120; frame += 1) {
        advanceHomeHeroParticles([particle], input, 1 / 120, { mobile })
        expect(Math.hypot(particle.x - particle.homeX, particle.y - particle.homeY)).toBeLessThanOrEqual(54)
      }
    }
  })

  it('does not settle a fast crossing or a single close frame', () => {
    const crossing = createParticle({ x: 79.9, vx: 20 })
    advanceHomeHeroParticles([crossing], null, 1 / 120)
    expect(crossing.settledForMs).toBe(0)
    const close = createParticle({ x: 80.1, vx: 0 })
    advanceHomeHeroParticles([close], null, 1 / 120)
    expect(close.settledForMs).toBeLessThan(40)
    expect(close.x).not.toBe(close.homeX)
  })
})
