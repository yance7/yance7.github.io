import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  HOME_HERO_BUTTERFLY_CLIP_PATHS,
  HOME_HERO_BUTTERFLY_PATHS,
  HOME_HERO_GRID_DOT_RADIUS_RATIO,
  HOME_HERO_MARK_DOT_HALO_RADIUS_RATIO,
  HOME_HERO_MARK_DOT_RADIUS_RATIO,
  createHomeHeroParticleScene,
  isHomeHeroButterflyPoint,
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

async function countVisibleCanvasTargets(
  canvas: Locator,
  targets: readonly HomeHeroParticleTarget[],
  canvasOffset: { x: number; y: number }
) {
  return canvas.evaluate((element, sample) => {
    const target = element as HTMLCanvasElement
    const bounds = target.getBoundingClientRect()
    const ratio = target.width / bounds.width
    const pixels = target.getContext('2d')!.getImageData(0, 0, target.width, target.height).data

    return sample.targets.reduce((count, point) => {
      const x = Math.round((point.x - sample.canvasOffset.x) * ratio)
      const y = Math.round((point.y - sample.canvasOffset.y) * ratio)
      const alpha = pixels[(y * target.width + x) * 4 + 3] ?? 0
      return count + Number(alpha > 0)
    }, 0)
  }, { targets, canvasOffset })
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

function findParticleSource(
  points: readonly HomeHeroParticleTarget[],
  width: number,
  height: number,
  gridStep: number
) {
  return points.find(({ x, y }) => (
    x > gridStep * 3
    && x < width - gridStep * 3
    && y > gridStep * 3
    && y < height - gridStep * 3
  )) ?? null
}

function findButterflyGridGap(scene: ReturnType<typeof createHomeHeroParticleScene>) {
  for (let row = 0; row < scene.rows - 1; row += 1) {
    for (let column = 0; column < scene.columns - 1; column += 1) {
      const x = scene.gridOriginX + column * scene.gridStep + scene.gridStep / 2
      const y = scene.gridOriginY + row * scene.gridStep + scene.gridStep / 2
      const localX = (x - scene.butterflyBounds.x) / scene.butterflyBounds.width
      const localY = (y - scene.butterflyBounds.y) / scene.butterflyBounds.height
      if (isHomeHeroButterflyPoint(localX, localY)) return { x, y }
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

test('fills the butterfly wings beneath the shared background lattice', async ({ page }) => {
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
  const sample = findButterflyGridGap(scene)
  expect(sample).not.toBeNull()

  const alpha = await grid.evaluate((element, point) => {
    const canvas = element as HTMLCanvasElement
    const bounds = canvas.getBoundingClientRect()
    const ratio = canvas.width / bounds.width
    return canvas.getContext('2d')!.getImageData(
      Math.floor(point.x * ratio),
      Math.floor(point.y * ratio),
      1,
      1
    ).data[3]
  }, sample!)
  expect(alpha).toBeGreaterThan(220)
})

test('keeps the Y particle mark distinguishable in the dark theme', async ({ page }) => {
  await page.goto('/')
  const darkThemeButton = page.getByRole('button', { name: /切换到暗色主题/ })
  if (await darkThemeButton.count()) await darkThemeButton.click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  const stage = page.locator('.home-hero-particles')
  const contrast = await stage.evaluate((element) => {
    const styles = getComputedStyle(element)
    const luminance = (value: string) => {
      const hex = value.trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i)?.[1]
      const channels = hex
        ? (hex.length === 3
            ? [...hex].map((channel) => Number.parseInt(channel + channel, 16))
            : hex.match(/../g)?.map((channel) => Number.parseInt(channel, 16)) ?? [])
        : value.match(/[\d.]+/g)?.map(Number) ?? []
      const [red = 0, green = 0, blue = 0] = channels.map((channel) => {
        const normalized = channel / 255
        return normalized <= 0.04045
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4
      })
      return red * 0.2126 + green * 0.7152 + blue * 0.0722
    }
    const ratio = (first: string, second: string) => {
      const values = [luminance(first), luminance(second)].sort((a, b) => b - a)
      return ((values[0] ?? 0) + 0.05) / ((values[1] ?? 0) + 0.05)
    }
    const mark = styles.getPropertyValue('--hero-mark')
    const halo = styles.getPropertyValue('--hero-mark-halo')
    return {
      markOnButterfly: ratio(mark, styles.getPropertyValue('--hero-butterfly')),
      haloOnCenter: ratio(halo, styles.getPropertyValue('--hero-stage-center')),
      haloOnEdge: ratio(halo, styles.getPropertyValue('--hero-stage-edge'))
    }
  })

  expect(contrast.markOnButterfly).toBeGreaterThanOrEqual(4.5)
  expect(contrast.haloOnCenter).toBeGreaterThanOrEqual(3)
  expect(contrast.haloOnEdge).toBeGreaterThanOrEqual(3)

  await stage.scrollIntoViewIfNeeded()
  await expect(page.locator('.home-hero')).toHaveAttribute('data-intro-state', 'complete')
  const canvas = page.locator('.home-hero-particles-canvas')
  await expect(canvas).toHaveAttribute('data-particle-state', 'settled', { timeout: 4000 })

  const bounds = await stage.boundingBox()
  expect(bounds).not.toBeNull()
  const scene = createHomeHeroParticleScene(Math.floor(bounds!.width), Math.floor(bounds!.height))
  const haloSampleOffset = scene.gridStep * (
    HOME_HERO_MARK_DOT_RADIUS_RATIO + HOME_HERO_MARK_DOT_HALO_RADIUS_RATIO
  ) / 2
  const isInsideButterfly = (point: HomeHeroParticleTarget) => isHomeHeroButterflyPoint(
    (point.x - scene.butterflyBounds.x) / scene.butterflyBounds.width,
    (point.y - scene.butterflyBounds.y) / scene.butterflyBounds.height
  )
  const wingTarget = scene.yPoints.find(isInsideButterfly)
  const fieldTarget = scene.yPoints.find((point) => (
    !isInsideButterfly(point)
      && !isInsideButterfly({ ...point, x: point.x + haloSampleOffset })
  ))
  expect(wingTarget).toBeDefined()
  expect(fieldTarget).toBeDefined()

  const pixels = await canvas.evaluate((element, targets) => {
    const mark = element as HTMLCanvasElement
    const context = mark.getContext('2d')!
    const ratio = Number(mark.dataset.pixelRatio ?? '1')
    const read = (x: number, y: number) => {
      const pixelX = Math.max(0, Math.min(mark.width - 1, Math.floor(x * ratio)))
      const pixelY = Math.max(0, Math.min(mark.height - 1, Math.floor(y * ratio)))
      return Array.from(context.getImageData(pixelX, pixelY, 1, 1).data.slice(0, 3))
    }
    const haloBounds = {
      left: Math.max(0, Math.floor((targets.field.x - targets.haloRadius) * ratio)),
      top: Math.max(0, Math.floor((targets.field.y - targets.haloRadius) * ratio)),
      right: Math.min(mark.width, Math.ceil((targets.field.x + targets.haloRadius) * ratio)),
      bottom: Math.min(mark.height, Math.ceil((targets.field.y + targets.haloRadius) * ratio))
    }
    const haloPixels = context.getImageData(
      haloBounds.left,
      haloBounds.top,
      haloBounds.right - haloBounds.left,
      haloBounds.bottom - haloBounds.top
    )
    let haloSample = [0, 0, 0]
    let haloAlpha = 0
    for (let y = 0; y < haloPixels.height; y += 1) {
      for (let x = 0; x < haloPixels.width; x += 1) {
        const logicalX = (haloBounds.left + x + 0.5) / ratio
        const logicalY = (haloBounds.top + y + 0.5) / ratio
        const distance = Math.hypot(logicalX - targets.field.x, logicalY - targets.field.y)
        if (distance <= targets.dotRadius || distance >= targets.haloRadius) continue
        const offset = (y * haloPixels.width + x) * 4
        const alpha = haloPixels.data[offset + 3]!
        if (alpha <= haloAlpha) continue
        haloAlpha = alpha
        haloSample = Array.from(haloPixels.data.slice(offset, offset + 3))
      }
    }
    const stage = document.querySelector('.home-hero-particles')!
    const styles = getComputedStyle(stage)
    return {
      core: read(targets.wing.x, targets.wing.y),
      halo: haloSample,
      haloAlpha,
      markColor: styles.getPropertyValue('--hero-mark').trim(),
      haloColor: styles.getPropertyValue('--hero-mark-halo').trim()
    }
  }, {
    wing: wingTarget!,
    field: fieldTarget!,
    dotRadius: scene.gridStep * HOME_HERO_MARK_DOT_RADIUS_RATIO,
    haloRadius: scene.gridStep * HOME_HERO_MARK_DOT_HALO_RADIUS_RATIO
  })
  const channels = (color: string) => color.match(/^#([\da-f]{6})$/i)?.[1]
    ?.match(/../g)
    ?.map((channel) => Number.parseInt(channel, 16)) ?? []
  const colorDistance = (pixel: number[], color: string) => pixel.reduce(
    (distance, channel, index) => distance + Math.abs(channel - (channels(color)[index] ?? 0)),
    0
  )

  expect(colorDistance(pixels.core, pixels.markColor), JSON.stringify(pixels)).toBeLessThan(24)
  expect(pixels.haloAlpha).toBeGreaterThanOrEqual(240)
  expect(colorDistance(pixels.halo, pixels.haloColor), JSON.stringify(pixels))
    .toBeLessThan(colorDistance(pixels.halo, pixels.markColor) / 2)
})

test('clips halftone dots to the butterfly silhouette edge', async ({ page }) => {
  await page.goto('/')
  const stage = page.locator('.home-hero-particles')
  const grid = page.locator('.home-hero-particles-grid')
  await stage.scrollIntoViewIfNeeded()
  await expect(grid).toHaveAttribute('data-particle-state', 'settled', { timeout: 4000 })

  const geometry = await stage.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    return {
      width: Math.floor(bounds.width),
      height: Math.floor(bounds.height)
    }
  })
  const scene = createHomeHeroParticleScene(geometry.width, geometry.height)
  const comparisons = await grid.evaluate((element, input) => {
    const canvas = element as HTMLCanvasElement
    const stage = canvas.closest('.home-hero-particles') as HTMLElement
    const stageBounds = stage.getBoundingClientRect()
    const ratio = canvas.width / stageBounds.width
    const reference = document.createElement('canvas')
    reference.width = canvas.width
    reference.height = canvas.height
    const context = reference.getContext('2d')!
    const geometryContext = document.createElement('canvas').getContext('2d')!
    const butterfly = input.bounds
    const paths = input.paths.map((path) => new Path2D(path))
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    context.translate(butterfly.x, butterfly.y)
    context.scale(butterfly.width / 100, butterfly.height / 100)
    context.fillStyle = getComputedStyle(stage).getPropertyValue('--hero-butterfly').trim()
    paths.forEach((path) => context.fill(path))

    const radius = input.gridStep * input.dotRadiusRatio
    const antialiasClearance = 0.75 / ratio
    const edgeOffsets = Array.from({ length: 8 }, (_, index) => {
      const angle = (index * Math.PI) / 4
      return { x: Math.cos(angle) * antialiasClearance, y: Math.sin(angle) * antialiasClearance }
    })
    const isInsideSilhouette = (x: number, y: number) => paths.some((path) => (
      geometryContext.isPointInPath(path, x, y)
    ))
    const samples: Record<string, {
      x: number
      y: number
      distance: number
    }> = {}
    for (const point of input.points) {
      if (point.surface !== 'butterfly') continue
      const quadrant = `${point.x < butterfly.x + butterfly.width / 2 ? 'left' : 'right'}-${point.y < butterfly.y + butterfly.height / 2 ? 'upper' : 'lower'}`
      const minX = Math.floor((point.x - radius) * ratio)
      const maxX = Math.ceil((point.x + radius) * ratio)
      const minY = Math.floor((point.y - radius) * ratio)
      const maxY = Math.ceil((point.y + radius) * ratio)
      for (let y = minY; y <= maxY; y += 1) {
        for (let x = minX; x <= maxX; x += 1) {
          const sampleX = (x + 0.5) / ratio
          const sampleY = (y + 0.5) / ratio
          const distance = Math.hypot(sampleX - point.x, sampleY - point.y)
          if (distance > radius || (samples[quadrant] && distance >= samples[quadrant].distance)) continue
          const localX = (sampleX - butterfly.x) / butterfly.width * 100
          const localY = (sampleY - butterfly.y) / butterfly.height * 100
          if (isInsideSilhouette(localX, localY)
            || edgeOffsets.some((offset) => isInsideSilhouette(
              localX + offset.x / butterfly.width * 100,
              localY + offset.y / butterfly.height * 100
            ))) continue
          samples[quadrant] = { x, y, distance }
        }
      }
    }

    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    context.fillStyle = getComputedStyle(stage).getPropertyValue('--hero-dot').trim()
    context.beginPath()
    for (const point of input.points) {
      if (point.surface !== 'field') continue
      context.moveTo(point.x + radius, point.y)
      context.arc(point.x, point.y, radius, 0, Math.PI * 2)
    }
    context.fill()

    const actualContext = canvas.getContext('2d')!
    return Object.entries(samples).map(([quadrant, point]) => {
      const actual = actualContext.getImageData(point.x, point.y, 1, 1).data
      const expected = context.getImageData(point.x, point.y, 1, 1).data
      return {
        quadrant,
        difference: Math.max(...Array.from(actual, (channel, index) => Math.abs(channel - expected[index]!)))
      }
    })
  }, {
    bounds: scene.butterflyBounds,
    gridStep: scene.gridStep,
    dotRadiusRatio: HOME_HERO_GRID_DOT_RADIUS_RATIO,
    points: scene.backgroundPoints.map(({ x, y, surface }) => ({ x, y, surface })),
    paths: HOME_HERO_BUTTERFLY_PATHS,
  })
  test.skip(comparisons.length < 4, 'requires enough backing pixels beyond the anti-aliased contour')
  expect(comparisons.map(({ quadrant }) => quadrant).sort()).toEqual([
    'left-lower',
    'left-upper',
    'right-lower',
    'right-upper'
  ])
  expect(comparisons.every(({ difference }) => difference <= 2), JSON.stringify(comparisons)).toBe(true)
})

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
  })).toEqual(expect.objectContaining({ gridStep: 5, viewBoxMatchesStage: true }))
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
  await expect(stage).toHaveAttribute('data-grid-step', '5')
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

