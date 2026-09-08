import { expect, test, type Page } from '@playwright/test'

const routes = ['index', 'academics', 'honors', 'research', 'works', 'concerts'] as const
const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 }
] as const
const englishHomeViewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 }
] as const
const englishArchiveHeroRoutes = [
  { name: 'academics', route: '/en/academics.html' },
  { name: 'honors', route: '/en/honors.html' },
  { name: 'research', route: '/en/research.html' },
  { name: 'works', route: '/en/works.html' },
  { name: 'concerts', route: '/en/concerts.html' }
] as const
const themes = ['light', 'dark'] as const
const FIXED_NOW = '2026-08-21T12:00:00+08:00'

const sharedScreenshotOptions = {
  animations: 'disabled' as const,
  caret: 'hide' as const,
  scale: 'css' as const
}
const fullPageScreenshotOptions = { ...sharedScreenshotOptions, maxDiffPixelRatio: .02 }
const pageScreenshotOptions = { ...sharedScreenshotOptions, maxDiffPixelRatio: .01 }
const componentScreenshotOptions = { ...sharedScreenshotOptions, maxDiffPixelRatio: .005 }

async function installTheme(page: Page, selectedTheme: typeof themes[number]) {
  await page.addInitScript(({ fixedNow, selectedTheme: theme }) => {
    localStorage.setItem('yance-theme', theme)
    const OriginalDate = globalThis.Date
    const fixedTimestamp = OriginalDate.parse(fixedNow)
    class FixedDate extends OriginalDate {
      constructor(value?: string | number) {
        super(value === undefined ? fixedTimestamp : value)
      }

      static now() {
        return fixedTimestamp
      }
    }
    globalThis.Date = FixedDate as unknown as DateConstructor
  }, { fixedNow: FIXED_NOW, selectedTheme })
}

async function stabilizeVisualContext(page: Page) {
  await page.locator('main#main img[loading="lazy"]').evaluateAll((images) => {
    images.forEach((image) => {
      (image as HTMLImageElement).loading = 'eager'
    })
  })
}

async function forceAlbumGridVisible(page: Page) {
  await page.locator('.album-grid').evaluateAll((elements) => {
    elements.forEach((element) => {
      (element as HTMLElement).style.contentVisibility = 'visible'
    })
  })
}

async function settlePage(page: Page) {
  await page.waitForLoadState('domcontentloaded')
  await expect.poll(() => page.locator('html').getAttribute('data-fonts-ready')).toBe('ready')
  await expect.poll(() => page.evaluate(() => {
    const viewportHeight = window.innerHeight
    return [...document.querySelectorAll<HTMLElement>('.metric-strip')]
      .filter((strip) => {
        const rect = strip.getBoundingClientRect()
        const visibleHeight = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0)
        return visibleHeight / rect.height >= .3
      })
      .every((strip) => strip.dataset.metricsReady === 'true')
  })).toBe(true)
  await page.evaluate(async () => {
    await document.fonts?.ready
  })
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  }))
}

async function settleImages(page: Page, imageSelector: string) {
  await expect.poll(() => page.locator(imageSelector).count()).toBeGreaterThan(0)
  await page.evaluate(async (selector) => {
    const images = [...document.querySelectorAll<HTMLImageElement>(selector)]

    const waitForLoad = (image: HTMLImageElement) => new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        image.removeEventListener('load', handleLoad)
        image.removeEventListener('error', handleError)
      }
      const handleLoad = () => {
        cleanup()
        resolve()
      }
      const handleError = () => {
        cleanup()
        reject(new Error(`Image failed to load: ${image.currentSrc || image.src}`))
      }

      image.addEventListener('load', handleLoad, { once: true })
      image.addEventListener('error', handleError, { once: true })
      if (image.complete) {
        if (image.naturalWidth > 0) handleLoad()
        else handleError()
      }
    })

    await Promise.all(images.map(async (image) => {
      if (!image.complete) await waitForLoad(image)
      if (image.naturalWidth <= 0) {
        throw new Error(`Image has no natural dimensions: ${image.currentSrc || image.src}`)
      }
      await image.decode()
      if (image.naturalWidth <= 0) {
        throw new Error(`Image failed to decode: ${image.currentSrc || image.src}`)
      }
    }))
  }, imageSelector)
}

