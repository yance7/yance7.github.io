import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { htmlPageEntries, pageEntries } from '../../src/data/pageRegistry'

const archiveRoutes = htmlPageEntries.map(({ htmlName }) => `${htmlName}.html`)

const documentEndBuffer = 240
const documentEndSettlementPasses = 3

async function settleDocumentEnd(page: Page) {
  let lastGeometry: {
    scrollHeightBefore: number
    scrollHeight: number
    maxScrollY: number
    scrollY: number
    heightStable: boolean
    positionSettled: boolean
    nearDocumentEnd: boolean
  } | null = null

  for (let pass = 0; pass < documentEndSettlementPasses; pass += 1) {
    const scrollHeightBefore = await page.evaluate(() => {
      const { documentElement } = document
      const maxScrollY = Math.max(0, documentElement.scrollHeight - window.innerHeight)
      window.scrollTo({ top: maxScrollY, left: 0, behavior: 'instant' })
      return documentElement.scrollHeight
    })

    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve())
          })
        })
    )

    lastGeometry = await page.evaluate(
      ({ scrollHeightBefore: initialScrollHeight, buffer }) => {
        const { documentElement } = document
        const scrollHeight = documentElement.scrollHeight
        const maxScrollY = Math.max(0, scrollHeight - window.innerHeight)
        const scrollY = window.scrollY

        return {
          scrollHeightBefore: initialScrollHeight,
          scrollHeight,
          maxScrollY,
          scrollY,
          heightStable: scrollHeight === initialScrollHeight,
          positionSettled: Math.abs(scrollY - maxScrollY) <= 1,
          nearDocumentEnd: scrollY + window.innerHeight >= scrollHeight - buffer
        }
      },
      { scrollHeightBefore, buffer: documentEndBuffer }
    )

    if (lastGeometry.heightStable && lastGeometry.positionSettled && lastGeometry.nearDocumentEnd) return
  }

  throw new Error(
    `document-end reveal geometry did not settle after ${documentEndSettlementPasses} passes: ${JSON.stringify(lastGeometry)}`
  )
}

async function settleAccessibilityState(page: Page) {
  await page.waitForLoadState('domcontentloaded')
  await expect(page.locator('main#main')).toBeVisible()

  await expect(page.locator('html')).toHaveAttribute(
    'data-fonts-ready',
    'ready',
    { timeout: 10_000 }
  )

  await settleDocumentEnd(page)
  await expect.poll(
    () => page.locator('.reveal:not(.revealed)').count(),
    {
      timeout: 5_000,
      message: 'all deferred reveal content should be revealed before axe audit'
    }
  ).toBe(0)

  await expect.poll(
    () =>
      page.locator('.reveal').evaluateAll((elements) =>
        elements.every((element) => {
          const style = getComputedStyle(element)
          // WebKit serializes finished `transform: none` animations as identity matrices.
          const transformMatch = style.transform.match(/^matrix(3d)?\((.+)\)$/)
          const transformValues = transformMatch?.[2]?.split(',').map(Number)
          const identityTransform = transformMatch?.[1]
            ? [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
            : [1, 0, 0, 1, 0, 0]
          const transformIsFinal =
            style.transform === 'none' ||
            (transformValues?.length === identityTransform.length &&
              transformValues.every((value, index) => Math.abs(value - (identityTransform[index] ?? 0)) < 0.001))

          return (
            Number.parseFloat(style.opacity || '1') >= 0.999 &&
            transformIsFinal &&
            style.filter === 'none' &&
            style.clipPath === 'none'
          )
        })
      ),
    {
      timeout: 5_000,
      message: 'reveal transitions should reach their final visual state before axe audit'
    }
  ).toBe(true)

  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        window.scrollTo(0, 0)
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve())
        })
      })
  )
}

async function expectAccessible(page: Page) {
  await settleAccessibilityState(page)

  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
}

