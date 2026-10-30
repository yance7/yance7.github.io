import { expect, test } from '@playwright/test'
import { readMimoReferenceGlyph } from './helpers/mimo-reference'

type HeroPoint = { x: number; y: number; rectX: number; rectY: number; size: number; color: string; alpha: number }
type HeroIntroWindow = Window & {
  heroIntroCurrentFrameTime?: number
  heroIntroDraw?: { time: number, frame: number }
  heroIntroInput?: { phase: string, accepted: boolean, injectedAt: number }
}
type HeroPixelWindow = Window & {
  heroBaseline?: Uint8ClampedArray
  heroHomePoints?: { x: number; y: number }[]
  heroPoints?: HeroPoint[]
  heroPeak?: number
  heroPeakDisplacement?: number
  heroReleasedAt?: number
  heroRecoveryMs?: number
  heroReleasedFrame?: number
  heroRecoveryFrames?: number
  heroRecoveryIntervals?: number[]
  heroLastRenderedAt?: number
  heroCompletedRenders?: number[]
  heroBaselineP95?: number
  heroObservedCanvas?: HTMLCanvasElement
  heroObservedContext?: CanvasRenderingContext2D
  heroCaptureInstalls?: number
  heroCaptureClears?: number
  heroPreviousBatchSize?: number
  heroCapturedDeformation?: boolean
  heroPointerLeaveFrame?: number
}

async function savePixels(page: import('@playwright/test').Page) {
  const reference = await page.locator('.home-hero-particles').evaluate(readMimoReferenceGlyph)
  expect(reference.points.length).toBeGreaterThan(0)
  const canvasLocator = page.locator('.home-hero-particles-canvas')
  const startingFrame = await canvasLocator.evaluate((element, reference) => {
    const canvas = element as HTMLCanvasElement
    const target = window as HeroPixelWindow
    const context = canvas.getContext('2d')!
    target.heroHomePoints = reference.points
    if (target.heroObservedCanvas !== canvas) {
      target.heroObservedCanvas = canvas
      target.heroObservedContext = context
      target.heroCaptureInstalls = (target.heroCaptureInstalls ?? 0) + 1
      // Cache the actual native drawing state when it is assigned, rather than
      // crossing the Canvas API again for every observed rectangle.
      const colorDescriptor = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'fillStyle')!
      const alphaDescriptor = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'globalAlpha')!
      let currentColor = context.fillStyle
      let currentAlpha = context.globalAlpha
      Object.defineProperty(context, 'fillStyle', {
        configurable: true,
        get: () => currentColor,
        set(value: CanvasRenderingContext2D['fillStyle']) {
          colorDescriptor.set!.call(context, value)
          currentColor = colorDescriptor.get!.call(context)
        }
      })
      Object.defineProperty(context, 'globalAlpha', {
        configurable: true,
        get: () => currentAlpha,
        set(value: number) {
          alphaDescriptor.set!.call(context, value)
          currentAlpha = value
        }
      })
      const clear = context.clearRect
      context.clearRect = (...args) => { contextClear(...args) }
      function contextClear(...args: Parameters<typeof clear>) {
        Reflect.apply(clear, context, args)
        target.heroPreviousBatchSize = target.heroPoints?.length ?? 0
        target.heroCaptureClears = (target.heroCaptureClears ?? 0) + 1
        target.heroPoints = []
      }
      const fill = context.fillRect
      context.fillRect = (x, y, width, height) => {
        fill.call(context, x, y, width, height)
        target.heroPoints!.push({ x: x + width / 2, y: y + height / 2, rectX: x, rectY: y, size: width, color: String(currentColor), alpha: currentAlpha })
        if (target.heroPoints!.length !== target.heroHomePoints!.length) return
        const baseline = target.heroBaseline
        const baselinePoints = target.heroHomePoints
        if (!baseline || !baselinePoints) return
        const displacement = Math.max(...target.heroPoints!.map((point, index) => Math.hypot(point.x - baselinePoints[index]!.x, point.y - baselinePoints[index]!.y)))
        const renderedAt = performance.now()
        ;(target.heroCompletedRenders ??= []).push(renderedAt)
        if (target.heroReleasedAt !== undefined && target.heroRecoveryFrames === undefined) {
          target.heroRecoveryIntervals ??= []
          target.heroRecoveryIntervals.push(renderedAt - (target.heroLastRenderedAt ?? target.heroReleasedAt))
        }
        target.heroLastRenderedAt = renderedAt
        // Retain one actual deformation image; recovery observation needs only
        // positions. Full readback on every recovery frame alters RAF delivery.
        if (displacement > 1 && !target.heroCapturedDeformation) {
          const data = context.getImageData(0, 0, canvas.width, canvas.height).data
          let changed = 0
          for (let i = 0; i < data.length; i += 4) {
            if (data[i] !== baseline[i] || data[i + 1] !== baseline[i + 1] || data[i + 2] !== baseline[i + 2] || data[i + 3] !== baseline[i + 3]) changed++
          }
          target.heroPeak = changed
          target.heroCapturedDeformation = true
        }
        target.heroPeakDisplacement = Math.max(target.heroPeakDisplacement ?? 0, displacement)
        if (displacement < .5 && (target.heroPeakDisplacement ?? 0) > 1 && target.heroReleasedAt !== undefined && target.heroRecoveryMs === undefined) {
          target.heroRecoveryMs = performance.now() - target.heroReleasedAt
          target.heroRecoveryFrames = Number(canvas.parentElement!.dataset.frameCount) + 1 - target.heroReleasedFrame!
        }
      }
    }
    return Number(canvas.parentElement!.dataset.frameCount)
  }, reference)
  try {
    await expect.poll(() => canvasLocator.evaluate((element, { expected, startingFrame }) => {
    const canvas = element as HTMLCanvasElement
    const stage = canvas.parentElement!
    const target = window as HeroPixelWindow
    const particleCount = Number(stage.dataset.particleCount)
    const renderedPoints = target.heroPoints?.length ?? 0
    const frameCount = Number(stage.dataset.frameCount)
    return {
      ready: frameCount > startingFrame && particleCount === expected && renderedPoints === expected,
      expected,
      particleCount,
      renderedPoints,
      frameCount
    }
    }, { expected: reference.points.length, startingFrame })).toMatchObject({ ready: true })
  } catch (error) {
    const evidence = await canvasLocator.evaluate((element, { expected, startingFrame }) => {
      const canvas = element as HTMLCanvasElement
      const stage = canvas.parentElement!
      const target = window as HeroPixelWindow
      const bounds = stage.getBoundingClientRect()
      const context = canvas.getContext('2d')
      const measure = document.createElement('canvas').getContext('2d')!
      measure.font = '400 100px Amiri, serif'
      return { expected, startingFrame, frameCount: Number(stage.dataset.frameCount),
        particleCount: Number(stage.dataset.particleCount), renderedPoints: target.heroPoints?.length ?? 0,
        renderMode: stage.dataset.renderMode, particleState: stage.dataset.particleState,
        animationRunning: stage.dataset.animationRunning, bounds: { width: bounds.width, height: bounds.height },
        border: { left: stage.clientLeft, top: stage.clientTop }, canvas: { width: canvas.width, height: canvas.height },
        dpr: devicePixelRatio, fontStatus: document.fonts.status, fontReady: document.fonts.check('400 100px Amiri', 'YANCE'),
        fontWidth: measure.measureText('YANCE').width, visibility: document.visibilityState, focused: document.hasFocus(),
        sameCanvas: target.heroObservedCanvas === canvas, sameContext: target.heroObservedContext === context,
        installs: target.heroCaptureInstalls, clears: target.heroCaptureClears, previousBatchSize: target.heroPreviousBatchSize }
    }, { expected: reference.points.length, startingFrame })
    await test.info().attach('particle-capture-diagnostics', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' })
    throw error
  }
  await canvasLocator.evaluate((element, expected) => {
    const canvas = element as HTMLCanvasElement
    const target = window as HeroPixelWindow
    const context = canvas.getContext('2d')!
    target.heroBaseline = context.getImageData(0, 0, canvas.width, canvas.height).data
    const particleCount = Number(canvas.parentElement!.dataset.particleCount)
    if (target.heroPoints?.length !== expected || particleCount !== expected) {
      throw new Error(`Incomplete particle frame at capture: expected ${expected}, scene ${particleCount}, drawn ${target.heroPoints?.length ?? 0}`)
    }
    target.heroPeak = 0
    target.heroPeakDisplacement = 0
    target.heroCapturedDeformation = false
    target.heroReleasedAt = undefined
    target.heroRecoveryMs = undefined
    target.heroReleasedFrame = undefined
    target.heroRecoveryFrames = undefined
    target.heroRecoveryIntervals = []
    target.heroCompletedRenders = []
  }, reference.points.length)
  await page.locator('.home-hero-particles').evaluate(element => new Promise<void>(resolve => {
    const targetFrame = Number((element as HTMLElement).dataset.frameCount) + 12
    const observer = new MutationObserver(check)
    function check() {
      if (Number((element as HTMLElement).dataset.frameCount) < targetFrame) return
      observer.disconnect()
      const target = window as HeroPixelWindow
      const times = target.heroCompletedRenders!
      const intervals = times.slice(1).map((time, index) => time - times[index]!).sort((a, b) => a - b)
      target.heroBaselineP95 = intervals[Math.max(0, Math.ceil(intervals.length * .95) - 1)]
      resolve()
    }
    observer.observe(element, { attributes: true, attributeFilter: ['data-frame-count'] })
    check()
  }))
}

