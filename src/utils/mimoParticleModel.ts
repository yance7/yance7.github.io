import type { HomeHeroParticleScene, HomeHeroParticleTarget } from './homeHeroParticleTypes'
export { getMimoFontSize } from './homeHeroParticleSizing'

export const MIMO_PARTICLE_SETTINGS = Object.freeze({
  fontFamily: 'Amiri, serif',
  fontWeight: '400',
  gridStep: 2,
  alphaThreshold: 40,
  pointSize: 1.8,
  radius: 120,
  maxOffset: 40,
  pointerBlend: 0.18,
  particleBlend: 0.55,
  entranceSeconds: 1.6,
  entranceDelaySeconds: 0.42,
  driftAmplitude: 0.15
})

export interface MimoPosition { x: number; y: number }

export function getMimoParticleBudget() {
  return 12000
}

export function getMimoRepulsion(particle: MimoPosition, pointer: MimoPosition, active: boolean): MimoPosition {
  const dx = particle.x - pointer.x
  const dy = particle.y - pointer.y
  const distance = Math.hypot(dx, dy)
  if (!active || distance <= 0.1 || distance >= MIMO_PARTICLE_SETTINGS.radius) return { x: 0, y: 0 }
  const offset = (1 - distance / MIMO_PARTICLE_SETTINGS.radius) * MIMO_PARTICLE_SETTINGS.maxOffset
  return { x: dx / distance * offset, y: dy / distance * offset }
}

export interface MimoTextMask { maskWidth: number; maskHeight: number; rgba: ArrayLike<number> }

export function createMimoParticleScene(mask: MimoTextMask & { width: number; height: number }): HomeHeroParticleScene {
  const budget = getMimoParticleBudget()
  const opaque = (x: number, y: number) => x >= 0 && y >= 0 && x < mask.maskWidth && y < mask.maskHeight
    && (mask.rgba[(y * mask.maskWidth + x) * 4 + 3] ?? 0) > 40
  const boundary = (x: number, y: number) => !opaque(x - 2, y) || !opaque(x + 2, y) || !opaque(x, y - 2) || !opaque(x, y + 2)
  let sampledCount = 0
  let contourCount = 0
  for (let y = 0; y < mask.maskHeight; y += 2) {
    for (let x = 0; x < mask.maskWidth; x += 2) {
      if (!opaque(x, y)) continue
      sampledCount++
      if (boundary(x, y)) contourCount++
    }
  }
  const preserveContour = contourCount <= budget
  const population = preserveContour ? sampledCount - contourCount : sampledCount
  const quota = Math.min(population, preserveContour ? budget - contourCount : budget)
  let eligibleIndex = 0
  const particles: HomeHeroParticleTarget[] = []
  for (let y = 0; y < mask.maskHeight; y += 2) {
    for (let x = 0; x < mask.maskWidth; x += 2) {
      if (!opaque(x, y)) continue
      if (sampledCount > budget && !(preserveContour && boundary(x, y))) {
        // Evenly distribute a fixed quota without the old ceil-stride cliff.
        const keep = Math.floor((eligibleIndex + 1) * quota / population) > Math.floor(eligibleIndex * quota / population)
        eligibleIndex++
        if (!keep) continue
      }
      const homeX = mask.width / 2 - mask.maskWidth / 2 + x
      const homeY = mask.height / 2 - mask.maskHeight / 2 + y
      particles.push({ id: particles.length, homeX, homeY, x: homeX, y: homeY, vx: 0, vy: 0, row: y / 2, column: x / 2, settledForMs: 40 })
    }
  }
  return { width: mask.width, height: mask.height, gridStep: 2, particles, sampledCount, cellSize: 24, cells: new Map() }
}

