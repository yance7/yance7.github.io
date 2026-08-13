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

test('home leads with the quiet editorial stage', async ({ page }) => {
  await page.goto('/index.html')
  await expect(page.locator('.hero-name, .home-statement')).toHaveCount(0)
  await expect(page.locator('.home-stage-title')).toHaveText(/研究、构建，\s*与现场相遇/)
  await expect(page.locator('.home-stage-title')).not.toContainText('。')
  await expect(page.locator('.archive-entry')).toHaveCount(0)
  await expect(page.locator('.home-archive-index, .home-hero-glow')).toHaveCount(0)
  await expect(page.locator('body')).not.toContainText('OPEN ARCHIVE')
  await expect(page.locator('.home-stage-actions')).toBeVisible()
})

test('home keeps the Yance wordmark at both archive anchors', async ({ page }) => {
  await page.goto('/index.html')
  await expect(page.locator('header .wordmark')).toHaveText('Yance.')
  await expect(page.locator('.foot-mark')).toContainText('Yance.')
})

test('home renders a focused stage with explicit entry actions', async ({ page }) => {
  await page.goto('/index.html')
  await expect(page.locator('.home-hero')).toBeVisible()
  await expect(page.locator('.home-stage')).toBeVisible()
  await expect(page.locator('.home-stage-meta')).toContainText('PERSONAL ARCHIVE / BEIJING · 2026')
  await expect(page.locator('.home-stage-main')).toBeVisible()
  await expect(page.locator('.home-stage-actions a[href="#selected-work"]')).toContainText('查看精选作品')
  await expect(page.locator('.home-stage-actions a[href="#home-worlds"]')).toContainText('浏览五个小世界')
  await expect(page.locator('.home-stage-scroll')).toBeVisible()
  await expect(page.locator('.home-stage-scroll')).toHaveAttribute('href', '#home-worlds')
  await expect(page.locator('#home-worlds')).toHaveCount(1)
  await expect(page.locator('.archive-hero.hero-home')).toHaveCount(0)
})

test('home stage keeps its visual hierarchy across desktop and narrow screens', async ({ page }) => {
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/index.html')
    const layout = await page.evaluate(() => {
      const stage = document.querySelector('.home-stage')!.getBoundingClientRect()
      const title = document.querySelector('.home-stage-title')!.getBoundingClientRect()
      const actions = document.querySelector('.home-stage-actions')!.getBoundingClientRect()
      return {
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        stageLeft: stage.left,
        stageRight: stage.right,
        titleWidth: title.width,
        actionsBottom: actions.bottom
      }
    })
    expect(layout.documentWidth, `home document at ${width}px`).toBeLessThanOrEqual(layout.viewportWidth)
    expect(layout.titleWidth).toBeLessThanOrEqual(layout.stageRight - layout.stageLeft)
    expect(layout.actionsBottom).toBeGreaterThan(0)
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
      serif: read('.home-stage-title'),
      technical: read('.home-stage-mark'),
      action: read('.home-stage-actions a')
    }
  })
  expect(fonts.body).toContain('Inter')
  expect(fonts.display).toContain('Inter')
  expect(fonts.serif).toContain('Noto Serif SC Variable')
  expect(fonts.technical).toContain('IBM Plex Mono')
  expect(fonts.action).toContain('Inter')

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

