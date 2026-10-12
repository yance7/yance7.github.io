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
  get endsAt() { return this.latest || this.released ? this.releasedAt : -Infinity }

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

const POINT_TAU_SECONDS = 0.028
const RECOVERY_TAU_SECONDS = 0.052
const POINTER_TAU_SECONDS = 0.075
const SWEEP_LIFETIME_SECONDS = 0.07
const MAX_OFFSET_CSS_PX = 54
const SETTLE_DISTANCE_CSS_PX = 0.03
const GATHER_DURATION_SECONDS = 1.3
const GATHER_DELAY_SECONDS = 0.28

export function getHomeHeroGlyphInfluence(distance: number, outerRadius: number): number {
  if (!Number.isFinite(distance) || !Number.isFinite(outerRadius) || outerRadius <= 0) return 0
  const outer = Math.max(0, 1 - Math.max(0, distance) / outerRadius)
  const inner = Math.max(0, 1 - Math.max(0, distance) / (outerRadius * 0.28))
  return 12 * outer * outer + 34 * inner * inner
}

interface PreparedPointer extends HomeHeroPointerInput { carryX: number; carryY: number }
function preparePointer(input: HomeHeroPointerInput): PreparedPointer {
  const speed = Math.sqrt(input.vx * input.vx + input.vy * input.vy)
  const carry = speed > 0 ? Math.min(10, speed / 160) / speed : 0
  return { ...input, carryX: input.vx * carry, carryY: input.vy * carry }
}

function targetOffset(p: HomeHeroParticle, baseX: number, baseY: number, inputs: readonly PreparedPointer[], radius: number) {
  let x = 0
  let y = 0
  let strongest = 0
  for (const input of inputs) {
    let offset = distanceToHomeHeroSweep(baseX, baseY, input)
    let distanceSquared = offset.dx * offset.dx + offset.dy * offset.dy
    // A displaced particle remains touchable even when its home lies outside
    // the influence radius. Inside the radius, the stable base avoids feedback.
    if (distanceSquared >= radius * radius) {
      offset = distanceToHomeHeroSweep(p.x, p.y, input)
      distanceSquared = offset.dx * offset.dx + offset.dy * offset.dy
    }
    if (distanceSquared >= radius * radius) continue
    const distance = Math.sqrt(distanceSquared)
    const strength = getHomeHeroGlyphInfluence(distance, radius)
    if (!strength) continue
    const angle = (p.id + 1) * 2.399963229728653
    const nx = distance > 0.001 ? offset.dx / distance : Math.cos(angle)
    const ny = distance > 0.001 ? offset.dy / distance : Math.sin(angle)
    const falloff = (1 - distance / radius) ** 2
    let dx = nx * strength + input.carryX * falloff
    let dy = ny * strength + input.carryY * falloff
    const magnitudeSquared = dx * dx + dy * dy
    if (magnitudeSquared > MAX_OFFSET_CSS_PX ** 2) {
      const magnitude = Math.sqrt(magnitudeSquared)
      dx *= MAX_OFFSET_CSS_PX / magnitude
      dy *= MAX_OFFSET_CSS_PX / magnitude
    }
    const response = dx * dx + dy * dy
    if (response > strongest) {
      x = dx
      y = dy
      strongest = response
    }
  }
  return { x, y }
}

function approach(p: HomeHeroParticle, x: number, y: number, seconds: number, tau: number, alpha = -Math.expm1(-seconds / tau)) {
  const dx = x - p.x
  const dy = y - p.y
  p.vx = dx / tau * (1 - alpha)
  p.vy = dy / tau * (1 - alpha)
  p.x += dx * alpha
  p.y += dy * alpha
  const distanceSquared = dx * dx + dy * dy
  const settledRadiusSquared = SETTLE_DISTANCE_CSS_PX ** 2
  if (distanceSquared >= settledRadiusSquared / (1 - alpha) ** 2) p.settledForMs = 0
  else {
    const crossing = distanceSquared > settledRadiusSquared ? tau * Math.log(Math.sqrt(distanceSquared) / SETTLE_DISTANCE_CSS_PX) : 0
    p.settledForMs = Math.max(0, seconds - crossing) * 1000 + (crossing === 0 ? p.settledForMs : 0)
  }
  if (p.settledForMs >= 40) {
    p.x = x
    p.y = y
    p.vx = 0
    p.vy = 0
    return false
  }
  return true
}

