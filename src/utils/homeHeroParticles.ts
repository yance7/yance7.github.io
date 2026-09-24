export interface HomeHeroParticleTarget {
  x: number
  y: number
  delayMs: number
}

const HOME_HERO_PARTICLE_LIMITS = {
  desktop: 3200,
  mobile: 1400
} as const

export function getHomeHeroParticleLimit(isMobile: boolean): number {
  return isMobile ? HOME_HERO_PARTICLE_LIMITS.mobile : HOME_HERO_PARTICLE_LIMITS.desktop
}

export function getHomeHeroParticleCount(width: number, height: number, isMobile: boolean): number {
  const density = isMobile ? 180 : 200
  return Math.min(getHomeHeroParticleLimit(isMobile), Math.max(360, Math.floor(width * height / density)))
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
