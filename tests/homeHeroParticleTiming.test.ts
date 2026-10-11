import { describe, expect, it } from 'vitest'
import { createHomeHeroParticleScene } from '../src/utils/homeHeroParticleScene'
import { HomeHeroParticleEngine, HomeHeroPointerTimeline } from '../src/utils/homeHeroParticlePhysics'

function engine(width = 400, height = 240) {
  const rgba = new Uint8ClampedArray(width * height * 4).fill(255)
  return new HomeHeroParticleEngine(createHomeHeroParticleScene({ width, height, rgba, gridStep: 5 }), { startedAt: 0 })
}

function sweep(eventHz: number, renderHz: number) {
  const target = engine()
  target.pointer.move({ pointerId: 1, pointerType: 'mouse', x: 100, y: 120, at: 0 })
  let event = 1
  for (let frame = 1; frame <= renderHz; frame += 1) {
    const time = frame / renderHz
    while (event / eventHz <= Math.min(time, 0.15) + 1e-9) {
      target.pointer.move({ pointerId: 1, pointerType: 'mouse', x: 100 + 200 * (event / eventHz) / 0.15, y: 120, at: event / eventHz })
      event += 1
    }
    if (time >= 0.15 && !target.pointer.released) target.pointer.release(0.15)
    target.advanceTo(time)
  }
  return target
}

