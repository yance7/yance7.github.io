import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

type LightboxLifecycleState = {
  exists: boolean
  leaving: boolean
  inert: boolean
  overflow: string
}

async function settleThemeChange(page: Page) {
  await expect.poll(
    () => page.locator('html').getAttribute('data-theme-changing')
  ).toBeNull()
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  )
}

async function captureLightboxLeaveState(page: Page) {
  return page.evaluate(() => new Promise<LightboxLifecycleState>((resolve, reject) => {
    const lightbox = document.querySelector('.lightbox')
    if (!lightbox) {
      reject(new Error('lightbox should exist before Escape'))
      return
    }

    const readState = (): LightboxLifecycleState => ({
      exists: true,
      leaving: lightbox.classList.contains('lightbox-leave-active'),
      inert: document.querySelector('.site-shell')?.hasAttribute('inert') ?? false,
      overflow: document.body.style.overflow
    })

    const observer = new MutationObserver(() => {
      if (!lightbox.classList.contains('lightbox-leave-active')) return
      observer.disconnect()
      resolve(readState())
    })
    observer.observe(lightbox, { attributes: true, attributeFilter: ['class'] })

    if (lightbox.classList.contains('lightbox-leave-active')) {
      observer.disconnect()
      resolve(readState())
    }
  }))
}

test('concert poster coalesces sheen and tilt into one layout read per frame', { tag: '@fine-pointer' }, async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Fine-pointer interaction is intentionally disabled on touch projects')
  await page.goto('/concerts/')
  const poster = page.locator('.concert-poster').first()
  await poster.scrollIntoViewIfNeeded()

  const layoutReads = await poster.evaluate(async (element) => {
    let reads = 0
    const original = element.getBoundingClientRect.bind(element)
    element.getBoundingClientRect = () => {
      reads += 1
      return original()
    }
    const bounds = original()
    for (let index = 0; index < 24; index += 1) {
      const clientX = bounds.left + bounds.width * (0.25 + index / 60)
      const clientY = bounds.top + bounds.height * 0.35
      element.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX, clientY, pointerType: 'mouse' }))
      element.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX, clientY }))
    }
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    return reads
  })

  expect(layoutReads).toBeLessThanOrEqual(2)
  await expect(poster).not.toHaveCSS('--rx', '')
  await expect(poster).not.toHaveCSS('--ry', '')
})

test('concert poster stages keep every source ratio inside a fixed 3:4 layered frame', async ({ page }) => {
  await page.goto('/concerts/')

  const expected = [
    { id: 'jd-summer-2026-05-31', ratio: 'tall', frame: 3 / 4 },
    { id: 'dengziqi-2024-08-25', ratio: 'portrait', frame: 3 / 4 },
    { id: 'kpl-2025-11-08', ratio: 'landscape', frame: 3 / 4 }
  ] as const

  for (const item of expected) {
    const poster = page.locator(`[data-concert-id="${item.id}"] .concert-poster`)
    await expect(poster).toHaveAttribute('data-poster-ratio', item.ratio)
    const state = await poster.evaluate((element) => {
      const backdrop = element.querySelector<HTMLImageElement>('.poster-backdrop')!
      const foreground = element.querySelector<HTMLImageElement>('.poster-foreground')!
      const rect = element.getBoundingClientRect()
      return {
        frameRatio: rect.width / rect.height,
        backdropFit: getComputedStyle(backdrop).objectFit,
        foregroundFit: getComputedStyle(foreground).objectFit,
        foregroundWidth: foreground.getAttribute('width'),
        foregroundHeight: foreground.getAttribute('height'),
        backdropInset: getComputedStyle(backdrop).inset
      }
    })

    expect(state.frameRatio).toBeCloseTo(item.frame, 2)
    expect(state.backdropFit).toBe('cover')
    expect(state.foregroundFit).toBe('contain')
    expect(state.backdropInset).toBe('0px')
    expect(Number(state.foregroundWidth)).toBeGreaterThan(0)
    expect(Number(state.foregroundHeight)).toBeGreaterThan(0)
  }

  const stageHeights = await page.locator('.concert-poster').evaluateAll((elements) => (
    elements.map((element) => element.getBoundingClientRect().height)
  ))
  expect(Math.max(...stageHeights) - Math.min(...stageHeights)).toBeLessThanOrEqual(1)
})

test('concert poster pointer feedback stays bounded without changing geometry', { tag: '@fine-pointer' }, async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Fine-pointer interaction is intentionally disabled on touch projects')
  await page.goto('/concerts/')
  const poster = page.locator('.concert-poster').first()
  await poster.scrollIntoViewIfNeeded()
  const before = await poster.boundingBox()
  expect(before).not.toBeNull()

  await poster.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    element.dispatchEvent(new PointerEvent('pointerenter', {
      bubbles: true,
      clientX: bounds.right - 1,
      clientY: bounds.bottom - 1,
      pointerType: 'mouse'
    }))
    element.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true,
      clientX: bounds.right - 1,
      clientY: bounds.bottom - 1,
      pointerType: 'mouse'
    }))
  })
  await expect.poll(() => poster.evaluate((element) => getComputedStyle(element).getPropertyValue('--rx'))).not.toBe('')

  const state = await poster.evaluate((element) => {
    const styles = getComputedStyle(element)
    const rect = element.getBoundingClientRect()
    return {
      rx: Math.abs(Number.parseFloat(styles.getPropertyValue('--rx'))),
      ry: Math.abs(Number.parseFloat(styles.getPropertyValue('--ry'))),
      width: rect.width,
      height: rect.height
    }
  })
  const after = await poster.boundingBox()
  expect(after).not.toBeNull()
  expect(Math.max(state.rx, state.ry)).toBeLessThanOrEqual(2.5)
  await expect(poster.locator('.poster-open')).toHaveCSS('transition-duration', '0.22s')
  expect(after!.width).toBeCloseTo(before!.width, 2)
  expect(after!.height).toBeCloseTo(before!.height, 2)
})