async function changedPixels(page: import('@playwright/test').Page) {
  return page.locator('.home-hero-particles-canvas').evaluate(element => {
    const canvas = element as HTMLCanvasElement
    const baseline = (window as HeroPixelWindow).heroBaseline!
    const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
    let changed = 0
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] !== baseline[i] || data[i + 1] !== baseline[i + 1] || data[i + 2] !== baseline[i + 2] || data[i + 3] !== baseline[i + 3]) changed++
    }
    return changed
  })
}

async function expectRecoveredMark(page: import('@playwright/test').Page) {
  // MiMo deliberately keeps subpixel drift. Compare the complete frame to
  // independently sampled homes, then verify that only current squares remain.
  await expect.poll(() => page.evaluate(() => {
    const target = window as HeroPixelWindow
    const expectedCount = Number(document.querySelector<HTMLElement>('.home-hero-particles')!.dataset.particleCount)
    if (!expectedCount || target.heroPoints?.length !== expectedCount || target.heroHomePoints?.length !== expectedCount) return Infinity
    return Math.max(...target.heroPoints.map((point, index) => Math.hypot(point.x - target.heroHomePoints![index]!.x, point.y - target.heroHomePoints![index]!.y)))
  })).toBeLessThan(.5)
  const noTrails = await page.locator('.home-hero-particles-canvas').evaluate(element => {
    const canvas = element as HTMLCanvasElement
    const target = window as HeroPixelWindow
    const count = Number(canvas.parentElement!.dataset.particleCount)
    if (!count || target.heroPoints?.length !== count || target.heroHomePoints?.length !== count) return false
    const expected = document.createElement('canvas')
    expected.width = canvas.width
    expected.height = canvas.height
    const context = expected.getContext('2d')!
    const ratio = Number(canvas.parentElement!.dataset.pixelRatio)
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    for (const point of target.heroPoints) {
      context.fillStyle = point.color
      context.globalAlpha = point.alpha
      context.fillRect(point.rectX, point.rectY, point.size, point.size)
    }
    const actualPixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
    const expectedPixels = context.getImageData(0, 0, expected.width, expected.height).data
    return actualPixels.every((value, index) => value === expectedPixels[index])
  })
  expect(noTrails, 'canvas contains exactly the current squares without residual pixels').toBe(true)
}

async function peakChangedPixels(page: import('@playwright/test').Page) {
  expect(await page.evaluate(() => (window as HeroPixelWindow).heroPeakDisplacement ?? 0), 'real deformation exceeds idle drift').toBeGreaterThan(1)
  return page.evaluate(() => (window as HeroPixelWindow).heroPeak ?? 0)
}

async function pixelRecoveryMs(page: import('@playwright/test').Page) {
  await expect.poll(() => page.evaluate(() => (window as HeroPixelWindow).heroRecoveryMs)).toBeDefined()
  return page.evaluate(() => (window as HeroPixelWindow).heroRecoveryMs!)
}

async function expectFrameRecovery(page: import('@playwright/test').Page, testInfo: import('@playwright/test').TestInfo) {
  // Wait on actual component draws, rather than a wall-clock physics deadline.
  // The observer independently counts the first complete frame within .5px.
  await page.locator('.home-hero-particles').evaluate(element => new Promise<void>(resolve => {
    const targetFrame = (window as HeroPixelWindow).heroReleasedFrame! + 9
    const observer = new MutationObserver(check)
    function check() {
      if (Number((element as HTMLElement).dataset.frameCount) >= targetFrame) {
        observer.disconnect()
        resolve()
      }
    }
    observer.observe(element, { attributes: true, attributeFilter: ['data-frame-count'] })
    check()
  }))
  const evidence = await page.evaluate(() => {
    const target = window as HeroPixelWindow
    const intervals = [...(target.heroRecoveryIntervals ?? [])].sort((a, b) => a - b)
    const p95 = intervals[Math.max(0, Math.ceil(intervals.length * .95) - 1)] ?? Infinity
    return { frames: target.heroRecoveryFrames, milliseconds: target.heroRecoveryMs, intervals: target.heroRecoveryIntervals,
      p95, baselineP95: target.heroBaselineP95, normalRefresh: (target.heroBaselineP95 ?? Infinity) <= 34 }
  })
  await testInfo.attach('mimo-recovery-observation', { body: JSON.stringify(evidence), contentType: 'application/json' })
  console.log('MIMO_RECOVERY_OBSERVATION', JSON.stringify(evidence))
  expect(evidence.frames, 'independent complete frame recovers within nine actual draws').toBeDefined()
  expect(evidence.frames!).toBeGreaterThan(0)
  expect(evidence.frames!).toBeLessThanOrEqual(9)
  await expect(page.locator('.home-hero-particles')).toHaveAttribute('data-moving-particle-count', '0')
  await expectRecoveredMark(page)
  if (evidence.normalRefresh) expect(await pixelRecoveryMs(page)).toBeLessThanOrEqual(1000)
}

async function frames(page: import('@playwright/test').Page, count = 8) {
  await page.evaluate(count => new Promise<void>(resolve => {
    const frame = () => { if (--count <= 0) resolve(); else requestAnimationFrame(frame) }
    requestAnimationFrame(frame)
  }), count)
}

async function pointerSweep(page: import('@playwright/test').Page, durationMs = 150, pointerType = 'mouse', release = true) {
  await page.locator('.home-hero-particles').evaluate(async (element, options) => {
    const bounds = element.getBoundingClientRect()
    const startedAt = performance.now()
    const dispatch = (type: string, progress: number) => element.dispatchEvent(new PointerEvent(type, {
      bubbles: true, pointerId: 1, pointerType: options.pointerType, isPrimary: true, buttons: 1,
      clientX: bounds.left + bounds.width * (0.2 + progress * 0.6), clientY: bounds.top + bounds.height * 0.46
    }))
    dispatch(options.pointerType === 'touch' ? 'pointerdown' : 'pointermove', 0)
    await new Promise<void>(resolve => {
      const frame = () => {
        const progress = Math.min(1, (performance.now() - startedAt) / options.durationMs)
        dispatch('pointermove', progress)
        if (progress < 1) requestAnimationFrame(frame)
        else {
          if (options.release) {
            const target = window as HeroPixelWindow
            target.heroReleasedAt = performance.now()
            target.heroRecoveryMs = undefined
            target.heroReleasedFrame = Number((element as HTMLElement).dataset.frameCount)
            target.heroRecoveryFrames = undefined
            target.heroRecoveryIntervals = []
            target.heroLastRenderedAt = target.heroReleasedAt
            dispatch(options.pointerType === 'touch' ? 'pointerup' : 'pointerleave', 1)
          }
          resolve()
        }
      }
      requestAnimationFrame(frame)
    })
  }, { durationMs, pointerType, release })
}