test('home entry actions preserve keyboard navigation and fragment targets', async ({ page }) => {
  await page.goto('/index.html')
  const primary = page.locator('.home-stage-actions a[href="#selected-work"]')
  const secondary = page.locator('.home-stage-actions a[href="#home-worlds"]')
  await primary.focus()
  await expect(primary).toBeFocused()
  await expect(primary).toHaveAttribute('href', '#selected-work')
  await secondary.focus()
  await expect(secondary).toBeFocused()
  await secondary.click()
  await expect(page).toHaveURL(/index\.html#home-worlds$/)
})

test('home uses the shared page surface in both themes', async ({ page }) => {
  for (const theme of ['light', 'dark']) {
    await page.goto('/index.html')
    await page.evaluate((value) => localStorage.setItem('yance-theme', value), theme)
    await page.reload()
    const surfaces = await page.evaluate(() => {
      const hero = getComputedStyle(document.querySelector('.home-hero')!)
      const body = getComputedStyle(document.body)
      const title = getComputedStyle(document.querySelector('.home-stage-title')!)
      return {
        heroBackground: hero.backgroundColor,
        bodyBackground: body.backgroundColor,
        titleSize: parseFloat(title.fontSize)
      }
    })
    expect(surfaces.heroBackground).toBe(surfaces.bodyBackground)
    expect(surfaces.titleSize).toBeLessThanOrEqual(76)
  }
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

test('page compass unifies section navigation, reading progress, and return to top', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 })
  await page.goto('/honors.html')
  const compass = page.locator('.page-compass')
  const archiveLink = compass.locator('.page-compass-link[href="#sec-honors-archive"]')

  await expect(compass).toBeVisible()
  await expect(compass.locator('.page-compass-link')).toHaveCount(2)
  await archiveLink.click()
  await expect(page).toHaveURL(/honors\.html#sec-honors-archive/)
  await expect(archiveLink).toHaveAttribute('aria-current', 'location')
  await expect.poll(() => compass.locator('.page-compass-progress').getAttribute('aria-label')).toMatch(/\d+%/)

  await compass.locator('.page-compass-top').click()
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBeLessThan(8)
  await expect(compass.locator('.page-compass-link').first()).toHaveAttribute('aria-current', 'location')
  await expect(page.locator('.section-dots, .scroll-to-top')).toHaveCount(0)
})

test('site navigation stays pinned and every compass destination clears it', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const destinations = [
    ['index.html', '#home-beyond'],
    ['academics.html', '#sec-ap-archive'],
    ['honors.html', '#sec-honors-archive'],
    ['research.html', '#sec-toolchain'],
    ['works.html', '#project-encore'],
    ['concerts.html', '#concert-archive']
  ] as const

  for (const [route, destination] of destinations) {
    await page.goto(`/${route}`)
    const navigation = page.locator('.site-nav')
    await page.evaluate(() => window.scrollTo({ top: 900, behavior: 'auto' }))
    await expect.poll(() => navigation.evaluate((element) => Math.round(element.getBoundingClientRect().top))).toBe(0)

    await page.locator(`.page-compass-link[href="${destination}"]`).click()
    const navBottom = await navigation.evaluate((element) => element.getBoundingClientRect().bottom)
    await expect.poll(
      () => page.locator(destination).evaluate((element) => element.getBoundingClientRect().top),
      { message: `${route}${destination}` }
    ).toBeGreaterThanOrEqual(navBottom + 12)
  }
})

test('direct deep links settle below the pinned navigation', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 })
  await page.goto('/works.html#project-encore')

  const navigation = page.locator('.site-nav')
  const navBottom = await navigation.evaluate((element) => element.getBoundingClientRect().bottom)
  await expect.poll(() => page.locator('#project-encore').evaluate((element) => element.getBoundingClientRect().top)).toBeGreaterThanOrEqual(navBottom + 12)
  await expect(page.locator('.page-compass-link[href="#project-encore"]')).toHaveAttribute('aria-current', 'location')
})

