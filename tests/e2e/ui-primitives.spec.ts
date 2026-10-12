import { expect, test } from '@playwright/test'

for (const variant of ['primary', 'secondary']) {
  test(`@pointer-refinement Hero ${variant} press keeps its hit area and label stable`, async ({ page }) => {
    test.skip(!(await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches)), 'fine pointer only')
    await page.goto('/')
    await expect(page.locator('.home-hero')).toHaveAttribute('data-intro-state', 'complete')
    const action = page.locator(`.hero-action.${variant}`)
    const visual = action.locator('.hero-action__visual')
    const baseline = await action.boundingBox()
    await action.hover({ position: { x: 8, y: 8 } })
    await page.mouse.down()
    await expect(action).toHaveCSS('transform', 'none')
    await expect.poll(() => visual.evaluate((element) => {
      const transform = getComputedStyle(element).transform
      return transform === 'none' ? 1 : new DOMMatrixReadOnly(transform).m11
    })).toBeCloseTo(.98, 3)
    await expect(visual.locator('span').first()).toHaveCSS('transform', 'none')
    const pressed = await action.boundingBox()
    expect(pressed?.x).toBeCloseTo(baseline!.x, 1)
    expect(pressed?.y).toBeCloseTo(baseline!.y, 1)
    await page.mouse.move(0, 0)
    await page.mouse.up()
  })
}

for (const preference of ['reduced motion', 'forced colors', 'coarse pointer'] as const) {
  test(`@pointer-refinement both Hero actions keep static feedback under ${preference}`, async ({ page }) => {
    if (preference === 'coarse pointer') {
      test.skip(!(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)), 'coarse pointer only')
    } else {
      await page.emulateMedia(preference === 'reduced motion'
        ? { reducedMotion: 'reduce' }
        : { forcedColors: 'active' })
    }
    await page.goto('/')
    for (const action of await page.locator('.hero-action').all()) {
      await action.hover()
      await page.mouse.down()
      await expect(action).toHaveCSS('transform', 'none')
      for (const layer of await action.locator('span').all()) {
        await expect(layer).toHaveCSS('transform', 'none')
      }
      await expect(action.locator('.hero-action__visual')).toHaveCSS('translate', 'none')
      await page.mouse.move(0, 0)
      await page.mouse.up()
    }
  })
}

for (const preference of ['reduced motion', 'forced colors'] as const) {
  test(`@pointer-refinement shared buttons keep static feedback under ${preference}`, async ({ page }) => {
    await page.emulateMedia(preference === 'reduced motion'
      ? { reducedMotion: 'reduce' }
      : { forcedColors: 'active' })
    await page.goto('/404.html')
    const button = page.locator('.error-actions .y-button').first()
    const visual = button.locator('.y-button__visual')
    await button.hover()
    await expect(visual).toHaveCSS('transform', 'none')
    await page.mouse.down()
    await expect(visual).toHaveCSS('transform', 'none')
    await expect(button).toHaveCSS('transform', 'none')
    await page.mouse.up()
  })
}

test('@pointer-refinement shared buttons keep static feedback on coarse touch devices', async ({ page }) => {
  test.skip(!(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)), 'coarse pointer only')
  await page.goto('/404.html')
  const button = page.locator('.error-actions .y-button').first()
  const visual = button.locator('.y-button__visual')
  await button.hover()
  await page.mouse.down()
  await expect(visual).toHaveCSS('transform', 'none')
  await expect(button).toHaveCSS('transform', 'none')
  await page.mouse.up()
})

