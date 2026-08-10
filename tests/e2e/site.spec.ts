import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
}

test('all archive pages boot and expose the main landmark', async ({ page }) => {
  for (const route of ['index.html', 'academics.html', 'honors.html', 'research.html', 'works.html', 'concerts.html', '404.html']) {
    await page.goto(`/${route}`)
    await expect(page.locator('main#main')).toBeVisible()
  }
})

test('archive layouts avoid horizontal overflow on narrow screens', async ({ page }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 })
    for (const route of ['index.html', 'academics.html', 'honors.html', 'research.html', 'works.html', 'concerts.html', '404.html']) {
      await page.goto(`/${route}`)
      const layout = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        viewportWidth: window.innerWidth
      }))
      expect(layout.documentWidth, `${route} document at ${width}px`).toBeLessThanOrEqual(layout.viewportWidth)
      expect(layout.bodyWidth, `${route} body at ${width}px`).toBeLessThanOrEqual(layout.viewportWidth)
    }
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

test('home leads with a lyric carousel instead of the old thesis wordmark', async ({ page }) => {
  await page.goto('/index.html')
  await expect(page.locator('.hero-name, .home-statement')).toHaveCount(0)
  await expect(page.locator('.lyric-carousel')).toBeVisible()
  await expect(page.locator('.archive-entry')).toHaveCount(0)
  await expect(page.locator('.home-signal')).toHaveCount(3)
  await expect(page.locator('.hero-action.primary')).toHaveAttribute('href', '#selected-work')
})

test('home keeps the Yance wordmark at both archive anchors', async ({ page }) => {
  await page.goto('/index.html')
  await expect(page.locator('header .wordmark')).toHaveText('Yance.')
  await expect(page.locator('.foot-mark')).toContainText('Yance.')
})

test('home renders a cinematic archive stage around the lyric carousel', async ({ page }) => {
  await page.goto('/index.html')
  await expect(page.locator('.home-hero')).toBeVisible()
  await expect(page.locator('.home-stage')).toBeVisible()
  await expect(page.locator('.home-stage-meta')).toContainText('PERSONAL ARCHIVE / BEIJING · 2026')
  await expect(page.locator('.home-stage-main')).toBeVisible()
  await expect(page.locator('.home-stage-rail')).toBeVisible()
  await expect(page.locator('.home-stage-scroll')).toBeVisible()
  await expect(page.locator('.home-hero .lyric-carousel')).toBeVisible()
  await expect(page.locator('.home-hero .home-signal')).toHaveCount(3)
  await expect(page.locator('.archive-hero.hero-home')).toHaveCount(0)
})

test('home stage keeps its visual hierarchy across desktop and narrow screens', async ({ page }) => {
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/index.html')
    const layout = await page.evaluate(() => {
      const main = document.querySelector('.home-stage-main')!.getBoundingClientRect()
      const rail = document.querySelector('.home-stage-rail')!.getBoundingClientRect()
      return {
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        mainLeft: main.left,
        mainBottom: main.bottom,
        railLeft: rail.left,
        railTop: rail.top
      }
    })
    expect(layout.documentWidth, `home document at ${width}px`).toBeLessThanOrEqual(layout.viewportWidth)
    if (width >= 900) {
      expect(layout.railLeft).toBeGreaterThan(layout.mainLeft)
      expect(layout.railTop).toBeLessThan(layout.mainBottom)
    } else {
      expect(layout.railTop).toBeGreaterThanOrEqual(layout.mainBottom - 1)
    }
  }
})