test('updates the Y ripple on each high-refresh animation frame', async ({ page }) => {
  await page.goto('/')

  const stage = page.locator('.home-hero-particles')
  const canvas = page.locator('.home-hero-particles-canvas')
  await stage.scrollIntoViewIfNeeded()
  await expect(page.locator('.home-hero')).toHaveAttribute('data-intro-state', 'complete')
  await expect(canvas).toHaveAttribute('data-particle-state', 'settled', { timeout: 4000 })

  await page.evaluate(() => {
    const target = window as Window & {
      __homeHeroFrameTimestamp?: number
      __homeHeroFlushFrames?: (timestamp: number) => void
      __homeHeroRenderTimes?: number[]
    }
    const callbacks = new Map<number, FrameRequestCallback>()
    let nextId = 0
    target.__homeHeroRenderTimes = []

    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: (callback: FrameRequestCallback) => {
        const id = ++nextId
        callbacks.set(id, callback)
        return id
      }
    })
    Object.defineProperty(window, 'cancelAnimationFrame', {
      configurable: true,
      value: (id: number) => callbacks.delete(id)
    })
    target.__homeHeroFlushFrames = (timestamp) => {
      const pending = [...callbacks.values()]
      callbacks.clear()
      target.__homeHeroFrameTimestamp = timestamp
      pending.forEach((callback) => callback(timestamp))
    }

    const clearRect = CanvasRenderingContext2D.prototype.clearRect
    CanvasRenderingContext2D.prototype.clearRect = function (x, y, width, height) {
      if (this.canvas.classList.contains('home-hero-particles-canvas')) {
        target.__homeHeroRenderTimes?.push(target.__homeHeroFrameTimestamp ?? -1)
      }
      clearRect.call(this, x, y, width, height)
    }
  })

  const bounds = await stage.boundingBox()
  expect(bounds).not.toBeNull()
  await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2)
  const renderTimes = await page.evaluate(() => {
    const target = window as Window & {
      __homeHeroFlushFrames?: (timestamp: number) => void
      __homeHeroRenderTimes?: number[]
    }
    const firstFrame = performance.now() + 50
    for (let frame = 0; frame < 5; frame += 1) {
      target.__homeHeroFlushFrames?.(firstFrame + frame * (1000 / 120))
    }
    return target.__homeHeroRenderTimes ?? []
  })

  expect(renderTimes).toHaveLength(5)
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
  await expect(page.locator('.home-hero')).toHaveAttribute('data-intro-state', 'complete', { timeout: 10000 })
  await expect(canvas).toHaveAttribute('data-particle-state', 'settled')
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
  const source = findParticleSource(
    scene.backgroundPoints,
    geometry.width,
    geometry.height,
    scene.gridStep
  )
  expect(source).not.toBeNull()
  const bounds = await stage.boundingBox()
  expect(bounds).not.toBeNull()
  const sourceRegion = {
    x: source!.x,
    y: source!.y,
    radius: scene.gridStep * 0.12
  }
  await expect.poll(() => countCanvasPixels(grid, sourceRegion)).toBeGreaterThan(0)

  await page.evaluate(() => {
    const target = window as Window & { __homeHeroFrameOffsetMs?: number }
    target.__homeHeroFrameOffsetMs = 120
  })
  await page.mouse.move(bounds!.x + source!.x - scene.gridStep * 0.5, bounds!.y + source!.y)
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
  const source = findParticleSource(
    scene.yPoints,
    geometry.width,
    geometry.height,
    scene.gridStep
  )
  expect(source).not.toBeNull()
  const bounds = await stage.boundingBox()
  expect(bounds).not.toBeNull()
  const sourceRegion = {
    x: source!.x,
    y: source!.y,
    radius: scene.gridStep * 0.04
  }
  await expect.poll(() => countCanvasPixels(mark, sourceRegion)).toBeGreaterThan(0)

  await page.evaluate(() => {
    const target = window as Window & { __homeHeroFrameOffsetMs?: number }
    target.__homeHeroFrameOffsetMs = 120
  })
  await page.mouse.move(bounds!.x + source!.x - scene.gridStep * 0.1, bounds!.y + source!.y)
  await expect.poll(() => countCanvasPixels(mark, sourceRegion), { timeout: 2000 }).toBe(0)
})

