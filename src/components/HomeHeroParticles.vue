<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  HOME_HERO_BUTTERFLY_PATH,
  HOME_HERO_PARTICLE_GATHER_DURATION_MS,
  HOME_HERO_Y_PATH,
  createHomeHeroParticleScene,
  getHomeHeroMotionEasing,
  getHomeHeroParticlePixelRatio,
  getHomeHeroParticleState,
  type HomeHeroParticleScene,
  type HomeHeroParticleTarget
} from '../utils/homeHeroParticles'

const props = defineProps<{ animateIntro: boolean; introStartedAt: number | null }>()

interface MarkParticle {
  target: HomeHeroParticleTarget
  startX: number
  startY: number
}

interface ParticlePointer {
  clientX: number
  clientY: number
  radius: number
  maxDisplacement: number
}

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

const FRAME_INTERVAL_MS = 1000 / 60
const GRID_DOT_RADIUS_RATIO = 0.14
const MARK_DOT_RADIUS_RATIO = 0.16
const CACHE_DOT_ERASE_OVERDRAW = 1
const PARTICLE_SEED = 0x59a7ce

const stage = ref<HTMLElement | null>(null)
const gridCanvas = ref<HTMLCanvasElement | null>(null)
const markCanvas = ref<HTMLCanvasElement | null>(null)
const renderMode = ref(props.animateIntro ? 'initializing' : 'static')
const gridState = ref('static')
const markState = ref(props.animateIntro ? 'gathering' : 'static')
const particleCount = ref(0)
const lastInput = ref('none')
const gridStep = ref(0)
const gridOriginX = ref(0)
const gridOriginY = ref(0)
const gridColumns = ref(0)
const gridRows = ref(0)
const pixelRatio = ref(1)
const svgViewBox = ref('0 0 100 100')
const sceneWidth = ref(100)
const sceneHeight = ref(100)

let gridContext: CanvasRenderingContext2D | null = null
let markContext: CanvasRenderingContext2D | null = null
let backgroundCache: HTMLCanvasElement | null = null
let backgroundCacheContext: CanvasRenderingContext2D | null = null
let markCache: HTMLCanvasElement | null = null
let markCacheContext: CanvasRenderingContext2D | null = null
let scene: HomeHeroParticleScene | null = null
let markParticles: MarkParticle[] = []
let gridIndexByCell = new Int32Array()
let horizontalOffsets = new Float32Array()
let verticalOffsets = new Float32Array()
let markHorizontalOffsets = new Float32Array()
let markVerticalOffsets = new Float32Array()
let activeGridIndices = new Set<number>()
let activeMarkIndices = new Set<number>()
let pointer: ParticlePointer | null = null
let frameId = 0
let lastFrameAt = -Infinity
let startedAt = 0
let logicalWidth = 0
let logicalHeight = 0
let stageBounds: DOMRect | null = null
let visibleInViewport = true
let pageVisible = true
let windowFocused = true
let disposed = false
let markIsSettled = false
let colors = { dot: '#78917a', mark: '#294c3d' }
let resizeObserver: ResizeObserver | null = null
let intersectionObserver: IntersectionObserver | null = null
let themeObserver: MutationObserver | null = null

function readThemeColors() {
  const style = getComputedStyle(stage.value ?? document.documentElement)
  colors = {
    dot: style.getPropertyValue('--hero-dot').trim() || colors.dot,
    mark: style.getPropertyValue('--hero-mark').trim() || colors.mark
  }
}

function publishSceneGeometry(nextScene: HomeHeroParticleScene) {
  scene = nextScene
  gridStep.value = nextScene.gridStep
  gridOriginX.value = nextScene.gridOriginX
  gridOriginY.value = nextScene.gridOriginY
  gridColumns.value = nextScene.columns
  gridRows.value = nextScene.rows
  sceneWidth.value = Math.max(1, logicalWidth)
  sceneHeight.value = Math.max(1, logicalHeight)
  svgViewBox.value = `0 0 ${Math.max(1, logicalWidth)} ${Math.max(1, logicalHeight)}`
}

function markTransform() {
  if (!scene) return ''
  return `translate(${scene.markBounds.x} ${scene.markBounds.y}) scale(${scene.markBounds.width / 100} ${scene.markBounds.height / 120})`
}

function butterflyTransform() {
  return `scale(${logicalWidth / 100} ${logicalHeight / 100})`
}

function stopFrame() {
  if (!frameId) return
  cancelAnimationFrame(frameId)
  frameId = 0
}

function canDraw() {
  return !disposed && Boolean(gridContext && markContext && scene)
    && pageVisible && windowFocused && visibleInViewport
}

function setPaused() {
  gridState.value = 'paused'
  markState.value = 'paused'
  stopFrame()
}

