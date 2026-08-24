import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { htmlPageEntries } from '../../src/data/pageRegistry'

const archiveRoutes = htmlPageEntries.map(({ htmlName }) => `${htmlName}.html`)

test('compatibility pages boot without horizontal overflow', async ({ page }) => {
  for (const route of archiveRoutes) {
    await page.goto(`/${route}`)
    await expect(page.locator('main#main')).toBeVisible()
    const layout = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      viewportWidth: window.innerWidth
    }))
    expect(layout.documentWidth, route).toBeLessThanOrEqual(layout.viewportWidth)
    expect(layout.bodyWidth, route).toBeLessThanOrEqual(layout.viewportWidth)
  }
})

test('compatibility hash navigation and PageCompass settle together', async ({ page }) => {
  await page.goto('/works.html#project-fresheye')
  const target = page.locator('#project-fresheye')
  await expect(target).toBeVisible()
  await expect.poll(() => target.evaluate((element) => Math.round(element.getBoundingClientRect().top))).toBeGreaterThanOrEqual(12)
  await expect(page.locator('.page-compass-link[href="#project-fresheye"]')).toHaveAttribute('aria-current', 'location')
})

test('keyboard focus targets stay clear of sticky navigation surfaces', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/research.html')

  const target = page.locator('.tl-link').first()
  await expect(target).toBeVisible()
  await target.focus()

  const geometry = await target.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    const header = document.querySelector<HTMLElement>('.site-nav')?.getBoundingClientRect()
    const compass = document.querySelector<HTMLElement>('.page-compass')?.getBoundingClientRect()
    const compassVisible = compass && getComputedStyle(document.querySelector<HTMLElement>('.page-compass')!).visibility !== 'hidden'
    const intersectsCompass = Boolean(compassVisible && compass && rect.right > compass.left && rect.left < compass.right && rect.bottom > compass.top && rect.top < compass.bottom)
    return {
      headerBottom: header?.bottom ?? 0,
      intersectsCompass,
      top: rect.top,
      bottom: rect.bottom,
      viewportHeight: window.innerHeight
    }
  })

  expect(geometry.top, 'focused target below sticky header').toBeGreaterThanOrEqual(geometry.headerBottom)
  expect(geometry.bottom, 'focused target inside viewport').toBeLessThanOrEqual(geometry.viewportHeight)
  expect(geometry.intersectsCompass, 'focused target clear of PageCompass').toBe(false)
})

test('PageCompass exposes progress text and a single active chapter', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/works.html')

  await expect(page.locator('.scroll-progress')).toHaveAttribute('aria-valuetext', /阅读进度/)
  await expect(page.locator('.page-compass-current span')).toHaveText('01 / 02')
  await expect(page.locator('.page-compass-link.active')).toHaveCount(1)
  await expect(page.locator('.page-compass-link.active > span:not(.page-compass-tooltip)')).toHaveText('01')
  await expect(page.locator('.page-compass-link.active')).toHaveAttribute('aria-current', 'location')
})

test('coarse-pointer shared controls keep 44px touch targets', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-android-smoke', 'Android-specific coarse-pointer contract')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/works.html')

  for (const selector of ['.sc-actions .y-button', '.sc-proof-links .y-archive-link']) {
    const box = await page.locator(selector).first().boundingBox()
    expect(box, `${selector} geometry`).not.toBeNull()
    expect(box!.height, `${selector} height`).toBeGreaterThanOrEqual(44)
  }

  await page.goto('/index.html')
  await page.locator('.menu-trigger').click()
  const closeButton = page.locator('.mobile-menu-close')
  await expect(closeButton).toBeVisible()
  const closeBox = await closeButton.boundingBox()
  expect(closeBox, 'mobile menu close geometry').not.toBeNull()
  expect(closeBox!.width, 'mobile menu close width').toBeGreaterThanOrEqual(44)
  expect(closeBox!.height, 'mobile menu close height').toBeGreaterThanOrEqual(44)
  await closeButton.click()
})

test('keyboard PageCompass tooltips work with coarse pointer at desktop width', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-android-smoke', 'Android-specific coarse-pointer keyboard contract')
  await page.setViewportSize({ width: 1024, height: 768 })
  await page.goto('/research.html')

  const link = page.locator('.page-compass-link').nth(1)
  await link.focus()
  await expect(page.locator('#compass-tip-sec-research-timeline')).toBeVisible()
})