export function advanceHomeHeroParticles(particles: HomeHeroParticle[], pointer: HomeHeroPointerInput | null, deltaSeconds: number, options: HomeHeroParticlePhysicsOptions = {}): boolean {
  const seconds = Math.max(0, Number.isFinite(deltaSeconds) ? deltaSeconds : 0)
  if (!seconds) return particles.some(p => p.settledForMs < 40)
  let moving = false
  const inputs = pointer ? [preparePointer(pointer)] : []
  for (const p of particles) {
    const offset = targetOffset(p, p.homeX, p.homeY, inputs, options.mobile ? 100 : 120)
    moving = approach(p, p.homeX + offset.x, p.homeY + offset.y, seconds,
      offset.x || offset.y ? POINT_TAU_SECONDS : RECOVERY_TAU_SECONDS) || moving
  }
  return moving
}

interface GlyphStart { x: number; y: number; seed: number; delay: number }
interface GlyphOffset { id: number; x: number; y: number; strength: number }
interface RecentSweep { input: HomeHeroPointerInput; expiresAt: number; offsets?: GlyphOffset[] }
export type HomeHeroGlyphPhase = 'gathering' | 'settled' | 'disturbed' | 'recovering'

export class HomeHeroParticleEngine {
  readonly pointer = new HomeHeroPointerTimeline()
  readonly active = new Set<number>()
  readonly radius: number
  readonly stats = { candidates: 0, peakCandidates: 0, peakActive: 0 }
  private clock: number
  private previousAt: number
  private gatheringStartedAt: number | null = null
  private starts: GlyphStart[] = []
  private sweeps: RecentSweep[] = []
  private smoothedPointer: { x: number; y: number } | null = null
  private readonly responseX: Float64Array
  private readonly responseY: Float64Array
  private readonly responseStrength: Float64Array
  moving = false

  constructor(readonly scene: HomeHeroParticleScene, options: HomeHeroParticlePhysicsOptions & { startedAt: number }) {
    this.clock = options.startedAt
    this.previousAt = options.startedAt
    this.pointer.reset(options.startedAt)
    this.radius = clamp(scene.width * 0.16, 100, 140)
    this.responseX = new Float64Array(scene.particles.length)
    this.responseY = new Float64Array(scene.particles.length)
    this.responseStrength = new Float64Array(scene.particles.length)
  }

  get gatheringUntil() {
    return this.gatheringStartedAt === null ? 0 : this.gatheringStartedAt + GATHER_DURATION_SECONDS + GATHER_DELAY_SECONDS
  }
  get phase(): HomeHeroGlyphPhase {
    if (this.gatheringStartedAt !== null && this.previousAt < this.gatheringUntil) return 'gathering'
    if (!this.active.size) return 'settled'
    return this.pointer.connected ? 'disturbed' : 'recovering'
  }
  get needsFrame() {
    return this.moving || this.phase === 'gathering' || this.pointer.hasPending || this.pointer.hasUnconsumedInput
  }

  gather() {
    this.gatheringStartedAt = this.previousAt
    const spread = clamp(Math.min(this.scene.width * 0.2, this.scene.height * 0.35), 40, 140)
    this.starts = this.scene.particles.map(p => {
      const seed = ((Math.imul(p.id + 1, 73856093) ^ Math.imul(p.row + 1, 19349663)) >>> 0) / 4294967296
      const angle = (p.id + 1) * 2.399963229728653
      const distance = spread * (0.6 + seed * 0.7)
      const x = clamp(p.homeX + Math.cos(angle) * distance, 1, this.scene.width - 1)
      const y = clamp(p.homeY + Math.sin(angle) * distance, 1, this.scene.height - 1)
      p.x = x
      p.y = y
      p.vx = 0
      p.vy = 0
      p.settledForMs = 0
      this.active.add(p.id)
      return { x, y, seed, delay: seed * GATHER_DELAY_SECONDS }
    })
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
    this.gatheringStartedAt = null
    this.starts = []
    this.sweeps = []
    this.smoothedPointer = null
    this.moving = false
  }