function hasIntroMotion(now: number) {
  return getHomeHeroParticleState(startedAt, now) === 'gathering'
}

function hasGridMotion() {
  return activeGridIndices.size > 0 || activeMarkIndices.size > 0
}

function updatePausedState() {
  if (!canDraw()) {
    setPaused()
    return
  }

  const now = performance.now()
  if (hasIntroMotion(now) || hasGridMotion()) {
    scheduleFrame()
  } else {
    if (!markIsSettled) drawMarkFrame(now, true)
    gridState.value = 'settled'
    markState.value = 'settled'
  }
}

function deterministicUnit(index: number, salt: number): number {
  let value = Math.imul(index + 1, 0x45d9f3b) ^ Math.imul(salt + 17, 0x27d4eb2d) ^ PARTICLE_SEED
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b)
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b)
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296
}

function createMarkParticles(targets: HomeHeroParticleTarget[]) {
  const centerX = scene!.markBounds.x + scene!.markBounds.width / 2
  const centerY = scene!.markBounds.y + scene!.markBounds.height * 0.49
  return targets.map((target, index) => {
    let directionX = target.x - centerX
    let directionY = target.y - centerY
    const length = Math.hypot(directionX, directionY) || 1
    directionX /= length
    directionY /= length
    const travel = scene!.gridStep * (0.85 + deterministicUnit(index, 1) * 1.4)
    return {
      target,
      startX: target.x + directionX * travel,
      startY: target.y + directionY * travel
    }
  })
}

function createGridIndex() {
  if (!scene) return
  gridIndexByCell = new Int32Array(scene.columns * scene.rows).fill(-1)
  scene.backgroundPoints.forEach((point, index) => {
    gridIndexByCell[point.row * scene!.columns + point.column] = index
  })
  horizontalOffsets = new Float32Array(scene.backgroundPoints.length)
  verticalOffsets = new Float32Array(scene.backgroundPoints.length)
  activeGridIndices = new Set()
  markHorizontalOffsets = new Float32Array(markParticles.length)
  markVerticalOffsets = new Float32Array(markParticles.length)
  activeMarkIndices = new Set()
}

function createCanvasSurface(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) {
  const backingWidth = Math.ceil(logicalWidth * pixelRatio.value)
  const backingHeight = Math.ceil(logicalHeight * pixelRatio.value)
  if (canvas.width !== backingWidth) canvas.width = backingWidth
  if (canvas.height !== backingHeight) canvas.height = backingHeight
  context.setTransform(pixelRatio.value, 0, 0, pixelRatio.value, 0, 0)
}

function drawDotField(context: CanvasRenderingContext2D, points: readonly HomeHeroParticleTarget[], color: string) {
  if (!scene) return
  context.fillStyle = color
  context.beginPath()
  const radius = scene.gridStep * GRID_DOT_RADIUS_RATIO
  for (const point of points) {
    context.moveTo(point.x + radius, point.y)
    context.arc(point.x, point.y, radius, 0, Math.PI * 2)
  }
  context.fill()
}

function drawBackgroundCache() {
  if (!scene || !gridContext || !gridCanvas.value || !backgroundCache || !backgroundCacheContext) return
  createCanvasSurface(gridCanvas.value, gridContext)
  backgroundCache.width = gridCanvas.value.width
  backgroundCache.height = gridCanvas.value.height
  backgroundCacheContext.setTransform(pixelRatio.value, 0, 0, pixelRatio.value, 0, 0)
  backgroundCacheContext.clearRect(0, 0, logicalWidth, logicalHeight)
  drawDotField(backgroundCacheContext, scene.backgroundPoints, colors.dot)

  gridContext.clearRect(0, 0, logicalWidth, logicalHeight)
  gridContext.drawImage(
    backgroundCache,
    0,
    0,
    backgroundCache.width,
    backgroundCache.height,
    0,
    0,
    logicalWidth,
    logicalHeight
  )
}

function cacheSettledMark() {
  if (!markCanvas.value || !markCache) return
  if (markCache.width !== markCanvas.value.width) markCache.width = markCanvas.value.width
  if (markCache.height !== markCanvas.value.height) markCache.height = markCanvas.value.height
  markCacheContext = markCache.getContext('2d', { alpha: true })
  if (!markCacheContext) throw new Error('HomeHero mark cache is unavailable')
  markCacheContext.setTransform(1, 0, 0, 1, 0, 0)
  markCacheContext.clearRect(0, 0, markCache.width, markCache.height)
  markCacheContext.drawImage(markCanvas.value, 0, 0)
}