const locales = [
  { route: '/', semanticTitle: '你好，我是 Yance 欢迎来到我的世界' },
  { route: '/zh-hk/', semanticTitle: '你好，我是 Yance 歡迎來到我的世界' },
  { route: '/en/', semanticTitle: 'Hi, I’m Yance Welcome to my world' }
] as const

async function waitForSettledHero(page: import('@playwright/test').Page) {
  const hero = page.locator('.home-hero')
  const stage = page.locator('.home-hero-particles')
  await expect(hero).toHaveAttribute('data-intro-state', 'complete', { timeout: 8000 })
  await expect(stage).toHaveAttribute('data-render-mode', 'canvas')
  await expect(stage).toHaveAttribute('data-particle-state', 'settled', { timeout: 8000 })
}

for (const locale of locales) {
  test(`${locale.route} renders the sampled YANCE mark without changing accessible copy`, async ({ page }) => {
    await page.goto(locale.route)
    await waitForSettledHero(page)

    const stage = page.locator('.home-hero-particles')
    await expect(page.locator('h1.home-hero-title')).toHaveAccessibleName(locale.semanticTitle)
    await expect(stage).toHaveAttribute('data-word', 'YANCE')
    await expect(stage).toHaveAttribute('data-grid-step', '2')
    await expect(stage.locator('canvas')).toBeVisible()
    await expect(stage.locator('.home-hero-particles-word')).toHaveCSS('opacity', '0')
    await expect(stage.locator('.home-hero-particles-labels span')).toHaveCount(0)
    await expect(stage.locator('[data-y-mark], [data-butterfly]')).toHaveCount(0)
    await expect(stage.locator('svg text')).toHaveText('YANCE')
    expect(Number(await stage.getAttribute('data-particle-count'))).toBeGreaterThan(100)
    expect(Number(await stage.getAttribute('data-particle-count'))).toBeLessThanOrEqual(12000)
    expect(await stage.getAttribute('data-field-count')).toBeNull()
    expect(await stage.getAttribute('data-ambient-count')).toBeNull()
    const background = await stage.locator('canvas').evaluate(element => {
      const canvas = element as HTMLCanvasElement
      const stage = canvas.closest<HTMLElement>('.home-hero-particles')!
      const bounds = JSON.parse(stage.dataset.inkBounds!) as { left: number; top: number; width: number; height: number }
      const ratio = Number(stage.dataset.pixelRatio)
      const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
      let checked = 0
      let painted = 0
      for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
          // Font ink follows the viewport clamp and 92% measured width cap.
          // Include the dot radius/antialias fringe, then inspect actual pixels
          // throughout the remaining background rather than an arbitrary inset.
          if (x / ratio >= bounds.left - 2 && x / ratio <= bounds.left + bounds.width + 2
            && y / ratio >= bounds.top - 2 && y / ratio <= bounds.top + bounds.height + 2) continue
          checked += 1
          if (pixels[(y * canvas.width + x) * 4 + 3]) painted += 1
        }
      }
      return { checked, painted, total: canvas.width * canvas.height }
    })
    expect(background.checked).toBeGreaterThan(background.total * .25)
    expect(background.painted).toBe(0)
    await expect(page.locator('.home-hero-actions a[href="#selected-work"]')).toBeVisible()
    await expect(page.locator('.home-hero-actions a[href="#home-worlds"]')).toBeVisible()
  })
}

test('keeps the sampled canvas backing store within the high-DPI budget', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 3 })
  })
  await page.goto('/')
  await waitForSettledHero(page)

  const canvas = page.locator('.home-hero-particles-canvas')
  const ratio = await canvas.evaluate((element) => {
    const target = element as HTMLCanvasElement
    return target.width / target.getBoundingClientRect().width
  })
  expect(ratio).toBeGreaterThanOrEqual(1)
  expect(ratio).toBeLessThanOrEqual(2.02)
})

test('keeps the MiMo 2px grid and DPR cap on low-resource devices', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'deviceMemory', { configurable: true, value: 2 })
    Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, value: 8 })
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 3 })
  })
  await page.goto('/')
  await waitForSettledHero(page)

  const stage = page.locator('.home-hero-particles')
  await expect(stage).toHaveAttribute('data-grid-step', '2')
  await expect(stage).toHaveAttribute('data-pixel-ratio', '2')
})

test('@particle-v2 repels particles and returns to the drifting glyph after leaving', async ({ page }) => {
  await page.goto('/')
  await waitForSettledHero(page)
  const stage = page.locator('.home-hero-particles')
  await stage.scrollIntoViewIfNeeded()
  const bounds = await stage.boundingBox()
  expect(bounds).not.toBeNull()
  if (!bounds) return
  await savePixels(page)

  const y = bounds.y + bounds.height * 0.46
  await page.mouse.move(bounds.x + bounds.width * 0.12, y)
  await page.mouse.move(bounds.x + bounds.width * 0.88, y, { steps: 14 })
  await expect.poll(async () => Number(await stage.getAttribute('data-moving-particle-count'))).toBeGreaterThan(0)
  await expect(stage).toHaveAttribute('data-particle-state', 'disturbed')
  expect(await changedPixels(page)).toBeGreaterThan(100)

  await stage.evaluate((element) => {
    const particleStage = element as HTMLElement
    particleStage.addEventListener('pointerleave', () => {
      ;(window as HeroPixelWindow).heroPointerLeaveFrame = Number(particleStage.dataset.frameCount)
    }, { once: true })
  })
  await page.mouse.move(-10, -10)
  const releaseFrame = Number(await page.evaluate(() => (window as HeroPixelWindow).heroPointerLeaveFrame))
  expect(releaseFrame).toBeGreaterThan(0)

  // Recovery is frame-based; WebKit's frame cadence varies under CI load.
  const recovery = await stage.evaluate((element, startFrame) => new Promise<{ state?: string; frames: number; watchdogExpired: boolean }>((resolve) => {
    const particleStage = element as HTMLElement
    const observer = new MutationObserver(check)
    const watchdog = { timer: 0 }
    function finish(watchdogExpired: boolean) {
      if (watchdog.timer) window.clearTimeout(watchdog.timer)
      observer.disconnect()
      resolve({ state: particleStage.dataset.particleState, frames: Number(particleStage.dataset.frameCount) - startFrame, watchdogExpired })
    }
    function check() {
      const state = particleStage.dataset.particleState
      const frames = Number(particleStage.dataset.frameCount) - startFrame
      if (state === 'settled' || frames >= 9) {
        finish(false)
      }
    }
    observer.observe(particleStage, { attributes: true, attributeFilter: ['data-frame-count', 'data-particle-state'] })
    // Fail promptly if rendering stops; the recovery budget itself is frame-based.
    watchdog.timer = window.setTimeout(() => finish(true), 10_000)
    check()
  }), releaseFrame)
  expect(recovery.watchdogExpired).toBe(false)
  expect(recovery.state).toBe('settled')
  expect(recovery.frames).toBeLessThanOrEqual(9)
  await expect(stage).toHaveAttribute('data-moving-particle-count', '0')
  await expectRecoveredMark(page)
})

test('@particle-v2 pauses offscreen and resumes without replaying the intro', async ({ page }) => {
  await page.goto('/')
  await waitForSettledHero(page)
  const stage = page.locator('.home-hero-particles')
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }))
  await expect(stage).toHaveAttribute('data-particle-state', 'paused')

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await expect(stage).toHaveAttribute('data-particle-state', 'settled', { timeout: 5000 })
  await expect(page.locator('.home-hero')).toHaveAttribute('data-intro-state', 'complete')
})

