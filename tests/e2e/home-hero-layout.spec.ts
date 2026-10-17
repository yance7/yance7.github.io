import { expect, test } from '@playwright/test'

const locales = [
  {
    route: '/',
    semanticTitle: '你好，我是 Yance 欢迎来到我的世界',
    displayFont: 'Yance Hero WenKai'
  },
  {
    route: '/zh-hk/',
    semanticTitle: '你好，我是 Yance 歡迎來到我的世界',
    displayFont: 'Yance Hero WenKai'
  },
  {
    route: '/en/',
    semanticTitle: 'Hi, I’m Yance Welcome to my world',
    displayFont: 'Yance Hero WenKai'
  }
] as const

const viewports = [
  { width: 1440, height: 844 },
  { width: 1024, height: 844 },
  { width: 768, height: 844 },
  { width: 390, height: 844 },
  { width: 320, height: 844 },
  { width: 844, height: 390 }
] as const

for (const locale of locales) {
  test(`${locale.route} Home hero preserves centered vertical geometry`, async ({ page }) => {
    await page.setViewportSize(viewports[0])
    await page.goto(locale.route)

    await expect(page.locator('.home-hero-typewriter')).toHaveAttribute('data-font-state', 'ready')

    for (const viewport of viewports) {
      await page.setViewportSize(viewport)

      const semanticTitle = page.locator('h1.home-hero-title')
      await expect(semanticTitle).toHaveAccessibleName(locale.semanticTitle)
      await expect(semanticTitle).toHaveText(locale.semanticTitle)
      expect(await semanticTitle.textContent()).toBe(locale.semanticTitle)
      await expect(semanticTitle).not.toContainText('_')
      await expect(page.locator('.home-hero-typewriter')).toHaveAttribute('aria-hidden', 'true')
      await expect(page.locator('.home-hero-actions a[href="#selected-work"]')).toBeVisible()
      await expect(page.locator('.home-hero-actions a[href="#home-worlds"]')).toBeVisible()

      const layout = await page.evaluate(() => {
        const bounds = (selector: string) => document.querySelector(selector)!.getBoundingClientRect()
        const inner = document.querySelector('.home-hero-inner') as HTMLElement
        const innerBounds = inner.getBoundingClientRect()
        const innerStyle = getComputedStyle(inner)
        const contentCenter = (
          innerBounds.left + parseFloat(innerStyle.paddingLeft) + innerBounds.right - parseFloat(innerStyle.paddingRight)
        ) / 2
        const title = document.querySelector('.home-hero-typewriter') as HTMLElement
        const titleBounds = title.getBoundingClientRect()
        const actions = bounds('.home-hero-actions')
        const stage = bounds('.home-hero-particles')
        const ctaHeights = [...document.querySelectorAll('.home-hero-actions a')].map((link) => link.getBoundingClientRect().height)

        return {
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          titleOverflow: title.scrollWidth > title.clientWidth + 1,
          contentCenter,
          titleCenter: (titleBounds.left + titleBounds.right) / 2,
          actionsCenter: (actions.left + actions.right) / 2,
          actionsBottom: actions.bottom,
          stageCenter: (stage.left + stage.right) / 2,
          stageTop: stage.top,
          stageHeight: stage.height,
          minimumCtaHeight: Math.min(...ctaHeights)
        }
      })

      const context = `${locale.route} at ${viewport.width}×${viewport.height}`
      expect(layout.viewportWidth, `${context} viewport width`).toBe(viewport.width)
      expect(layout.viewportHeight, `${context} viewport height`).toBe(viewport.height)
      expect(layout.documentWidth, `${context} horizontal overflow`).toBeLessThanOrEqual(layout.viewportWidth)
      expect(layout.titleOverflow, `${context} title overflow`).toBe(false)
      expect(layout.minimumCtaHeight, `${context} CTA height`).toBeGreaterThanOrEqual(44)
      expect(layout.actionsBottom, `${context} CTA visibility`).toBeLessThanOrEqual(layout.viewportHeight)
      expect(Math.abs(layout.titleCenter - layout.contentCenter), `${context} title center`).toBeLessThanOrEqual(16)
      expect(Math.abs(layout.actionsCenter - layout.contentCenter), `${context} action center`).toBeLessThanOrEqual(16)
      expect(Math.abs(layout.stageCenter - layout.contentCenter), `${context} visual center`).toBeLessThanOrEqual(16)

      const isDesktop = viewport.width > 760
      const expectedStageHeight = isDesktop
        ? Math.max(340, Math.min(480, viewport.width * 0.36))
        : 300
      expect(Math.abs(layout.stageHeight - expectedStageHeight), `${context} stage height`).toBeLessThanOrEqual(2)

      if (isDesktop) {
        const actionToStageGap = layout.stageTop - layout.actionsBottom
        expect(actionToStageGap, `${context} action-to-stage gap`).toBeGreaterThanOrEqual(42)
        expect(actionToStageGap, `${context} action-to-stage gap`).toBeLessThanOrEqual(58)
      }
    }
  })
}