function drawMarkFrame(now: number, forceSettled = false) {
  if (!scene || !markContext || !markCanvas.value) return
  createCanvasSurface(markCanvas.value, markContext)
  markIsSettled = forceSettled || getHomeHeroParticleState(startedAt, now) === 'settled'
  const bounds = scene.markBounds
  markContext.clearRect(bounds.x - scene.gridStep, bounds.y - scene.gridStep, bounds.width + scene.gridStep * 2, bounds.height + scene.gridStep * 2)

  const elapsed = markIsSettled ? HOME_HERO_PARTICLE_GATHER_DURATION_MS : Math.max(0, now - startedAt)
  const colorGroups = new Map<number, MarkParticle[]>()
  for (const particle of markParticles) {
    const remainingDuration = HOME_HERO_PARTICLE_GATHER_DURATION_MS - particle.target.delayMs
    const progress = markIsSettled
      ? 1
      : Math.max(0, Math.min(1, (elapsed - particle.target.delayMs) / remainingDuration))
    const eased = progress * progress * (3 - 2 * progress)
    const groupOpacity = markIsSettled ? 1 : Math.round(progress * 8) / 8
    if (groupOpacity <= 0) continue
    const group = colorGroups.get(groupOpacity) ?? []
    group.push({
      ...particle,
      target: {
        ...particle.target,
        x: particle.startX + (particle.target.x - particle.startX) * eased,
        y: particle.startY + (particle.target.y - particle.startY) * eased
      }
    })
    colorGroups.set(groupOpacity, group)
  }

  markContext.fillStyle = colors.mark
  for (const [opacity, particles] of colorGroups) {
    markContext.globalAlpha = opacity
    markContext.beginPath()
    for (const particle of particles) {
      const radius = scene.gridStep * MARK_DOT_RADIUS_RATIO
      markContext.moveTo(particle.target.x + radius, particle.target.y)
      markContext.arc(particle.target.x, particle.target.y, radius, 0, Math.PI * 2)
    }
    markContext.fill()
  }
  markContext.globalAlpha = 1
  if (markIsSettled) {
    markHorizontalOffsets.fill(0)
    markVerticalOffsets.fill(0)
    activeMarkIndices.clear()
    cacheSettledMark()
  }
}

function nearbyGridIndices(x: number, y: number, radius: number): number[] {
  if (!scene) return []
  const minColumn = Math.max(0, Math.floor((x - radius - scene.gridOriginX) / scene.gridStep))
  const maxColumn = Math.min(scene.columns - 1, Math.ceil((x + radius - scene.gridOriginX) / scene.gridStep))
  const minRow = Math.max(0, Math.floor((y - radius - scene.gridOriginY) / scene.gridStep))
  const maxRow = Math.min(scene.rows - 1, Math.ceil((y + radius - scene.gridOriginY) / scene.gridStep))
  const indices: number[] = []

  for (let row = minRow; row <= maxRow; row += 1) {
    for (let column = minColumn; column <= maxColumn; column += 1) {
      const index = gridIndexByCell[row * scene.columns + column] ?? -1
      if (index >= 0) indices.push(index)
    }
  }
  return indices
}

function getPointerPosition() {
  if (!pointer || !stageBounds) return null
  return {
    x: pointer.clientX - stageBounds.left,
    y: pointer.clientY - stageBounds.top
  }
}

function getDirtyBounds(indices: Iterable<number>, offsetX: Float32Array, offsetY: Float32Array): Rect | null {
  if (!scene) return null
  let left = Infinity
  let top = Infinity
  let right = -Infinity
  let bottom = -Infinity
  const margin = scene.gridStep * GRID_DOT_RADIUS_RATIO + 2

  for (const index of indices) {
    const point = scene.backgroundPoints[index]
    if (!point) continue
    const x = point.x + offsetX[index]!
    const y = point.y + offsetY[index]!
    left = Math.min(left, point.x - margin, x - margin)
    top = Math.min(top, point.y - margin, y - margin)
    right = Math.max(right, point.x + margin, x + margin)
    bottom = Math.max(bottom, point.y + margin, y + margin)
  }

  if (!Number.isFinite(left)) return null
  const x = Math.max(0, left)
  const y = Math.max(0, top)
  const rectRight = Math.min(logicalWidth, right)
  const rectBottom = Math.min(logicalHeight, bottom)
  return { x, y, width: Math.max(0, rectRight - x), height: Math.max(0, rectBottom - y) }
}

function unionRects(first: Rect, second: Rect): Rect {
  const x = Math.min(first.x, second.x)
  const y = Math.min(first.y, second.y)
  const right = Math.max(first.x + first.width, second.x + second.width)
  const bottom = Math.max(first.y + first.height, second.y + second.height)
  return { x, y, width: right - x, height: bottom - y }
}

