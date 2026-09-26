export interface HomeHeroParticleTarget {
  x: number
  y: number
  delayMs: number
  row: number
  column: number
}

export const HOME_HERO_PARTICLE_GATHER_DURATION_MS = 1600

export type HomeHeroParticleState = 'gathering' | 'settled'

interface VectorPoint {
  x: number
  y: number
}

interface CubicSegment {
  control1: VectorPoint
  control2: VectorPoint
  end: VectorPoint
}

interface CubicShape {
  width: number
  height: number
  start: VectorPoint
  segments: readonly CubicSegment[]
}

export interface HomeHeroParticleScene {
  gridStep: number
  columns: number
  rows: number
  gridOriginX: number
  gridOriginY: number
  markBounds: { x: number; y: number; width: number; height: number }
  backgroundPoints: HomeHeroParticleTarget[]
  yPoints: HomeHeroParticleTarget[]
}

const HOME_HERO_BUTTERFLY_SHAPE: CubicShape = {
  width: 100,
  height: 100,
  start: { x: 50, y: 22 },
  segments: [
    { control1: { x: 40, y: 10 }, control2: { x: 22, y: 2 }, end: { x: 16, y: 10 } },
    { control1: { x: 5, y: 15 }, control2: { x: 6, y: 24 }, end: { x: 9, y: 30 } },
    { control1: { x: 16, y: 41 }, control2: { x: 32, y: 49 }, end: { x: 43, y: 53 } },
    { control1: { x: 31, y: 57 }, control2: { x: 18, y: 63 }, end: { x: 22, y: 70 } },
    { control1: { x: 20, y: 79 }, control2: { x: 25, y: 88 }, end: { x: 32, y: 84 } },
    { control1: { x: 36, y: 85 }, control2: { x: 40, y: 78 }, end: { x: 45, y: 74 } },
    { control1: { x: 47, y: 78 }, control2: { x: 47, y: 88 }, end: { x: 50, y: 91 } },
    { control1: { x: 53, y: 88 }, control2: { x: 53, y: 78 }, end: { x: 55, y: 74 } },
    { control1: { x: 60, y: 78 }, control2: { x: 64, y: 85 }, end: { x: 68, y: 84 } },
    { control1: { x: 75, y: 88 }, control2: { x: 80, y: 79 }, end: { x: 78, y: 70 } },
    { control1: { x: 82, y: 63 }, control2: { x: 69, y: 57 }, end: { x: 57, y: 53 } },
    { control1: { x: 68, y: 49 }, control2: { x: 84, y: 41 }, end: { x: 91, y: 30 } },
    { control1: { x: 94, y: 24 }, control2: { x: 95, y: 15 }, end: { x: 84, y: 10 } },
    { control1: { x: 78, y: 2 }, control2: { x: 60, y: 10 }, end: { x: 50, y: 22 } }
  ]
}