test('keeps coarse-pointer CTA hover states free of motion', async ({ page }) => {
  await page.goto('/index.html')
  const isCoarse = await page.evaluate(() => window.matchMedia('(hover: none), (pointer: coarse)').matches)
  test.skip(!isCoarse)

  const action = page.locator('.home-hero-actions a').first()
  await action.hover()
  await expect.poll(() => action.evaluate((element) => element.matches(':hover'))).toBe(true)
  await expect(action).toHaveCSS('transform', 'none')
  await expect(action.locator('span[aria-hidden="true"]')).toHaveCSS('transform', 'none')
})

test('keeps CTA hover states free of motion when reduced motion is requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/index.html')

  const action = page.locator('.home-hero-actions a').first()
  await action.hover()
  await expect(action).toHaveCSS('transform', 'none')
  await expect(action.locator('span[aria-hidden="true"]')).toHaveCSS('transform', 'none')
})

const desktopViewports = viewports.filter((viewport) => viewport.width > 760)

for (const locale of locales) {
  test(`${locale.route} CTA text is geometrically centered independently of its arrow`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(locale.route)
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 })
      for (const action of await page.locator('.hero-action').all()) {
        const geometry = await action.evaluate((link) => {
          const label = link.querySelector('.hero-action__label') ?? link.querySelector('.hero-action__visual > span')!
          const range = document.createRange()
          range.selectNodeContents(label)
          const text = range.getBoundingClientRect()
          const button = link.getBoundingClientRect()
          const group = link.closest('.home-hero-actions')!.getBoundingClientRect()
          const arrow = link.querySelector('[aria-hidden="true"]')!.getBoundingClientRect()
          return {
            offset: Math.abs((text.left + text.right - button.left - button.right) / 2),
            mobileButtonOffset: Math.abs((button.left + button.right - group.left - group.right) / 2),
            overlapsArrow: text.right > arrow.left,
            contained: text.left >= button.left && arrow.right <= button.right
          }
        })
        expect(geometry.offset, `${locale.route} ${width}px actual text center`).toBeLessThanOrEqual(2)
        if (width <= 760) expect(geometry.mobileButtonOffset, 'mobile button remains centered in its row').toBeLessThanOrEqual(2)
        expect(geometry.overlapsArrow).toBe(false)
        expect(geometry.contained).toBe(true)
      }
    }
  })
}

