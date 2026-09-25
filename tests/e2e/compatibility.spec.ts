import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { pageEntries } from '../../src/data/pageRegistry'

const archiveRoutes = [...pageEntries.map(({ routePath }) => routePath), '/404.html']

function expectTouchTarget(box: { width: number; height: number }, label: string) {
  expect(Math.round(box.width), `${label} width`).toBeGreaterThanOrEqual(44)
  expect(Math.round(box.height), `${label} height`).toBeGreaterThanOrEqual(44)
}

test('compatibility pages boot without horizontal overflow', async ({ page }) => {
  for (const route of archiveRoutes) {
    await page.goto(route)
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
  const targets = [
    ['/works/#project-fresheye', '#project-fresheye'],
    ['/works/#project-ap-microeconomics-notes', '#project-ap-microeconomics-notes'],
    ['/zh-hk/works/#project-ap-microeconomics-notes', '#project-ap-microeconomics-notes'],
    ['/en/works/#project-ap-microeconomics-notes', '#project-ap-microeconomics-notes']
  ] as const

  for (const [route, selector] of targets) {
    await page.goto(route)
    const target = page.locator(selector)
    await expect(target).toBeVisible()
    const geometry = await target.evaluate((element) => ({
      targetTop: element.getBoundingClientRect().top,
      headerBottom: document.querySelector<HTMLElement>('.site-nav')?.getBoundingClientRect().bottom ?? 0
    }))
    expect(geometry.targetTop, route).toBeGreaterThanOrEqual(geometry.headerBottom)
  }
})

test('keyboard focus targets stay clear of sticky navigation surfaces', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/research/')

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
  await page.goto('/works/')

  for (const selector of ['.sc-actions .y-button', '.sc-proof-links .y-archive-link']) {
    const box = await page.locator(selector).first().boundingBox()
    expect(box, `${selector} geometry`).not.toBeNull()
    expectTouchTarget(box!, selector)
  }

  await page.goto('/')
  await page.locator('.menu-trigger').click()
  const closeButton = page.locator('.mobile-menu-close')
  await expect(closeButton).toBeVisible()
  const closeBox = await closeButton.boundingBox()
  expect(closeBox, 'mobile menu close geometry').not.toBeNull()
  expectTouchTarget(closeBox!, 'mobile menu close')
  await closeButton.click()
})

test('compatibility menu, single-poster modal, and axe smoke remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.locator('.menu-trigger').click()
  await expect(page.locator('.mobile-menu-overlay')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.mobile-menu-overlay')).toHaveCount(0)

  await page.goto('/concerts/')
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
  const poster = page.locator('.concert-poster').first()
  await poster.scrollIntoViewIfNeeded()
  await expect(poster.locator('xpath=..')).toHaveClass(/revealed/)
  await page.locator('.concert-poster .poster-open').first().click()
  await expect(page.locator('.lightbox')).toBeVisible()
  await expect(page.locator('.lb-meta-index')).toHaveText('1 / 1')
  await expect(page.locator('.lb-nav')).toHaveCount(0)
  await expect(new AxeBuilder({ page }).analyze()).resolves.toMatchObject({ violations: [] })
  await page.keyboard.press('Escape')
  await expect(page.locator('.lightbox')).toHaveCount(0)
})

test('Firefox poster geometry stays stable while focused', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'firefox-desktop-smoke', 'Firefox-specific pointer geometry proof')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/concerts/')

  const poster = page.locator('.concert-poster').first()
  await poster.scrollIntoViewIfNeeded()
  await expect(poster.locator('xpath=..')).toHaveClass(/revealed/)
  const before = await poster.boundingBox()
  expect(before).not.toBeNull()
  await poster.locator('.poster-open').focus()
  const after = await poster.boundingBox()
  expect(after).not.toBeNull()
  expect(after!.x).toBeCloseTo(before!.x, 1)
  expect(after!.width).toBeCloseTo(before!.width, 1)
  expect(after!.height).toBeCloseTo(before!.height, 1)
})

test('mobile menu typography follows the light-theme semantic text tokens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
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

test('touch rail controls follow the active theme control tokens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/concerts/')
  const previousTheme = await page.locator('html').getAttribute('data-theme')
  await page.locator('.theme-orbit').click()
  await expect.poll(() => page.locator('html').getAttribute('data-theme')).not.toBe(previousTheme)
  await expect.poll(() => page.evaluate(() => {
    const root = getComputedStyle(document.documentElement)
    const button = document.querySelector<HTMLElement>('.concert-rail-controls button')!
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
    const button = document.querySelector<HTMLElement>('.concert-rail-controls button')!
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
  await page.goto('/research/#sec-toolchain')
  await page.locator('.theme-orbit').click()
  const theme = await page.locator('html').getAttribute('data-theme')
  await page.goto('/works/#project-fresheye')
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme!)
})

test('Android touch workflows survive portrait and landscape changes', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-android-smoke', 'Android-specific touch compatibility proof')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.locator('.menu-trigger').click()
  await expect(page.locator('.mobile-menu-overlay')).toBeVisible()
  await page.keyboard.press('Escape')

  await page.goto('/concerts/#album-frequencies')
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
