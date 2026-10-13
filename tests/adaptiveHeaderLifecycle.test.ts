import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAdaptiveHeader } from '../src/composables/useAdaptiveHeader'

const lifecycle = vi.hoisted(() => ({ mounted: [] as (() => void)[], unmounted: [] as (() => void)[] }))
vi.mock('vue', () => ({
  ref: <T>(value: T) => ({ value }),
  onMounted: (callback: () => void) => lifecycle.mounted.push(callback),
  onUnmounted: (callback: () => void) => lifecycle.unmounted.push(callback)
}))

describe('initial fragment header lifecycle', () => {
  const root = { dataset: { initialHash: '#home-worlds', fontsReady: 'loading' } as Record<string, string> }
  const shell = { dataset: { pageLoadState: 'loading' } }
  let targetExists = false
  let sentinelTop = 80
  const frames = new Map<number, FrameRequestCallback>()
  const observers: { callback: MutationCallback, target?: Node, options?: MutationObserverInit }[] = []

  beforeEach(() => {
    lifecycle.mounted.length = 0
    lifecycle.unmounted.length = 0
    frames.clear()
    observers.length = 0
    root.dataset = { initialHash: '#home-worlds', fontsReady: 'loading' }
    shell.dataset.pageLoadState = 'loading'
    targetExists = false
    sentinelTop = 80
    vi.stubGlobal('MutationObserver', class {
      entry: typeof observers[number]
      constructor(callback: MutationCallback) {
        this.entry = { callback }
        observers.push(this.entry)
      }
      observe(target: Node, options: MutationObserverInit) { Object.assign(this.entry, { target, options }) }
      disconnect() { this.entry.target = undefined }
    })
    vi.stubGlobal('IntersectionObserver', undefined)
    vi.stubGlobal('document', {
      documentElement: root,
      body: {},
      querySelector: () => shell,
      querySelectorAll: () => [],
      getElementById: () => targetExists ? {} : null
    })
    vi.stubGlobal('window', {
      location: { hash: '' },
      scrollY: 0,
      innerHeight: 844,
      MutationObserver: globalThis.MutationObserver,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      requestAnimationFrame: (callback: FrameRequestCallback) => {
        frames.set(frames.size + 1, callback)
        return frames.size
      },
      cancelAnimationFrame: (id: number) => frames.delete(id)
    })
  })

  afterEach(() => {
    lifecycle.unmounted.forEach(callback => callback())
    vi.unstubAllGlobals()
  })

  function notifyRoot(attribute: string) {
    for (const entry of observers) {
      if (entry.target === root as unknown as Node && entry.options?.attributeFilter?.includes(attribute)) {
        entry.callback([], {} as MutationObserver)
      }
    }
  }

  function firstObserver() {
    const observer = observers[0]
    if (!observer) throw new Error('Initial fragment observer was not installed')
    return observer
  }

  function mountHeader() {
    const header = useAdaptiveHeader()
    header.sentinelRef.value = { getBoundingClientRect: () => ({ top: sentinelTop, bottom: sentinelTop + 1 }) } as HTMLElement
    lifecycle.mounted.forEach(callback => callback())
    return header
  }

  it('reads actual geometry after fragment and fonts complete without a native scroll notification', () => {
    const header = mountHeader()
    targetExists = true
    shell.dataset.pageLoadState = 'ready'
    firstObserver().callback([], {} as MutationObserver)
    frames.forEach(callback => callback(0))
    frames.clear()
    expect(header.headerState.value).toBe('resting')
    expect(firstObserver().target).toBe(root)

    sentinelTop = -1562
    delete root.dataset.initialHash
    window.location.hash = '#home-worlds'
    root.dataset.fontsReady = 'ready'
    notifyRoot('data-fonts-ready')

    expect(header.headerState.value).toBe('floating')
    expect(firstObserver().target).toBeUndefined()
  })

  it('observes a target already mounted and accepts fallback fonts', () => {
    targetExists = true
    shell.dataset.pageLoadState = 'ready'
    const header = mountHeader()
    sentinelTop = -100
    delete root.dataset.initialHash
    window.location.hash = '#home-worlds'
    notifyRoot('data-initial-hash')
    expect(header.headerState.value).toBe('floating')
    expect(firstObserver().target).toBe(root)

    root.dataset.fontsReady = 'fallback'
    notifyRoot('data-fonts-ready')
    expect(firstObserver().target).toBeUndefined()
  })

  it('keeps observing when fonts finish before fragment restoration', () => {
    const header = mountHeader()
    targetExists = true
    shell.dataset.pageLoadState = 'ready'
    root.dataset.fontsReady = 'ready'
    notifyRoot('data-fonts-ready')
    expect(firstObserver().target).toBe(root)
    expect(header.headerState.value).toBe('resting')

    sentinelTop = -100
    delete root.dataset.initialHash
    window.location.hash = '#home-worlds'
    notifyRoot('data-initial-hash')
    expect(header.headerState.value).toBe('floating')
    expect(firstObserver().target).toBeUndefined()
  })

  it.each(['cancel', 'missing-target', 'error'])('stops on %s and preserves actual resting geometry', (reason) => {
    const header = mountHeader()
    if (reason === 'cancel') {
      delete root.dataset.initialHash
      window.location.hash = '#another-target'
      notifyRoot('data-initial-hash')
    } else {
      shell.dataset.pageLoadState = reason === 'error' ? 'error' : 'ready'
      firstObserver().callback([], {} as MutationObserver)
    }
    expect(header.headerState.value).toBe('resting')
    expect(firstObserver().target).toBeUndefined()
  })

  it('disconnects pending observation and the scroll listener on unmount', () => {
    mountHeader()
    lifecycle.unmounted.forEach(callback => callback())
    expect(firstObserver().target).toBeUndefined()
    expect(window.removeEventListener).toHaveBeenCalledWith('scroll', expect.any(Function))
  })

  it('does not observe a completed fragment', () => {
    delete root.dataset.initialHash
    root.dataset.fontsReady = 'ready'
    window.location.hash = '#home-worlds'
    sentinelTop = -100
    const header = mountHeader()
    expect(header.headerState.value).toBe('floating')
    expect(observers).toHaveLength(0)
  })
})
