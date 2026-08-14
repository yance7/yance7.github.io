import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
}

test('concert poster coalesces sheen and tilt into one layout read per frame', { tag: '@fine-pointer' }, async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Fine-pointer interaction is intentionally disabled on touch projects')
  await page.goto('/concerts.html')
  const poster = page.locator('.concert-poster').first()
  await poster.scrollIntoViewIfNeeded()

  const layoutReads = await poster.evaluate(async (element) => {
    let reads = 0
    const original = element.getBoundingClientRect.bind(element)
    element.getBoundingClientRect = () => {
      reads += 1
      return original()
    }
    const bounds = original()
    for (let index = 0; index < 24; index += 1) {
      const clientX = bounds.left + bounds.width * (0.25 + index / 60)
      const clientY = bounds.top + bounds.height * 0.35
      element.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX, clientY, pointerType: 'mouse' }))
      element.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX, clientY }))
    }
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    return reads
  })

  expect(layoutReads).toBeLessThanOrEqual(2)
  await expect(poster).not.toHaveCSS('--rx', '')
  await expect(poster).not.toHaveCSS('--ry', '')
})

test('concert carousel controls keep touch-sized targets', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/concerts.html')

  const controls = await page.locator('.carousel-controls button').evaluateAll((elements) => elements.map((element) => {
    const bounds = element.getBoundingClientRect()
    return { width: bounds.width, height: bounds.height }
  }))
  expect(controls.length).toBeGreaterThan(0)
  controls.forEach(({ width, height }) => {
    expect(width).toBeGreaterThanOrEqual(44)
    expect(height).toBeGreaterThanOrEqual(44)
  })
})