test('brand mark links header and footer back to the localized home page', async ({ page }) => {
  await page.goto('/en/research.html')

  const headerBrand = page.locator('.site-nav .wordmark')
  const footerBrand = page.locator('.site-footer .foot-mark')

  await expect(headerBrand).toHaveAttribute('href', '/en/')
  await expect(headerBrand).toHaveAttribute('aria-label', /Yance\./)
  await expect(headerBrand.locator('.brand-mark')).toHaveAttribute('aria-hidden', 'true')
  await expect(headerBrand.locator('.brand-mark-svg')).toBeVisible()
  await expect(headerBrand.locator('.brand-mark-image')).toHaveCount(0)
  await expect(headerBrand.locator('[data-brand-part="y"]')).toHaveCount(1)
  await expect(headerBrand.locator('[data-brand-part="orbit"]')).toHaveCount(1)
  await expect(headerBrand.locator('[data-brand-part="audio"]')).toHaveCount(1)
  await expect(headerBrand.locator('[data-brand-part="neural"]')).toHaveCount(1)

  const headerBox = await headerBrand.boundingBox()
  expect(headerBox, 'header brand hit area').not.toBeNull()
  expect(Math.round(headerBox?.width ?? 0), 'header brand width').toBeGreaterThanOrEqual(44)
  expect(Math.round(headerBox?.height ?? 0), 'header brand height').toBeGreaterThanOrEqual(44)

  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight)
  })

  await expect(footerBrand).toBeVisible()
  await expect(footerBrand).toHaveAttribute('href', '/en/')
  await expect(footerBrand.locator('.brand-mark-svg')).toBeVisible()
  await expect(footerBrand.locator('.brand-mark-image')).toHaveCount(0)
})

test('shared navigation mark keeps its identity across light and dark themes', async ({ page }) => {
  await page.goto('/en/research.html')

  for (const theme of ['light', 'dark']) {
    await page.evaluate((value) => localStorage.setItem('yance-theme', value), theme)
    await page.reload()

    const mark = page.locator('.site-nav .brand-mark-svg')
    await expect(mark).toBeVisible()
    const geometry = await mark.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      const y = element.querySelector('[data-brand-part="y"]')
      const audio = element.querySelector('.brand-mark-audio-ribbon')
      return {
        width: rect.width,
        height: rect.height,
        yFill: y ? getComputedStyle(y).fill : '',
        audioStroke: audio ? getComputedStyle(audio).stroke : ''
      }
    })
    expect(geometry.width).toBeGreaterThanOrEqual(32)
    expect(geometry.height).toBeGreaterThanOrEqual(32)
    expect(geometry.yFill).not.toBe('none')
    expect(geometry.audioStroke).not.toBe('none')
  }
})

test('brand mark keeps header geometry across locales, themes, and supported viewports', async ({ page }) => {
  const viewports = [
    { width: 1200, height: 900 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 }
  ]
  const routes = ['/research.html', '/zh-hk/research.html', '/en/research.html']

  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    for (const route of routes) {
      await page.goto(route)
      for (const theme of ['light', 'dark']) {
        await page.evaluate((value) => localStorage.setItem('yance-theme', value), theme)
        await page.reload()

        const brandLink = page.locator('.site-nav .wordmark')
        const mark = brandLink.locator('.brand-mark-svg')
        await expect(mark).toBeVisible()
        await expect(page.locator('.site-footer .brand-mark-svg')).toBeAttached()
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme)

        const geometry = await brandLink.evaluate((element) => {
          const rect = element.getBoundingClientRect()
          const svg = element.querySelector<SVGElement>('.brand-mark-svg')
          return {
            width: rect.width,
            height: rect.height,
            markWidth: svg?.getBoundingClientRect().width ?? 0,
            markHeight: svg?.getBoundingClientRect().height ?? 0,
            documentWidth: document.documentElement.scrollWidth,
            viewportWidth: window.innerWidth
          }
        })

        expect(geometry.width, `${route} ${theme} ${viewport.width}px hit area`).toBeGreaterThanOrEqual(44)
        expect(geometry.height, `${route} ${theme} ${viewport.width}px hit area`).toBeGreaterThanOrEqual(44)
        expect(geometry.markWidth).toBeGreaterThan(0)
        expect(geometry.markHeight).toBeGreaterThan(0)
        expect(geometry.documentWidth, `${route} ${theme} ${viewport.width}px overflow`).toBeLessThanOrEqual(geometry.viewportWidth)
      }
    }
  }

  await page.goto('/en/research.html')
  const brandLink = page.locator('.site-nav .wordmark')
  await brandLink.focus()
  await expect(brandLink).toBeFocused()
  await expect.poll(() => brandLink.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe('none')
})

test('brand mark preserves zh-HK localized home navigation', async ({ page }) => {
  await page.goto('/zh-hk/research.html')

  await expect(page.locator('.site-nav .wordmark')).toHaveAttribute('href', '/zh-hk/')
})