export function createMimoTextMask(width: number, height: number, fontFamily: string, fontWeight: string) {
  const scratch = document.createElement('canvas')
  const context = scratch.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('HomeHero text mask is unavailable')
  const remSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  let fontSize = Math.max(6 * remSize, Math.min(14 * remSize, window.innerWidth * 0.18))
  context.font = `${fontWeight} ${fontSize}px ${fontFamily}`
  let metrics = context.measureText('YANCE')
  if (Math.max(1, metrics.width) > width * 0.92) {
    fontSize = Math.max(18, width * 0.92 / Math.max(1, metrics.width) * fontSize)
    context.font = `${fontWeight} ${fontSize}px ${fontFamily}`
    metrics = context.measureText('YANCE')
  }
  const left = Math.ceil(metrics.actualBoundingBoxLeft || 0)
  const right = Math.ceil(metrics.actualBoundingBoxRight || metrics.width)
  const ascent = Math.ceil(metrics.actualBoundingBoxAscent || fontSize * 0.78)
  const descent = Math.ceil(metrics.actualBoundingBoxDescent || fontSize * 0.22)
  const padding = Math.max(12, Math.ceil(fontSize * 0.08))
  scratch.width = Math.max(1, left + right) + 2 * padding
  scratch.height = Math.max(1, ascent + descent) + 2 * padding
  context.clearRect(0, 0, scratch.width, scratch.height)
  context.font = `${fontWeight} ${fontSize}px ${fontFamily}`
  context.textAlign = 'left'
  context.textBaseline = 'alphabetic'
  context.fillStyle = '#fff'
  context.fillText('YANCE', padding - left, padding + ascent)
  const rgba = context.getImageData(0, 0, scratch.width, scratch.height).data
  let inkArea = 0
  for (let index = 3; index < rgba.length; index += 4) inkArea += rgba[index]! / 255
  const x = width / 2 - scratch.width / 2 + padding - left
  const baseline = height / 2 - scratch.height / 2 + padding + ascent
  return { rgba, maskWidth: scratch.width, maskHeight: scratch.height, inkArea,
    layout: { fontSize, x, baseline, bounds: { left: x - left, top: baseline - ascent, width: left + right, height: ascent + descent } } }
}

export function followMimoPointer(current: MimoPosition, target: MimoPosition): MimoPosition {
  return {
    x: current.x + (target.x - current.x) * MIMO_PARTICLE_SETTINGS.pointerBlend,
    y: current.y + (target.y - current.y) * MIMO_PARTICLE_SETTINGS.pointerBlend
  }
}

export function followMimoParticle(current: MimoPosition, target: MimoPosition): MimoPosition {
  return {
    x: current.x + (target.x - current.x) * MIMO_PARTICLE_SETTINGS.particleBlend,
    y: current.y + (target.y - current.y) * MIMO_PARTICLE_SETTINGS.particleBlend
  }
}
export function getMimoParticleAppearance(index: number, homeX: number, width: number) {
  const seed = ((9301 * index + 49297) % 233280) / 233280
  const depth = 0.45 + ((233 * index + 97) % 1000) / 1000 * 0.9
  const blend = Math.max(0, Math.min(1, homeX / Math.max(1, width) + (seed - 0.5) * 0.35))
  return { seed, depth, blend }
}

interface MimoInput extends MimoPosition { pointerId: number; pointerType: string; at: number }

class MimoPointer {
  position: MimoPosition
  smoothed: MimoPosition
  connected = false
  private id: number | undefined
  constructor(width: number, height: number) {
    this.position = { x: width / 2, y: height / 2 }
    this.smoothed = { ...this.position }
  }
  start(pointerId: number) {
    this.id = pointerId
    this.connected = true
  }
  move(input: MimoInput) {
    if (!Number.isFinite(input.x + input.y)) return
    if (input.pointerType === 'mouse') this.connected = true
    else if (this.id !== input.pointerId) return
    this.position = { x: input.x, y: input.y }
  }
  deactivate() { this.connected = false }
  release(_at: number) { this.reset() }
  matches(pointerId: number) { return this.id === pointerId }
  reset() {
    this.connected = false
    this.id = undefined
  }
}

interface MimoStart { x: number; y: number; seed: number; depth: number; delay: number }

