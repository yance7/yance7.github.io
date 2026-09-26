import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  createHomeHeroParticleScene,
  getHomeHeroMotionEasing,
  type HomeHeroParticleTarget
} from '../../src/utils/homeHeroParticles'

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

async function countCanvasPixels(canvas: Locator, region: { x: number; y: number; radius: number }) {
  return canvas.evaluate((element, bounds) => {
    const target = element as HTMLCanvasElement
    const rect = target.getBoundingClientRect()
    const ratio = target.width / rect.width
    const left = Math.max(0, Math.floor((bounds.x - bounds.radius) * ratio))
    const top = Math.max(0, Math.floor((bounds.y - bounds.radius) * ratio))
    const right = Math.min(target.width, Math.ceil((bounds.x + bounds.radius) * ratio))
    const bottom = Math.min(target.height, Math.ceil((bounds.y + bounds.radius) * ratio))
    const pixels = target.getContext('2d')!.getImageData(left, top, right - left, bottom - top).data
    let count = 0
    for (let index = 3; index < pixels.length; index += 4) {
      if (pixels[index]) count += 1
    }
    return count
  }, region)
}

async function installFrameTimestampOffset(page: Page) {
  await page.addInitScript(() => {
    const target = window as Window & { __homeHeroFrameOffsetMs?: number }
    target.__homeHeroFrameOffsetMs = 0
    const requestFrame = window.requestAnimationFrame.bind(window)
    window.requestAnimationFrame = (callback) => requestFrame((timestamp) => {
      callback(timestamp + (target.__homeHeroFrameOffsetMs ?? 0))
    })
  })
}

function findClippedParticleSource(
  points: readonly HomeHeroParticleTarget[],
  width: number,
  height: number,
  gridStep: number,
  particleRadiusRatio: number
) {
  const pointerRadius = gridStep * 6.5
  const maxDisplacement = gridStep * 0.8
  const margin = gridStep * particleRadiusRatio + 2
  const easing = getHomeHeroMotionEasing(120)

  for (let pointerY = gridStep / 2; pointerY < height; pointerY += gridStep / 2) {
    for (let pointerX = gridStep / 2; pointerX < width; pointerX += gridStep / 2) {
      const displacedPoints: Array<{ point: HomeHeroParticleTarget; x: number; y: number }> = []
      for (const point of points) {
        let deltaX = point.x - pointerX
        let deltaY = point.y - pointerY
        let distance = Math.hypot(deltaX, deltaY)
        if (distance >= pointerRadius) continue
        if (distance < 0.1) {
          deltaX = point.x - width / 2 || 1
          deltaY = point.y - height / 2 || 1
          distance = Math.hypot(deltaX, deltaY)
        }
        if (distance >= pointerRadius) continue

        const force = (1 - distance / pointerRadius) ** 2
        const targetX = deltaX / distance * maxDisplacement * force
        const targetY = deltaY / distance * maxDisplacement * force
        const offsetX = targetX * easing
        const offsetY = targetY * easing
        const moving = Math.abs(targetX - offsetX) > 0.12 || Math.abs(targetY - offsetY) > 0.12
        const displaced = Math.abs(offsetX) > 0.12 || Math.abs(offsetY) > 0.12
        if (moving || displaced) {
          displacedPoints.push({ point, x: point.x + offsetX, y: point.y + offsetY })
        }
      }

      if (!displacedPoints.length) continue
      const left = Math.min(...displacedPoints.map(({ x }) => x - margin))
      const right = Math.max(...displacedPoints.map(({ x }) => x + margin))
      const top = Math.min(...displacedPoints.map(({ y }) => y - margin))
      const bottom = Math.max(...displacedPoints.map(({ y }) => y + margin))
      for (const { point } of displacedPoints) {
        const gap = Math.max(left - point.x, point.x - right, top - point.y, point.y - bottom, 0)
        if (gap > 0) return { pointer: { x: pointerX, y: pointerY }, point, gap }
      }
    }
  }

  return null
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

test('rebuilds the reduced-motion SVG geometry after the viewport resizes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')

  const stage = page.locator('.home-hero-particles')
  const mark = stage.locator('.home-hero-particles-mark')
  await page.setViewportSize({ width: 390, height: 844 })

  await expect.poll(() => stage.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    const svg = element.querySelector('svg')!
    const viewBox = svg.getAttribute('viewBox')!.split(' ').map(Number)
    return {
      gridStep: Number(element.getAttribute('data-grid-step')),
      viewBoxMatchesStage: viewBox[2] === Math.floor(bounds.width)
        && viewBox[3] === Math.floor(bounds.height)
    }
  })).toEqual(expect.objectContaining({ gridStep: 8, viewBoxMatchesStage: true }))
  await expect(mark.locator('[data-y-mark]')).toBeVisible()
})