test('concert album wall exposes 42 local releases and the default spotlight', async ({ page }) => {
  await page.goto('/concerts.html')
  const wall = page.locator('.album-wall-section')
  await expect(wall).toHaveCount(1)
  await expect(wall.locator('.album-tile')).toHaveCount(42)
  await expect(wall.locator('.album-spotlight')).toContainText('周杰伦')
  await expect(wall.locator('.album-spotlight')).toContainText('范特西')
  await expect(wall.locator('.album-spotlight')).toContainText('2001')
  await expect(wall.locator('.album-index')).toHaveText('01 / 42')
  const selected = wall.locator('.album-tile[aria-selected="true"]')
  await expect(selected).toHaveCount(1)
  await expect(selected).toHaveAttribute('data-album-id', 'jay-fantasy')
  await expect(selected).toHaveAttribute('aria-setsize', '42')
  await expect(selected).toHaveAttribute('aria-posinset', '1')

  const appleMusicLink = wall.locator('.album-link')
  await expect(appleMusicLink).toHaveAttribute('href', /^https:\/\/music\.apple\.com\/.+\/album\//)
  await expect(appleMusicLink).toHaveAttribute('target', '_blank')
  await expect(appleMusicLink).toHaveAttribute('rel', /noopener/)

  const spotlightCover = wall.locator('.album-spotlight img')
  const spotlightSource = wall.locator('.album-spotlight picture source[type="image/webp"]')
  await expect(spotlightCover).toBeVisible()
  await expect(spotlightSource).toHaveAttribute('srcset', /640w/)
  await expect(spotlightSource).toHaveAttribute('srcset', /1200w/)
  const cover = await spotlightCover.evaluate((image: HTMLImageElement) => ({
    src: image.currentSrc,
    complete: image.complete,
    width: image.naturalWidth,
    height: image.naturalHeight
  }))
  expect(new URL(cover.src).pathname).toMatch(/^\/assets\/albums\//)
  expect((await page.request.get(cover.src)).status()).toBe(200)
  expect(cover.complete).toBe(true)
  expect(cover.width).toBeGreaterThan(0)
  expect(cover.height).toBeGreaterThan(0)
})

test('concert album wall selection and looping controls stay synchronized', async ({ page }) => {
  await page.goto('/concerts.html')
  const wall = page.locator('.album-wall-section')
  const selected = wall.locator('.album-tile[aria-selected="true"]')
  const spotlightState = () => wall.evaluate((element) => ({
    title: element.querySelector('.album-title')?.textContent?.trim(),
    index: element.querySelector('.album-index')?.textContent?.trim(),
    selectedId: element.querySelector('.album-tile[aria-selected="true"]')?.getAttribute('data-album-id'),
    appleHref: element.querySelector('.album-link')?.getAttribute('href')
  }))

  await wall.locator('[data-album-id="jay-ye-hui-mei"]').click()
  await expect(wall.locator('.album-index')).toHaveText('02 / 42')
  await expect(selected).toHaveCount(1)
  await expect(selected).toHaveAttribute('data-album-id', 'jay-ye-hui-mei')
  expect(await spotlightState()).toEqual({
    title: '叶惠美',
    index: '02 / 42',
    selectedId: 'jay-ye-hui-mei',
    appleHref: 'https://music.apple.com/cn/album/%E8%91%89%E6%83%A0%E7%BE%8E/535824731'
  })

  await wall.locator('[data-album-id="jay-fantasy"]').click()
  await wall.locator('[aria-label="上一张专辑"]').click()
  await expect(selected).toHaveAttribute('data-album-id', 'david-tao-goodbye-how-are-you')
  await expect(wall.locator('.album-index')).toHaveText('42 / 42')
  await wall.locator('[aria-label="下一张专辑"]').click()
  await expect(selected).toHaveAttribute('data-album-id', 'jay-fantasy')
  await expect(wall.locator('.album-index')).toHaveText('01 / 42')
  await expect(wall.locator('.album-title')).toHaveText('范特西')

  await wall.locator('[aria-label="下一张专辑"]').evaluate((button: HTMLButtonElement) => {
    for (let index = 0; index < 8; index += 1) button.click()
  })
  await expect(selected).toHaveCount(1)
  await expect(wall.locator('.album-index')).toHaveText('09 / 42')
  expect(await spotlightState()).toEqual({
    title: '天外来物',
    index: '09 / 42',
    selectedId: 'joker-extraterrestrial',
    appleHref: 'https://music.apple.com/cn/album/%E5%A4%A9%E5%A4%96%E6%9D%A5%E7%89%A9/1787447447'
  })
})

test('concert album spotlight keeps a decoded cover during delayed rapid switching', async ({ page }) => {
  await page.route('**/assets/albums/thumbs/*.webp', async (route) => {
    if (route.request().url().includes('jay-ye-hui-mei-') || route.request().url().includes('/albums/jay-ye-hui-mei.jpg')) {
      await new Promise((resolve) => setTimeout(resolve, 1200))
    }
    await route.continue()
  })
  await page.goto('/concerts.html')
  const wall = page.locator('.album-wall-section')

  await wall.locator('[data-album-id="jay-ye-hui-mei"]').click()
  await page.waitForTimeout(240)

  await expect(wall.locator('.album-visual-slot')).toHaveAttribute('aria-busy', 'true')
  await expect(wall.locator('.album-cover-frame img')).toHaveAttribute('src', /jay-fantasy\.jpg$/)

  const visibleCover = await wall.locator('.album-cover-frame').evaluateAll((frames) => frames
    .map((frame) => {
      const image = frame.querySelector('img')
      return {
        opacity: Number.parseFloat(getComputedStyle(frame).opacity),
        decoded: !!image?.complete && image.naturalWidth > 0
      }
    })
    .sort((left, right) => right.opacity - left.opacity)[0]?.decoded)
  expect(visibleCover).toBe(true)

  await expect.poll(() => wall.locator('.album-cover-frame img').evaluateAll((images) => (
    images as HTMLImageElement[]
  ).map((image) => image.currentSrc))).toEqual(
    expect.arrayContaining([expect.stringMatching(/jay-ye-hui-mei-(640|1200)\.webp$/)])
  )
  await expect(wall.locator('.album-visual-slot')).toHaveAttribute('aria-busy', 'false')
})

test('concert album spotlight settles on the selected album when both cover sources fail', async ({ page }) => {
  await page.route('**/assets/albums/**', async (route) => {
    const url = route.request().url()
    if (url.includes('jay-ye-hui-mei-') || url.includes('jay-ye-hui-mei.jpg')) {
      await route.abort('failed')
      return
    }
    await route.continue()
  })
  await page.goto('/concerts.html')
  const wall = page.locator('.album-wall-section')

  await wall.locator('[data-album-id="jay-ye-hui-mei"]').click()

  await expect(wall.locator('[data-album-id="jay-ye-hui-mei"]')).toHaveAttribute('aria-selected', 'true')
  await expect(wall.locator('.album-title')).toHaveText('叶惠美')
  await expect(wall.locator('.album-cover-frame img[src$="jay-ye-hui-mei.jpg"]')).toHaveCount(1)
  await expect(wall.locator('.album-visual-slot')).toHaveAttribute('aria-busy', 'false')
  await expect(wall.locator('.album-visual-slot')).toHaveAttribute('data-spotlight-state', 'error')
})

test('concert album spotlight commits the latest rapid selection only', async ({ page }) => {
  await page.route('**/assets/albums/thumbs/*.webp', async (route) => {
    const url = route.request().url()
    if (url.includes('jay-ye-hui-mei-')) await new Promise((resolve) => setTimeout(resolve, 550))
    if (url.includes('jay-common-jasmine-orange-')) await new Promise((resolve) => setTimeout(resolve, 100))
    await route.continue()
  })
  await page.goto('/concerts.html')
  const wall = page.locator('.album-wall-section')

  await wall.locator('[data-album-id="jay-ye-hui-mei"]').click()
  await wall.locator('[data-album-id="jay-common-jasmine-orange"]').click()
  await expect(wall.locator('[data-album-id="jay-common-jasmine-orange"]')).toHaveAttribute('aria-selected', 'true')
  await expect.poll(() => wall.locator('.album-cover-frame img').evaluateAll((images) => (
    images as HTMLImageElement[]
  ).map((image) => image.currentSrc))).toEqual(
    expect.arrayContaining([expect.stringMatching(/jay-common-jasmine-orange-(640|1200)\.webp$/)])
  )
  await page.waitForTimeout(600)
  await expect(wall.locator('.album-cover-frame img')).toHaveCount(1)
  await expect(wall.locator('.album-cover-frame img')).toHaveAttribute('src', /jay-common-jasmine-orange\.jpg$/)
})

test('concert album wall supports roving keyboard selection', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/concerts.html')
  const wall = page.locator('.album-wall-section')
  const tiles = wall.locator('.album-tile')
  const selected = wall.locator('.album-tile[aria-selected="true"]')

  await selected.focus()
  await expect(selected).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(tiles.nth(1)).toBeFocused()
  await expect(tiles.nth(1)).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('ArrowDown')
  await expect(tiles.nth(7)).toBeFocused()
  await expect(tiles.nth(7)).toHaveAttribute('aria-selected', 'true')

  await page.keyboard.press('Home')
  await expect(tiles.first()).toBeFocused()
  await expect(tiles.first()).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('End')
  await expect(tiles.last()).toBeFocused()
  await expect(tiles.last()).toHaveAttribute('aria-selected', 'true')

  await tiles.nth(2).focus()
  await page.keyboard.press('Enter')
  await expect(tiles.nth(2)).toBeFocused()
  await expect(tiles.nth(2)).toHaveAttribute('aria-selected', 'true')

  await tiles.nth(3).focus()
  await page.keyboard.press('Space')
  await expect(tiles.nth(3)).toBeFocused()
  await expect(tiles.nth(3)).toHaveAttribute('aria-selected', 'true')
  await expect(selected).toHaveCount(1)
})

test('concert album wall uses 6 4 and 3 responsive columns', async ({ page }) => {
  const responsiveColumns = [
    { width: 1440, columns: 6 },
    { width: 768, columns: 4 },
    { width: 390, columns: 3 },
    { width: 320, columns: 3 }
  ]

  for (const { width, columns } of responsiveColumns) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/concerts.html')
    await expect(page.locator('.album-spotlight')).toBeVisible()
    const layout = await page.evaluate(() => {
      const spotlight = document.querySelector('.album-spotlight')!.getBoundingClientRect()
      const grid = document.querySelector('.album-grid')!.getBoundingClientRect()
      const firstTile = document.querySelector('.album-tile')!.getBoundingClientRect()
      const columns = getComputedStyle(document.querySelector('.album-grid')!).gridTemplateColumns.split(' ').length
      return {
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        viewportWidth: window.innerWidth,
        spotlightRight: spotlight.right,
        spotlightBottom: spotlight.bottom,
        gridLeft: grid.left,
        gridTop: grid.top,
        columns,
        tileWidth: firstTile.width,
        tileHeight: firstTile.height
      }
    })

    expect(layout.documentWidth, `document at ${width}px`).toBeLessThanOrEqual(layout.viewportWidth)
    expect(layout.bodyWidth, `body at ${width}px`).toBeLessThanOrEqual(layout.viewportWidth)
    expect(layout.columns, `album columns at ${width}px`).toBe(columns)
    if (width === 1440) {
      expect(layout.gridLeft).toBeGreaterThanOrEqual(layout.spotlightRight - 1)
      expect(layout.gridTop).toBeLessThan(layout.spotlightBottom)
    } else {
      expect(layout.gridTop).toBeGreaterThanOrEqual(layout.spotlightBottom - 1)
    }
    if (width <= 390) {
      expect(Math.abs(layout.tileWidth - layout.tileHeight)).toBeLessThanOrEqual(1)
    }
  }
})