test('home assigns distinct font roles to prose, display and technical metadata', async ({ page }) => {
  await page.goto('/index.html')
  await page.evaluate(() => document.fonts.ready)
  const fonts = await page.evaluate(() => {
    const read = (selector: string) => getComputedStyle(document.querySelector(selector)!).fontFamily
    return {
      body: read('body'),
      display: read('.wordmark'),
      serif: read('.lyric-quote'),
      technical: read('.lyric-carousel-index'),
      action: read('.hero-action'),
      signal: read('.home-signal strong')
    }
  })
  expect(fonts.body).toContain('Inter')
  expect(fonts.display).toContain('Inter')
  expect(fonts.serif).toContain('Noto Serif SC Variable')
  expect(fonts.technical).toContain('IBM Plex Mono')
  expect(fonts.action).toContain('Inter')
  expect(fonts.signal).toContain('Inter')

  await page.goto('/research.html')
  await page.evaluate(() => document.fonts.ready)
  const researchFonts = await page.evaluate(() => {
    const read = (selector: string) => getComputedStyle(document.querySelector(selector)!).fontFamily
    return {
      title: read('.tl-body h3'),
      tool: read('.tc-tool strong'),
      toolMeta: read('.tc-tool small')
    }
  })
  expect(researchFonts.title).toContain('Inter')
  expect(researchFonts.tool).toContain('Inter')
  expect(researchFonts.toolMeta).toContain('IBM Plex Mono')
})

test('home lyric carousel supports automatic and accessible manual navigation', async ({ page }) => {
  await page.goto('/index.html')
  const carousel = page.locator('.lyric-carousel')
  await expect(carousel).toBeVisible()
  await expect(carousel).toHaveAttribute('data-index', '0')
  await expect(carousel.locator('.lyric-artist')).toHaveText('周杰伦')

  await carousel.locator('[aria-label="下一句"]').click()
  await expect(carousel).toHaveAttribute('data-index', '1')
  await expect(carousel.locator('.lyric-artist')).toHaveText('林俊杰')

  await carousel.locator('[aria-label="暂停轮播"]').click()
  await expect(carousel.locator('[aria-label="继续轮播"]')).toBeVisible()
  await carousel.focus()
  await page.keyboard.press('ArrowRight')
  await expect(carousel).toHaveAttribute('data-index', '2')
  await page.keyboard.press('Home')
  await expect(carousel).toHaveAttribute('data-index', '0')

  await carousel.locator('[aria-label="继续轮播"]').click()
  await expect(carousel.locator('[aria-label="暂停轮播"]')).toBeVisible()
})

test('home lyric carousel advances automatically while idle', async ({ page }) => {
  await page.goto('/index.html')
  const carousel = page.locator('.lyric-carousel')
  await expect.poll(() => carousel.getAttribute('data-index'), { timeout: 7500 }).toBe('1')
})

test('home lyric carousel stops automatic motion when reduced motion is requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/index.html')
  const carousel = page.locator('.lyric-carousel')
  await expect(carousel).toHaveAttribute('data-index', '0')
  await page.waitForTimeout(6200)
  await expect(carousel).toHaveAttribute('data-index', '0')
  await expect(carousel.locator('[aria-label="播放轮播"]')).toBeVisible()
})

test('bundled typography and reading progress stay explicit', async ({ page }) => {
  await page.goto('/works.html')
  await page.evaluate(() => document.fonts.ready)
  const bodyFont = await page.locator('body').evaluate((element) => getComputedStyle(element).fontFamily)
  const displayFont = await page.locator('.hero-title').evaluate((element) => getComputedStyle(element).fontFamily)
  expect(bodyFont).toContain('Inter')
  expect(displayFont).toContain('Noto Serif SC Variable')
  await expect(page.locator('.scroll-progress')).toHaveAttribute('role', 'progressbar')
  await expect(page.locator('.scroll-progress')).toHaveAttribute('aria-valuenow', '0')
  await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'auto' }))
  await expect.poll(() => page.locator('.scroll-progress').getAttribute('aria-valuenow')).not.toBe('0')
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
  await expect(page.locator('.honor-card').first()).toHaveClass(/revealed/)
  const detailButton = page.locator('.honor-expand').first()
  await detailButton.click()
  await expect(detailButton).toHaveAttribute('aria-expanded', 'true')
  await expect(detailButton.locator('.disclosure-mark')).toHaveText('−')
  await expect(page.locator(`#${await detailButton.getAttribute('aria-controls')}`)).toBeVisible()
})