test('rebuilds the static fallback SVG geometry after the viewport resizes', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: () => null
    })
  })
  await page.goto('/')

  const stage = page.locator('.home-hero-particles')
  const mark = stage.locator('.home-hero-particles-mark')
  await expect(stage).toHaveAttribute('data-render-mode', 'static-fallback')
  await page.setViewportSize({ width: 390, height: 844 })

  await expect.poll(() => stage.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    const viewBox = element.querySelector('svg')!.getAttribute('viewBox')!.split(' ').map(Number)
    return viewBox[2] === Math.floor(bounds.width) && viewBox[3] === Math.floor(bounds.height)
  })).toBe(true)
  await expect(stage).toHaveAttribute('data-grid-step', '8')
  await expect(mark.locator('[data-y-mark]')).toBeVisible()
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

test('lets Y dots respond to a central pointer and settle after it leaves', async ({ page }) => {
  test.skip(!(await page.evaluate(() => window.matchMedia('(hover: hover) and (pointer: fine)').matches)))
  await page.addInitScript(() => {
    const clearRect = CanvasRenderingContext2D.prototype.clearRect
    const calls: Array<{ className: string; area: number }> = []
    Object.defineProperty(window, '__homeHeroCanvasClears', { configurable: true, value: calls })
    CanvasRenderingContext2D.prototype.clearRect = function (x, y, width, height) {
      calls.push({ className: this.canvas.className, area: Math.max(0, width) * Math.max(0, height) })
      clearRect.call(this, x, y, width, height)
    }
  })
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
  const sampleRegion = {
    x: bounds!.width / 2,
    y: bounds!.height / 2,
    radius: Number(await page.locator('.home-hero-particles').getAttribute('data-grid-step')) * 6.5 + 16
  }
  const basePixelCount = await countCanvasPixels(canvas, sampleRegion)
  await page.evaluate(() => {
    (window as unknown as { __homeHeroCanvasClears: unknown[] }).__homeHeroCanvasClears.length = 0
  })

  await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2)
  await expect.poll(async () => pixelDistance(baseline, await readCanvasGrid())).toBeGreaterThan(0)
  const disturbedPixelCount = await countCanvasPixels(canvas, sampleRegion)
  expect(disturbedPixelCount).toBeLessThanOrEqual(basePixelCount * 1.22 + 40)
  const markRedraw = await page.evaluate(() => {
    const stage = document.querySelector('.home-hero-particles')!
    const bounds = stage.getBoundingClientRect()
    const calls = (window as unknown as { __homeHeroCanvasClears: Array<{ className: string; area: number }> }).__homeHeroCanvasClears
    const markAreas = calls.filter((call) => call.className === 'home-hero-particles-canvas').map((call) => call.area)
    return Math.max(...markAreas) / (bounds.width * bounds.height)
  })
  expect(markRedraw).toBeGreaterThan(0)
  expect(markRedraw).toBeLessThan(0.25)
  const disturbed = await readCanvasGrid()
  const disturbedDistance = pixelDistance(baseline, disturbed)

  await page.mouse.move(bounds!.x + bounds!.width + 24, bounds!.y + bounds!.height + 24)
  await expect.poll(
    async () => pixelDistance(baseline, await readCanvasGrid()),
    { timeout: 4000 }
  ).toBeLessThan(disturbedDistance * 0.2)
})

