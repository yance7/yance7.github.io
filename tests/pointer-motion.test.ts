import { afterEach, expect, it, vi } from 'vitest'
import { observePointerMotion } from '../src/utils/pointerMotion'

afterEach(() => vi.unstubAllGlobals())

it('restores support without native notifications or drawing frames and suspends checks while hidden', () => {
  vi.useFakeTimers()
  let forced = false
  const documentTarget = Object.assign(new EventTarget(), {
    hidden: false,
    body: { append: vi.fn() },
    createElement: () => ({ setAttribute: vi.fn(), remove: vi.fn() })
  })
  vi.stubGlobal('document', documentTarget)
  const windowTarget = Object.assign(new EventTarget(), {
    matchMedia: (query: string) => Object.assign(new EventTarget(), {
      matches: query === '(forced-colors: active)' ? forced : query.includes('fine') || query.includes('hover')
    })
  })
  vi.stubGlobal('window', windowTarget)
  const support = vi.fn()
  const observer = observePointerMotion(support, { notifyWhenAllowed: true })
  try {
    forced = true
    vi.advanceTimersByTime(500)
    expect(support).toHaveBeenCalledOnce()
    forced = false
    vi.advanceTimersByTime(500)
    expect(support).toHaveBeenCalledTimes(2)
    vi.advanceTimersByTime(1500)
    expect(support).toHaveBeenCalledTimes(2)
    expect(vi.getTimerCount()).toBe(1)
    documentTarget.hidden = true
    documentTarget.dispatchEvent(new Event('visibilitychange'))
    expect(vi.getTimerCount()).toBe(0)
    forced = true
    documentTarget.hidden = false
    documentTarget.dispatchEvent(new Event('visibilitychange'))
    expect(support).toHaveBeenCalledTimes(3)
    windowTarget.dispatchEvent(new Event('pagehide'))
    expect(vi.getTimerCount()).toBe(0)
    forced = false
    windowTarget.dispatchEvent(new Event('pageshow'))
    expect(support).toHaveBeenCalledTimes(4)
    expect(vi.getTimerCount()).toBe(1)
    observer.stop()
    expect(vi.getTimerCount()).toBe(0)
  } finally {
    observer.stop()
    vi.useRealTimers()
  }
})

it('clears an owned effect with no animation frames or native preference notifications', () => {
  vi.useFakeTimers()
  let forced = false
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  vi.stubGlobal('window', {
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    matchMedia: (query: string) => Object.assign(new EventTarget(), {
      matches: query === '(forced-colors: active)' ? forced : query.includes('fine') || query.includes('hover')
    })
  })
  vi.stubGlobal('document', {
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    body: { append: vi.fn() },
    createElement: () => ({ setAttribute: vi.fn(), remove: vi.fn() })
  })
  const callback = vi.fn(() => observer.setActive(false))
  const observer = observePointerMotion(callback)
  const support = vi.fn()
  const supportObserver = observePointerMotion(support, { notifyWhenAllowed: true })
  try {
    observer.setActive(true)
    forced = true
    vi.advanceTimersByTime(100)
    expect(callback).toHaveBeenCalledOnce()
    expect(support).toHaveBeenCalledOnce()
    // The support subscriber still owns low-frequency restoration checks.
    expect(vi.getTimerCount()).toBe(1)
    supportObserver.stop()
    expect(vi.getTimerCount()).toBe(0)
  } finally {
    observer.stop()
    supportObserver.stop()
    vi.useRealTimers()
  }
})

it('checks active effects when media and resize notifications are both absent, then stops checking', () => {
  vi.useFakeTimers()
  let forced = false
  const requestFrame = vi.fn(() => 1)
  vi.stubGlobal('requestAnimationFrame', requestFrame)
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  vi.stubGlobal('window', {
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    matchMedia: (query: string) => Object.assign(new EventTarget(), {
      matches: query === '(forced-colors: active)' ? forced : query.includes('fine') || query.includes('hover')
    })
  })
  vi.stubGlobal('document', {
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    body: { append: vi.fn() },
    createElement: () => ({ setAttribute: vi.fn(), remove: vi.fn() })
  })
  const callback = vi.fn(() => observer.setActive(false))
  const observer = observePointerMotion(callback)
  try {
    expect(vi.getTimerCount()).toBe(0)
    observer.setActive(true)
    observer.setActive(true)
    expect(vi.getTimerCount()).toBe(1)
    forced = true
    vi.advanceTimersByTime(100)
    expect(callback).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
    forced = false
    observer.setActive(true)
    expect(vi.getTimerCount()).toBe(1)
    observer.stop()
    expect(vi.getTimerCount()).toBe(0)
    expect(requestFrame).not.toHaveBeenCalled()
  } finally {
    observer.stop()
    vi.useRealTimers()
  }
})

it('shares one active timer without resetting allowed effects and releases the last owner', () => {
  vi.useFakeTimers()
  vi.stubGlobal('window', {
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    matchMedia: (query: string) => Object.assign(new EventTarget(), { matches: query.includes('fine') || query.includes('hover') })
  })
  vi.stubGlobal('document', {
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    body: { append: vi.fn() }, createElement: () => ({ setAttribute: vi.fn(), remove: vi.fn() })
  })
  const firstCallback = vi.fn()
  const secondCallback = vi.fn()
  const first = observePointerMotion(firstCallback)
  const second = observePointerMotion(secondCallback)
  try {
    first.setActive(true)
    second.setActive(true)
    expect(vi.getTimerCount()).toBe(1)
    vi.advanceTimersByTime(100)
    expect(firstCallback).not.toHaveBeenCalled()
    expect(secondCallback).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(1)
    first.stop()
    expect(vi.getTimerCount()).toBe(1)
    second.stop()
    expect(vi.getTimerCount()).toBe(0)
  } finally {
    first.stop()
    second.stop()
    vi.useRealTimers()
  }
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
  vi.stubGlobal('window', {
    addEventListener: vi.fn(), removeEventListener: vi.fn(), matchMedia: () => media })
  vi.stubGlobal('document', {
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
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
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    matchMedia: (query: string) => Object.defineProperty(new EventTarget(), 'matches', {
      get: () => query === '(forced-colors: active)' ? forced : query.includes('fine') || query.includes('hover')
    })
  })
  vi.stubGlobal('document', {
    addEventListener: vi.fn(), removeEventListener: vi.fn(), body: { append: vi.fn() }, createElement: () => sentinel })
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
