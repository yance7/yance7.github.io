export interface HomeHeroParticleTarget {
  x: number
  y: number
  delayMs: number
}

export const HOME_HERO_PARTICLE_GATHER_DURATION_MS = 1600
export const HOME_HERO_Y_VECTOR_SIZE = 220
export const HOME_HERO_Y_BRANCH_PATH = 'M 110 108 C 92 85 67 57 42 33'
export const HOME_HERO_Y_STEM_PATH = 'M 110 102 C 110 128 110 158 110 188'
export const HOME_HERO_Y_MIRROR_TRANSFORM = 'translate(220 0) scale(-1 1)'
export const HOME_HERO_Y_STROKE_WIDTH = 21

export type HomeHeroParticleState = 'gathering' | 'settled'

export function getHomeHeroParticleState(startedAt: number, now: number): HomeHeroParticleState {
  return now - startedAt < HOME_HERO_PARTICLE_GATHER_DURATION_MS ? 'gathering' : 'settled'
}

const HOME_HERO_PARTICLE_LIMITS = {
  desktop: 1900,
  mobile: 1000,
  constrainedDesktop: 1000,
  constrainedMobile: 420
} as const

function isConstrainedDevice(deviceMemory: number, hardwareConcurrency: number): boolean {
  return (deviceMemory > 0 && deviceMemory <= 2) || (hardwareConcurrency > 0 && hardwareConcurrency <= 2)
}

export function getHomeHeroParticleLimit(
  isMobile: boolean,
  deviceMemory = 4,
  hardwareConcurrency = 4
): number {
  const constrained = isConstrainedDevice(deviceMemory, hardwareConcurrency)
  if (isMobile) return constrained ? HOME_HERO_PARTICLE_LIMITS.constrainedMobile : HOME_HERO_PARTICLE_LIMITS.mobile
  return constrained ? HOME_HERO_PARTICLE_LIMITS.constrainedDesktop : HOME_HERO_PARTICLE_LIMITS.desktop
}

export function getHomeHeroParticleCount(
  width: number,
  height: number,
  isMobile: boolean,
  deviceMemory = 4,
  hardwareConcurrency = 4
): number {
  const density = isMobile ? 180 : 200
  return Math.min(
    getHomeHeroParticleLimit(isMobile, deviceMemory, hardwareConcurrency),
    Math.max(360, Math.floor(width * height / density))
  )
}

export function getHomeHeroParticlePixelRatio(
  devicePixelRatio: number,
  deviceMemory = 4,
  hardwareConcurrency = 4
): number {
  const limit = isConstrainedDevice(deviceMemory, hardwareConcurrency) ? 1.25 : 2
  return Math.min(Math.max(devicePixelRatio || 1, 1), limit)
}

export function getHomeHeroMotionEasing(deltaMs: number, responseMs = 80): number {
  return 1 - Math.exp(-Math.max(0, deltaMs) / Math.max(1, responseMs))
}

export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0

  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

export function sampleMaskTargets(
  alpha: ArrayLike<number>,
  width: number,
  height: number,
  limit: number,
  seed: number,
  step = 2
): HomeHeroParticleTarget[] {
  if (width <= 0 || height <= 0 || limit <= 0 || step <= 0 || alpha.length < width * height) return []

  const candidates: Array<Pick<HomeHeroParticleTarget, 'x' | 'y'>> = []
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      if ((alpha[y * width + x] ?? 0) >= 64) candidates.push({ x, y })
    }
  }

  const random = createSeededRandom(seed)
  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const targetIndex = Math.floor(random() * (index + 1))
    ;[candidates[index], candidates[targetIndex]] = [candidates[targetIndex]!, candidates[index]!]
  }

  return candidates.slice(0, limit).map(({ x, y }) => ({
    x,
    y,
    delayMs: Math.round(random() * 420)
  }))
}