async function movePointerAway(page: Page) {
  const viewport = page.viewportSize()
  if (!viewport) return
  await page.mouse.move(viewport.width - 1, viewport.height - 1)
}

async function settleStableConcertLayout(page: Page) {
  await page.locator('main#main').scrollIntoViewIfNeeded()
  await movePointerAway(page)
  await expect.poll(() => page.evaluate(() => new Promise<boolean>((resolve) => {
    const selectors = ['#concert-archive', '#album-frequencies', '.album-wall', '.next-up']
    const round = (value: number) => Math.round(value * 100) / 100
    const snapshot = () => JSON.stringify({
      documentHeight: document.documentElement.scrollHeight,
      mainHeight: document.querySelector<HTMLElement>('main#main')?.getBoundingClientRect().height ?? 0,
      mainScrollHeight: document.querySelector<HTMLElement>('main#main')?.scrollHeight ?? 0,
      scrollY: round(window.scrollY),
      regions: selectors.map((selector) => {
        const rect = document.querySelector<HTMLElement>(selector)?.getBoundingClientRect()
        if (!rect) return null
        return [rect.left, rect.top, rect.width, rect.height].map(round)
      })
    })

    requestAnimationFrame(() => {
      const first = snapshot()
      requestAnimationFrame(() => resolve(first === snapshot()))
    })
  }))).toBe(true)
}

async function settleConcertVisualState(page: Page) {
  await stabilizeVisualContext(page)
  await page.locator('#concert-archive').scrollIntoViewIfNeeded()
  const railCards = page.locator('#concert-archive-rail .concert-rail-card')
  await expect.poll(() => railCards.count()).toBeGreaterThan(0)
  for (let index = 0; index < await railCards.count(); index += 1) {
    const card = railCards.nth(index)
    await card.scrollIntoViewIfNeeded()
    await expect(card).toHaveClass(/revealed/)
  }
  await page.locator('#concert-archive-rail').evaluate((rail) => {
    rail.scrollTo({ left: 0, behavior: 'auto' })
  })
  await expect.poll(() => page.locator('#concert-archive-rail').evaluate((rail) => rail.scrollLeft)).toBe(0)
  await settleImages(page, '#concert-archive-rail .concert-poster img')
  await page.locator('#album-frequencies').scrollIntoViewIfNeeded()
  await forceAlbumGridVisible(page)
  await expect(page.locator('.album-wall')).toHaveClass(/revealed/)
  await expect(page.locator('.album-visual-slot')).toHaveAttribute('data-spotlight-state', 'ready')
  await settleImages(page, '.album-tile img')
  await settleImages(page, '.album-spotlight img')
  await expect.poll(() => page.locator('.next-up').count()).toBeGreaterThan(0)
  await expect.poll(() => page.locator('.next-up').evaluateAll((elements) => (
    elements.every((element) => element.classList.contains('revealed'))
  ))).toBe(true)
  await settleStableConcertLayout(page)
}

async function expectLightboxGeometry(page: Page) {
  const geometry = await page.evaluate(() => ({
    imageBottom: document.querySelector<HTMLImageElement>('.lb-stage img')?.getBoundingClientRect().bottom ?? 0,
    metadataTop: document.querySelector<HTMLElement>('.lb-meta-dock')?.getBoundingClientRect().top ?? 0
  }))
  expect(geometry.imageBottom, JSON.stringify(geometry)).toBeLessThanOrEqual(geometry.metadataTop - 12)
}

