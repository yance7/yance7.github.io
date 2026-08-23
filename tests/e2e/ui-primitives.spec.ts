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
  await expect(page.locator('.page-compass')).toHaveCSS('overflow', 'visible')

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

test('archive proof links share one semantic primitive across works and research', async ({ page }) => {
  await page.goto('/works.html')
  await expect(page.locator('.sc-proof-links .y-archive-link').first()).toBeVisible()

  await page.goto('/research.html')
  await expect(page.locator('.tl-proof-list .y-archive-link').first()).toBeVisible()
})

test('metric surfaces refine their boundary without adding elevation', async ({ page }) => {
  await page.goto('/academics.html')
  const metric = page.locator('.metric-card').first()
  await metric.scrollIntoViewIfNeeded()
  await metric.hover()

  await expect(metric).toHaveCSS('transform', 'none')
  await expect(metric).toHaveCSS('box-shadow', /inset/)
  const numberMetrics = await metric.locator('b').evaluate((element) => {
    const style = getComputedStyle(element)
    return { fontSize: parseFloat(style.fontSize), lineHeight: parseFloat(style.lineHeight) }
  })
  expect(numberMetrics.lineHeight).toBeLessThan(numberMetrics.fontSize)
})
