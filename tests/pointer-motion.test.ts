import { afterEach, expect, it, vi } from 'vitest'
import { observePointerMotion } from '../src/utils/pointerMotion'

afterEach(() => vi.unstubAllGlobals())

it('shares one event-driven sentinel and releases it after the final observer stops', () => {
  const created: EventTarget[] = []
  const remove = vi.fn()
  const append = vi.fn()
  const media = new EventTarget()
  const listeners = vi.spyOn(media, 'removeEventListener')
  vi.stubGlobal('window', { matchMedia: () => media })
  vi.stubGlobal('document', {
    body: { append },
    createElement: () => {
      const element = Object.assign(new EventTarget(), {
        setAttribute: vi.fn(), getBoundingClientRect: vi.fn(), remove
      })
      created.push(element)
      return element
    }
  })
  const callback = vi.fn()
  const first = observePointerMotion(callback)
  const second = observePointerMotion(callback)
  try {
    expect(append).toHaveBeenCalledTimes(1)
    created[0]!.dispatchEvent(Object.assign(new Event('transitionend'), { propertyName: 'height' }))
    expect(callback).toHaveBeenCalledTimes(2)
    created[0]!.dispatchEvent(Object.assign(new Event('transitionend'), { propertyName: 'opacity' }))
    expect(callback).toHaveBeenCalledTimes(2)
    first.stop()
    first.stop()
    expect(remove).not.toHaveBeenCalled()
    created[0]!.dispatchEvent(Object.assign(new Event('transitionend'), { propertyName: 'width' }))
    expect(callback).toHaveBeenCalledTimes(3)
    second.stop()
    expect(remove).toHaveBeenCalledTimes(1)
    expect(listeners).toHaveBeenCalledTimes(8)
    const third = observePointerMotion(callback)
    expect(append).toHaveBeenCalledTimes(2)
    third.stop()
  } finally {
    first.stop()
    second.stop()
  }
})

it('does not clear fresh input on a delayed transition after motion is re-enabled', () => {
  let forced = false
  const sentinel = Object.assign(new EventTarget(), {
    setAttribute: vi.fn(), getBoundingClientRect: vi.fn(), remove: vi.fn()
  })
  vi.stubGlobal('window', {
    matchMedia: (query: string) => Object.defineProperty(new EventTarget(), 'matches', {
      get: () => query === '(forced-colors: active)' ? forced : query.includes('fine') || query.includes('hover')
    })
  })
  vi.stubGlobal('document', { body: { append: vi.fn() }, createElement: () => sentinel })
  const callback = vi.fn()
  const observer = observePointerMotion(callback)
  try {
    expect(observer.allowed()).toBe(true)
    forced = true
    sentinel.dispatchEvent(Object.assign(new Event('transitionend'), { propertyName: 'height' }))
    expect(callback).toHaveBeenCalledTimes(1)
    expect(observer.allowed()).toBe(false)
    forced = false
    sentinel.dispatchEvent(Object.assign(new Event('transitionend'), { propertyName: 'height' }))
    expect(callback).toHaveBeenCalledTimes(1)
    expect(observer.allowed()).toBe(true)
  } finally { observer.stop() }
})