test('@pointer-refinement shared button press keeps its semantic hit area stable', async ({ page }) => {
  test.skip(!(await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches)), 'fine pointer only')
  await page.goto('/concerts/')
  await page.locator('.poster-open').first().click()
  const close = page.locator('.lb-close')
  await expect(page.locator('.lightbox')).not.toHaveClass(/lightbox-enter-active/)
  await close.hover()
  const baseline = await close.boundingBox()
  await page.mouse.down()
  await expect(close).toHaveCSS('transform', 'none')
  await expect.poll(() => close.locator('.y-button__visual').evaluate((element) => {
    const transform = getComputedStyle(element).transform
    return transform === 'none' ? 1 : new DOMMatrixReadOnly(transform).m11
  })).toBeCloseTo(.98, 3)
  const pressed = await close.boundingBox()
  expect(pressed?.x).toBeCloseTo(baseline!.x, 1)
  expect(pressed?.y).toBeCloseTo(baseline!.y, 1)
  await page.mouse.up()
  await expect(page.locator('.lightbox')).toHaveCount(0)
  await expect(page.locator('.sitewide-cursor')).not.toHaveClass(/is-pressed/)
})

test('shared project actions expose stable keyboard targets', async ({ page }) => {
  await page.goto('/works/')

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
  await page.goto('/works/')

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

test('reading progress exposes one non-interactive semantic surface', async ({ page }) => {
  await page.goto('/research/')

  const progress = page.locator('.scroll-progress')
  await expect(progress).toHaveRole('progressbar')
  await expect(progress).toHaveAttribute('aria-label', '阅读进度')
  await expect(progress).toHaveCSS('pointer-events', 'none')
  await expect(progress).toHaveAttribute('aria-valuenow', '0')
})

test('lightbox keeps metadata and quiet control chrome bounded', async ({ page }) => {
  await page.goto('/concerts/')
  await page.locator('.concert-poster .poster-open').first().click()

  const lightbox = page.locator('.lightbox')
  await expect(lightbox).toBeVisible()
  await expect(lightbox).not.toHaveClass(/lightbox-enter-active/)
  await expect(page.locator('.lb-stage img')).toHaveClass(/loaded/)
  await expect(page.locator('.lb-meta-dock')).toHaveCount(1)
  await expect(page.locator('.lb-meta-copy')).toBeVisible()
  await expect(page.locator('.lb-meta-copy small')).toHaveText('演唱会')
  await expect(page.locator('.lb-meta-index')).toHaveText(/\d+ \/ \d+/)
  await expect(page.locator('.lb-close')).toHaveClass(/y-button--icon/)
  await expect(page.locator('.lb-nav')).toHaveCount(0)

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
  await expect(lightbox).toHaveCount(0)
})

test('archive proof links share one semantic primitive across works and research', async ({ page }) => {
  await page.goto('/works/')
  await expect(page.locator('.sc-proof-links .y-archive-link').first()).toBeVisible()

  await page.goto('/research/')
  await expect(page.locator('.tl-proof-list .y-archive-link').first()).toBeVisible()
})

test('metric surfaces refine their boundary without adding elevation', async ({ page }) => {
  await page.goto('/academics/')
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
  await expect(page.locator('.metric-strip')).toHaveAttribute('data-metrics-ready', 'true')
  await expect(page.locator('html')).toHaveAttribute('data-fonts-ready', 'ready')
  const metric = page.locator('.metric-card').first()
  await expect(metric).toBeVisible()
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto'
  })
  await metric.scrollIntoViewIfNeeded()
  await page.evaluate(async () => {
    await document.fonts.ready
  })
  await expect(page.locator('.metric-strip')).toHaveClass(/revealed/)
  await expect(page.locator('.metric-strip')).toHaveCSS('transform', 'none')
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

test('shared control hover keeps Hero hit areas stable and theme lift restrained', async ({ page }) => {
  await page.goto('/')
  const finePointer = await page.evaluate(() => window.matchMedia('(hover: hover) and (pointer: fine)').matches)
  test.skip(!finePointer, 'Hover lift is only observable on fine-pointer projects')

  for (const selector of ['.theme-orbit', '.hero-action']) {
    const control = page.locator(selector).first()
    await control.hover()
    await expect.poll(() => control.evaluate((element) => {
      const transform = getComputedStyle(element).transform
      return transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m42
    })).toBe(selector === '.hero-action' ? 0 : -1)
  }
})