const HOME_HERO_Y_SHAPE: CubicShape = {
  width: 100,
  height: 120,
  start: { x: 4, y: 4 },
  segments: [
    { control1: { x: 16, y: 4 }, control2: { x: 26, y: 4 }, end: { x: 34, y: 8 } },
    { control1: { x: 36, y: 9 }, control2: { x: 38, y: 12 }, end: { x: 40, y: 15 } },
    { control1: { x: 43, y: 23 }, control2: { x: 48, y: 37 }, end: { x: 50, y: 43 } },
    { control1: { x: 52, y: 37 }, control2: { x: 57, y: 23 }, end: { x: 60, y: 15 } },
    { control1: { x: 62, y: 12 }, control2: { x: 64, y: 9 }, end: { x: 66, y: 8 } },
    { control1: { x: 74, y: 4 }, control2: { x: 84, y: 4 }, end: { x: 96, y: 4 } },
    { control1: { x: 96, y: 7 }, control2: { x: 96, y: 11 }, end: { x: 96, y: 14 } },
    { control1: { x: 85, y: 15 }, control2: { x: 79, y: 20 }, end: { x: 74, y: 28 } },
    { control1: { x: 67, y: 39 }, control2: { x: 61, y: 50 }, end: { x: 57, y: 59 } },
    { control1: { x: 57, y: 74 }, control2: { x: 57, y: 88 }, end: { x: 57, y: 100 } },
    { control1: { x: 61, y: 100 }, control2: { x: 65, y: 100 }, end: { x: 69, y: 100 } },
    { control1: { x: 69, y: 104 }, control2: { x: 69, y: 108 }, end: { x: 69, y: 112 } },
    { control1: { x: 58, y: 112 }, control2: { x: 42, y: 112 }, end: { x: 31, y: 112 } },
    { control1: { x: 31, y: 108 }, control2: { x: 31, y: 104 }, end: { x: 31, y: 100 } },
    { control1: { x: 35, y: 100 }, control2: { x: 39, y: 100 }, end: { x: 43, y: 100 } },
    { control1: { x: 43, y: 88 }, control2: { x: 43, y: 74 }, end: { x: 43, y: 59 } },
    { control1: { x: 39, y: 50 }, control2: { x: 33, y: 39 }, end: { x: 26, y: 28 } },
    { control1: { x: 21, y: 20 }, control2: { x: 15, y: 15 }, end: { x: 4, y: 14 } },
    { control1: { x: 4, y: 11 }, control2: { x: 4, y: 7 }, end: { x: 4, y: 4 } }
  ]
}

function evaluateCubic(start: VectorPoint, segment: CubicSegment, t: number): VectorPoint {
  const inverseT = 1 - t
  const inverseSquared = inverseT * inverseT
  const tSquared = t * t
  return {
    x: inverseSquared * inverseT * start.x
      + 3 * inverseSquared * t * segment.control1.x
      + 3 * inverseT * tSquared * segment.control2.x
      + tSquared * t * segment.end.x,
    y: inverseSquared * inverseT * start.y
      + 3 * inverseSquared * t * segment.control1.y
      + 3 * inverseT * tSquared * segment.control2.y
      + tSquared * t * segment.end.y
  }
}

function flattenShape(shape: CubicShape, segmentsPerCurve = 20): VectorPoint[] {
  const points = [shape.start]
  let current = shape.start

  for (const segment of shape.segments) {
    for (let index = 1; index <= segmentsPerCurve; index += 1) {
      points.push(evaluateCubic(current, segment, index / segmentsPerCurve))
    }
    current = segment.end
  }

  return points
}

function shapePath(shape: CubicShape): string {
  const commands = shape.segments.map(({ control1, control2, end }) => (
    `C ${control1.x} ${control1.y} ${control2.x} ${control2.y} ${end.x} ${end.y}`
  ))
  return `M ${shape.start.x} ${shape.start.y} ${commands.join(' ')} Z`
}

function containsPoint(shape: CubicShape, points: readonly VectorPoint[], x: number, y: number): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false
  if (x < 0 || y < 0 || x > shape.width || y > shape.height) return false

  let inside = false
  for (let index = 0, previous = points.length - 1; index < points.length; previous = index, index += 1) {
    const currentPoint = points[index]!
    const previousPoint = points[previous]!
    const crossesY = (currentPoint.y > y) !== (previousPoint.y > y)
    if (!crossesY) continue
    const crossingX = (previousPoint.x - currentPoint.x) * (y - currentPoint.y)
      / (previousPoint.y - currentPoint.y) + currentPoint.x
    if (x < crossingX) inside = !inside
  }
  return inside
}

const HOME_HERO_BUTTERFLY_POLYGON = flattenShape(HOME_HERO_BUTTERFLY_SHAPE)
const HOME_HERO_Y_POLYGON = flattenShape(HOME_HERO_Y_SHAPE)

export const HOME_HERO_BUTTERFLY_PATH = shapePath(HOME_HERO_BUTTERFLY_SHAPE)
export const HOME_HERO_Y_PATH = shapePath(HOME_HERO_Y_SHAPE)

