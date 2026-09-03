import { devices, expect, test, type Page } from '@playwright/test'

const sourceCoordinates = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13']

async function settleHonorAnimations(page: Page) {
  await page.evaluate(async () => {
    const animations = [...document.querySelectorAll<HTMLElement>('.honor-card')]
      .flatMap((element) => element.getAnimations())
    await Promise.all(animations.map((animation) => animation.finished.catch(() => undefined)))
  })
}

async function settleHonorsPage(page: Page) {
  await page.goto('/honors.html')
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
  await expect(page.locator('html')).toHaveAttribute('data-fonts-ready', 'ready')
  await page.evaluate(async () => {
    await document.fonts?.ready
    await document.fonts?.load('560 11.52px "IBM Plex Mono"', '13')
  })
  await expect(page.locator('.honor-card')).toHaveCount(13)
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  }))
  await settleHonorAnimations(page)
}

test('honors archive keeps source coordinates when filtered', async ({ page }) => {
  await page.goto('/honors.html')

  await expect(page.locator('.honor-card')).toHaveCount(13)
  await expect(page.locator('.honor-coordinate')).toHaveText(sourceCoordinates)
  await expect(page.locator('[data-honor-filter="peak"]')).toHaveAttribute('aria-pressed', 'false')

  await page.locator('[data-honor-filter="peak"]').click()

  await expect(page.locator('[data-honor-filter="peak"]')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.honor-card')).toHaveCount(4)
  await expect(page.locator('.honor-coordinate')).toHaveText(['02', '03', '07', '10'])
})

test('honors filter counts keep fixed circles and centered numerals', async ({ page }) => {
  await settleHonorsPage(page)
  await page.mouse.move(0, 0)

  const counts = page.locator('.filter-count')
  await expect(counts).toHaveCount(4)
  const geometry = await counts.evaluateAll((elements) => elements.map((element) => {
    const circle = element.getBoundingClientRect()
    const textNode = element.firstChild
    const button = element.closest('button')
    if (!textNode || !button) throw new Error('Honor filter count is missing its text node or button')

    const range = document.createRange()
    range.selectNodeContents(textNode)
    const text = range.getBoundingClientRect()
    const buttonRect = button.getBoundingClientRect()

    return {
      value: element.textContent?.trim() ?? '',
      width: circle.width,
      height: circle.height,
      centerDeltaX: Math.abs(text.left + text.width / 2 - (circle.left + circle.width / 2)),
      centerDeltaY: Math.abs(text.top + text.height / 2 - (circle.top + circle.height / 2)),
      paddingDelta: Math.abs((text.top - circle.top) - (circle.bottom - text.bottom)),
      buttonRightGap: buttonRect.right - circle.right
    }
  }))

  expect(geometry.map(({ value }) => value)).toEqual(['13', '4', '2', '7'])
  expect(geometry.every(({ width, height }) => (
    Math.abs(width - 24) <= .5
    && Math.abs(height - 24) <= .5
    && Math.abs(width - height) <= 1
  ))).toBe(true)
  expect(geometry.every(({ centerDeltaX, centerDeltaY }) => centerDeltaX <= 1 && centerDeltaY <= 1)).toBe(true)
  expect(Math.max(...geometry.map(({ paddingDelta }) => paddingDelta))).toBeLessThanOrEqual(1)

  const buttonGaps = geometry.map(({ buttonRightGap }) => buttonRightGap)
  expect(Math.max(...buttonGaps) - Math.min(...buttonGaps)).toBeLessThanOrEqual(1)
})

test('honors cards stay presentational and use the default cursor', async ({ page }) => {
  await page.goto('/honors.html')

  const cardSemantics = await page.locator('.honor-card').evaluateAll((cards) => cards.map((card) => ({
    descendants: card.querySelectorAll('a, button, [tabindex]').length,
    cursor: getComputedStyle(card).cursor
  })))

  expect(cardSemantics.every(({ descendants, cursor }) => descendants === 0 && cursor === 'default'), JSON.stringify(cardSemantics)).toBe(true)
})

test('honors cards emphasize on hover without moving their rows', async ({ page }) => {
  await settleHonorsPage(page)
  const finePointer = await page.evaluate(() => window.matchMedia('(hover: hover) and (pointer: fine)').matches)
  test.skip(!finePointer, 'Hover emphasis is only observable on fine-pointer projects')

  const cards = page.locator('.honor-card')
  const card = cards.first()
  await card.scrollIntoViewIfNeeded()
  await expect(card).toHaveClass(/revealed/)
  await settleHonorAnimations(page)
  await page.mouse.move(0, 0)
  const before = await card.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return {
      top: rect.top,
      transform: getComputedStyle(element).transform,
      background: getComputedStyle(element).backgroundColor,
      accentWidth: getComputedStyle(element, '::before').width
    }
  })
  const rowTopsBefore = await cards.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().top))

  expect(before.transform).toBe('none')
  expect(before.accentWidth).toBe('2px')
  await card.hover()

  await expect.poll(() => card.evaluate((element) => getComputedStyle(element).transform)).toBe('none')
  await expect.poll(() => card.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(before.background)
  await expect.poll(() => card.evaluate((element) => getComputedStyle(element, '::before').width)).toBe('3px')

  const after = await card.evaluate((element) => ({
    top: element.getBoundingClientRect().top,
    transform: getComputedStyle(element).transform
  }))
  const rowTopsAfter = await cards.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().top))

  expect(after.transform).toBe('none')
  expect(Math.abs(after.top - before.top)).toBeLessThanOrEqual(.1)
  expect(rowTopsAfter.every((top, index) => {
    const beforeTop = rowTopsBefore[index]
    return beforeTop !== undefined && Math.abs(top - beforeTop) <= .1
  })).toBe(true)
})

