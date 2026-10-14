import { expect, test } from '@playwright/test'
import { readMimoReferenceGlyph } from './helpers/mimo-reference'

type HeroPoint = { x: number; y: number; rectX: number; rectY: number; size: number; color: string; alpha: number }
type HeroPixelWindow = Window & {
  heroBaseline?: Uint8ClampedArray
  heroHomePoints?: { x: number; y: number }[]
  heroPoints?: HeroPoint[]
  heroPeak?: number
  heroPeakDisplacement?: number
  heroReleasedAt?: number
  heroRecoveryMs?: number
  heroObservedCanvas?: HTMLCanvasElement
  heroCapturedDeformation?: boolean
}

async function savePixels(page: import('@playwright/test').Page) {
  const reference = await page.locator('.home-hero-particles').evaluate(readMimoReferenceGlyph)
  expect(reference.points.length).toBeGreaterThan(0)
  await page.locator('.home-hero-particles-canvas').evaluate(async (element, reference) => {
    const canvas = element as HTMLCanvasElement
    const target = window as HeroPixelWindow
    const context = canvas.getContext('2d')!
    target.heroHomePoints = reference.points
    if (target.heroObservedCanvas !== canvas) {
      target.heroObservedCanvas = canvas
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
        }
      }
    }
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    target.heroBaseline = context.getImageData(0, 0, canvas.width, canvas.height).data
    if (target.heroPoints?.length !== reference.points.length || reference.points.length !== Number(canvas.parentElement!.dataset.particleCount)) throw new Error('Incomplete particle frame at capture')
    target.heroPeak = 0
    target.heroPeakDisplacement = 0
    target.heroCapturedDeformation = false
    target.heroReleasedAt = undefined
    target.heroRecoveryMs = undefined
  }, reference)
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
    expect(Number(await stage.getAttribute('data-particle-count'))).toBeLessThanOrEqual(5200)
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

  await page.mouse.move(-10, -10)
  await expect(stage).toHaveAttribute('data-particle-state', 'settled', { timeout: 1500 })
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

test('@particle-v2 preserves the fixed MiMo palette when the site theme changes', async ({ page }) => {
  await page.goto('/')
  await waitForSettledHero(page)
  const stage = page.locator('.home-hero-particles')
  const count = await stage.getAttribute('data-particle-count')
  await savePixels(page)
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(stage).toHaveAttribute('data-particle-state', 'settled')
  await expect(stage).toHaveAttribute('data-particle-count', count ?? '')
  await expectRecoveredMark(page)
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
  await page.goto('/')

  await expect(page.locator('.sitewide-cursor')).toHaveCount(0)
  await page.locator('.home-hero-particles').tap()
  await expect(page.locator('.home-hero-touch-ripple')).toHaveAttribute('data-active', 'true')
  await expect(page.locator('.home-hero-particles')).toHaveAttribute('data-last-input', 'touch')
})

test('does not show touch feedback for input outside the Hero', async ({ page }) => {
  test.skip(!await page.evaluate(() => window.matchMedia('(pointer: coarse)').matches))
  await page.goto('/')

  const ripple = page.locator('.home-hero-touch-ripple')
  const footer = page.locator('footer')
  await footer.scrollIntoViewIfNeeded()
  const point = await footer.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }
  })
  await page.touchscreen.tap(point.x, point.y)
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

test('@particle-v2 returns the real squares to the drifting glyph within the standard 1s target', async ({ page }) => {
  await page.goto('/')
  await waitForSettledHero(page)
  await page.locator('.home-hero-particles').scrollIntoViewIfNeeded()
  await savePixels(page)
  await pointerSweep(page)
  expect(await peakChangedPixels(page)).toBeGreaterThan(100)
  await expect(page.locator('.home-hero-particles')).toHaveAttribute('data-moving-particle-count', '0', { timeout: 1000 })
  await expectRecoveredMark(page)
  expect(await pixelRecoveryMs(page)).toBeLessThanOrEqual(1000)
})