test('@particle-v2 keeps warm-white current squares across themes without resetting the disturbed glyph', async ({ page }) => {
  await page.goto('/')
  await waitForSettledHero(page)
  const stage = page.locator('.home-hero-particles')
  const count = await stage.getAttribute('data-particle-count')
  await savePixels(page)
  await pointerSweep(page, 300, 'mouse', false)
  await expect(stage).toHaveAttribute('data-particle-state', 'disturbed')
  for (const theme of ['dark', 'light', 'dark', 'light']) {
    const continuity = await page.evaluate(async theme => {
      const target = window as HeroPixelWindow
      const before = target.heroPoints!.map(point => [point.x, point.y, point.alpha])
      document.documentElement.setAttribute('data-theme', theme)
      await Promise.resolve()
      return { before, after: target.heroPoints!.map(point => [point.x, point.y, point.alpha]) }
    }, theme)
    expect(continuity.after).toEqual(continuity.before)
    await expect(stage).toHaveAttribute('data-particle-state', 'disturbed')
    await expect(stage).toHaveAttribute('data-particle-count', count ?? '')
    const reference = await stage.evaluate(readMimoReferenceGlyph)
    const pixels = await stage.locator('canvas').evaluate((element, reference) => {
      const canvas = element as HTMLCanvasElement
      const points = (window as HeroPixelWindow).heroPoints!
      const expected = document.createElement('canvas')
      expected.width = canvas.width
      expected.height = canvas.height
      const context = expected.getContext('2d')!
      context.scale(reference.ratio, reference.ratio)
      let nativeColorsMatch = true
      points.forEach((point, index) => {
        context.fillStyle = reference.points[index]!.color
        if (String(context.fillStyle) !== point.color) nativeColorsMatch = false
        context.globalAlpha = point.alpha
        context.fillRect(point.rectX, point.rectY, point.size, point.size)
      })
      const actual = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
      const intended = context.getImageData(0, 0, canvas.width, canvas.height).data
      // Overlapping antialias edges can round channels even when their combined
      // alpha becomes 255. Check native source colors exactly, then all composed
      // pixels against the independent raster. Probe endpoints as solid cells.
      const probe = document.createElement('canvas')
      probe.width = probe.height = 1
      const solid = probe.getContext('2d')!
      const style = getComputedStyle(canvas.parentElement!)
      const endpoints = ['--hero-particle-start', '--hero-particle-end'].map(token => {
        solid.fillStyle = style.getPropertyValue(token).trim()
        solid.fillRect(0, 0, 1, 1)
        return [...solid.getImageData(0, 0, 1, 1).data]
      })
      return { equal: actual.every((value, index) => value === intended[index]), nativeColorsMatch, endpoints, count: points.length }
    }, reference)
    expect(pixels.equal, 'all actual pixels match the independent warm-white palette at current positions').toBe(true)
    expect(pixels.count).toBe(reference.points.length)
    expect(pixels.nativeColorsMatch, 'every native point color matches the independent seed blend exactly').toBe(true)
    expect(pixels.endpoints).toEqual([[244, 240, 232, 255], [220, 231, 219, 255]])
  }
  await stage.dispatchEvent('pointerleave', { pointerType: 'mouse', pointerId: 1 })
  await expectRecoveredMark(page)
})

test('@particle-v2 keeps particle color stable during gathering across themes without changing draw or entrance clock', async ({ page }) => {
  await page.addInitScript(() => {
    type Capture = { first: number[]; color: string; frame: string; phase: string }
    const target = window as Window & { gatheringPalette?: { before: Capture; after: Capture } }
    const nativeGetContext = HTMLCanvasElement.prototype.getContext
    let first: number[] = []
    let color = ''
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: unknown[]) {
      const context = Reflect.apply(nativeGetContext, this, args) as CanvasRenderingContext2D | null
      if (args[0] === '2d' && this.parentElement?.classList.contains('home-hero-particles') && context) {
        const clear = context.clearRect.bind(context)
        const fill = context.fillRect.bind(context)
        context.clearRect = (...bounds) => { first = []; clear(...bounds) }
        context.fillRect = (...bounds) => {
          if (!first.length) { first = bounds; color = String(context.fillStyle) }
          fill(...bounds)
        }
      }
      return context
    } as HTMLCanvasElement['getContext']
    let switching = false
    const observer = new MutationObserver(() => {
      const stage = document.querySelector<HTMLElement>('.home-hero-particles')
      if (switching || stage?.dataset.particleState !== 'gathering' || Number(stage.dataset.frameCount) < 2) return
      switching = true
      const capture = (): Capture => ({ first: [...first], color, frame: stage.dataset.frameCount!, phase: stage.dataset.particleState! })
      const before = capture()
      document.documentElement.setAttribute('data-theme', 'dark')
      queueMicrotask(() => queueMicrotask(() => {
        target.gatheringPalette = { before, after: capture() }
        observer.disconnect()
      }))
    })
    observer.observe(document, { subtree: true, attributes: true, attributeFilter: ['data-frame-count'] })
  })
  await page.goto('/')
  await expect.poll(() => page.evaluate(() => (window as Window & { gatheringPalette?: unknown }).gatheringPalette)).toBeDefined()
  const evidence = await page.evaluate(() => (window as Window & { gatheringPalette?: {
    before: { first: number[]; color: string; frame: string; phase: string }
    after: { first: number[]; color: string; frame: string; phase: string }
  } }).gatheringPalette!)
  expect(evidence.before.first).toHaveLength(4)
  expect(evidence.after.first).toEqual(evidence.before.first)
  expect(evidence.after.frame).toBe(evidence.before.frame)
  expect(evidence.after.phase).toBe('gathering')
  expect(evidence.after.color).toBe(evidence.before.color)
  await waitForSettledHero(page)
})

test('shows a static YANCE mark when reduced motion is requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')

  const stage = page.locator('.home-hero-particles')
  await expect(page.locator('.home-hero')).toHaveAttribute('data-intro-state', 'static')
  await expect(stage).toHaveAttribute('data-render-mode', 'canvas')
  await expect(stage).toHaveAttribute('data-particle-state', 'paused')
  await expect(stage).toHaveAttribute('data-animation-running', 'false')
  await expect(stage.locator('canvas')).toBeVisible()
  await expect(stage.locator('.home-hero-particles-word')).toHaveCSS('opacity', '0')
  await expect(page.locator('h1.home-hero-title')).toHaveAccessibleName(locales[0].semanticTitle)
})

test('keeps a static YANCE mark when data saving is enabled', async ({ page }) => {
  await page.addInitScript(() => {
    const connection = Object.assign(new EventTarget(), { saveData: true })
    Object.defineProperty(navigator, 'connection', { configurable: true, value: connection })
  })
  await page.goto('/')

  const stage = page.locator('.home-hero-particles')
  await expect(page.locator('.home-hero')).toHaveAttribute('data-intro-state', 'static')
  await expect(stage).toHaveAttribute('data-render-mode', 'static')
  await expect(stage.locator('canvas')).toHaveCount(0)
  await expect(stage.locator('.home-hero-particles-word')).toHaveText('YANCE')
  for (const theme of ['dark', 'light']) {
    await page.evaluate(theme => document.documentElement.setAttribute('data-theme', theme), theme)
    await expect(stage.locator('.home-hero-particles-word')).toHaveCSS('color', 'rgb(244, 240, 232)')
  }
})

test('keeps YANCE visible in forced colors', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' })
  await page.goto('/')

  const stage = page.locator('.home-hero-particles')
  await expect(stage).toHaveAttribute('data-render-mode', 'static')
  await expect(stage.locator('.home-hero-particles-word')).toBeVisible()
  await expect(stage.locator('.home-hero-particles-word')).toHaveCSS('color', /rgb\(.+\)/)
})

test('keeps a static YANCE mark when Canvas initialization fails', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: () => null
    })
  })
  await page.goto('/')

  const stage = page.locator('.home-hero-particles')
  await expect(stage).toHaveAttribute('data-render-mode', 'static-fallback')
  await expect(stage.locator('.home-hero-particles-word')).toHaveText('YANCE')
  await expect(stage.locator('.home-hero-particles-word')).toBeVisible()
})

