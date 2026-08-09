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
  await expect(page.locator('.mobile-menu a.active')).toHaveAttribute('aria-current', 'page')
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

test('home focus cards keep the research-product link on keyboard focus', async ({ page }) => {
  await page.goto('/index.html')
  await page.locator('.focus-product .focus-card-main').focus()
  await expect(page.locator('.home-focus-connector')).toHaveCSS('opacity', '1')
})

test('section dots preserve native fragment navigation', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 })
  await page.goto('/honors.html')
  const archiveDot = page.locator('.section-dot[href="#sec-honors-archive"]')
  await archiveDot.click()
  await expect(page).toHaveURL(/honors\.html#sec-honors-archive/)
  await expect(archiveDot).toHaveAttribute('aria-current', 'location')
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

test('works uses unified icon cards without product images', async ({ page }) => {
  await page.goto('/works.html')
  await expect(page.locator('.showcase')).toHaveCount(2)
  await expect(page.locator('.page-works img')).toHaveCount(0)
  await expect(page.locator('.project-mark-eye')).toBeVisible()
  await expect(page.locator('.project-mark-spotlight')).toBeVisible()

  const ratios = await page.locator('.sc-visual-panel').evaluateAll((panels) => panels.map((panel) => {
    const rect = panel.getBoundingClientRect()
    return rect.width / rect.height
  }))
  expect(Math.abs(ratios[0] - ratios[1])).toBeLessThan(0.03)

  await page.locator('#project-fresheye').hover()
  await expect(page.locator('.mark-fish-eye')).toHaveCSS('animation-name', 'fish-blink')
  await page.locator('#project-encore').hover()
  await expect(page.locator('.mark-spotlight-cone')).toHaveCSS('animation-name', 'spotlight-breathe')
})

test('academics pending scores use a compact badge', async ({ page }) => {
  await page.goto('/academics.html')
  const content = await page.locator('.ap-row.pending .ap-badge').first().evaluate((element) => getComputedStyle(element, '::after').content)
  expect(content).toBe('"?"')
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