function eraseCachedDots(
  context: CanvasRenderingContext2D,
  indices: Iterable<number>,
  radius: number,
  getPoint: (index: number) => HomeHeroParticleTarget | undefined
) {
  const eraseRadius = radius + CACHE_DOT_ERASE_OVERDRAW
  context.save()
  context.globalCompositeOperation = 'destination-out'
  context.fillStyle = '#000'
  context.beginPath()
  for (const index of indices) {
    const point = getPoint(index)
    if (!point) continue
    context.moveTo(point.x + eraseRadius, point.y)
    context.arc(point.x, point.y, eraseRadius, 0, Math.PI * 2)
  }
  context.fill()
  context.restore()
}

function renderGridRegion(bounds: Rect, indices: Iterable<number>) {
  if (!scene || !gridContext || !backgroundCache) return
  const x = Math.max(0, bounds.x)
  const y = Math.max(0, bounds.y)
  const width = Math.min(logicalWidth - x, bounds.width)
  const height = Math.min(logicalHeight - y, bounds.height)
  if (width <= 0 || height <= 0) return

  gridContext.save()
  gridContext.setTransform(pixelRatio.value, 0, 0, pixelRatio.value, 0, 0)
  gridContext.beginPath()
  gridContext.rect(x, y, width, height)
  gridContext.clip()
  gridContext.clearRect(x, y, width, height)
  gridContext.drawImage(
    backgroundCache,
    x * pixelRatio.value,
    y * pixelRatio.value,
    width * pixelRatio.value,
    height * pixelRatio.value,
    x,
    y,
    width,
    height
  )
  const radius = scene.gridStep * GRID_DOT_RADIUS_RATIO
  eraseCachedDots(gridContext, indices, radius, (index) => scene?.backgroundPoints[index])
  gridContext.fillStyle = colors.dot
  gridContext.beginPath()
  for (const index of indices) {
    const point = scene.backgroundPoints[index]
    if (!point) continue
    const drawX = point.x + horizontalOffsets[index]!
    const drawY = point.y + verticalOffsets[index]!
    if (drawX < x - radius || drawX > x + width + radius || drawY < y - radius || drawY > y + height + radius) continue
    gridContext.moveTo(drawX + radius, drawY)
    gridContext.arc(drawX, drawY, radius, 0, Math.PI * 2)
  }
  gridContext.fill()
  gridContext.restore()
}

function updateGridRipple(deltaMs: number) {
  if (!scene || !gridContext) return false
  const priorIndices = Array.from(activeGridIndices)
  const oldBounds = getDirtyBounds(priorIndices, horizontalOffsets, verticalOffsets)
  const position = getPointerPosition()
  const radius = pointer?.radius ?? scene.gridStep * 6
  const candidates = position ? nearbyGridIndices(position.x, position.y, radius) : []
  const nextIndices = new Set([...priorIndices, ...candidates])
  const easing = getHomeHeroMotionEasing(deltaMs)
  const nextActive = new Set<number>()
  let motionInProgress = false

  for (const index of nextIndices) {
    const point = scene.backgroundPoints[index]!
    let targetX = 0
    let targetY = 0
    if (position && pointer) {
      let deltaX = point.x - position.x
      let deltaY = point.y - position.y
      let distance = Math.hypot(deltaX, deltaY)
      if (distance < 0.1) {
        deltaX = point.x - logicalWidth / 2 || 1
        deltaY = point.y - logicalHeight / 2 || 1
        distance = Math.hypot(deltaX, deltaY)
      }
      if (distance < pointer.radius) {
        const force = (1 - distance / pointer.radius) ** 2
        targetX = deltaX / distance * pointer.maxDisplacement * force
        targetY = deltaY / distance * pointer.maxDisplacement * force
      }
    }

    horizontalOffsets[index] = horizontalOffsets[index]! + (targetX - horizontalOffsets[index]!) * easing
    verticalOffsets[index] = verticalOffsets[index]! + (targetY - verticalOffsets[index]!) * easing
    const moving = Math.abs(targetX - horizontalOffsets[index]!) > 0.12
      || Math.abs(targetY - verticalOffsets[index]!) > 0.12
    if (moving) motionInProgress = true
    const displaced = Math.abs(horizontalOffsets[index]!) > 0.12 || Math.abs(verticalOffsets[index]!) > 0.12
    if (moving || displaced) nextActive.add(index)
  }

  activeGridIndices = nextActive
  const newBounds = getDirtyBounds(nextActive, horizontalOffsets, verticalOffsets)
  if (oldBounds && newBounds) {
    const combined = unionRects(oldBounds, newBounds)
    const combinedArea = combined.width * combined.height
    const stageArea = logicalWidth * logicalHeight
    if (combinedArea <= stageArea * 0.24) {
      renderGridRegion(combined, nextActive)
    } else {
      renderGridRegion(oldBounds, nextActive)
      renderGridRegion(newBounds, nextActive)
    }
  } else if (oldBounds) {
    renderGridRegion(oldBounds, nextActive)
  } else if (newBounds) {
    renderGridRegion(newBounds, nextActive)
  }

  return motionInProgress
}