test('concert album wall preserves theme and reduced-motion accessibility', async ({ page }) => {
  await page.goto('/concerts.html')
  const wall = page.locator('.album-wall')
  const tiles = page.locator('.album-tile')
  await expectAccessible(page)

  const albumThemeSelectors = await page.evaluate(() => {
    const collectSelectors = (rules: CSSRuleList): string[] => Array.from(rules).flatMap((rule) => {
      if (rule instanceof CSSStyleRule) return [rule.selectorText]
      return 'cssRules' in rule ? collectSelectors((rule as CSSGroupingRule).cssRules) : []
    })
    return Array.from(document.styleSheets)
      .flatMap((sheet) => collectSelectors(sheet.cssRules))
      .filter((selector) => selector.includes('data-theme') && (selector.includes('.album-wall') || selector.includes('.album-kicker')))
  })
  expect(albumThemeSelectors).toEqual(expect.arrayContaining([
    expect.stringMatching(/^html\[data-theme=(?:"light"|light)\] \.album-wall\[data-v-[^\]]+\]$/),
    expect.stringMatching(/^html\[data-theme=(?:"dark"|dark)\] \.album-wall\[data-v-[^\]]+\]$/),
    expect.stringMatching(/^html\[data-theme=(?:"light"|light)\] \.album-kicker\[data-v-[^\]]+\]$/)
  ]))

  await tiles.nth(1).focus()
  await page.keyboard.press('Enter')
  await expect(tiles.nth(1)).toHaveAttribute('aria-selected', 'true')
  await expectAccessible(page)

  const surfaceBefore = await wall.evaluate((element) => getComputedStyle(element).background)
  await page.locator('.theme-orbit').click()
  await expect.poll(() => wall.evaluate((element) => getComputedStyle(element).background)).not.toBe(surfaceBefore)
  await expect(tiles.nth(1)).toHaveAttribute('aria-selected', 'true')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await tiles.nth(2).click()
  await expect(tiles.nth(2)).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('.album-sleeve')).toHaveCSS('transform', 'none')
  await expect(page.locator('.album-sleeve')).toHaveCSS('transition-duration', '0s')

  await page.setViewportSize({ width: 390, height: 844 })
  await expectAccessible(page)
})

