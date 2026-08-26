import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

const routes = [
  '/en/',
  '/en/academics.html',
  '/en/honors.html',
  '/en/research.html',
  '/en/works.html',
  '/en/concerts.html'
] as const

const viewports = [
  { name: 'desktop', width: 1200, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 }
] as const

async function expectNoDocumentOverflow(page: Page) {
  const geometry = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }))

  expect(geometry.scrollWidth)
    .toBeLessThanOrEqual(geometry.clientWidth + 1)
}

for (const viewport of viewports) {
  for (const route of routes) {
    test(`English layout stays inside viewport: ${viewport.name} ${route}`, async ({ page }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height
      })

      await page.goto(route)

      await expect(page.locator('.site-shell'))
        .toHaveAttribute('data-page-load-state', 'ready')

      await expectNoDocumentOverflow(page)
    })
  }
}

test('English section title preserves semantic spacing around accent text', async ({ page }) => {
  await page.goto('/en/')

  const heading = page.locator('#selected-work .section-head h2')

  await expect(heading)
    .toHaveText('Turning research into something usable')
})

test('English research method groups do not duplicate the same label', async ({ page }) => {
  await page.goto('/en/research.html')

  const firstGroup = page.locator('.toolchain-group').first()

  await expect(firstGroup.locator('.tc-group-head strong'))
    .toHaveText('Modeling and explanation')

  await expect(firstGroup.locator('.tc-group-head small'))
    .toHaveText('MODEL / EXPLAIN')
})

test('English project identity does not render FreshEye twice', async ({ page }) => {
  await page.goto('/en/works.html')

  const identity = page.locator('.sc-identity').first()

  await expect(identity.locator('h3 > span'))
    .toHaveText('FreshEye')

  await expect(identity.locator('.sc-wordmark'))
    .toHaveCount(0)
})