test.describe('honors cards on touch pointers', () => {
  test.use({
    viewport: devices['iPhone 13'].viewport,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: devices['iPhone 13'].deviceScaleFactor,
    userAgent: devices['iPhone 13'].userAgent
  })

  test('do not gain hover movement or emphasis on touch', async ({ page }) => {
    await settleHonorsPage(page)
    expect(await page.evaluate(() => window.matchMedia('(hover: none), (pointer: coarse)').matches)).toBe(true)

    const card = page.locator('.honor-card').first()
    await card.scrollIntoViewIfNeeded()
    await expect(card).toHaveClass(/revealed/)
    await settleHonorAnimations(page)
    await page.mouse.move(0, 0)
    const before = await card.evaluate((element) => ({
      top: element.getBoundingClientRect().top,
      transform: getComputedStyle(element).transform,
      background: getComputedStyle(element).backgroundColor,
      accentWidth: getComputedStyle(element, '::before').width
    }))

    await card.tap()

    const after = await card.evaluate((element) => ({
      top: element.getBoundingClientRect().top,
      transform: getComputedStyle(element).transform,
      background: getComputedStyle(element).backgroundColor,
      accentWidth: getComputedStyle(element, '::before').width
    }))

    expect(before.transform).toBe('none')
    expect(after.transform).toBe('none')
    expect(after.background).toBe(before.background)
    expect(after.accentWidth).toBe('2px')
    expect(Math.abs(after.top - before.top)).toBeLessThanOrEqual(.1)
  })
})

test.describe('honors cards with reduced motion', () => {
  test('do not move when hovered', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await settleHonorsPage(page)

    const card = page.locator('.honor-card').first()
    await card.scrollIntoViewIfNeeded()
    await expect(card).toHaveClass(/revealed/)
    await settleHonorAnimations(page)
    await page.mouse.move(0, 0)
    const before = await card.evaluate((element) => ({
      top: element.getBoundingClientRect().top,
      transform: getComputedStyle(element).transform
    }))

    await card.hover()
    await expect.poll(() => card.evaluate((element) => getComputedStyle(element).transform)).toBe('none')

    const after = await card.evaluate((element) => ({
      top: element.getBoundingClientRect().top,
      transform: getComputedStyle(element).transform
    }))

    expect(before.transform).toBe('none')
    expect(after.transform).toBe('none')
    expect(Math.abs(after.top - before.top)).toBeLessThanOrEqual(.1)
  })
})

test('honors archive fits the required viewport and theme matrix', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })

  for (const theme of ['light', 'dark']) {
    await page.addInitScript((value) => localStorage.setItem('yance-theme', value), theme)

    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: width < 640 ? 844 : 900 })
      await page.goto('/honors.html')
      await expect(page.locator('.honor-card')).toHaveCount(13)

      const geometry = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        cardWidths: [...document.querySelectorAll<HTMLElement>('.honor-card')].map((card) => card.scrollWidth <= card.clientWidth + 1),
        transforms: [...document.querySelectorAll<HTMLElement>('.honor-card')].map((card) => getComputedStyle(card).transform)
      }))

      expect(geometry.documentWidth, `${theme} honors overflow at ${width}px`).toBeLessThanOrEqual(geometry.viewportWidth)
      expect(geometry.cardWidths.every(Boolean), `${theme} honors card overflow at ${width}px`).toBe(true)
      expect(geometry.transforms.every((transform) => transform === 'none' || transform === 'matrix(1, 0, 0, 1, 0, 0)')).toBe(true)
    }
  }
})
