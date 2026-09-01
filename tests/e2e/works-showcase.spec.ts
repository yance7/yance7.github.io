import { expect, test } from '@playwright/test'

const locales = [
  { name: 'zh-CN', path: '/works.html' },
  { name: 'zh-HK', path: '/zh-hk/works.html' },
  { name: 'en', path: '/en/works.html' }
] as const

const viewports = [390, 768, 1024, 1440] as const
const projectLocales = [
  { name: 'zh-CN', path: '/works.html', title: 'AP Microeconomics 中文讲义', action: '在 GitHub 查看' },
  { name: 'zh-HK', path: '/zh-hk/works.html', title: 'AP Microeconomics 中文講義', action: '在 GitHub 查看' },
  { name: 'en', path: '/en/works.html', title: 'AP Microeconomics Notes', action: 'View on GitHub' }
] as const

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

for (const locale of projectLocales) {
  test(`Works keeps the AP dossier as the second repository project: ${locale.name}`, async ({ page }) => {
    await page.goto(locale.path)
    await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')

    const showcases = page.locator('.showcase')
    await expect(showcases).toHaveCount(2)
    await expect(showcases.nth(0)).toHaveAttribute('data-project', 'fresheye')
    await expect(showcases.nth(1)).toHaveAttribute('data-project', 'ap-microeconomics-notes')

    const ap = page.locator('#project-ap-microeconomics-notes')
    await expect(ap.locator('.sc-index')).toHaveText('02')
    await expect(ap.locator('.sc-identity h3 > span')).toHaveText(locale.title)
    await expect(ap.locator('.sc-actions .y-button').first()).toContainText(locale.action)
    await expect(ap.locator('.sc-actions .y-button')).toHaveCount(1)
    await expect(ap.locator('.sc-proof-links a')).toHaveCount(1)
    await expect(ap.locator('.sc-proof-links a')).toHaveAttribute('href', 'https://github.com/yance7/ap-microeconomics-notes')
  })
}

test('home selected work keeps FreshEye only while the Works world reports two projects', async ({ page }) => {
  await page.goto('/index.html')
  await expect(page.locator('#selected-work .focus-product')).toHaveCount(1)
  await expect(page.locator('#selected-work')).toContainText('鲜眸')
  await expect(page.locator('#selected-work')).not.toContainText('AP Microeconomics')
  await expect(page.locator('#home-worlds .world-card[href="/works.html"]')).toContainText('2 个持续构建的小世界')
})