export function isHomeHeroButterflyPoint(x: number, y: number): boolean {
  return containsPoint(HOME_HERO_BUTTERFLY_SHAPE, HOME_HERO_BUTTERFLY_POLYGON, x * 100, y * 100)
}

export function isHomeHeroYPoint(x: number, y: number): boolean {
  return containsPoint(HOME_HERO_Y_SHAPE, HOME_HERO_Y_POLYGON, x * 100, y * 120)
}

function getHomeHeroGridStep(width: number): number {
  if (width <= 420) return 8
  if (width <= 760) return 10
  return 12
}

function getYParticleDelay(localX: number, localY: number, row: number, column: number): number {
  const distanceFromCenter = Math.min(1, Math.hypot((localX - 0.5) * 1.7, (localY - 0.45) * 1.2))
  const stableVariation = (row * 7 + column * 11) % 4
  return Math.round((1 - distanceFromCenter) * 220 + stableVariation * 14)
}

function getHomeHeroParticleSceneLayout(width: number, height: number) {
  const safeWidth = Math.max(0, width)
  const safeHeight = Math.max(0, height)
  const markHeight = Math.min(safeHeight * 0.62, safeWidth * 0.8)
  const markWidth = markHeight * HOME_HERO_Y_SHAPE.width / HOME_HERO_Y_SHAPE.height
  const gridStep = getHomeHeroGridStep(safeWidth)
  const columns = safeWidth > 0 ? Math.max(1, Math.floor(safeWidth / gridStep)) : 0
  const rows = safeHeight > 0 ? Math.max(1, Math.floor(safeHeight / gridStep)) : 0

  return {
    gridStep,
    columns,
    rows,
    gridOriginX: (safeWidth - (columns - 1) * gridStep) / 2,
    gridOriginY: (safeHeight - (rows - 1) * gridStep) / 2,
    markBounds: {
      x: (safeWidth - markWidth) / 2,
      y: safeHeight * 0.46 - markHeight / 2,
      width: markWidth,
      height: markHeight
    }
  }
}

export function createHomeHeroParticleScene(width: number, height: number): HomeHeroParticleScene {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return {
      ...getHomeHeroParticleSceneLayout(0, 0),
      backgroundPoints: [],
      yPoints: []
    }
  }

  const layout = getHomeHeroParticleSceneLayout(width, height)
  const backgroundPoints: HomeHeroParticleTarget[] = []
  const yPoints: HomeHeroParticleTarget[] = []

  for (let row = 0; row < layout.rows; row += 1) {
    for (let column = 0; column < layout.columns; column += 1) {
      const x = layout.gridOriginX + column * layout.gridStep
      const y = layout.gridOriginY + row * layout.gridStep
      const butterflyPoint = isHomeHeroButterflyPoint(x / width, y / height)
      const localX = (x - layout.markBounds.x) / layout.markBounds.width
      const localY = (y - layout.markBounds.y) / layout.markBounds.height
      const yPoint = localX >= 0 && localX <= 1 && localY >= 0 && localY <= 1
        && isHomeHeroYPoint(localX, localY)

      if (yPoint) {
        yPoints.push({ x, y, row, column, delayMs: getYParticleDelay(localX, localY, row, column) })
      } else if (!butterflyPoint) {
        backgroundPoints.push({ x, y, row, column, delayMs: 0 })
      }
    }
  }

  return { ...layout, backgroundPoints, yPoints }
}

export function getHomeHeroParticleState(startedAt: number, now: number): HomeHeroParticleState {
  return now - startedAt < HOME_HERO_PARTICLE_GATHER_DURATION_MS ? 'gathering' : 'settled'
}

function isConstrainedDevice(deviceMemory: number, hardwareConcurrency: number): boolean {
  return (deviceMemory > 0 && deviceMemory <= 2) || (hardwareConcurrency > 0 && hardwareConcurrency <= 2)
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
