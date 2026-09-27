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
  it('keeps a dense, four-wing butterfly surface on the same lattice as the Y', () => {
    const mobileScene = createHomeHeroParticleScene(390, 320)
    const desktopScene = createHomeHeroParticleScene(1080, 430)
    const mobileButterflyPoints = mobileScene.backgroundPoints.filter((point) => point.surface === 'butterfly')
    const desktopButterflyPoints = desktopScene.backgroundPoints.filter((point) => point.surface === 'butterfly')
    const centerX = desktopScene.butterflyBounds.x + desktopScene.butterflyBounds.width / 2
    const upperLeftWing = desktopButterflyPoints.filter((point) => point.x < centerX && point.y < 180)
    const upperRightWing = desktopButterflyPoints.filter((point) => point.x > centerX && point.y < 180)
    const lowerLeftWing = desktopButterflyPoints.filter((point) => point.x < centerX && point.y > 240)
    const lowerRightWing = desktopButterflyPoints.filter((point) => point.x > centerX && point.y > 240)

    expect(mobileButterflyPoints.length).toBeGreaterThan(900)
    expect(upperLeftWing.length).toBeGreaterThan(100)
    expect(upperRightWing.length).toBeGreaterThan(100)
    expect(lowerLeftWing.length).toBeGreaterThan(100)
    expect(lowerRightWing.length).toBeGreaterThan(100)
    expect(mobileScene.yPoints.length).toBeGreaterThan(300)
    expect(desktopScene.yPoints.length).toBeGreaterThan(580)
  })

  it('renders a denser shared lattice and a proportioned four-wing opening', () => {
    const mobileScene = createHomeHeroParticleScene(390, 320)
    const desktopScene = createHomeHeroParticleScene(1080, 430)

    expect(mobileScene.gridStep).toBe(5)
    expect(desktopScene.gridStep).toBe(5)
    expect(mobileScene.yPoints.length).toBeGreaterThan(200)
    expect(desktopScene.yPoints.length).toBeGreaterThan(400)

    for (const scene of [mobileScene, desktopScene]) {
      expect(scene.butterflyBounds.width / scene.butterflyBounds.height).toBeCloseTo(1.4, 1)
      expect(scene.butterflyBounds.x + scene.butterflyBounds.width / 2)
        .toBeCloseTo(scene.gridOriginX + (scene.columns - 1) * scene.gridStep / 2, 1)
      expect(scene.backgroundPoints.every((point) => {
        const x = (point.x - scene.butterflyBounds.x) / scene.butterflyBounds.width
        const y = (point.y - scene.butterflyBounds.y) / scene.butterflyBounds.height
        const insideButterfly = x >= 0 && x <= 1 && y >= 0 && y <= 1 && isHomeHeroButterflyPoint(x, y)
        return point.surface === (insideButterfly ? 'butterfly' : 'field')
      })).toBe(true)
    }
  })

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

      expect(scene.yPoints.every((point) => (
        point.x >= scene.markBounds.x
        && point.x <= scene.markBounds.x + scene.markBounds.width
        && point.y >= scene.markBounds.y
        && point.y <= scene.markBounds.y + scene.markBounds.height
      ))).toBe(true)
      expect(scene.backgroundPoints.every((point) => {
        const x = (point.x - scene.butterflyBounds.x) / scene.butterflyBounds.width
        const y = (point.y - scene.butterflyBounds.y) / scene.butterflyBounds.height
        const insideButterfly = x >= 0 && x <= 1 && y >= 0 && y <= 1 && isHomeHeroButterflyPoint(x, y)
        return point.surface === (insideButterfly ? 'butterfly' : 'field')
      })).toBe(true)
    }
  })

  it('keeps the butterfly wings balanced and the serif Y inside the clear center', () => {
    expect(isHomeHeroButterflyPoint(0.2, 0.25)).toBe(true)
    expect(isHomeHeroButterflyPoint(0.8, 0.25)).toBe(true)
    expect(isHomeHeroButterflyPoint(0.3, 0.76)).toBe(true)
    expect(isHomeHeroButterflyPoint(0.7, 0.76)).toBe(true)
    expect(isHomeHeroButterflyPoint(0.5, 0.25)).toBe(false)
    expect(isHomeHeroButterflyPoint(0.5, 0.76)).toBe(true)
    expect(isHomeHeroButterflyPoint(0.2, 0.54)).toBe(false)
    expect(isHomeHeroButterflyPoint(0.8, 0.54)).toBe(false)
    expect(isHomeHeroButterflyPoint(0.02, 0.5)).toBe(false)

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