test('research methodology disclosure and proof links are reachable', async ({ page }) => {
  await page.goto('/research.html')
  const toggle = page.locator('.method-toggle').first()
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(toggle.locator('.disclosure-mark')).toHaveText('−')
  const disclosure = page.locator(`#${await toggle.getAttribute('aria-controls')}`)
  await expect(disclosure).toHaveClass(/open/)
  await expect(disclosure.locator('.method-grid')).toHaveCSS('max-height', 'none')
  await expect(page.locator('.tl-proof a').first()).toHaveAttribute('href', /https?:\/\//)
})

test('copy citation uses one explicit control system in both themes', async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as Window & { __copyWrites?: number }
    state.__copyWrites = 0
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async () => { state.__copyWrites = (state.__copyWrites || 0) + 1 }
      }
    })
  })

  for (const theme of ['light', 'dark']) {
    await page.goto('/research.html')
    await page.evaluate((value) => localStorage.setItem('yance-theme', value), theme)
    await page.reload()
    const button = page.locator('.copy-citation').first()
    await expect(button).toBeVisible()
    const appearance = await button.evaluate((element) => {
      const style = getComputedStyle(element)
      return { background: style.backgroundColor, border: style.borderStyle, radius: style.borderRadius }
    })
    expect(appearance.background).not.toBe('rgba(0, 0, 0, 0)')
    expect(appearance.border).toBe('solid')
    expect(parseFloat(appearance.radius)).toBeGreaterThan(10)
    await button.evaluate((element) => {
      for (let i = 0; i < 8; i += 1) (element as HTMLButtonElement).click()
    })
    await expect(button).toHaveAttribute('data-state', 'success')
    await expect(button.locator('.copy-label')).toHaveText('已复制')
    expect(await page.evaluate(() => (window as Window & { __copyWrites?: number }).__copyWrites)).toBe(1)
  }
})

test('research workbench groups tools without a trailing empty cell', async ({ page }) => {
  await page.goto('/research.html')
  await expect(page.locator('.toolchain-group')).toHaveCount(3)
  await expect(page.locator('.toolchain-group').nth(0).locator('.tc-tool')).toHaveCount(4)
  await expect(page.locator('.toolchain-group').nth(1).locator('.tc-tool')).toHaveCount(3)
  await expect(page.locator('.toolchain-group').nth(2).locator('.tc-tool')).toHaveCount(2)
})

