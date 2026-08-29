import { expect, test } from '@playwright/test'

const locales = [
  { name: 'zh-CN', path: '/works.html' },
  { name: 'zh-HK', path: '/zh-hk/works.html' },
  { name: 'en', path: '/en/works.html' }
] as const

const viewports = [390, 768, 1024, 1440] as const

for (const locale of locales) {
  for (const width of viewports) {
    test(`FreshEye showcase follows the content width: ${locale.name} ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 })
      await page.goto(locale.path)

      await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')

      const geometry = await page.locator('.content').first().evaluate((content) => {
        const showcase = content.querySelector<HTMLElement>('.showcase')
        if (!showcase) throw new Error('Expected a FreshEye showcase')

        const contentStyle = getComputedStyle(content)
        const contentRect = content.getBoundingClientRect()
        const showcaseRect = showcase.getBoundingClientRect()
        const contentInnerWidth = contentRect.width
          - parseFloat(contentStyle.paddingLeft)
          - parseFloat(contentStyle.paddingRight)

        return {
          contentInnerWidth,
          showcaseWidth: showcaseRect.width,
          showcaseLeft: showcaseRect.left,
          contentLeft: contentRect.left + parseFloat(contentStyle.paddingLeft),
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth
        }
      })

      expect(geometry.showcaseWidth, `${locale.name} ${width}px showcase width`).toBeGreaterThanOrEqual(geometry.contentInnerWidth - 1)
      expect(geometry.showcaseLeft, `${locale.name} ${width}px showcase left edge`).toBeGreaterThanOrEqual(geometry.contentLeft - 1)
      expect(geometry.showcaseLeft + geometry.showcaseWidth, `${locale.name} ${width}px showcase right edge`)
        .toBeLessThanOrEqual(geometry.contentLeft + geometry.contentInnerWidth + 1)
      expect(geometry.documentWidth, `${locale.name} ${width}px document width`)
        .toBeLessThanOrEqual(geometry.viewportWidth + 1)
    })
  }
}
