import { expect, test, type Page } from '@playwright/test'

const routes = ['index', 'research', 'works', 'concerts'] as const
const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 }
] as const
const themes = ['light', 'dark'] as const
const FIXED_NOW = '2026-08-21T12:00:00+08:00'

const screenshotOptions = {
  animations: 'disabled' as const,
  caret: 'hide' as const,
  scale: 'css' as const,
  maxDiffPixelRatio: .025
}

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

async function settlePage(page: Page) {
  await page.waitForLoadState('domcontentloaded')
  await page.evaluate(async () => {
    await document.fonts?.ready
  })
  await page.waitForTimeout(250)
}

for (const viewport of viewports) {
  for (const theme of themes) {
    test(`captures ${theme} ${viewport.name} visual baselines`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await installTheme(page, theme)

      for (const route of routes) {
        await page.goto(`/${route}.html`)
        await settlePage(page)
        await expect(page.locator('main#main')).toBeVisible()
        await expect(page.locator('.site-footer')).toHaveCount(1)

        const layout = await page.evaluate(() => ({
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: document.documentElement.clientWidth
        }))
        expect(layout.documentWidth, `${route} ${theme} ${viewport.name} overflow`).toBeLessThanOrEqual(layout.viewportWidth)

        await page.screenshot({
          ...screenshotOptions,
          path: testInfo.outputPath(`${route}-${theme}-${viewport.name}-review.png`),
          fullPage: false
        })
        await expect(page).toHaveScreenshot(`${route}-${theme}-${viewport.name}-viewport.png`, screenshotOptions)

        if (route !== 'index' && viewport.name === 'desktop') {
          await expect(page.locator('main#main')).toHaveScreenshot(`${route}-${theme}-desktop-main.png`, screenshotOptions)
        }
        if (route === 'index' && viewport.name === 'desktop') {
          await expect(page).toHaveScreenshot(`index-${theme}-desktop-full.png`, {
            ...screenshotOptions,
            fullPage: true
          })
        }
      }
    })
  }
}

for (const theme of themes) {
  test(`captures ${theme} focused PageCompass hierarchy`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await installTheme(page, theme)
    await page.goto('/research.html')
    await settlePage(page)

    const link = page.locator('.page-compass-link').nth(1)
    await link.focus()
    await expect(page.locator('#compass-tip-sec-research-timeline')).toBeVisible()
    await expect(page).toHaveScreenshot(`${theme}-page-compass-focused.png`, screenshotOptions)
  })

  test(`captures ${theme} Lightbox landscape portrait and mobile states`, async ({ page }) => {
    await installTheme(page, theme)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/concerts.html')
    await settlePage(page)

    await page.locator('.concert-poster.land .poster-open').first().click()
    await expect(page.locator('.lb-stage img')).toHaveClass(/loaded/)
    await expect(page.locator('.lightbox')).toHaveScreenshot(`${theme}-lightbox-landscape.png`, screenshotOptions)
    await page.keyboard.press('Escape')
    await expect(page.locator('.lightbox')).toHaveCount(0)

    await page.locator('.concert-poster:not(.land) .poster-open').first().click()
    await expect(page.locator('.lb-stage img')).toHaveClass(/loaded/)
    await expect(page.locator('.lightbox')).toHaveScreenshot(`${theme}-lightbox-portrait.png`, screenshotOptions)
    await page.keyboard.press('Escape')
    await expect(page.locator('.lightbox')).toHaveCount(0)

    await page.setViewportSize({ width: 390, height: 844 })
    await page.locator('.concert-poster:not(.land) .poster-open').first().click()
    await expect(page.locator('.lb-stage img')).toHaveClass(/loaded/)
    await expect(page.locator('.lightbox')).toHaveScreenshot(`${theme}-lightbox-mobile.png`, screenshotOptions)
  })
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