function getMarkDirtyBounds(indices: Iterable<number>): Rect | null {
  if (!scene) return null
  let left = Infinity
  let top = Infinity
  let right = -Infinity
  let bottom = -Infinity
  const margin = scene.gridStep * MARK_DOT_RADIUS_RATIO + 2

  for (const index of indices) {
    const point = markParticles[index]?.target
    if (!point) continue
    const x = point.x + markHorizontalOffsets[index]!
    const y = point.y + markVerticalOffsets[index]!
    left = Math.min(left, point.x - margin, x - margin)
    top = Math.min(top, point.y - margin, y - margin)
    right = Math.max(right, point.x + margin, x + margin)
    bottom = Math.max(bottom, point.y + margin, y + margin)
  }

  if (!Number.isFinite(left)) return null
  const x = Math.max(0, left)
  const y = Math.max(0, top)
  const rectRight = Math.min(logicalWidth, right)
  const rectBottom = Math.min(logicalHeight, bottom)
  return { x, y, width: Math.max(0, rectRight - x), height: Math.max(0, rectBottom - y) }
}

function renderMarkRegion(bounds: Rect, indices: Iterable<number>) {
  if (!scene || !markContext || !markCache) return
  const x = Math.max(0, bounds.x)
  const y = Math.max(0, bounds.y)
  const width = Math.min(logicalWidth - x, bounds.width)
  const height = Math.min(logicalHeight - y, bounds.height)
  if (width <= 0 || height <= 0) return

  markContext.save()
  markContext.setTransform(pixelRatio.value, 0, 0, pixelRatio.value, 0, 0)
  markContext.beginPath()
  markContext.rect(x, y, width, height)
  markContext.clip()
  markContext.clearRect(x, y, width, height)
  markContext.drawImage(
    markCache,
    x * pixelRatio.value,
    y * pixelRatio.value,
    width * pixelRatio.value,
    height * pixelRatio.value,
    x,
    y,
    width,
    height
  )
  const radius = scene.gridStep * MARK_DOT_RADIUS_RATIO
  eraseCachedDots(markContext, indices, radius, (index) => markParticles[index]?.target)
  markContext.fillStyle = colors.mark
  markContext.beginPath()
  for (const index of indices) {
    const point = markParticles[index]?.target
    if (!point) continue
    const drawX = point.x + markHorizontalOffsets[index]!
    const drawY = point.y + markVerticalOffsets[index]!
    if (drawX < x - radius || drawX > x + width + radius || drawY < y - radius || drawY > y + height + radius) continue
    markContext.moveTo(drawX + radius, drawY)
    markContext.arc(drawX, drawY, radius, 0, Math.PI * 2)
  }
  markContext.fill()
  markContext.restore()
}

function updateMarkRipple(deltaMs: number) {
  if (!scene || !markContext || !markCache || !markIsSettled) return false
  const priorIndices = Array.from(activeMarkIndices)
  const oldBounds = getMarkDirtyBounds(priorIndices)
  const position = getPointerPosition()
  const radius = pointer?.radius ?? scene.gridStep * 6
  const candidates: number[] = []
  if (position && pointer) {
    markParticles.forEach(({ target }, index) => {
      if (Math.hypot(target.x - position.x, target.y - position.y) < radius) candidates.push(index)
    })
  }
  const nextIndices = new Set([...priorIndices, ...candidates])
  const easing = getHomeHeroMotionEasing(deltaMs)
  const nextActive = new Set<number>()
  let motionInProgress = false

  for (const index of nextIndices) {
    const point = markParticles[index]!.target
    let targetX = 0
    let targetY = 0
    if (position && pointer) {
      let deltaX = point.x - position.x
      let deltaY = point.y - position.y
      let distance = Math.hypot(deltaX, deltaY)
      if (distance < 0.1) {
        deltaX = point.x - logicalWidth / 2 || 1
        deltaY = point.y - logicalHeight / 2 || 1
        distance = Math.hypot(deltaX, deltaY)
      }
      if (distance < pointer.radius) {
        const force = (1 - distance / pointer.radius) ** 2
        targetX = deltaX / distance * pointer.maxDisplacement * force
        targetY = deltaY / distance * pointer.maxDisplacement * force
      }
    }

    markHorizontalOffsets[index] = markHorizontalOffsets[index]! + (targetX - markHorizontalOffsets[index]!) * easing
    markVerticalOffsets[index] = markVerticalOffsets[index]! + (targetY - markVerticalOffsets[index]!) * easing
    const moving = Math.abs(targetX - markHorizontalOffsets[index]!) > 0.12
      || Math.abs(targetY - markVerticalOffsets[index]!) > 0.12
    if (moving) motionInProgress = true
    const displaced = Math.abs(markHorizontalOffsets[index]!) > 0.12 || Math.abs(markVerticalOffsets[index]!) > 0.12
    if (moving || displaced) nextActive.add(index)
  }

  activeMarkIndices = nextActive
  const newBounds = getMarkDirtyBounds(nextActive)
  if (oldBounds && newBounds) {
    const combined = unionRects(oldBounds, newBounds)
    if (combined.width * combined.height <= logicalWidth * logicalHeight * 0.24) {
      renderMarkRegion(combined, nextActive)
    } else {
      renderMarkRegion(oldBounds, nextActive)
      renderMarkRegion(newBounds, nextActive)
    }
  } else if (oldBounds) {
    renderMarkRegion(oldBounds, nextActive)
  } else if (newBounds) {
    renderMarkRegion(newBounds, nextActive)
  }

  return motionInProgress
}

