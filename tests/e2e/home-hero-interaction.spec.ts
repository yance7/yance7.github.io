import { expect, test, type Page } from '@playwright/test'

type HomeHeroIntroFrame = {
  introState: string | null
  finalState: string | null
  greetingAnimationName: string
  greetingAnimationDuration: string
  statementAnimationName: string
  statementAnimationDuration: string
  statementAnimationDelay: string
}

async function observeHomeHeroIntro(page: Page) {
  await page.addInitScript(() => {
    const history: HomeHeroIntroFrame[] = []
    Object.defineProperty(window, '__homeHeroIntroHistory', { configurable: true, value: history })

    function recordHomeHero(node: Node) {
      if (!(node instanceof Element)) return

      const hero = node.matches('.home-hero') ? node : node.closest('.home-hero')
      const heroes = hero ? [hero] : Array.from(node.querySelectorAll('.home-hero'))

      heroes.forEach((element) => {
        const typewriter = element.querySelector('.home-hero-typewriter')
        const greeting = element.querySelector('.home-hero-typewriter-line-greeting')
        const statement = element.querySelector('.home-hero-typewriter-line-statement')
        const frame = {
          introState: element.getAttribute('data-intro-state'),
          finalState: typewriter?.getAttribute('data-final-state') ?? null,
          greetingAnimationName: greeting ? getComputedStyle(greeting).animationName : '',
          greetingAnimationDuration: greeting ? getComputedStyle(greeting).animationDuration : '',
          statementAnimationName: statement ? getComputedStyle(statement).animationName : '',
          statementAnimationDuration: statement ? getComputedStyle(statement).animationDuration : '',
          statementAnimationDelay: statement ? getComputedStyle(statement).animationDelay : ''
        }

        if (JSON.stringify(history.at(-1)) !== JSON.stringify(frame)) history.push(frame)
      })
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes') recordHomeHero(mutation.target)
        mutation.addedNodes.forEach(recordHomeHero)
      })
    })

    observer.observe(document, {
      attributes: true,
      attributeFilter: ['data-intro-state', 'data-final-state'],
      childList: true,
      subtree: true
    })
  })
}

async function expectHomeHeroIntroFrame(page: Page, expected: Partial<HomeHeroIntroFrame>) {
  await expect.poll(() => page.evaluate(() => (
    (window as Window & { __homeHeroIntroHistory?: HomeHeroIntroFrame[] }).__homeHeroIntroHistory ?? []
  ))).toContainEqual(expect.objectContaining(expected))
}

const activeTypingFrame: Partial<HomeHeroIntroFrame> = {
  introState: 'typing',
  finalState: 'false',
  greetingAnimationName: 'home-hero-line-reveal',
  greetingAnimationDuration: '0.72s',
  statementAnimationName: 'home-hero-line-reveal',
  statementAnimationDuration: '1.5s',
  statementAnimationDelay: '0.88s'
}

const locales = [
  { route: '/', title: '你好，我是 Yance 研究、构建，与现场相遇' },
  { route: '/zh-hk/', title: '你好，我是 Yance 研究、建構，與現場相遇' },
  { route: '/en/', title: 'Hi, I’m Yance Research, build, and meet the live world' }
] as const

for (const locale of locales) {
  test(`${locale.route} types the first-visit copy without delaying semantics or keyboard access`, async ({ page }) => {
    await observeHomeHeroIntro(page)
    await page.goto(locale.route)
    await expectHomeHeroIntroFrame(page, activeTypingFrame)

    const hero = page.locator('.home-hero')
    const typewriter = page.locator('.home-hero-typewriter')
    const title = page.locator('h1.home-hero-title')
    const firstAction = page.locator('.home-hero-actions a').first()

    await expect(typewriter).toHaveAttribute('aria-hidden', 'true')
    await expect(title).toHaveAccessibleName(locale.title)
    await expect(firstAction).toBeVisible()
    await firstAction.focus()
    await expect(firstAction).toBeFocused()
    await expect(page.locator('.home-hero-actions')).toHaveCSS('opacity', '1')
    await expect(hero).toHaveAttribute('data-intro-state', 'complete', { timeout: 4000 })
    await expect(typewriter).toHaveAttribute('data-final-state', 'true')
  })
}

