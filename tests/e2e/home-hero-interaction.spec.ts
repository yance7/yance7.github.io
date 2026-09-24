import { expect, test } from '@playwright/test'

const locales = [
  { route: '/index.html', title: '你好，我是 Yance 研究、构建，与现场相遇' },
  { route: '/zh-hk/index.html', title: '你好，我是 Yance 研究、建構，與現場相遇' },
  { route: '/en/', title: 'Hi, I’m Yance Research, build, and meet the live world' }
] as const

for (const locale of locales) {
  test(`${locale.route} types the first-visit copy without delaying semantics or keyboard access`, async ({ page }) => {
    await page.goto(locale.route)

    const hero = page.locator('.home-hero')
    const typewriter = page.locator('.home-hero-typewriter')
    const firstLine = typewriter.locator('.home-hero-typewriter-line').first()
    const secondLine = typewriter.locator('.home-hero-typewriter-line').nth(1)
    const title = page.locator('h1.home-hero-title')
    const firstAction = page.locator('.home-hero-actions a').first()

    await expect(hero).toHaveAttribute('data-intro-state', 'typing')
    await expect(typewriter).toHaveAttribute('aria-hidden', 'true')
    await expect(typewriter).toHaveAttribute('data-final-state', 'false')
    await expect(firstLine).toHaveCSS('animation-name', 'home-hero-line-reveal')
    await expect(firstLine).toHaveCSS('animation-duration', '0.72s')
    await expect(secondLine).toHaveCSS('animation-name', 'home-hero-line-reveal')
    await expect(secondLine).toHaveCSS('animation-duration', '1.5s')
    await expect(secondLine).toHaveCSS('animation-delay', '0.88s')
    await expect(title).toHaveAccessibleName(locale.title)
    await expect(firstAction).toBeVisible()
    await firstAction.focus()
    await expect(firstAction).toBeFocused()
    await expect(hero).toHaveAttribute('data-intro-state', 'complete', { timeout: 4000 })
    await expect(typewriter).toHaveAttribute('data-final-state', 'true')
  })
}

test('replays the intro in a new tab while a same-tab return stays final', async ({ context, page }) => {
  await page.goto('/index.html')
  await expect(page.locator('.home-hero')).toHaveAttribute('data-intro-state', 'typing')
  await expect(page.locator('.home-hero')).toHaveAttribute('data-intro-state', 'complete', { timeout: 4000 })

  await page.goto('/research.html')
  await page.goto('/index.html')
  await expect(page.locator('.home-hero')).toHaveAttribute('data-intro-state', 'static')

  const newTab = await context.newPage()
  await newTab.goto('/index.html')
  await expect(newTab.locator('.home-hero')).toHaveAttribute('data-intro-state', 'typing')
  await newTab.close()
})

test('shows the final Hero state when reduced motion is requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/index.html')

  await expect(page.locator('.home-hero')).toHaveAttribute('data-intro-state', 'static')
  await expect(page.locator('.home-hero-typewriter')).toHaveAttribute('data-final-state', 'true')
  await expect(page.locator('.home-hero-particles-canvas')).toHaveCount(0)
  await expect(page.locator('.home-hero-particles-mark')).toBeVisible()
})

test('keeps the Hero static when the browser requests data saving', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true } })
  })
  await page.goto('/index.html')

  await expect(page.locator('.home-hero')).toHaveAttribute('data-intro-state', 'static')
  await expect(page.locator('.home-hero-particles-canvas')).toHaveCount(0)
})

test('uses a bounded Canvas particle field and pauses it when the Hero leaves view', async ({ page }) => {
  await page.goto('/index.html')

  const canvas = page.locator('.home-hero-particles-canvas')
  await expect(canvas).toBeVisible()
  await canvas.scrollIntoViewIfNeeded()
  await expect(canvas).toHaveAttribute('data-particle-state', /gathering|settled/)
  const particleCount = Number(await canvas.getAttribute('data-particle-count'))
  const mobile = await page.evaluate(() => window.matchMedia('(pointer: coarse)').matches)
  expect(particleCount).toBeGreaterThan(0)
  expect(particleCount).toBeLessThanOrEqual(mobile ? 1400 : 3200)
  const pixelRatio = await canvas.evaluate((element) => (
    (element as HTMLCanvasElement).width / element.getBoundingClientRect().width
  ))
  expect(pixelRatio).toBeLessThanOrEqual(1.52)
  await expect(canvas).toHaveAttribute('data-particle-state', 'settled', { timeout: 4000 })

  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }))
  await expect(canvas).toHaveAttribute('data-particle-state', 'paused')
})

