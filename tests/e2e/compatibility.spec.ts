import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { htmlPageEntries } from '../../src/data/pageRegistry'

const archiveRoutes = htmlPageEntries.map(({ htmlName }) => `${htmlName}.html`)

function expectTouchTarget(box: { width: number; height: number }, label: string) {
  expect(Math.round(box.width), `${label} width`).toBeGreaterThanOrEqual(44)
  expect(Math.round(box.height), `${label} height`).toBeGreaterThanOrEqual(44)
}

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

test('compatibility hash navigation settles below the sticky header', async ({ page }) => {
  await page.goto('/works.html#project-fresheye')
  const target = page.locator('#project-fresheye')
  await expect(target).toBeVisible()
  await expect.poll(() => target.evaluate((element) => Math.round(element.getBoundingClientRect().top))).toBeGreaterThanOrEqual(12)
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
    return {
      headerBottom: header?.bottom ?? 0,
      top: rect.top,
      bottom: rect.bottom,
      viewportHeight: window.innerHeight
    }
  })

  expect(geometry.top, 'focused target below sticky header').toBeGreaterThanOrEqual(geometry.headerBottom)
  expect(geometry.bottom, 'focused target inside viewport').toBeLessThanOrEqual(geometry.viewportHeight)
})

test('coarse-pointer shared controls keep 44px touch targets', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-android-smoke', 'Android-specific coarse-pointer contract')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/works.html')

  for (const selector of ['.sc-actions .y-button', '.sc-proof-links .y-archive-link']) {
    const box = await page.locator(selector).first().boundingBox()
    expect(box, `${selector} geometry`).not.toBeNull()
    expectTouchTarget(box!, selector)
  }

  await page.goto('/index.html')
  await page.locator('.menu-trigger').click()
  const closeButton = page.locator('.mobile-menu-close')
  await expect(closeButton).toBeVisible()
  const closeBox = await closeButton.boundingBox()
  expect(closeBox, 'mobile menu close geometry').not.toBeNull()
  expectTouchTarget(closeBox!, 'mobile menu close')
  await closeButton.click()
})

test('compatibility menu, carousel, modal, and axe smoke remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/index.html')
  await page.locator('.menu-trigger').click()
  await expect(page.locator('.mobile-menu-overlay')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.mobile-menu-overlay')).toHaveCount(0)

  await page.goto('/concerts.html')
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
  const carousel = page.locator('.concert-poster').filter({ has: page.locator('.carousel-controls') }).first()
  const counter = carousel.locator('.carousel-controls span')
  const next = carousel.locator('button[aria-label="下一张"]')
  await carousel.scrollIntoViewIfNeeded()
  await expect(carousel.locator('xpath=..')).toHaveClass(/revealed/)
  await next.scrollIntoViewIfNeeded()
  await expect(counter).toHaveText('1 / 2')
  await next.click()
  await expect(counter).toHaveText('2 / 2')

  await page.locator('.concert-poster .poster-open').first().click()
  await expect(page.locator('.lightbox')).toBeVisible()
  await expect(new AxeBuilder({ page }).analyze()).resolves.toMatchObject({ violations: [] })
  await page.keyboard.press('Escape')
  await expect(page.locator('.lightbox')).toHaveCount(0)
})

test('Firefox carousel controls keep the poster geometry stable while hovered', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'firefox-desktop-smoke', 'Firefox-specific pointer geometry proof')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/concerts.html')

  const carousel = page.locator('.concert-poster').filter({ has: page.locator('.carousel-controls') }).first()
  const next = carousel.locator('button[aria-label="下一张"]')
  await carousel.scrollIntoViewIfNeeded()
  await expect(carousel.locator('xpath=..')).toHaveClass(/revealed/)
  await next.scrollIntoViewIfNeeded()
  const before = await carousel.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      rotateX: style.getPropertyValue('--rx').trim(),
      rotateY: style.getPropertyValue('--ry').trim()
    }
  })

  await next.hover()
  await expect.poll(() => carousel.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      rotateX: style.getPropertyValue('--rx').trim(),
      rotateY: style.getPropertyValue('--ry').trim()
    }
  })).toEqual(before)
})

test('mobile menu typography follows the light-theme semantic text tokens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/index.html')
  await page.locator('.menu-trigger').click()
  await expect(page.locator('.mobile-menu .mm-num').first()).toBeVisible()
  await expect(page.locator('.mobile-menu .mm-label').first()).toBeVisible()
  await expect(page.locator('.mobile-menu .mm-desc').first()).toBeVisible()

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
      label: getComputedStyle(document.querySelector('.mobile-menu a:not(.active) .mm-label')!).color,
      description: getComputedStyle(document.querySelector('.mobile-menu .mm-desc')!).color,
      goldText: resolveColor('--gold-text'),
      ink: resolveColor('--ink'),
      dim: resolveColor('--dim'),
      muted: resolveColor('--muted')
    }
  })

  expect(colors.number).toBe(colors.goldText)
  expect(colors.label).toBe(colors.ink)
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
  await page.locator('.theme-orbit').click()
  const theme = await page.locator('html').getAttribute('data-theme')
  await page.goto('/works.html#project-fresheye')
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme!)
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
})