test('compass stays inside the viewport and keeps touch targets usable', async ({ page }) => {
  for (const width of [320, 390, 768, 820, 1024, 1440]) {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/research.html')
    const box = await page.locator('.page-compass').boundingBox()
    expect(box, `${width}px compass geometry`).not.toBeNull()
    expect(box!.x, `${width}px left edge`).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width, `${width}px right edge`).toBeLessThanOrEqual(width)
    if (width <= 1024) {
      const linkBox = await page.locator('.page-compass-link').first().boundingBox()
      expect(linkBox, `${width}px link geometry`).not.toBeNull()
      expect(linkBox!.width, `${width}px link width`).toBeGreaterThanOrEqual(44)
      expect(linkBox!.height, `${width}px link height`).toBeGreaterThanOrEqual(44)
    }
  }
})

test('compass preserves reduced motion, keyboard navigation, and viewport changes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/works.html')
  const transitionDuration = await page.locator('.page-compass').evaluate((element) => (
    Number.parseFloat(getComputedStyle(element).transitionDuration)
  ))
  expect(transitionDuration).toBeLessThanOrEqual(0.00001)

  const fresheyeLink = page.locator('.page-compass-link[href="#project-fresheye"]')
  await fresheyeLink.focus()
  await expect(fresheyeLink).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#project-fresheye$/)

  await page.setViewportSize({ width: 390, height: 844 })
  await page.setViewportSize({ width: 844, height: 390 })
  await expect(page.locator('.page-compass')).toBeVisible()
})

test('mobile compass keeps numbered chapter controls legible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/works.html')
  await page.evaluate(() => window.scrollTo({ top: 320, behavior: 'auto' }))
  await expect(page.locator('.page-compass')).toHaveAttribute('data-mobile-state', 'visible')
  const firstIndex = page.locator('.page-compass-link').first().locator(':scope > span:not(.page-compass-tooltip)')
  await expect(firstIndex).toBeVisible()
  await expect(firstIndex).toHaveText('01')
})

test('mobile PageCompass follows reading direction without trapping focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/index.html')

  const compass = page.locator('.page-compass')
  await expect(compass).toHaveAttribute('data-mobile-state', 'quiet')
  await expect(compass).toHaveAttribute('aria-hidden', 'true')
  await expect(compass).toHaveAttribute('inert', '')
  await expect(compass).toHaveCSS('visibility', 'hidden')
  await expect(compass).toHaveCSS('pointer-events', 'none')

  await page.evaluate(() => {
    window.scrollTo({ top: 320, behavior: 'auto' })
    window.dispatchEvent(new Event('scroll'))
  })
  await expect.poll(() => compass.getAttribute('data-mobile-state'), { timeout: 300 }).toBe('reading')
  await expect(compass).toHaveAttribute('aria-hidden', 'true')
  await expect(compass).toHaveAttribute('inert', '')
  await expect(compass).toHaveCSS('visibility', 'hidden')
  await expect(compass).toHaveCSS('pointer-events', 'none')

  await expect.poll(() => compass.getAttribute('data-mobile-state'), { timeout: 1200 }).toBe('visible')
  await expect(compass).toHaveAttribute('data-mobile-state', 'visible')
  await expect(compass).not.toHaveAttribute('aria-hidden', 'true')
  await expect(compass).not.toHaveAttribute('inert', '')
  await expect(compass).toHaveCSS('visibility', 'visible')
  await expect(compass).toHaveCSS('pointer-events', 'auto')

  const firstLink = compass.locator('.page-compass-link').first()
  await firstLink.focus()
  await expect(firstLink).toBeFocused()
  await page.evaluate(() => {
    window.scrollTo({ top: 620, behavior: 'auto' })
    window.dispatchEvent(new Event('scroll'))
  })
  await expect(compass).toHaveAttribute('data-mobile-state', 'visible')
  await expect(compass).not.toHaveAttribute('aria-hidden', 'true')

  await page.locator('.menu-trigger').focus()
  await expect(page.locator('.menu-trigger')).toBeFocused()
  await expect.poll(() => compass.getAttribute('data-mobile-state'), { timeout: 300 }).toBe('reading')
})

test('compatibility menu, carousel, modal, and axe smoke remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/index.html')
  await page.locator('.menu-trigger').click()
  await expect(page.locator('.mobile-menu-overlay')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.mobile-menu-overlay')).toHaveCount(0)

  await page.goto('/concerts.html')
  const carousel = page.locator('.concert-poster').filter({ has: page.locator('.carousel-controls') }).first()
  const counter = carousel.locator('.carousel-controls span')
  const before = await counter.textContent()
  await carousel.locator('button[aria-label="下一张"]').click()
  await expect(counter).not.toHaveText(before || '')

  await page.locator('.concert-poster .poster-open').first().click()
  await expect(page.locator('.lightbox')).toBeVisible()
  await expect(new AxeBuilder({ page }).analyze()).resolves.toMatchObject({ violations: [] })
  await page.keyboard.press('Escape')
  await expect(page.locator('.lightbox')).toHaveCount(0)
})

