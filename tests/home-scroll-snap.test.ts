import { createRenderer, h, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useHomeScrollSnap } from '../src/composables/useHomeScrollSnap'

interface RenderNode { children: RenderNode[] }
const renderer = createRenderer<RenderNode, RenderNode>({
  insert: (node, parent) => { parent.children.push(node) },
  remove: () => undefined,
  createElement: () => ({ children: [] }),
  createText: () => ({ children: [] }),
  createComment: () => ({ children: [] }),
  setText: () => undefined,
  setElementText: () => undefined,
  parentNode: () => null,
  nextSibling: () => null,
  patchProp: () => undefined
})

describe('home document snap lifecycle', () => {
  afterEach(() => vi.unstubAllGlobals())

  function setup(isHome = true, options: { returning?: boolean, ready?: boolean, fontsReady?: string } = {}) {
    const classes = new Set<string>()
    const listeners = new Map<string, () => void>()
    const media = (prefix: string, matches: boolean) => ({
      matches,
      addEventListener: (event: string, handler: () => void) => listeners.set(`${prefix}:${event}`, handler),
      removeEventListener: (event: string) => { listeners.delete(`${prefix}:${event}`) }
    })
    const desktop = media('desktop', true)
    const reduced = media('reduced', false)
    let bodyDisconnected = false
    const body = { style: { overflow: '' } }
    const frames = new Map<number, FrameRequestCallback>()
    let frameId = 0
    const scrollTo = vi.fn()
    const root = {
      dataset: { fontsReady: options.fontsReady ?? 'ready' } as Record<string, string>,
      classList: {
        toggle: (name: string, active: boolean) => active ? classes.add(name) : classes.delete(name),
        remove: (name: string) => classes.delete(name)
      }
    }
    vi.stubGlobal('window', {
      location: { hash: '' }, scrollY: 0,
      history: { state: options.returning ? { homeReadingPosition: { top: 700, left: 0 } } : null },
      scrollTo,
      requestAnimationFrame: (handler: FrameRequestCallback) => { frames.set(++frameId, handler); return frameId },
      cancelAnimationFrame: (id: number) => frames.delete(id),
      matchMedia: (query: string) => query.includes('min-width') ? desktop : reduced,
      addEventListener: (event: string, handler: () => void) => listeners.set(`window:${event}`, handler),
      removeEventListener: (event: string) => listeners.delete(`window:${event}`)
    })
    vi.stubGlobal('document', {
      body,
      querySelector: () => null,
      fonts: { ready: Promise.resolve() },
      documentElement: root,
      addEventListener: (event: string, handler: () => void) => listeners.set(`document:${event}`, handler),
      removeEventListener: (event: string) => listeners.delete(`document:${event}`)
    })
    vi.stubGlobal('performance', { getEntriesByType: () => options.returning ? [{ type: 'back_forward' }] : [] })
    vi.stubGlobal('MutationObserver', class {
      target?: string
      constructor(private handler: () => void) {}
      observe(target: unknown) {
        this.target = target === body ? 'body:style' : 'root:fonts'
        listeners.set(this.target, this.handler)
      }
      disconnect() {
        if (this.target === 'body:style') bodyDisconnected = true
        if (this.target) listeners.delete(this.target)
      }
    })
    const ready = ref(options.ready ?? true)
    const app = renderer.createApp({
      setup() { useHomeScrollSnap(isHome, ready); return () => h('div') }
    })
    app.mount({ children: [] })
    async function flushFrames() {
      await nextTick()
      await Promise.resolve()
      const pending = [...frames.values()]
      frames.clear()
      pending.forEach(handler => handler(0))
    }
    return { app, ready, classes, listeners, desktop, reduced, body, root, scrollTo, flushFrames, bodyDisconnected: () => bodyDisconnected }
  }

  it('clears home scope on async failure and unmounts every media, input and body listener', async () => {
    const state = setup()
    expect(state.classes.has('home-scroll-snap')).toBe(true)
    state.ready.value = false
    await nextTick()
    expect(state.classes.size).toBe(0)
    state.app.unmount()
    expect(state.listeners.size).toBe(0)
    expect(state.bodyDisconnected()).toBe(true)
  })

  it('never installs home motion listeners or root scope on an archive page', () => {
    const state = setup(false)
    expect(state.classes.size).toBe(0)
    expect(state.listeners.size).toBe(0)
    state.app.unmount()
  })

  it('runtime width and reduced motion remove document snap immediately', () => {
    const state = setup()
    state.desktop.matches = false
    state.listeners.get('desktop:change')!()
    expect(state.classes.size).toBe(0)
    state.desktop.matches = true
    state.reduced.matches = true
    state.listeners.get('reduced:change')!()
    expect(state.classes.size).toBe(0)
    state.reduced.matches = false
    state.listeners.get('reduced:change')!()
    expect(state.classes.has('home-scroll-snap')).toBe(true)
    state.app.unmount()
  })

  it('a touch pointer cancels pending history restoration before async content resolves', async () => {
    const state = setup(true, { returning: true, ready: false })
    state.listeners.get('document:pointerdown')?.()
    state.ready.value = true
    await state.flushFrames()
    expect(state.scrollTo).not.toHaveBeenCalled()
    expect(state.root.dataset.homeScrollRestore).toBeUndefined()
    state.app.unmount()
  })

  it.each(['ready', 'fallback'])('history restoration waits for the application font signal %s', async fontsReady => {
    const state = setup(true, { returning: true, fontsReady: 'loading' })
    await state.flushFrames()
    expect(state.scrollTo).not.toHaveBeenCalled()
    state.root.dataset.fontsReady = fontsReady
    state.listeners.get('root:fonts')?.()
    await state.flushFrames()
    expect(state.scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 700, left: 0, behavior: 'instant' })
    state.app.unmount()
    expect(state.listeners.size).toBe(0)
  })
})
