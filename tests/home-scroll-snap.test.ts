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

  function setup(isHome = true, options: { returning?: boolean, ready?: boolean, fontsReady?: string,
    historyRestoration?: ScrollRestoration, leasedRestoration?: ScrollRestoration } = {}) {
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
    let lastSectionTop = 138
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
      location: { hash: '' }, scrollY: 0, scrollX: 0,
      history: {
        scrollRestoration: options.historyRestoration ?? 'auto',
        state: options.returning ? { homeReadingPosition: { top: 700, left: 0 }, homeReadingRestoration: options.leasedRestoration } : null,
        replaceState: vi.fn()
      },
      scrollTo,
      requestAnimationFrame: (handler: FrameRequestCallback) => { frames.set(++frameId, handler); return frameId },
      cancelAnimationFrame: (id: number) => frames.delete(id),
      matchMedia: (query: string) => query.includes('min-width') ? desktop : reduced,
      addEventListener: (event: string, handler: () => void) => listeners.set(`window:${event}`, handler),
      removeEventListener: (event: string) => listeners.delete(`window:${event}`)
    })
    vi.stubGlobal('document', {
      body,
      querySelector: (selector: string) => selector === '#home-beyond'
        ? { getBoundingClientRect: () => ({ top: lastSectionTop }) } : null,
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
    return { app, ready, classes, listeners, desktop, reduced, body, root, scrollTo, flushFrames,
      setLastSectionTop: (top: number) => { lastSectionTop = top }, bodyDisconnected: () => bodyDisconnected }
  }

  it('does not attach document vertical snap classes or scroll listeners on home', () => {
    const state = setup()
    expect(state.classes.has('home-scroll-snap')).toBe(false)
    expect(state.classes.size).toBe(0)
    expect(state.listeners.has('window:scroll')).toBe(false)
    expect(state.listeners.has('desktop:change')).toBe(false)
    expect(state.listeners.has('reduced:change')).toBe(false)
    expect(state.listeners.has('body:style')).toBe(false)
    state.app.unmount()
  })

  it('unmounts every history and cancellation listener cleanly', async () => {
    const state = setup()
    expect(state.classes.size).toBe(0)
    state.ready.value = false
    await nextTick()
    expect(state.classes.size).toBe(0)
    state.app.unmount()
    expect(state.listeners.size).toBe(0)
  })

  it('never installs home restoration listeners on an archive page', () => {
    const state = setup(false)
    expect(state.classes.size).toBe(0)
    expect(state.listeners.size).toBe(0)
    state.app.unmount()
  })

  it('saves reading position and restoration policy on pagehide without snap classes', () => {
    const state = setup()
    state.listeners.get('window:pagehide')?.()
    expect(state.classes.size).toBe(0)
    expect(window.history.replaceState).toHaveBeenCalledWith(
      expect.objectContaining({
        homeReadingRestoration: 'auto',
        homeReadingPosition: { top: 0, left: 0 }
      }),
      ''
    )
    state.app.unmount()
  })

  it('a touch pointer cancels pending history restoration before async content resolves', async () => {
    const state = setup(true, { returning: true, ready: false })
    expect(window.history.scrollRestoration).toBe('manual')
    state.listeners.get('document:pointerdown')?.()
    state.ready.value = true
    await state.flushFrames()
    expect(state.scrollTo).not.toHaveBeenCalled()
    expect(state.root.dataset.homeScrollRestore).toBeUndefined()
    expect(window.history.scrollRestoration).toBe('manual')
    state.app.unmount()
    expect(window.history.scrollRestoration).toBe('auto')
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

  it('restores after Vue commits content even when animation frames are not delivered', async () => {
    const state = setup(true, { returning: true, fontsReady: 'loading' })
    state.root.dataset.fontsReady = 'ready'
    state.listeners.get('root:fonts')?.()
    await nextTick()
    expect(state.scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 700, left: 0, behavior: 'instant' })
    expect(state.root.dataset.homeScrollRestore).toBeUndefined()
    state.app.unmount()
  })

  it('input cancels the restoration queued after the font signal', async () => {
    const state = setup(true, { returning: true, fontsReady: 'loading' })
    state.root.dataset.fontsReady = 'ready'
    state.listeners.get('root:fonts')?.()
    state.listeners.get('document:pointerdown')?.()
    await nextTick()
    expect(state.scrollTo).not.toHaveBeenCalled()
    state.app.unmount()
  })

  it('keeps its lease when the initial cold traversal emits popstate after mount', async () => {
    const state = setup(true, { returning: true, fontsReady: 'loading' })
    state.listeners.get('window:popstate')?.()
    expect(window.history.scrollRestoration).toBe('manual')
    expect(state.root.dataset.homeScrollRestore).toBe('true')
    state.root.dataset.fontsReady = 'ready'
    state.listeners.get('root:fonts')?.()
    await nextTick()
    expect(state.scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 700, left: 0, behavior: 'instant' })
    state.app.unmount()
  })

  it('releases the original policy after returning again to an entry with its previous manual lease', () => {
    const state = setup(true, { returning: true, fontsReady: 'loading', historyRestoration: 'manual', leasedRestoration: 'auto' })
    expect(window.history.scrollRestoration).toBe('manual')
    state.listeners.get('window:hashchange')?.()
    expect(window.history.scrollRestoration).toBe('auto')
    expect(state.root.dataset.homeScrollRestore).toBeUndefined()
    state.app.unmount()
  })
})
