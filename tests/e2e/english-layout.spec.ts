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
  { name: 'wide-desktop', width: 1080, height: 943 },
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

async function expectEnglishTextSurfacesReadable(page: Page) {
  const violations = await page.evaluate(() => {
    const selectors = [
      '.home-stage-heading',
      '.home-stage-title',
      '.home-stage-copy',
      '.hero-title',
      '.hero-copy',
      '.section-head h2',
      '.section-head p',
      '.nav-rail a',
      '.beyond-label',
      '.beyond-leadership strong',
      '.beyond-leadership span',
      '.beyond-leadership small',
      '.beyond-activity strong',
      '.beyond-activity small',
      '.education-name',
      '.education-en',
      '.ap-main strong',
      '.ap-main small',
      '.filter-btn',
      '.honor-title',
      '.honor-org',
      '.tl-body h3',
      '.tl-body > p',
      '.tc-group-head strong',
      '.tc-group-head small',
      '.sc-overline',
      '.sc-identity h3 > span',
      '.sc-value',
      '.sc-desc',
      '.sc-chapter strong',
      '.sc-chapter p',
      '.sc-role > span:last-child',
      '.next-up-card strong',
      '.next-up-card small',
      '.concert-venue',
      '.foot-contact-value',
      '.hero-action'
    ]

    return selectors.flatMap((selector) => [...document.querySelectorAll<HTMLElement>(selector)]
      .filter((element) => {
        let ancestor = element.parentElement
        while (ancestor) {
          const ancestorOverflowX = getComputedStyle(ancestor).overflowX
          if (['auto', 'scroll'].includes(ancestorOverflowX)) return false
          ancestor = ancestor.parentElement
        }

        const hasHorizontalOverflow = element.scrollWidth > element.clientWidth + 1
        const rect = element.getBoundingClientRect()
        return hasHorizontalOverflow
          || rect.left < -1
          || rect.right > window.innerWidth + 1
      })
      .map((element) => ({
        selector,
        text: element.textContent?.trim().slice(0, 100),
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
        overflowX: getComputedStyle(element).overflowX,
        left: element.getBoundingClientRect().left,
        right: element.getBoundingClientRect().right
      })))
  })

  expect(violations).toEqual([])
}

async function expectEnglishLeadershipRowsDoNotCollide(page: Page) {
  const violations = await page.evaluate(() => {
    type TextRect = Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'>

    const getTextRects = (element: HTMLElement): TextRect[] => {
      const range = document.createRange()
      range.selectNodeContents(element)
      return [...range.getClientRects()].map((rect) => ({
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom
      }))
    }

    const overlaps = (first: TextRect, second: TextRect) => (
      first.left < second.right - .5
      && first.right > second.left + .5
      && first.top < second.bottom - .5
      && first.bottom > second.top + .5
    )

    return [...document.querySelectorAll<HTMLElement>('.beyond-leadership')]
      .flatMap((row) => {
        const elements = ['strong', 'span', 'small'].map((selector) => row.querySelector<HTMLElement>(selector))
        const rects = elements.map((element) => element ? getTextRects(element) : [])
        const rowViolations: string[] = []

        for (let firstIndex = 0; firstIndex < rects.length; firstIndex += 1) {
          for (let secondIndex = firstIndex + 1; secondIndex < rects.length; secondIndex += 1) {
            const firstRects = rects[firstIndex] ?? []
            const secondRects = rects[secondIndex] ?? []
            if (firstRects.some((first) => secondRects.some((second) => overlaps(first, second)))) {
              rowViolations.push(`${elements[firstIndex]?.textContent} / ${elements[secondIndex]?.textContent}`)
            }
          }
        }

        return rowViolations.map((pair) => ({ row: row.textContent?.trim(), pair }))
      })
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
      await expectEnglishTextSurfacesReadable(page)
    })
  }
}

for (const viewport of viewports) {
  test(`English leadership roles never collide: ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height
    })

    await page.goto('/en/')

    await expect(page.locator('.site-shell'))
      .toHaveAttribute('data-page-load-state', 'ready')

    await expectEnglishLeadershipRowsDoNotCollide(page)
  })
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