for (const locale of locales) {
  test(`${locale.route} replays the intro after reload and same-tab return`, async ({ page }) => {
    await observeHomeHeroIntro(page)
    await page.goto(locale.route)
    await expectHomeHeroIntroFrame(page, activeTypingFrame)
    const canvas = page.locator('.home-hero-particles-canvas')
    await expect(canvas).toBeVisible()
    await expect(page.locator('.home-hero')).toHaveAttribute('data-intro-state', 'complete', { timeout: 4000 })
    await expect(canvas).toHaveAttribute('data-particle-state', 'settled', { timeout: 4000 })

    await page.reload()
    await expectHomeHeroIntroFrame(page, activeTypingFrame)
    await expect(canvas).toBeVisible()
    await expect(page.locator('.home-hero')).toHaveAttribute('data-intro-state', 'complete', { timeout: 4000 })
    await expect(canvas).toHaveAttribute('data-particle-state', 'settled', { timeout: 4000 })

    await page.goto('/research/')
    await page.goto(locale.route)
    await expectHomeHeroIntroFrame(page, activeTypingFrame)
  })
}

test('shows the final Hero state when reduced motion is requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')

  await expect(page.locator('.home-hero')).toHaveAttribute('data-intro-state', 'static')
  await expect(page.locator('.home-hero-typewriter')).toHaveAttribute('data-final-state', 'true')
  await expect(page.locator('.home-hero-particles-canvas')).toHaveCount(0)
  await expect(page.locator('.home-hero-particles-mark')).toBeVisible()
  await expect(page.locator('h1.home-hero-title')).toHaveAccessibleName('你好，我是 Yance 研究、构建，与现场相遇')
  await expect(page.locator('.home-hero-actions a')).toHaveCount(2)
})

test('keeps the Hero static when the browser requests data saving', async ({ page }) => {
  await page.addInitScript(() => {
    const connection = Object.assign(new EventTarget(), { saveData: true })
    Object.defineProperty(navigator, 'connection', { configurable: true, value: connection })
  })
  await page.goto('/')

  await expect(page.locator('.home-hero')).toHaveAttribute('data-intro-state', 'static')
  await expect(page.locator('.home-hero-particles-canvas')).toHaveCount(0)
  await expect(page.locator('.home-hero-particles-mark')).toBeVisible()
  await expect(page.locator('.home-hero-typewriter')).toHaveAttribute('data-final-state', 'true')
  await expect(page.locator('h1.home-hero-title')).toHaveAccessibleName('你好，我是 Yance 研究、构建，与现场相遇')
  await expect(page.locator('.home-hero-actions a')).toHaveCount(2)
})

test('uses a bounded Canvas particle field and pauses it when the Hero leaves view', async ({ page }) => {
  await page.goto('/')

  const canvas = page.locator('.home-hero-particles-canvas')
  await expect(canvas).toBeVisible()
  await canvas.scrollIntoViewIfNeeded()
  await expect(canvas).toHaveAttribute('data-particle-state', /gathering|settled/)
  const particleCount = Number(await canvas.getAttribute('data-particle-count'))
  const mobile = await page.evaluate(() => window.matchMedia('(pointer: coarse)').matches)
  expect(particleCount).toBeGreaterThan(0)
  expect(particleCount).toBeLessThanOrEqual(mobile ? 1000 : 1900)
  const pixelRatio = await canvas.evaluate((element) => (
    (element as HTMLCanvasElement).width / element.getBoundingClientRect().width
  ))
  expect(pixelRatio).toBeLessThanOrEqual(2.02)
  await expect(canvas).toHaveAttribute('data-particle-state', 'settled', { timeout: 4000 })

  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }))
  await expect(canvas).toHaveAttribute('data-particle-state', 'paused')
})

