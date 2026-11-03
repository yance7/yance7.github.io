import { expect, test } from '@playwright/test'

type LayoutSample = {
  locale: string | null
  visualHeight: number
  stageHeight: number | null
  greetingMinHeight: string
  titleFontSize: string
}

type LayoutShift = {
  value: number
  hadRecentInput: boolean
  startTime: number
}

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true
})

test('mobile homepage reserves the streamed hero and greeting geometry', async ({ page }) => {
  await page.addInitScript(() => {
    const samples: LayoutSample[] = []
    const shifts: LayoutShift[] = []
    Object.defineProperty(window, '__homeHeroLayoutSamples', { value: samples })
    Object.defineProperty(window, '__homeHeroLayoutShifts', { value: shifts })

    let lastSample = ''
    const sampleLayout = () => {
      const visual = document.querySelector<HTMLElement>('.home-hero-visual')
      const greeting = document.querySelector<HTMLElement>('.home-hero-typewriter-line-greeting')
      const title = document.querySelector<HTMLElement>('.home-hero-typewriter')
      if (visual && greeting && title) {
        const sample: LayoutSample = {
          locale: document.documentElement.dataset.locale ?? null,
          visualHeight: visual.getBoundingClientRect().height,
          stageHeight: document.querySelector<HTMLElement>('.home-hero-particles')?.getBoundingClientRect().height ?? null,
          greetingMinHeight: getComputedStyle(greeting).minHeight,
          titleFontSize: getComputedStyle(title).fontSize
        }
        const key = JSON.stringify(sample)
        if (key !== lastSample) {
          lastSample = key
          samples.push(sample)
        }
      }

      if (!document.documentElement.dataset.locale) requestAnimationFrame(sampleLayout)
    }

    requestAnimationFrame(sampleLayout)
    new PerformanceObserver((list) => {
      for (const candidate of list.getEntries()) {
        const shift = candidate as PerformanceEntry & { value: number; hadRecentInput: boolean }
        shifts.push({ value: shift.value, hadRecentInput: shift.hadRecentInput, startTime: shift.startTime })
      }
    }).observe({ type: 'layout-shift', buffered: true })
  })

  const session = await page.context().newCDPSession(page)
  await session.send('Network.enable')
  await session.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: 200_000,
    uploadThroughput: 75_000,
    connectionType: 'cellular3g'
  })
  await session.send('Emulation.setCPUThrottlingRate', { rate: 4 })

  await page.goto('/', { waitUntil: 'load' })
  await expect(page.locator('html')).toHaveAttribute('data-vue-enhanced', 'true')
  await page.evaluate(async () => {
    await document.fonts.ready
    const image = document.querySelector<HTMLImageElement>('.home-hero-slideshow__image--current')
    if (image?.complete && image.naturalWidth > 0) await image.decode().catch(() => undefined)
  })
  await page.waitForFunction(() => {
    const shifts = (window as Window & { __homeHeroLayoutShifts?: LayoutShift[] }).__homeHeroLayoutShifts ?? []
    const lastShift = shifts.at(-1)?.startTime ?? 0
    return performance.now() - lastShift >= 1000
  })

  const samples = await page.evaluate(() => (
    (window as Window & { __homeHeroLayoutSamples?: LayoutSample[] }).__homeHeroLayoutSamples ?? []
  ))
  const shifts = await page.evaluate(() => (
    (window as Window & { __homeHeroLayoutShifts?: LayoutShift[] }).__homeHeroLayoutShifts ?? []
  ))
  const initialSamples = samples.filter(sample => sample.locale === null)
  const stageSamples = initialSamples.filter(sample => sample.stageHeight !== null)
  const cls = shifts.filter(shift => !shift.hadRecentInput).reduce((total, shift) => total + shift.value, 0)
  await session.detach()

  const evidence = JSON.stringify({ samples, cls })
  expect(initialSamples.length, evidence).toBeGreaterThan(0)
  expect(initialSamples[0]?.visualHeight, evidence).toBe(300)
  expect(initialSamples.every(sample => (
    parseFloat(sample.greetingMinHeight) >= parseFloat(sample.titleFontSize) * 2.4
  )), evidence).toBe(true)
  expect(stageSamples.length, evidence).toBeGreaterThan(0)
  expect(stageSamples.every(sample => Math.abs(sample.visualHeight - (sample.stageHeight ?? 0)) <= 1), evidence).toBe(true)
  expect(cls, evidence).toBeLessThanOrEqual(0.1)
})
