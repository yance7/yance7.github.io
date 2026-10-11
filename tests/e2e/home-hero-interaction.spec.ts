import { expect, test } from '@playwright/test'

async function savePixels(page: import('@playwright/test').Page) {
  await page.locator('.home-hero-particles-canvas').evaluate(element => {
    const canvas = element as HTMLCanvasElement
    const target = window as Window & { heroBaseline?: Uint8ClampedArray }
    target.heroBaseline = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
  })
}

async function changedPixels(page: import('@playwright/test').Page) {
  return page.locator('.home-hero-particles-canvas').evaluate(element => {
    const canvas = element as HTMLCanvasElement
    const baseline = (window as Window & { heroBaseline?: Uint8ClampedArray }).heroBaseline!
    const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
    let changed = 0
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] !== baseline[i] || data[i + 1] !== baseline[i + 1] || data[i + 2] !== baseline[i + 2] || data[i + 3] !== baseline[i + 3]) changed += 1
    }
    return changed
  })
}

async function frames(page: import('@playwright/test').Page, count = 8) {
  await page.evaluate(count => new Promise<void>(resolve => {
    const frame = () => { if (--count <= 0) resolve(); else requestAnimationFrame(frame) }
    requestAnimationFrame(frame)
  }), count)
}

async function pointerSweep(page: import('@playwright/test').Page, durationMs = 150, pointerType = 'mouse') {
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
        else { dispatch(options.pointerType === 'touch' ? 'pointerup' : 'pointerleave', 1); resolve() }
      }
      requestAnimationFrame(frame)
    })
  }, { durationMs, pointerType })
}

const locales = [
  { route: '/', semanticTitle: '你好，我是 Yance 研究、构建，与现场相遇' },
  { route: '/zh-hk/', semanticTitle: '你好，我是 Yance 研究、建構，與現場相遇' },
  { route: '/en/', semanticTitle: 'Hi, I’m Yance Research, build, and meet the live world' }
] as const

async function waitForSettledHero(page: import('@playwright/test').Page) {
  const hero = page.locator('.home-hero')
  const stage = page.locator('.home-hero-particles')
  await expect(hero).toHaveAttribute('data-intro-state', 'complete', { timeout: 8000 })
  await expect(stage).toHaveAttribute('data-render-mode', 'canvas')
  await expect(stage).toHaveAttribute('data-particle-state', 'settled', { timeout: 8000 })
  await expect(stage).toHaveAttribute('data-ambient-count', '0')
}

for (const locale of locales) {
  test(`${locale.route} renders the sampled YANCE mark without changing accessible copy`, async ({ page }) => {
    await page.goto(locale.route)
    await waitForSettledHero(page)

    const stage = page.locator('.home-hero-particles')
    await expect(page.locator('h1.home-hero-title')).toHaveAccessibleName(locale.semanticTitle)
    await expect(stage).toHaveAttribute('data-word', 'YANCE')
    await expect(stage).toHaveAttribute('data-grid-step', '5')
    await expect(stage.locator('canvas')).toBeVisible()
    await expect(stage.locator('.home-hero-particles-word')).toHaveCSS('opacity', '0')
    await expect(stage.locator('.home-hero-particles-labels span')).toHaveText(['RESEARCH', 'BUILD', 'LIVE'])
    await expect(stage.locator('[data-y-mark], [data-butterfly]')).toHaveCount(0)
    await expect(stage.locator('svg text')).toHaveText('YANCE')
    expect(Number(await stage.getAttribute('data-particle-count'))).toBeGreaterThan(100)
    expect(Number(await stage.getAttribute('data-particle-count'))).toBeLessThan(2600)
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

test('uses a larger particle step and bounded backing store on low-resource devices', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'deviceMemory', { configurable: true, value: 2 })
    Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, value: 8 })
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 3 })
  })
  await page.goto('/')
  await waitForSettledHero(page)

  const stage = page.locator('.home-hero-particles')
  await expect(stage).toHaveAttribute('data-grid-step', '6')
  await expect(stage).toHaveAttribute('data-pixel-ratio', '1.25')
})