export class MimoParticleEngine {
  readonly pointer: MimoPointer
  readonly active = new Set<number>()
  readonly radius = MIMO_PARTICLE_SETTINGS.radius
  readonly stats = { candidates: 0, peakCandidates: 0, peakActive: 0 }
  private readonly starts: MimoStart[]
  private gatheringStartedAt: number | null = null
  private clock: number
  moving = false

  constructor(readonly scene: HomeHeroParticleScene, options: { startedAt: number; mobile?: boolean }) {
    this.clock = options.startedAt
    this.pointer = new MimoPointer(scene.width, scene.height)
    this.starts = scene.particles.map((point, index) => {
      const { seed, depth } = getMimoParticleAppearance(index, point.homeX, scene.width)
      point.opacity = 1
      const angle = seed * Math.PI * 2
      const spread = 180 * (0.35 + 0.75 * depth)
      return {
        x: point.homeX + Math.cos(angle) * spread + (seed - 0.5) * 81,
        y: point.homeY + Math.sin(angle) * spread + (depth - 0.9) * 81,
        seed, depth, delay: 0.42 * seed
      }
    })
  }

  get gatheringUntil() { return (this.gatheringStartedAt ?? 0) + 1.6 + 0.42 }
  get needsFrame() { return true }
  get phase(): 'gathering' | 'settled' | 'disturbed' | 'recovering' {
    if (this.gatheringStartedAt !== null) return 'gathering'
    return this.active.size ? this.pointer.connected ? 'disturbed' : 'recovering' : 'settled'
  }

  gather(at = this.clock) {
    this.gatheringStartedAt = at
    this.scene.particles.forEach((point, index) => {
      Object.assign(point, { x: this.starts[index]!.x, y: this.starts[index]!.y, opacity: 0.35 })
      this.active.add(point.id)
    })
  }

  reset(at: number) {
    this.clock = at
    this.pointer.reset()
    this.gatheringStartedAt = null
    this.active.clear()
    for (const point of this.scene.particles) Object.assign(point, { x: point.homeX, y: point.homeY, opacity: 1 })
    this.moving = false
  }

  advanceTo(at: number) {
    this.clock = at
    this.pointer.smoothed = followMimoPointer(this.pointer.smoothed, this.pointer.position)
    let gathered = true
    let candidates = 0
    this.active.clear()
    this.scene.particles.forEach((point, index) => {
      const start = this.starts[index]!
      let targetX = point.homeX
      let targetY = point.homeY
      let progress = 1
      if (this.gatheringStartedAt !== null) {
        progress = Math.max(0, Math.min(1, (at - this.gatheringStartedAt - start.delay) / 1.6))
        const eased = 1 - (1 - progress) ** 3
        targetX = start.x + (point.homeX - start.x) * eased
        targetY = start.y + (point.homeY - start.y) * eased
        if (progress < 1) gathered = false
      } else {
        targetX += 0.15 * Math.sin(0.9 * at + 10 * start.seed) * start.depth
        targetY += 0.15 * Math.cos(0.75 * at + 10 * start.depth) * start.depth
      }
      const offset = getMimoRepulsion(point, this.pointer.smoothed, this.pointer.connected)
      if (offset.x || offset.y) candidates += 1
      const next = followMimoParticle(point, { x: targetX + offset.x, y: targetY + offset.y })
      point.x = next.x
      point.y = next.y
      point.opacity = Math.max(0, Math.min(1, 0.35 + 0.65 * progress))
      if (progress < 1 || Math.hypot(point.x - point.homeX, point.y - point.homeY) > 0.5) this.active.add(point.id)
    })
    if (this.gatheringStartedAt !== null && gathered) this.gatheringStartedAt = null
    this.stats.candidates = candidates
    this.stats.peakCandidates = Math.max(this.stats.peakCandidates, candidates)
    this.stats.peakActive = Math.max(this.stats.peakActive, this.active.size)
    this.moving = this.active.size > 0
  }
}