function drawStaticScene() {
  if (!scene || !gridContext || !markContext) return
  drawBackgroundCache()
  drawMarkFrame(performance.now(), true)
  gridState.value = 'settled'
  markState.value = 'settled'
}

function renderFrame(now: number) {
  frameId = 0
  if (!canDraw()) {
    setPaused()
    return
  }
  if (now - lastFrameAt < FRAME_INTERVAL_MS) {
    frameId = requestAnimationFrame(renderFrame)
    return
  }

  const deltaMs = Number.isFinite(lastFrameAt) ? Math.min(now - lastFrameAt, 120) : FRAME_INTERVAL_MS
  lastFrameAt = now
  const gathering = hasIntroMotion(now)
  if (gathering) drawMarkFrame(now)
  else if (!markIsSettled) drawMarkFrame(now, true)
  const gridMoving = updateGridRipple(deltaMs)
  const markMoving = gathering ? false : updateMarkRipple(deltaMs)
  markState.value = gathering || markMoving ? 'gathering' : 'settled'
  gridState.value = gridMoving ? 'gathering' : 'settled'
  if (gathering || gridMoving || markMoving) frameId = requestAnimationFrame(renderFrame)
}

function scheduleFrame() {
  if (!canDraw() || frameId) return
  frameId = requestAnimationFrame(renderFrame)
}

function updateStageBounds() {
  if (stage.value) stageBounds = stage.value.getBoundingClientRect()
}

function handlePointerMove(event: PointerEvent) {
  if (!stageBounds) updateStageBounds()
  const touch = event.pointerType === 'touch'
  pointer = {
    clientX: event.clientX,
    clientY: event.clientY,
    radius: (touch ? 5.5 : 6.5) * (scene?.gridStep ?? 12),
    maxDisplacement: (touch ? 0.68 : 0.8) * (scene?.gridStep ?? 12)
  }
  scheduleFrame()
}

function handlePointerDown(event: PointerEvent) {
  lastInput.value = event.pointerType === 'touch' ? 'touch' : 'mouse'
  handlePointerMove(event)
}

function clearPointer() {
  pointer = null
  scheduleFrame()
}

function handleVisibilityChange() {
  pageVisible = document.visibilityState === 'visible'
  if (!pageVisible) pointer = null
  updatePausedState()
}

function handleWindowBlur() {
  windowFocused = false
  pointer = null
  updatePausedState()
}

function handleWindowFocus() {
  windowFocused = true
  updatePausedState()
}

function handleIntersection(entries: IntersectionObserverEntry[]) {
  visibleInViewport = entries.some((entry) => entry.isIntersecting)
  if (!visibleInViewport) pointer = null
  updatePausedState()
}

function handlePageShow(event: PageTransitionEvent) {
  if (!event.persisted || !scene || !gridContext || !markContext) return
  pageVisible = document.visibilityState === 'visible'
  windowFocused = document.hasFocus()
  pointer = null
  activeGridIndices.clear()
  horizontalOffsets.fill(0)
  verticalOffsets.fill(0)
  startedAt = performance.now() - HOME_HERO_PARTICLE_GATHER_DURATION_MS
  drawStaticScene()
  if (!pageVisible || !windowFocused || !visibleInViewport) setPaused()
}

function removeCanvasListeners() {
  const element = stage.value
  if (!element) return
  element.removeEventListener('pointermove', handlePointerMove)
  element.removeEventListener('pointerdown', handlePointerDown)
  element.removeEventListener('pointerup', clearPointer)
  element.removeEventListener('pointercancel', clearPointer)
  element.removeEventListener('pointerleave', clearPointer)
}