test('concert poster motion is disabled for reduced-motion users', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/concerts/')
  const poster = page.locator('.concert-poster').first()
  const before = await poster.evaluate((element) => {
    const styles = getComputedStyle(element)
    return { borderColor: styles.borderColor, boxShadow: styles.boxShadow }
  })
  await poster.hover()

  const state = await poster.evaluate((element) => ({
    posterTransition: getComputedStyle(element).transitionDuration,
    posterTransform: getComputedStyle(element).transform,
    posterBorderColor: getComputedStyle(element).borderColor,
    posterBoxShadow: getComputedStyle(element).boxShadow,
    buttonTransform: getComputedStyle(element.querySelector('.poster-open')!).transform,
    imageTransition: getComputedStyle(element.querySelector('.poster-foreground')!).transitionDuration,
    imageTransform: getComputedStyle(element.querySelector('.poster-foreground')!).transform,
    hintOpacity: getComputedStyle(element.querySelector('.poster-hint')!).opacity
  }))
  expect(Number.parseFloat(state.posterTransition)).toBeLessThanOrEqual(0.001)
  expect(state.posterTransform).toBe('none')
  expect(state.posterBorderColor).toBe(before.borderColor)
  expect(state.posterBoxShadow).toBe(before.boxShadow)
  expect(state.buttonTransform).toBe('none')
  expect(Number.parseFloat(state.imageTransition)).toBeLessThanOrEqual(0.001)
  expect(state.imageTransform).toBe('none')
  expect(state.hintOpacity).toBe('0')
})

test('concert poster triggers keep touch-sized targets', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/concerts/')
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
  const poster = page.locator('.concert-poster .poster-open').first()
  await expect(poster).toBeAttached()

  const bounds = await poster.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return { width: rect.width, height: rect.height }
  })
  expect(bounds.width).toBeGreaterThanOrEqual(44)
  expect(bounds.height).toBeGreaterThanOrEqual(44)
})

test('concert thumbnails respond and single-poster lightbox works', async ({ page }) => {
  await page.goto('/concerts/')
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
  await expect(page.locator('.metric-strip .metric-card')).toHaveCount(4)
  const thumbnailSrcset = await page.locator('.concert-poster picture source').first().getAttribute('srcset')
  expect(thumbnailSrcset).toBeTruthy()
  const thumbnail = thumbnailSrcset!.split(',')[0]!.trim().split(/\s+/)[0]!
  const response = await page.request.get(new URL(thumbnail, page.url()).toString())
  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toMatch(/^image\//)

  await expect(page.locator('.carousel-controls')).toHaveCount(0)
  await page.locator('.concert-poster .poster-open').first().click()
  await expect(page.locator('.lightbox')).toBeVisible()
  await expect(page.locator('.lb-meta-index')).toHaveText('1 / 1')
  await expect(page.locator('.lb-nav')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(page.locator('.lightbox')).toHaveCount(0)
})

test('lightbox keeps the background inert and locked until leave finishes', async ({ page }) => {
  await page.goto('/concerts/')
  const trigger = page.locator('.concert-poster .poster-open').first()
  await trigger.focus()
  await trigger.click()
  await expect(page.locator('.lightbox')).toBeVisible()
  await expect(page.locator('.lb-close')).toBeFocused()
  await expect(page.locator('.site-shell')).toHaveAttribute('inert', '')
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('hidden')

  const leaveStatePromise = captureLightboxLeaveState(page)
  await page.keyboard.press('Escape')
  const leaveState = await leaveStatePromise
  expect(leaveState).toEqual({
    exists: true,
    leaving: true,
    inert: true,
    overflow: 'hidden'
  })

  await expect(page.locator('.lightbox')).toHaveCount(0)
  await expect(page.locator('.site-shell')).not.toHaveAttribute('inert', '')
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
  await expect(trigger).toBeFocused()
})

test('concert poster controls retain theme semantics and shared motion cadence', async ({ page }) => {
  await page.goto('/concerts/', { waitUntil: 'domcontentloaded' })
  await page.locator('.concert-poster .poster-open').first().hover()
  await expect(page.locator('.poster-hint').first()).toBeVisible()

  const readVisualContract = () => page.evaluate(() => {
    const root = getComputedStyle(document.documentElement)
    const controls = document.querySelector<HTMLElement>('.poster-hint')!
    const resolveColor = (variable: string) => {
      const probe = document.createElement('span')
      probe.style.color = `var(${variable})`
      document.body.append(probe)
      const value = getComputedStyle(probe).color
      probe.remove()
      return value
    }

    return {
      theme: document.documentElement.dataset.theme,
      mediaOverlay: root.getPropertyValue('--media-overlay-bg').trim(),
      mediaOverlayInk: root.getPropertyValue('--media-overlay-ink').trim(),
      controlsBackground: getComputedStyle(controls).backgroundColor,
      expectedBgTint: resolveColor('--bg-tint')
    }
  })

  const light = await readVisualContract()
  expect(light.theme).toBe('light')
  expect(light.mediaOverlay).not.toBe('')
  expect(light.mediaOverlayInk).not.toBe('')
  expect(light.controlsBackground).not.toBe(light.expectedBgTint)

  await page.locator('.theme-orbit').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await settleThemeChange(page)
  const dark = await readVisualContract()
  expect(dark.theme).toBe('dark')
  expect(dark.mediaOverlay).not.toBe('')
  expect(dark.mediaOverlayInk).not.toBe('')
})
