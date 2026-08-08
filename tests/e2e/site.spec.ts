import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
}

test('all archive pages boot and expose the main landmark', async ({ page }) => {
  for (const route of ['index.html', 'academics.html', 'honors.html', 'research.html', 'works.html', 'concerts.html']) {
    await page.goto(`/${route}`)
    await expect(page.locator('main#main')).toBeVisible()
  }
})

test('mobile navigation opens, traps focus, and closes explicitly', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/index.html')
  await page.locator('.menu-trigger').click()
  await expect(page.locator('.mobile-menu-overlay')).toBeVisible()
  await expect(page.locator('.mobile-menu-close')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.locator('.mobile-menu a').first()).toBeFocused()
  await page.locator('.mobile-menu-close').click()
  await expect(page.locator('.mobile-menu-overlay')).toHaveCount(0)
})

test('theme preference persists after reload', async ({ page }) => {
  await page.goto('/index.html')
  await page.evaluate(() => localStorage.removeItem('yance-theme'))
  await page.reload()
  await page.locator('.theme-orbit').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('honors filtering and detail disclosure use stable ids', async ({ page }) => {
  await page.goto('/honors.html')
  await page.locator('.filter-btn').filter({ hasText: '领航级' }).click()
  await expect(page.locator('.honor-card')).toHaveCount(4)
  const detailButton = page.locator('.honor-expand').first()
  await detailButton.click()
  await expect(detailButton).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator(`#${await detailButton.getAttribute('aria-controls')}`)).toBeVisible()
})

test('research methodology disclosure and proof links are reachable', async ({ page }) => {
  await page.goto('/research.html')
  const toggle = page.locator('.method-toggle').first()
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator(`#${await toggle.getAttribute('aria-controls')}`)).toBeVisible()
  await expect(page.locator('.tl-proof a').first()).toHaveAttribute('href', /https?:\/\//)
})

test('research deployment link lands on the FreshEye case study', async ({ page }) => {
  await page.goto('/research.html')
  await page.locator('a[href="works.html#project-fresheye"]').first().click()
  await expect(page).toHaveURL(/works\.html#project-fresheye/)
  await expect(page.locator('#project-fresheye')).toBeInViewport()
})

test('FreshEye product preview switches between input, result, and explain', async ({ page }) => {
  await page.goto('/works.html#project-fresheye')
  const tabs = page.locator('.sc-shot-tabs [role="tab"]')
  await expect(tabs).toHaveCount(3)
  await tabs.filter({ hasText: 'RESULT' }).click()
  await expect(page.locator('#shot-panel-result')).toContainText('Fresh')
  await tabs.filter({ hasText: 'EXPLAIN' }).click()
  await expect(page.locator('#shot-panel-explain')).toContainText('Grad-CAM')
})

test('FreshEye tabs support roving keyboard navigation', async ({ page }) => {
  await page.goto('/works.html#project-fresheye')
  const input = page.getByRole('tab', { name: /INPUT/ })
  const result = page.getByRole('tab', { name: /RESULT/ })
  const explain = page.getByRole('tab', { name: /EXPLAIN/ })

  await input.focus()
  await page.keyboard.press('ArrowRight')
  await expect(result).toBeFocused()
  await expect(result).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('ArrowRight')
  await expect(explain).toBeFocused()
  await page.keyboard.press('Home')
  await expect(input).toBeFocused()
  await page.keyboard.press('End')
  await expect(explain).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await expect(result).toBeFocused()
})

test('concert thumbnails respond and carousel/lightbox controls work', async ({ page }) => {
  await page.goto('/concerts.html')
  const thumbnail = await page.locator('picture source').first().getAttribute('srcset')
  expect(thumbnail).toBeTruthy()
  const response = await page.request.get(new URL(thumbnail!, 'http://127.0.0.1:4173').toString())
  expect(response.status()).toBe(200)

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

test('interactive states remain accessible after opening', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/index.html')
  await page.locator('.menu-trigger').click()
  await expectAccessible(page)
  await page.locator('.mobile-menu-close').click()

  await page.goto('/honors.html')
  await page.locator('.honor-expand').first().click()
  await expectAccessible(page)

  await page.goto('/research.html')
  await page.locator('.method-toggle').first().click()
  await expectAccessible(page)

  await page.goto('/works.html')
  await page.getByRole('tab', { name: /EXPLAIN/ }).click()
  await expect(page.locator('#shot-panel-explain')).toBeVisible()
  await page.waitForTimeout(400)
  await expectAccessible(page)

  await page.goto('/concerts.html')
  await page.locator('.poster-open').first().click()
  await expect(page.locator('.lightbox')).toBeVisible()
  await expectAccessible(page)
  await page.keyboard.press('Escape')
})

for (const route of ['index.html', 'academics.html', 'honors.html', 'research.html', 'works.html', 'concerts.html']) {
  test(`axe audit: ${route}`, async ({ page }) => {
    await page.goto(`/${route}`)
    await expectAccessible(page)
  })
}
