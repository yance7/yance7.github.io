import { expect, test } from '@playwright/test'

test('Academics passive rows remain inside layout after pointer emphasis', async ({ page }) => {
  await page.goto('/academics.html')
  const finePointer = await page.evaluate(() => window.matchMedia('(hover: hover) and (pointer: fine)').matches)
  test.skip(!finePointer, 'Hover emphasis is only observable on fine-pointer projects')

  const row = page.locator('.ap-row').first()

  await row.hover()

  await expect(row).toBeVisible()

  const geometry = await row.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return {
      left: rect.left,
      right: rect.right,
      viewport: window.innerWidth
    }
  })

  expect(geometry.left).toBeGreaterThanOrEqual(0)
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewport + 1)
})

test('Academics education rows expose emphasis without becoming controls', async ({ page }) => {
  await page.goto('/academics.html')
  const finePointer = await page.evaluate(() => window.matchMedia('(hover: hover) and (pointer: fine)').matches)
  test.skip(!finePointer, 'Hover emphasis is only observable on fine-pointer projects')

  const row = page.locator('.education-row').first()
  const initial = await row.evaluate((element) => ({
    backgroundImage: getComputedStyle(element).backgroundImage,
    markerTransform: getComputedStyle(element, '::before').transform,
    nameColor: getComputedStyle(element.querySelector('.education-name')!).color
  }))

  await row.hover()

  await expect.poll(() => row.evaluate((element) => getComputedStyle(element).backgroundImage))
    .not.toBe(initial.backgroundImage)
  await expect.poll(() => row.evaluate((element) => getComputedStyle(element, '::before').transform))
    .not.toBe(initial.markerTransform)
  await expect.poll(() => row.evaluate((element) => getComputedStyle(element.querySelector('.education-name')!).color))
    .not.toBe(initial.nameColor)

  await expect.poll(() => row.evaluate((element) => getComputedStyle(element).cursor))
    .not.toBe('pointer')
})

test('Academics AP rows emphasize their result without shifting layout', async ({ page }) => {
  await page.goto('/academics.html')
  const finePointer = await page.evaluate(() => (
    window.matchMedia('(hover: hover) and (pointer: fine)').matches
    && !window.matchMedia('(hover: none), (pointer: coarse)').matches
  ))
  test.skip(!finePointer, 'Hover emphasis is only observable on fine-pointer projects')
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
  await expect(page.locator('html')).toHaveAttribute('data-fonts-ready', 'ready', { timeout: 10_000 })

  const row = page.locator('.ap-row').first()
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto'
  })
  await row.scrollIntoViewIfNeeded()
  await expect(page.locator('.metric-strip')).toHaveAttribute('data-metrics-ready', 'true')
  await page.locator('.metric-card').evaluateAll((elements) => {
    elements.forEach((element) => {
      (element as HTMLElement).style.contentVisibility = 'visible'
    })
  })
  await row.scrollIntoViewIfNeeded()
  await expect.poll(() => row.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    const header = document.querySelector('.site-nav')?.getBoundingClientRect()
    const headerBottom = header?.bottom ?? 0
    return rect.top >= headerBottom && rect.bottom <= window.innerHeight
  })).toBe(true)
  await expect(row).toHaveClass(/revealed/)
  await expect(row).toHaveCSS('transform', 'none')
  const initialBackground = await row.evaluate((element) => getComputedStyle(element).backgroundColor)
  const initialNumberColor = await row.locator('.ap-no').evaluate((element) => getComputedStyle(element).color)

  await row.hover()
  await expect.poll(() => row.evaluate((element) => element.matches(':hover'))).toBe(true)

  await expect.poll(() => row.evaluate((element) => getComputedStyle(element).backgroundColor))
    .not.toBe(initialBackground)
  await expect.poll(() => row.locator('.ap-no').evaluate((element) => getComputedStyle(element).color))
    .not.toBe(initialNumberColor)
})

test('Research toolchain groups use a bounded staggered reveal', async ({ page }) => {
  await page.goto('/research.html')

  const groups = page.locator('.toolchain-group')

  await expect(groups).toHaveCount(3)

  const delays = await groups.evaluateAll((elements) => (
    elements.map((element) => element.style.transitionDelay)
  ))

  expect(delays).toEqual(['', '60ms', '120ms'])
})