test('signature surfaces track fine-pointer sheen without changing typography', { tag: '@fine-pointer' }, async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Fine-pointer interaction is intentionally disabled on touch projects')
  const targets = [
    ['index.html', '.world-card'],
    ['works.html', '.showcase'],
    ['concerts.html', '.concert-poster']
  ] as const

  for (const [route, selector] of targets) {
    await page.goto(`/${route}`)
    const surface = page.locator(selector).first()
    await surface.scrollIntoViewIfNeeded()
    await expect(surface).toHaveAttribute('data-pointer-sheen', '')
    const before = await surface.evaluate((element) => {
      const style = getComputedStyle(element)
      return {
        x: style.getPropertyValue('--pointer-x').trim(),
        weight: style.fontWeight,
        spacing: style.letterSpacing
      }
    })
    const box = await surface.boundingBox()
    expect(box).not.toBeNull()
    await page.mouse.move((box?.x ?? 0) + (box?.width ?? 0) * .8, (box?.y ?? 0) + (box?.height ?? 0) * .25)
    await expect.poll(() => surface.evaluate((element) => getComputedStyle(element).getPropertyValue('--pointer-x').trim())).not.toBe(before.x)
    const after = await surface.evaluate((element) => {
      const style = getComputedStyle(element)
      return { weight: style.fontWeight, spacing: style.letterSpacing }
    })
    expect(after).toEqual({ weight: before.weight, spacing: before.spacing })
  }
})

test('concert poster coalesces sheen and tilt into one layout read per frame', { tag: '@fine-pointer' }, async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Fine-pointer interaction is intentionally disabled on touch projects')
  await page.goto('/concerts.html')
  const poster = page.locator('.concert-poster').first()
  await poster.scrollIntoViewIfNeeded()

  const layoutReads = await poster.evaluate(async (element) => {
    let reads = 0
    const original = element.getBoundingClientRect.bind(element)
    element.getBoundingClientRect = () => {
      reads += 1
      return original()
    }
    const bounds = original()
    for (let index = 0; index < 24; index += 1) {
      const clientX = bounds.left + bounds.width * (0.25 + index / 60)
      const clientY = bounds.top + bounds.height * 0.35
      element.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX, clientY, pointerType: 'mouse' }))
      element.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX, clientY }))
    }
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    return reads
  })

  expect(layoutReads).toBeLessThanOrEqual(2)
  await expect(poster).not.toHaveCSS('--rx', '')
  await expect(poster).not.toHaveCSS('--ry', '')
})

test('signature pointer sheen stays static with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/index.html')
  const surface = page.locator('.world-card').first()
  await surface.scrollIntoViewIfNeeded()
  const box = await surface.boundingBox()
  await page.mouse.move((box?.x ?? 0) + (box?.width ?? 0) * .8, (box?.y ?? 0) + (box?.height ?? 0) * .2)
  await expect(surface).toHaveCSS('--pointer-x', '50%')
  await expect(surface).toHaveCSS('--pointer-y', '50%')
})

test('page compass exposes page-specific sections without covering narrow layouts', async ({ page }) => {
  const expectations = [
    ['index.html', 3],
    ['academics.html', 3],
    ['honors.html', 2],
    ['research.html', 2],
    ['works.html', 3],
    ['concerts.html', 3]
  ] as const

  for (const [route, sectionCount] of expectations) {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`/${route}`)
    await expect(page.locator('.page-compass-link')).toHaveCount(sectionCount)
    const layout = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
      compassBottom: document.querySelector('.page-compass')!.getBoundingClientRect().bottom,
      footerPaddingBottom: parseFloat(getComputedStyle(document.querySelector('.site-footer')!).paddingBottom)
    }))
    expect(layout.document).toBeLessThanOrEqual(layout.viewport)
    expect(layout.compassBottom).toBeLessThanOrEqual(844)
    expect(layout.footerPaddingBottom).toBeGreaterThanOrEqual(76)

    const compactTargets = await page.locator('.page-compass button, .page-compass a').evaluateAll((elements) => elements.map((element) => {
      const bounds = element.getBoundingClientRect()
      return { width: bounds.width, height: bounds.height }
    }))
    compactTargets.forEach(({ width, height }) => {
      expect(width).toBeGreaterThanOrEqual(44)
      expect(height).toBeGreaterThanOrEqual(44)
    })
  }

  await page.goto('/404.html')
  await expect(page.locator('.page-compass')).toHaveCount(0)
})

