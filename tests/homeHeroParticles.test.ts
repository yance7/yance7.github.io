import { describe, expect, it } from 'vitest'
import {
  HOME_HERO_PARTICLE_GATHER_DURATION_MS,
  createHomeHeroParticleScene,
  getHomeHeroMotionEasing,
  getHomeHeroParticlePixelRatio,
  getHomeHeroParticleState,
  isHomeHeroButterflyPoint,
  isHomeHeroYPoint
} from '../src/utils/homeHeroParticles'

describe('HomeHero particle geometry', () => {
  it('places every background and Y dot on one repeatable logical-pixel grid', () => {
    for (const [width, height] of [[320, 300], [390, 320], [1080, 430]] as const) {
      const scene = createHomeHeroParticleScene(width, height)
      const repeat = createHomeHeroParticleScene(width, height)
      const allPoints = [...scene.backgroundPoints, ...scene.yPoints]
      const pointKeys = allPoints.map(({ row, column }) => `${row}:${column}`)

      expect(repeat).toEqual(scene)
      expect(scene.yPoints.length).toBeGreaterThan(80)
      expect(scene.backgroundPoints.length).toBeGreaterThan(500)
      expect(new Set(pointKeys).size).toBe(pointKeys.length)

      for (const point of allPoints) {
        expect(point.x).toBeCloseTo(scene.gridOriginX + point.column * scene.gridStep, 8)
        expect(point.y).toBeCloseTo(scene.gridOriginY + point.row * scene.gridStep, 8)
      }

      expect(scene.yPoints.every((point) => isHomeHeroButterflyPoint(point.x / width, point.y / height))).toBe(true)
      expect(scene.backgroundPoints.every((point) => !isHomeHeroButterflyPoint(point.x / width, point.y / height))).toBe(true)
    }
  })

  it('keeps the butterfly wings balanced and the serif Y inside the clear center', () => {
    expect(isHomeHeroButterflyPoint(0.24, 0.31)).toBe(true)
    expect(isHomeHeroButterflyPoint(0.76, 0.31)).toBe(true)
    expect(isHomeHeroButterflyPoint(0.38, 0.7)).toBe(true)
    expect(isHomeHeroButterflyPoint(0.62, 0.7)).toBe(true)
    expect(isHomeHeroButterflyPoint(0.04, 0.5)).toBe(false)

    expect(isHomeHeroYPoint(0.16, 0.1)).toBe(true)
    expect(isHomeHeroYPoint(0.84, 0.1)).toBe(true)
    expect(isHomeHeroYPoint(0.5, 0.78)).toBe(true)
    expect(isHomeHeroYPoint(0.5, 0.16)).toBe(false)
  })

  it('returns an empty scene for an unavailable drawing size', () => {
    expect(createHomeHeroParticleScene(0, 0).backgroundPoints).toEqual([])
    expect(createHomeHeroParticleScene(Number.NaN, 300).yPoints).toEqual([])
  })
})

describe('HomeHero particle timing', () => {
  it('settles against the shared intro clock when initialization is late', () => {
    const startedAt = 1200

    expect(getHomeHeroParticleState(startedAt, startedAt + HOME_HERO_PARTICLE_GATHER_DURATION_MS - 1)).toBe('gathering')
    expect(getHomeHeroParticleState(startedAt, startedAt + HOME_HERO_PARTICLE_GATHER_DURATION_MS)).toBe('settled')
    expect(getHomeHeroParticleState(startedAt, startedAt + HOME_HERO_PARTICLE_GATHER_DURATION_MS + 2400)).toBe('settled')
  })

  it('uses a time-based easing response that composes across frame rates', () => {
    const oneLongFrame = getHomeHeroMotionEasing(80)
    const twoShortFrames = 1 - (1 - getHomeHeroMotionEasing(40)) ** 2

    expect(twoShortFrames).toBeCloseTo(oneLongFrame, 8)
    expect(getHomeHeroMotionEasing(0)).toBe(0)
  })

  it('uses pixel ratio only for backing-store clarity', () => {
    expect(getHomeHeroParticlePixelRatio(1, 8, 8)).toBe(1)
    expect(getHomeHeroParticlePixelRatio(2, 8, 8)).toBe(2)
    expect(getHomeHeroParticlePixelRatio(3, 8, 8)).toBe(2)
    expect(getHomeHeroParticlePixelRatio(3, 2, 2)).toBe(1.25)
  })
})