test('keeps the shared sitewide cursor and clear CTA feedback', async ({ page }) => {
  test.skip(!(await page.evaluate(() => window.matchMedia('(hover: hover) and (pointer: fine)').matches)))
  await page.goto('/')
  await waitForSettledHero(page)
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto' })

  const cursor = page.locator('.sitewide-cursor')
  const ring = cursor.locator('.sitewide-cursor-ring')
  await expect(cursor).toHaveCount(1)
  await page.locator('.home-hero-particles').hover({ position: { x: 8, y: 8 } })
  await expect(cursor).toHaveClass(/is-visible/)
  await expect(cursor).toHaveAttribute('data-context', 'particle')

  const action = page.locator('.home-hero-actions a').first()
  await action.hover()
  await expect(cursor).toHaveAttribute('data-context', 'interactive')
  await expect.poll(() => ring.evaluate((element) => element.getBoundingClientRect().width)).toBeCloseTo(80, 1)
  await expect(cursor).toHaveCSS('pointer-events', 'none')
  await page.mouse.move(-1, -1)
  await expect(cursor).toBeHidden()
})

test('keeps touch feedback local to the Hero without adding a custom cursor', async ({ page }) => {
  test.skip(!await page.evaluate(() => window.matchMedia('(pointer: coarse)').matches))
  const stage = page.locator('.home-hero-particles')
  const ripple = page.locator('.home-hero-touch-ripple')
  let releasePhoto!: () => void
  let photoRequestStarted = false
  const photoGate = new Promise<void>((resolve) => { releasePhoto = resolve })
  await page.route('**/assets/images/home-hero/hero-01-*', async (route) => {
    photoRequestStarted = true
    await photoGate
    await route.continue()
  })
  await page.addInitScript(() => {
    const target = window as Window & { heroPhotoReadyAtTouch?: boolean }
    document.addEventListener('pointerdown', (event) => {
      const element = event.target
      if (event.pointerType !== 'touch' || !(element instanceof Element) || !element.closest('.home-hero')) return
      target.heroPhotoReadyAtTouch = document.documentElement.dataset.homeHeroPhotoReady === 'true'
    }, true)
  })

  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect.poll(() => photoRequestStarted).toBe(true)
    await expect(page.locator('.sitewide-cursor')).toHaveCount(0)
    await expect(page.locator('html')).not.toHaveAttribute('data-home-hero-photo-ready', 'true')

    // Touch feedback remains available while the photo-gated runtime is held back.
    await stage.tap()
    await expect.poll(() => page.evaluate(() => (window as Window & { heroPhotoReadyAtTouch?: boolean }).heroPhotoReadyAtTouch)).toBe(false)
    await expect(ripple).toHaveAttribute('data-active', 'true')
  } finally {
    releasePhoto()
  }

  // Verify particle input only after its engine is ready to accept gestures.
  await waitForSettledHero(page)
  await stage.tap()
  await expect(ripple).toHaveAttribute('data-active', 'true')
  await expect(stage).toHaveAttribute('data-last-input', 'touch')
})

test('does not show touch feedback for input outside the Hero', async ({ page }) => {
  test.skip(!await page.evaluate(() => window.matchMedia('(pointer: coarse)').matches))
  await page.goto('/')

  const ripple = page.locator('.home-hero-touch-ripple')
  const footerIdentity = page.getByRole('contentinfo').getByRole('paragraph').first()
  await footerIdentity.scrollIntoViewIfNeeded()
  const originalUrl = page.url()
  // The footer center can be a contact link; use visible noninteractive copy.
  await footerIdentity.tap()
  await expect(page).toHaveURL(originalUrl)
  await expect(ripple).toHaveAttribute('data-active', 'false')
})

for (const locale of locales) {
  test(`${locale.route} preserves immediate semantics, keyboard access and reload intro`, async ({ page }) => {
    await page.goto(locale.route)
    await expect(page.locator('h1.home-hero-title')).toHaveAccessibleName(locale.semanticTitle)
    const action = page.locator('.home-hero-actions a').first()
    await action.focus()
    await expect(action).toBeFocused()
    await expect(page.locator('.home-hero-actions')).toHaveCSS('opacity', '1')
    await waitForSettledHero(page)
    await page.reload()
    await expect(page.locator('.home-hero-typewriter')).toHaveAttribute('aria-hidden', 'true')
    await waitForSettledHero(page)
    await page.goto(`${locale.route}works/`)
    await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
    await expect(page.locator('.page-works')).toBeVisible()
    await page.goBack()
    await expect(page).toHaveURL(new RegExp(`${locale.route}$`))
    await waitForSettledHero(page)
  })
}

test('@particle-v2 returns real squares within nine renders and measures normal-refresh recovery', async ({ page }, testInfo) => {
  await page.goto('/')
  await waitForSettledHero(page)
  await page.locator('.home-hero-particles').scrollIntoViewIfNeeded()
  await savePixels(page)
  await pointerSweep(page)
  expect(await peakChangedPixels(page)).toBeGreaterThan(100)
  await expectFrameRecovery(page, testInfo)
})

test('@particle-v2 retains real deformation evidence after release has fully recovered', async ({ page }, testInfo) => {
  await page.goto('/')
  await waitForSettledHero(page)
  await page.locator('.home-hero-particles').scrollIntoViewIfNeeded()
  await savePixels(page)
  await pointerSweep(page)
  await expectFrameRecovery(page, testInfo)
  expect(await peakChangedPixels(page)).toBeGreaterThan(100)
})

test('@particle-v2 uses frame-based recovery with sparse foreground frames', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const requestFrame = window.requestAnimationFrame.bind(window)
    window.requestAnimationFrame = callback => requestFrame(() => {
      setTimeout(() => callback(performance.now()), 250)
    })
  })
  await page.goto('/')
  await waitForSettledHero(page)
  await page.locator('.home-hero-particles').scrollIntoViewIfNeeded()
  await savePixels(page)
  await pointerSweep(page)
  expect(await peakChangedPixels(page)).toBeGreaterThan(100)
  await expectFrameRecovery(page, testInfo)
})

test('@particle-v2 stops the sampled canvas if a motion preference notification is missed', async ({ page }) => {
  await page.addInitScript(() => {
    const match = window.matchMedia.bind(window)
    window.matchMedia = query => {
      const target = match(query)
      if (query === '(prefers-reduced-motion: reduce)') {
        target.addEventListener = () => {}
      }
      return target
    }
  })
  await page.goto('/')
  await waitForSettledHero(page)
  await page.locator('.home-hero-particles').scrollIntoViewIfNeeded()
  const idleFrames = await page.locator('.home-hero-particles').getAttribute('data-frame-count')
  await frames(page)
  expect(Number(await page.locator('.home-hero-particles').getAttribute('data-frame-count'))).toBeGreaterThan(Number(idleFrames))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true)
  await expect(page.locator('.home-hero-particles')).toHaveAttribute('data-render-mode', 'canvas')
  await expect(page.locator('.home-hero-particles')).toHaveAttribute('data-animation-running', 'false')
  await expect(page.locator('.home-hero-particles canvas')).toBeVisible()
  // The emulated media query can update before Chromium paints its CSS media
  // state. Acknowledge the real CSS change before requesting the opposite state.
  await page.screenshot({ caret: 'initial', timeout: 5000 })
  await expect(page.locator('.home-hero-particles-preference-sentinel')).toHaveCSS('width', '2px')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect(page.locator('.home-hero-particles')).toHaveAttribute('data-render-mode', 'canvas')
  await expect(page.locator('.home-hero-particles')).toHaveAttribute('data-particle-state', 'settled')
})

test('@particle-v2 consumes repeated stirring and returns without residual trails', async ({ page }, testInfo) => {
  await page.goto('/')
  await waitForSettledHero(page)
  await page.locator('.home-hero-particles').scrollIntoViewIfNeeded()
  await savePixels(page)
  for (let i = 0; i < 3; i += 1) await pointerSweep(page, 180)
  expect(await peakChangedPixels(page)).toBeGreaterThan(100)
  await expectFrameRecovery(page, testInfo)
})