test('lets field dots respond near the edge of the butterfly opening', async ({ page }) => {
  test.skip(!(await page.evaluate(() => window.matchMedia('(hover: hover) and (pointer: fine)').matches)))
  await page.addInitScript(() => {
    const clearRect = CanvasRenderingContext2D.prototype.clearRect
    const calls: Array<{ className: string; area: number }> = []
    Object.defineProperty(window, '__homeHeroCanvasClears', { configurable: true, value: calls })
    CanvasRenderingContext2D.prototype.clearRect = function (x, y, width, height) {
      calls.push({ className: this.canvas.className, area: Math.max(0, width) * Math.max(0, height) })
      clearRect.call(this, x, y, width, height)
    }
  })
  await page.goto('/')

  const stage = page.locator('.home-hero-particles')
  const grid = page.locator('.home-hero-particles-grid')
  await stage.scrollIntoViewIfNeeded()
  await expect(grid).toHaveAttribute('data-particle-state', 'settled', { timeout: 4000 })
  await expect(page.locator('.home-hero-particles-canvas')).toHaveAttribute('data-particle-state', 'settled', { timeout: 4000 })
  await page.evaluate(() => {
    (window as unknown as { __homeHeroCanvasClears: unknown[] }).__homeHeroCanvasClears.length = 0
  })
  const readGrid = () => grid.evaluate((element) => {
    const canvas = element as HTMLCanvasElement
    const context = canvas.getContext('2d')!
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
    const gridSize = 96
    const gridPixels = new Uint16Array(gridSize * gridSize)
    for (let y = 0; y < canvas.height; y += 2) {
      for (let x = 0; x < canvas.width; x += 2) {
        if (!pixels[(y * canvas.width + x) * 4 + 3]) continue
        const gridX = Math.min(gridSize - 1, Math.floor(x * gridSize / canvas.width))
        const gridY = Math.min(gridSize - 1, Math.floor(y * gridSize / canvas.height))
        const index = gridY * gridSize + gridX
        gridPixels[index] = (gridPixels[index] ?? 0) + 1
      }
    }
    return Array.from(gridPixels)
  })
  const pixelDistance = (first: number[], second: number[]) => first.reduce(
    (distance, value, index) => distance + Math.abs(value - (second[index] ?? 0)),
    0
  )
  const baseline = await readGrid()
  const bounds = await stage.boundingBox()
  expect(bounds).not.toBeNull()
  const sampleRegion = {
    x: bounds!.width * 0.08,
    y: bounds!.height * 0.5,
    radius: Number(await stage.getAttribute('data-grid-step')) * 6.5 + 16
  }
  const basePixelCount = await countCanvasPixels(grid, sampleRegion)
  await page.mouse.move(bounds!.x + sampleRegion.x, bounds!.y + sampleRegion.y)
  await expect.poll(() => page.evaluate(() => (
    (window as unknown as { __homeHeroCanvasClears: Array<{ className: string }> }).__homeHeroCanvasClears
      .filter((call) => call.className === 'home-hero-particles-grid').length
  ))).toBeGreaterThan(0)
  await expect.poll(async () => pixelDistance(baseline, await readGrid())).toBeGreaterThan(0)
  const disturbed = await readGrid()
  const disturbedDistance = pixelDistance(baseline, disturbed)
  const disturbedPixelCount = await countCanvasPixels(grid, sampleRegion)
  expect(disturbedPixelCount).toBeLessThanOrEqual(basePixelCount * 1.2 + 40)

  await page.mouse.move(bounds!.x + bounds!.width + 24, bounds!.y + bounds!.height + 24)
  await expect.poll(
    async () => pixelDistance(baseline, await readGrid()),
    { timeout: 4000 }
  ).toBeLessThan(disturbedDistance * 0.2)
})

test('erases cached source field dots on a throttled first pointer frame', async ({ page }) => {
  test.skip(!(await page.evaluate(() => window.matchMedia('(hover: hover) and (pointer: fine)').matches)))
  await installFrameTimestampOffset(page)
  await page.goto('/')

  const stage = page.locator('.home-hero-particles')
  const grid = page.locator('.home-hero-particles-grid')
  await stage.scrollIntoViewIfNeeded()
  await expect(grid).toHaveAttribute('data-particle-state', 'settled', { timeout: 4000 })

  const geometry = await stage.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    return { width: Math.floor(bounds.width), height: Math.floor(bounds.height) }
  })
  const scene = createHomeHeroParticleScene(geometry.width, geometry.height)
  const reproduction = findClippedParticleSource(
    scene.backgroundPoints,
    geometry.width,
    geometry.height,
    scene.gridStep,
    0.14
  )
  expect(reproduction).not.toBeNull()
  const bounds = await stage.boundingBox()
  expect(bounds).not.toBeNull()
  const sourceRegion = {
    x: reproduction!.point.x,
    y: reproduction!.point.y,
    radius: scene.gridStep * 0.12
  }
  await expect.poll(() => countCanvasPixels(grid, sourceRegion)).toBeGreaterThan(0)

  await page.evaluate(() => {
    const target = window as Window & { __homeHeroFrameOffsetMs?: number }
    target.__homeHeroFrameOffsetMs = 120
  })
  await page.mouse.move(bounds!.x + reproduction!.pointer.x, bounds!.y + reproduction!.pointer.y)
  await expect.poll(() => countCanvasPixels(grid, sourceRegion), { timeout: 2000 }).toBe(0)
})