test('@particle-v2 retains real deformation evidence after release has fully recovered', async ({ page }) => {
  await page.goto('/')
  await waitForSettledHero(page)
  await page.locator('.home-hero-particles').scrollIntoViewIfNeeded()
  await savePixels(page)
  await pointerSweep(page)
  await expect(page.locator('.home-hero-particles')).toHaveAttribute('data-moving-particle-count', '0', { timeout: 1000 })
  await expectRecoveredMark(page)
  expect(await peakChangedPixels(page)).toBeGreaterThan(100)
})

test('@particle-v2 uses frame-based recovery with sparse foreground frames', async ({ page }) => {
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
  await frames(page, 8)
  await expect(page.locator('.home-hero-particles')).toHaveAttribute('data-moving-particle-count', '0')
  await expectRecoveredMark(page)
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

test('@particle-v2 consumes repeated stirring and returns without residual trails', async ({ page }) => {
  await page.goto('/')
  await waitForSettledHero(page)
  await page.locator('.home-hero-particles').scrollIntoViewIfNeeded()
  await savePixels(page)
  for (let i = 0; i < 3; i += 1) await pointerSweep(page, 180)
  expect(await peakChangedPixels(page)).toBeGreaterThan(100)
  await expect(page.locator('.home-hero-particles')).toHaveAttribute('data-moving-particle-count', '0', { timeout: 2000 })
  await expectRecoveredMark(page)
  expect(await pixelRecoveryMs(page)).toBeLessThanOrEqual(2000)
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
  await expect(stage).toHaveAttribute('data-particle-state', 'settled', { timeout: 1000 })
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
    const target = window as Window & { heroIntroInput?: { phase: string, accepted: boolean } }
    let sentPhase: string | undefined
    const observer = new MutationObserver(() => {
      const stage = document.querySelector<HTMLElement>('.home-hero-particles')
      if (stage?.dataset.renderMode !== 'canvas') return
      if (sentPhase) {
        if (stage.dataset.lastInput === 'mouse') {
          target.heroIntroInput = { phase: sentPhase, accepted: true }
          observer.disconnect()
        }
        return
      }
      if (stage.dataset.particleState !== 'gathering' || Number(stage.dataset.frameCount) < 1) return
      sentPhase = stage.dataset.particleState
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
    (window as Window & { heroIntroInput?: { phase: string, accepted: boolean } }).heroIntroInput
  )).toEqual({ phase: 'gathering', accepted: true })
  // Sample within the existing deadline: coarse locator polling can miss the
  // observed entrance transition near the end of the original 2.5s window.
  await expect.poll(() => stage.getAttribute('data-particle-state'), { timeout: 2500, intervals: [50, 100] }).toBe('disturbed')
  expect(Number(await stage.getAttribute('data-moving-particle-count'))).toBeGreaterThan(0)
  expect(Number(await stage.getAttribute('data-peak-candidates'))).toBeGreaterThan(0)
  const releaseFrame = Number(await stage.getAttribute('data-frame-count'))
  await stage.evaluate(element => element.dispatchEvent(new PointerEvent('pointerleave', { pointerId: 1, pointerType: 'mouse' })))
  // MiMo blends once per actual render. This seam test verifies input through
  // the entrance; the independent real-pixel test retains the 1s recovery gate.
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
  await expect(stage).toHaveAttribute('data-render-mode', 'initializing')
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
  expect(Number(await stage.getAttribute('data-moving-particle-count'))).toBeGreaterThan(100)
  await expect(stage).toHaveAttribute('data-particle-state', 'settled', { timeout: 2500 })
})

test('@particle-v2 clears a continuously drawn held shape when scrolling changes geometry', async ({ page }) => {
  await page.goto('/')
  await waitForSettledHero(page)
  const stage = page.locator('.home-hero-particles')
  await stage.scrollIntoViewIfNeeded()
  await savePixels(page)
  const bounds = await stage.boundingBox()
  await page.mouse.move(bounds!.x + bounds!.width * .5, bounds!.y + bounds!.height * .5)
  await expect(stage).toHaveAttribute('data-particle-state', 'disturbed')
  await expect(stage).toHaveAttribute('data-animation-running', 'true')
  expect(await changedPixels(page)).toBeGreaterThan(100)
  await frames(page)
  await page.evaluate(() => scrollBy(0, 40))
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
