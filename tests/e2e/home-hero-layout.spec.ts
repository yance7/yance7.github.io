import { expect, test } from '@playwright/test'

const locales = [
  {
    route: '/index.html',
    semanticTitle: '你好，我是 Yance 研究、构建，与现场相遇',
    displayFont: 'LXGW WenKai Hero SC'
  },
  {
    route: '/zh-hk/index.html',
    semanticTitle: '你好，我是 Yance 研究、建構，與現場相遇',
    displayFont: 'LXGW WenKai Hero TC'
  },
  {
    route: '/en/',
    semanticTitle: 'Hi, I’m Yance Research, build, and meet the live world',
    displayFont: 'Georgia'
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

    if (locale.displayFont !== 'Georgia') {
      await expect.poll(() => page.evaluate((fontFamily) => (
        [...document.fonts].some((face) => face.family.includes(fontFamily) && face.status === 'loaded')
      ), locale.displayFont), {
        message: `${locale.route} Hero display font`,
        timeout: 10_000
      }).toBe(true)
    } else {
      const fontLoaded = await page.evaluate((fontFamily) => document.fonts.check(`400 40px "${fontFamily}"`), locale.displayFont)
      expect(fontLoaded, `${locale.route} system Hero display font`).toBe(true)
    }

    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await page.evaluate(() => new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      }))

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
      expect(layout.documentWidth, `${context} horizontal overflow`).toBeLessThanOrEqual(layout.viewportWidth)
      expect(layout.titleOverflow, `${context} title overflow`).toBe(false)
      expect(layout.minimumCtaHeight, `${context} CTA height`).toBeGreaterThanOrEqual(44)
      expect(layout.actionsBottom, `${context} CTA visibility`).toBeLessThanOrEqual(layout.viewportHeight)
      expect(Math.abs(layout.titleCenter - layout.contentCenter), `${context} title center`).toBeLessThanOrEqual(16)
      expect(Math.abs(layout.actionsCenter - layout.contentCenter), `${context} action center`).toBeLessThanOrEqual(16)
      expect(Math.abs(layout.stageCenter - layout.contentCenter), `${context} visual center`).toBeLessThanOrEqual(16)

      const isDesktop = viewport.width > 760
      const expectedStageHeight = isDesktop
        ? Math.max(320, Math.min(480, viewport.width * 0.33))
        : 240
      expect(Math.abs(layout.stageHeight - expectedStageHeight), `${context} stage height`).toBeLessThanOrEqual(2)

      if (isDesktop) {
        const actionToStageGap = layout.stageTop - layout.actionsBottom
        expect(actionToStageGap, `${context} action-to-stage gap`).toBeGreaterThanOrEqual(42)
        expect(actionToStageGap, `${context} action-to-stage gap`).toBeLessThanOrEqual(58)
      }
    }
  })
}