test('research deployment link lands on the FreshEye case study', async ({ page }) => {
  await page.goto('/research.html')
  await page.locator('a[href="works.html#project-fresheye"]').first().click()
  await expect(page).toHaveURL(/works\.html#project-fresheye/)
  await expect(page.locator('#project-fresheye')).toBeInViewport()
})

test('research project dates and statuses render the current records', async ({ page }) => {
  await page.goto('/research.html')
  await expect(page.locator('#fresheye .tl-date')).toHaveText('2026.06 — 2026.08')
  await expect(page.locator('#fishfreshnet-v2 .tl-date')).toHaveText('2026.05 — 2026.08')
  await expect(page.locator('#fishfreshnet-v2 .status-badge')).toContainText('已完成')
  await expect(page.locator('#fishfreshnet-v2 .tl-tag')).not.toContainText('PUBLISHED')
  await expect(page.locator('#fishfreshnet-v2 .tl-doi')).toHaveCount(0)
})

test('works uses typographic project dossiers without legacy icons', async ({ page }) => {
  await page.goto('/works.html')
  const lyric = page.locator('.hero-works-title')
  await expect(lyric).toHaveAttribute('aria-label', '「因为我已慢慢懂，努力就能成功」')
  await expect(lyric).toHaveCSS('white-space', 'nowrap')
  await expect(lyric.locator('br')).toHaveCount(0)
  await expect(page.locator('.showcase')).toHaveCount(2)
  await expect(page.locator('.page-works img')).toHaveCount(0)
  await expect(page.locator('[class*="project-mark"], [class*="mark-fish"], [class*="mark-spotlight"]')).toHaveCount(0)
  await expect(page.locator('.sc-dossier-main')).toHaveCount(2)
  await expect(page.locator('.sc-chapter')).toHaveCount(6)
  await expect(page.locator('.sc-proof-links a')).toHaveCount(4)
  await expect(page.locator('#project-fresheye .sc-identity h3')).toContainText('FreshEye')
  await expect(page.locator('#project-encore .sc-identity h3')).toContainText('Encore')

  await expect(page.locator('.sc-story-head')).toHaveCount(2)
  await expect(page.locator('.sc-story-head h4')).toHaveCount(0)
  await expect(page.locator('.page-works')).not.toContainText('FROM RESEARCH TO PRODUCT')
  await expect(page.locator('.page-works')).not.toContainText('FROM LIVE TO MEMORY')

  for (const width of [1440, 1100, 1024, 901, 900, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 844 })
    const layouts = await page.locator('.sc-wordmark').evaluateAll((elements) => elements.map((element) => {
      const range = document.createRange()
      range.selectNodeContents(element)
      const lineTops = [...range.getClientRects()].map((rect) => Math.round(rect.top))
      const rect = element.getBoundingClientRect()
      const container = element.closest('.sc-identity')?.getBoundingClientRect()
      return {
        lines: new Set(lineTops).size,
        inside: !!container && rect.left >= container.left - 1 && rect.right <= container.right + 1
      }
    }))
    expect(layouts, `project wordmarks at ${width}px`).toEqual([
      { lines: 1, inside: true },
      { lines: 1, inside: true }
    ])

    const sequenceFits = await page.locator('.sc-sequence li span').evaluateAll((elements) =>
      elements.every((element) => element.scrollWidth <= element.clientWidth + 1)
    )
    expect(sequenceFits, `project flow labels at ${width}px`).toBe(true)
  }

  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  const mobileLyric = page.locator('.hero-works-title')
  const mobileLyricSize = await mobileLyric.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth
  }))
  expect(mobileLyricSize.scrollWidth).toBeLessThanOrEqual(mobileLyricSize.clientWidth + 1)

  await page.setViewportSize({ width: 320, height: 700 })
  await page.reload()
  const narrowLayout = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
    lyricWidth: document.querySelector('.hero-works-title')?.scrollWidth || 0,
    lyricBox: document.querySelector('.hero-works-title')?.clientWidth || 0
  }))
  expect(narrowLayout.documentWidth).toBeLessThanOrEqual(narrowLayout.viewportWidth)
  expect(narrowLayout.lyricWidth).toBeLessThanOrEqual(narrowLayout.lyricBox + 1)
})

test('reduced motion keeps project content immediately available', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/works.html')
  const firstProject = page.locator('.showcase').first()
  await expect(firstProject).toHaveClass(/revealed/)
  await expect(firstProject).toHaveCSS('transform', 'none')
})

test('fast page jumps do not leave passed reveal content hidden', async ({ page }) => {
  for (const route of ['index.html', 'academics.html', 'honors.html', 'research.html', 'works.html', 'concerts.html']) {
    await page.goto(`/${route}`)
    await expect(page.locator('.content').first()).toBeVisible()
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
    expect(await page.locator('.reveal').count()).toBeGreaterThan(0)
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    await expect.poll(() => page.locator('.reveal:not(.revealed)').count()).toBe(0)
  }
})

test('archive pages omit the visible last updated label', async ({ page }) => {
  for (const route of ['index.html', 'academics.html', 'honors.html', 'research.html', 'works.html', 'concerts.html']) {
    await page.goto(`/${route}`)
    await expect(page.locator('.content-updated')).toHaveCount(0)
    await expect(page.locator('body')).not.toContainText('LAST UPDATED')
  }
})

test('academics pending scores use a compact badge', async ({ page }) => {
  await page.goto('/academics.html')
  const content = await page.locator('.ap-row.pending .ap-badge').first().evaluate((element) => getComputedStyle(element, '::after').content)
  expect(content).toBe('"?"')
})

