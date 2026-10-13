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
  it('renders displaced glyph points with an independent diameter and no connecting strokes', () => {
    const visible = context()
    const master = context()
    vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => master }) })
    const scene = createHomeHeroParticleScene({ width: 80, height: 40, gridStep: 2, rgba: new Uint8ClampedArray(80 * 40 * 4).fill(255) })
    const moving = scene.particles[0]!
    const renderer = new HomeHeroParticleRenderer({ getContext: () => visible } as unknown as HTMLCanvasElement,
      { scene, pixelRatio: 2, colors: { word: '#123' } })
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
      { scene, pixelRatio: 2, colors: { word: '#123' } })
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
      { scene, pixelRatio: 2, colors: { word: '#123' } })
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
