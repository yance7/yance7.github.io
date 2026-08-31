import { expect, test } from '@playwright/test'

test('content pages expose a localized transform-driven reading progress bar', async ({ page }) => {
  await page.goto('/research.html')

  const progress = page.locator('.scroll-progress')
  const bar = page.locator('.scroll-bar')
  await expect(progress).toHaveRole('progressbar')
  await expect(progress).toHaveAttribute('aria-label', '阅读进度')
  await expect(progress).toHaveAttribute('aria-valuemin', '0')
  await expect(progress).toHaveAttribute('aria-valuemax', '100')
  await expect(progress).toHaveAttribute('aria-valuenow', '0')
  await expect(bar).toHaveAttribute('style', /transform: scaleX\(/)

  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'auto' }))
  await expect.poll(() => progress.getAttribute('aria-valuenow')).toBe('100')
  await expect(bar).toHaveAttribute('style', /scaleX\(1\)/)
})

test('404 pages do not mount the reading progress surface', async ({ page }) => {
  await page.goto('/404.html')

  await expect(page.locator('.scroll-progress')).toHaveCount(0)
})
