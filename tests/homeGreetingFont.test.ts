import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

async function loader() {
  const module = await import('../src/utils/homeGreetingFont').catch(() => null)
  expect(module?.loadHomeGreetingFont, 'bounded greeting font loader exists').toBeTypeOf('function')
  return module!.loadHomeGreetingFont
}

function installFontSet(load: () => Promise<unknown[]>, check = true) {
  // FontFaceSet is a browser boundary; the actual font and its cmap are checked separately.
  vi.stubGlobal('document', { fonts: { load, check: () => check } })
}

beforeEach(() => {
  vi.resetModules()
  vi.useFakeTimers()
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('home greeting font readiness', () => {
  it('accepts an explicitly loaded and usable greeting face', async () => {
    installFontSet(async () => [{ family: 'Yance Hero WenKai', status: 'loaded' }])
    const load = await loader()
    expect(await load('你好，我是 Yance')).toBe('ready')
  })

  it('does not mistake an empty font load result for glyph readiness', async () => {
    installFontSet(async () => [])
    const load = await loader()
    expect(await load('歡迎')).toBe('fallback')
  })

  it('rejects a loaded face when the actual text is not usable', async () => {
    installFontSet(async () => [{ family: 'Yance Hero WenKai', status: 'loaded' }], false)
    const load = await loader()
    expect(await load('Welcome to my world')).toBe('fallback')
  })

  it('settles font rejection without leaving invisible text pending', async () => {
    installFontSet(async () => { throw new Error('blocked font') })
    const load = await loader()
    expect(await load('Hi, I’m Yance')).toBe('fallback')
  })

  it('bounds a stalled request and keeps that terminal result after a late response', async () => {
    let release: (value: unknown[]) => void = () => {}
    installFontSet(() => new Promise(resolve => { release = resolve }))
    const load = await loader()
    const pending = load('你好')
    await vi.advanceTimersByTimeAsync(1000)
    expect(await pending).toBe('fallback')
    release([{ family: 'Yance Hero WenKai', status: 'loaded' }])
    await Promise.resolve()
    expect(await load('歡迎')).toBe('fallback')
  })

  it('reuses a single settled readiness operation across locale updates', async () => {
    let loads = 0
    installFontSet(async () => {
      loads += 1
      return [{ family: 'Yance Hero WenKai', status: 'loaded' }]
    })
    const load = await loader()
    const first = load('你好')
    const second = load('Welcome')
    expect(first).toBe(second)
    expect(await second).toBe('ready')
    expect(loads).toBe(1)
  })
})