test('keeps a sharp but bounded Canvas backing store on high-DPI displays', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 3 })
  })
  await page.goto('/')

  const canvas = page.locator('.home-hero-particles-canvas')
  await expect(canvas).toBeVisible()
  await expect(canvas).toHaveAttribute('data-particle-state', 'settled', { timeout: 4000 })

  const pixelRatio = await canvas.evaluate((element) => (
    (element as HTMLCanvasElement).width / element.getBoundingClientRect().width
  ))
  expect(pixelRatio).toBeGreaterThanOrEqual(1)
  expect(pixelRatio).toBeLessThanOrEqual(2.02)
})

test('redistributes particles under a fine pointer and lets them settle after it leaves', async ({ page }) => {
  test.skip(!(await page.evaluate(() => window.matchMedia('(hover: hover) and (pointer: fine)').matches)))
  await page.goto('/')

  const canvas = page.locator('.home-hero-particles-canvas')
  await expect(canvas).toHaveAttribute('data-particle-state', 'settled', { timeout: 4000 })
  await canvas.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    window.scrollBy({ top: bounds.top + bounds.height / 2 - window.innerHeight / 2, behavior: 'instant' })
  })
  await expect(canvas).toHaveAttribute('data-particle-state', 'settled', { timeout: 4000 })
  const readCanvasGrid = () => canvas.evaluate((element) => {
    const target = element as HTMLCanvasElement
    const context = target.getContext('2d')!
    const pixels = context.getImageData(0, 0, target.width, target.height).data
    const gridSize = 96
    const grid = new Uint16Array(gridSize * gridSize)
    for (let y = 0; y < target.height; y += 2) {
      for (let x = 0; x < target.width; x += 2) {
        if (!pixels[(y * target.width + x) * 4 + 3]) continue
        const gridX = Math.min(gridSize - 1, Math.floor(x * gridSize / target.width))
        const gridY = Math.min(gridSize - 1, Math.floor(y * gridSize / target.height))
        const gridIndex = gridY * gridSize + gridX
        grid[gridIndex] = (grid[gridIndex] ?? 0) + 1
      }
    }
    return Array.from(grid)
  })
  const pixelDistance = (first: number[], second: number[]) => first.reduce(
    (distance, value, index) => distance + Math.abs(value - (second[index] ?? 0)),
    0
  )
  const baseline = await readCanvasGrid()
  const bounds = await canvas.boundingBox()
  expect(bounds).not.toBeNull()

  await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2)
  await expect.poll(async () => pixelDistance(baseline, await readCanvasGrid())).toBeGreaterThan(0)
  const disturbed = await readCanvasGrid()
  const disturbedDistance = pixelDistance(baseline, disturbed)

  await page.mouse.move(bounds!.x + bounds!.width + 24, bounds!.y + bounds!.height + 24)
  await expect.poll(
    async () => pixelDistance(baseline, await readCanvasGrid()),
    { timeout: 4000 }
  ).toBeLessThan(disturbedDistance * 0.2)
})

test('resumes particle drawing when the hidden page becomes visible', async ({ page }) => {
  await page.goto('/')
  const canvas = page.locator('.home-hero-particles-canvas')
  await expect(canvas).toBeVisible()
  await expect(page.locator('.home-hero-particles')).toHaveAttribute('data-render-mode', 'canvas')
  await expect(canvas).toHaveAttribute('data-particle-state', 'settled', { timeout: 4000 })

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

test('samples the centered vector Y and keeps the three stage labels as crisp DOM text', async ({ page }) => {
  await page.goto('/')
  const stage = page.locator('.home-hero-particles')
  const mark = stage.locator('.home-hero-particles-mark')
  const canvas = stage.locator('.home-hero-particles-canvas')
  const labels = stage.locator('.home-hero-particles-labels')

  await expect(stage).toHaveAttribute('data-render-mode', 'canvas', { timeout: 4000 })
  await expect(canvas).toHaveAttribute('data-particle-state', 'settled', { timeout: 4000 })
  await expect(mark).toHaveAttribute('data-mark-source', 'vector')
  await expect(mark.locator('path')).toHaveCount(3)
  await expect(mark.locator('[data-y-branch="right"]')).toHaveAttribute('transform', 'translate(220 0) scale(-1 1)')
  await expect(canvas).toHaveAttribute('data-target-source', 'vector-path')
  await expect(stage.locator('img')).toHaveCount(0)
  await expect(labels.locator('span')).toHaveText(['RESEARCH', 'BUILD', 'LIVE'])
  await expect(labels).toHaveCSS('opacity', '1')

  const layout = await labels.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    const stageBounds = element.parentElement!.getBoundingClientRect()
    return {
      fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
      contained: bounds.left >= stageBounds.left && bounds.right <= stageBounds.right &&
        bounds.top >= stageBounds.top && bounds.bottom <= stageBounds.bottom
    }
  })
  expect(layout.fontSize).toBeGreaterThanOrEqual(9)
  expect(layout.contained).toBe(true)
})