async function settleFloatingHeader(page: Page, route: 'research' | 'works') {
  const targetSelector = route === 'research' ? '#sec-toolchain' : '#project-fresheye'
  await page.locator(targetSelector).evaluate((element) => {
    const root = document.documentElement
    const body = document.body
    const previousRootBehavior = root.style.scrollBehavior
    const previousBodyBehavior = body.style.scrollBehavior
    const targetTop = element.getBoundingClientRect().top + window.scrollY - 44

    root.style.scrollBehavior = 'auto'
    body.style.scrollBehavior = 'auto'
    window.scrollTo({ top: targetTop, left: 0, behavior: 'auto' })
    root.style.scrollBehavior = previousRootBehavior
    body.style.scrollBehavior = previousBodyBehavior
  })
  await expect(page.locator('.site-nav')).toHaveAttribute('data-header-state', 'floating')
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  }))
}

for (const viewport of viewports) {
  for (const theme of themes) {
    test(`captures ${theme} ${viewport.name} visual baselines`, async ({ page }, testInfo) => {
      if (viewport.name === 'desktop') test.setTimeout(60_000)
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await installTheme(page, theme)

      for (const route of routes) {
        await page.goto(`/${route}.html`)
        if (route === 'concerts') await stabilizeVisualContext(page)
        await settlePage(page)
        await expect(page.locator('main#main')).toBeVisible()
        await expect(page.locator('.site-footer')).toHaveCount(1)

        const layout = await page.evaluate(() => ({
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: document.documentElement.clientWidth
        }))
        expect(layout.documentWidth, `${route} ${theme} ${viewport.name} overflow`).toBeLessThanOrEqual(layout.viewportWidth)

        await page.screenshot({
          ...pageScreenshotOptions,
          path: testInfo.outputPath(`${route}-${theme}-${viewport.name}-review.png`),
          fullPage: false
        })
        await expect(page).toHaveScreenshot(`${route}-${theme}-${viewport.name}-viewport.png`, pageScreenshotOptions)

        if (route !== 'index' && viewport.name === 'desktop') {
          if (route === 'concerts') await settleConcertVisualState(page)
          await expect(page.locator('main#main')).toHaveScreenshot(`${route}-${theme}-desktop-main.png`, componentScreenshotOptions)
        }
        if (route === 'index' && viewport.name === 'desktop') {
          await expect(page).toHaveScreenshot(`index-${theme}-desktop-full.png`, {
            ...fullPageScreenshotOptions,
            fullPage: true
          })
        }
      }
    })
  }
}

for (const theme of themes) {
  test(`captures ${theme} Lightbox landscape portrait and mobile states`, async ({ page }) => {
    await installTheme(page, theme)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/concerts.html')
    await settlePage(page)

    await page.locator('.concert-poster.land .poster-open').first().click()
    await expect(page.locator('.lb-stage img')).toHaveClass(/loaded/)
    await expectLightboxGeometry(page)
    await expect(page.locator('.lightbox')).toHaveScreenshot(`${theme}-lightbox-landscape.png`, componentScreenshotOptions)
    await page.keyboard.press('Escape')
    await expect(page.locator('.lightbox')).toHaveCount(0)

    await page.locator('.concert-poster:not(.land) .poster-open').first().click()
    await expect(page.locator('.lb-stage img')).toHaveClass(/loaded/)
    await expectLightboxGeometry(page)
    await expect(page.locator('.lightbox')).toHaveScreenshot(`${theme}-lightbox-portrait.png`, componentScreenshotOptions)
    await page.keyboard.press('Escape')
    await expect(page.locator('.lightbox')).toHaveCount(0)

    await page.setViewportSize({ width: 390, height: 844 })
    await page.locator('.concert-poster:not(.land) .poster-open').first().click()
    await expect(page.locator('.lb-stage img')).toHaveClass(/loaded/)
    await expectLightboxGeometry(page)
    await expect(page.locator('.lightbox')).toHaveScreenshot(`${theme}-lightbox-mobile.png`, componentScreenshotOptions)
  })
}

