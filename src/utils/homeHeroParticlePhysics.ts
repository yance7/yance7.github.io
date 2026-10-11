import { distanceToHomeHeroSweep, getHomeHeroParticleCandidates, type HomeHeroParticleScene, type HomeHeroParticleTarget } from './homeHeroParticleScene'

export type HomeHeroParticle = HomeHeroParticleTarget
export interface HomeHeroPointerSample { x: number; y: number; vx: number; vy: number }
export interface HomeHeroPointerInput extends HomeHeroPointerSample { fromX: number; fromY: number }
export interface HomeHeroParticlePhysicsOptions { mobile?: boolean }
const HOME_HERO_PARTICLE_FIXED_STEP_SECONDS = 1 / 120
const VELOCITY_TAU = 0.045
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value))

export function createHomeHeroPointerInput(previous: HomeHeroPointerSample | null, position: { x: number; y: number }, deltaSeconds: number): HomeHeroPointerInput {
  if (!previous) return { fromX: position.x, fromY: position.y, ...position, vx: 0, vy: 0 }
  const seconds = clamp(Number.isFinite(deltaSeconds) ? deltaSeconds : 1 / 60, 1 / 1000, 0.1)
  const blend = 1 - Math.exp(-seconds / VELOCITY_TAU)
  return { fromX: previous.x, fromY: previous.y, ...position,
    vx: previous.vx + (clamp((position.x - previous.x) / seconds, -2600, 2600) - previous.vx) * blend,
    vy: previous.vy + (clamp((position.y - previous.y) / seconds, -2600, 2600) - previous.vy) * blend }
}

interface TimedPoint { pointerId: number; pointerType: string; x: number; y: number; at: number }
interface TimedSegment { from: TimedPoint; to: TimedPoint; progress: number }
export interface HomeHeroPointerPiece extends HomeHeroPointerInput { duration: number }

// Input remains timestamped until the fixed simulation step consumes it.
export class HomeHeroPointerTimeline {
  private segments: TimedSegment[] = []
  private latest: TimedPoint | null = null
  private consumed: TimedPoint | null = null
  private consumedUntil = -Infinity
  private releasedAt = Infinity
  private unconsumedInput = false
  velocity = { x: 0, y: 0 }
  get released() { return Number.isFinite(this.releasedAt) }
  get connected() { return this.latest !== null && !this.released }
  get hasPending() { return this.segments.length > 0 }
  get hasUnconsumedInput() { return this.unconsumedInput }

  move(point: TimedPoint) {
    if (!Number.isFinite(point.at + point.x + point.y)) return
    if (this.released) this.reset()
    if (this.latest && this.latest.pointerId !== point.pointerId) return
    if (!this.latest) {
      this.unconsumedInput = true
      this.latest = { ...point }
      this.consumed = { ...point, at: Math.max(point.at, this.consumedUntil) }
      return
    }
    if (point.at < this.latest.at) return
    this.unconsumedInput = true
    if (point.at === this.latest.at) {
      // Coalesced events can share a timestamp; retain their final location.
      this.latest = { ...point }
      return
    }
    this.segments.push({ from: this.latest, to: { ...point }, progress: 0 })
    this.latest = { ...point }
    if (this.segments.length > 128) {
      // Merge the least curved adjacent pair rather than dropping a turn.
      let index = 0
      let minimum = Infinity
      for (let i = 0; i < this.segments.length - 1; i += 1) {
        const a = this.segments[i]!
        const b = this.segments[i + 1]!
        const offset = distanceToHomeHeroSweep(a.to.x, a.to.y, { fromX: a.from.x, fromY: a.from.y, x: b.to.x, y: b.to.y })
        const deviation = Math.hypot(offset.dx, offset.dy)
        if (deviation < minimum) {
          minimum = deviation
          index = i
        }
      }
      const first = this.segments[index]!
      const from = { ...first.from,
        x: first.from.x + (first.to.x - first.from.x) * first.progress,
        y: first.from.y + (first.to.y - first.from.y) * first.progress,
        at: first.from.at + (first.to.at - first.from.at) * first.progress }
      this.segments.splice(index, 2, { from, to: this.segments[index + 1]!.to, progress: 0 })
    }
  }

  release(at: number) { this.releasedAt = Math.min(this.releasedAt, at) }
  reset(at = this.consumedUntil) {
    this.segments = []
    this.latest = null
    this.consumed = null
    this.consumedUntil = at
    this.releasedAt = Infinity
    this.unconsumedInput = false
    this.velocity = { x: 0, y: 0 }
  }