test('concert thumbnails respond and carousel/lightbox controls work', async ({ page }) => {
  await page.goto('/concerts.html')
  await expect(page.locator('.metric-strip .metric-card')).toHaveCount(4)
  const thumbnailSrcset = await page.locator('.concert-poster picture source').first().getAttribute('srcset')
  expect(thumbnailSrcset).toBeTruthy()
  const thumbnail = thumbnailSrcset!.split(',')[0]!.trim().split(/\s+/)[0]!
  const response = await page.request.get(new URL(thumbnail, 'http://127.0.0.1:4173').toString())
  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toMatch(/^image\//)

  const carousel = page.locator('.concert-poster').filter({ has: page.locator('.carousel-controls') }).first()
  const counter = carousel.locator('.carousel-controls span')
  const before = await counter.textContent()
  await carousel.locator('button[aria-label="下一张"]').click()
  await expect(counter).not.toHaveText(before || '')

  await carousel.locator('.poster-open').click()
  await expect(page.locator('.lightbox')).toBeVisible()
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('.lightbox [aria-live="polite"]').last()).toContainText('第')
  await page.keyboard.press('Escape')
  await expect(page.locator('.lightbox')).toHaveCount(0)
})

test('lightbox keeps the background inert and locked until leave finishes', async ({ page }) => {
  await page.goto('/concerts.html')
  const trigger = page.locator('.concert-poster .poster-open').first()
  await trigger.focus()
  await trigger.click()
  await expect(page.locator('.lightbox')).toBeVisible()
  await expect(page.locator('.lb-close')).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(page.locator('.lightbox')).toBeVisible()
  await expect(page.locator('.site-shell')).toHaveAttribute('inert', '')
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden')

  await expect(page.locator('.lightbox')).toHaveCount(0)
  await expect(page.locator('.site-shell')).not.toHaveAttribute('inert', '')
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
  await expect(trigger).toBeFocused()
})
