import { expect, test } from '@playwright/test'
import { waitForHydration } from './helpers/hydration'

const finalValues = ['4.0', '1560', '108', '8.0']
const finalNumbers = finalValues.map((value) => Number.parseFloat(value))

async function nextFrames(page: import('@playwright/test').Page) {
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  }))
}

async function readMetrics(page: import('@playwright/test').Page) {
  return page.evaluate(() => ({
    values: [...document.querySelectorAll('.metric-card b')].map((element) => element.textContent ?? ''),
    ready: document.querySelector('.metric-strip')?.getAttribute('data-metrics-ready')
  }))
}

test('academic metrics count up from zero when they enter the viewport and settle at the final values', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.addInitScript(() => {
    const state = window as Window & { __metricSnapshots?: Array<{ values: string[]; onScreen: boolean }> }
    state.__metricSnapshots = []
    const record = () => {
      const strip = document.querySelector('.metric-strip')
      const values = [...document.querySelectorAll('.metric-card b')].map((element) => element.textContent ?? '')
      if (!strip || !values.length) return
      const rect = strip.getBoundingClientRect()
      state.__metricSnapshots?.push({ values, onScreen: rect.bottom > 0 && rect.top < window.innerHeight })
    }
    new MutationObserver(record).observe(document, { subtree: true, childList: true, characterData: true })
  })

  await page.goto('/en/academics/')
  await waitForHydration(page)
  const strip = page.locator('#sec-scoreboard .metric-strip')
  const apBadge = page.locator('.ap-row .ap-badge').first()
  const apYear = page.locator('.ap-row small')
  const apBadgeBefore = await apBadge.textContent()
  const apYearsBefore = await apYear.allTextContents()
  await expect(strip).toHaveAttribute('data-metrics-ready', 'true')

  // Screen readers get a stable final value even while the visual number is still zeroed.
  await expect(page.locator('.metric-card .sr-only')).toHaveText(finalValues)
  await expect(page.locator('.metric-card b')).toHaveCount(4)
  for (let index = 0; index < 4; index += 1) {
    await expect(page.locator('.metric-card b').nth(index)).toHaveAttribute('aria-hidden', 'true')
  }

  // Scrolling the strip on screen starts the count (ready flips to false while it runs).
  await strip.scrollIntoViewIfNeeded()
  await expect(strip).toHaveAttribute('data-metrics-ready', 'false')
  await expect(strip).toHaveAttribute('data-metrics-ready', 'true')
  await expect(page.locator('.metric-card b')).toHaveText(finalValues)

  // AP rows stay static through the count.
  expect(await apBadge.textContent()).toBe(apBadgeBefore)
  expect(await apYear.allTextContents()).toEqual(apYearsBefore)

  const snapshots = await page.evaluate(() => (
    (window as Window & { __metricSnapshots?: Array<{ values: string[]; onScreen: boolean }> }).__metricSnapshots ?? []
  ))
  const parsed = snapshots
    .map((snapshot) => ({
      onScreen: snapshot.onScreen,
      numbers: snapshot.values.map((value) => Number.parseFloat(value))
    }))
    .filter((snapshot) => snapshot.numbers.length === finalValues.length && snapshot.numbers.every(Number.isFinite))
  expect(parsed.length).toBeGreaterThan(0)

  // The strip is zeroed while still off-screen, so no final value flashes to zero.
  const zeroIndex = parsed.findIndex((snapshot) => (
    !snapshot.onScreen && snapshot.numbers.every((value) => value === 0)
  ))
  expect(zeroIndex).toBeGreaterThanOrEqual(0)
  // Consider only frames from the arm onward (pre-font layout shift can briefly show the final values).
  const sequence = parsed.slice(zeroIndex)
  // The count is visible: every metric passes through its own intermediate values.
  for (let index = 0; index < finalNumbers.length; index += 1) {
    expect(sequence.some((snapshot) => (
      snapshot.onScreen && snapshot.numbers[index]! > 0 && snapshot.numbers[index]! < finalNumbers[index]!
    )), `metric ${index} should show an on-screen intermediate value`).toBe(true)
  }
  // Once an on-screen frame reaches the final values it never drops back to zero.
  let visibleFinalSeen = false
  for (const snapshot of sequence) {
    const isFinal = snapshot.numbers.every((value, index) => value === finalNumbers[index])
    if (snapshot.onScreen && isFinal) visibleFinalSeen = true
    if (visibleFinalSeen && snapshot.onScreen) {
      expect(snapshot.numbers, 'visible values must not reset after reaching final').toEqual(finalNumbers)
    }
  }
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
  await strip.scrollIntoViewIfNeeded()
  await expect(strip).toHaveAttribute('data-metrics-ready', 'false')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  // Read two frames after the switch, without waiting for a natural finish: if the
  // running count were not cancelled, the value would still be climbing here.
  await nextFrames(page)
  const settled = await readMetrics(page)
  expect(settled.values).toEqual(finalValues)
  expect(settled.ready).toBe('true')

  await nextFrames(page)
  const later = await readMetrics(page)
  expect(later.values).toEqual(finalValues)
  expect(later.ready).toBe('true')
})

test('reduced motion turned on before entry stops a pending count', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/en/academics/')
  await waitForHydration(page)
  const strip = page.locator('#sec-scoreboard .metric-strip')
  await expect(strip).toHaveAttribute('data-metrics-ready', 'true')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  // Let any pending observer callback settle before scrolling in.
  await nextFrames(page)
  await strip.scrollIntoViewIfNeeded()
  await nextFrames(page)

  const state = await readMetrics(page)
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