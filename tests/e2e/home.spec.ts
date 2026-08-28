import { expect, test } from '@playwright/test'

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

test('home keeps the Yance brand mark at both archive anchors', async ({ page }) => {
  await page.goto('/index.html')
  const mark = page.locator('header .wordmark .brand-mark-image')
  await expect(mark).toBeVisible()
  await expect(mark).toHaveAttribute('width', '128')
  await expect(mark).toHaveAttribute('height', '128')
  await expect(page.locator('header .wordmark source[type="image/webp"]')).toHaveAttribute('srcset', /yance-mark-96\.webp/)
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
  const viewports = [
    { width: 1440, height: 844 },
    { width: 390, height: 844 },
    { width: 320, height: 844 },
    { width: 844, height: 390 }
  ]

  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    await page.goto('/index.html')
    await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
    await expect(page.locator('html')).toHaveAttribute('data-fonts-ready', 'ready', { timeout: 10_000 })
    await page.evaluate(() => new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    }))
    const layout = await page.evaluate(() => {
      const stage = document.querySelector('.home-stage')!.getBoundingClientRect()
      const title = document.querySelector('.home-stage-title')!.getBoundingClientRect()
      const actions = document.querySelector('.home-stage-actions')!.getBoundingClientRect()
      return {
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        stageLeft: stage.left,
        stageRight: stage.right,
        titleTop: title.top,
        titleWidth: title.width,
        actionsBottom: actions.bottom
      }
    })
    expect(layout.documentWidth, `home document at ${viewport.width}×${viewport.height}`).toBeLessThanOrEqual(layout.viewportWidth)
    expect(layout.titleWidth).toBeLessThanOrEqual(layout.stageRight - layout.stageLeft)
    expect(layout.titleTop).toBeGreaterThanOrEqual(0)
    expect(layout.actionsBottom, `home actions at ${viewport.width}×${viewport.height}`).toBeLessThanOrEqual(layout.viewportHeight)
  }
})

test('home assigns distinct font roles to prose, display and technical metadata', async ({ page }) => {
  await page.goto('/index.html')
  await expect(page.locator('.home-stage-title')).toHaveCount(1)
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
  await expect(page.locator('.tl-body h3').first()).toBeAttached()
  await expect(page.locator('.tc-tool strong').first()).toBeAttached()
  await page.evaluate(() => document.fonts.ready)
  const researchFonts = await page.evaluate(() => {
    const read = (selector: string) => getComputedStyle(document.querySelector(selector)!).fontFamily
    return {
      title: read('.tl-body h3'),
      tool: read('.tc-tool strong'),
      toolMeta: read('.tc-group-head small')
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

test('home stage flows into selected work without a hard divider', async ({ page }) => {
  await page.goto('/index.html')

  await expect.poll(() => page.locator('.home-hero').evaluate((element) => getComputedStyle(element).borderBottomWidth)).toBe('0px')
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

test('home removes duplicate archive navigation and keeps the five worlds as the only index', async ({ page }) => {
  await page.goto('/index.html')
  await expect(page.locator('.lyric-carousel, .home-signal, .home-signal-board')).toHaveCount(0)
  await expect(page.locator('.home-archive-index')).toHaveCount(0)
  await expect(page.locator('body')).not.toContainText('OPEN ARCHIVE')
  await expect(page.locator('#home-worlds .world-card')).toHaveCount(5)
})

test('home keeps pointer sheen on featured work but not on the five world cards', async ({ page }) => {
  await page.goto('/index.html')
  await expect(page.locator('.world-card')).toHaveCount(5)
  const featuredSheen = await page.locator('.focus-card').evaluateAll((elements) =>
    elements.map((element) => element.hasAttribute('data-pointer-sheen'))
  )
  expect(featuredSheen.length).toBeGreaterThan(0)
  expect(featuredSheen.every(Boolean)).toBe(true)

  const worldSheen = await page.locator('.world-card').evaluateAll((elements) =>
    elements.map((element) => element.hasAttribute('data-pointer-sheen'))
  )
  expect(worldSheen.every((value) => value === false)).toBe(true)
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
