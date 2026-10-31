import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { homeHeroSlides } from '../src/data/homeHeroSlides'
import { createHomeHeroImageLoader, createHomeHeroSlideshow } from '../src/composables/useHomeHeroSlideshow'
import type { PreloadImage } from '../src/utils/imagePreload'

type LoadFormat = 'webp' | 'jpeg' | null
const defaultDwellMs = 3_000

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((settle) => {
    resolve = settle
  })
  return { promise, resolve }
}

async function flushPromises() {
  for (let pass = 0; pass < 20; pass += 1) await Promise.resolve()
}

function createController(loadImage: (index: number, signal: AbortSignal) => Promise<LoadFormat> = async () => 'webp', preferences = {}) {
  const controller = createHomeHeroSlideshow({
    slides: homeHeroSlides,
    loadImage: (slide, { signal }) => loadImage(homeHeroSlides.indexOf(slide), signal),
    ...preferences
  })
  controller.setEnvironment({ inViewport: true, introReady: true })
  return controller
}

async function waitForTarget(controller: ReturnType<typeof createController>) {
  await flushPromises()
  expect(controller.state.value.transitioning).toBe(true)
  const targetIndex = controller.state.value.targetIndex
  expect(targetIndex).not.toBeNull()
  expect(controller.activateTransition(controller.state.value.transactionId)).toBe(true)
  expect(controller.displayIndicatorIndex.value).toBe(targetIndex)
}

function finishCurrentTransition(controller: ReturnType<typeof createController>) {
  controller.finishTransition(controller.state.value.transactionId)
}