function cleanupCanvas() {
  disposed = true
  stopFrame()
  removeCanvasListeners()
  resizeObserver?.disconnect()
  intersectionObserver?.disconnect()
  themeObserver?.disconnect()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('blur', handleWindowBlur)
  window.removeEventListener('focus', handleWindowFocus)
  window.removeEventListener('pageshow', handlePageShow)
  window.removeEventListener('resize', handleGeometryChange)
  document.removeEventListener('scroll', handleScroll, true)
  resizeObserver = null
  intersectionObserver = null
  themeObserver = null
  gridContext = null
  markContext = null
  backgroundCache = null
  backgroundCacheContext = null
  markCache = null
  markCacheContext = null
  markParticles = []
  markHorizontalOffsets = new Float32Array()
  markVerticalOffsets = new Float32Array()
  pointer = null
  activeGridIndices.clear()
  activeMarkIndices.clear()
  markIsSettled = false
}

function setStaticGeometry() {
  const element = stage.value
  if (!element) return
  updateStageBounds()
  const bounds = stageBounds
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) return
  logicalWidth = Math.floor(bounds.width)
  logicalHeight = Math.floor(bounds.height)
  publishSceneGeometry(createHomeHeroParticleScene(logicalWidth, logicalHeight))
}

function useStaticFallback() {
  cleanupCanvas()
  setStaticGeometry()
  renderMode.value = 'static-fallback'
  gridState.value = 'fallback'
  markState.value = 'fallback'
  particleCount.value = 0
  observeStaticGeometry()
}

function createSceneForCanvas(now: number) {
  const element = stage.value
  const gridElement = gridCanvas.value
  const markElement = markCanvas.value
  if (!element || !gridElement || !markElement || !gridContext || !markContext) return false

  updateStageBounds()
  const bounds = stageBounds
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) return false
  logicalWidth = Math.floor(bounds.width)
  logicalHeight = Math.floor(bounds.height)
  const device = navigator as Navigator & { deviceMemory?: number }
  pixelRatio.value = getHomeHeroParticlePixelRatio(
    window.devicePixelRatio || 1,
    device.deviceMemory ?? 4,
    navigator.hardwareConcurrency || 4
  )
  publishSceneGeometry(createHomeHeroParticleScene(logicalWidth, logicalHeight))
  if (!scene || scene.yPoints.length < 80 || scene.backgroundPoints.length < 300) {
    throw new Error('HomeHero fixed grid scene is incomplete')
  }

  createCanvasSurface(gridElement, gridContext)
  createCanvasSurface(markElement, markContext)
  if (!backgroundCache) backgroundCache = document.createElement('canvas')
  backgroundCacheContext = backgroundCache.getContext('2d', { alpha: true })
  if (!backgroundCacheContext) throw new Error('HomeHero background cache is unavailable')

  markParticles = createMarkParticles(scene.yPoints)
  createGridIndex()
  if (!markCache) markCache = document.createElement('canvas')
  particleCount.value = markParticles.length
  drawBackgroundCache()
  drawMarkFrame(now)
  return true
}

function handleGeometryChange() {
  if (!props.animateIntro || !gridContext || !markContext) {
    setStaticGeometry()
    return
  }
  try {
    readThemeColors()
    const updated = createSceneForCanvas(performance.now())
    if (!updated) return
    updatePausedState()
  } catch {
    useStaticFallback()
  }
}

function handleScroll() {
  updateStageBounds()
}

function observeStaticGeometry() {
  const element = stage.value
  if (!element) return
  window.addEventListener('resize', handleGeometryChange, { passive: true })
  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(handleGeometryChange)
    resizeObserver.observe(element)
  }
}

function handleThemeChange() {
  if (!props.animateIntro || !gridContext || !markContext) {
    readThemeColors()
    return
  }
  readThemeColors()
  pointer = null
  activeGridIndices.clear()
  horizontalOffsets.fill(0)
  verticalOffsets.fill(0)
  drawBackgroundCache()
  drawMarkFrame(performance.now())
}

function initializeCanvas() {
  if (!props.animateIntro || props.introStartedAt === null || !gridCanvas.value || !markCanvas.value || !stage.value) return
  cleanupCanvas()
  disposed = false
  pageVisible = document.visibilityState === 'visible'
  windowFocused = document.hasFocus()
  visibleInViewport = true
  startedAt = props.introStartedAt
  lastFrameAt = -Infinity
  readThemeColors()

  try {
    gridContext = gridCanvas.value.getContext('2d', { alpha: true })
    markContext = markCanvas.value.getContext('2d', { alpha: true })
    if (!gridContext || !markContext) throw new Error('HomeHero Canvas 2D is unavailable')
    if (!createSceneForCanvas(performance.now())) return
    renderMode.value = 'canvas'
    gridState.value = pageVisible ? 'settled' : 'paused'
    markState.value = pageVisible ? getHomeHeroParticleState(startedAt, performance.now()) : 'paused'

    stage.value.addEventListener('pointermove', handlePointerMove, { passive: true })
    stage.value.addEventListener('pointerdown', handlePointerDown, { passive: true })
    stage.value.addEventListener('pointerup', clearPointer, { passive: true })
    stage.value.addEventListener('pointercancel', clearPointer, { passive: true })
    stage.value.addEventListener('pointerleave', clearPointer, { passive: true })
    document.addEventListener('visibilitychange', handleVisibilityChange)
    document.addEventListener('scroll', handleScroll, { capture: true, passive: true })
    window.addEventListener('resize', handleGeometryChange, { passive: true })
    window.addEventListener('blur', handleWindowBlur)
    window.addEventListener('focus', handleWindowFocus)
    window.addEventListener('pageshow', handlePageShow)

    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(handleGeometryChange)
      resizeObserver.observe(stage.value)
    }
    if ('IntersectionObserver' in window) {
      intersectionObserver = new IntersectionObserver(handleIntersection, { threshold: 0 })
      intersectionObserver.observe(stage.value)
    }
    themeObserver = new MutationObserver(handleThemeChange)
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    updatePausedState()
  } catch {
    useStaticFallback()
  }
}