test('redraws only local canvas regions while the fixed grid responds to a pointer', async ({ page }) => {
  test.skip(!(await page.evaluate(() => window.matchMedia('(hover: hover) and (pointer: fine)').matches)))
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-fonts-ready', 'ready')

  const stage = page.locator('.home-hero-particles')
  await expect(page.locator('.home-hero')).toHaveAttribute('data-intro-state', 'complete')
  const grid = page.locator('.home-hero-particles-grid')
  const mark = page.locator('.home-hero-particles-canvas')
  await expect(grid).toHaveAttribute('data-particle-state', 'settled', { timeout: 4000 })
  await expect(mark).toHaveAttribute('data-particle-state', 'settled', { timeout: 4000 })
  await page.evaluate(() => {
    const clearRect = CanvasRenderingContext2D.prototype.clearRect
    const calls: Array<{ className: string; width: number; height: number; area: number }> = []
    Object.defineProperty(window, '__homeHeroCanvasClears', { configurable: true, value: calls })
    CanvasRenderingContext2D.prototype.clearRect = function (x, y, width, height) {
      calls.push({ className: this.canvas.className, width, height, area: Math.max(0, width) * Math.max(0, height) })
      clearRect.call(this, x, y, width, height)
    }
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

test('shows a complete Y when a hidden page returns after the intro', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
  })
  await page.goto('/')

  const hero = page.locator('.home-hero')
  const stage = page.locator('.home-hero-particles')
  const canvas = page.locator('.home-hero-particles-canvas')
  await expect(canvas).toHaveAttribute('data-particle-state', 'paused')
  await expect(hero).toHaveAttribute('data-intro-state', 'complete', { timeout: 5000 })
  const stageBounds = await stage.boundingBox()
  const bounds = await canvas.boundingBox()
  expect(stageBounds).not.toBeNull()
  expect(bounds).not.toBeNull()
  const scene = createHomeHeroParticleScene(Math.floor(stageBounds!.width), Math.floor(stageBounds!.height))
  const canvasOffset = { x: bounds!.x - stageBounds!.x, y: bounds!.y - stageBounds!.y }
  expect(scene.yPoints.length).toBeGreaterThan(80)

  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(canvas).toHaveAttribute('data-particle-state', 'settled')
  const settledTargetCount = await countVisibleCanvasTargets(canvas, scene.yPoints, canvasOffset)
  expect(settledTargetCount).toBe(scene.yPoints.length)

  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })))
  const completeTargetCount = await countVisibleCanvasTargets(canvas, scene.yPoints, canvasOffset)
  expect(completeTargetCount).toBe(settledTargetCount)
})

