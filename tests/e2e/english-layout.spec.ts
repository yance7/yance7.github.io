import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { waitForHydration } from './helpers/hydration'

const routes = [
  '/en/',
  '/en/academics/',
  '/en/honors/',
  '/en/research/',
  '/en/works/',
  '/en/concerts/'
] as const

for (const width of [320, 390, 768, 1440]) for (const theme of ['light', 'dark']) {
  test(`English leadership renders the approved institution names without truncation at ${width}px ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.addInitScript(theme => localStorage.setItem('yance-theme', theme), theme)
    await page.goto('/en/')
    const root = page.locator('html')
    await waitForHydration(page)
    await expect(root).toHaveAttribute('data-fonts-ready', /^(ready|fallback)$/)
    await page.evaluate(() => document.fonts.ready)
    const names = page.locator('.beyond-leadership > span')
    await expect(names).toHaveText([
      'iHOSA Science and Technology Innovation Club', 'Biology Club',
      'Student Institute for Self Management', 'Student Institute for Self Management'
    ])
    await names.first().scrollIntoViewIfNeeded()
    const readable = await names.evaluateAll(elements => elements.every(element => {
      const box = element.getBoundingClientRect()
      const range = document.createRange()
      range.selectNodeContents(element)
      const text = range.getBoundingClientRect()
      return text.left >= box.left - 1 && text.right <= box.right + 1
        && element.scrollHeight <= element.clientHeight + 1
        && parseFloat(getComputedStyle(element).fontSize) >= 12
    }))
    expect(readable, `${width}px ${theme} complete institution labels`).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

const viewports = [
  { name: 'narrow', width: 320, height: 844 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 900 },
  { name: 'desktop', width: 1024, height: 900 },
  { name: 'wide-desktop', width: 1080, height: 943 },
  { name: 'wide', width: 1440, height: 900 }
] as const

const heroViewports = [
  { name: 'narrow', width: 320, height: 844 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 900 },
  { name: 'desktop', width: 1024, height: 900 },
  { name: 'wide', width: 1440, height: 900 }
] as const

const archiveHeroContracts = [
  {
    route: '/en/academics/',
    heading: 'Academics',
    epigraph: 'From here, tomorrow finds its course',
    credit: { artist: 'JJ Lin', song: '明日坐标', album: '明日坐标' }
  },
  {
    route: '/en/honors/',
    heading: 'Honors',
    epigraph: 'Step by step, I keep climbing',
    credit: { artist: 'Jay Chou', song: '蜗牛', album: 'Fantasy Plus' }
  },
  {
    route: '/en/research/',
    heading: 'Research',
    epigraph: 'You share this imperfect dream with me',
    credit: { artist: 'TFBOYS', song: '不完美小孩', album: '我们的时光' }
  },
  {
    route: '/en/works/',
    heading: 'Works',
    epigraph: 'Little by little, I learned that effort can lead to success',
    credit: { artist: 'Silence Wang', song: '慢慢懂', album: '慢慢懂' }
  },
  {
    route: '/en/concerts/',
    heading: 'Concerts',
    epigraph: 'Fate brought us together beyond this restless world',
    credit: { artist: 'G.E.M.', song: '光年之外', album: 'Single' }
  }
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

async function readEnglishTextSurfaceViolations(page: Page) {
  return page.evaluate(() => {
    const selectors = [
      '.home-hero-kicker',
      '.home-hero-typewriter',
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
      '.concert-info h3',
      '.concert-info p',
      '.concert-venue',
      '.foot-contact',
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

        const rect = element.getBoundingClientRect()
        // Inline boxes have no clientWidth; Gecko still reports their scrollWidth.
        const contentWidth = element.clientWidth || rect.width
        const hasHorizontalOverflow = element.scrollWidth > contentWidth + 1
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

}

async function expectEnglishTextSurfacesReadable(page: Page) {
  expect(await readEnglishTextSurfaceViolations(page)).toEqual([])
}

test('English readability checks actual inline geometry and still detects clipping', async ({ page }) => {
  await page.goto('/en/academics/')
  await waitForHydration(page)
  await expect(page.locator('html')).toHaveAttribute('data-fonts-ready', 'ready')
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => {
    const container = document.createElement('div')
    container.className = 'ap-main'
    const probe = document.createElement('strong')
    probe.id = 'inline-readability-probe'
    probe.style.cssText = 'white-space:nowrap'
    probe.textContent = 'Inline probe'
    container.append(probe)
    document.querySelector('main')!.append(container)
  })
  expect(await readEnglishTextSurfaceViolations(page)).toEqual([])
  await page.locator('#inline-readability-probe').evaluate(element => {
    element.style.cssText = 'display:inline-block;width:16px;white-space:nowrap;overflow:hidden'
  })
  expect(await readEnglishTextSurfaceViolations(page)).toEqual(expect.arrayContaining([
    expect.objectContaining({ text: 'Inline probe' })
  ]))
})

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

for (const viewport of heroViewports) {
  for (const contract of archiveHeroContracts) {
    test(`English archive hero keeps heading and lyric epigraph readable: ${viewport.name} ${contract.route}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto(contract.route)
      await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
      await page.evaluate(async () => {
        await document.fonts?.ready
      })

      await expect(page.locator('h1')).toHaveCount(1)
      const heading = page.locator('h1.hero-title.hero-heading')
      await expect(heading).toHaveText(contract.heading)
      const epigraph = page.locator('.hero-epigraph')
      await expect(epigraph).toHaveText(contract.epigraph)
      await expect(page.locator('.lyric-credit')).toContainText(contract.credit.artist)
      await expect(page.locator('.lyric-credit')).toContainText(`「${contract.credit.song}」`)
      await expect(page.locator('.lyric-credit')).toContainText(contract.credit.album)

      const geometry = await page.locator('.hero-main').evaluate((element) => {
        const measure = (selector: string) => {
          const el = element.querySelector<HTMLElement>(selector)
          if (!el) return null
          const rect = el.getBoundingClientRect()
          const range = document.createRange()
          range.selectNodeContents(el)
          const text = range.getBoundingClientRect()
          const style = getComputedStyle(el)
          return {
            left: rect.left,
            right: rect.right,
            textLeft: text.left,
            textRight: text.right,
            scrollWidth: el.scrollWidth,
            clientWidth: el.clientWidth,
            fontSize: Number.parseFloat(style.fontSize),
            opacity: Number.parseFloat(style.opacity)
          }
        }
        return {
          heading: measure('.hero-title.hero-heading'),
          epigraph: measure('.hero-epigraph'),
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth
        }
      })

      expect(geometry.heading).not.toBeNull()
      expect(geometry.epigraph).not.toBeNull()
      for (const [label, box] of Object.entries({ heading: geometry.heading!, epigraph: geometry.epigraph! })) {
        expect(box.textLeft, `${label} text left`).toBeGreaterThanOrEqual(box.left - 1)
        expect(box.textRight, `${label} text right`).toBeLessThanOrEqual(box.right + 1)
        expect(box.scrollWidth, `${label} horizontal overflow`).toBeLessThanOrEqual(box.clientWidth + 1)
        expect(box.fontSize, `${label} font size`).toBeGreaterThanOrEqual(12)
        expect(box.opacity, `${label} opacity`).toBe(1)
        expect(box.right, `${label} within viewport`).toBeLessThanOrEqual(geometry.viewportWidth + 1)
      }
      expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth + 1)
    })
  }
}

