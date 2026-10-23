import { expect, test } from '@playwright/test'

const locales = [
  { route: '/academics/', pending: '当前课程 · 尚无成绩' },
  { route: '/zh-hk/academics/', pending: '目前課程 · 尚無成績' },
  { route: '/en/academics/', pending: 'Current course · No score yet' }
] as const

test('academic scores and current AP courses stay readable across locales at a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })

  for (const locale of locales) {
    await page.goto(locale.route)
    await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')

    const strip = page.locator('#sec-scoreboard .metric-strip')
    await strip.scrollIntoViewIfNeeded()
    await expect(strip).toHaveAttribute('data-metrics-ready', 'true')
    const cards = strip.locator('.metric-card')
    await expect(cards).toHaveCount(4)
    await expect(cards.nth(1).locator('b')).toHaveText('1560')
    await expect(cards.nth(1).locator('span')).toContainText('SAT')
    await expect(cards.nth(3).locator('b')).toHaveText('8.0')
    await expect(page.locator('.scoreboard-note')).toContainText('1510')
    await expect(page.locator('.scoreboard-note')).toContainText('710')
    const metricGeometry = await strip.evaluate(element => {
      const stripRight = element.getBoundingClientRect().right
      return [...element.querySelectorAll<HTMLElement>('.metric-card')].map(card => {
        const cardBounds = card.getBoundingClientRect()
        const stripBounds = element.getBoundingClientRect()
        const value = card.querySelector('b')
        const range = document.createRange()
        if (value) range.selectNodeContents(value)
        const textBounds = range.getBoundingClientRect()
        const contentRight = cardBounds.right - Number.parseFloat(getComputedStyle(card).paddingRight)
        return {
          value: value?.textContent?.trim(),
          cardRight: cardBounds.right,
          stripRight: stripBounds.right,
          textRight: textBounds.right,
          contentRight,
          cardFitsStrip: cardBounds.right <= stripRight + 1,
          valueFitsCard: Boolean(value) && textBounds.right <= contentRight + 1
        }
      })
    })
    expect(metricGeometry.every(({ cardFitsStrip, valueFitsCard }) => cardFitsStrip && valueFitsCard), JSON.stringify(metricGeometry)).toBe(true)

    const pending = page.locator('.ap-row.pending')
    await expect(pending).toHaveCount(3)
    await expect(pending.first().locator('.ap-main small')).toContainText(locale.pending)
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  }
})

test('the English FishFreshNet V2 title and expanded methods fit a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('/en/research/')
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')

  const v2 = page.locator('#fishfreshnet-v2')
  const title = v2.locator('.tl-body h3')
  await expect(title).toContainText('A Lightweight and Interpretable Framework')
  await expect(title).toContainText('Circular Region Attention')
  await expect.poll(() => title.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true)

  await v2.locator('.method-toggle').click()
  const method = page.locator('#method-fishfreshnet-v2')
  await expect(method).toHaveAttribute('aria-hidden', 'false')
  await expect(method).toContainText('consistently framed fish-eye crops')
  await expect(method).toContainText('0.966M parameters')
  await expect(method).toContainText('65.5%–78.2%')
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('FreshEye project story shows the current model and report flow in all locales', async ({ page }) => {
  const routes = [
    { research: '/research/', works: '/works/', report: /四个标签页/ },
    { research: '/zh-hk/research/', works: '/zh-hk/works/', report: /四個分頁/ },
    { research: '/en/research/', works: '/en/works/', report: /four-tab/i }
  ] as const
  await page.setViewportSize({ width: 320, height: 844 })

  for (const route of routes) {
    await page.goto(route.research)
    await expect(page.locator('#fresheye')).toContainText(route.report)
    await page.goto(route.works)
    const project = page.locator('#project-fresheye')
    await expect(project).toBeVisible()
    await expect(project.locator('.sc-chapter').nth(1)).toContainText('4.095M')
    await expect(project.locator('.sc-chapter').nth(2)).toContainText(route.report)
    await expect(project.locator('.sc-chapter').nth(2)).toContainText(/A4|A4 PDF/)
    await expect(project.locator('.sc-proof-links')).toContainText('fresheye.yance.me')
  }
})

test('the legacy BIO-USACN honor anchor resolves to one corrected award in all locales', async ({ page }) => {
  const routes = ['/honors/', '/zh-hk/honors/', '/en/honors/']

  for (const route of routes) {
    await page.goto(`${route}#honor-usabo-2026-silver`)
    const bio = page.locator('#honor-usabo-2026-silver')
    await expect(bio).toBeInViewport()
    await expect(bio.locator('h3')).toContainText('BIO-USACN')
    await expect(bio).not.toContainText('USABO')
    await expect(page.locator('.honor-card').filter({ hasText: 'BIO-USACN' })).toHaveCount(1)
  }
})

test('home leadership summary shows the international-department note in every locale', async ({ page }) => {
  const routes = ['/', '/zh-hk/', '/en/']

  for (const route of routes) {
    await page.goto(route)
    const note = page.locator('#home-beyond .leadership-note')
    await expect(note).toContainText('712')
    await expect(note).toBeVisible()
  }
})
