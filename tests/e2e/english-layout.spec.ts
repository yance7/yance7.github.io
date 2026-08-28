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
  { name: 'narrow', width: 320, height: 844 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 900 },
  { name: 'desktop', width: 1024, height: 900 },
  { name: 'wide', width: 1440, height: 900 }
] as const

async function expectNoDocumentOverflow(page: Page) {
  const geometry = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    viewportWidth: window.innerWidth
  }))

  expect(geometry.scrollWidth)
    .toBeLessThanOrEqual(geometry.viewportWidth + 1)
  expect(geometry.bodyScrollWidth)
    .toBeLessThanOrEqual(geometry.viewportWidth + 1)
}

async function expectEnglishLayoutSurfacesInsideViewport(page: Page) {
  const violations = await page.evaluate(() => {
    const selectors = [
      '.hero-title',
      '.section-head h2',
      '.site-nav',
      '.site-footer',
      '.page-compass',
      '.metric-card',
      '.filter-btn',
      '.tl-item',
      '.showcase'
    ]

    return selectors.flatMap((selector) => [...document.querySelectorAll<HTMLElement>(selector)]
      .filter((element) => {
        const rect = element.getBoundingClientRect()
        return rect.width > 0 && (rect.left < -1 || rect.right > window.innerWidth + 1)
      })
      .map((element) => ({ selector, text: element.textContent?.trim().slice(0, 80) })))
  })

  expect(violations).toEqual([])
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
      await expectEnglishLayoutSurfacesInsideViewport(page)
    })
  }
}

test('English section title preserves semantic spacing around accent text', async ({ page }) => {
  await page.goto('/en/')

  const heading = page.locator('#selected-work .section-head h2')

  await expect(heading)
    .toHaveText('Turning research into something usable')
})

test('English archive hero keeps words intact and gives spaces visual width', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/en/academics.html')

  const hero = page.locator('.hero-title.hero-lyric')
  await expect(hero).toHaveAttribute('aria-label', 'Academic record')

  const geometry = await hero.evaluate((element) => {
    const words = [...element.querySelectorAll<HTMLElement>('.lyric-word')]
    const spaces = [...element.querySelectorAll<HTMLElement>('.lyric-space')]
    const wordLines = words.map((word) => {
      const characterLines = [...word.querySelectorAll<HTMLElement>('.lyric-char')]
        .map((character) => Math.round(character.getBoundingClientRect().top))
      return new Set(characterLines).size
    })

    return {
      words: words.map((word) => word.textContent),
      spaceWidths: spaces.map((space) => space.getBoundingClientRect().width),
      wordLines
    }
  })

  expect(geometry.words).toEqual(['Academic', 'record'])
  expect(geometry.spaceWidths.every((width) => width > 0)).toBe(true)
  expect(geometry.wordLines).toEqual([1, 1])
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