test('brand mark preserves root locale home navigation', async ({ page }) => {
  await page.goto('/research.html')

  await expect(page.locator('.site-nav .wordmark')).toHaveAttribute('href', '/')
})

test('simplified brand icons are wired for browser shells and PWA metadata', async ({ page }) => {
  await page.goto('/en/research.html')

  await expect(page.locator('link[rel="icon"][sizes="16x16"]')).toHaveAttribute(
    'href',
    '/assets/brand/favicon-16.png'
  )
  await expect(page.locator('link[rel="icon"][sizes="32x32"]')).toHaveAttribute(
    'href',
    '/assets/brand/favicon-32.png'
  )
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    'href',
    '/assets/brand/yance-icon-180.png'
  )

  const manifest = await page.evaluate(async () => {
    const response = await fetch('/assets/site.webmanifest')
    return response.json() as Promise<{ icons: Array<{ src: string; purpose: string; sizes: string; type: string }> }>
  })
  expect(manifest.icons).toEqual([
    { src: '/assets/brand/yance-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/assets/brand/yance-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
  ])
})

test('all archive pages boot and expose the main landmark', async ({ page }) => {
  for (const route of archiveRoutes) {
    await page.goto(`/${route}`)
    await expect(page.locator('main#main')).toBeVisible()
  }
})

test('archive layouts avoid horizontal overflow on narrow screens', async ({ page }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 })
    for (const route of archiveRoutes) {
      await page.goto(`/${route}`)
      const layout = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        viewportWidth: window.innerWidth
      }))
      expect(layout.documentWidth, `${route} document at ${width}px`).toBeLessThanOrEqual(layout.viewportWidth)
      expect(layout.bodyWidth, `${route} body at ${width}px`).toBeLessThanOrEqual(layout.viewportWidth)
    }
  }
})

test('mobile navigation opens, traps focus, and closes explicitly', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/index.html')
  await page.locator('.menu-trigger').click()
  await expect(page.locator('.mobile-menu-overlay')).toBeVisible()
  await expect(page.locator('.mobile-menu-close')).toBeFocused()
  await expect(page.locator('.mobile-menu a.active')).toHaveAttribute('aria-current', 'page')
  await page.keyboard.press('Tab')
  await expect(page.locator('.mobile-menu a').first()).toBeFocused()
  await page.locator('.mobile-menu-close').click()
  await expect(page.locator('.mobile-menu-overlay')).toHaveCount(0)
})

test('theme preference persists after reload', async ({ page }) => {
  await page.goto('/index.html')
  await page.evaluate(() => localStorage.removeItem('yance-theme'))
  await page.reload()
  await page.locator('.theme-orbit').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('rapid theme toggles commit deterministically', async ({ page }) => {
  await page.goto('/index.html')
  await page.evaluate(() => localStorage.setItem('yance-theme', 'light'))
  await page.reload()

  await page.locator('.theme-orbit').evaluate((element: HTMLElement) => {
    element.click()
    element.click()
  })

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('yance-theme'))).toBe('light')
})

test('deferred fonts do not cause material late layout shift', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Chromium is the supported layout-shift measurement project')

  await page.addInitScript(() => {
    type FontShiftWindow = Window & {
      __fontLayoutShifts?: Array<{ startTime: number; value: number }>
      __fontLayoutShiftSupported?: boolean
    }

    const shiftWindow = window as FontShiftWindow
    shiftWindow.__fontLayoutShifts = []
    shiftWindow.__fontLayoutShiftSupported = PerformanceObserver.supportedEntryTypes?.includes('layout-shift') === true
    if (!shiftWindow.__fontLayoutShiftSupported) return

    new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        const shift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number }
        if (!shift.hadRecentInput) {
          shiftWindow.__fontLayoutShifts?.push({ startTime: shift.startTime, value: shift.value })
        }
      })
    }).observe({ type: 'layout-shift', buffered: true })
  })

  await page.goto('/index.html')
  await expect.poll(() => page.locator('html').getAttribute('data-fonts-ready')).toBe('ready')
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  }))

  const metrics = await page.evaluate(() => {
    type FontShiftWindow = Window & {
      __fontLayoutShifts?: Array<{ startTime: number; value: number }>
      __fontLayoutShiftSupported?: boolean
    }

    const shiftWindow = window as FontShiftWindow
    return {
      lateShift: shiftWindow.__fontLayoutShifts
        ?.filter(({ startTime }) => startTime > 1500)
        .reduce((total, shift) => total + shift.value, 0) ?? 0,
      supported: shiftWindow.__fontLayoutShiftSupported === true
    }
  })

  expect(metrics.supported, 'Chromium must expose layout-shift entries for this gate').toBe(true)
  expect(metrics.lateShift).toBeLessThan(0.01)
})

