import { expect, type Page } from '@playwright/test'

async function waitForStableMainLayout(page: Page) {
  await expect.poll(() => page.evaluate(() => new Promise<boolean>((resolve) => {
    const main = document.querySelector<HTMLElement>('main#main')
    if (!main) {
      resolve(false)
      return
    }

    const round = (value: number) => Math.round(value * 100) / 100
    const snapshot = () => {
      const rect = (element: Element | null) => {
        if (!element) return null
        const bounds = element.getBoundingClientRect()
        return [bounds.left, bounds.top, bounds.width, bounds.height].map(round)
      }

      return JSON.stringify({
        documentHeight: document.documentElement.scrollHeight,
        scrollY: round(window.scrollY),
        main: rect(main),
        sections: [...main.querySelectorAll<HTMLElement>('section')].map(rect),
        header: rect(document.querySelector('.site-nav')),
        headerState: document.querySelector<HTMLElement>('.site-nav')?.dataset.headerState ?? null,
        timelineReadingStates: [...main.querySelectorAll<HTMLElement>('.tl-item')]
          .map((item) => item.dataset.readingState ?? null)
      })
    }

    let previous = snapshot()
    let stableFrames = 0
    let checkedFrames = 0
    const check = () => {
      const current = snapshot()
      stableFrames = current === previous ? stableFrames + 1 : 0
      checkedFrames += 1
      if (stableFrames >= 3) {
        resolve(true)
      } else if (checkedFrames >= 120) {
        resolve(false)
      } else {
        previous = current
        requestAnimationFrame(check)
      }
    }

    requestAnimationFrame(check)
  }))).toBe(true)
}

async function waitForMainImages(page: Page) {
  await page.locator('main#main img[loading="lazy"]').evaluateAll((images) => {
    images.forEach((image) => {
      (image as HTMLImageElement).loading = 'eager'
    })
  })

  await page.evaluate(async () => {
    const images = [...document.querySelectorAll<HTMLImageElement>('main#main img')]
    await Promise.all(images.map(async (image) => {
      if (!image.complete) {
        await new Promise<void>((resolve, reject) => {
          image.addEventListener('load', () => resolve(), { once: true })
          image.addEventListener('error', () => reject(new Error(`Image failed to load: ${image.currentSrc || image.src}`)), { once: true })
        })
      }
      if (image.naturalWidth <= 0) throw new Error(`Image has no natural dimensions: ${image.currentSrc || image.src}`)
      await image.decode()
      if (image.naturalWidth <= 0) throw new Error(`Image failed to decode: ${image.currentSrc || image.src}`)
    }))
  })
}

export async function prepareMainForFullCapture(page: Page) {
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
  await expect(page.locator('html')).toHaveAttribute('data-fonts-ready', 'ready')
  await page.evaluate(async () => {
    await document.fonts.ready
  })

  const main = page.locator('main#main')
  await expect(main).toBeVisible()

  const reveals = main.locator('.reveal')
  for (let index = 0; index < await reveals.count(); index += 1) {
    const target = reveals.nth(index)
    await target.scrollIntoViewIfNeeded()
    await expect(target).toHaveClass(/revealed/)
  }
  await expect(main.locator('.reveal:not(.revealed)')).toHaveCount(0)
  await expect.poll(() => reveals.evaluateAll((elements) => elements.every((element) => {
    const style = getComputedStyle(element)
    const matrix = style.transform === 'none' ? new DOMMatrixReadOnly() : new DOMMatrixReadOnly(style.transform)
    return style.opacity === '1'
      && Math.abs(matrix.m41) < .5
      && Math.abs(matrix.m42) < .5
      && !element.hasAttribute('data-reveal-preparing')
  }))).toBe(true)

  const metricStrips = main.locator('.metric-strip')
  for (let index = 0; index < await metricStrips.count(); index += 1) {
    const strip = metricStrips.nth(index)
    await strip.scrollIntoViewIfNeeded()
    await expect(strip).toHaveAttribute('data-metrics-ready', 'true')
    const values = strip.locator('.metric-card b')
    await expect.poll(() => values.evaluateAll((elements) => (
      elements.length > 0 && elements.every((element) => Boolean(element.textContent?.trim()))
    ))).toBe(true)
  }

  await waitForMainImages(page)

  const posters = main.locator('.concert-poster')
  for (let index = 0; index < await posters.count(); index += 1) {
    const poster = posters.nth(index)
    await expect(poster).toHaveAttribute('data-poster-state', 'ready')
    await expect(poster.locator('.poster-error, .poster-skeleton')).toHaveCount(0)
  }

  const rail = page.locator('#concert-archive-rail')
  if (await rail.count()) {
    await rail.evaluate((element) => element.scrollTo({ left: 0, behavior: 'instant' }))
    await expect.poll(() => rail.evaluate((element) => element.scrollLeft)).toBe(0)
  }

  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }))
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  await expect(page.locator('.site-nav')).toHaveAttribute('data-header-state', 'resting')
  await page.mouse.move(-1, -1)
  await expect(page.locator('.sitewide-cursor.is-visible')).toHaveCount(0)
  await expect(main.locator('.reveal:not(.revealed)')).toHaveCount(0)
  await waitForStableMainLayout(page)
}
