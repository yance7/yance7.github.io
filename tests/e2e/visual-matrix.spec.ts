import { expect, test } from '@playwright/test'

const routes = ['index', 'research', 'concerts'] as const
const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 }
] as const

for (const viewport of viewports) {
  for (const theme of ['light', 'dark'] as const) {
    test(`captures ${theme} ${viewport.name} review surfaces`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })

      for (const route of routes) {
        await page.goto(`/${route}.html`)
        await page.evaluate((value) => localStorage.setItem('yance-theme', value), theme)
        await page.reload()
        await expect(page.locator('main#main')).toBeVisible()
        await expect(page.locator('.site-footer')).toHaveCount(1)

        const layout = await page.evaluate(() => ({
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: document.documentElement.clientWidth
        }))
        expect(layout.documentWidth, `${route} ${theme} ${viewport.name} overflow`).toBeLessThanOrEqual(layout.viewportWidth)

        await page.screenshot({
          path: `test-screenshots/${route}-${theme}-${viewport.name}-${testInfo.project.name}.png`,
          fullPage: false
        })
      }
    })
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
