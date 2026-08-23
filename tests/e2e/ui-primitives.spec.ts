import { expect, test } from '@playwright/test'

test('shared project actions expose stable keyboard targets', async ({ page }) => {
  await page.goto('/works.html')

  const projectLink = page.getByRole('link', { name: /ENTER PROJECT/i }).first()
  await projectLink.focus()

  await expect(projectLink).toBeFocused()
  await expect(projectLink).toHaveClass(/y-button/)

  const box = await projectLink.boundingBox()
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(42)
})

test('status badges use compact semantic surfaces without pulse animation', async ({ page }) => {
  await page.goto('/works.html')

  const badges = page.locator('.status-badge')
  await expect(badges.first()).toBeVisible()
  await expect(badges.first()).toHaveCSS('border-radius', '6px')
  await expect(badges.first()).toHaveCSS('padding-top', '5px')

  const statuses = await badges.evaluateAll((elements) => elements.map((element) => {
    const status = [...element.classList].find((name) => name !== 'status-badge')
    return status ?? ''
  }))
  expect(statuses.every((status) => status.length > 0)).toBe(true)
  for (const badge of await badges.all()) {
    await expect(badge).not.toHaveCSS('animation-name', /pulse/)
  }
})

test('page compass exposes keyboard tooltip hierarchy', async ({ page }) => {
  await page.goto('/research.html')

  const link = page.locator('.page-compass-link').nth(1)
  await link.focus()

  await expect(link).toHaveAttribute('aria-describedby', /compass-tip-/)
  await expect(page.locator('[role="tooltip"]').nth(1)).toBeVisible()

  const top = page.locator('.page-compass-top')
  await expect(top).toHaveAttribute('aria-describedby', 'page-compass-top-tip')
  await expect(page.locator('#page-compass-top-tip')).toHaveAttribute('role', 'tooltip')
})

test('lightbox keeps metadata and quiet control chrome bounded', async ({ page }) => {
  await page.goto('/concerts.html')
  const carousel = page.locator('.concert-poster').filter({ has: page.locator('.carousel-controls') }).first()
  await carousel.locator('.poster-open').click()

  await expect(page.locator('.lightbox')).toBeVisible()
  await expect(page.locator('.lb-meta-dock')).toHaveCount(1)
  await expect(page.locator('.lb-meta-copy')).toBeVisible()
  await expect(page.locator('.lb-meta-copy small')).toHaveText('LIVE ARCHIVE')
  await expect(page.locator('.lb-meta-index')).toHaveText(/\d+ \/ \d+/)
  await expect(page.locator('.lb-close')).toHaveClass(/y-button--icon/)
  await expect(page.locator('.lb-nav').first()).toHaveClass(/y-button--icon/)

  await page.keyboard.press('Escape')
  await expect(page.locator('.lightbox')).toHaveCount(0)
})
