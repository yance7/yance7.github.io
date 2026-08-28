import { expect, test } from '@playwright/test'

test('shared project actions expose stable keyboard targets', async ({ page }) => {
  await page.goto('/works.html')

  const projectLink = page.locator('.sc-actions .y-button').first()
  await projectLink.focus()

  await expect(projectLink).toBeFocused()
  await expect(projectLink).toHaveClass(/y-button/)

  const box = await projectLink.boundingBox()
  expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(42)
})

test('404 entry actions use the shared button primitive', async ({ page }) => {
  await page.goto('/404.html')

  const actions = page.locator('.error-actions .y-button')
  await expect(actions).toHaveCount(2)
  for (const action of await actions.all()) {
    const box = await action.boundingBox()
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(42)
  }
})

test('status badges use compact semantic surfaces without pulse animation', async ({ page }) => {
  await page.goto('/works.html')

  const badges = page.locator('.status-badge')
  await expect(badges.first()).toBeVisible()
  await expect(badges.first()).toHaveCSS('border-radius', '6px')
  await expect(badges.first()).toHaveCSS('padding-top', '5px')

  const statuses = await badges.evaluateAll((elements) => elements.map((element) => {
    return element.getAttribute('data-status') ?? ''
  }))
  expect(statuses.every((status) => status.length > 0)).toBe(true)
  for (const badge of await badges.all()) {
    await expect(badge).not.toHaveCSS('animation-name', /pulse/)
  }
})

test('page compass exposes a keyboard-expandable semantic panel', async ({ page }) => {
  await page.goto('/research.html')

  const compass = page.locator('.page-compass')
  const trigger = compass.locator('.page-compass-trigger')
  const panel = compass.locator('.page-compass-panel')
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await expect(panel).toHaveAttribute('aria-hidden', 'true')
  await trigger.focus()
  await expect(trigger).toBeFocused()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await expect(panel).toBeVisible()
  await expect(compass.locator('.page-compass-link').nth(1)).toBeVisible()
  await expect(page.locator('.page-compass')).toHaveCSS('overflow', 'visible')
  await expect(compass.locator('.page-compass-step')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
})

test('lightbox keeps metadata and quiet control chrome bounded', async ({ page }) => {
  await page.goto('/concerts.html')
  const carousel = page.locator('.concert-poster').filter({ has: page.locator('.carousel-controls') }).first()
  await carousel.locator('.poster-open').click()

  await expect(page.locator('.lightbox')).toBeVisible()
  await expect(page.locator('.lb-stage img')).toHaveClass(/loaded/)
  await expect(page.locator('.lb-meta-dock')).toHaveCount(1)
  await expect(page.locator('.lb-meta-copy')).toBeVisible()
  await expect(page.locator('.lb-meta-copy small')).toHaveText('演唱会')
  await expect(page.locator('.lb-meta-index')).toHaveText(/\d+ \/ \d+/)
  await expect(page.locator('.lb-close')).toHaveClass(/y-button--icon/)
  await expect(page.locator('.lb-nav').first()).toHaveClass(/y-button--icon/)

  const geometry = await page.evaluate(() => ({
    viewport: { width: window.innerWidth, height: window.innerHeight },
    lightbox: (() => {
      const element = document.querySelector<HTMLElement>('.lightbox')
      const rect = element?.getBoundingClientRect()
      return { width: rect?.width ?? 0, height: rect?.height ?? 0 }
    })(),
    stage: (() => {
      const element = document.querySelector<HTMLElement>('.lb-stage')
      const rect = element?.getBoundingClientRect()
      return {
        top: rect?.top ?? 0,
        bottom: rect?.bottom ?? 0,
        height: rect?.height ?? 0,
        marginBottom: element ? getComputedStyle(element).marginBottom : ''
      }
    })(),
    image: (() => {
      const element = document.querySelector<HTMLImageElement>('.lb-stage img')
      const rect = element?.getBoundingClientRect()
      return {
        bottom: rect?.bottom ?? 0,
        top: rect?.top ?? 0,
        height: rect?.height ?? 0,
        computedHeight: element ? getComputedStyle(element).height : '',
        maxHeight: element ? getComputedStyle(element).maxHeight : ''
      }
    })(),
    metadata: (() => {
      const rect = document.querySelector<HTMLElement>('.lb-meta-dock')?.getBoundingClientRect()
      return { top: rect?.top ?? 0, height: rect?.height ?? 0 }
    })()
  }))
  expect(geometry.image.bottom, JSON.stringify(geometry)).toBeLessThanOrEqual(geometry.metadata.top - 12)

  await page.keyboard.press('Escape')
  await expect(page.locator('.lightbox')).toHaveCount(0)
})

test('archive proof links share one semantic primitive across works and research', async ({ page }) => {
  await page.goto('/works.html')
  await expect(page.locator('.sc-proof-links .y-archive-link').first()).toBeVisible()

  await page.goto('/research.html')
  await expect(page.locator('.tl-proof-list .y-archive-link').first()).toBeVisible()
})

test('metric surfaces refine their boundary without adding elevation', async ({ page }) => {
  await page.goto('/academics.html')
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
  await expect(page.locator('.metric-strip')).toHaveAttribute('data-metrics-ready', 'true')
  const metric = page.locator('.metric-card').first()
  await expect(metric).toBeVisible()
  await metric.evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' }))
  await metric.hover()

  await expect(metric).toHaveCSS('transform', 'none')
  const hasFinePointer = await page.evaluate(() => (
    window.matchMedia('(hover: hover) and (pointer: fine)').matches
    && !window.matchMedia('(hover: none), (pointer: coarse)').matches
  ))
  if (hasFinePointer) {
    await expect
      .poll(() => metric.evaluate((element) => getComputedStyle(element).boxShadow))
      .toMatch(/inset/)
  } else {
    await expect(metric).toHaveCSS('box-shadow', 'none')
  }
  const numberMetrics = await metric.locator('b').evaluate((element) => {
    const style = getComputedStyle(element)
    return { fontSize: parseFloat(style.fontSize), lineHeight: parseFloat(style.lineHeight) }
  })
  expect(numberMetrics.lineHeight).toBeLessThan(numberMetrics.fontSize)
})

test('shared control hover lift stays within the restrained motion token', async ({ page }) => {
  await page.goto('/index.html')
  const finePointer = await page.evaluate(() => window.matchMedia('(hover: hover) and (pointer: fine)').matches)
  test.skip(!finePointer, 'Hover lift is only observable on fine-pointer projects')

  for (const selector of ['.theme-orbit', '.hero-action']) {
    const control = page.locator(selector).first()
    await control.hover()
    await expect.poll(() => control.evaluate((element) => {
      const transform = getComputedStyle(element).transform
      return transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m42
    })).toBe(-1)
  }
})
