import { afterEach, expect, it, vi } from 'vitest'
import { observePointerMotion } from '../src/utils/pointerMotion'

afterEach(() => vi.unstubAllGlobals())

it('reads current preferences when an older query object retains a stale value', () => {
  let forced = false
  const sentinel = Object.assign(new EventTarget(), {
    setAttribute: vi.fn(), getBoundingClientRect: vi.fn(), remove: vi.fn()
  })
  vi.stubGlobal('window', {
    matchMedia: (query: string) => Object.assign(new EventTarget(), {
      matches: query === '(forced-colors: active)' ? forced : query.includes('fine') || query.includes('hover')
    })
  })
  vi.stubGlobal('document', { body: { append: vi.fn() }, createElement: () => sentinel })
  const observer = observePointerMotion(vi.fn())
  try {
    expect(observer.allowed()).toBe(true)
    forced = true
    expect(observer.allowed()).toBe(false)
    forced = false
    expect(observer.allowed()).toBe(true)
  } finally { observer.stop() }
})
