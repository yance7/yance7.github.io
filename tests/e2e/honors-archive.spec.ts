import { expect, test } from '@playwright/test'

const sourceCoordinates = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13']

test('honors archive keeps source coordinates when filtered', async ({ page }) => {
  await page.goto('/honors.html')

  await expect(page.locator('.honor-card')).toHaveCount(13)
  await expect(page.locator('.honor-coordinate')).toHaveText(sourceCoordinates)
  await expect(page.locator('[data-honor-filter="peak"]')).toHaveAttribute('aria-pressed', 'false')

  await page.locator('[data-honor-filter="peak"]').click()

  await expect(page.locator('[data-honor-filter="peak"]')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.honor-card')).toHaveCount(4)
  await expect(page.locator('.honor-coordinate')).toHaveText(['02', '03', '07', '10'])
})

test('honors cards stay presentational and use the default cursor', async ({ page }) => {
  await page.goto('/honors.html')

  const cardSemantics = await page.locator('.honor-card').evaluateAll((cards) => cards.map((card) => ({
    descendants: card.querySelectorAll('a, button, [tabindex]').length,
    cursor: getComputedStyle(card).cursor
  })))

  expect(cardSemantics.every(({ descendants, cursor }) => descendants === 0 && cursor === 'default'), JSON.stringify(cardSemantics)).toBe(true)
})

test('honors archive fits the required viewport and theme matrix', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })

  for (const theme of ['light', 'dark']) {
    await page.addInitScript((value) => localStorage.setItem('yance-theme', value), theme)

    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: width < 640 ? 844 : 900 })
      await page.goto('/honors.html')
      await expect(page.locator('.honor-card')).toHaveCount(13)

      const geometry = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        cardWidths: [...document.querySelectorAll<HTMLElement>('.honor-card')].map((card) => card.scrollWidth <= card.clientWidth + 1),
        transforms: [...document.querySelectorAll<HTMLElement>('.honor-card')].map((card) => getComputedStyle(card).transform)
      }))

      expect(geometry.documentWidth, `${theme} honors overflow at ${width}px`).toBeLessThanOrEqual(geometry.viewportWidth)
      expect(geometry.cardWidths.every(Boolean), `${theme} honors card overflow at ${width}px`).toBe(true)
      expect(geometry.transforms.every((transform) => transform === 'none' || transform === 'matrix(1, 0, 0, 1, 0, 0)')).toBe(true)
    }
  }
})