  private recoverTo(at: number) {
    const seconds = at - this.clock
    if (seconds <= 0) return
    const alpha = -Math.expm1(-seconds / RECOVERY_TAU_SECONDS)
    for (const id of this.active) {
      const p = this.scene.particles[id]!
      if (!approach(p, p.homeX, p.homeY, seconds, RECOVERY_TAU_SECONDS, alpha)) this.active.delete(id)
    }
    this.clock = at
  }

  private mergeOffsets(offsets: readonly GlyphOffset[]) {
    let added = 0
    for (const offset of offsets) {
      const previous = this.responseStrength[offset.id]!
      if (offset.strength <= previous) continue
      if (!previous) {
        this.active.add(offset.id)
        added += 1
      }
      this.responseStrength[offset.id] = offset.strength
      this.responseX[offset.id] = offset.x
      this.responseY[offset.id] = offset.y
    }
    return added
  }

  advanceTo(at: number) {
    const elapsed = at - this.previousAt
    if (!Number.isFinite(elapsed) || elapsed < 0) {
      this.reset(at)
      return
    }
    this.previousAt = at
    const step = HOME_HERO_PARTICLE_FIXED_STEP_SECONDS
    const pointAlpha = -Math.expm1(-step / POINT_TAU_SECONDS)
    const recoveryAlpha = -Math.expm1(-step / RECOVERY_TAU_SECONDS)
    if (elapsed > 0.75) {
      const boundedStart = Math.max(this.clock, Math.min(at, this.pointer.endsAt) - 0.75)
      if (this.gatheringStartedAt === null) this.recoverTo(boundedStart)
      else this.clock = boundedStart
    }
    this.moving = this.phase === 'gathering' || (!this.pointer.connected && this.active.size > 0)
    let substeps = 0
    while (at - this.clock + 1e-9 >= step && substeps < 90) {
      const gathering = this.gatheringStartedAt !== null && this.clock < this.gatheringUntil
      this.sweeps = this.sweeps.filter(sweep => sweep.expiresAt > this.clock)
      if (!gathering && !this.pointer.connected && !this.pointer.hasPending && !this.pointer.hasUnconsumedInput && !this.sweeps.length) {
        this.smoothedPointer = null
        this.recoverTo(at)
        this.moving = this.active.size > 0
        return
      }
      // Align the release boundary despite floating point accumulation: a
      // pending release must be consumed by the step that reaches it.
      const next = this.clock + step
      const finish = Math.abs(next - this.pointer.endsAt) < 1e-9 ? this.pointer.endsAt : next
      const pieces = this.pointer.consume(this.clock, finish)
      const inputs: HomeHeroPointerInput[] = []
      let pointerMoving = false
      if (pieces.length && this.pointer.connected) {
        const latest = pieces.at(-1)!
        this.smoothedPointer ??= { x: latest.fromX, y: latest.fromY }
        const alpha = -Math.expm1(-step / POINTER_TAU_SECONDS)
        this.smoothedPointer.x += (latest.x - this.smoothedPointer.x) * alpha
        this.smoothedPointer.y += (latest.y - this.smoothedPointer.y) * alpha
        pointerMoving = Math.hypot(latest.x - this.smoothedPointer.x, latest.y - this.smoothedPointer.y) > 0.02
        if (!pointerMoving) this.smoothedPointer = { x: latest.x, y: latest.y }
        inputs.push({ fromX: this.smoothedPointer.x, fromY: this.smoothedPointer.y, ...this.smoothedPointer, vx: latest.vx, vy: latest.vy })
      } else if (!this.pointer.connected) this.smoothedPointer = null
      for (const piece of pieces) {
        if (piece.fromX !== piece.x || piece.fromY !== piece.y) this.sweeps.push({ input: piece, expiresAt: finish + SWEEP_LIFETIME_SECONDS })
        // A released short tap still gets its actual stationary influence.
        else if (!this.pointer.connected) inputs.push(piece)
      }
      this.responseStrength.fill(0)
      let candidates = 0
      const gatheringCandidates = new Set<number>()
      let gatheringInputs: PreparedPointer[] = []
      if (gathering) {
        inputs.push(...this.sweeps.map(sweep => sweep.input))
        gatheringInputs = inputs.map(preparePointer)
        for (const input of inputs) {
          for (const id of getHomeHeroParticleCandidates(this.scene, input, this.radius + MAX_OFFSET_CSS_PX)) {
            this.active.add(id)
            gatheringCandidates.add(id)
          }
        }
      } else {
        const offsetsFor = (input: HomeHeroPointerInput) => {
          const offsets: GlyphOffset[] = []
          const prepared = [preparePointer(input)]
          for (const id of getHomeHeroParticleCandidates(this.scene, input, this.radius + MAX_OFFSET_CSS_PX)) {
            const p = this.scene.particles[id]!
            const offset = targetOffset(p, p.homeX, p.homeY, prepared, this.radius)
            const strength = offset.x * offset.x + offset.y * offset.y
            if (strength) offsets.push({ id, ...offset, strength })
          }
          return offsets
        }
        for (const input of inputs) candidates += this.mergeOffsets(offsetsFor(input))
        // A consumed sweep has stable home geometry. Cache its bounded response
        // once; retaining it briefly must not repeat capsule/square-root work
        // for every active glyph on every simulation step.
        for (const sweep of this.sweeps) {
          sweep.offsets ??= offsetsFor(sweep.input)
          candidates += this.mergeOffsets(sweep.offsets)
        }
      }
      this.stats.candidates = gathering ? gatheringCandidates.size : candidates
      this.stats.peakCandidates = Math.max(this.stats.peakCandidates, this.stats.candidates)
      let moving = pointerMoving
      for (const id of this.active) {
        const p = this.scene.particles[id]!
        let baseX = p.homeX
        let baseY = p.homeY
        if (gathering) {
          const start = this.starts[id]!
          const progress = clamp((finish - this.gatheringStartedAt! - start.delay) / GATHER_DURATION_SECONDS, 0, 1)
          const eased = 1 - (1 - progress) ** 3
          baseX = start.x + (p.homeX - start.x) * eased
          baseY = start.y + (p.homeY - start.y) * eased
        }
        const offset = gathering ? targetOffset(p, baseX, baseY, gatheringInputs, this.radius) : null
        const influenced = gathering || this.responseStrength[id]! > 0
        const offsetX = offset ? offset.x : influenced ? this.responseX[id]! : 0
        const offsetY = offset ? offset.y : influenced ? this.responseY[id]! : 0
        moving = approach(p, baseX + offsetX, baseY + offsetY, step,
          influenced ? POINT_TAU_SECONDS : RECOVERY_TAU_SECONDS, influenced ? pointAlpha : recoveryAlpha) || moving
        if (!gathering && p.x === p.homeX && p.y === p.homeY) this.active.delete(id)
      }
      this.stats.peakActive = Math.max(this.stats.peakActive, this.active.size)
      this.clock = finish
      this.moving = moving
      substeps += 1
    }
    if (this.gatheringStartedAt !== null && at >= this.gatheringUntil) {
      this.gatheringStartedAt = null
      this.starts = []
    }
    if (!this.pointer.connected && !this.pointer.hasPending && !this.pointer.hasUnconsumedInput && !this.sweeps.length && this.gatheringStartedAt === null) {
      this.recoverTo(at)
      this.moving = this.active.size > 0
    }
  }
}