describe('HomeHero pointer time and recovery', () => {
  it('keeps free spring recovery independent of frame subdivision', () => {
    const whole = engine()
    const split = engine()
    for (const target of [whole, split]) {
      const p = target.scene.particles[0]!
      p.x += 40
      p.vx = 80
      p.settledForMs = 0
      target.active.add(p.id)
    }
    whole.advanceTo(0.4)
    split.advanceTo(0.2)
    split.advanceTo(0.4)
    expect(whole.scene.particles[0]!.x).toBeCloseTo(split.scene.particles[0]!.x, 9)
    expect(whole.scene.particles[0]!.vx).toBeCloseTo(split.scene.particles[0]!.vx, 9)
  })

  it('does not snap free recovery at a close crossing without a continuous settle window', () => {
    const target = engine()
    const p = target.scene.particles[0]!
    const frequency = Math.sqrt(42 - 5.25 ** 2)
    p.x += 1
    p.vx = -5.25 - frequency / Math.tan(frequency * 0.2)
    p.settledForMs = 0
    target.active.add(p.id)
    target.advanceTo(0.2)
    expect(Math.abs(p.x - p.homeX)).toBeLessThan(0.25)
    expect(Math.abs(p.vx)).toBeLessThan(2.5)
    expect(p.settledForMs).toBe(0)
    expect(target.active.has(p.id)).toBe(true)
  })

  it.each([3, 4, 5])('restores a desktop sweep at %s rendering frames per second within 1.5s of release', renderHz => {
    const target = engine(1080, 430)
    const releasedAt = 1 / renderHz
    target.pointer.move({ pointerId: 1, pointerType: 'mouse', x: 216, y: 198, at: 0 })
    target.advanceTo(releasedAt - 0.005)
    target.pointer.move({ pointerId: 1, pointerType: 'mouse', x: 864, y: 198, at: releasedAt })
    target.pointer.release(releasedAt)
    for (let frame = 1; frame / renderHz <= 1.5; frame += 1) target.advanceTo(releasedAt + frame / renderHz)
    expect(target.active.size).toBe(0)
    expect(target.scene.particles.every(p => p.x === p.homeX && p.y === p.homeY)).toBe(true)
  })

  it('keeps a live stationary pointer across sparse foreground frames', () => {
    const target = engine()
    target.pointer.move({ pointerId: 1, pointerType: 'mouse', x: 200, y: 120, at: 0 })
    target.advanceTo(1 / 60)
    target.advanceTo(1)
    expect(target.pointer.connected).toBe(true)
    expect(target.active.size).toBeGreaterThan(0)
  })

  it('counts recovery from the event release when the first rendered sweep is late', () => {
    const target = engine(1080, 430)
    target.pointer.move({ pointerId: 1, pointerType: 'mouse', x: 216, y: 198, at: 0 })
    target.pointer.move({ pointerId: 1, pointerType: 'mouse', x: 864, y: 198, at: 0.15 })
    target.pointer.release(0.15)
    target.advanceTo(1.4)
    expect(target.stats.peakCandidates).toBeGreaterThan(0)
    target.advanceTo(1.65)
    expect(target.active.size).toBe(0)
    expect(target.scene.particles.every(p => p.x === p.homeX && p.y === p.homeY)).toBe(true)
  })

  it('drains an overdue sweep in one fixed step without delaying release', () => {
    const input = new HomeHeroPointerTimeline()
    input.move({ pointerId: 1, pointerType: 'mouse', x: 100, y: 120, at: 0 })
    input.consume(0, 0.2)
    input.move({ pointerId: 1, pointerType: 'mouse', x: 300, y: 120, at: 0.2 })
    input.release(0.2)
    const pieces = input.consume(0.2, 0.2 + 1 / 120)
    expect(pieces.at(-1)!.x).toBe(300)
    expect(pieces.reduce((total, piece) => total + piece.duration, 0)).toBeLessThanOrEqual(1 / 120 + 1e-9)
    expect(input.connected).toBe(false)
    expect(input.hasPending).toBe(false)
  })

  it('drains every overdue turn within a single fixed step', () => {
    const input = new HomeHeroPointerTimeline()
    input.move({ pointerId: 1, pointerType: 'mouse', x: 100, y: 120, at: 0 })
    input.consume(0, 0.2)
    input.move({ pointerId: 1, pointerType: 'mouse', x: 200, y: 80, at: 0.1 })
    input.move({ pointerId: 1, pointerType: 'mouse', x: 300, y: 120, at: 0.2 })
    input.release(0.2)
    const pieces = input.consume(0.2, 0.2 + 1 / 120)
    expect(pieces.map(piece => ({ fromX: piece.fromX, fromY: piece.fromY, x: piece.x, y: piece.y }))).toEqual([
      { fromX: 100, fromY: 120, x: 200, y: 80 },
      { fromX: 200, fromY: 80, x: 300, y: 120 }
    ])
    expect(input.hasPending).toBe(false)
  })

  it.each([0.02, 0.8])('keeps the first coalesced sweep after an empty clock advances to %ss', at => {
    const target = engine()
    target.advanceTo(at)
    target.pointer.move({ pointerId: 1, pointerType: 'mouse', x: 100, y: 100, at: at - 0.02 })
    target.pointer.move({ pointerId: 1, pointerType: 'mouse', x: 300, y: 100, at: at - 0.01 })
    target.pointer.release(at - 0.01)
    target.advanceTo(at + 0.03)
    const middle = target.scene.particles.find(p => p.homeX === 202.5 && p.homeY === 102.5)!
    expect(middle.x).toBeGreaterThan(middle.homeX)
    expect(target.pointer.connected).toBe(false)
  })

  it('consumes a late delivered path once and holds its latest position', () => {
    const input = new HomeHeroPointerTimeline()
    input.move({ pointerId: 1, pointerType: 'mouse', x: 100, y: 120, at: 0 })
    input.consume(0, 0.02)
    input.move({ pointerId: 1, pointerType: 'mouse', x: 300, y: 120, at: 0.01 })
    const delayed = input.consume(0.02, 0.03)
    expect(delayed[0]).toMatchObject({ fromX: 100, x: 300 })
    expect(delayed[0]!.vx).toBeGreaterThan(0)
    const stopped = input.consume(0.03, 0.04)
    expect(stopped.every(piece => piece.fromX === 300 && piece.x === 300)).toBe(true)
    expect(input.hasPending).toBe(false)
  })

  it('preserves a complete path when rendering runs between sparse input events', () => {
    const input = new HomeHeroPointerTimeline()
    input.move({ pointerId: 1, pointerType: 'mouse', x: 100, y: 120, at: 0 })
    input.consume(0, 1 / 120)
    input.move({ pointerId: 1, pointerType: 'mouse', x: 300, y: 120, at: 1 / 60 })
    const pieces = [...input.consume(1 / 120, 2 / 120), ...input.consume(2 / 120, 3 / 120)]
    expect(pieces.reduce((distance, piece) => distance + piece.x - piece.fromX, 0)).toBeCloseTo(200)
    expect(pieces.at(-1)!.x).toBe(300)
  })

  it('applies a delayed sweep before release and moves particles in its middle', () => {
    const target = engine()
    target.pointer.move({ pointerId: 1, pointerType: 'mouse', x: 100, y: 100, at: 0 })
    target.advanceTo(0.02)
    target.pointer.move({ pointerId: 1, pointerType: 'mouse', x: 300, y: 100, at: 0.01 })
    target.pointer.release(0.01)
    target.advanceTo(0.04)
    const middle = target.scene.particles.find(p => p.homeX === 202.5 && p.homeY === 102.5)!
    expect(middle.x).toBeGreaterThan(middle.homeX)
    expect(target.pointer.connected).toBe(false)
  })

  it('consumes intermediate paths once, ignores another pointer, and decays stopped velocity', () => {
    const input = new HomeHeroPointerTimeline()
    input.move({ pointerId: 1, pointerType: 'touch', x: 100, y: 100, at: 0 })
    input.move({ pointerId: 2, pointerType: 'touch', x: 300, y: 100, at: 0.01 })
    input.move({ pointerId: 1, pointerType: 'touch', x: 200, y: 100, at: 0.05 })
    const first = input.consume(0, 0.05)
    expect(first.some(piece => piece.fromX === 100 && piece.x === 200)).toBe(true)
    const stopped = input.consume(0.05, 0.3)
    expect(stopped.every(piece => piece.fromX === piece.x)).toBe(true)
    expect(Math.abs(input.velocity.x)).toBeLessThan(10)
    input.release(0.3)
    expect(input.consume(0.3, 0.4)).toEqual([])
  })

  it('responds in the middle of a sweep and leaves far points untouched', () => {
    const target = engine()
    target.pointer.move({ pointerId: 1, pointerType: 'mouse', x: 100, y: 100, at: 0 })
    target.pointer.move({ pointerId: 1, pointerType: 'mouse', x: 300, y: 100, at: 0.05 })
    target.advanceTo(0.05)
    const middle = target.scene.particles.find(p => p.homeX === 202.5 && p.homeY === 102.5)
    const far = target.scene.particles.find(p => p.homeX === 2.5 && p.homeY === 232.5)
    expect(middle?.x).toBeGreaterThan(202.5)
    expect(far?.x).toBe(far?.homeX)
    expect(far?.y).toBe(far?.homeY)
  })

  it('keeps event and render sampling equivalent without replaying consumed sweeps', () => {
    const reference = sweep(60, 60)
    for (const candidate of [sweep(240, 60), sweep(240, 30), sweep(240, 120)]) {
      const maximum = Math.max(...reference.scene.particles.map((p, i) => Math.hypot(p.x - candidate.scene.particles[i]!.x, p.y - candidate.scene.particles[i]!.y)))
      expect(maximum).toBeLessThan(2)
    }
  })

  it('restores the complete lattice within 1.5 seconds after a standard sweep', () => {
    const target = sweep(240, 60)
    for (let frame = 61; frame <= 99; frame += 1) target.advanceTo(frame / 60)
    expect(target.active.size).toBe(0)
    expect(target.scene.particles.every(p => p.x === p.homeX && p.y === p.homeY && p.vx === 0 && p.vy === 0)).toBe(true)
  })

  it('resets an 800ms gap and clears a stale pointer connection', () => {
    const target = sweep(60, 60)
    target.advanceTo(1.8)
    expect(target.active.size).toBe(0)
    expect(target.scene.particles.every(p => Number.isFinite(p.x))).toBe(true)
  })

  it('preserves fresh held input received during a long foreground render gap', () => {
    const target = engine()
    target.gather()
    target.pointer.move({ pointerId: 1, pointerType: 'mouse', x: 200, y: 120, at: 0.95 })
    target.advanceTo(1)
    expect(target.pointer.connected).toBe(true)
    expect(target.active.size).toBeGreaterThan(0)
    expect(target.stats.peakCandidates).toBeGreaterThan(0)
    expect(target.scene.particles.every(p => Number.isFinite(p.x + p.y + p.vx + p.vy))).toBe(true)
  })

  it('consumes a fresh sweep and release during a long foreground render gap', () => {
    const target = engine()
    target.pointer.move({ pointerId: 1, pointerType: 'mouse', x: 100, y: 120, at: 0.8 })
    target.pointer.move({ pointerId: 1, pointerType: 'mouse', x: 300, y: 120, at: 0.95 })
    target.pointer.release(0.95)
    target.advanceTo(1)
    const middle = target.scene.particles.find(p => p.homeX === 202.5 && p.homeY === 122.5)!
    expect(middle.x).toBeGreaterThan(middle.homeX)
    expect(target.pointer.hasPending).toBe(false)
    for (let frame = 1; frame <= 90; frame += 1) target.advanceTo(1 + frame / 60)
    expect(target.active.size).toBe(0)
  })

  it('clears a held input when lifecycle suspension explicitly resets the clock', () => {
    const target = engine()
    target.pointer.move({ pointerId: 1, pointerType: 'mouse', x: 200, y: 120, at: 0 })
    target.advanceTo(1 / 60)
    target.reset(0.8 + 1 / 60)
    target.advanceTo(0.8 + 1 / 60)
    expect(target.pointer.connected).toBe(false)
    expect(target.active.size).toBe(0)
  })

  it('defers fresh input newer than a stalled RAF timestamp to the next step', () => {
    const target = engine()
    target.gather()
    target.pointer.move({ pointerId: 1, pointerType: 'mouse', x: 200, y: 120, at: 1.002 })
    target.advanceTo(1)
    expect(target.pointer.connected).toBe(true)
    expect(target.stats.peakCandidates).toBe(0)
    target.advanceTo(1 + 1 / 60)
    expect(target.stats.peakCandidates).toBeGreaterThan(0)
  })

  it('preserves newly delivered input timestamped before the previous clock', () => {
    const target = engine()
    target.advanceTo(0.02)
    target.pointer.move({ pointerId: 1, pointerType: 'mouse', x: 200, y: 120, at: 0.019 })
    target.advanceTo(1)
    expect(target.pointer.connected).toBe(true)
    expect(target.stats.peakCandidates).toBeGreaterThan(0)
  })

  it('preserves a held pointer across a 300ms render gap using bounded fixed substeps', () => {
    const target = engine()
    target.gather()
    target.pointer.move({ pointerId: 1, pointerType: 'mouse', x: 200, y: 120, at: 0 })
    target.advanceTo(0.3)
    expect(target.pointer.connected).toBe(true)
    expect(target.active.size).toBeGreaterThan(0)
    expect(target.scene.particles.every(p => Number.isFinite(p.x + p.y + p.vx + p.vy))).toBe(true)
  })

  it('keeps free recovery moving across a high-refresh fractional step', () => {
    const target = engine()
    target.gather()
    target.advanceTo(1 / 144)
    expect(target.moving).toBe(true)
    expect(target.active.size).toBeGreaterThan(0)
    expect(target.needsFrame).toBe(true)

    target.advanceTo(2 / 144)
    expect(target.needsFrame).toBe(true)
  })

  it('waits for pending input but does not animate an idle fractional step', () => {
    const target = engine()
    target.pointer.move({ pointerId: 1, pointerType: 'mouse', x: 100, y: 120, at: 0 })
    target.pointer.move({ pointerId: 1, pointerType: 'mouse', x: 200, y: 120, at: 0.004 })
    target.advanceTo(1 / 144)
    expect(target.active.size).toBe(0)
    expect(target.needsFrame).toBe(true)
    target.advanceTo(2 / 144)
    expect(target.active.size).toBeGreaterThan(0)

    const idle = engine()
    idle.advanceTo(1 / 144)
    expect(idle.needsFrame).toBe(false)
  })
})