test('resumes particle drawing when the hidden page becomes visible', async ({ page }) => {
  await page.goto('/index.html')
  const canvas = page.locator('.home-hero-particles-canvas')
  await expect(canvas).toBeVisible()

  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(canvas).toHaveAttribute('data-particle-state', 'paused')

  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(canvas).toHaveAttribute('data-particle-state', /gathering|settled/)
})

test('keeps the static brand visual when Canvas initialization fails', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: () => null
    })
  })
  await page.goto('/index.html')

  await expect(page.locator('.home-hero-particles')).toHaveAttribute('data-render-mode', 'static-fallback')
  await expect(page.locator('.home-hero-particles-mark')).toBeVisible()
  await expect(page.locator('.home-hero-actions a')).toHaveCount(2)
})

test('uses an 80px hover ring only inside the fine-pointer Hero', async ({ page }) => {
  test.skip(!(await page.evaluate(() => window.matchMedia('(hover: hover) and (pointer: fine)').matches)))
  await page.goto('/index.html')

  const cursor = page.locator('.home-hero-pointer')
  await page.locator('.home-hero').hover()
  await expect(cursor).toHaveCSS('opacity', '1')
  expect(await cursor.evaluate((element) => element.getBoundingClientRect().width)).toBe(32)
  await page.locator('.home-hero-actions a').first().hover()
  await expect.poll(() => cursor.evaluate((element) => element.getBoundingClientRect().width)).toBe(80)
  await expect(cursor).toHaveCSS('pointer-events', 'none')
  await page.locator('header').hover()
  await expect(cursor).toHaveCSS('opacity', '0')
})

test('updates the hover ring when scrolling changes the element under a stationary pointer', async ({ page }) => {
  test.skip(!(await page.evaluate(() => window.matchMedia('(hover: hover) and (pointer: fine)').matches)))
  await page.addInitScript(() => sessionStorage.setItem('yance-home-hero-intro-v1', 'played'))
  await page.goto('/index.html')

  const cursor = page.locator('.home-hero-pointer')
  const action = page.locator('.home-hero-actions a').first()
  const point = await action.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }
  })

  await page.mouse.move(point.x, point.y)
  await expect.poll(() => cursor.evaluate((element) => element.getBoundingClientRect().width)).toBe(80)
  await page.evaluate(() => window.scrollBy({ top: 100, behavior: 'instant' }))

  await expect.poll(() => page.evaluate(({ x, y }) => {
    const hero = document.querySelector('.home-hero')
    const target = document.elementFromPoint(x, y)
    return Boolean(hero && target && hero.contains(target) && !target.closest('a, button, [role="button"], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])'))
  }, point)).toBe(true)
  await expect.poll(() => cursor.evaluate((element) => element.getBoundingClientRect().width)).toBe(32)
})

test('uses a touch ripple without creating a custom pointer on coarse devices', async ({ page }) => {
  test.skip(!await page.evaluate(() => window.matchMedia('(pointer: coarse)').matches))
  await page.goto('/index.html')

  await expect(page.locator('.home-hero-pointer')).toHaveCount(0)
  await page.locator('.home-hero-particles').tap()
  await expect(page.locator('.home-hero-touch-ripple')).toHaveAttribute('data-active', 'true')
  await expect(page.locator('.home-hero-particles-canvas')).toHaveAttribute('data-last-input', 'touch')
})

test('does not trigger a touch ripple for input outside the Hero', async ({ page }) => {
  test.skip(!await page.evaluate(() => window.matchMedia('(pointer: coarse)').matches))
  await page.goto('/index.html')

  const ripple = page.locator('.home-hero-touch-ripple')
  const footer = page.locator('footer')
  await footer.scrollIntoViewIfNeeded()
  const point = await footer.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }
  })
  const targetIsInsideHero = await page.evaluate(({ x, y }) => {
    const hero = document.querySelector('.home-hero')
    const target = document.elementFromPoint(x, y)
    return Boolean(hero && target && hero.contains(target))
  }, point)
  expect(targetIsInsideHero).toBe(false)
  await page.touchscreen.tap(point.x, point.y)

  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())))
  expect(await ripple.getAttribute('data-active')).toBe('false')
})
