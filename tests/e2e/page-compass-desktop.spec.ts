import { expect, test } from '@playwright/test'

const destinations = [
  ['index.html', '#home-beyond'],
  ['academics.html', '#sec-ap-archive'],
  ['honors.html', '#sec-honors-archive'],
  ['research.html', '#sec-toolchain'],
  ['works.html', '#project-fresheye'],
  ['concerts.html', '#concert-archive']
] as const

type ScrollToCall = [{ top: number; left: number; behavior?: ScrollBehavior }] | [number, number]

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 })
})

for (const [route, destination] of destinations) {
  test(`PageCompass navigation settles independently on ${route}`, async ({ page }) => {
    await page.goto(`/${route}`)
    await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
    await expect(page.locator('html')).toHaveAttribute('data-fonts-ready', 'ready', { timeout: 10_000 })

    const navigation = page.locator('.site-nav')
    const trigger = page.locator('.page-compass-trigger')
    const destinationLink = page.locator(`.page-compass-link[href="${destination}"]`)
    await page.evaluate(() => window.scrollTo({ top: 900, left: 0, behavior: 'instant' }))
    await trigger.focus()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await expect(destinationLink).toBeVisible()

    const navBottom = await navigation.evaluate((element) => element.getBoundingClientRect().bottom)
    await destinationLink.click()
    await expect.poll(
      () => page.locator(destination).evaluate((element) => element.getBoundingClientRect().top),
      { message: `${route}${destination}` }
    ).toBeGreaterThanOrEqual(navBottom + 12)
    await expect(trigger).toBeFocused()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })
}

test('Return Top performs one instant scroll, clears hash, closes, and keeps trigger focus', async ({ page }) => {
  await page.addInitScript(() => {
    type ScrollWindow = Window & { __compassScrollToCalls?: ScrollToCall[] }
    const scrollWindow = window as ScrollWindow
    const originalScrollTo = window.scrollTo.bind(window)
    scrollWindow.__compassScrollToCalls = []
    window.scrollTo = ((...args: ScrollToCall) => {
      scrollWindow.__compassScrollToCalls?.push(args)
      if (args.length === 1) originalScrollTo(args[0])
      else originalScrollTo(args[0], args[1])
    }) as typeof window.scrollTo
  })

  await page.goto('/honors.html#sec-honors-archive')
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
  const trigger = page.locator('.page-compass-trigger')
  const panel = page.locator('.page-compass-panel')
  await trigger.click()
  await page.evaluate(() => {
    const scrollWindow = window as Window & { __compassScrollToCalls?: ScrollToCall[] }
    scrollWindow.__compassScrollToCalls = []
    window.scrollTo({ top: 900, left: 0, behavior: 'instant' })
    scrollWindow.__compassScrollToCalls = []
  })

  await page.locator('.page-compass-top').click()
  await expect.poll(() => page.evaluate(() => {
    const scrollWindow = window as Window & { __compassScrollToCalls?: ScrollToCall[] }
    return scrollWindow.__compassScrollToCalls?.length ?? 0
  })).toBe(1)
  const scrollCalls = await page.evaluate(() => {
    const scrollWindow = window as Window & { __compassScrollToCalls?: ScrollToCall[] }
    return scrollWindow.__compassScrollToCalls
  })
  expect(scrollCalls).toEqual([[{ top: 0, left: 0, behavior: 'instant' }]])
  await expect(page).toHaveURL(/honors\.html$/)
  await expect(page.evaluate(() => Math.round(window.scrollY))).resolves.toBeLessThan(8)
  await expect(trigger).toBeFocused()
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await expect(panel).toHaveAttribute('inert', '')
})

test('reduced-motion PageCompass has discrete collapsed and actionable expanded geometry', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/works.html')
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')

  const trigger = page.locator('.page-compass-trigger')
  const panel = page.locator('.page-compass-panel')
  const link = page.locator('.page-compass-link[href="#project-fresheye"]')
  await expect(panel).toHaveCSS('display', 'none')
  await trigger.focus()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')

  const geometry = await panel.evaluate((element) => {
    const panelStyle = getComputedStyle(element)
    const panelRect = element.getBoundingClientRect()
    const linkElement = element.querySelector<HTMLAnchorElement>('.page-compass-link')
    const linkRect = linkElement?.getBoundingClientRect()
    return {
      display: panelStyle.display,
      maxHeight: Number.parseFloat(panelStyle.maxHeight),
      transition: panelStyle.transition,
      panelHeight: panelRect.height,
      linkWidth: linkRect?.width ?? 0,
      linkHeight: linkRect?.height ?? 0
    }
  })

  expect(geometry.display).toBe('grid')
  expect(geometry.maxHeight).toBeGreaterThan(0)
  expect(geometry.panelHeight).toBeGreaterThan(0)
  expect(geometry.linkWidth).toBeGreaterThan(0)
  expect(geometry.linkHeight).toBeGreaterThan(0)
  expect(geometry.transition).toBe('none')
  await expect(link).toBeVisible()
})

test('focus-first expansion does not require a second Enter activation', async ({ page }) => {
  await page.goto('/works.html')
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
  const trigger = page.locator('.page-compass-trigger')
  const link = page.locator('.page-compass-link[href="#project-fresheye"]')

  await trigger.focus()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await expect(link).toBeVisible()
  await link.click()
  await expect(trigger).toBeFocused()
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
})

test('desktop PageCompass is a secondary numeric progress surface', async ({ page }) => {
  await page.goto('/research.html')
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
  await expect(page.locator('.page-compass')).toBeVisible()
  await expect(page.locator('.scroll-progress')).toHaveCSS('opacity', '1')
  await expect(page.locator('.page-compass-read')).toBeHidden()
  await page.locator('.page-compass-trigger').click()
  await expect(page.locator('.page-compass-read')).toBeVisible()
})

test('direct deep links settle below the pinned navigation', async ({ page }) => {
  await page.goto('/works.html#project-fresheye')
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')

  const navigation = page.locator('.site-nav')
  const navBottom = await navigation.evaluate((element) => element.getBoundingClientRect().bottom)
  await expect.poll(
    () => page.locator('#project-fresheye').evaluate((element) => element.getBoundingClientRect().top)
  ).toBeGreaterThanOrEqual(navBottom + 8)
  await expect(page.locator('.page-compass-link[href="#project-fresheye"]')).toHaveAttribute('aria-current', 'location')
})