test('erases cached source Y dots on a throttled first pointer frame', async ({ page }) => {
  test.skip(!(await page.evaluate(() => window.matchMedia('(hover: hover) and (pointer: fine)').matches)))
  await installFrameTimestampOffset(page)
  await page.goto('/')

  const stage = page.locator('.home-hero-particles')
  const mark = page.locator('.home-hero-particles-canvas')
  await stage.scrollIntoViewIfNeeded()
  await expect(mark).toHaveAttribute('data-particle-state', 'settled', { timeout: 4000 })

  const geometry = await stage.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    return { width: Math.floor(bounds.width), height: Math.floor(bounds.height) }
  })
  const scene = createHomeHeroParticleScene(geometry.width, geometry.height)
  const reproduction = findClippedParticleSource(
    scene.yPoints,
    geometry.width,
    geometry.height,
    scene.gridStep,
    0.16
  )
  expect(reproduction).not.toBeNull()
  const bounds = await stage.boundingBox()
  expect(bounds).not.toBeNull()
  const sourceRegion = {
    x: reproduction!.point.x,
    y: reproduction!.point.y,
    radius: scene.gridStep * 0.12
  }
  await expect.poll(() => countCanvasPixels(mark, sourceRegion)).toBeGreaterThan(0)

  await page.evaluate(() => {
    const target = window as Window & { __homeHeroFrameOffsetMs?: number }
    target.__homeHeroFrameOffsetMs = 120
  })
  await page.mouse.move(bounds!.x + reproduction!.pointer.x, bounds!.y + reproduction!.pointer.y)
  await expect.poll(() => countCanvasPixels(mark, sourceRegion), { timeout: 2000 }).toBe(0)
})

test('redraws only local canvas regions while the fixed grid responds to a pointer', async ({ page }) => {
  test.skip(!(await page.evaluate(() => window.matchMedia('(hover: hover) and (pointer: fine)').matches)))
  await page.addInitScript(() => {
    const clearRect = CanvasRenderingContext2D.prototype.clearRect
    const calls: Array<{ className: string; width: number; height: number; area: number }> = []
    Object.defineProperty(window, '__homeHeroCanvasClears', { configurable: true, value: calls })
    CanvasRenderingContext2D.prototype.clearRect = function (x, y, width, height) {
      calls.push({ className: this.canvas.className, width, height, area: Math.max(0, width) * Math.max(0, height) })
      clearRect.call(this, x, y, width, height)
    }
  })
  await page.goto('/')

  const stage = page.locator('.home-hero-particles')
  const grid = page.locator('.home-hero-particles-grid')
  const mark = page.locator('.home-hero-particles-canvas')
  await expect(grid).toHaveAttribute('data-particle-state', 'settled', { timeout: 4000 })
  await expect(mark).toHaveAttribute('data-particle-state', 'settled', { timeout: 4000 })
  await page.evaluate(() => {
    (window as unknown as { __homeHeroCanvasClears: unknown[] }).__homeHeroCanvasClears.length = 0
  })
  await stage.hover({ position: { x: 8, y: 8 } })
  await expect.poll(() => page.evaluate(() => (
    (window as unknown as { __homeHeroCanvasClears: Array<{ area: number }> }).__homeHeroCanvasClears.length
  ))).toBeGreaterThan(0)

  const largestClearRatio = await page.evaluate(() => {
    const stage = document.querySelector('.home-hero-particles')!
    const bounds = stage.getBoundingClientRect()
    const calls = (window as unknown as { __homeHeroCanvasClears: Array<{ className: string; area: number }> }).__homeHeroCanvasClears
    const gridAreas = calls.filter((call) => call.className === 'home-hero-particles-grid').map((call) => call.area)
    return Math.max(...gridAreas.map((area) => area / (bounds.width * bounds.height)))
  })
  expect(largestClearRatio).toBeGreaterThan(0)
  expect(largestClearRatio).toBeLessThan(0.25)
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

test('completes a partially drawn Y after the hidden page outlasts the intro', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
  })
  await page.goto('/')

  const hero = page.locator('.home-hero')
  const canvas = page.locator('.home-hero-particles-canvas')
  await expect(canvas).toHaveAttribute('data-particle-state', 'paused')
  await expect(hero).toHaveAttribute('data-intro-state', 'complete', { timeout: 5000 })
  const bounds = await canvas.boundingBox()
  expect(bounds).not.toBeNull()
  const sampleRegion = {
    x: bounds!.width / 2,
    y: bounds!.height / 2,
    radius: Math.max(bounds!.width, bounds!.height)
  }
  const partialPixelCount = await countCanvasPixels(canvas, sampleRegion)

  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(canvas).toHaveAttribute('data-particle-state', 'settled')
  const settledPixelCount = await countCanvasPixels(canvas, sampleRegion)
  expect(settledPixelCount).toBeGreaterThan(partialPixelCount)

  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })))
  const completePixelCount = await countCanvasPixels(canvas, sampleRegion)
  expect(settledPixelCount).toBe(completePixelCount)
})