for (const locale of locales) {
  test(`${locale.route} Home hero implements the specified desktop geometry`, async ({ page }) => {
    await page.goto(locale.route)

    for (const viewport of desktopViewports) {
      await page.setViewportSize(viewport)

      const context = `${locale.route} at ${viewport.width}×${viewport.height}`
      expect(await page.locator('.home-hero-inner').count(), `${context} PR4 content container`).toBe(1)

      const layout = await page.evaluate(() => {
        const rect = (selector: string) => document.querySelector(selector)!.getBoundingClientRect()
        const inner = document.querySelector('.home-hero-inner') as HTMLElement
        const innerStyle = getComputedStyle(inner)
        const title = rect('.home-hero-typewriter')
        const titleLines = [...document.querySelector('.home-hero-typewriter')!.children]
          .map((line) => line.getBoundingClientRect())
        const actions = rect('.home-hero-actions')
        const ctas = [...document.querySelectorAll('.home-hero-actions a')]
          .map((cta) => cta.getBoundingClientRect())
        const firstTitleLine = titleLines[0]
        const secondTitleLine = titleLines[1]
        const firstCta = ctas[0]
        const secondCta = ctas[1]
        const stageElement = document.querySelector('.home-hero-particles')
        const stage = stageElement?.getBoundingClientRect()

        return {
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          titleLineGap: firstTitleLine && secondTitleLine
            ? secondTitleLine.top - firstTitleLine.bottom
            : null,
          titleToActionsGap: actions.top - title.bottom,
          ctaWidths: ctas.map((cta) => cta.width),
          ctaLabelHeights: [...document.querySelectorAll('.hero-action__label')]
            .map((label) => label.getBoundingClientRect().height),
          ctaGap: firstCta && secondCta ? secondCta.left - firstCta.right : null,
          contentWidth: inner.clientWidth - parseFloat(innerStyle.paddingLeft) - parseFloat(innerStyle.paddingRight),
          stageWidth: stage?.width ?? null,
          topPadding: parseFloat(innerStyle.paddingTop),
          stageRadius: stageElement
            ? parseFloat(getComputedStyle(stageElement).borderTopLeftRadius)
            : null
        }
      })

      expect(layout.viewportWidth, `${context} viewport width`).toBe(viewport.width)
      expect(layout.viewportHeight, `${context} viewport height`).toBe(viewport.height)
      expect(layout.titleLineGap, `${context} title lines exist`).not.toBeNull()
      expect(layout.ctaWidths, `${context} desktop CTAs`).toHaveLength(2)
      expect(layout.ctaGap, `${context} desktop CTAs exist`).not.toBeNull()
      if (layout.titleLineGap === null || layout.ctaGap === null) continue
      expect(layout.titleLineGap, `${context} title line spacing`).toBeGreaterThanOrEqual(17)
      expect(layout.titleLineGap, `${context} title line spacing`).toBeLessThanOrEqual(29)
      expect(layout.titleToActionsGap, `${context} title-to-CTA spacing`).toBeGreaterThanOrEqual(35)
      expect(layout.titleToActionsGap, `${context} title-to-CTA spacing`).toBeLessThanOrEqual(45)
      for (const width of layout.ctaWidths) {
        expect(width, `${context} desktop CTA width`).toBeGreaterThanOrEqual(178)
        expect(width, `${context} desktop CTA width`).toBeLessThanOrEqual(240)
      }
      for (const height of layout.ctaLabelHeights) {
        expect(height, `${context} desktop CTA label remains readable within two lines`).toBeLessThanOrEqual(30)
      }
      expect(layout.ctaGap, `${context} desktop CTA spacing`).toBeGreaterThanOrEqual(11)
      expect(layout.ctaGap, `${context} desktop CTA spacing`).toBeLessThanOrEqual(13)
      expect(layout.contentWidth, `${context} maximum content width`).toBeLessThanOrEqual(1262)
      expect(layout.stageWidth, `${context} visual stage exists`).not.toBeNull()
      expect(layout.stageRadius, `${context} visual stage exists`).not.toBeNull()
      if (layout.stageWidth === null || layout.stageRadius === null) continue
      expect(Math.abs(layout.stageWidth - layout.contentWidth), `${context} stage fills content width`).toBeLessThanOrEqual(2)

      const isShortLandscape = viewport.width > viewport.height && viewport.height <= 520
      const expectedTopPadding = isShortLandscape
        ? 16
        : Math.max(72, Math.min(128, viewport.width * 0.08))
      expect(Math.abs(layout.topPadding - expectedTopPadding), `${context} hero top padding`).toBeLessThanOrEqual(1)
      expect(Math.abs(layout.stageRadius - 28), `${context} stage corner radius`).toBeLessThanOrEqual(2)
    }
  })
}