test('concert carousel controls keep touch-sized targets', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/concerts.html')

  const controls = await page.locator('.carousel-controls button').evaluateAll((elements) => elements.map((element) => {
    const bounds = element.getBoundingClientRect()
    return { width: bounds.width, height: bounds.height }
  }))
  expect(controls.length).toBeGreaterThan(0)
  controls.forEach(({ width, height }) => {
    expect(width).toBeGreaterThanOrEqual(44)
    expect(height).toBeGreaterThanOrEqual(44)
  })
})

test('honors filtering renders compact cards without detail controls', async ({ page }) => {
  await page.goto('/honors.html')
  await page.locator('.filter-btn').filter({ hasText: '领航级' }).click()
  await expect(page.locator('.honor-card')).toHaveCount(4)
  await expect(page.locator('.honor-card').first()).toHaveClass(/revealed/)
  await expect(page.locator('.honor-expand, .honor-detail')).toHaveCount(0)
})

test('honor cards use a quiet reveal animation', async ({ page }) => {
  await page.goto('/honors.html')
  const card = page.locator('.honor-card').first()
  await card.scrollIntoViewIfNeeded()
  await expect(card).toHaveClass(/revealed/)
  await expect.poll(() => card.evaluate((element) => getComputedStyle(element).animationName)).toBe('honor-card-in')
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

test('concert album wall exposes 42 local releases and the default spotlight', async ({ page }) => {
  await page.goto('/concerts.html')
  const wall = page.locator('.album-wall-section')
  await expect(wall).toHaveCount(1)
  await expect(wall.locator('.album-tile')).toHaveCount(42)
  await expect(wall.locator('.album-spotlight')).toContainText('周杰伦')
  await expect(wall.locator('.album-spotlight')).toContainText('范特西')
  await expect(wall.locator('.album-spotlight')).toContainText('2001')
  await expect(wall.locator('.album-index')).toHaveText('01 / 42')
  const selected = wall.locator('.album-tile[aria-selected="true"]')
  await expect(selected).toHaveCount(1)
  await expect(selected).toHaveAttribute('data-album-id', 'jay-fantasy')
  await expect(selected).toHaveAttribute('aria-setsize', '42')
  await expect(selected).toHaveAttribute('aria-posinset', '1')

  const appleMusicLink = wall.locator('.album-link')
  await expect(appleMusicLink).toHaveAttribute('href', /^https:\/\/music\.apple\.com\/.+\/album\//)
  await expect(appleMusicLink).toHaveAttribute('target', '_blank')
  await expect(appleMusicLink).toHaveAttribute('rel', /noopener/)

  const spotlightCover = wall.locator('.album-spotlight img')
  const spotlightSource = wall.locator('.album-spotlight picture source[type="image/webp"]')
  await expect(spotlightCover).toBeVisible()
  await expect(spotlightSource).toHaveAttribute('srcset', /640w/)
  await expect(spotlightSource).toHaveAttribute('srcset', /1200w/)
  const cover = await spotlightCover.evaluate((image: HTMLImageElement) => ({
    src: image.currentSrc,
    complete: image.complete,
    width: image.naturalWidth,
    height: image.naturalHeight
  }))
  expect(new URL(cover.src).pathname).toMatch(/^\/assets\/albums\//)
  expect((await page.request.get(cover.src)).status()).toBe(200)
  expect(cover.complete).toBe(true)
  expect(cover.width).toBeGreaterThan(0)
  expect(cover.height).toBeGreaterThan(0)
})

test('concert album wall selection and looping controls stay synchronized', async ({ page }) => {
  await page.goto('/concerts.html')
  const wall = page.locator('.album-wall-section')
  const selected = wall.locator('.album-tile[aria-selected="true"]')
  const spotlightState = () => wall.evaluate((element) => ({
    title: element.querySelector('.album-title')?.textContent?.trim(),
    index: element.querySelector('.album-index')?.textContent?.trim(),
    selectedId: element.querySelector('.album-tile[aria-selected="true"]')?.getAttribute('data-album-id'),
    appleHref: element.querySelector('.album-link')?.getAttribute('href')
  }))

  await wall.locator('[data-album-id="jay-ye-hui-mei"]').click()
  await expect(wall.locator('.album-index')).toHaveText('02 / 42')
  await expect(selected).toHaveCount(1)
  await expect(selected).toHaveAttribute('data-album-id', 'jay-ye-hui-mei')
  expect(await spotlightState()).toEqual({
    title: '叶惠美',
    index: '02 / 42',
    selectedId: 'jay-ye-hui-mei',
    appleHref: 'https://music.apple.com/cn/album/%E8%91%89%E6%83%A0%E7%BE%8E/535824731'
  })

  await wall.locator('[data-album-id="jay-fantasy"]').click()
  await wall.locator('[aria-label="上一张专辑"]').click()
  await expect(selected).toHaveAttribute('data-album-id', 'david-tao-goodbye-how-are-you')
  await expect(wall.locator('.album-index')).toHaveText('42 / 42')
  await wall.locator('[aria-label="下一张专辑"]').click()
  await expect(selected).toHaveAttribute('data-album-id', 'jay-fantasy')
  await expect(wall.locator('.album-index')).toHaveText('01 / 42')
  await expect(wall.locator('.album-title')).toHaveText('范特西')

  await wall.locator('[aria-label="下一张专辑"]').evaluate((button: HTMLButtonElement) => {
    for (let index = 0; index < 8; index += 1) button.click()
  })
  await expect(selected).toHaveCount(1)
  await expect(wall.locator('.album-index')).toHaveText('09 / 42')
  expect(await spotlightState()).toEqual({
    title: '天外来物',
    index: '09 / 42',
    selectedId: 'joker-extraterrestrial',
    appleHref: 'https://music.apple.com/cn/album/%E5%A4%A9%E5%A4%96%E6%9D%A5%E7%89%A9/1787447447'
  })
})

test('concert album spotlight keeps a decoded cover during delayed rapid switching', async ({ page }) => {
  await page.route('**/assets/albums/thumbs/*.webp', async (route) => {
    if (route.request().url().includes('jay-ye-hui-mei-') || route.request().url().includes('/albums/jay-ye-hui-mei.jpg')) {
      await new Promise((resolve) => setTimeout(resolve, 1200))
    }
    await route.continue()
  })
  await page.goto('/concerts.html')
  const wall = page.locator('.album-wall-section')

  await wall.locator('[data-album-id="jay-ye-hui-mei"]').click()
  await page.waitForTimeout(240)

  await expect(wall.locator('.album-visual-slot')).toHaveAttribute('aria-busy', 'true')
  await expect(wall.locator('.album-cover-frame img')).toHaveAttribute('src', /jay-fantasy\.jpg$/)

  const visibleCover = await wall.locator('.album-cover-frame').evaluateAll((frames) => frames
    .map((frame) => {
      const image = frame.querySelector('img')
      return {
        opacity: Number.parseFloat(getComputedStyle(frame).opacity),
        decoded: !!image?.complete && image.naturalWidth > 0
      }
    })
    .sort((left, right) => right.opacity - left.opacity)[0]?.decoded)
  expect(visibleCover).toBe(true)

  await expect.poll(() => wall.locator('.album-cover-frame img').evaluateAll((images) => (
    images as HTMLImageElement[]
  ).map((image) => image.currentSrc))).toEqual(
    expect.arrayContaining([expect.stringMatching(/jay-ye-hui-mei-(640|1200)\.webp$/)])
  )
  await expect(wall.locator('.album-visual-slot')).toHaveAttribute('aria-busy', 'false')
})

test('concert album spotlight commits the latest rapid selection only', async ({ page }) => {
  await page.route('**/assets/albums/thumbs/*.webp', async (route) => {
    const url = route.request().url()
    if (url.includes('jay-ye-hui-mei-')) await new Promise((resolve) => setTimeout(resolve, 550))
    if (url.includes('jay-common-jasmine-orange-')) await new Promise((resolve) => setTimeout(resolve, 100))
    await route.continue()
  })
  await page.goto('/concerts.html')
  const wall = page.locator('.album-wall-section')

  await wall.locator('[data-album-id="jay-ye-hui-mei"]').click()
  await wall.locator('[data-album-id="jay-common-jasmine-orange"]').click()
  await expect(wall.locator('[data-album-id="jay-common-jasmine-orange"]')).toHaveAttribute('aria-selected', 'true')
  await expect.poll(() => wall.locator('.album-cover-frame img').evaluateAll((images) => (
    images as HTMLImageElement[]
  ).map((image) => image.currentSrc))).toEqual(
    expect.arrayContaining([expect.stringMatching(/jay-common-jasmine-orange-(640|1200)\.webp$/)])
  )
  await page.waitForTimeout(600)
  await expect(wall.locator('.album-cover-frame img')).toHaveCount(1)
  await expect(wall.locator('.album-cover-frame img')).toHaveAttribute('src', /jay-common-jasmine-orange\.jpg$/)
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
  await page.keyboard.press('Enter')
  await expect(tiles.nth(2)).toBeFocused()
  await expect(tiles.nth(2)).toHaveAttribute('aria-selected', 'true')

  await tiles.nth(3).focus()
  await page.keyboard.press('Space')
  await expect(tiles.nth(3)).toBeFocused()
  await expect(tiles.nth(3)).toHaveAttribute('aria-selected', 'true')
  await expect(selected).toHaveCount(1)
})

test('concert album wall uses 6 4 and 3 responsive columns', async ({ page }) => {
  const responsiveColumns = [
    { width: 1440, columns: 6 },
    { width: 768, columns: 4 },
    { width: 390, columns: 3 },
    { width: 320, columns: 3 }
  ]

  for (const { width, columns } of responsiveColumns) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/concerts.html')
    await expect(page.locator('.album-spotlight')).toBeVisible()
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
    expect(layout.columns, `album columns at ${width}px`).toBe(columns)
    if (width === 1440) {
      expect(layout.gridLeft).toBeGreaterThanOrEqual(layout.spotlightRight - 1)
      expect(layout.gridTop).toBeLessThan(layout.spotlightBottom)
    } else {
      expect(layout.gridTop).toBeGreaterThanOrEqual(layout.spotlightBottom - 1)
    }
    if (width <= 390) {
      expect(Math.abs(layout.tileWidth - layout.tileHeight)).toBeLessThanOrEqual(1)
    }
  }
})

test('concert album wall preserves theme and reduced-motion accessibility', async ({ page }) => {
  await page.goto('/concerts.html')
  const wall = page.locator('.album-wall')
  const tiles = page.locator('.album-tile')
  await expectAccessible(page)

  const albumThemeSelectors = await page.evaluate(() => {
    const collectSelectors = (rules: CSSRuleList): string[] => Array.from(rules).flatMap((rule) => {
      if (rule instanceof CSSStyleRule) return [rule.selectorText]
      return 'cssRules' in rule ? collectSelectors((rule as CSSGroupingRule).cssRules) : []
    })
    return Array.from(document.styleSheets)
      .flatMap((sheet) => collectSelectors(sheet.cssRules))
      .filter((selector) => selector.includes('data-theme') && (selector.includes('.album-wall') || selector.includes('.album-kicker')))
  })
  expect(albumThemeSelectors).toEqual(expect.arrayContaining([
    expect.stringMatching(/^html\[data-theme=(?:"light"|light)\] \.album-wall\[data-v-[^\]]+\]$/),
    expect.stringMatching(/^html\[data-theme=(?:"dark"|dark)\] \.album-wall\[data-v-[^\]]+\]$/),
    expect.stringMatching(/^html\[data-theme=(?:"light"|light)\] \.album-kicker\[data-v-[^\]]+\]$/)
  ]))

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
  const thumbnailSrcset = await page.locator('.concert-poster picture source').first().getAttribute('srcset')
  expect(thumbnailSrcset).toBeTruthy()
  const thumbnail = thumbnailSrcset!.split(',')[0]!.trim().split(/\s+/)[0]!
  const response = await page.request.get(new URL(thumbnail, 'http://127.0.0.1:4173').toString())
  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toMatch(/^image\//)

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
  await expect(page.locator('.honor-card').first()).toBeVisible()
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

test('home removes duplicate archive navigation and keeps the five worlds as the only index', async ({ page }) => {
  await page.goto('/index.html')
  await expect(page.locator('.lyric-carousel, .home-signal, .home-signal-board')).toHaveCount(0)
  await expect(page.locator('.home-archive-index')).toHaveCount(0)
  await expect(page.locator('body')).not.toContainText('OPEN ARCHIVE')
  await expect(page.locator('#home-worlds .world-card')).toHaveCount(5)
})

test('home entry actions route to selected work and the five worlds', async ({ page }) => {
  await page.goto('/index.html')
  const primary = page.locator('.home-stage-actions a[href="#selected-work"]')
  const secondary = page.locator('.home-stage-actions a[href="#home-worlds"]')
  await expect(primary).toContainText('查看精选作品')
  await expect(secondary).toContainText('浏览五个小世界')

  await secondary.focus()
  await page.keyboard.press('Enter')
  await expect.poll(() => new URL(page.url()).hash).toBe('#home-worlds')
})

test('home quiet stage stays usable across themes, widths, and reduced motion', async ({ page }) => {
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/index.html')
    const layout = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth
    }))
    expect(layout.documentWidth, `index document at ${width}px`).toBeLessThanOrEqual(layout.viewportWidth)
    await expect(page.locator('.home-stage-actions')).toBeVisible()
    await expect(page.locator('.home-archive-index, .home-hero-glow')).toHaveCount(0)
  }

  await page.goto('/index.html')
  const themeToggle = page.locator('.theme-toggle, .theme-orbit').first()
  if (await themeToggle.count()) {
    await themeToggle.click()
  }
  await expect(page.locator('.home-stage-actions')).toBeVisible()

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/index.html')
  await expect(page.locator('.home-stage-actions')).toBeVisible()
  const revealTransforms = await page.locator('.reveal').evaluateAll((elements) =>
    elements.map((element) => getComputedStyle(element).transform)
  )
  expect(revealTransforms.every((transform) => transform === 'none')).toBe(true)
})