test('Research toolchain groups expose a passive accent without lifting the group', async ({ page }) => {
  await page.goto('/research.html')
  const finePointer = await page.evaluate(() => window.matchMedia('(hover: hover) and (pointer: fine)').matches)
  test.skip(!finePointer, 'Hover emphasis is only observable on fine-pointer projects')

  const group = page.locator('.toolchain-group').first()

  await group.scrollIntoViewIfNeeded()
  await expect(group).toHaveClass(/revealed/)
  await group.hover()

  await expect.poll(() => group.evaluate((element) => (
    Number.parseFloat(getComputedStyle(element, '::after').opacity)
  ))).toBeGreaterThan(0)

  const state = await group.evaluate((element) => ({
    content: getComputedStyle(element, '::after').content,
    transform: getComputedStyle(element).transform
  }))

  expect(state.content).not.toBe('none')
  expect(state.transform).toBe('none')
})

test('Research tool tags remain flat information labels on hover', async ({ page }) => {
  await page.goto('/research.html')

  const tool = page.locator('.tc-tool').first()

  await tool.hover()

  await expect.poll(() => tool.evaluate((element) => getComputedStyle(element).transform))
    .toBe('none')
})

test('New interaction polish does not introduce motion under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/research.html')

  const group = page.locator('.toolchain-group').first()

  await group.hover()
  await expect(group).toBeVisible()

  const pseudoTransition = await group.evaluate((element) => (
    getComputedStyle(element, '::after').transitionDuration
  ))

  expect(['0s', '0.01ms', '1e-05s']).toContain(pseudoTransition)
})

test('reveal content uses one-shot fade-up with a bounded stagger', async ({ page }) => {
  await page.goto('/works.html')
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')

  const secondProject = page.locator('#project-ap-microeconomics-notes')
  await expect(secondProject).toHaveClass(/reveal/)
  await expect(secondProject).not.toHaveClass(/revealed/)

  await secondProject.evaluate((element) => {
    element.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'nearest' })
  })
  await expect(secondProject).toHaveClass(/revealed/)
  await expect.poll(() => secondProject.evaluate((element) => getComputedStyle(element).transform)).toBe('none')

  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }))
  await expect.poll(() => secondProject.evaluate((element) => element.classList.contains('revealed'))).toBe(true)

  for (const route of ['/index.html', '/honors.html']) {
    await page.goto(route)
    const delays = await page.locator('.reveal').evaluateAll((elements) => elements
      .map((element) => element.style.transitionDelay)
      .filter(Boolean)
      .map((value) => Number.parseFloat(value)))
    expect(delays.every((delay) => delay <= 240)).toBe(true)
  }
})

test('reduced motion completes every reveal immediately', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/research.html')

  await expect.poll(() => page.locator('.reveal').count()).toBeGreaterThan(0)
  await expect.poll(() => page.locator('.reveal:not(.revealed)').count()).toBe(0)
  const states = await page.locator('.reveal').evaluateAll((elements) => elements.map((element) => {
    const style = getComputedStyle(element)
    return { opacity: Number.parseFloat(style.opacity), transform: style.transform }
  }))
  expect(states.every(({ opacity, transform }) => opacity === 1 && transform === 'none')).toBe(true)
})

test('quick hash navigation reveals the targeted Works project', async ({ page }) => {
  await page.goto('/works.html#project-ap-microeconomics-notes', { waitUntil: 'domcontentloaded' })

  const target = page.locator('#project-ap-microeconomics-notes')
  await expect(target).toHaveClass(/revealed/)
  await expect.poll(() => target.evaluate((element) => Number.parseFloat(getComputedStyle(element).opacity))).toBe(1)
  await expect.poll(() => target.evaluate((element) => getComputedStyle(element).transform)).toBe('none')
})

test('scrolling to the document end reveals the footer and all remaining content', async ({ page }) => {
  await page.goto('/concerts.html')

  await page.locator('.site-footer').scrollIntoViewIfNeeded()
  await expect(page.locator('.site-footer')).toBeVisible()
  await expect.poll(() => page.locator('.reveal:not(.revealed)').count()).toBe(0)
})
