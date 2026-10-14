import { afterEach, expect, it, vi } from 'vitest'
import { observePointerMotion } from '../src/utils/pointerMotion'

afterEach(() => vi.unstubAllGlobals())

it('checks active effects when media and resize notifications are both absent, then stops checking', () => {
  let forced = false
  const frames = new Map<number, FrameRequestCallback>()
  let id = 0
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++id, callback)
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (frame: number) => frames.delete(frame))
  vi.stubGlobal('window', {
    matchMedia: (query: string) => Object.assign(new EventTarget(), {
      matches: query === '(forced-colors: active)' ? forced : query.includes('fine') || query.includes('hover')
    })
  })
  vi.stubGlobal('document', {
    body: { append: vi.fn() },
    createElement: () => ({ setAttribute: vi.fn(), remove: vi.fn() })
  })
  const callback = vi.fn(() => observer.setActive(false))
  const observer = observePointerMotion(callback)
  try {
    expect(frames.size).toBe(0)
    observer.setActive(true)
    observer.setActive(true)
    expect(frames.size).toBe(1)
    const pending = [...frames.values()]
    frames.clear()
    forced = true
    pending.forEach(frame => frame(0))
    expect(callback).toHaveBeenCalledOnce()
    expect(frames.size).toBe(0)
    forced = false
    observer.setActive(true)
    expect(frames.size).toBe(1)
    observer.stop()
    expect(frames.size).toBe(0)
  } finally { observer.stop() }
})

it('shares one event-driven sentinel and releases it after the final observer stops', () => {
  const created: EventTarget[] = []
  const remove = vi.fn()
  const append = vi.fn()
  const observe = vi.fn()
  const disconnect = vi.fn()
  let notify = () => {}
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { notify = callback }
    observe = observe
    disconnect = disconnect
  })
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
    expect(observe).toHaveBeenCalledTimes(1)
    notify()
    expect(callback).toHaveBeenCalledTimes(2)
    first.stop()
    first.stop()
    expect(remove).not.toHaveBeenCalled()
    notify()
    expect(callback).toHaveBeenCalledTimes(3)
    second.stop()
    expect(remove).toHaveBeenCalledTimes(1)
    expect(disconnect).toHaveBeenCalledTimes(1)
    expect(listeners).toHaveBeenCalledTimes(8)
    const third = observePointerMotion(callback)
    expect(append).toHaveBeenCalledTimes(2)
    third.stop()
  } finally {
    first.stop()
    second.stop()
  }
})

it('does not clear fresh input on an initial or delayed notification after motion is re-enabled', () => {
  let forced = false
  let notify = () => {}
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { notify = callback }
    observe() {}
    disconnect() {}
  })
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
  const support = vi.fn()
  const supportObserver = observePointerMotion(support, { notifyWhenAllowed: true })
  try {
    expect(observer.allowed()).toBe(true)
    notify()
    expect(callback).not.toHaveBeenCalled()
    expect(support).toHaveBeenCalledTimes(1)
    forced = true
    notify()
    expect(callback).toHaveBeenCalledTimes(1)
    expect(observer.allowed()).toBe(false)
    forced = false
    notify()
    expect(callback).toHaveBeenCalledTimes(1)
    expect(observer.allowed()).toBe(true)
    expect(support).toHaveBeenCalledTimes(3)
  } finally {
    observer.stop()
    supportObserver.stop()
  }
})
