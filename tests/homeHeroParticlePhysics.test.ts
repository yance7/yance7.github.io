import { describe, expect, it } from 'vitest'
import {
  advanceHomeHeroParticles,
  createHomeHeroPointerInput,
  type HomeHeroParticle,
  type HomeHeroPointerInput
} from '../src/utils/homeHeroParticlePhysics'
import { sampleHomeHeroTextMask } from '../src/utils/homeHeroParticleScene'

function createParticle(overrides: Partial<HomeHeroParticle> = {}): HomeHeroParticle {
  return {
    id: 1,
    kind: 'word',
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

    expect(particles.map(({ id, row, column, homeX, homeY, kind }) => ({
      id, row, column, homeX, homeY, kind
    }))).toEqual([
      { id: 0, row: 0, column: 0, homeX: 1.5, homeY: 1.5, kind: 'word' },
      { id: 1, row: 0, column: 1, homeX: 3.5, homeY: 1.5, kind: 'word' },
      { id: 2, row: 1, column: 0, homeX: 1.5, homeY: 3.5, kind: 'word' }
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

  it('clamps particle speed for mobile and desktop budgets', () => {
    const desktop = createParticle({ x: 300, y: 40, homeX: 80, homeY: 40, vx: 4000 })
    const mobile = createParticle({ x: 300, y: 40, homeX: 80, homeY: 40, vx: 4000 })

    advanceHomeHeroParticles([desktop], null, 1 / 120)
    advanceHomeHeroParticles([mobile], null, 1 / 120, { mobile: true })

    expect(Math.hypot(desktop.vx, desktop.vy)).toBeLessThanOrEqual(520)
    expect(Math.hypot(mobile.vx, mobile.vy)).toBeLessThanOrEqual(390)
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
