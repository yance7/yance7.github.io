import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { htmlPageEntries } from '../../src/data/pageRegistry'

const archiveRoutes = htmlPageEntries.map(({ htmlName }) => `${htmlName}.html`)

test('compatibility pages boot without horizontal overflow', async ({ page }) => {
  for (const route of archiveRoutes) {
    await page.goto(`/${route}`)
    await expect(page.locator('main#main')).toBeVisible()
    const layout = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      viewportWidth: window.innerWidth
    }))
    expect(layout.documentWidth, route).toBeLessThanOrEqual(layout.viewportWidth)
    expect(layout.bodyWidth, route).toBeLessThanOrEqual(layout.viewportWidth)
  }
})

test('compatibility hash navigation and PageCompass settle together', async ({ page }) => {
  await page.goto('/works.html#project-encore')
  const target = page.locator('#project-encore')
  await expect(target).toBeVisible()
  await expect.poll(() => target.evaluate((element) => Math.round(element.getBoundingClientRect().top))).toBeGreaterThanOrEqual(12)
  await expect(page.locator('.page-compass-link[href="#project-encore"]')).toHaveAttribute('aria-current', 'location')
})

test('mobile PageCompass stays quiet until reading begins', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/index.html')

  const compass = page.locator('.page-compass')
  await expect(compass).toHaveAttribute('data-mobile-state', 'quiet')
  await expect(compass).toHaveAttribute('aria-hidden', 'true')
  await expect(compass).toHaveAttribute('inert', '')
  await expect(compass).toHaveCSS('visibility', 'hidden')
  await expect(compass).toHaveCSS('pointer-events', 'none')

  await page.mouse.wheel(0, 320)
  await expect(compass).toHaveAttribute('data-mobile-state', 'visible')
  await expect(compass).not.toHaveAttribute('aria-hidden', 'true')
  await expect(compass).not.toHaveAttribute('inert', '')
  await expect(compass).toHaveCSS('visibility', 'visible')
  await expect(compass).toHaveCSS('pointer-events', 'auto')
})

test('compatibility menu, carousel, modal, and axe smoke remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/index.html')
  await page.locator('.menu-trigger').click()
  await expect(page.locator('.mobile-menu-overlay')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.mobile-menu-overlay')).toHaveCount(0)

  await page.goto('/concerts.html')
  const carousel = page.locator('.concert-poster').filter({ has: page.locator('.carousel-controls') }).first()
  const counter = carousel.locator('.carousel-controls span')
  const before = await counter.textContent()
  await carousel.locator('button[aria-label="下一张"]').click()
  await expect(counter).not.toHaveText(before || '')

  await page.locator('.concert-poster .poster-open').first().click()
  await expect(page.locator('.lightbox')).toBeVisible()
  await expect(new AxeBuilder({ page }).analyze()).resolves.toMatchObject({ violations: [] })
  await page.keyboard.press('Escape')
  await expect(page.locator('.lightbox')).toHaveCount(0)
})