for (const contract of archiveHeroContracts) {
  test(`English archive hero remains readable in light and dark themes: ${contract.route}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(contract.route)

    for (const theme of ['light', 'dark'] as const) {
      await page.evaluate((selectedTheme) => localStorage.setItem('yance-theme', selectedTheme), theme)
      await page.reload()
      await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')

      const appearance = await page.locator('.hero-main').evaluate((element) => {
        const read = (selector: string) => {
          const el = element.querySelector<HTMLElement>(selector)
          if (!el) return null
          const style = getComputedStyle(el)
          return { color: style.color, opacity: style.opacity, background: style.backgroundColor }
        }
        return {
          heading: read('.hero-title.hero-heading'),
          epigraph: read('.hero-epigraph'),
          credit: read('.lyric-credit')
        }
      })

      for (const part of [appearance.heading, appearance.epigraph, appearance.credit]) {
        expect(part).not.toBeNull()
        expect(part!.color).toMatch(/^rgb/)
        expect(part!.opacity).toBe('1')
        expect(part!.background).toBe('rgba(0, 0, 0, 0)')
      }
      await expect(page.locator('.hero-epigraph')).toBeVisible()
      await expect(page.locator('.lyric-credit')).toBeVisible()
    }
  })
}

test('English archive hero layout geometry is stable after takeover', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })

  for (const contract of archiveHeroContracts) {
    await page.goto(contract.route)
    await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
    await expect(page.locator('html')).toHaveAttribute('data-fonts-ready', 'ready')
    await page.evaluate(async () => {
      await document.fonts?.ready
    })

    const measureLayout = () => page.locator('.hero-main').evaluate((element) => {
      const hero = element as HTMLElement
      const title = element.querySelector<HTMLElement>('.hero-title')
      const epigraph = element.querySelector<HTMLElement>('.hero-epigraph')
      const copy = element.querySelector<HTMLElement>('.hero-copy')
      const credit = element.querySelector<HTMLElement>('.lyric-credit')
      return {
        heroHeight: hero.offsetHeight,
        titleTop: title?.offsetTop,
        titleHeight: title?.offsetHeight,
        epigraphTop: epigraph?.offsetTop,
        copyTop: copy?.offsetTop,
        creditTop: credit?.offsetTop
      }
    })

    const before = await measureLayout()
    await page.evaluate(() => new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    }))
    const after = await measureLayout()

    expect(after).toEqual(before)
  }
})

test('English research method groups do not duplicate the same label', async ({ page }) => {
  await page.goto('/en/research/')

  const firstGroup = page.locator('.toolchain-group').first()

  await expect(firstGroup.locator('.tc-group-head strong'))
    .toHaveText('Modeling and explanation')

  await expect(firstGroup.locator('.tc-group-head small'))
    .toHaveText('MODEL / EXPLAIN')
})

test('English project identity does not render FreshEye twice', async ({ page }) => {
  await page.goto('/en/works/')

  const identity = page.locator('.sc-identity').first()

  await expect(identity.locator('h3 > span'))
    .toHaveText('FreshEye')

  await expect(identity.locator('.sc-wordmark'))
    .toHaveCount(0)
})
