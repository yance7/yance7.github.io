import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
})

test('mobile PageCompass supports focus, Escape, and explicit destination selection', async ({ page }) => {
  await page.goto('/honors.html')
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')

  const compass = page.locator('.page-compass')
  const trigger = compass.locator('.page-compass-trigger')
  const panel = compass.locator('.page-compass-panel')
  const link = compass.locator('.page-compass-link[href="#sec-honors-archive"]')

  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await trigger.focus()
  await expect(trigger).toBeFocused()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await expect(panel).toBeVisible()
  await expect(link).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await expect(panel).toHaveAttribute('aria-hidden', 'true')
  await expect(panel).toHaveAttribute('inert', '')

  await trigger.click()
  await expect(link).toBeVisible()
  await link.click()
  await expect(page).toHaveURL(/honors\.html#sec-honors-archive$/)
  await expect(trigger).toBeFocused()
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
})

test('touch pointer entry does not create a phantom hover-open', async ({ page }) => {
  await page.goto('/research.html')
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
  const compass = page.locator('.page-compass')
  const trigger = compass.locator('.page-compass-trigger')

  await compass.evaluate((element) => {
    element.dispatchEvent(new PointerEvent('pointerenter', {
      bubbles: true,
      pointerType: 'touch'
    }))
  })
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await expect(compass.locator('.page-compass-panel')).toHaveAttribute('inert', '')
})

test('mobile collapsed Compass keeps index on one line and retains an expansion affordance', async ({ page }) => {
  await page.goto('/en/research.html')
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')

  const compass = page.locator('.page-compass')
  const index = compass.locator('.page-compass-trigger-index')
  const icon = compass.locator('.page-compass-trigger-icon')

  const width = await compass.evaluate(
    (element) => element.getBoundingClientRect().width
  )

  expect(width).toBeGreaterThanOrEqual(116)
  expect(width).toBeLessThanOrEqual(132)

  await expect(icon).toBeVisible()

  const lines = await index.evaluate((element) => {
    const style = getComputedStyle(element)
    const height = element.getBoundingClientRect().height
    const lineHeight = Number.parseFloat(style.lineHeight)

    return {
      whiteSpace: style.whiteSpace,
      height,
      lineHeight
    }
  })

  expect(lines.whiteSpace).toBe('nowrap')
  expect(lines.height).toBeLessThanOrEqual(Math.ceil(lines.lineHeight) + 2)
})