test('restores a complete settled scene after window focus returns', async ({ page }) => {
  await page.goto('/')
  const canvas = page.locator('.home-hero-particles-canvas')
  await expect(canvas).toHaveAttribute('data-particle-state', 'settled', { timeout: 4000 })

  await page.evaluate(() => window.dispatchEvent(new Event('blur')))
  await expect(canvas).toHaveAttribute('data-particle-state', 'paused')
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(canvas).toHaveAttribute('data-particle-state', 'settled')

  await expect(page.locator('.home-hero-particles-grid')).toHaveAttribute('data-particle-state', 'settled')
})

test('returns to a settled particle scene after real back-forward navigation', async ({ page }) => {
  await page.goto('/')
  const canvas = page.locator('.home-hero-particles-canvas')
  const grid = page.locator('.home-hero-particles-grid')
  await expect(canvas).toHaveAttribute('data-particle-state', 'settled', { timeout: 5000 })

  await page.goto('/academics/')
  await expect(page.locator('main')).toBeVisible()
  await page.goBack()

  await expect(page.locator('.home-hero')).toBeVisible()
  await expect(canvas).toHaveAttribute('data-particle-state', 'settled', { timeout: 5000 })
  await expect(grid).toHaveAttribute('data-particle-state', 'settled')
})