for (const viewport of englishHomeViewports) {
  for (const theme of themes) {
    test(`captures English home leadership ${theme} ${viewport.name} visual baseline`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await installTheme(page, theme)
      await page.goto('/en/')
      await settlePage(page)

      const leadershipColumn = page.locator('#home-beyond .beyond-column').first()
      await leadershipColumn.scrollIntoViewIfNeeded()
      await expect(leadershipColumn).toHaveClass(/revealed/)
      await page.locator('.skip-link').evaluate((element) => element.blur())
      await page.evaluate(() => {
        const header = document.querySelector<HTMLElement>('.site-nav')
        const target = document.querySelector<HTMLElement>('#home-beyond .beyond-column')
        if (!header || !target) throw new Error('English home visual targets are missing')

        const overlap = header.getBoundingClientRect().bottom + 16 - target.getBoundingClientRect().top
        if (overlap > 0) window.scrollBy(0, -overlap)
      })
      await expect(leadershipColumn).toHaveScreenshot(`english-home-beyond-${theme}-${viewport.name}.png`, componentScreenshotOptions)
    })
  }
}

for (const route of englishArchiveHeroRoutes) {
  for (const theme of themes) {
    for (const viewport of viewports) {
      test(`captures English ${route.name} hero ${theme} ${viewport.name} visual baseline`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        await installTheme(page, theme)
        await page.goto(route.route)
        await settlePage(page)

        const hero = page.locator('.hero-main')
        await expect(hero).toBeVisible()
        await expect(hero).toHaveScreenshot(
          `english-hero-${route.name}-${theme}-${viewport.name}.png`,
          componentScreenshotOptions
        )
      })
    }
  }
}

for (const theme of themes) {
  for (const viewport of viewports) {
    test(`captures AP Microeconomics dossier ${theme} ${viewport.name} visual baseline`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await installTheme(page, theme)
      await page.goto('/works.html#project-ap-microeconomics-notes')
      await settlePage(page)

      const project = page.locator('#project-ap-microeconomics-notes')
      await project.scrollIntoViewIfNeeded()
      await expect(project).toHaveClass(/revealed/)
      await expect(project).toHaveScreenshot(`works-ap-${theme}-${viewport.name}.png`, componentScreenshotOptions)
    })
  }
}

for (const route of ['research', 'works'] as const) {
  for (const theme of themes) {
    for (const viewport of viewports) {
      test(`captures ${route} floating header ${theme} ${viewport.name} visual baseline`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        await installTheme(page, theme)
        await page.goto(`/${route}.html`)
        await settlePage(page)
        await settleFloatingHeader(page, route)
        await expect(page.locator('.site-nav-surface')).toHaveScreenshot(
          `header-floating-${route}-${theme}-${viewport.name}.png`,
          componentScreenshotOptions
        )
      })
    }
  }
}

test('200 percent zoom-equivalent reflow keeps keyboard reading usable', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 844 })
  await page.goto('/research.html')

  const target = page.locator('.tl-link').first()
  await target.scrollIntoViewIfNeeded()
  await target.focus()
  const layout = await target.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    const headerBottom = document.querySelector<HTMLElement>('.site-nav')?.getBoundingClientRect().bottom ?? 0
    return {
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      top: rect.top,
      bottom: rect.bottom,
      headerBottom,
      viewportHeight: window.innerHeight
    }
  })

  expect(layout.documentWidth, JSON.stringify(layout)).toBeLessThanOrEqual(layout.viewportWidth)
  expect(layout.top, JSON.stringify(layout)).toBeGreaterThanOrEqual(layout.headerBottom)
  expect(layout.bottom, JSON.stringify(layout)).toBeLessThanOrEqual(layout.viewportHeight)
  await expect(target).toBeFocused()
})