test('static metric surfaces do not advertise elevation on hover', async ({ page }) => {
  await page.goto('/academics.html')
  const metric = page.locator('.metric-card').first()
  await metric.scrollIntoViewIfNeeded()
  await expect.poll(() => metric.evaluate((element) => getComputedStyle(element).transform)).toBe('none')
  const before = await metric.evaluate((element) => getComputedStyle(element).transform)
  await metric.hover()
  const after = await metric.evaluate((element) => getComputedStyle(element).transform)
  expect(after).toBe(before)
})

test('research timeline highlights the item in the reading zone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/research.html')

  const items = page.locator('.tl-item')
  await expect(items.first()).toBeVisible()
  expect(await items.count()).toBeGreaterThanOrEqual(2)

  for (let index = 0; index < 2; index += 1) {
    await items.nth(index).evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'auto' }))
    await expect(items.nth(index)).toHaveAttribute('data-reading-state', 'current')
    if (index > 0) await expect(items.nth(index - 1)).toHaveAttribute('data-reading-state', 'idle')
  }
})

test('research timeline clears current state outside the reading zone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/research.html')

  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'auto' }))
  await expect.poll(() => page.locator('.tl-item[data-reading-state="current"]').count()).toBe(0)
})

test('research status markers keep a static hierarchy without competing pulses', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/research.html')

  const contentMarkers = page.locator('.status-badge.active .status-dot, .tc-head-status i, .tl-item.active .tl-node i')
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
  await expect(contentMarkers.first()).toBeAttached()
  expect(await contentMarkers.count()).toBeGreaterThan(0)
  const animations = await contentMarkers.evaluateAll((elements) =>
    elements.map((element) => getComputedStyle(element).animationName)
  )
  expect(animations.every((animation) => animation === 'none')).toBe(true)

  const firstItem = page.locator('.tl-item').first()
  await firstItem.evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'auto' }))
  await expect(firstItem).toHaveAttribute('data-reading-state', 'current')
  const currentNode = firstItem.locator('.tl-node')
  await expect.poll(() => currentNode.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe('none')
  await expect(page.locator('.nav-status b')).toHaveCSS('animation-name', 'pulse')
})

test('research timeline removes breathing motion when reduced motion is enabled', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/research.html')

  const firstItem = page.locator('.tl-item').first()
  await firstItem.evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'auto' }))
  await expect(firstItem).toHaveAttribute('data-reading-state', 'current')
  await expect(firstItem.locator('.tl-node i')).toHaveCSS('animation-name', 'none')
})

test('slow page chunks still settle deep links and compass state', async ({ page }) => {
  let requestCount = 0
  await page.route(/\/(?:assets\/vue\/WorksPage-[^/]+\.js|src\/pages\/WorksPage\.vue)(?:\?.*)?$/, async (route) => {
    requestCount += 1
    await new Promise((resolve) => setTimeout(resolve, 5200))
    await route.continue()
  })

  await page.goto('/works.html#project-fresheye')
  await expect(page.locator('#project-fresheye')).toBeVisible({ timeout: 30000 })
  expect(requestCount).toBeGreaterThan(0)
  await expect.poll(() => page.locator('#project-fresheye').evaluate((element) => Math.round(element.getBoundingClientRect().top))).toBeGreaterThanOrEqual(12)
  await expect(page.locator('.page-compass-link[href="#project-fresheye"]')).toHaveAttribute('aria-current', 'location')
})

test('failed page chunks render a controlled error without a reload loop', async ({ page }) => {
  let requestCount = 0
  await page.route(/\/(?:assets\/vue\/WorksPage-[^/]+\.js|src\/pages\/WorksPage\.vue)(?:\?.*)?$/, async (route) => {
    requestCount += 1
    await route.abort('failed')
  })

  await page.goto('/works.html')
  await expect(page.locator('[data-page-load-state="error"]')).toBeVisible({ timeout: 15000 })
  await expect(page.locator('.page-load-error')).toBeVisible()
  expect(requestCount).toBeLessThanOrEqual(3)
  await page.waitForLoadState('networkidle')
  expect(requestCount).toBeLessThanOrEqual(3)
})