test('@particle-v2 continues microdrift frames after the intro and recovery', async ({ page }) => {
  await page.goto('/')
  await waitForSettledHero(page)
  const stage = page.locator('.home-hero-particles')
  const frameCount = await stage.getAttribute('data-frame-count')
  await frames(page)
  expect(Number(await stage.getAttribute('data-frame-count'))).toBeGreaterThan(Number(frameCount))
})

test('@particle-v2 holds a local deformation while continuously drawing microdrift', async ({ page }) => {
  await page.goto('/')
  await waitForSettledHero(page)
  const stage = page.locator('.home-hero-particles')
  await stage.scrollIntoViewIfNeeded()
  await savePixels(page)
  await stage.evaluate(element => {
    const bounds = element.getBoundingClientRect()
    element.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, pointerType: 'mouse',
      clientX: bounds.left + bounds.width * .5, clientY: bounds.top + bounds.height * .5 }))
  })
  await expect(stage).toHaveAttribute('data-particle-state', 'disturbed')
  await expect(stage).toHaveAttribute('data-animation-running', 'true')
  const heldFrames = await stage.getAttribute('data-frame-count')
  const heldPixels = await changedPixels(page)
  expect(heldPixels).toBeGreaterThan(100)
  await frames(page)
  expect(Number(await stage.getAttribute('data-frame-count'))).toBeGreaterThan(Number(heldFrames))
  expect(await changedPixels(page)).toBeGreaterThan(100)
  await stage.evaluate(element => element.dispatchEvent(new PointerEvent('pointerleave', { pointerId: 1, pointerType: 'mouse' })))
  await expect(stage).toHaveAttribute('data-particle-state', /recovering|settled/)
  await expectRecoveredMark(page)
})

test('@particle-v2 resets stale input on visibility and focus restoration', async ({ page }) => {
  await page.goto('/')
  await waitForSettledHero(page)
  await pointerSweep(page)
  const stage = page.locator('.home-hero-particles')
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(stage).toHaveAttribute('data-particle-state', 'paused')
  const pausedFrames = await stage.getAttribute('data-frame-count')
  await frames(page)
  await expect(stage).toHaveAttribute('data-frame-count', pausedFrames!)
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new Event('blur'))
  })
  await expect(stage).toHaveAttribute('data-particle-state', 'paused')
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(stage).toHaveAttribute('data-particle-state', 'settled')
  await expect(stage).toHaveAttribute('data-moving-particle-count', '0')
  await expect(page.locator('.home-hero')).toHaveAttribute('data-intro-state', 'complete')
})

test('@particle-v2 restores interaction after runtime motion preference changes without retyping', async ({ page }) => {
  await page.goto('/')
  await waitForSettledHero(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const stage = page.locator('.home-hero-particles')
  await expect(stage).toHaveAttribute('data-render-mode', 'canvas')
  await expect(stage).toHaveAttribute('data-animation-running', 'false')
  await expect(stage.locator('canvas')).toBeVisible()
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect(stage).toHaveAttribute('data-render-mode', 'canvas')
  await expect(stage).toHaveAttribute('data-particle-state', 'settled')
  await expect(page.locator('.home-hero-typewriter')).toHaveAttribute('data-final-state', 'true')
  await pointerSweep(page)
  await expect.poll(async () => Number(await stage.getAttribute('data-peak-active'))).toBeGreaterThan(0)
})

test('@particle-v2 keeps SVG geometry and restored canvas correct across resize', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const stage = page.locator('.home-hero-particles')
  const before = await stage.locator('svg').getAttribute('viewBox')
  await page.setViewportSize({ width: 430, height: 932 })
  await expect(stage.locator('svg')).not.toHaveAttribute('viewBox', before!)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect(stage).toHaveAttribute('data-render-mode', 'canvas')
  await expect(stage).toHaveAttribute('data-particle-state', 'settled')
  await page.setViewportSize({ width: 844, height: 390 })
  await expect.poll(() => stage.locator('canvas').evaluate(element => {
    const canvas = element as HTMLCanvasElement
    return Math.abs(canvas.width / Number(canvas.parentElement!.dataset.pixelRatio) - Math.floor(canvas.getBoundingClientRect().width))
  })).toBeLessThanOrEqual(1)
})

test('@particle-v2 recovers interaction after forced colors are disabled', async ({ page }) => {
  await page.goto('/')
  await waitForSettledHero(page)
  await page.emulateMedia({ forcedColors: 'active' })
  const stage = page.locator('.home-hero-particles')
  await expect(stage).toHaveAttribute('data-render-mode', 'static')
  await expect(stage.locator('svg')).toBeVisible()
  await page.emulateMedia({ forcedColors: 'none' })
  await expect(stage).toHaveAttribute('data-render-mode', 'canvas')
  await pointerSweep(page)
  await expect.poll(async () => Number(await stage.getAttribute('data-peak-active'))).toBeGreaterThan(0)
})

test('@particle-v2 uses an independent static mark if Canvas readback fails', async ({ page }) => {
  await page.addInitScript(() => {
    CanvasRenderingContext2D.prototype.getImageData = () => { throw new Error('Readback blocked') }
  })
  await page.goto('/')
  const stage = page.locator('.home-hero-particles')
  await expect(stage).toHaveAttribute('data-render-mode', 'static-fallback')
  await expect(stage.locator('svg')).toBeVisible()
  await expect(stage.locator('svg text')).toHaveText('YANCE')
  await page.setViewportSize({ width: 320, height: 844 })
  await expect(stage.locator('svg')).toHaveAttribute('viewBox', /^0 0 \d+ 298$/)
})

test('@particle-v2 consumes one touch stream and cancels multi-touch without connecting fingers', async ({ page }) => {
  await page.goto('/')
  await waitForSettledHero(page)
  const stage = page.locator('.home-hero-particles')
  await stage.scrollIntoViewIfNeeded()
  await savePixels(page)
  // Inspect the active stream before release can finish recovering between RPCs.
  await pointerSweep(page, 150, 'touch', false)
  expect(await changedPixels(page)).toBeGreaterThan(100)
  await stage.evaluate(element => {
    const bounds = element.getBoundingClientRect()
    const send = (type: string, id: number, progress: number) => element.dispatchEvent(new PointerEvent(type, {
      bubbles: true, pointerId: id, pointerType: 'touch', buttons: 1,
      clientX: bounds.left + bounds.width * progress, clientY: bounds.top + bounds.height * 0.46
    }))
    send('pointerdown', 2, 0.2)
    send('pointerdown', 3, 0.8)
    send('pointermove', 2, 0.8)
    send('pointercancel', 2, 0.8)
    send('pointercancel', 3, 0.8)
  })
  await expect(stage).toHaveAttribute('data-moving-particle-count', '0', { timeout: 2000 })
  await expect(stage).toHaveCSS('touch-action', 'pan-y pinch-zoom')
  await expectRecoveredMark(page)
})

test('@particle-v2 consumes live input when RAF timestamps lag behind the event clock', async ({ page, isMobile }) => {
  await page.setViewportSize({ width: isMobile ? 390 : 1440, height: 1100 })
  await page.addInitScript(() => {
    const requestFrame = window.requestAnimationFrame.bind(window)
    window.requestAnimationFrame = callback => requestFrame(() => callback(performance.now() - 300))
  })
  await page.goto('/')
  await waitForSettledHero(page)
  const stage = page.locator('.home-hero-particles')
  await stage.evaluate(element => {
    const bounds = element.getBoundingClientRect()
    element.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, pointerType: 'mouse',
      clientX: bounds.left + bounds.width * 0.5, clientY: bounds.top + bounds.height * 0.46 }))
  })
  await frames(page, 2)
  expect(Number(await stage.getAttribute('data-peak-candidates'))).toBeGreaterThan(0)
  await expect(stage).toHaveAttribute('data-particle-state', 'disturbed')
  await stage.evaluate(element => element.dispatchEvent(new PointerEvent('pointerleave', { pointerId: 1, pointerType: 'mouse' })))
  await expect(stage).toHaveAttribute('data-moving-particle-count', '0', { timeout: 1500 })
})

