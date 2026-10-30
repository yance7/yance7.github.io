import { computed, onBeforeUnmount, onMounted, readonly, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { HomeHeroSlide } from '../data/homeHeroSlides'
import { loadImage } from '../utils/imagePreload'
import type { ImageLoadOptions, PreloadImage } from '../utils/imagePreload'

export type HomeHeroLoadFormat = 'webp' | 'jpeg'
type HomeHeroAnnouncement = 'loadFailed' | 'photoSelected' | 'photoShown' | null
type HomeHeroDirection = 'forward' | 'backward'

export interface HomeHeroSlideshowState {
  currentIndex: number
  targetIndex: number | null
  queuedIndex: number | null
  transitioning: boolean
  transactionId: number
  direction: HomeHeroDirection
  currentFormat: HomeHeroLoadFormat | null
  targetFormat: HomeHeroLoadFormat | null
  firstImageReady: boolean
  announcementIndex: number | null
  userPaused: boolean
  focusPaused: boolean
  hovered: boolean
  touchActive: boolean
  pageVisible: boolean
  inViewport: boolean
  introReady: boolean
  reducedMotion: boolean
  saveData: boolean
  forcedColors: boolean
  announcement: HomeHeroAnnouncement
  autoStopped: boolean
}

interface HomeHeroSlideshowClock {
  setTimeout(callback: () => void, delayMs: number): ReturnType<typeof globalThis.setTimeout>
  clearTimeout(timer: ReturnType<typeof globalThis.setTimeout>): void
}

export interface HomeHeroSlideshowOptions {
  slides: readonly HomeHeroSlide[]
  loadImage: (slide: HomeHeroSlide, options: { signal: AbortSignal; saveData: boolean; kind: ActiveLoad['kind'] }) => Promise<HomeHeroLoadFormat | null>
  clock?: HomeHeroSlideshowClock
  dwellMs?: number
  transitionMs?: number
  loadDeadlineMs?: number
  reducedMotion?: boolean
  saveData?: boolean
  forcedColors?: boolean
  pageVisible?: boolean
}

export interface HomeHeroSlideshowEnvironment {
  hovered?: boolean
  touchActive?: boolean
  pageVisible?: boolean
  inViewport?: boolean
  introReady?: boolean
  reducedMotion?: boolean
  saveData?: boolean
  forcedColors?: boolean
}

export interface UseHomeHeroSlideshowOptions extends Omit<HomeHeroSlideshowOptions, 'loadImage'> {
  container: Readonly<Ref<HTMLElement | null>>
  controls: Readonly<Ref<HTMLElement | null>>
  imageSizes: string
}

export function createHomeHeroImageLoader(sizes: string, createImage?: () => PreloadImage) {
  return async (slide: HomeHeroSlide, { signal, saveData, kind = 'automatic' }: { signal: AbortSignal; saveData: boolean; kind?: ActiveLoad['kind'] }): Promise<HomeHeroLoadFormat | null> => {
    for (const format of ['webp', 'jpeg'] as const) {
      const candidates = saveData ? slide.sources[format].slice(0, 1) : slide.sources[format]
      const srcset = candidates.map((candidate) => `${candidate.src} ${candidate.width}w`).join(', ')
      const fetchPriority: NonNullable<ImageLoadOptions['fetchPriority']> = kind === 'initial' ? 'high' : kind === 'preload' ? 'low' : 'auto'
      const loadOptions = {
        src: candidates[0]!.src,
        srcset,
        sizes: saveData ? '640px' : sizes,
        fetchPriority,
        signal,
        retrySrcsetWithDirectSource: false
      }
      const loaded = createImage ? await loadImage(loadOptions, createImage) : await loadImage(loadOptions)
      if (loaded) return format
      if (signal.aborted) return null
    }
    return null
  }
}

interface ActiveLoad {
  index: number
  generation: number
  kind: 'initial' | 'preload' | 'manual' | 'automatic'
  promise: Promise<boolean>
  cancel: () => void
}

const defaultClock: HomeHeroSlideshowClock = {
  setTimeout: (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
  clearTimeout: (timer) => globalThis.clearTimeout(timer)
}

const defaultDwellMs = 6000
const defaultTransitionMs = 700
const defaultLoadDeadlineMs = 10000

export function createHomeHeroSlideshow(options: HomeHeroSlideshowOptions) {
  const { slides } = options
  const clock = options.clock ?? defaultClock
  const dwellMs = options.dwellMs ?? defaultDwellMs
  const transitionMs = options.transitionMs ?? defaultTransitionMs
  const loadDeadlineMs = options.loadDeadlineMs ?? defaultLoadDeadlineMs
  const formats = new Map<number, HomeHeroLoadFormat>()
  const state = ref<HomeHeroSlideshowState>({
    currentIndex: 0,
    targetIndex: null,
    queuedIndex: null,
    transitioning: false,
    transactionId: 0,
    direction: 'forward',
    currentFormat: null,
    targetFormat: null,
    firstImageReady: false,
    announcementIndex: null,
    userPaused: Boolean(options.reducedMotion || options.saveData || options.forcedColors),
    focusPaused: false,
    hovered: false,
    touchActive: false,
    pageVisible: options.pageVisible ?? true,
    inViewport: false,
    introReady: false,
    reducedMotion: Boolean(options.reducedMotion),
    saveData: Boolean(options.saveData),
    forcedColors: Boolean(options.forcedColors),
    announcement: null,
    autoStopped: false
  })
  const currentSlide: ComputedRef<HomeHeroSlide> = computed(() => slides[state.value.currentIndex]!)
  const targetSlide: ComputedRef<HomeHeroSlide | null> = computed(() => {
    const index = state.value.targetIndex
    return index === null ? null : slides[index] ?? null
  })

  let activeLoad: ActiveLoad | null = null
  let requestGeneration = 0
  let intentGeneration = 0
  let dwellTimer: ReturnType<typeof globalThis.setTimeout> | null = null
  let transitionTimer: ReturnType<typeof globalThis.setTimeout> | null = null
  let transitionReady = false
  let transitionAnnouncementIndex: number | null = null
  let disposed = false
  let explicitPlayForData = false

  function clearDwellTimer() {
    if (dwellTimer === null) return
    clock.clearTimeout(dwellTimer)
    dwellTimer = null
  }

  function clearTransitionTimer() {
    if (transitionTimer === null) return
    clock.clearTimeout(transitionTimer)
    transitionTimer = null
  }

  function automaticAllowed() {
    const current = state.value
    return !disposed
      && slides.length > 1
      && current.firstImageReady
      && current.introReady
      && current.inViewport
      && current.pageVisible
      && !current.userPaused
      && !current.focusPaused
      && !current.hovered
      && !current.touchActive
      && !current.reducedMotion
      && !current.forcedColors
      && (!current.saveData || explicitPlayForData)
      && !current.autoStopped
      && activeLoad?.kind !== 'manual'
      && !current.transitioning
      && current.targetIndex === null
  }

  function cancelActiveLoad() {
    if (!activeLoad) return
    requestGeneration += 1
    activeLoad.cancel()
  }

  function startLoad(index: number, kind: ActiveLoad['kind']): Promise<boolean> {
    const slide = slides[index]
    if (!slide || disposed || state.value.forcedColors) return Promise.resolve(false)

    const generation = ++requestGeneration
    const abortController = new AbortController()
    let settled = false
    let deadline: ReturnType<typeof globalThis.setTimeout> | null = null
    let resolveLoad!: (loaded: boolean) => void
    const promise = new Promise<boolean>((resolve) => {
      resolveLoad = resolve
    })

    const finish = (format: HomeHeroLoadFormat | null) => {
      if (settled) return
      settled = true
      if (deadline !== null) clock.clearTimeout(deadline)
      deadline = null
      if (activeLoad?.generation === generation) activeLoad = null
      const isCurrentRequest = generation === requestGeneration && !disposed
      if (isCurrentRequest && format) formats.set(index, format)
      resolveLoad(Boolean(isCurrentRequest && format))
    }

    const active: ActiveLoad = {
      index,
      generation,
      kind,
      promise,
      cancel() {
        abortController.abort()
        finish(null)
      }
    }
    activeLoad = active
    deadline = clock.setTimeout(() => {
      abortController.abort()
      finish(null)
    }, Math.max(0, loadDeadlineMs))

    void Promise.resolve()
      .then(() => options.loadImage(slide, { signal: abortController.signal, saveData: state.value.saveData, kind }))
      .then((format) => finish(format), () => finish(null))

    return promise
  }

  function ensureLoaded(index: number, kind: ActiveLoad['kind']): Promise<boolean> {
    if (formats.has(index)) return Promise.resolve(true)
    if (activeLoad?.index === index) return activeLoad.promise
    if (activeLoad) cancelActiveLoad()
    return startLoad(index, kind)
  }

  function finishTransition(transactionId: number, allowPending = false) {
    const current = state.value
    if (!current.transitioning || transactionId !== current.transactionId || current.targetIndex === null) return
    if (!transitionReady && !allowPending) return

    clearTransitionTimer()
    transitionReady = false
    current.currentIndex = current.targetIndex
    current.currentFormat = current.targetFormat
    current.firstImageReady = current.currentFormat !== null
    current.targetIndex = null
    current.targetFormat = null
    current.transitioning = false
    if (transitionAnnouncementIndex !== null) {
      current.announcement = 'photoShown'
      current.announcementIndex = transitionAnnouncementIndex
    }
    transitionAnnouncementIndex = null

    const queuedIndex = current.queuedIndex
    current.queuedIndex = null
    if (queuedIndex !== null && queuedIndex !== current.currentIndex) {
      void requestManualSelection(queuedIndex)
      return
    }
    refreshSchedule()
  }

  function activateTransition(transactionId: number) {
    const current = state.value
    if (!current.transitioning || transactionId !== current.transactionId || current.targetIndex === null || disposed) return false

    if (current.reducedMotion || current.forcedColors || !current.pageVisible || !current.inViewport) {
      finishTransition(transactionId, true)
      return false
    }

    transitionReady = true
    clearTransitionTimer()
    transitionTimer = clock.setTimeout(() => finishTransition(transactionId), transitionMs + 160)
    return true
  }

  function failTransition(transactionId: number) {
    const current = state.value
    if (!current.transitioning || transactionId !== current.transactionId || current.targetIndex === null) return

    const failedIndex = current.targetIndex
    const wasAutomatic = transitionAnnouncementIndex === null
    const queuedIndex = current.queuedIndex
    formats.delete(failedIndex)
    clearTransitionTimer()
    transitionReady = false
    current.targetIndex = null
    current.targetFormat = null
    current.queuedIndex = null
    current.transitioning = false
    current.announcement = 'loadFailed'
    current.announcementIndex = failedIndex
    transitionAnnouncementIndex = null

    if (queuedIndex !== null && queuedIndex !== current.currentIndex) {
      void requestManualSelection(queuedIndex)
      return
    }
    if (wasAutomatic && !current.userPaused) {
      void advanceAutomatically(failedIndex)
      return
    }
    refreshSchedule()
  }

  function beginTransition(index: number, automatic: boolean) {
    const current = state.value
    const format = formats.get(index)
    if (!format || disposed) return

    current.targetIndex = index
    current.targetFormat = format
    current.direction = automatic || index > current.currentIndex ? 'forward' : 'backward'
    current.transactionId += 1
    current.transitioning = true
    transitionReady = false
    current.announcement = null
    current.announcementIndex = null
    transitionAnnouncementIndex = automatic ? null : index
    clearDwellTimer()
    clearTransitionTimer()
  }

  function refreshSchedule() {
    clearDwellTimer()
    if (!automaticAllowed()) return
    maybePreloadNext()
    dwellTimer = clock.setTimeout(() => {
      dwellTimer = null
      void advanceAutomatically()
    }, dwellMs)
  }

  function maybePreloadNext() {
    const current = state.value
    if (!current.firstImageReady || current.forcedColors || !current.pageVisible || !current.inViewport) return
    if (current.saveData && !explicitPlayForData) return
    const nextIndex = (current.currentIndex + 1) % slides.length
    if (!formats.has(nextIndex) && !activeLoad) void ensureLoaded(nextIndex, 'preload')
  }

  async function advanceAutomatically(startIndex = state.value.currentIndex, excludedIndex = state.value.currentIndex) {
    if (!automaticAllowed()) return
    const generation = ++intentGeneration
    let nextIndex = (startIndex + 1) % slides.length
    let examined = 0

    while (examined < slides.length) {
      if (nextIndex === excludedIndex) {
        nextIndex = (nextIndex + 1) % slides.length
        examined += 1
        continue
      }

      const loaded = await ensureLoaded(nextIndex, 'automatic')
      if (disposed || generation !== intentGeneration || !automaticAllowed()) return
      examined += 1
      if (loaded) {
        beginTransition(nextIndex, true)
        return
      }

      nextIndex = (nextIndex + 1) % slides.length
    }

    if (generation !== intentGeneration || disposed) return
    state.value.autoStopped = true
    state.value.userPaused = true
    refreshSchedule()
  }

  async function requestManualSelection(index: number) {
    const generation = ++intentGeneration
    if (activeLoad && activeLoad.index !== index) cancelActiveLoad()
    const loaded = await ensureLoaded(index, 'manual')
    if (disposed || generation !== intentGeneration) return
    if (!loaded) {
      state.value.announcement = 'loadFailed'
      state.value.announcementIndex = index
      refreshSchedule()
      return
    }
    beginTransition(index, false)
  }

  async function loadInitialPhoto(startIndex = 0, attempts = 0, generation = intentGeneration) {
    if (disposed || state.value.forcedColors || attempts >= slides.length || generation !== intentGeneration) return
    const loaded = await ensureLoaded(startIndex, 'initial')
    if (disposed || generation !== intentGeneration) return
    if (loaded) {
      state.value.currentIndex = startIndex
      state.value.currentFormat = formats.get(startIndex) ?? null
      state.value.firstImageReady = state.value.currentFormat !== null
      refreshSchedule()
      return
    }

    if (attempts + 1 < slides.length) {
      await loadInitialPhoto((startIndex + 1) % slides.length, attempts + 1, generation)
      return
    }
    state.value.autoStopped = true
    state.value.userPaused = true
  }

  function setEnvironment(environment: HomeHeroSlideshowEnvironment) {
    const current = state.value
    const wasReducedMotion = current.reducedMotion
    const wasForcedColors = current.forcedColors
    Object.assign(current, environment)

    if (environment.reducedMotion === true) {
      current.userPaused = true
      if (current.transitioning && transitionReady) finishTransition(current.transactionId)
      else if (activeLoad?.kind === 'automatic' || activeLoad?.kind === 'preload') cancelActiveLoad()
    } else if (wasReducedMotion && environment.reducedMotion === false) {
      current.userPaused = true
    }

    if (environment.saveData === true) {
      current.userPaused = true
      explicitPlayForData = false
      if (activeLoad?.kind === 'preload' || activeLoad?.kind === 'automatic') cancelActiveLoad()
    }

    if (environment.forcedColors === true) {
      current.userPaused = true
      intentGeneration += 1
      cancelActiveLoad()
      if (current.transitioning) finishTransition(current.transactionId, true)
      current.firstImageReady = false
      current.currentFormat = null
      current.announcement = null
      current.announcementIndex = null
    }

    const becameInactive = (environment.pageVisible === false || environment.inViewport === false)
    if (becameInactive) {
      clearDwellTimer()
      if (activeLoad?.kind === 'preload' || activeLoad?.kind === 'automatic') cancelActiveLoad()
      if (current.transitioning && transitionReady) finishTransition(current.transactionId)
    }

    if (wasForcedColors && environment.forcedColors === false) {
      current.firstImageReady = false
      void loadInitialPhoto(current.currentIndex)
    }
    if (!current.forcedColors && !current.firstImageReady && !activeLoad && !current.transitioning) {
      void loadInitialPhoto(current.currentIndex)
    }
    refreshSchedule()
  }

  function select(index: number) {
    if (!Number.isInteger(index) || index < 0 || index >= slides.length || disposed) return
    state.value.userPaused = true
    state.value.announcement = null
    state.value.announcementIndex = null
    if (state.value.forcedColors) {
      const current = state.value
      intentGeneration += 1
      current.currentIndex = index
      current.currentFormat = null
      current.firstImageReady = false
      current.targetIndex = null
      current.targetFormat = null
      current.queuedIndex = null
      current.transitioning = false
      current.announcement = 'photoSelected'
      current.announcementIndex = index
      return
    }
    if (state.value.transitioning) {
      state.value.queuedIndex = index
      clearDwellTimer()
      return
    }
    if (index === state.value.currentIndex && state.value.firstImageReady) {
      intentGeneration += 1
      if (activeLoad) cancelActiveLoad()
      refreshSchedule()
      return
    }
    clearDwellTimer()
    void requestManualSelection(index)
  }

  function play() {
    if (disposed || state.value.reducedMotion || state.value.forcedColors) return
    state.value.userPaused = false
    state.value.focusPaused = false
    state.value.autoStopped = false
    state.value.announcement = null
    state.value.announcementIndex = null
    if (state.value.saveData) explicitPlayForData = true
    if (!state.value.firstImageReady && !activeLoad) void loadInitialPhoto(state.value.currentIndex)
    refreshSchedule()
  }

  function pause() {
    state.value.userPaused = true
    intentGeneration += 1
    clearDwellTimer()
    if (activeLoad?.kind === 'automatic' || activeLoad?.kind === 'preload') cancelActiveLoad()
  }

  function pauseOnFocus() {
    state.value.focusPaused = true
    clearDwellTimer()
  }

  function dispose() {
    if (disposed) return
    disposed = true
    intentGeneration += 1
    clearDwellTimer()
    clearTransitionTimer()
    cancelActiveLoad()
  }

  if (!state.value.forcedColors) void loadInitialPhoto()

  return {
    state: readonly(state) as Readonly<Ref<HomeHeroSlideshowState>>,
    currentSlide,
    targetSlide,
    get dwellMs() { return dwellMs },
    get transitionMs() { return transitionMs },
    setEnvironment,
    select,
    play,
    pause,
    pauseOnFocus,
    activateTransition,
    failTransition,
    finishTransition,
    dispose
  }
}

export function useHomeHeroSlideshow(options: UseHomeHeroSlideshowOptions) {
  const { container, controls, imageSizes, ...controllerOptions } = options
  const reducedMotion = controllerOptions.reducedMotion
    ?? (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const forcedColors = controllerOptions.forcedColors
    ?? (typeof window !== 'undefined' && window.matchMedia('(forced-colors: active)').matches)
  const saveData = controllerOptions.saveData
    ?? (typeof navigator !== 'undefined'
      && (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true)
  const pageVisible = controllerOptions.pageVisible
    ?? (typeof document === 'undefined' || document.visibilityState !== 'hidden')
  const controller = createHomeHeroSlideshow({
    ...controllerOptions,
    reducedMotion,
    forcedColors,
    saveData,
    pageVisible,
    loadImage: createHomeHeroImageLoader(imageSizes)
  })

  let motionMedia: MediaQueryList | null = null
  let forcedMedia: MediaQueryList | null = null
  let connection: (EventTarget & { saveData?: boolean }) | undefined
  let intersectionObserver: IntersectionObserver | null = null
  let currentContainer: HTMLElement | null = null
  let currentControls: HTMLElement | null = null
  const touchPointers = new Set<number>()

  function updatePreferences() {
    controller.setEnvironment({
      reducedMotion: motionMedia?.matches === true,
      forcedColors: forcedMedia?.matches === true,
      saveData: connection?.saveData === true
    })
  }

  function visibilityChanged() {
    controller.setEnvironment({ pageVisible: document.visibilityState === 'visible' })
  }

  function touchDown(event: PointerEvent) {
    if (event.pointerType !== 'touch') return
    touchPointers.add(event.pointerId)
    controller.setEnvironment({ touchActive: true })
  }

  function touchEnd(event: PointerEvent) {
    if (!touchPointers.delete(event.pointerId)) return
    controller.setEnvironment({ touchActive: touchPointers.size > 0 })
  }

  function hoverStart(event: PointerEvent) {
    if (event.pointerType === 'mouse') controller.setEnvironment({ hovered: true })
  }

  function hoverEnd(event: PointerEvent) {
    if (event.pointerType === 'mouse') controller.setEnvironment({ hovered: false })
  }

  function controlsFocused() {
    controller.pauseOnFocus()
  }

  function bindContainer(element: HTMLElement | null) {
    intersectionObserver?.disconnect()
    intersectionObserver = null
    currentContainer?.removeEventListener('pointerdown', touchDown)
    currentContainer?.removeEventListener('pointerenter', hoverStart)
    currentContainer?.removeEventListener('pointerleave', hoverEnd)
    currentContainer = element
    touchPointers.clear()
    controller.setEnvironment({ hovered: false, touchActive: false, inViewport: false })
    if (!element || typeof window === 'undefined') return

    element.addEventListener('pointerdown', touchDown, { passive: true })
    element.addEventListener('pointerenter', hoverStart, { passive: true })
    element.addEventListener('pointerleave', hoverEnd, { passive: true })
    const Observer = (window as Window & { IntersectionObserver?: typeof IntersectionObserver }).IntersectionObserver
    if (Observer) {
      intersectionObserver = new Observer((entries) => {
        controller.setEnvironment({ inViewport: Boolean(entries[0]?.isIntersecting) })
      })
      intersectionObserver.observe(element)
    } else {
      const bounds = element.getBoundingClientRect()
      controller.setEnvironment({ inViewport: bounds.bottom > 0 && bounds.top < window.innerHeight })
    }
  }

  function bindControls(element: HTMLElement | null) {
    currentControls?.removeEventListener('focusin', controlsFocused)
    currentControls = element
    currentControls?.addEventListener('focusin', controlsFocused)
  }

  const stopContainerWatch = watch(container, bindContainer, { flush: 'post' })
  const stopControlsWatch = watch(controls, bindControls, { flush: 'post' })

  onMounted(() => {
    motionMedia = window.matchMedia('(prefers-reduced-motion: reduce)')
    forcedMedia = window.matchMedia('(forced-colors: active)')
    connection = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean } }).connection
    motionMedia.addEventListener('change', updatePreferences)
    forcedMedia.addEventListener('change', updatePreferences)
    connection?.addEventListener('change', updatePreferences)
    document.addEventListener('visibilitychange', visibilityChanged)
    window.addEventListener('pointerup', touchEnd, { passive: true })
    window.addEventListener('pointercancel', touchEnd, { passive: true })
    bindContainer(container.value)
    bindControls(controls.value)
    visibilityChanged()
  })

  onBeforeUnmount(() => {
    stopContainerWatch()
    stopControlsWatch()
    intersectionObserver?.disconnect()
    currentContainer?.removeEventListener('pointerdown', touchDown)
    currentContainer?.removeEventListener('pointerenter', hoverStart)
    currentContainer?.removeEventListener('pointerleave', hoverEnd)
    currentControls?.removeEventListener('focusin', controlsFocused)
    motionMedia?.removeEventListener('change', updatePreferences)
    forcedMedia?.removeEventListener('change', updatePreferences)
    connection?.removeEventListener('change', updatePreferences)
    document.removeEventListener('visibilitychange', visibilityChanged)
    window.removeEventListener('pointerup', touchEnd)
    window.removeEventListener('pointercancel', touchEnd)
    controller.dispose()
  })

  return controller
}
