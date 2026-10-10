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
interface TimedSegment { from: TimedPoint; to: TimedPoint }
export interface HomeHeroPointerPiece extends HomeHeroPointerInput { duration: number }

// Input remains timestamped until the fixed simulation step consumes it.
export class HomeHeroPointerTimeline {
  private segments: TimedSegment[] = []
  private latest: TimedPoint | null = null
  private consumed: TimedPoint | null = null
  private releasedAt = Infinity
  velocity = { x: 0, y: 0 }
  get released() { return Number.isFinite(this.releasedAt) }
  get connected() { return this.latest !== null && !this.released }
  get hasPending() { return this.segments.length > 0 }

  move(point: TimedPoint) {
    if (!Number.isFinite(point.at + point.x + point.y)) return
    if (this.released) this.reset()
    if (this.latest && this.latest.pointerId !== point.pointerId) return
    if (!this.latest) {
      this.latest = { ...point }
      this.consumed = { ...point }
      return
    }
    if (point.at < this.latest.at) return
    if (point.at === this.latest.at) {
      // Coalesced events can share a timestamp; retain their final location.
      this.latest = { ...point }
      return
    }
    this.segments.push({ from: this.latest, to: { ...point } })
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
      this.segments.splice(index, 2, { from: this.segments[index]!.from, to: this.segments[index + 1]!.to })
    }
  }

  release(at: number) { this.releasedAt = Math.min(this.releasedAt, at) }
  reset() {
    this.segments = []
    this.latest = null
    this.consumed = null
    this.releasedAt = Infinity
    this.velocity = { x: 0, y: 0 }
  }

  consume(start: number, end: number): HomeHeroPointerPiece[] {
    if (!this.consumed || end <= start) return []
    const finish = Math.min(end, this.releasedAt)
    const pieces: HomeHeroPointerPiece[] = []
    let cursor = Math.max(start, this.consumed.at)
    const add = (fromX: number, fromY: number, x: number, y: number, duration: number) => {
      if (duration <= 0) return
      const rawX = clamp((x - fromX) / duration, -2600, 2600)
      const rawY = clamp((y - fromY) / duration, -2600, 2600)
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
    for (const segment of this.segments) {
      if (segment.to.at <= cursor || segment.from.at >= finish) continue
      if (segment.from.at > cursor) add(this.consumed.x, this.consumed.y, this.consumed.x, this.consumed.y, Math.min(finish, segment.from.at) - cursor)
      const left = Math.max(cursor, segment.from.at)
      const right = Math.min(finish, segment.to.at)
      const length = segment.to.at - segment.from.at
      const point = (at: number) => ({ x: segment.from.x + (segment.to.x - segment.from.x) * (at - segment.from.at) / length,
        y: segment.from.y + (segment.to.y - segment.from.y) * (at - segment.from.at) / length })
      const from = point(left)
      const to = point(right)
      add(from.x, from.y, to.x, to.y, right - left)
    }
    if (cursor < finish) add(this.consumed.x, this.consumed.y, this.consumed.x, this.consumed.y, finish - cursor)
    this.segments = this.segments.filter(segment => segment.to.at > finish)
    if (end >= this.releasedAt) {
      this.latest = null
      this.consumed = null
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
    const distance = Math.hypot(offset.dx, offset.dy)
    if (distance >= radius) continue
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
  const displacement = Math.hypot(dx, dy)
  if (displacement > radius * 1.1) {
    const constraint = 140 * (displacement - radius * 1.1) / displacement
    ax -= dx * constraint
    ay -= dy * constraint
  }
  p.vx += ax * seconds
  p.vy += ay * seconds
  const speed = Math.hypot(p.vx, p.vy)
  const limit = mobile ? 390 : 520
  if (speed > limit) {
    p.vx *= limit / speed
    p.vy *= limit / speed
  }
  p.x += p.vx * seconds
  p.y += p.vy * seconds
  const offset = Math.hypot(p.x - p.homeX, p.y - p.homeY)
  if (offset > radius * 1.65) {
    p.x = p.homeX + (p.x - p.homeX) * radius * 1.65 / offset
    p.y = p.homeY + (p.y - p.homeY) * radius * 1.65 / offset
    p.vx *= 0.4
    p.vy *= 0.4
  }
  if (!underPointer && offset < 0.25 && Math.hypot(p.vx, p.vy) < 2.5) {
    p.settledForMs += seconds * 1000
    if (p.settledForMs >= 40) {
      p.x = p.homeX
      p.y = p.homeY
      p.vx = 0
      p.vy = 0
    }
  } else p.settledForMs = 0
  return Math.hypot(p.vx, p.vy) > 0.6 || Math.hypot(ax, ay) > 3 || !underPointer && p.settledForMs < 40
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
    this.pointer.reset()
    this.clock = at
    this.previousAt = at
    this.remainder = 0
    this.moving = false
  }
  advanceTo(at: number) {
    const elapsed = at - this.previousAt
    // Preserve valid input through occasional rendering stalls. A genuinely
    // suspended clock (including the 800ms case) restores the complete scene.
    if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed > 0.75) {
      this.reset(at)
      return
    }
    this.previousAt = at
    this.remainder += elapsed
    const step = HOME_HERO_PARTICLE_FIXED_STEP_SECONDS
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