test('@particle-v2 preserves fresh input measured after a queued scroll', async ({ page, isMobile }) => {
  await page.setViewportSize({ width: isMobile ? 390 : 1440, height: 1100 })
  await page.goto('/')
  await waitForSettledHero(page)
  const stage = page.locator('.home-hero-particles')
  await stage.evaluate(element => {
    const bounds = element.getBoundingClientRect()
    element.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, pointerType: 'mouse',
      clientX: bounds.left + bounds.width * 0.5, clientY: bounds.top + bounds.height * 0.46 }))
    // WebKit may deliver scroll after the input has measured the final bounds.
    document.dispatchEvent(new Event('scroll'))
  })
  await expect(stage).toHaveAttribute('data-particle-state', 'disturbed')
  expect(Number(await stage.getAttribute('data-peak-candidates'))).toBeGreaterThan(0)
})

test('@particle-v2 cancels stale input when scrolling changes the stage geometry', async ({ page, isMobile }) => {
  await page.setViewportSize({ width: isMobile ? 390 : 1440, height: 1100 })
  await page.goto('/')
  await waitForSettledHero(page)
  // Native keyboard focus suspends proximity so this test can measure a real
  // geometry change. Snap behavior itself belongs to home-scroll-motion.
  await page.locator('.theme-orbit').focus()
  await expect(page.locator('html')).toHaveCSS('scroll-snap-type', 'none')
  const stage = page.locator('.home-hero-particles')
  const top = await stage.evaluate(element => {
    const bounds = element.getBoundingClientRect()
    element.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, pointerType: 'mouse',
      clientX: bounds.left + bounds.width * 0.5, clientY: bounds.top + bounds.height * 0.46 }))
    return bounds.top
  })
  await expect(stage).toHaveAttribute('data-particle-state', 'disturbed')
  await page.evaluate(() => scrollBy({ top: 80, behavior: 'instant' }))
  await expect.poll(() => stage.evaluate(element => element.getBoundingClientRect().top)).not.toBe(top)
  await expect(stage).toHaveAttribute('data-particle-state', /recovering|settled/)
  await expect(stage).toHaveAttribute('data-moving-particle-count', '0', { timeout: 1500 })
})

test('@particle-v2 draws the static glyph on blur even when animation callbacks stop arriving', async ({ page }) => {
  await page.addInitScript(() => {
    const requestFrame = window.requestAnimationFrame.bind(window)
    window.requestAnimationFrame = callback => requestFrame(time => {
      if (!(window as Window & { stopHeroFrames?: boolean }).stopHeroFrames) callback(time)
    })
  })
  await page.goto('/')
  await waitForSettledHero(page)
  const stage = page.locator('.home-hero-particles')
  await stage.scrollIntoViewIfNeeded()
  await savePixels(page)
  await stage.evaluate(element => {
    const bounds = element.getBoundingClientRect()
    element.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, pointerType: 'mouse',
      clientX: bounds.left + bounds.width * 0.5, clientY: bounds.top + bounds.height * 0.46 }))
  })
  await expect(stage).toHaveAttribute('data-particle-state', 'disturbed')
  expect(await changedPixels(page)).toBeGreaterThan(100)
  await stage.evaluate(element => {
    const target = window as Window & { stopHeroFrames?: boolean }
    target.stopHeroFrames = true
    element.dispatchEvent(new PointerEvent('pointerleave', { pointerId: 1, pointerType: 'mouse' }))
    window.dispatchEvent(new Event('blur'))
  })
  await expect(stage).toHaveAttribute('data-particle-state', 'paused')
  await expect(stage).toHaveAttribute('data-moving-particle-count', '0')
  expect(await changedPixels(page)).toBeGreaterThan(0)
  expect(await stage.locator('canvas').evaluate(element => (element as HTMLCanvasElement).getContext('2d')!.getImageData(0, 0, (element as HTMLCanvasElement).width, (element as HTMLCanvasElement).height).data.some((value, index) => index % 4 === 3 && value > 0))).toBe(true)
})

test('@particle-v2 preserves a disturbance across the intro deadline', async ({ page, isMobile }) => {
  await page.setViewportSize({ width: isMobile ? 390 : 1440, height: 1100 })
  // Observe and inject in the browser before host round trips can miss the intro.
  await page.addInitScript(() => {
    const target = window as HeroIntroWindow
    const requestFrame = requestAnimationFrame.bind(window)
    window.requestAnimationFrame = callback => requestFrame(time => {
      const previous = target.heroIntroCurrentFrameTime
      target.heroIntroCurrentFrameTime = time
      try { callback(time) }
      finally { target.heroIntroCurrentFrameTime = previous }
    })
    const getContext = HTMLCanvasElement.prototype.getContext
    const observed = new WeakSet<CanvasRenderingContext2D>()
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: unknown[]) {
      const context = Reflect.apply(getContext, this, args) as CanvasRenderingContext2D | null
      if (args[0] === '2d' && this.parentElement?.classList.contains('home-hero-particles') && context && !observed.has(context)) {
        observed.add(context)
        const clear = context.clearRect.bind(context)
        const element = this.parentElement
        context.clearRect = (...bounds) => {
          if (target.heroIntroCurrentFrameTime !== undefined) target.heroIntroDraw = {
            time: target.heroIntroCurrentFrameTime, frame: Number(element.dataset.frameCount) + 1
          }
          clear(...bounds)
        }
      }
      return context
    } as HTMLCanvasElement['getContext']
    let sentPhase: string | undefined
    let injectedAt = 0
    const observer = new MutationObserver(() => {
      const stage = document.querySelector<HTMLElement>('.home-hero-particles')
      if (stage?.dataset.renderMode !== 'canvas') return
      if (sentPhase) {
        if (stage.dataset.lastInput === 'mouse') {
          target.heroIntroInput = { phase: sentPhase, accepted: true, injectedAt }
          observer.disconnect()
        }
        return
      }
      if (stage.dataset.particleState !== 'gathering' || Number(stage.dataset.frameCount) < 1) return
      sentPhase = stage.dataset.particleState
      injectedAt = performance.now()
      const bounds = stage.getBoundingClientRect()
      stage.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, pointerType: 'mouse',
        clientX: bounds.left + bounds.width * 0.5, clientY: bounds.top + bounds.height * 0.46 }))
    })
    observer.observe(document, { childList: true, subtree: true, attributes: true,
      attributeFilter: ['data-render-mode', 'data-particle-state', 'data-frame-count', 'data-last-input'] })
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.home-hero-particles')
  await expect(stage).toHaveAttribute('data-render-mode', 'canvas')
  await expect.poll(() => page.evaluate(() =>
    (window as HeroIntroWindow).heroIntroInput
  )).toMatchObject({ phase: 'gathering', accepted: true })
  // The user selected MiMo's actual RAF clock, including sparse frame delivery.
  // Observe a component draw after the original 1600ms + 420ms upper bound.
  await stage.evaluate(element => new Promise<void>(resolve => {
    const target = window as HeroIntroWindow
    const observer = new MutationObserver(check)
    function check() {
      if (target.heroIntroDraw?.frame === Number((element as HTMLElement).dataset.frameCount)
        && target.heroIntroDraw.time >= target.heroIntroInput!.injectedAt + 2020) {
        observer.disconnect()
        resolve()
      }
    }
    observer.observe(element, { attributes: true, attributeFilter: ['data-frame-count'] })
    check()
  }))
  await expect.poll(() => stage.getAttribute('data-particle-state'), { timeout: 2500, intervals: [50, 100] }).toBe('disturbed')
  expect(Number(await stage.getAttribute('data-moving-particle-count'))).toBeGreaterThan(0)
  expect(Number(await stage.getAttribute('data-peak-candidates'))).toBeGreaterThan(0)
  const releaseFrame = Number(await stage.getAttribute('data-frame-count'))
  await stage.evaluate(element => element.dispatchEvent(new PointerEvent('pointerleave', { pointerId: 1, pointerType: 'mouse' })))
  // MiMo blends once per actual render. This seam test verifies input through
  // the entrance; the independent pixel test measures normal-refresh wall time.
  await expect.poll(async () => Number(await stage.getAttribute('data-frame-count'))).toBeGreaterThanOrEqual(releaseFrame + 9)
  await expect(stage).toHaveAttribute('data-particle-state', 'settled', { timeout: 1500 })
})

