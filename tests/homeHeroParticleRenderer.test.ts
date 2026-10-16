import { afterEach, describe, expect, it, vi } from 'vitest'
import { HomeHeroParticleRenderer } from '../src/utils/homeHeroParticleRenderer'
import { createHomeHeroParticleScene } from '../src/utils/homeHeroParticleScene'

function context() {
  return { fillStyle: '', globalAlpha: 1, strokeStyle: '', lineWidth: 1, lineCap: '',
    setTransform: vi.fn(), clearRect: vi.fn(), drawImage: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(),
    arc: vi.fn(), fill: vi.fn(), fillRect: vi.fn(), stroke: vi.fn(), lineTo: vi.fn(), save: vi.fn(), restore: vi.fn(), rect: vi.fn(), clip: vi.fn() }
}
afterEach(() => vi.unstubAllGlobals())
describe('HomeHero transparent glyph rendering', () => {
  it.each(['#abc', '#ABCDEF', 'rgb(170, 187, 204)', 'rgb(170 187 204)'])('accepts the actual hex and computed RGB palette format %s', color => {
    const visible = context()
    const master = context()
    vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => master }) })
    const scene = createHomeHeroParticleScene({ width: 2, height: 2, gridStep: 2, rgba: new Uint8ClampedArray(16).fill(255) })
    const renderer = new HomeHeroParticleRenderer({ getContext: () => visible } as unknown as HTMLCanvasElement,
      { scene, pixelRatio: 1, colors: { start: color, end: color } })
    renderer.drawActive([])
    expect(visible.fillStyle).toBe(color === '#ABCDEF' ? 'rgb(171,205,239)' : 'rgb(170,187,204)')
  })

  it.each(['rgb(256,0,0)', '#12345', 'not-a-color'])('rejects an unsupported palette value %s', color => {
    const visible = context()
    vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => context() }) })
    const scene = createHomeHeroParticleScene({ width: 2, height: 2, gridStep: 2, rgba: new Uint8ClampedArray(16).fill(255) })
    expect(() => new HomeHeroParticleRenderer({ getContext: () => visible } as unknown as HTMLCanvasElement,
      { scene, pixelRatio: 1, colors: { start: color, end: '#123' } })).toThrow('Unsupported HomeHero particle color')
  })

  it('uses the supplied palette even when a particle carries an obsolete fixed color', () => {
    const visible = context()
    const master = context()
    vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => master }) })
    const scene = createHomeHeroParticleScene({ width: 2, height: 2, gridStep: 2, rgba: new Uint8ClampedArray(16).fill(255) })
    Object.assign(scene.particles[0]!, { color: '#010101', x: 15, y: 18, opacity: .7 })
    const renderer = new HomeHeroParticleRenderer({ getContext: () => visible } as unknown as HTMLCanvasElement,
      { scene, pixelRatio: 1, colors: { start: '#d4e0d0', end: '#d4e0d0' } })
    renderer.drawActive([])
    expect(visible.fillStyle).toBe('rgb(212,224,208)')
    expect(master.fillStyle).toBe('rgb(212,224,208)')
    expect(visible.fillRect).toHaveBeenLastCalledWith(14.1, 17.1, 1.8, 1.8)
  })

  it('recolors the static cache and current positions without altering particle state', () => {
    const visible = context()
    const master = context()
    vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => master }) })
    const scene = createHomeHeroParticleScene({ width: 2, height: 2, gridStep: 2, rgba: new Uint8ClampedArray(16).fill(255) })
    const point = scene.particles[0]!
    Object.assign(point, { x: 13, y: 17, opacity: .42 })
    const before = { ...point }
    const renderer = new HomeHeroParticleRenderer({ getContext: () => visible } as unknown as HTMLCanvasElement,
      { scene, pixelRatio: 1, colors: { start: '#2d3a1e', end: '#2d3a1e' } })
    renderer.setColors({ start: '#d4e0d0', end: '#d4e0d0' })
    renderer.drawActive([])
    expect(point).toEqual(before)
    expect(master.fillStyle).toBe('rgb(212,224,208)')
    expect(visible.fillStyle).toBe('rgb(212,224,208)')
    expect(visible.fillRect).toHaveBeenLastCalledWith(12.1, 16.1, 1.8, 1.8)
    renderer.drawStatic()
    expect(visible.drawImage).toHaveBeenCalledTimes(1)
  })

  it('mixes computed RGB endpoints using the original seed blend and caches palette reads between frames', () => {
    const visible = context()
    const master = context()
    vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => master }) })
    const scene = createHomeHeroParticleScene({ width: 2, height: 2, gridStep: 2, rgba: new Uint8ClampedArray(16).fill(255) })
    scene.width = 100
    scene.height = 100
    Object.assign(scene.particles[0]!, { homeX: 50, x: 50 })
    let reads = 0
    const colors = { get start() { reads++; return 'rgb(0 0 0)' }, get end() { reads++; return 'rgb(255, 255, 255)' } }
    const renderer = new HomeHeroParticleRenderer({ getContext: () => visible } as unknown as HTMLCanvasElement,
      { scene, pixelRatio: 1, colors })
    renderer.drawActive([])
    // At index0, seed49297/233280 gives blend0.39896; round(255*blend)=102.
    expect(visible.fillStyle).toBe('rgb(102,102,102)')
    const afterPreparation = reads
    for (let frame = 0; frame < 20; frame++) renderer.drawActive([])
    expect(reads).toBe(afterPreparation)
  })

  it('keeps identical consecutive colors and opacity without repeated native state writes', () => {
    const visible = context()
    const master = context()
    vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => master }) })
    const scene = createHomeHeroParticleScene({ width: 4, height: 2, gridStep: 2, rgba: new Uint8ClampedArray(4 * 2 * 4).fill(255) })
    for (const point of scene.particles) Object.assign(point, { color: '#304020', opacity: .7 })
    let color = ''
    let opacity = 1
    const setColor = vi.fn(value => { color = value })
    const setOpacity = vi.fn(value => { opacity = value })
    Object.defineProperty(visible, 'fillStyle', { get: () => color, set: setColor })
    Object.defineProperty(visible, 'globalAlpha', { get: () => opacity, set: setOpacity })
    const renderer = new HomeHeroParticleRenderer({ getContext: () => visible } as unknown as HTMLCanvasElement, { scene, pixelRatio: 2, colors: { start: '#123', end: '#123' } })
    renderer.drawActive([])
    expect(visible.fillRect).toHaveBeenCalledTimes(2)
    expect(setColor).toHaveBeenCalledTimes(1)
    expect(setOpacity.mock.calls).toEqual([[.7], [1]])
  })

  it('renders displaced glyph points with an independent diameter and no connecting strokes', () => {
    const visible = context()
    const master = context()
    vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => master }) })
    const scene = createHomeHeroParticleScene({ width: 80, height: 40, gridStep: 2, rgba: new Uint8ClampedArray(80 * 40 * 4).fill(255) })
    const moving = scene.particles[0]!
    const renderer = new HomeHeroParticleRenderer({ getContext: () => visible } as unknown as HTMLCanvasElement,
      { scene, pixelRatio: 2, colors: { start: '#123', end: '#123' } })
    moving.x += 25
    moving.vx = 180
    visible.fillRect.mockClear()
    renderer.drawActive([moving])
    expect(visible.stroke).not.toHaveBeenCalled()
    expect(visible.lineTo).not.toHaveBeenCalled()
    expect(visible.fillRect.mock.calls.every(call => call[2] === 1.8 && call[3] === 1.8)).toBe(true)
    expect(visible.arc).not.toHaveBeenCalled()
  })

  it('draws a moving dot and a settled neighbor once with per-particle square drawing', () => {
    const visible = context()
    const master = context()
    vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => master }) })
    const scene = createHomeHeroParticleScene({ width: 320, height: 240, gridStep: 5, rgba: new Uint8ClampedArray(320 * 240 * 4).fill(255) })
    const moving = scene.particles.find(p => p.homeX === 62.5 && p.homeY === 62.5)!
    const neighbor = scene.particles.find(p => p.homeX === 62.5 && p.homeY === 67.5)!
    const renderer = new HomeHeroParticleRenderer({ getContext: () => visible } as unknown as HTMLCanvasElement,
      { scene, pixelRatio: 2, colors: { start: '#123', end: '#123' } })
    moving.x += 16
    visible.fillRect.mockClear()
    renderer.drawActive([moving])
    expect(visible.fillRect.mock.calls.filter(call => call[0] === moving.x - 0.9 && call[1] === moving.y - 0.9)).toHaveLength(1)
    expect(visible.fillRect.mock.calls.filter(call => call[0] === neighbor.homeX - 0.9 && call[1] === neighbor.homeY - 0.9)).toHaveLength(1)
    expect(visible.fillRect).toHaveBeenCalledTimes(scene.particles.length)
  })

  it('excludes every active home while retaining a neighboring settled dot', () => {
    const visible = context()
    const master = context()
    vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => master }) })
    const scene = createHomeHeroParticleScene({ width: 320, height: 240, gridStep: 5, rgba: new Uint8ClampedArray(320 * 240 * 4).fill(255) })
    const first = scene.particles[0]!
    const second = scene.particles[1]!
    const neighbor = scene.particles[2]!
    const renderer = new HomeHeroParticleRenderer({ getContext: () => visible } as unknown as HTMLCanvasElement,
      { scene, pixelRatio: 2, colors: { start: '#123', end: '#123' } })
    first.x += 16
    second.x += 16
    visible.fillRect.mockClear()
    renderer.drawActive([first, second])
    const positions = visible.fillRect.mock.calls.map(call => `${call[0] + 0.9}:${call[1] + 0.9}`)
    expect(positions).not.toContain(`${first.homeX}:${first.homeY}`)
    expect(positions).not.toContain(`${second.homeX}:${second.homeY}`)
    expect(positions).toContain(`${neighbor.homeX}:${neighbor.homeY}`)
    expect(positions).toContain(`${first.x}:${first.y}`)
    expect(visible.fillRect).toHaveBeenCalledTimes(scene.particles.length)
    expect(master.clearRect).toHaveBeenCalledTimes(1)
    renderer.drawActive([])
    expect(visible.fillRect).toHaveBeenCalledTimes(scene.particles.length * 2)
    expect(master.clearRect).toHaveBeenCalledTimes(1)
  })
})