test('signature surfaces track fine-pointer sheen without changing typography', { tag: '@fine-pointer' }, async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Fine-pointer interaction is intentionally disabled on touch projects')
  const targets = [
    ['index.html', '.focus-card'],
    ['works.html', '.showcase'],
    ['concerts.html', '.concert-poster']
  ] as const

  for (const [route, selector] of targets) {
    await page.goto(`/${route}`)
    const surface = page.locator(selector).first()
    await surface.scrollIntoViewIfNeeded()
    await expect(surface).toHaveAttribute('data-pointer-sheen', '')
    const before = await surface.evaluate((element) => {
      const style = getComputedStyle(element)
      return {
        x: style.getPropertyValue('--pointer-x').trim(),
        weight: style.fontWeight,
        spacing: style.letterSpacing
      }
    })
    const box = await surface.boundingBox()
    expect(box).not.toBeNull()
    await page.mouse.move((box?.x ?? 0) + (box?.width ?? 0) * .8, (box?.y ?? 0) + (box?.height ?? 0) * .25)
    await expect.poll(() => surface.evaluate((element) => getComputedStyle(element).getPropertyValue('--pointer-x').trim())).not.toBe(before.x)
    const after = await surface.evaluate((element) => {
      const style = getComputedStyle(element)
      return { weight: style.fontWeight, spacing: style.letterSpacing }
    })
    expect(after).toEqual({ weight: before.weight, spacing: before.spacing })
  }
})

test('signature pointer sheen stays static with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/index.html')
  const surface = page.locator('.focus-card').first()
  await surface.scrollIntoViewIfNeeded()
  const box = await surface.boundingBox()
  await page.mouse.move((box?.x ?? 0) + (box?.width ?? 0) * .8, (box?.y ?? 0) + (box?.height ?? 0) * .2)
  await expect(surface).toHaveCSS('--pointer-x', '50%')
  await expect(surface).toHaveCSS('--pointer-y', '50%')
})

test('page compass exposes page-specific sections without covering narrow layouts', async ({ page }) => {
  const expectations = pageEntries.map(({ htmlName, sectionIds }) => [`${htmlName}.html`, sectionIds.length] as const)

  for (const [route, sectionCount] of expectations) {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`/${route}`)
    await expect(page.locator('.page-compass-link')).toHaveCount(sectionCount)
    const layout = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
      compassBottom: document.querySelector('.page-compass')!.getBoundingClientRect().bottom,
      footerPaddingBottom: parseFloat(getComputedStyle(document.querySelector('.site-footer')!).paddingBottom)
    }))
    expect(layout.document).toBeLessThanOrEqual(layout.viewport)
    expect(layout.compassBottom).toBeLessThanOrEqual(844)
    expect(layout.footerPaddingBottom).toBeGreaterThanOrEqual(76)

    const compactTargets = await page.locator('.page-compass-trigger').evaluateAll((elements) => elements.map((element) => {
      const bounds = element.getBoundingClientRect()
      return { width: bounds.width, height: bounds.height }
    }))
    compactTargets.forEach(({ width, height }) => {
      expect(Math.round(width)).toBeGreaterThanOrEqual(44)
      expect(Math.round(height)).toBeGreaterThanOrEqual(44)
    })

    await page.locator('.page-compass-trigger').click()
    const expandedTargets = await page.locator('.page-compass button, .page-compass a').evaluateAll((elements) => elements
      .filter((element) => {
        const style = getComputedStyle(element)
        const bounds = element.getBoundingClientRect()
        return style.visibility !== 'hidden' && bounds.width > 0 && bounds.height > 0
      })
      .map((element) => {
        const bounds = element.getBoundingClientRect()
        return { width: bounds.width, height: bounds.height }
      }))
    expandedTargets.forEach(({ width, height }) => {
      expect(Math.round(width)).toBeGreaterThanOrEqual(44)
      expect(Math.round(height)).toBeGreaterThanOrEqual(44)
    })
  }

  await page.goto('/404.html')
  await expect(page.locator('.page-compass')).toHaveCount(0)
})