test('concert album wall exposes 24 local releases and the default spotlight', async ({ page }) => {
  await page.goto('/concerts.html')
  const wall = page.locator('.album-wall-section')
  await expect(wall).toHaveCount(1)
  await expect(wall.locator('.album-tile')).toHaveCount(24)
  await expect(wall.locator('.album-spotlight')).toContainText('周杰伦')
  await expect(wall.locator('.album-spotlight')).toContainText('范特西')
  await expect(wall.locator('.album-spotlight')).toContainText('2001')
  await expect(wall.locator('.album-index')).toHaveText('01 / 24')

  const selected = wall.locator('.album-tile[aria-selected="true"]')
  await expect(selected).toHaveCount(1)
  await expect(selected).toHaveAttribute('data-album-id', 'jay-fantasy')

  const appleMusicLink = wall.locator('.album-link')
  await expect(appleMusicLink).toHaveAttribute('href', /^https:\/\/music\.apple\.com\/.+\/album\//)
  await expect(appleMusicLink).toHaveAttribute('target', '_blank')
  await expect(appleMusicLink).toHaveAttribute('rel', /noopener/)

  const firstCover = wall.locator('.album-tile img').first()
  await expect(firstCover).toBeVisible()
  const cover = await firstCover.evaluate((image: HTMLImageElement) => ({
    src: image.currentSrc,
    width: image.naturalWidth,
    height: image.naturalHeight
  }))
  expect(new URL(cover.src).pathname).toMatch(/^\/assets\/albums\//)
  expect((await page.request.get(cover.src)).status()).toBe(200)
  expect(cover.width).toBeGreaterThanOrEqual(640)
  expect(cover.height).toBeGreaterThanOrEqual(640)
})

test('concert album wall selection and looping controls stay synchronized', async ({ page }) => {
  await page.goto('/concerts.html')
  const wall = page.locator('.album-wall-section')
  const selected = wall.locator('.album-tile[aria-selected="true"]')

  await wall.locator('[data-album-id="jay-ye-hui-mei"]').click()
  await expect(wall.locator('.album-title')).toHaveText('叶惠美')
  await expect(wall.locator('.album-index')).toHaveText('02 / 24')
  await expect(selected).toHaveCount(1)
  await expect(selected).toHaveAttribute('data-album-id', 'jay-ye-hui-mei')

  await wall.locator('[data-album-id="jay-fantasy"]').click()
  await wall.locator('[aria-label="上一张专辑"]').click()
  await expect(selected).toHaveAttribute('data-album-id', 'david-tao-black-tangerine')
  await expect(wall.locator('.album-index')).toHaveText('24 / 24')
  await wall.locator('[aria-label="下一张专辑"]').click()
  await expect(selected).toHaveAttribute('data-album-id', 'jay-fantasy')
  await expect(wall.locator('.album-index')).toHaveText('01 / 24')

  await wall.locator('[aria-label="下一张专辑"]').evaluate((button: HTMLButtonElement) => {
    for (let index = 0; index < 8; index += 1) button.click()
  })
  await expect(selected).toHaveCount(1)
  await expect(wall.locator('.album-index')).toHaveText(/^\d{2} \/ 24$/)
})

test('concert album wall supports roving keyboard selection', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/concerts.html')
  const wall = page.locator('.album-wall-section')
  const tiles = wall.locator('.album-tile')
  const selected = wall.locator('.album-tile[aria-selected="true"]')

  await selected.focus()
  await expect(selected).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(tiles.nth(1)).toBeFocused()
  await expect(tiles.nth(1)).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('ArrowDown')
  await expect(tiles.nth(7)).toBeFocused()
  await expect(tiles.nth(7)).toHaveAttribute('aria-selected', 'true')

  await page.keyboard.press('Home')
  await expect(tiles.first()).toBeFocused()
  await expect(tiles.first()).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('End')
  await expect(tiles.last()).toBeFocused()
  await expect(tiles.last()).toHaveAttribute('aria-selected', 'true')

  await tiles.nth(2).focus()
  const beforeEnter = await page.evaluate(() => window.scrollY)
  await page.keyboard.press('Enter')
  await expect(tiles.nth(2)).toHaveAttribute('aria-selected', 'true')
  expect(await page.evaluate(() => window.scrollY)).toBe(beforeEnter)

  await tiles.nth(3).focus()
  const beforeSpace = await page.evaluate(() => window.scrollY)
  await page.keyboard.press('Space')
  await expect(tiles.nth(3)).toHaveAttribute('aria-selected', 'true')
  expect(await page.evaluate(() => window.scrollY)).toBe(beforeSpace)
  await expect(selected).toHaveCount(1)
})

test('concert album wall adapts at 1440 1024 768 390 and 320 pixels', async ({ page }) => {
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/concerts.html')
    const layout = await page.evaluate(() => {
      const spotlight = document.querySelector('.album-spotlight')!.getBoundingClientRect()
      const grid = document.querySelector('.album-grid')!.getBoundingClientRect()
      const firstTile = document.querySelector('.album-tile')!.getBoundingClientRect()
      const columns = getComputedStyle(document.querySelector('.album-grid')!).gridTemplateColumns.split(' ').length
      return {
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        viewportWidth: window.innerWidth,
        spotlightRight: spotlight.right,
        spotlightBottom: spotlight.bottom,
        gridLeft: grid.left,
        gridTop: grid.top,
        columns,
        tileWidth: firstTile.width,
        tileHeight: firstTile.height
      }
    })

    expect(layout.documentWidth, `document at ${width}px`).toBeLessThanOrEqual(layout.viewportWidth)
    expect(layout.bodyWidth, `body at ${width}px`).toBeLessThanOrEqual(layout.viewportWidth)
    if (width === 1440) {
      expect(layout.gridLeft).toBeGreaterThanOrEqual(layout.spotlightRight - 1)
      expect(layout.gridTop).toBeLessThan(layout.spotlightBottom)
    } else {
      expect(layout.gridTop).toBeGreaterThanOrEqual(layout.spotlightBottom - 1)
    }
    if (width <= 390) {
      expect(layout.columns).toBe(3)
      expect(Math.abs(layout.tileWidth - layout.tileHeight)).toBeLessThanOrEqual(1)
    }
  }
})

