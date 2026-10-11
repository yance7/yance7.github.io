import { afterEach, describe, expect, it, vi } from 'vitest'
import { HomeHeroParticleRenderer } from '../src/utils/homeHeroParticleRenderer'
import { createHomeHeroParticleScene } from '../src/utils/homeHeroParticleScene'

function context() {
  return { fillStyle: '', globalAlpha: 1, strokeStyle: '', lineWidth: 1, lineCap: '',
    setTransform: vi.fn(), clearRect: vi.fn(), drawImage: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(),
    arc: vi.fn(), fill: vi.fn(), stroke: vi.fn(), lineTo: vi.fn(), save: vi.fn(), restore: vi.fn(), rect: vi.fn(), clip: vi.fn() }
}
afterEach(() => vi.unstubAllGlobals())
describe('HomeHero local cache restoration', () => {
  it('draws a moving dot and a settled boundary neighbor once across dirty tiles', () => {
    const visible = context()
    const master = context()
    vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => master }) })
    const scene = createHomeHeroParticleScene({ width: 320, height: 240, gridStep: 5, rgba: new Uint8ClampedArray(320 * 240 * 4).fill(255) })
    const moving = scene.particles.find(p => p.homeX === 62.5 && p.homeY === 62.5)!
    const neighbor = scene.particles.find(p => p.homeX === 62.5 && p.homeY === 67.5)!
    const renderer = new HomeHeroParticleRenderer({ getContext: () => visible } as unknown as HTMLCanvasElement,
      { scene, pixelRatio: 2, ambient: [], colors: { word: '#123', field: '#456', trail: '#789', ambient: '#abc' } })
    moving.x += 16
    visible.arc.mockClear()
    renderer.drawActive([moving])
    expect(visible.arc.mock.calls.filter(call => call[0] === moving.x && call[1] === moving.y)).toHaveLength(1)
    expect(visible.arc.mock.calls.filter(call => call[0] === neighbor.homeX && call[1] === neighbor.homeY)).toHaveLength(1)
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
      { scene, pixelRatio: 2, ambient: [], colors: { word: '#123', field: '#456', trail: '#789', ambient: '#abc' } })
    first.x += 16
    second.x += 16
    visible.arc.mockClear()
    renderer.drawActive([first, second])
    const positions = visible.arc.mock.calls.map(call => `${call[0]}:${call[1]}`)
    expect(positions).not.toContain(`${first.homeX}:${first.homeY}`)
    expect(positions).not.toContain(`${second.homeX}:${second.homeY}`)
    expect(positions).toContain(`${neighbor.homeX}:${neighbor.homeY}`)
    expect(positions).toContain(`${first.x}:${first.y}`)
    expect(renderer.stats.dirtyFraction).toBeLessThan(0.6)
    expect(master.clearRect).toHaveBeenCalledTimes(1)
    renderer.drawActive([])
    expect(renderer.stats.dirtyTiles).toBe(0)
    expect(visible.drawImage).toHaveBeenCalled()
    expect(master.clearRect).toHaveBeenCalledTimes(1)
  })
})