test('keeps the static brand visual when Canvas initialization fails', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: () => null
    })
  })
  await page.goto('/')

  await expect(page.locator('.home-hero-particles')).toHaveAttribute('data-render-mode', 'static-fallback')
  await expect(page.locator('.home-hero-particles-mark')).toBeVisible()
  await expect(page.locator('.home-hero-actions a')).toHaveCount(2)
})

test('keeps the static vector and labels when Path2D is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'Path2D', {
      configurable: true,
      value: class {
        constructor() {
          throw new Error('SVG path support is unavailable')
        }
      }
    })
  })
  await page.goto('/')

  const particles = page.locator('.home-hero-particles')
  await expect(particles).toHaveAttribute('data-render-mode', 'static-fallback')
  await expect(page.locator('.home-hero-particles-mark')).toBeVisible()
  await expect(page.locator('.home-hero-particles-labels')).toBeVisible()
  await expect(page.locator('.home-hero-particles-labels span')).toHaveText(['RESEARCH', 'BUILD', 'LIVE'])
  await expect(page.locator('h1.home-hero-title')).toHaveAccessibleName('你好，我是 Yance 研究、构建，与现场相遇')
  await expect(page.locator('.home-hero-actions a')).toHaveCount(2)
})

test('uses an 80px hover ring only inside the fine-pointer Hero', async ({ page }) => {
  test.skip(!(await page.evaluate(() => window.matchMedia('(hover: hover) and (pointer: fine)').matches)))
  await page.goto('/')
  await expect(page.locator('.home-hero')).toHaveAttribute('data-intro-state', 'complete', { timeout: 5000 })
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto' })

  const cursor = page.locator('.home-hero-pointer')
  await expect(cursor).toHaveCount(1)
  await page.locator('.home-hero').hover()
  await expect(cursor).toHaveCSS('opacity', '1')
  expect(await cursor.evaluate((element) => element.getBoundingClientRect().width)).toBe(32)
  const action = page.locator('.home-hero-actions a').first()
  await action.hover()
  await expect.poll(() => action.evaluate((element) => element.matches(':hover'))).toBe(true)
  await expect.poll(() => cursor.evaluate((element) => element.getBoundingClientRect().width)).toBe(80)
  await expect(cursor).toHaveCSS('pointer-events', 'none')
  await page.locator('header').hover()
  await expect(cursor).toHaveCSS('opacity', '0')
})

test('updates the hover ring when scrolling changes the element under a stationary pointer', async ({ page }) => {
  test.skip(!(await page.evaluate(() => window.matchMedia('(hover: hover) and (pointer: fine)').matches)))
  await page.goto('/')
  await expect(page.locator('.home-hero')).toHaveAttribute('data-intro-state', 'complete', { timeout: 5000 })

  const cursor = page.locator('.home-hero-pointer')
  await expect(cursor).toHaveCount(1)
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
  await page.goto('/')

  await expect(page.locator('.home-hero-pointer')).toHaveCount(0)
  await page.locator('.home-hero-particles').tap()
  await expect(page.locator('.home-hero-touch-ripple')).toHaveAttribute('data-active', 'true')
  await expect(page.locator('.home-hero-particles-canvas')).toHaveAttribute('data-last-input', 'touch')
})

test('does not trigger a touch ripple for input outside the Hero', async ({ page }) => {
  test.skip(!await page.evaluate(() => window.matchMedia('(pointer: coarse)').matches))
  await page.goto('/')

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
