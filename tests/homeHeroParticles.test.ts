import { describe, expect, it } from 'vitest'
import {
  HOME_HERO_Y_BRANCH_PATH,
  HOME_HERO_Y_MIRROR_TRANSFORM,
  HOME_HERO_Y_STEM_PATH,
  HOME_HERO_PARTICLE_GATHER_DURATION_MS,
  createSeededRandom,
  getHomeHeroParticleCount,
  getHomeHeroParticleLimit,
  getHomeHeroParticlePixelRatio,
  getHomeHeroParticleState,
  getHomeHeroMotionEasing,
  sampleMaskTargets
} from '../src/utils/homeHeroParticles'

describe('HomeHero particle utilities', () => {
  it('adapts particle limits to mobile and constrained hardware', () => {
    expect(getHomeHeroParticleLimit(false, 8, 8)).toBe(1900)
    expect(getHomeHeroParticleLimit(true, 8, 8)).toBe(1000)
    expect(getHomeHeroParticleLimit(false, 2, 2)).toBe(1000)
    expect(getHomeHeroParticleLimit(true, 2, 2)).toBe(420)
  })

  it('keeps the mobile particle field to a lower density', () => {
    expect(getHomeHeroParticleCount(350, 240, true, 8, 8)).toBe(466)
  })

  it('caps the canvas pixel ratio according to device capacity', () => {
    expect(getHomeHeroParticlePixelRatio(3, 8, 8)).toBe(2)
    expect(getHomeHeroParticlePixelRatio(3, 2, 2)).toBe(1.25)
    expect(getHomeHeroParticlePixelRatio(1, 8, 8)).toBe(1)
  })

  it('uses a time-based easing response that composes across frame rates', () => {
    const oneLongFrame = getHomeHeroMotionEasing(80)
    const twoShortFrames = 1 - (1 - getHomeHeroMotionEasing(40)) ** 2

    expect(twoShortFrames).toBeCloseTo(oneLongFrame, 8)
    expect(getHomeHeroMotionEasing(0)).toBe(0)
  })

  it('defines a mirrored vector branch and shared vertical stem for the Y target', () => {
    expect(HOME_HERO_Y_BRANCH_PATH).toContain('M 110 ')
    expect(HOME_HERO_Y_MIRROR_TRANSFORM).toBe('translate(220 0) scale(-1 1)')
    expect(HOME_HERO_Y_STEM_PATH).toMatch(/^M 110 /)
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
