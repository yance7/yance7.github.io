import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { htmlPageEntries, pageEntries } from '../../src/data/pageRegistry'

const viewports = [
  { width: 320, height: 568 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 414, height: 896 },
  { width: 844, height: 390 },
  { width: 768, height: 1024 },
  { width: 820, height: 1180 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1440, height: 1000 }
] as const

const criticalTouchTargetSelector = [
  '.menu-trigger',
  '.theme-orbit',
  '.page-compass button',
  '.page-compass a',
  '.carousel-controls button',
  '.album-nav button',
  '.album-tile',
  '.poster-open',
  '.lb-close'
].join(', ')

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
}

for (const viewport of viewports) {
  test(`all pages preserve geometry and runtime integrity at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    test.setTimeout(60000)
    await page.setViewportSize(viewport)

    for (const entry of htmlPageEntries) {
      const consoleErrors: string[] = []
      const pageErrors: string[] = []
      const onConsole = (message: { type(): string; text(): string }) => {
        if (message.type() === 'error') consoleErrors.push(message.text())
      }
      const onPageError = (error: Error) => pageErrors.push(error.message)
      page.on('console', onConsole)
      page.on('pageerror', onPageError)

      await page.goto(`/${entry.htmlName}.html`)
      await expect(page.locator('main#main')).toBeVisible()
      const footer = page.locator('.site-footer')
      await expect(footer).toHaveCount(1)
      await footer.scrollIntoViewIfNeeded()
      await expect(footer).toBeVisible()

      const geometry = await page.evaluate(() => ({
        bodyWidth: document.body.scrollWidth,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth
      }))
      expect(geometry.documentWidth, `${entry.htmlName} document`).toBeLessThanOrEqual(geometry.viewportWidth)
      expect(geometry.bodyWidth, `${entry.htmlName} body`).toBeLessThanOrEqual(geometry.viewportWidth)

      const compassLinks = page.locator('.page-compass-link')
      await expect(compassLinks, `${entry.htmlName} compass sections`).toHaveCount(entry.sections.length)
      if (entry.htmlName === '404') await expect(page.locator('.page-compass')).toHaveCount(0)

      if (viewport.width <= 844) {
        const undersizedTargets = await page.locator(criticalTouchTargetSelector).evaluateAll((elements) => elements
          .filter((element) => {
            const style = getComputedStyle(element)
            const rect = element.getBoundingClientRect()
            return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
          })
          .map((element) => {
            const rect = element.getBoundingClientRect()
            return {
              height: Math.round(rect.height * 10) / 10,
              label: element.getAttribute('aria-label') || element.textContent?.trim().slice(0, 24) || element.className,
              width: Math.round(rect.width * 10) / 10
            }
          })
          .filter(({ width, height }) => width < 44 || height < 44))
        expect(undersizedTargets, `${entry.htmlName} touch targets`).toEqual([])
      }

      expect(consoleErrors, `${entry.htmlName} console errors`).toEqual([])
      expect(pageErrors, `${entry.htmlName} page errors`).toEqual([])
      page.off('console', onConsole)
      page.off('pageerror', onPageError)
    }
  })
}

test('section hashes clear the sticky navigation in portrait, landscape, and desktop layouts', async ({ page }) => {
  for (const viewport of [viewports[2], viewports[4], viewports[9]]) {
    await page.setViewportSize(viewport)
    for (const entry of pageEntries) {
      const section = entry.sections.at(-1)!
      await page.goto(`/${entry.htmlName}.html#${section.id}`)
      const placement = await page.locator(`#${section.id}`).evaluate((element) => {
        const header = document.querySelector<HTMLElement>('.site-nav')
        return {
          headerBottom: header?.getBoundingClientRect().bottom ?? 0,
          targetTop: element.getBoundingClientRect().top
        }
      })
      expect(placement.targetTop, `${entry.htmlName} at ${viewport.width}x${viewport.height}`)
        .toBeGreaterThanOrEqual(placement.headerBottom - 1)
    }
  }
})

test('dark theme and reduced motion preserve readable static content', async ({ page }) => {
  await page.setViewportSize(viewports[2])
  await page.emulateMedia({ reducedMotion: 'reduce' })

  for (const entry of htmlPageEntries) {
    await page.goto(`/${entry.htmlName}.html`)
    if (documentTheme(await page.locator('html').getAttribute('data-theme')) !== 'dark') {
      await page.locator('.theme-orbit').click()
    }
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

    const animatedContent = await page.locator('.reveal, .lyric-char').evaluateAll((elements) => elements.map((element) => {
      const style = getComputedStyle(element)
      return {
        animationName: style.animationName,
        opacity: Number.parseFloat(style.opacity),
        transform: style.transform
      }
    }))
    expect(animatedContent.every(({ animationName, opacity, transform }) => (
      animationName === 'none' && opacity === 1 && transform === 'none'
    )), entry.htmlName).toBe(true)
  }
})

test('representative light and dark layouts remain axe-clean', async ({ page }) => {
  test.setTimeout(120000)
  for (const theme of ['light', 'dark'] as const) {
    await page.setViewportSize(theme === 'light' ? viewports[9] : viewports[2])
    await page.goto('/index.html')
    await page.evaluate((nextTheme) => localStorage.setItem('yance-theme', nextTheme), theme)
    for (const entry of htmlPageEntries) {
      await page.goto(`/${entry.htmlName}.html`)
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      await expectAccessible(page)
    }
  }
})

test('forced colors preserve selected and keyboard-focus boundaries', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Forced-colors emulation is provided by Chromium in this matrix')
  await page.emulateMedia({ forcedColors: 'active' })
  await page.goto('/concerts.html')

  const selected = page.locator('.album-tile.selected')
  const focusTarget = page.locator('.album-nav button').first()
  await focusTarget.focus()
  const boundaries = await Promise.all([selected, focusTarget].map((locator) => locator.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      borderWidth: Number.parseFloat(style.borderWidth),
      outlineWidth: Number.parseFloat(style.outlineWidth)
    }
  })))
  expect(boundaries.every(({ borderWidth, outlineWidth }) => borderWidth > 0 || outlineWidth > 0)).toBe(true)
})

function documentTheme(theme: string | null): 'light' | 'dark' | null {
  return theme === 'light' || theme === 'dark' ? theme : null
}