test('restores a complete settled scene after focus and back-forward cache return', async ({ page }) => {
  await page.goto('/')
  const canvas = page.locator('.home-hero-particles-canvas')
  await expect(canvas).toHaveAttribute('data-particle-state', 'settled', { timeout: 4000 })

  await page.evaluate(() => window.dispatchEvent(new Event('blur')))
  await expect(canvas).toHaveAttribute('data-particle-state', 'paused')
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(canvas).toHaveAttribute('data-particle-state', 'settled')

  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })))
  await expect(canvas).toHaveAttribute('data-particle-state', 'settled')
  await expect(page.locator('.home-hero-particles-grid')).toHaveAttribute('data-particle-state', 'settled')
})

test('renders one aligned dot grid with a butterfly opening and keeps labels as DOM text', async ({ page }) => {
  await page.goto('/')
  const stage = page.locator('.home-hero-particles')
  const mark = stage.locator('.home-hero-particles-mark')
  const canvas = stage.locator('.home-hero-particles-canvas')
  const grid = stage.locator('.home-hero-particles-grid')
  const labels = stage.locator('.home-hero-particles-labels')

  await expect(stage).toHaveAttribute('data-render-mode', 'canvas', { timeout: 4000 })
  await expect(canvas).toHaveAttribute('data-particle-state', 'settled', { timeout: 4000 })
  await expect(grid).toHaveAttribute('data-particle-state', 'settled', { timeout: 4000 })
  await expect(mark).toHaveAttribute('data-mark-source', 'vector')
  await expect(mark.locator('[data-y-mark]')).toHaveCount(1)
  await expect(grid).toHaveAttribute('data-grid-source', 'fixed-logical-pixels')
  await expect(canvas).toHaveAttribute('data-target-source', 'fixed-grid')
  await expect(stage.locator('.home-hero-particles-ring')).toHaveCount(0)
  await expect(stage.locator('img')).toHaveCount(0)
  await expect(labels.locator('span')).toHaveText(['RESEARCH', 'BUILD', 'LIVE'])
  await expect(labels).toHaveCSS('opacity', '1')

  const samples = await grid.evaluate((element) => {
    const canvas = element as HTMLCanvasElement
    const context = canvas.getContext('2d')!
    const bounds = canvas.getBoundingClientRect()
    const ratio = canvas.width / bounds.width
    const sample = (x: number, y: number) => context.getImageData(Math.round(x * ratio), Math.round(y * ratio), 1, 1).data[3]
    const stage = element.parentElement!
    const step = Number(stage.getAttribute('data-grid-step'))
    const originX = Number(stage.getAttribute('data-grid-origin-x'))
    const originY = Number(stage.getAttribute('data-grid-origin-y'))
    const alignedPoint = (x: number, y: number) => ({
      x: originX + Math.round((x - originX) / step) * step,
      y: originY + Math.round((y - originY) / step) * step
    })
    const butterfly = alignedPoint(bounds.width * 0.5, bounds.height * 0.31)
    const openField = alignedPoint(bounds.width * 0.08, bounds.height * 0.5)
    return {
      step,
      butterfly: sample(butterfly.x, butterfly.y),
      openField: sample(openField.x, openField.y)
    }
  })
  expect(samples.step).toBeGreaterThanOrEqual(8)
  expect(samples.butterfly).toBe(0)
  expect(samples.openField).toBeGreaterThan(0)

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

test('keeps a complete patterned vector scene when Canvas is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: () => null
    })
  })
  await page.goto('/')

  const particles = page.locator('.home-hero-particles')
  await expect(particles).toHaveAttribute('data-render-mode', 'static-fallback')
  await expect(page.locator('.home-hero-particles-mark')).toBeVisible()
  await expect(page.locator('.home-hero-particles-mark pattern')).toHaveCount(2)
  await expect(page.locator('.home-hero-particles-mark [data-y-mark]')).toBeVisible()
  await expect(page.locator('.home-hero-particles-labels')).toBeVisible()
  await expect(page.locator('.home-hero-particles-labels span')).toHaveText(['RESEARCH', 'BUILD', 'LIVE'])
  await expect(page.locator('h1.home-hero-title')).toHaveAccessibleName('你好，我是 Yance 研究、构建，与现场相遇')
  await expect(page.locator('.home-hero-actions a')).toHaveCount(2)
})

