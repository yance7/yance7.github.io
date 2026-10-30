import { describe, expect, it, vi } from 'vitest'
import { createHeroGlyphFontLoader } from '../src/utils/homeHeroGlyphFont'

describe('home hero glyph font readiness', () => {
  it('waits for the bundled face when the browser reports no matching face', async () => {
    let finish!: (face: FontFace) => void
    const face = { family: 'Amiri', status: 'loaded', load: () => new Promise<FontFace>(resolve => { finish = resolve }) } as FontFace
    const fonts = { load: vi.fn(async () => []), add: vi.fn() } as unknown as FontFaceSet
    const load = createHeroGlyphFontLoader(fonts, () => face)
    let ready = false
    const pending = load().then(() => { ready = true })
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'))
    expect(ready).toBe(false)
    expect(fonts.add).not.toHaveBeenCalled()
    finish(face)
    await pending
    expect(fonts.add).toHaveBeenCalledWith(face)
  })

  it('reuses a loaded Amiri face and coalesces concurrent requests', async () => {
    const face = { family: 'Amiri', status: 'loaded' } as FontFace
    const fonts = { load: vi.fn(async () => [face]), add: vi.fn() } as unknown as FontFaceSet
    const createFace = vi.fn()
    const load = createHeroGlyphFontLoader(fonts, createFace)
    await Promise.all([load(), load()])
    expect(fonts.load).toHaveBeenCalledTimes(1)
    expect(createFace).not.toHaveBeenCalled()
    expect(fonts.add).not.toHaveBeenCalled()
  })

  it('allows another attempt after the bundled face fails to load', async () => {
    const loaded = { family: 'Amiri', status: 'loaded' } as FontFace
    const loadFace = vi.fn().mockRejectedValueOnce(new Error('font unavailable')).mockResolvedValueOnce(loaded)
    const fonts = { load: vi.fn(async () => []), add: vi.fn() } as unknown as FontFaceSet
    const load = createHeroGlyphFontLoader(fonts, () => ({ load: loadFace }) as unknown as FontFace)
    await expect(load()).rejects.toThrow('font unavailable')
    expect(fonts.add).not.toHaveBeenCalled()
    await load()
    expect(fonts.add).toHaveBeenCalledWith(loaded)
  })
})
