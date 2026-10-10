type HomeHeroParticleKind = 'word' | 'field'

export interface HomeHeroParticleTarget {
  id: number
  kind: HomeHeroParticleKind
  homeX: number
  homeY: number
  x: number
  y: number
  vx: number
  vy: number
  row: number
  column: number
  settledForMs: number
}

export interface HomeHeroTextMask {
  width: number
  height: number
  rgba: ArrayLike<number>
  gridStep: number
  alphaThreshold?: number
}

export function sampleHomeHeroTextMask({
  width,
  height,
  rgba,
  gridStep,
  alphaThreshold = 96
}: HomeHeroTextMask): HomeHeroParticleTarget[] {
  if (!Number.isFinite(width) || !Number.isFinite(height) || !Number.isFinite(gridStep)) return []
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

      for (let y = top; y < bottom; y += 1) {
        for (let x = left; x < right; x += 1) {
          const alpha = rgba[(y * width + x) * 4 + 3] ?? 0
          alphaTotal += alpha
          alphaMax = Math.max(alphaMax, alpha)
          pixelCount += 1
        }
      }

      if (pixelCount === 0 || alphaMax < alphaThreshold || alphaTotal / pixelCount < coverageThreshold) continue

      const homeX = sampleX + 0.5
      const homeY = sampleY + 0.5
      particles.push({
        id: particles.length,
        kind: 'word',
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
  return lowResource ? 6 : 5
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
  wordCount: number
  fieldCount: number
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
  const wordCells = new Set(word.map(point => `${point.row}:${point.column}`))
  const scene: HomeHeroParticleScene = {
    width: mask.width, height: mask.height, gridStep: mask.gridStep,
    particles: [], wordCount: 0, fieldCount: 0, cellSize: 24, cells: new Map()
  }
  if (!Number.isFinite(mask.width) || !Number.isFinite(mask.height) || !Number.isFinite(mask.gridStep)
    || mask.width < 1 || mask.height < 1 || mask.gridStep < 1) return scene
  for (let row = 0; row < Math.ceil(mask.height / mask.gridStep); row += 1) {
    for (let column = 0; column < Math.ceil(mask.width / mask.gridStep); column += 1) {
      const homeX = Math.min(mask.width - 0.5, column * mask.gridStep + Math.floor(mask.gridStep / 2) + 0.5)
      const homeY = Math.min(mask.height - 0.5, row * mask.gridStep + Math.floor(mask.gridStep / 2) + 0.5)
      const kind = wordCells.has(`${row}:${column}`) ? 'word' : 'field'
      const id = scene.particles.length
      scene.particles.push({ id, kind, homeX, homeY, x: homeX, y: homeY, vx: 0, vy: 0, row, column, settledForMs: 40 })
      if (kind === 'word') scene.wordCount += 1
      else scene.fieldCount += 1
      const key = `${Math.floor(homeX / scene.cellSize)}:${Math.floor(homeY / scene.cellSize)}`
      const bucket = scene.cells.get(key)
      if (bucket) bucket.push(id)
      else scene.cells.set(key, [id])
    }
  }
  return scene
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

export function createHomeHeroTextMask(width: number, height: number, fontFamily: string, fontWeight: string): Uint8ClampedArray {
  const scratch = document.createElement('canvas')
  scratch.width = width
  scratch.height = height
  const context = scratch.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('HomeHero text mask is unavailable')
  context.font = `${fontWeight} 100px ${fontFamily}`
  const base = context.measureText('YANCE')
  const inkWidth = base.actualBoundingBoxLeft + base.actualBoundingBoxRight || base.width
  const inkHeight = base.actualBoundingBoxAscent + base.actualBoundingBoxDescent || 80
  if (inkWidth <= 0) throw new Error('HomeHero display font could not be measured')
  const fontSize = Math.min(width * (width <= 760 ? 0.82 : 0.74) / inkWidth, height * 0.48 / inkHeight) * 100
  context.font = `${fontWeight} ${fontSize}px ${fontFamily}`
  const metrics = context.measureText('YANCE')
  const left = metrics.actualBoundingBoxLeft || 0
  const right = metrics.actualBoundingBoxRight || metrics.width
  const ascent = metrics.actualBoundingBoxAscent || fontSize * 0.72
  const descent = metrics.actualBoundingBoxDescent || fontSize * 0.08
  context.fillStyle = '#fff'
  context.fillText('YANCE', width / 2 + (left - right) / 2, height * 0.46 + (ascent - descent) / 2)
  return context.getImageData(0, 0, width, height).data
}
