import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { htmlPageEntries, pageEntries } from '../../src/data/pageRegistry'

const archiveRoutes = htmlPageEntries.map(({ htmlName }) => `${htmlName}.html`)

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
}

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

test('page compass unifies section navigation, reading progress, and return to top', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 })
  await page.goto('/honors.html')
  const compass = page.locator('.page-compass')
  const archiveLink = compass.locator('.page-compass-link[href="#sec-honors-archive"]')

  await expect(compass).toBeVisible()
  await expect(compass.locator('.page-compass-link')).toHaveCount(2)
  await archiveLink.click()
  await expect(page).toHaveURL(/honors\.html#sec-honors-archive/)
  await expect(archiveLink).toHaveAttribute('aria-current', 'location')
  await expect.poll(() => compass.locator('.page-compass-progress').getAttribute('aria-label')).toMatch(/\d+%/)

  await compass.locator('.page-compass-top').click()
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBeLessThan(8)
  await expect(compass.locator('.page-compass-link').first()).toHaveAttribute('aria-current', 'location')
  await expect(page.locator('.section-dots, .scroll-to-top')).toHaveCount(0)
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

test('desktop PageCompass is the primary progress surface', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/research.html')
  await expect(page.locator('.page-compass')).toBeVisible()
  await expect(page.locator('.scroll-progress')).toHaveCSS('opacity', '0')
})

test('research timeline highlights the item in the reading zone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/research.html')

  const items = page.locator('.tl-item')
  expect(await items.count()).toBeGreaterThanOrEqual(2)

  for (let index = 0; index < 2; index += 1) {
    await items.nth(index).evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'auto' }))
    await expect(items.nth(index)).toHaveAttribute('data-reading-state', 'current')
    if (index > 0) await expect(items.nth(index - 1)).toHaveAttribute('data-reading-state', 'idle')
  }
})

test('research status markers keep a static hierarchy without competing pulses', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 })
  await page.goto('/research.html')

  const contentMarkers = page.locator('.status-badge.active .status-dot, .tc-head-status i, .tl-item.active .tl-node i')
  expect(await contentMarkers.count()).toBeGreaterThan(0)
  const animations = await contentMarkers.evaluateAll((elements) =>
    elements.map((element) => getComputedStyle(element).animationName)
  )
  expect(animations.every((animation) => animation === 'none')).toBe(true)

  const currentNode = page.locator('.tl-item[data-reading-state="current"] .tl-node').first()
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

test('site navigation stays pinned and every compass destination clears it', async ({ page }) => {
  test.setTimeout(60000)
  await page.setViewportSize({ width: 1200, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const destinations = [
    ['index.html', '#home-beyond'],
    ['academics.html', '#sec-ap-archive'],
    ['honors.html', '#sec-honors-archive'],
    ['research.html', '#sec-toolchain'],
    ['works.html', '#project-fresheye'],
    ['concerts.html', '#concert-archive']
  ] as const

  for (const [route, destination] of destinations) {
    await page.goto(`/${route}`)
    const navigation = page.locator('.site-nav')
    await page.evaluate(() => window.scrollTo({ top: 900, behavior: 'auto' }))
    await expect.poll(() => navigation.evaluate((element) => Math.round(element.getBoundingClientRect().top))).toBe(0)

    await page.locator(`.page-compass-link[href="${destination}"]`).click()
    const navBottom = await navigation.evaluate((element) => element.getBoundingClientRect().bottom)
    await expect.poll(
      () => page.locator(destination).evaluate((element) => element.getBoundingClientRect().top),
      { message: `${route}${destination}` }
    ).toBeGreaterThanOrEqual(navBottom + 12)
  }
})

test('direct deep links settle below the pinned navigation', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 })
  await page.goto('/works.html#project-fresheye')

  const navigation = page.locator('.site-nav')
  const navBottom = await navigation.evaluate((element) => element.getBoundingClientRect().bottom)
  await expect.poll(() => page.locator('#project-fresheye').evaluate((element) => element.getBoundingClientRect().top)).toBeGreaterThanOrEqual(navBottom + 12)
  await expect(page.locator('.page-compass-link[href="#project-fresheye"]')).toHaveAttribute('aria-current', 'location')
})

test('slow page chunks still settle deep links and compass state', async ({ page }) => {
  let requestCount = 0
  await page.route('**/assets/vue/WorksPage-*.js', async (route) => {
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
  await page.route('**/assets/vue/WorksPage-*.js', async (route) => {
    requestCount += 1
    await route.abort('failed')
  })

  await page.goto('/works.html')
  await expect(page.locator('[data-page-load-state="error"]')).toBeVisible({ timeout: 15000 })
  await expect(page.locator('.page-load-error')).toBeVisible()
  expect(requestCount).toBeLessThanOrEqual(3)
  await page.waitForTimeout(300)
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
  const expectations = pageEntries.map(({ htmlName, sections }) => [`${htmlName}.html`, sections.length] as const)

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

    const compactTargets = await page.locator('.page-compass button, .page-compass a').evaluateAll((elements) => elements.map((element) => {
      const bounds = element.getBoundingClientRect()
      return { width: bounds.width, height: bounds.height }
    }))
    compactTargets.forEach(({ width, height }) => {
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

    if (viewport.width <= 760) {
      await expect(compass).toHaveAttribute('data-mobile-state', 'quiet')
      await page.evaluate(() => window.scrollTo({ top: 700, behavior: 'auto' }))
      await expect(compass).toHaveAttribute('data-mobile-state', 'reading')
      await expect.poll(() => compass.getAttribute('data-mobile-state'), { timeout: 1200 }).toBe('visible')
    } else {
      await expect(compass).toHaveAttribute('data-mobile-state', 'visible')
    }

    const topControl = compass.locator('.page-compass-top')
    await topControl.focus()
    await expect(topControl).toBeFocused()
    await expect(compass).toHaveAttribute('data-mobile-state', 'visible')

    if (viewport.width <= 760) {
      await page.evaluate(() => window.scrollBy({ top: 120, behavior: 'auto' }))
      await expect(compass).toHaveAttribute('data-mobile-state', 'visible')
    }

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
    if (viewport.width <= 760) {
      expect(geometry.width).toBeLessThanOrEqual(viewport.width - 24)
      expect(geometry.height).toBeLessThanOrEqual(58)
    }

    const targets = await compass.locator('button, a').evaluateAll((elements) =>
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
  await page.setViewportSize({ width: 390, height: 844 })
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
  for (let i = 0; i < 8; i += 1) await next.click()
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