test('@particle-v2 initializes after a zero-sized stage becomes visible', async ({ page }) => {
  await page.route('**/', async route => {
    if (route.request().resourceType() !== 'document') { await route.continue(); return }
    const response = await route.fetch()
    await route.fulfill({ response, body: (await response.text()).replace('</head>', '<style id="zero-hero">.home-hero-particles{width:0!important;height:0!important;min-height:0!important;border:0!important}</style></head>') })
  })
  await page.goto('/')
  const stage = page.locator('.home-hero-particles')
  await page.waitForFunction(() => document.documentElement.dataset.homeHeroPhotoReady === 'true')
  await expect(stage).toHaveAttribute('data-render-mode', 'static')
  await page.evaluate(() => document.getElementById('zero-hero')!.remove())
  await expect(stage).toHaveAttribute('data-render-mode', 'canvas')
  await expect(stage).toHaveAttribute('data-particle-state', 'settled', { timeout: 4000 })
  expect(Number(await stage.getAttribute('data-particle-count'))).toBeGreaterThan(100)
})

test('@particle-v2 starts a full gathering after delayed display-font readiness', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 1300 })
  await page.addInitScript(() => {
    const load = document.fonts.load.bind(document.fonts)
    let finish: (() => void) | undefined
    const ready = new Promise<void>(resolve => { finish = resolve })
    const target = window as Window & { finishHeroFont?: () => void }
    target.finishHeroFont = finish
    document.fonts.load = async (...args) => { await ready; return load(...args) }
  })
  await page.goto('/')
  const stage = page.locator('.home-hero-particles')
  await expect(stage).toHaveAttribute('data-render-mode', 'initializing')
  await expect(page.locator('.home-hero')).toHaveAttribute('data-intro-state', 'complete')
  expect(await stage.locator('svg text').evaluate(element => {
    const text = element as SVGTextElement
    const ink = text.getBBox()
    const view = text.ownerSVGElement!.viewBox.baseVal
    return ink.x >= 0 && ink.y >= 0 && ink.x + ink.width <= view.width && ink.y + ink.height <= view.height
  })).toBe(true)
  await page.evaluate(() => (window as Window & { finishHeroFont?: () => void }).finishHeroFont!())
  await expect(stage).toHaveAttribute('data-render-mode', 'canvas')
  await expect(stage).toHaveAttribute('data-particle-state', 'gathering')
  const initialMovingCount = Number(await stage.getAttribute('data-moving-particle-count'))
  expect(initialMovingCount).toBeGreaterThan(100)
  // This case covers completion of the time-based gather. Other cases verify
  // final per-frame convergence to settled, which varies with mobile refresh.
  await expect(stage).toHaveAttribute('data-particle-state', /recovering|settled/)
  expect(Number(await stage.getAttribute('data-moving-particle-count'))).toBeLessThan(initialMovingCount)
})

test('@particle-v2 waits for the bundled Amiri face when font matching initially returns empty', async ({ page }) => {
  await page.addInitScript(() => {
    const nativeLoad = document.fonts.load.bind(document.fonts)
    document.fonts.load = (font, text) => text === 'YANCE' ? Promise.resolve([]) : nativeLoad(font, text)
    const NativeFontFace = window.FontFace
    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    const target = window as Window & { releaseHeroFace?: () => void; heroFaceRequested?: boolean }
    target.releaseHeroFace = release
    window.FontFace = class extends NativeFontFace {
      async load() {
        target.heroFaceRequested = true
        await gate
        return super.load()
      }
    }
  })
  await page.goto('/')
  const stage = page.locator('.home-hero-particles')
  await expect.poll(() => page.evaluate(() => (window as Window & { heroFaceRequested?: boolean }).heroFaceRequested)).toBe(true)
  await expect(stage).toHaveAttribute('data-render-mode', 'initializing')
  await page.evaluate(() => (window as Window & { releaseHeroFace?: () => void }).releaseHeroFace!())
  await expect(stage).toHaveAttribute('data-render-mode', 'canvas')
  const reference = await stage.evaluate(readMimoReferenceGlyph)
  expect(reference.points).toHaveLength(Number(await stage.getAttribute('data-particle-count')))
})

test('@particle-v2 clears a continuously drawn held shape when scrolling changes geometry', async ({ page }) => {
  await page.goto('/')
  await waitForSettledHero(page)
  // Native proximity can keep a small scroll at the current snap position.
  // Keyboard navigation yields snapping so this case actually changes geometry.
  await page.keyboard.press('Home')
  await expect(page.locator('html')).not.toHaveClass(/home-scroll-snap/)
  const stage = page.locator('.home-hero-particles')
  await stage.scrollIntoViewIfNeeded()
  await savePixels(page)
  const bounds = await stage.boundingBox()
  await page.mouse.move(bounds!.x + bounds!.width * .5, bounds!.y + bounds!.height * .5)
  await expect(stage).toHaveAttribute('data-particle-state', 'disturbed')
  await expect(stage).toHaveAttribute('data-animation-running', 'true')
  expect(await changedPixels(page)).toBeGreaterThan(100)
  await frames(page)
  const previousTop = await stage.evaluate(element => element.getBoundingClientRect().top)
  await page.evaluate(() => scrollBy({ top: 40, behavior: 'instant' }))
  await expect.poll(() => stage.evaluate(element => element.getBoundingClientRect().top)).toBeLessThan(previousTop - 1)
  await expect(stage).toHaveAttribute('data-particle-state', 'settled', { timeout: 1000 })
  await expectRecoveredMark(page)
})

test('@particle-v2 recovers when a second stationary finger cancels the active touch', async ({ page }) => {
  await page.goto('/')
  await waitForSettledHero(page)
  const stage = page.locator('.home-hero-particles')
  await stage.scrollIntoViewIfNeeded()
  await savePixels(page)
  const touchDown = (id: number) => stage.evaluate((element, id) => {
    const bounds = element.getBoundingClientRect()
    element.dispatchEvent(new PointerEvent('pointerdown', { pointerId: id, pointerType: 'touch', isPrimary: id === 1,
      clientX: bounds.left + bounds.width * .5, clientY: bounds.top + bounds.height * .5 }))
  }, id)
  await touchDown(1)
  await expect(stage).toHaveAttribute('data-particle-state', 'disturbed')
  await expect(stage).toHaveAttribute('data-animation-running', 'true')
  expect(await changedPixels(page)).toBeGreaterThan(100)
  await touchDown(2)
  await expect(stage).toHaveAttribute('data-particle-state', 'settled', { timeout: 1000 })
  await expectRecoveredMark(page)
})

test('@particle-v2 keeps native touch scrolling available on the particle card', async ({ page, context, browserName, isMobile }) => {
  test.skip(browserName !== 'chromium' || !isMobile, 'Native touch gesture injection is Chromium-specific; other projects cover pointer cancellation and touch state')
  await page.goto('/')
  await waitForSettledHero(page)
  const stage = page.locator('.home-hero-particles')
  await stage.scrollIntoViewIfNeeded()
  const bounds = await stage.boundingBox()
  expect(bounds).not.toBeNull()
  const before = await page.evaluate(() => scrollY)
  const session = await context.newCDPSession(page)
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x: bounds!.x + bounds!.width * 0.5, y: bounds!.y + bounds!.height * 0.8 }] })
  for (let i = 1; i <= 12; i += 1) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, x: bounds!.x + bounds!.width * 0.5, y: bounds!.y + bounds!.height * (0.8 - i * 0.055) }] })
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before)
  await expect(stage).toHaveAttribute('data-moving-particle-count', '0', { timeout: 2000 })
})