  consume(start: number, end: number): HomeHeroPointerPiece[] {
    if (end > start) this.consumedUntil = Math.max(this.consumedUntil, end)
    if (!this.consumed || end <= start) return []
    const finish = Math.min(end, this.releasedAt)
    const pieces: HomeHeroPointerPiece[] = []
    let cursor = Math.max(start, this.consumed.at)
    if (cursor >= end) return pieces
    const paths: { fromX: number; fromY: number; x: number; y: number; duration: number }[] = []
    for (const segment of this.segments) {
      const length = segment.to.at - segment.from.at
      const progress = clamp((finish - segment.from.at) / length, 0, 1)
      if (progress <= segment.progress) continue
      paths.push({
        fromX: segment.from.x + (segment.to.x - segment.from.x) * segment.progress,
        fromY: segment.from.y + (segment.to.y - segment.from.y) * segment.progress,
        x: segment.from.x + (segment.to.x - segment.from.x) * progress,
        y: segment.from.y + (segment.to.y - segment.from.y) * progress,
        duration: (progress - segment.progress) * length
      })
      segment.progress = progress
    }
    this.segments = this.segments.filter(segment => segment.progress < 1)
    // Keep raw event time for velocity, but consume all overdue geometry in
    // this step. Replaying its original duration would postpone real release.
    const pathDuration = paths.reduce((total, path) => total + path.duration, 0)
    const scale = Math.min(1, (end - cursor) / (pathDuration || 1))
    const add = (fromX: number, fromY: number, x: number, y: number, duration: number, sourceDuration = duration) => {
      if (duration <= 0) return
      const rawX = clamp((x - fromX) / sourceDuration, -2600, 2600)
      const rawY = clamp((y - fromY) / sourceDuration, -2600, 2600)
      const decay = Math.exp(-duration / VELOCITY_TAU)
      const average = VELOCITY_TAU * (1 - decay) / duration
      const vx = rawX + (this.velocity.x - rawX) * average
      const vy = rawY + (this.velocity.y - rawY) * average
      this.velocity.x = rawX + (this.velocity.x - rawX) * decay
      this.velocity.y = rawY + (this.velocity.y - rawY) * decay
      pieces.push({ fromX, fromY, x, y, vx, vy, duration })
      this.consumed = { ...this.consumed!, x, y, at: cursor + duration }
      cursor += duration
    }
    for (const path of paths) add(path.fromX, path.fromY, path.x, path.y, path.duration * scale, path.duration)
    if (cursor < finish) add(this.consumed.x, this.consumed.y, this.consumed.x, this.consumed.y, finish - cursor)
    if (!this.segments.length && this.latest && this.latest.at <= end) this.unconsumedInput = false
    if (end >= this.releasedAt) {
      this.latest = null
      this.consumed = null
      this.unconsumedInput = false
      this.velocity = { x: 0, y: 0 }
    }
    return pieces
  }
}

function integrate(p: HomeHeroParticle, inputs: readonly HomeHeroPointerPiece[], seconds: number, radius: number, mobile: boolean) {
  let ax = (p.homeX - p.x) * 42 - p.vx * 10.5
  let ay = (p.homeY - p.y) * 42 - p.vy * 10.5
  let underPointer = false
  for (const input of inputs) {
    const offset = distanceToHomeHeroSweep(p.x, p.y, input)
    const distanceSquared = offset.dx * offset.dx + offset.dy * offset.dy
    if (distanceSquared >= radius * radius) continue
    const distance = Math.sqrt(distanceSquared)
    const falloff = 1 - distance / radius
    const weight = input.duration / seconds * (p.kind === 'field' ? 0.48 : 1)
    const angle = p.id * 2.399963229728653
    const nx = distance > 0.001 ? offset.dx / distance : Math.cos(angle)
    const ny = distance > 0.001 ? offset.dy / distance : Math.sin(angle)
    ax += (nx * 2500 * falloff * falloff + 8 * falloff * (input.vx - p.vx)) * weight
    ay += (ny * 2500 * falloff * falloff + 8 * falloff * (input.vy - p.vy)) * weight
    underPointer = true
  }
  const dx = p.x - p.homeX
  const dy = p.y - p.homeY
  const displacementSquared = dx * dx + dy * dy
  if (displacementSquared > (radius * 1.1) ** 2) {
    const displacement = Math.sqrt(displacementSquared)
    const constraint = 140 * (displacement - radius * 1.1) / displacement
    ax -= dx * constraint
    ay -= dy * constraint
  }
  p.vx += ax * seconds
  p.vy += ay * seconds
  const limit = mobile ? 390 : 520
  if (p.vx * p.vx + p.vy * p.vy > limit * limit) {
    const speed = Math.hypot(p.vx, p.vy)
    p.vx *= limit / speed
    p.vy *= limit / speed
  }
  p.x += p.vx * seconds
  p.y += p.vy * seconds
  const homeDx = p.x - p.homeX
  const homeDy = p.y - p.homeY
  const offsetSquared = homeDx * homeDx + homeDy * homeDy
  if (offsetSquared > (radius * 1.65) ** 2) {
    const offset = Math.sqrt(offsetSquared)
    p.x = p.homeX + (p.x - p.homeX) * radius * 1.65 / offset
    p.y = p.homeY + (p.y - p.homeY) * radius * 1.65 / offset
    p.vx *= 0.4
    p.vy *= 0.4
  }
  if (!underPointer && offsetSquared < 0.25 ** 2 && p.vx * p.vx + p.vy * p.vy < 2.5 ** 2) {
    p.settledForMs += seconds * 1000
    if (p.settledForMs >= 40) {
      p.x = p.homeX
      p.y = p.homeY
      p.vx = 0
      p.vy = 0
    }
  } else p.settledForMs = 0
  return !underPointer && p.settledForMs < 40 || p.vx * p.vx + p.vy * p.vy > 0.6 ** 2 || ax * ax + ay * ay > 3 ** 2
}

