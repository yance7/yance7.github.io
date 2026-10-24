import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import reveal, { revealForNavigation } from '../src/directives/reveal'

class RevealElement {
  dataset: Record<string, string> = {}
  computedOpacity = '0'
  computedTransform = 'none'
  boundsReads = 0
  tokens = new Set<string>()
  classList = {
    add: (...tokens: string[]) => tokens.forEach(token => this.tokens.add(token)),
    contains: (token: string) => this.tokens.has(token)
  }
  style = { transitionDelay: '', removeProperty: () => { this.style.transitionDelay = '' } }
  getBoundingClientRect() {
    this.boundsReads += 1
    return { top: 2000, bottom: 2100 }
  }
  contains(target: unknown) { return target === this }
}

const hooks = reveal as {
  mounted: (element: HTMLElement, binding: { value?: unknown }) => void
  updated: (element: HTMLElement, binding: { value?: unknown }) => void
  unmounted: (element: HTMLElement) => void
}

describe('reveal observer lifecycle', () => {
  let elements: RevealElement[]
  let observers: { targets: Set<HTMLElement>, disconnected: boolean, intersect: (element: HTMLElement) => void }[]
  let listeners: Map<string, () => void>
  let reduced: { matches: boolean, addEventListener: (event: string, handler: () => void) => void, removeEventListener: (event: string) => void }

  beforeEach(() => {
    elements = []
    observers = []
    listeners = new Map()
    reduced = {
      matches: false,
      addEventListener: (event, handler) => listeners.set(`motion:${event}`, handler),
      removeEventListener: event => { listeners.delete(`motion:${event}`) }
    }
    class Observer {
      targets = new Set<HTMLElement>()
      disconnected = false
      constructor(private callback: IntersectionObserverCallback) { observers.push(this) }
      observe(element: HTMLElement) { this.targets.add(element) }
      unobserve(element: HTMLElement) { this.targets.delete(element) }
      disconnect() { this.disconnected = true }
      intersect(element: HTMLElement) {
        const rect = element.getBoundingClientRect()
        this.callback([{
          target: element, isIntersecting: true, time: 0, intersectionRatio: 1,
          boundingClientRect: rect, intersectionRect: rect, rootBounds: null
        }], this as unknown as IntersectionObserver)
      }
    }
    vi.stubGlobal('IntersectionObserver', Observer)
    vi.stubGlobal('HTMLElement', RevealElement)
    vi.stubGlobal('getComputedStyle', (element: RevealElement) => ({
      opacity: element.computedOpacity,
      transform: element.computedTransform
    }))
    vi.stubGlobal('window', {
      IntersectionObserver: Observer,
      innerHeight: 800,
      scrollY: 0,
      location: { hash: '' },
      matchMedia: () => reduced,
      requestAnimationFrame: () => 1,
      cancelAnimationFrame: () => undefined,
      addEventListener: (event: string, handler: () => void) => listeners.set(event, handler),
      removeEventListener: (event: string) => listeners.delete(event)
    })
    vi.stubGlobal('document', {
      documentElement: { scrollHeight: 10000, dataset: {} },
      querySelectorAll: () => elements,
      addEventListener: (event: string, handler: () => void) => listeners.set(event, handler),
      removeEventListener: (event: string) => listeners.delete(event)
    })
  })

  afterEach(() => {
    elements.forEach(element => hooks.unmounted(element as unknown as HTMLElement))
    vi.unstubAllGlobals()
  })

  function mount(profile: 'home' | 'default', delay = 60) {
    const element = new RevealElement()
    elements.push(element)
    hooks.mounted(element as unknown as HTMLElement, { value: { profile, delay } })
    return element
  }

  it('shares one observer per profile and disconnects each when its last target unmounts', () => {
    const first = mount('home')
    const second = mount('home')
    const other = mount('default')
    expect(observers).toHaveLength(2)
    expect(observers[0]!.targets.size).toBe(2)
    hooks.unmounted(first as unknown as HTMLElement)
    expect(observers[0]!.disconnected).toBe(false)
    hooks.unmounted(second as unknown as HTMLElement)
    expect(observers[0]!.disconnected).toBe(true)
    expect(observers[1]!.disconnected).toBe(false)
    hooks.unmounted(other as unknown as HTMLElement)
    expect(observers[1]!.disconnected).toBe(true)
    expect(listeners.size).toBe(0)
  })

  it('runtime reduced motion completes pending profiles, removes delays and disconnects observation', () => {
    const home = mount('home', 120)
    const other = mount('default', 240)
    reduced.matches = true
    listeners.get('motion:change')!()
    expect(home.tokens.has('revealed')).toBe(true)
    expect(other.tokens.has('revealed')).toBe(true)
    expect(home.style.transitionDelay).toBe('0ms')
    expect(other.style.transitionDelay).toBe('0ms')
    expect(observers.every(observer => observer.disconnected)).toBe(true)
    expect(listeners.has('scroll')).toBe(false)
    expect(listeners.has('focusin')).toBe(true)
  })

  it('stagger delays only entrance properties, leaving interaction feedback immediate', () => {
    const element = mount('default', 800)
    expect(element.style.transitionDelay.split(',').map(value => value.trim())).toEqual([
      '180ms', '180ms', '0ms', '0ms', '0ms', '0ms'
    ])
  })

  it('home updates preserve a completed reveal without restoring stagger delays', () => {
    const element = mount('home')
    reduced.matches = true
    listeners.get('motion:change')!()
    reduced.matches = false
    hooks.updated(element as unknown as HTMLElement, { value: { profile: 'home', delay: 240 } })
    expect(element.tokens.has('revealed')).toBe(true)
    expect(element.style.transitionDelay).toBe('0ms')
  })

  it('preserves a pending reveal when Vue updates unrelated dynamic classes', () => {
    const element = mount('default', 120)
    element.tokens.clear()
    hooks.updated(element as unknown as HTMLElement, { value: 120 })
    expect(element.tokens.has('reveal')).toBe(true)
    expect(element.tokens.has('revealed')).toBe(false)
  })

  it.each(['home', 'default'] as const)('preserves completed %s reveal ownership across Vue class updates', profile => {
    const element = mount(profile, 120)
    observers.find(observer => observer.targets.has(element as unknown as HTMLElement))!.intersect(element as unknown as HTMLElement)
    element.tokens.clear()
    hooks.updated(element as unknown as HTMLElement, { value: { profile, delay: 120 } })
    expect(element.tokens.has('reveal')).toBe(true)
    expect(element.tokens.has('revealed')).toBe(true)
  })

  it('document end reveals every remaining profile and releases scroll listeners', () => {
    const home = mount('home')
    const other = mount('default')
    window.scrollY = 9200
    listeners.get('scroll')!()
    expect(home.tokens.has('revealed')).toBe(true)
    expect(other.tokens.has('revealed')).toBe(true)
    expect(observers.every(observer => observer.disconnected)).toBe(true)
    expect(listeners.has('scroll')).toBe(false)
    expect(listeners.has('focusin')).toBe(true)
  })

  it('focus immediately completes a reveal already queued by its observer', () => {
    const element = mount('home', 240)
    observers[0]!.intersect(element as unknown as HTMLElement)
    expect(element.tokens.has('revealed')).toBe(true)
    revealForNavigation(element as unknown as HTMLElement)
    expect(element.dataset.revealImmediate).toBe('true')
    expect(element.style.transitionDelay).toBe('0ms')
    expect(listeners.has('focusin')).toBe(true)
  })

  it.each([
    'none',
    'matrix(1, 0, 0, 1, 0, 0)',
    'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)'
  ])('does not reapply immediate reveal state after it settles at transform %s', computedTransform => {
    const element = mount('default', 240)
    observers[0]!.intersect(element as unknown as HTMLElement)
    element.computedOpacity = '1'
    element.computedTransform = computedTransform
    const boundsReadsBeforeFocus = element.boundsReads
    const transitionDelayBeforeFocus = element.style.transitionDelay

    revealForNavigation(element as unknown as HTMLElement)

    expect(element.dataset.revealImmediate).toBeUndefined()
    expect(element.style.transitionDelay).toBe(transitionDelayBeforeFocus)
    expect(element.boundsReads).toBe(boundsReadsBeforeFocus)
  })

  it('immediately completes an opacity-ready reveal while its transform is still moving', () => {
    const element = mount('default', 240)
    observers[0]!.intersect(element as unknown as HTMLElement)
    element.computedOpacity = '1'
    element.computedTransform = 'matrix(1, 0, 0, 1, 0, -1)'
    const boundsReadsBeforeFocus = element.boundsReads

    revealForNavigation(element as unknown as HTMLElement)

    expect(element.dataset.revealImmediate).toBe('true')
    expect(element.style.transitionDelay).toBe('0ms')
    expect(element.boundsReads).toBe(boundsReadsBeforeFocus + 1)
  })
})
