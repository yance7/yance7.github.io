import { expect, test } from '@playwright/test'

const locales = [
  {
    name: 'zh-CN',
    home: '/',
    works: '/works/',
    research: '/research/',
    projectTitle: 'Trusted Garden',
    materialRequest: '代码未公开，可邮件索取',
    worksWorld: '3 个持续构建的小世界'
  },
  {
    name: 'zh-HK',
    home: '/zh-hk/',
    works: '/zh-hk/works/',
    research: '/zh-hk/research/',
    projectTitle: 'Trusted Garden',
    materialRequest: '程式碼未公開，可電郵索取',
    worksWorld: '3 個持續建構的小世界'
  },
  {
    name: 'en',
    home: '/en/',
    works: '/en/works/',
    research: '/en/research/',
    projectTitle: 'Trusted Garden',
    materialRequest: 'Code is not public; available on request by email.',
    worksWorld: 'Three evolving project worlds'
  }
] as const

const liveUrl = 'https://trusted-garden.yance.me/'
const sourceUrl = 'https://github.com/yance7/trusted-garden'
const paperUrl = 'https://www.bio-conferences.org/articles/bioconf/abs/2026/30/bioconf_icbb2026_02029/bioconf_icbb2026_02029.html'

for (const locale of locales) {
  test(`Works presents Trusted Garden with localized, verified links: ${locale.name}`, async ({ page }) => {
    await page.goto(locale.works)
    await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')

    const projects = page.locator('.showcase')
    await expect(projects).toHaveCount(3)
    await expect(projects.nth(0)).toHaveAttribute('data-project', 'fresheye')
    await expect(projects.nth(1)).toHaveAttribute('data-project', 'trusted-garden')
    await expect(projects.nth(2)).toHaveAttribute('data-project', 'ap-microeconomics-notes')

    const garden = page.locator('#project-trusted-garden')
    await expect(garden.locator('.sc-identity h3 > span')).toHaveText(locale.projectTitle)
    await expect(garden.locator('.sc-wordmark')).toHaveCount(0)
    await expect(garden.locator('.sc-desc')).toContainText('Three.js')
    await expect(garden.locator('.sc-desc')).toContainText('TypeScript')
    await expect(garden.locator('.sc-desc')).toContainText('Vite')
    await expect(garden.locator(`.sc-actions a[href="${liveUrl}"]`)).toHaveCount(1)
    await expect(garden.locator(`.sc-actions a[href="${sourceUrl}"]`)).toHaveCount(1)
    await expect(garden.locator('.sc-proof-row')).toHaveCount(0)
    await expect(garden.locator('iframe, img')).toHaveCount(0)
    await expect(garden.locator('a[href=""]')).toHaveCount(0)

    const unsafeExternalLinks = await garden.locator('a[target="_blank"]').evaluateAll((links) => links
      .filter((link) => {
        const rel = link.getAttribute('rel')?.split(/\s+/) ?? []
        return !rel.includes('noopener') || !rel.includes('noreferrer')
      })
      .map((link) => (link as HTMLAnchorElement).href))
    expect(unsafeExternalLinks).toEqual([])

    const primaryAction = garden.locator(`.sc-actions a[href="${liveUrl}"]`)
    await primaryAction.focus()
    await expect(primaryAction).toBeFocused()
  })

  test(`home keeps its existing featured project filter: ${locale.name}`, async ({ page }) => {
    await page.goto(locale.home)
    await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
    await expect(page.locator('#selected-work .focus-product')).toHaveCount(1)
    await expect(page.locator('#selected-work .focus-product')).not.toContainText('Trusted Garden')
    await expect(page.locator(`#home-worlds .world-card[href="${locale.works}"]`)).toContainText(locale.worksWorld)
  })

  test(`research evidence offers a keyboard-accessible request and the maize paper: ${locale.name}`, async ({ page }) => {
    await page.goto(locale.research)
    await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')

    const feeding = page.locator('#multimodal-feeding')
    const requestLink = feeding.locator('a[href="mailto:yance777@outlook.com"]')
    await expect(requestLink).toContainText(locale.materialRequest)
    await expect(feeding.locator('.tl-actions a')).toHaveCount(1)
    await expect(feeding.locator('a[href=""]')).toHaveCount(0)
    await expect(feeding.locator('.tl-proof')).toHaveCount(0)

    let reachedByTab = false
    for (let i = 0; i < 80; i += 1) {
      await page.keyboard.press('Tab')
      if (await requestLink.evaluate((element) => document.activeElement === element)) {
        reachedByTab = true
        break
      }
    }
    expect(reachedByTab).toBe(true)

    const maize = page.locator('#corn-growth')
    await expect(maize.locator('.tl-doi')).toContainText('10.1051/bioconf/202623702029')
    await expect(maize.locator(`.tl-actions a[href="${paperUrl}"]`)).toHaveCount(1)
    await expect(maize.locator('.tl-actions a')).toHaveCount(1)
    await expect(maize.locator('a[href=""]')).toHaveCount(0)
  })
}