test('Works wordmarks keep typography on hover', async ({ page }) => {
  await page.goto('/works.html')
  const showcases = page.locator('.showcase')
  await expect(showcases).toHaveCount(2)

  for (let index = 0; index < 2; index += 1) {
    const before = await page.locator('.sc-wordmark').evaluateAll((elements) =>
      elements.map((element) => {
        const style = getComputedStyle(element)
        return {
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          letterSpacing: style.letterSpacing
        }
      })
    )
    const chineseSize = await showcases.nth(index).locator('.sc-identity h3 > span').evaluate((element) => getComputedStyle(element).fontSize)
    expect(before[index]?.fontSize).toBe(chineseSize)
    const box = await showcases.nth(index).boundingBox()
    expect(box).not.toBeNull()
    await page.mouse.move((box?.x ?? 0) + (box?.width ?? 0) / 2, (box?.y ?? 0) + (box?.height ?? 0) / 2)
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())))
    const after = await page.locator('.sc-wordmark').evaluateAll((elements) =>
      elements.map((element) => {
        const style = getComputedStyle(element)
        return {
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          letterSpacing: style.letterSpacing
        }
      })
    )
    expect(after).toEqual(before)
  }
})

for (const route of ['index.html', 'academics.html', 'honors.html', 'research.html', 'works.html', 'concerts.html', '404.html']) {
  test(`axe audit: ${route}`, async ({ page }) => {
    await page.goto(`/${route}`)
    await expectAccessible(page)
  })
}
