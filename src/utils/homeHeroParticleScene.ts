export interface HomeHeroParticleTarget {
  id: number
  homeX: number
  homeY: number
  x: number
  y: number
  vx: number
  vy: number
  row: number
  column: number
  settledForMs: number
  opacity?: number
}

export interface HomeHeroTextMask {
  width: number
  height: number
  rgba: ArrayLike<number>
  gridStep: number
  alphaThreshold?: number
  maxParticles?: number
}

export function sampleHomeHeroTextMask({
  width,
  height,
  rgba,
  gridStep,
  alphaThreshold = 96
}: HomeHeroTextMask): HomeHeroParticleTarget[] {
  if (!Number.isInteger(width) || !Number.isInteger(height) || !Number.isInteger(gridStep)) return []
  if (width < 1 || height < 1 || gridStep < 1 || rgba.length < width * height * 4) return []

  const particles: HomeHeroParticleTarget[] = []
  const rows = Math.ceil(height / gridStep)
  const columns = Math.ceil(width / gridStep)
  const coverageThreshold = alphaThreshold * 0.14

  for (let row = 0; row < rows; row += 1) {
    const top = row * gridStep
    const sampleY = Math.min(height - 1, top + Math.floor(gridStep / 2))
    const bottom = Math.min(height, top + gridStep)

    for (let column = 0; column < columns; column += 1) {
      const left = column * gridStep
      const sampleX = Math.min(width - 1, left + Math.floor(gridStep / 2))
      const right = Math.min(width, left + gridStep)
      let alphaTotal = 0
      let alphaMax = 0
      let pixelCount = 0
      let inkX = sampleX
      let inkY = sampleY
      let nearestInk = Infinity

      for (let y = top; y < bottom; y += 1) {
        for (let x = left; x < right; x += 1) {
          const alpha = rgba[(y * width + x) * 4 + 3] ?? 0
          alphaTotal += alpha
          alphaMax = Math.max(alphaMax, alpha)
          pixelCount += 1
          const distance = (x - sampleX) ** 2 + (y - sampleY) ** 2
          if (alpha >= alphaThreshold && distance < nearestInk) {
            inkX = x
            inkY = y
            nearestInk = distance
          }
        }
      }

      if (pixelCount === 0 || alphaMax < alphaThreshold || alphaTotal / pixelCount < coverageThreshold) continue

      const homeX = inkX + 0.5
      const homeY = inkY + 0.5
      particles.push({
        id: particles.length,
        homeX,
        homeY,
        x: homeX,
        y: homeY,
        vx: 0,
        vy: 0,
        row,
        column,
        settledForMs: 40
      })
    }
  }

  return particles
}

export function getHomeHeroParticleGridStep(lowResource: boolean): number {
  return lowResource ? 3 : 2
}

export function getHomeHeroParticlePixelRatio(devicePixelRatio: number, lowResource: boolean): number {
  const safeDevicePixelRatio = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1
  return Math.min(safeDevicePixelRatio, lowResource ? 1.25 : 2)
}

export interface HomeHeroParticleScene {
  width: number
  height: number
  gridStep: number
  particles: HomeHeroParticleTarget[]
  sampledCount: number
  cellSize: number
  cells: Map<string, number[]>
}

export interface HomeHeroSweep {
  fromX: number
  fromY: number
  x: number
  y: number
}

export function distanceToHomeHeroSweep(x: number, y: number, sweep: HomeHeroSweep) {
  const dx = sweep.x - sweep.fromX
  const dy = sweep.y - sweep.fromY
  const lengthSquared = dx * dx + dy * dy
  const progress = lengthSquared === 0 ? 1 : Math.max(0, Math.min(1,
    ((x - sweep.fromX) * dx + (y - sweep.fromY) * dy) / lengthSquared))
  return { dx: x - sweep.fromX - dx * progress, dy: y - sweep.fromY - dy * progress }
}

