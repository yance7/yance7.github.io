import { expect, test } from '@playwright/test'

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

test('copy citation cleans up its textarea when the legacy copy command throws', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, get: () => undefined })
    Object.defineProperty(document, 'execCommand', { configurable: true, value: () => { throw new Error('copy unavailable') } })
  })
  await page.goto('/research.html')

  await page.locator('.copy-citation').first().click()

  await expect(page.locator('.copy-citation').first()).toHaveAttribute('data-state', 'error')
  await expect(page.locator('textarea')).toHaveCount(0)
})