test('mobile menu typography follows the light-theme semantic text tokens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/index.html')
  await page.locator('.menu-trigger').click()

  const colors = await page.evaluate(() => {
    const resolveColor = (variable: string) => {
      const probe = document.createElement('span')
      probe.style.color = `var(${variable})`
      document.body.append(probe)
      const value = getComputedStyle(probe).color
      probe.remove()
      return value
    }

    return {
      number: getComputedStyle(document.querySelector('.mobile-menu .mm-num')!).color,
      english: getComputedStyle(document.querySelector('.mobile-menu .mm-en')!).color,
      description: getComputedStyle(document.querySelector('.mobile-menu .mm-desc')!).color,
      goldText: resolveColor('--gold-text'),
      dim: resolveColor('--dim'),
      muted: resolveColor('--muted')
    }
  })

  expect(colors.number).toBe(colors.goldText)
  expect(colors.english).toBe(colors.dim)
  expect(colors.description).toBe(colors.muted)
})

test('touch carousel hover suppression follows the active theme control tokens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/concerts.html')
  const previousTheme = await page.locator('html').getAttribute('data-theme')
  await page.locator('.theme-orbit').click()
  await expect.poll(() => page.locator('html').getAttribute('data-theme')).not.toBe(previousTheme)
  await expect.poll(() => page.evaluate(() => {
    const root = getComputedStyle(document.documentElement)
    const button = document.querySelector<HTMLElement>('.carousel-controls button')!
    const probe = document.createElement('span')
    probe.style.backgroundColor = 'var(--media-control-bg)'
    probe.style.borderColor = 'var(--media-control-border)'
    document.body.append(probe)
    const expectedBackground = getComputedStyle(probe).backgroundColor
    const expectedBorder = getComputedStyle(probe).borderColor
    probe.remove()
    return getComputedStyle(button).backgroundColor === expectedBackground
      && getComputedStyle(button).borderColor === expectedBorder
      && root.getPropertyValue('--media-control-bg').trim() !== ''
  })).toBe(true)

  const colors = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement)
    const button = document.querySelector<HTMLElement>('.carousel-controls button')!
    const resolveColor = (variable: string, property: 'backgroundColor' | 'borderColor') => {
      const probe = document.createElement('span')
      probe.style[property] = `var(${variable})`
      document.body.append(probe)
      const value = getComputedStyle(probe)[property]
      probe.remove()
      return value
    }

    return {
      background: getComputedStyle(button).backgroundColor,
      border: getComputedStyle(button).borderColor,
      expectedBackground: resolveColor('--media-control-bg', 'backgroundColor'),
      expectedBorder: resolveColor('--media-control-border', 'borderColor'),
      theme: root.getPropertyValue('--media-control-bg').trim()
    }
  })

  expect(colors.theme).not.toBe('')
  expect(colors.background).toBe(colors.expectedBackground)
  expect(colors.border).toBe(colors.expectedBorder)
})

test('Firefox preserves direct hashes and theme state across navigation', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'firefox-desktop-smoke', 'Firefox-specific desktop compatibility proof')
  await page.goto('/research.html#sec-toolchain')
  await expect(page.locator('.page-compass-link[href="#sec-toolchain"]')).toHaveAttribute('aria-current', 'location')
  await page.locator('.theme-orbit').click()
  const theme = await page.locator('html').getAttribute('data-theme')
  await page.goto('/works.html#project-fresheye')
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme!)
  await expect(page.locator('.page-compass-link[href="#project-fresheye"]')).toHaveAttribute('aria-current', 'location')
})

test('Android touch workflows survive portrait and landscape changes', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-android-smoke', 'Android-specific touch compatibility proof')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/index.html')
  await page.locator('.menu-trigger').click()
  await expect(page.locator('.mobile-menu-overlay')).toBeVisible()
  await page.keyboard.press('Escape')

  await page.goto('/concerts.html#album-frequencies')
  const targetAlbum = page.locator('[data-album-id="jay-ye-hui-mei"]')
  await targetAlbum.tap()
  await expect(targetAlbum).toHaveAttribute('aria-selected', 'true')
  await page.setViewportSize({ width: 844, height: 390 })
  const geometry = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth
  }))
  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth)
  expect(geometry.bodyWidth).toBeLessThanOrEqual(geometry.viewportWidth)
  await expect(page.locator('.page-compass')).toBeVisible()
})