export function createHomeHeroParticleScene(mask: HomeHeroTextMask): HomeHeroParticleScene {
  const word = sampleHomeHeroTextMask(mask)
  const limit = Math.max(0, Math.floor(mask.maxParticles ?? word.length))
  const selected = limit < word.length ? limitHomeHeroGlyphSamples(word, limit) : word
  const scene: HomeHeroParticleScene = {
    width: mask.width, height: mask.height, gridStep: mask.gridStep,
    particles: selected, sampledCount: word.length, cellSize: 24, cells: new Map()
  }
  for (const [id, p] of scene.particles.entries()) {
    p.id = id
    const key = `${Math.floor(p.homeX / scene.cellSize)}:${Math.floor(p.homeY / scene.cellSize)}`
    const bucket = scene.cells.get(key)
    if (bucket) bucket.push(id)
    else scene.cells.set(key, [id])
  }
  return scene
}

// Allocate the budget spatially; a small isolated serif keeps a representative
// rather than disappearing when a global row/stride sampler skips its row.
function limitHomeHeroGlyphSamples(points: HomeHeroParticleTarget[], limit: number) {
  if (!limit) return []
  const cells = new Map<string, HomeHeroParticleTarget[]>()
  for (const p of points) {
    const key = `${Math.floor(p.homeX / 24)}:${Math.floor(p.homeY / 24)}`
    const bucket = cells.get(key)
    if (bucket) bucket.push(p)
    else cells.set(key, [p])
  }
  const minimum = cells.size <= limit ? 1 : 0
  const remaining = limit - minimum * cells.size
  const buckets = [...cells.values()].map((items, index) => {
    const allocation = remaining * items.length / points.length
    return { items, index, count: Math.floor(allocation) + minimum, remainder: allocation % 1 }
  })
  let spare = limit - buckets.reduce((total, bucket) => total + bucket.count, 0)
  const redistribution = [...buckets].sort((a, b) => b.remainder - a.remainder)
  while (spare > 0) {
    for (const bucket of redistribution) {
      if (spare <= 0) break
      if (bucket.count >= bucket.items.length) continue
      bucket.count += 1
      spare -= 1
    }
  }
  const selected: HomeHeroParticleTarget[] = []
  for (const bucket of buckets) {
    for (let i = 0; i < bucket.count; i += 1) {
      const jitter = ((Math.imul(i + 1, 73856093) ^ Math.imul(bucket.index + 1, 19349663)) >>> 0) / 4294967296
      const start = Math.floor(i * bucket.items.length / bucket.count)
      const end = Math.floor((i + 1) * bucket.items.length / bucket.count)
      selected.push(bucket.items[start + Math.floor(jitter * (end - start))]!)
    }
  }
  return selected.sort((a, b) => a.id - b.id)
}

// Walk the capsule rather than its potentially huge diagonal bounding box.
export function getHomeHeroParticleCandidates(scene: HomeHeroParticleScene, sweep: HomeHeroSweep, radius: number): Set<number> {
  const candidates = new Set<number>()
  const visited = new Set<string>()
  const distance = Math.hypot(sweep.x - sweep.fromX, sweep.y - sweep.fromY)
  const steps = Math.max(1, Math.ceil(distance / (scene.cellSize / 2)))
  const padding = Math.ceil(radius / scene.cellSize) + 1
  for (let index = 0; index <= steps; index += 1) {
    const column = Math.floor((sweep.fromX + (sweep.x - sweep.fromX) * index / steps) / scene.cellSize)
    const row = Math.floor((sweep.fromY + (sweep.y - sweep.fromY) * index / steps) / scene.cellSize)
    for (let y = row - padding; y <= row + padding; y += 1) {
      for (let x = column - padding; x <= column + padding; x += 1) {
        const key = `${x}:${y}`
        if (visited.has(key)) continue
        visited.add(key)
        for (const id of scene.cells.get(key) ?? []) {
          const particle = scene.particles[id]
          if (!particle) continue
          const offset = distanceToHomeHeroSweep(particle.homeX, particle.homeY, sweep)
          if (offset.dx * offset.dx + offset.dy * offset.dy < radius * radius) candidates.add(id)
        }
      }
    }
  }
  return candidates
}

export interface HomeHeroGlyphLayout {
  fontSize: number
  x: number
  baseline: number
  bounds: { left: number; top: number; width: number; height: number }
}