test('renders one aligned dot grid beneath the filled butterfly and keeps labels as DOM text', async ({ page }) => {
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

  const stageSize = await stage.evaluate((element) => ({
    width: Math.floor(element.getBoundingClientRect().width),
    height: Math.floor(element.getBoundingClientRect().height)
  }))
  const scene = createHomeHeroParticleScene(stageSize.width, stageSize.height)
  const samples = await grid.evaluate((element, geometry) => {
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
    const butterfly = alignedPoint(
      geometry.butterflyBounds.x + geometry.butterflyBounds.width * 0.2,
      geometry.butterflyBounds.y + geometry.butterflyBounds.height * 0.25
    )
    const openField = alignedPoint(bounds.width * 0.08, bounds.height * 0.5)
    return {
      step,
      butterfly: sample(butterfly.x, butterfly.y),
      openField: sample(openField.x, openField.y)
    }
  }, { butterflyBounds: scene.butterflyBounds })
  expect(samples.step).toBe(5)
  expect(samples.butterfly).toBeGreaterThan(0)
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
  await expect(page.locator('.home-hero-particles-mark pattern')).toHaveCount(4)
  const veinDots = page.locator('.home-hero-particles-fallback-butterfly-vein-dot')
  const expectedVeinDots = Number(await particles.getAttribute('data-butterfly-vein-point-count'))
  expect(expectedVeinDots).toBeGreaterThan(0)
  await expect(veinDots).toHaveCount(expectedVeinDots)
  const mark = particles.locator('.home-hero-particles-mark')
  const yMark = mark.locator('[data-y-mark]')
  const yMaskPaths = [
    mark.locator('#home-hero-butterfly-field-mask [data-y-mark-mask]'),
    mark.locator('#home-hero-butterfly-dot-mask [data-y-mark-mask]')
  ]
  for (const yMaskPath of yMaskPaths) {
    await expect(yMaskPath).toHaveCount(1)
    expect(await yMaskPath.getAttribute('d')).toBe(await yMark.getAttribute('d'))
    expect(await yMaskPath.getAttribute('transform')).toBe(await yMark.getAttribute('transform'))
    expect(await yMaskPath.getAttribute('fill')).toBe('black')
  }

  const veinClip = mark.locator('#home-hero-butterfly-clip')
  const clippedVeinDots = mark.locator('[data-butterfly-vein-clip]')
  await expect(clippedVeinDots).toHaveAttribute('clip-path', 'url(#home-hero-butterfly-clip)')
  await expect(veinClip).toHaveAttribute('clipPathUnits', 'userSpaceOnUse')
  const clippedButterflyPaths = await veinClip.locator('path').evaluateAll((paths) => paths.map((path) => path.getAttribute('d')))
  expect(clippedButterflyPaths.sort()).toEqual([...HOME_HERO_BUTTERFLY_CLIP_PATHS].sort())
  const clippedButterflyTransform = await veinClip.locator('g').getAttribute('transform')
  expect(clippedButterflyTransform).toBe(await mark.locator('.home-hero-particles-butterfly-fill').first().evaluate((path) => path.parentElement?.getAttribute('transform') ?? null))

  const grid = await particles.evaluate((element) => ({
    step: Number(element.getAttribute('data-grid-step')),
    originX: Number(element.getAttribute('data-grid-origin-x')),
    originY: Number(element.getAttribute('data-grid-origin-y'))
  }))
  const veinDotCenters = await veinDots.evaluateAll((circles) => circles.map((circle) => ({
    x: Number(circle.getAttribute('cx')),
    y: Number(circle.getAttribute('cy'))
  })))
  expect(veinDotCenters.every(({ x, y }) => (
    Math.abs((x - grid.originX) / grid.step - Math.round((x - grid.originX) / grid.step)) < 1e-6
    && Math.abs((y - grid.originY) / grid.step - Math.round((y - grid.originY) / grid.step)) < 1e-6
  ))).toBe(true)
  await expect(particles.locator('.home-hero-particles-butterfly-vein, .home-hero-particles-butterfly-antenna')).toHaveCount(0)
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