test('mobile compass keeps focus priority inside a compact visual frame', async ({ page }) => {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 844, height: 390 }
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/honors.html')
    const compass = page.locator('.page-compass')
    const trigger = compass.locator('.page-compass-trigger')
    const panel = compass.locator('.page-compass-panel')

    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(trigger).toBeVisible()
    await trigger.focus()
    await expect(trigger).toBeFocused()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await expect(panel).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(trigger).toBeFocused()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(panel).toHaveAttribute('aria-hidden', 'true')

    await trigger.click()
    await expect(panel).toBeVisible()
    await compass.locator('.page-compass-link').last().click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(panel).toHaveAttribute('inert', '')

    const geometry = await compass.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      return {
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height
      }
    })
    expect(geometry.left).toBeGreaterThanOrEqual(0)
    expect(geometry.right).toBeLessThanOrEqual(viewport.width)
    expect(geometry.bottom).toBeLessThanOrEqual(viewport.height)
    if (viewport.width <= 760) expect(geometry.width).toBeLessThanOrEqual(viewport.width - 24)

    const targets = await compass.locator('button:visible, a:visible').evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect()
        return {
          label: element.getAttribute('aria-label') ?? element.textContent?.trim() ?? element.tagName,
          width: rect.width,
          height: rect.height
        }
      })
    )
    expect(
      targets.every(({ width, height }) => Math.round(width) >= 44 && Math.round(height) >= 44),
      `${viewport.width}×${viewport.height} targets: ${JSON.stringify(targets)}`
    ).toBe(true)
  }
})

test('interactive states remain accessible after opening', async ({ page }) => {
  test.setTimeout(60000)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/index.html')
  await page.locator('.menu-trigger').click()
  await expectAccessible(page)
  await page.locator('.mobile-menu-close').click()

  await page.goto('/honors.html')
  await expect(page.locator('.honor-card').first()).toBeVisible()
  await expectAccessible(page)

  await page.goto('/research.html')
  await page.locator('.method-toggle').first().click()
  await expectAccessible(page)

  await page.goto('/works.html')
  await expectAccessible(page)

  await page.goto('/concerts.html')
  await page.locator('.poster-open').first().click()
  await expect(page.locator('.lightbox')).toBeVisible()
  await expectAccessible(page)
  await page.keyboard.press('Escape')
})

test('rapid control clicks settle without duplicate or stale state', async ({ page }) => {
  test.setTimeout(60000)
  await page.goto('/honors.html')
  const filter = page.locator('.filter-btn').filter({ hasText: '卓越级' })
  for (let i = 0; i < 5; i += 1) await filter.click()
  await expect(filter).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.honor-card')).toHaveCount(2)

  await page.goto('/research.html')
  const method = page.locator('.method-toggle').first()
  for (let i = 0; i < 4; i += 1) await method.dispatchEvent('click')
  await expect(method).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('.method-disclosure').first()).not.toHaveClass(/open/)

  await page.goto('/concerts.html')
  const carousel = page.locator('.concert-poster').filter({ has: page.locator('.carousel-controls') }).first()
  const next = carousel.locator('button[aria-label="下一张"]')
  await expect(next).toBeVisible()
  await expect(next).toBeEnabled()
  for (let i = 0; i < 8; i += 1) await next.dispatchEvent('click')
  await expect(carousel.locator('.carousel-controls span')).toHaveText(/\d+ \/ \d+/)
})

test('Works wordmarks keep typography on hover', async ({ page }) => {
  await page.goto('/works.html')
  const showcases = page.locator('.showcase')
  await expect(showcases).toHaveCount(1)

  for (let index = 0; index < 1; index += 1) {
    const before = await page.locator('.sc-wordmark').evaluateAll((elements) =>
      elements.map((element) => {
        const style = getComputedStyle(element)
        return {
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          letterSpacing: style.letterSpacing
        }
      })
    )
    const chineseSize = await showcases.nth(index).locator('.sc-identity h3 > span').evaluate((element) => getComputedStyle(element).fontSize)
    expect(before[index]?.fontSize).toBe(chineseSize)
    const box = await showcases.nth(index).boundingBox()
    expect(box).not.toBeNull()
    await page.mouse.move((box?.x ?? 0) + (box?.width ?? 0) / 2, (box?.y ?? 0) + (box?.height ?? 0) / 2)
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())))
    const after = await page.locator('.sc-wordmark').evaluateAll((elements) =>
      elements.map((element) => {
        const style = getComputedStyle(element)
        return {
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          letterSpacing: style.letterSpacing
        }
      })
    )
    expect(after).toEqual(before)
  }
})


for (const route of archiveRoutes) {
  test(`axe audit: ${route}`, async ({ page }) => {
    await page.goto(`/${route}`)
    await expectAccessible(page)
  })
}