export function advanceHomeHeroParticles(particles: HomeHeroParticle[], pointer: HomeHeroPointerInput | null, deltaSeconds: number, options: HomeHeroParticlePhysicsOptions = {}): boolean {
  const seconds = clamp(Number.isFinite(deltaSeconds) ? deltaSeconds : 0, 0, 1 / 30)
  if (seconds === 0) return particles.some(p => p.settledForMs < 40)
  const inputs = pointer ? [{ ...pointer, duration: seconds }] : []
  let moving = false
  for (const p of particles) moving = integrate(p, inputs, seconds, options.mobile ? 90 : 120, Boolean(options.mobile)) || moving
  return moving
}

export class HomeHeroParticleEngine {
  readonly pointer = new HomeHeroPointerTimeline()
  readonly active = new Set<number>()
  readonly radius: number
  readonly stats = { candidates: 0, peakCandidates: 0, peakActive: 0 }
  private clock: number
  private previousAt: number
  private remainder = 0
  moving = false
  constructor(readonly scene: HomeHeroParticleScene, private options: HomeHeroParticlePhysicsOptions & { startedAt: number }) {
    this.clock = options.startedAt
    this.previousAt = options.startedAt
    this.pointer.reset(options.startedAt)
    this.radius = clamp(scene.width * 0.075, 72, 112) * (options.mobile ? 0.75 : 1)
  }
  get needsFrame() {
    return this.moving || this.pointer.hasPending || this.active.size > 0 && this.remainder > 1e-9
  }
  gather() {
    for (const p of this.scene.particles) {
      if (p.kind !== 'word') continue
      const angle = p.id * 2.399963229728653
      const distance = 8 + (p.id * 13 % 15)
      p.x += Math.cos(angle) * distance
      p.y += Math.sin(angle) * distance
      p.settledForMs = 0
      this.active.add(p.id)
    }
    this.moving = true
  }
  reset(at: number) {
    for (const id of this.active) {
      const p = this.scene.particles[id]!
      p.x = p.homeX
      p.y = p.homeY
      p.vx = 0
      p.vy = 0
      p.settledForMs = 40
    }
    this.active.clear()
    this.pointer.reset(at)
    this.clock = at
    this.previousAt = at
    this.remainder = 0
    this.moving = false
  }
  advanceTo(at: number) {
    let elapsed = at - this.previousAt
    const step = HOME_HERO_PARTICLE_FIXED_STEP_SECONDS
    if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed > 0.75 && !this.pointer.hasUnconsumedInput) {
      this.reset(at)
      return
    }
    if (elapsed > 0.75) {
      // Fresh input proves this is a foreground render stall. Keep its path
      // and advance one bounded step rather than clearing it or replaying the gap.
      this.clock = at - step
      this.remainder = 0
      elapsed = step
    }
    this.previousAt = at
    this.remainder += elapsed
    let substeps = 0
    this.moving = false
    while (this.remainder + 1e-9 >= step && substeps < 90) {
      substeps += 1
      const inputs = this.pointer.consume(this.clock, this.clock + step)
      const candidates = new Set<number>()
      for (const input of inputs) {
        for (const id of getHomeHeroParticleCandidates(this.scene, input, this.radius)) candidates.add(id)
      }
      this.stats.candidates = candidates.size
      this.stats.peakCandidates = Math.max(this.stats.peakCandidates, candidates.size)
      for (const id of candidates) this.active.add(id)
      let moving = false
      for (const id of this.active) {
        const p = this.scene.particles[id]!
        moving = integrate(p, inputs, step, this.radius, Boolean(this.options.mobile)) || moving
        if (p.settledForMs >= 40) this.active.delete(id)
      }
      this.stats.peakActive = Math.max(this.stats.peakActive, this.active.size)
      this.moving = moving || Math.hypot(this.pointer.velocity.x, this.pointer.velocity.y) > 1
      this.clock += step
      this.remainder -= step
    }
  }
}