describe('home hero slideshow state machine', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts a complete dwell only after the first image, intro, and viewport are ready', async () => {
    const first = deferred<LoadFormat>()
    const controller = createController((index) => index === 0 ? first.promise : Promise.resolve('webp'))

    await vi.advanceTimersByTimeAsync(9_999)
    expect(controller.state.value.currentIndex).toBe(0)
    expect(controller.state.value.transitioning).toBe(false)

    first.resolve('webp')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(defaultDwellMs - 1)
    expect(controller.state.value.currentIndex).toBe(0)
    await vi.advanceTimersByTimeAsync(1)
    await waitForTarget(controller)
    expect(controller.state.value.targetIndex).toBe(1)
    controller.dispose()
  })

  it('advances one photo at a time in order and keeps 13 to 1 moving forward', async () => {
    const controller = createController()
    await flushPromises()

    for (let transition = 0; transition < 13; transition += 1) {
      await vi.advanceTimersByTimeAsync(defaultDwellMs)
      await waitForTarget(controller)
      expect(controller.state.value.direction).toBe('forward')
      finishCurrentTransition(controller)
      expect(controller.state.value.currentIndex).toBe((transition + 1) % 13)
    }

    controller.dispose()
  })

  it('waits for target readiness before starting the transition deadline', async () => {
    const controller = createController()
    await flushPromises()
    controller.select(1)
    await flushPromises()
    const transactionId = controller.state.value.transactionId

    await vi.advanceTimersByTimeAsync(1_200)
    expect(controller.state.value.currentIndex).toBe(0)
    expect(controller.state.value.transitioning).toBe(true)

    expect(controller.activateTransition(transactionId)).toBe(true)
    await vi.advanceTimersByTimeAsync(859)
    expect(controller.state.value.currentIndex).toBe(0)
    await vi.advanceTimersByTimeAsync(1)
    expect(controller.state.value.currentIndex).toBe(1)
    controller.dispose()
  })

  it('updates the indicator only when the target transition starts and rolls it back on failure', async () => {
    const controller = createController()
    await flushPromises()
    controller.select(7)
    await flushPromises()

    const transactionId = controller.state.value.transactionId
    expect(controller.state.value.currentIndex).toBe(0)
    expect(controller.state.value.targetIndex).toBe(7)
    expect(controller.state.value.transitioning).toBe(true)
    expect(controller.displayIndicatorIndex.value).toBe(0)

    expect(controller.activateTransition(transactionId)).toBe(true)
    expect(controller.state.value.currentIndex).toBe(0)
    expect(controller.displayIndicatorIndex.value).toBe(7)

    controller.failTransition(transactionId)
    expect(controller.state.value.currentIndex).toBe(0)
    expect(controller.displayIndicatorIndex.value).toBe(0)
    controller.dispose()
  })

  it('keeps manual pause after pointer hover clears and resumes only by explicit play', async () => {
    const controller = createController()
    await flushPromises()
    controller.select(0)
    controller.setEnvironment({ hovered: true })
    controller.setEnvironment({ hovered: false })
    await vi.advanceTimersByTimeAsync(12_000)

    expect(controller.state.value.userPaused).toBe(true)
    expect(controller.state.value.transitioning).toBe(false)
    controller.play()
    await vi.advanceTimersByTimeAsync(defaultDwellMs)
    await waitForTarget(controller)
    controller.dispose()
  })

  it('keeps focus pause until play, and play works while the control still owns focus', async () => {
    const controller = createController()
    await flushPromises()
    controller.pauseOnFocus()
    await vi.advanceTimersByTimeAsync(12_000)
    expect(controller.state.value.focusPaused).toBe(true)
    expect(controller.state.value.transitioning).toBe(false)

    controller.play()
    await vi.advanceTimersByTimeAsync(defaultDwellMs)
    await waitForTarget(controller)
    expect(controller.state.value.focusPaused).toBe(false)
    controller.dispose()
  })

  it('keeps a pending manual selection when play is pressed and starts the dwell after it appears', async () => {
    const manual = deferred<LoadFormat>()
    const manualSignal: { value: AbortSignal | null } = { value: null }
    const controller = createController((index, signal) => {
      if (index === 4) {
        manualSignal.value = signal
        return manual.promise
      }
      return Promise.resolve('webp')
    })
    await flushPromises()

    controller.select(4)
    await flushPromises()
    controller.play()
    await vi.advanceTimersByTimeAsync(defaultDwellMs)
    await flushPromises()

    expect(manualSignal.value?.aborted).toBe(false)
    expect(controller.state.value.currentIndex).toBe(0)
    expect(controller.state.value.transitioning).toBe(false)

    manual.resolve('webp')
    await flushPromises()
    await waitForTarget(controller)
    expect(controller.state.value.targetIndex).toBe(4)
    finishCurrentTransition(controller)

    await vi.advanceTimersByTimeAsync(defaultDwellMs - 1)
    expect(controller.state.value.currentIndex).toBe(4)
    await vi.advanceTimersByTimeAsync(1)
    await waitForTarget(controller)
    expect(controller.state.value.targetIndex).toBe(5)
    controller.dispose()
  })

  it.each([
    ['hover', { hovered: true }, { hovered: false }],
    ['touch', { touchActive: true }, { touchActive: false }],
    ['offscreen', { inViewport: false }, { inViewport: true }],
    ['hidden page', { pageVisible: false }, { pageVisible: true }]
  ] as const)('pauses for %s and starts a fresh dwell when active again', async (_reason, inactive, active) => {
    const controller = createController()
    await flushPromises()
    controller.play()
    controller.setEnvironment(inactive)

    await vi.advanceTimersByTimeAsync(60_000)
    expect(controller.state.value.currentIndex).toBe(0)
    expect(controller.state.value.transitioning).toBe(false)

    controller.setEnvironment(active)
    await vi.advanceTimersByTimeAsync(defaultDwellMs - 1)
    expect(controller.state.value.currentIndex).toBe(0)
    await vi.advanceTimersByTimeAsync(1)
    await waitForTarget(controller)
    expect(controller.state.value.targetIndex).toBe(1)
    controller.dispose()
  })

  it('queues only the last manual selection during an active transition', async () => {
    const controller = createController()
    await flushPromises()
    controller.select(1)
    await waitForTarget(controller)
    controller.select(6)
    controller.select(3)
    finishCurrentTransition(controller)
    await waitForTarget(controller)

    expect(controller.state.value.currentIndex).toBe(1)
    expect(controller.state.value.targetIndex).toBe(3)
    finishCurrentTransition(controller)
    expect(controller.state.value.currentIndex).toBe(3)
    expect(controller.state.value.userPaused).toBe(true)
    controller.dispose()
  })

  it('reverses manual direction by target order and skips motion when reduced motion is enabled', async () => {
    const controller = createController(async () => 'webp', { reducedMotion: true })
    await flushPromises()
    controller.select(6)
    await flushPromises()
    expect(controller.state.value.currentIndex).toBe(0)
    expect(controller.state.value.targetIndex).toBe(6)
    expect(controller.activateTransition(controller.state.value.transactionId)).toBe(false)
    expect(controller.state.value.currentIndex).toBe(6)
    expect(controller.state.value.transitioning).toBe(false)

    controller.select(0)
    await flushPromises()
    expect(controller.activateTransition(controller.state.value.transactionId)).toBe(false)
    expect(controller.state.value.currentIndex).toBe(0)
    expect(controller.state.value.transitioning).toBe(false)

    controller.setEnvironment({ reducedMotion: false })
    await vi.advanceTimersByTimeAsync(12_000)
    expect(controller.state.value.currentIndex).toBe(0)
    controller.dispose()
  })

  it('loads only the first image with save-data until the user explicitly plays', async () => {
    const loadImage = vi.fn(async (_index: number, _signal: AbortSignal) => 'webp' as const)
    const controller = createController(loadImage, { saveData: true })
    await flushPromises()
    expect(loadImage).toHaveBeenCalledTimes(1)

    controller.play()
    await flushPromises()
    expect(loadImage).toHaveBeenCalledTimes(2)
    expect(controller.state.value.userPaused).toBe(false)
    controller.dispose()
  })

  it('keeps photo selection available in forced colors without loading photos', async () => {
    const loadImage = vi.fn(async () => 'webp' as const)
    const controller = createController(loadImage, { forcedColors: true })

    controller.select(3)
    await flushPromises()

    expect(loadImage).not.toHaveBeenCalled()
    expect(controller.state.value.currentIndex).toBe(3)
    expect(controller.state.value.currentFormat).toBeNull()
    expect(controller.state.value.announcement).toBe('photoSelected')
    controller.dispose()
  })

  it('tries JPEG after WebP failure and requests only the 640px candidate with save-data', async () => {
    const images: PreloadImage[] = []
    const loader = createHomeHeroImageLoader('100vw', () => {
      const image: PreloadImage = { src: '', srcset: '', sizes: '', decoding: 'auto', onload: null, onerror: null }
      images.push(image)
      return image
    })
    const result = loader(homeHeroSlides[0]!, { signal: new AbortController().signal, saveData: true })
    await flushPromises()

    expect(images).toHaveLength(1)
    expect(images[0]!.srcset).toBe(`${homeHeroSlides[0]!.sources.webp[0]!.src} 640w`)
    expect(images[0]!.sizes).toBe('640px')
    images[0]!.onerror?.(new Event('error'))
    await flushPromises()

    expect(images).toHaveLength(2)
    expect(images[1]!.srcset).toBe(`${homeHeroSlides[0]!.sources.jpeg[0]!.src} 640w`)
    expect(images[1]!.sizes).toBe('640px')
    images[1]!.onload?.(new Event('load'))
    expect(await result).toBe('jpeg')
  })

  it('gives the initial hero image high request priority and keeps later preload low priority', async () => {
    const images: PreloadImage[] = []
    const loader = createHomeHeroImageLoader('100vw', () => {
      const image: PreloadImage = { src: '', srcset: '', sizes: '', decoding: 'auto', onload: null, onerror: null }
      images.push(image)
      return image
    })
    const initialAbort = new AbortController()
    const initial = loader(homeHeroSlides[0]!, { signal: initialAbort.signal, saveData: false, kind: 'initial' })
    await flushPromises()
    expect(images[0]!.fetchPriority).toBe('high')
    initialAbort.abort()
    await initial

    const preloadAbort = new AbortController()
    const preload = loader(homeHeroSlides[1]!, { signal: preloadAbort.signal, saveData: false, kind: 'preload' })
    await flushPromises()
    expect(images[1]!.fetchPriority).toBe('low')
    preloadAbort.abort()
    await preload
  })

  it('does not load a later photo while the hero is outside the viewport', async () => {
    const loadImage = vi.fn(async (_index: number, _signal: AbortSignal) => 'webp' as const)
    const controller = createHomeHeroSlideshow({
      slides: homeHeroSlides,
      loadImage: (slide, { signal }) => loadImage(homeHeroSlides.indexOf(slide), signal).then((format) => format)
    })
    await flushPromises()

    expect(loadImage).toHaveBeenCalledTimes(1)
    controller.setEnvironment({ inViewport: true, introReady: true })
    await flushPromises()
    expect(loadImage).toHaveBeenCalledTimes(2)
    controller.dispose()
  })

  it('uses the first available photo when one or more initial candidates fail', async () => {
    const controller = createController(async (index) => index < 2 ? null : 'jpeg')
    await flushPromises()

    expect(controller.state.value.currentIndex).toBe(2)
    expect(controller.state.value.currentFormat).toBe('jpeg')
    expect(controller.state.value.firstImageReady).toBe(true)
    controller.dispose()
  })

  it('ignores a stale image result after the user changes the target', async () => {
    const firstTarget = deferred<LoadFormat>()
    const secondTarget = deferred<LoadFormat>()
    const controller = createController((index) => {
      if (index === 1) return firstTarget.promise
      if (index === 2) return secondTarget.promise
      return Promise.resolve('webp')
    })
    await flushPromises()

    controller.select(1)
    controller.select(2)
    firstTarget.resolve('webp')
    await flushPromises()
    expect(controller.state.value.currentIndex).toBe(0)
    expect(controller.state.value.transitioning).toBe(false)

    secondTarget.resolve('jpeg')
    await flushPromises()
    expect(controller.state.value.targetIndex).toBe(2)
    expect(controller.activateTransition(controller.state.value.transactionId)).toBe(true)
    finishCurrentTransition(controller)
    expect(controller.state.value.currentIndex).toBe(2)
    expect(controller.state.value.currentFormat).toBe('jpeg')
    controller.dispose()
  })

  it('preserves the visible photo after a manual load failure and allows another attempt', async () => {
    const loadImage = vi.fn(async (index: number) => index === 2 ? null : 'webp' as const)
    const controller = createController(loadImage)
    await flushPromises()

    controller.select(2)
    await flushPromises()
    expect(controller.state.value.currentIndex).toBe(0)
    expect(controller.state.value.targetIndex).toBeNull()
    expect(controller.state.value.announcement).toBe('loadFailed')

    controller.select(2)
    await flushPromises()
    expect(loadImage.mock.calls.filter(([index]) => index === 2)).toHaveLength(2)
    controller.dispose()
  })

  it('preserves the visible photo after a target candidate fails and retries on explicit selection', async () => {
    const loadImage = vi.fn(async (_index: number) => 'webp' as const)
    const controller = createController(loadImage)
    await flushPromises()

    controller.select(2)
    await flushPromises()
    const transactionId = controller.state.value.transactionId
    expect(controller.state.value.targetIndex).toBe(2)
    controller.failTransition(transactionId)

    expect(controller.state.value.currentIndex).toBe(0)
    expect(controller.state.value.targetIndex).toBeNull()
    expect(controller.state.value.announcement).toBe('loadFailed')

    controller.select(2)
    await flushPromises()
    expect(loadImage.mock.calls.filter(([index]) => index === 2)).toHaveLength(2)
    expect(controller.state.value.targetIndex).toBe(2)
    controller.dispose()
  })

  it('skips the current slide when automatically recovering from a target candidate failure', async () => {
    const attempts = new Map<number, number>()
    const controller = createController(async (index) => {
      attempts.set(index, (attempts.get(index) ?? 0) + 1)
      return (index === 0 || index === 1) && attempts.get(index) === 1 ? 'webp' : null
    })
    await flushPromises()
    await vi.advanceTimersByTimeAsync(defaultDwellMs)
    await waitForTarget(controller)
    const transactionId = controller.state.value.transactionId
    expect(controller.state.value.targetIndex).toBe(1)

    controller.failTransition(transactionId)
    for (let flush = 0; flush < 10 && !controller.state.value.autoStopped && controller.state.value.targetIndex === null; flush += 1) {
      await flushPromises()
    }

    expect(controller.state.value.currentIndex).toBe(0)
    expect(controller.state.value.targetIndex).toBeNull()
    expect(controller.state.value.autoStopped).toBe(true)
    expect(attempts.get(0)).toBe(1)
    controller.dispose()
  })

  it('times out a stalled requested image and leaves the current slide intact', async () => {
    const stalled = deferred<LoadFormat>()
    const controller = createController((index) => index === 1 ? stalled.promise : Promise.resolve('webp'))
    await flushPromises()

    controller.select(1)
    await vi.advanceTimersByTimeAsync(10_000)
    await flushPromises()
    expect(controller.state.value.currentIndex).toBe(0)
    expect(controller.state.value.targetIndex).toBeNull()
    expect(controller.state.value.announcement).toBe('loadFailed')
    controller.dispose()
  })

  it('stops after a bounded automatic scan when every other photo fails', async () => {
    const attempts = new Map<number, number>()
    const controller = createController(async (index) => {
      attempts.set(index, (attempts.get(index) ?? 0) + 1)
      return index === 0 ? 'webp' : null
    })
    await flushPromises()
    await vi.advanceTimersByTimeAsync(defaultDwellMs)
    await flushPromises()

    expect(controller.state.value.currentIndex).toBe(0)
    expect(controller.state.value.autoStopped).toBe(true)
    expect(controller.state.value.userPaused).toBe(true)
    expect([...attempts.keys()].filter((index) => index !== 0)).toHaveLength(12)
    controller.dispose()
  })

  it('uses a fresh dwell after visibility returns and does not catch up missed photos', async () => {
    const controller = createController()
    await flushPromises()
    await vi.advanceTimersByTimeAsync(3_000)
    controller.setEnvironment({ pageVisible: false, inViewport: false })
    await vi.advanceTimersByTimeAsync(60_000)
    expect(controller.state.value.currentIndex).toBe(0)

    controller.setEnvironment({ pageVisible: true, inViewport: true })
    await vi.advanceTimersByTimeAsync(defaultDwellMs - 1)
    expect(controller.state.value.currentIndex).toBe(0)
    await vi.advanceTimersByTimeAsync(1)
    await waitForTarget(controller)
    expect(controller.state.value.targetIndex).toBe(1)
    controller.dispose()
  })
})
