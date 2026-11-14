import { expect, test } from '@playwright/test'
import { waitForHydration } from './helpers/hydration'

const finalValues = ['4.0', '1560', '108', '8.0']

test('academic metrics count up from zero when they enter the viewport and settle at the final values', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.addInitScript(() => {
    const state = window as Window & { __metricTexts?: string[][] }
    state.__metricTexts = []
    const record = () => {
      const values = [...document.querySelectorAll('.metric-card b')].map((element) => element.textContent ?? '')
      if (values.length) state.__metricTexts?.push(values)
    }
    new MutationObserver(record).observe(document, { subtree: true, childList: true, characterData: true })
  })

  await page.goto('/en/academics/')
  await waitForHydration(page)
  const strip = page.locator('#sec-scoreboard .metric-strip')
  const apBadge = page.locator('.ap-row .ap-badge').first()
  const apBadgeBefore = await apBadge.textContent()
  await expect(strip).toHaveAttribute('data-metrics-ready', 'true')

  // Arm the count just below the fold, then scroll it on screen to start counting.
  const stripTop = await strip.evaluate((element) => element.getBoundingClientRect().top + window.scrollY)
  await page.evaluate((top) => window.scrollTo(0, Math.max(0, top - window.innerHeight - 80)), stripTop)
  await strip.scrollIntoViewIfNeeded()
  await expect(strip).toHaveAttribute('data-metrics-ready', 'false')
  await expect(strip).toHaveAttribute('data-metrics-ready', 'true')
  await expect(page.locator('.metric-card b')).toHaveText(finalValues)

  // AP badges are static data and never take part in the count.
  expect(await apBadge.textContent()).toBe(apBadgeBefore)

  const snapshots = await page.evaluate(() => (window as Window & { __metricTexts?: string[][] }).__metricTexts ?? [])
  const numeric = snapshots
    .map((values) => values.map((value) => Number.parseFloat(value)))
    .filter((values) => values.length === finalValues.length && values.every(Number.isFinite))
  expect(numeric.length).toBeGreaterThan(0)
  expect(numeric.some((values) => values.some((value) => value === 0))).toBe(true)
  expect(numeric.some((values) => values.some((value, index) => value < Number.parseFloat(finalValues[index]!)))).toBe(true)
})

test('academic section numbers, anchors, and AP rows stay intact', async ({ page }) => {
  await page.goto('/en/academics/#sec-ap-archive')
  await waitForHydration(page)

  await expect(page.locator('#sec-ap-archive')).toBeInViewport()
  await expect(page.locator('#sec-scoreboard')).toBeAttached()
  await expect(page.locator('.section-no')).toHaveText(['01', '02'])
  await expect(page.locator('.ap-row .ap-badge').first()).toHaveCSS('animation-name', 'none')
  await expect(page.locator('.ap-row small').first()).not.toBeEmpty()
})

test('reduced motion shows the final academic metrics without counting', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await context.newPage()
  await page.goto('/en/academics/')
  await waitForHydration(page)

  await expect(page.locator('.metric-card b')).toHaveText(finalValues)
  await expect(page.locator('#sec-scoreboard .metric-strip')).toHaveAttribute('data-metrics-ready', 'true')
  await context.close()
})

test('turning on reduced motion during the count settles on the final values', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/en/academics/')
  await waitForHydration(page)
  const strip = page.locator('#sec-scoreboard .metric-strip')
  const stripTop = await strip.evaluate((element) => element.getBoundingClientRect().top + window.scrollY)
  await page.evaluate((top) => window.scrollTo(0, Math.max(0, top - window.innerHeight - 80)), stripTop)
  await strip.scrollIntoViewIfNeeded()
  await expect(strip).toHaveAttribute('data-metrics-ready', 'false')
  await page.emulateMedia({ reducedMotion: 'reduce' })

  await expect(page.locator('.metric-card b')).toHaveText(finalValues)
  await expect(strip).toHaveAttribute('data-metrics-ready', 'true')
})

test('reduced motion turned on before entry stops a pending count', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/en/academics/')
  await waitForHydration(page)
  const strip = page.locator('#sec-scoreboard .metric-strip')
  await expect(strip).toHaveAttribute('data-metrics-ready', 'true')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await strip.scrollIntoViewIfNeeded()
  // Read synchronously: a count must not start after the preference changed.
  const state = await page.evaluate(() => ({
    values: [...document.querySelectorAll('.metric-card b')].map((element) => element.textContent ?? ''),
    ready: document.querySelector('.metric-strip')?.getAttribute('data-metrics-ready')
  }))
  expect(state.values).toEqual(finalValues)
  expect(state.ready).toBe('true')
})

test('academic metrics stay at the final values without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto('/en/academics/')

  await expect(page.locator('.metric-card b')).toHaveText(finalValues)
  await expect(page.locator('.section-no')).toHaveText(['01', '02'])
  await context.close()
})