test('@particle-v2 sweeps particles away and restores exact pixels after leaving', async ({ page }) => {
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
  await expect(stage).toHaveAttribute('data-ambient-count', '0')
  expect(await changedPixels(page)).toBe(0)
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

test('@particle-v2 rebuilds actual canvas pixels when the site theme changes', async ({ page }) => {
  await page.goto('/')
  await waitForSettledHero(page)
  const stage = page.locator('.home-hero-particles')
  const count = await stage.getAttribute('data-particle-count')
  await savePixels(page)
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(stage).toHaveAttribute('data-particle-state', 'settled')
  await expect(stage).toHaveAttribute('data-particle-count', count ?? '')
  await expect.poll(() => changedPixels(page)).toBeGreaterThan(100)
})

test('shows a static YANCE mark when reduced motion is requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')

  const stage = page.locator('.home-hero-particles')
  await expect(page.locator('.home-hero')).toHaveAttribute('data-intro-state', 'static')
  await expect(stage).toHaveAttribute('data-render-mode', 'static')
  await expect(stage.locator('canvas')).toHaveCount(0)
  await expect(stage.locator('.home-hero-particles-word')).toHaveText('YANCE')
  await expect(stage.locator('.home-hero-particles-word')).toBeVisible()
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
  await expect.poll(() => ring.evaluate((element) => element.getBoundingClientRect().width)).toBe(52)
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
    await page.goto('/works.html')
    await page.goBack()
    await waitForSettledHero(page)
  })
}

test('@particle-v2 restores real pixels within the standard 1.5s recovery budget', async ({ page }) => {
  await page.goto('/')
  await waitForSettledHero(page)
  await page.locator('.home-hero-particles').scrollIntoViewIfNeeded()
  await savePixels(page)
  await pointerSweep(page)
  expect(await changedPixels(page)).toBeGreaterThan(100)
  await expect(page.locator('.home-hero-particles')).toHaveAttribute('data-moving-particle-count', '0', { timeout: 1500 })
  await expect(page.locator('.home-hero-particles')).toHaveAttribute('data-ambient-count', '0')
  expect(await changedPixels(page)).toBe(0)
})

test('@particle-v2 preserves the standard recovery budget with sparse foreground frames', async ({ page }) => {
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
  expect(await changedPixels(page)).toBeGreaterThan(100)
  await expect(page.locator('.home-hero-particles')).toHaveAttribute('data-moving-particle-count', '0', { timeout: 1500 })
  await expect(page.locator('.home-hero-particles')).toHaveAttribute('data-ambient-count', '0')
  expect(await changedPixels(page)).toBe(0)
})

test('@particle-v2 enters the static fallback if a motion preference notification is missed', async ({ page }) => {
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
  await pointerSweep(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true)
  await expect(page.locator('.home-hero-particles')).toHaveAttribute('data-render-mode', 'static')
  await expect(page.locator('.home-hero-particles svg')).toBeVisible()
})

test('@particle-v2 consumes repeated stirring and returns without residual trails', async ({ page }) => {
  await page.goto('/')
  await waitForSettledHero(page)
  await page.locator('.home-hero-particles').scrollIntoViewIfNeeded()
  await savePixels(page)
  for (let i = 0; i < 3; i += 1) await pointerSweep(page, 180)
  expect(await changedPixels(page)).toBeGreaterThan(100)
  await expect(page.locator('.home-hero-particles')).toHaveAttribute('data-moving-particle-count', '0', { timeout: 2000 })
  await expect(page.locator('.home-hero-particles')).toHaveAttribute('data-ambient-count', '0')
  expect(await changedPixels(page)).toBe(0)
})

test('@particle-v2 stops component frames after the intro and finite ambient window', async ({ page }) => {
  await page.goto('/')
  await waitForSettledHero(page)
  const stage = page.locator('.home-hero-particles')
  const frameCount = await stage.getAttribute('data-frame-count')
  await frames(page)
  await expect(stage).toHaveAttribute('data-frame-count', frameCount!)
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
  await expect(stage).toHaveAttribute('data-render-mode', 'static')
  await expect(stage.locator('canvas')).toHaveCount(0)
  await expect(stage.locator('svg text')).toHaveText('YANCE')
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
  await pointerSweep(page, 150, 'touch')
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
  await expect(stage).toHaveAttribute('data-ambient-count', '0')
  expect(await changedPixels(page)).toBe(0)
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

test('@particle-v2 preserves a disturbance across the intro deadline', async ({ page, isMobile }) => {
  await page.setViewportSize({ width: isMobile ? 390 : 1440, height: 1100 })
  // Observe the intro before waiting for unrelated page assets to finish.
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.home-hero-particles')
  await expect(stage).toHaveAttribute('data-render-mode', 'canvas')
  await expect(stage).toHaveAttribute('data-particle-state', 'gathering')
  await stage.evaluate(element => {
    const bounds = element.getBoundingClientRect()
    element.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, pointerType: 'mouse',
      clientX: bounds.left + bounds.width * 0.5, clientY: bounds.top + bounds.height * 0.46 }))
  })
  await expect(stage).toHaveAttribute('data-particle-state', 'disturbed', { timeout: 2500 })
  expect(Number(await stage.getAttribute('data-moving-particle-count'))).toBeGreaterThan(0)
  await stage.evaluate(element => element.dispatchEvent(new PointerEvent('pointerleave', { pointerId: 1, pointerType: 'mouse' })))
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
