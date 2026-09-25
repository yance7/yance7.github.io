import { describe, expect, it } from 'vitest'
import {
  HOME_HERO_PARTICLE_GATHER_DURATION_MS,
  createSeededRandom,
  getHomeHeroParticleCount,
  getHomeHeroParticleLimit,
  getHomeHeroParticleState,
  sampleMaskTargets
} from '../src/utils/homeHeroParticles'

describe('HomeHero particle utilities', () => {
  it('uses the specified desktop and mobile particle limits', () => {
    expect(getHomeHeroParticleLimit(false)).toBe(3200)
    expect(getHomeHeroParticleLimit(true)).toBe(1400)
  })

  it('keeps the mobile particle field to a lower density', () => {
    expect(getHomeHeroParticleCount(350, 240, true)).toBe(466)
  })

  it('settles from the shared intro start even when initialization finishes late', () => {
    const startedAt = 1200

    expect(getHomeHeroParticleState(startedAt, startedAt + HOME_HERO_PARTICLE_GATHER_DURATION_MS - 1)).toBe('gathering')
    expect(getHomeHeroParticleState(startedAt, startedAt + HOME_HERO_PARTICLE_GATHER_DURATION_MS)).toBe('settled')
    expect(getHomeHeroParticleState(startedAt, startedAt + HOME_HERO_PARTICLE_GATHER_DURATION_MS + 2400)).toBe('settled')
  })

  it('creates repeatable seeded random values', () => {
    const first = createSeededRandom(0x59a7ce)
    const second = createSeededRandom(0x59a7ce)

    expect(Array.from({ length: 8 }, first)).toEqual(Array.from({ length: 8 }, second))
  })

  it('samples only visible mask pixels with deterministic delays capped at 420ms', () => {
    const width = 12
    const height = 10
    const alpha = new Uint8Array(width * height)
    for (let y = 2; y < 8; y += 1) {
      for (let x = 3; x < 9; x += 1) alpha[y * width + x] = 255
    }

    const first = sampleMaskTargets(alpha, width, height, 20, 0x59a7ce, 1)
    const second = sampleMaskTargets(alpha, width, height, 20, 0x59a7ce, 1)

    expect(first).toEqual(second)
    expect(first).toHaveLength(20)
    for (const target of first) {
      expect(alpha[target.y * width + target.x]).toBeGreaterThanOrEqual(64)
      expect(target.delayMs).toBeGreaterThanOrEqual(0)
      expect(target.delayMs).toBeLessThanOrEqual(420)
    }
  })

  it('returns no targets for an empty mask', () => {
    expect(sampleMaskTargets(new Uint8Array(16), 4, 4, 10, 1, 1)).toEqual([])
  })
})