test('concert album wall preserves theme and reduced-motion accessibility', async ({ page }) => {
  await page.goto('/concerts.html')
  const wall = page.locator('.album-wall')
  const tiles = page.locator('.album-tile')
  await expectAccessible(page)

  await tiles.nth(1).focus()
  await page.keyboard.press('Enter')
  await expect(tiles.nth(1)).toHaveAttribute('aria-selected', 'true')
  await expectAccessible(page)

  const surfaceBefore = await wall.evaluate((element) => getComputedStyle(element).background)
  await page.locator('.theme-orbit').click()
  await expect.poll(() => wall.evaluate((element) => getComputedStyle(element).background)).not.toBe(surfaceBefore)
  await expect(tiles.nth(1)).toHaveAttribute('aria-selected', 'true')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await tiles.nth(2).click()
  await expect(tiles.nth(2)).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('.album-sleeve')).toHaveCSS('transform', 'none')
  await expect(page.locator('.album-sleeve')).toHaveCSS('transition-duration', '0s')

  await page.setViewportSize({ width: 390, height: 844 })
  await expectAccessible(page)
})

test('concert thumbnails respond and carousel/lightbox controls work', async ({ page }) => {
  await page.goto('/concerts.html')
  await expect(page.locator('.metric-strip .metric-card')).toHaveCount(4)
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

test('rapid control clicks settle without duplicate or stale state', async ({ page }) => {
  await page.goto('/honors.html')
  const filter = page.locator('.filter-btn').filter({ hasText: '卓越级' })
  for (let i = 0; i < 5; i += 1) await filter.click()
  await expect(filter).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.honor-card')).toHaveCount(2)

  await page.goto('/research.html')
  const method = page.locator('.method-toggle').first()
  for (let i = 0; i < 4; i += 1) await method.dispatchEvent('click')
  await expect(method).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('.method-disclosure').first()).not.toHaveClass(/open/)

  await page.goto('/concerts.html')
  const carousel = page.locator('.concert-poster').filter({ has: page.locator('.carousel-controls') }).first()
  const next = carousel.locator('button[aria-label="下一张"]')
  for (let i = 0; i < 8; i += 1) await next.click()
  await expect(carousel.locator('.carousel-controls span')).toHaveText(/\d+ \/ \d+/)
})

for (const route of ['index.html', 'academics.html', 'honors.html', 'research.html', 'works.html', 'concerts.html', '404.html']) {
  test(`axe audit: ${route}`, async ({ page }) => {
    await page.goto(`/${route}`)
    await expectAccessible(page)
  })
}