function initializeStaticScene() {
  cleanupCanvas()
  readThemeColors()
  setStaticGeometry()
  renderMode.value = 'static'
  gridState.value = 'static'
  markState.value = 'static'
  particleCount.value = 0
  observeStaticGeometry()
}

watch([() => props.animateIntro, () => props.introStartedAt], async ([shouldAnimate]) => {
  await nextTick()
  if (shouldAnimate && props.introStartedAt !== null) initializeCanvas()
  else initializeStaticScene()
}, { flush: 'post' })

onMounted(() => {
  if (props.animateIntro && props.introStartedAt !== null) initializeCanvas()
  else initializeStaticScene()
})

onBeforeUnmount(cleanupCanvas)
</script>

<template>
  <div
    ref="stage"
    class="home-hero-particles"
    :data-render-mode="renderMode"
    :data-grid-step="gridStep"
    :data-grid-origin-x="gridOriginX"
    :data-grid-origin-y="gridOriginY"
    :data-grid-columns="gridColumns"
    :data-grid-rows="gridRows"
    aria-hidden="true"
  >
    <canvas
      v-if="props.animateIntro && renderMode !== 'static-fallback'"
      ref="gridCanvas"
      class="home-hero-particles-grid"
      data-grid-source="fixed-logical-pixels"
      :data-grid-step="gridStep"
      :data-particle-state="gridState"
      :data-pixel-ratio="pixelRatio"
    ></canvas>
    <canvas
      v-if="props.animateIntro && renderMode !== 'static-fallback'"
      ref="markCanvas"
      class="home-hero-particles-canvas"
      data-target-source="fixed-grid"
      :data-particle-state="markState"
      :data-particle-count="particleCount"
      :data-pixel-ratio="pixelRatio"
      :data-last-input="lastInput"
    ></canvas>
    <svg
      class="home-hero-particles-mark"
      data-mark-source="vector"
      :viewBox="svgViewBox"
      preserveAspectRatio="none"
      focusable="false"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="home-hero-fixed-grid"
          patternUnits="userSpaceOnUse"
          :x="gridOriginX - gridStep / 2"
          :y="gridOriginY - gridStep / 2"
          :width="gridStep || 8"
          :height="gridStep || 8"
        >
          <circle :cx="(gridStep || 8) / 2" :cy="(gridStep || 8) / 2" :r="(gridStep || 8) * GRID_DOT_RADIUS_RATIO" class="home-hero-particles-fallback-dot" />
        </pattern>
        <pattern
          id="home-hero-mark-grid"
          patternUnits="userSpaceOnUse"
          :x="gridOriginX - gridStep / 2"
          :y="gridOriginY - gridStep / 2"
          :width="gridStep || 8"
          :height="gridStep || 8"
        >
          <circle :cx="(gridStep || 8) / 2" :cy="(gridStep || 8) / 2" :r="(gridStep || 8) * MARK_DOT_RADIUS_RATIO" class="home-hero-particles-fallback-mark-dot" />
        </pattern>
        <mask id="home-hero-butterfly-opening" maskUnits="userSpaceOnUse" :x="0" :y="0" :width="sceneWidth" :height="sceneHeight">
          <rect :width="sceneWidth" :height="sceneHeight" fill="white" />
          <path :d="HOME_HERO_BUTTERFLY_PATH" :transform="butterflyTransform()" fill="black" />
        </mask>
      </defs>
      <rect :width="sceneWidth" :height="sceneHeight" fill="url(#home-hero-fixed-grid)" mask="url(#home-hero-butterfly-opening)" />
      <path data-y-mark="true" :d="HOME_HERO_Y_PATH" :transform="markTransform()" fill="url(#home-hero-mark-grid)" />
    </svg>
    <div class="home-hero-particles-labels">
      <span>RESEARCH</span>
      <span>BUILD</span>
      <span>LIVE</span>
    </div>
  </div>
</template>