test('uses the shared sitewide cursor on the Hero and gives its actions clear feedback', async ({ page }) => {
  test.skip(!(await page.evaluate(() => window.matchMedia('(hover: hover) and (pointer: fine)').matches)))
  await page.goto('/')
  await expect(page.locator('.home-hero')).toHaveAttribute('data-intro-state', 'complete', { timeout: 5000 })
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto' })

  const cursor = page.locator('.sitewide-cursor')
  await expect(cursor).toHaveCount(1)
  await page.locator('.home-hero').hover({ position: { x: 8, y: 8 } })
  await expect(cursor).toHaveCSS('opacity', '1')
  await expect(cursor).toHaveAttribute('data-context', 'surface')
  expect(await cursor.evaluate((element) => element.getBoundingClientRect().width)).toBe(30)
  const action = page.locator('.home-hero-actions a').first()
  await action.hover()
  await expect.poll(() => action.evaluate((element) => element.matches(':hover'))).toBe(true)
  await expect(cursor).toHaveAttribute('data-context', 'interactive')
  await expect.poll(() => cursor.evaluate((element) => element.getBoundingClientRect().width)).toBe(40)
  await expect(cursor).toHaveCSS('pointer-events', 'none')
  await page.mouse.move(-1, -1)
  await expect(cursor).toHaveCSS('opacity', '0')
})

test('updates the shared pointer context when scrolling changes the element under a stationary pointer', async ({ page }) => {
  test.skip(!(await page.evaluate(() => window.matchMedia('(hover: hover) and (pointer: fine)').matches)))
  await page.goto('/')
  await expect(page.locator('.home-hero')).toHaveAttribute('data-intro-state', 'complete', { timeout: 5000 })

  const cursor = page.locator('.sitewide-cursor')
  await expect(cursor).toHaveCount(1)
  const action = page.locator('.home-hero-actions a').first()
  const point = await action.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }
  })

  await page.mouse.move(point.x, point.y)
  await expect(cursor).toHaveAttribute('data-context', 'interactive')
  await page.evaluate(() => window.scrollBy({ top: 100, behavior: 'instant' }))

  await expect.poll(() => page.evaluate(({ x, y }) => {
    const hero = document.querySelector('.home-hero')
    const target = document.elementFromPoint(x, y)
    return Boolean(hero && target && hero.contains(target) && !target.closest('a, button, [role="button"], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])'))
  }, point)).toBe(true)
  await expect(cursor).toHaveAttribute('data-context', 'particle')
})

test('uses a touch ripple without creating a custom pointer on coarse devices', async ({ page }) => {
  test.skip(!await page.evaluate(() => window.matchMedia('(pointer: coarse)').matches))
  await page.goto('/')

  await expect(page.locator('.sitewide-cursor')).toHaveCount(0)
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
