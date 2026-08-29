import { expect, test } from '@playwright/test'

test('Academics passive rows remain inside layout after pointer emphasis', async ({ page }) => {
  await page.goto('/academics.html')

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
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
  await expect(page.locator('html')).toHaveAttribute('data-fonts-ready', 'ready', { timeout: 10_000 })

  const row = page.locator('.ap-row').first()
  await row.evaluate((element) => {
    const html = document.documentElement
    const previousScrollBehavior = html.style.scrollBehavior
    html.style.scrollBehavior = 'auto'
    element.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' })
    html.style.scrollBehavior = previousScrollBehavior
  })
  await expect(row).toHaveClass(/revealed/)
  await expect(row).toHaveCSS('transform', 'none')
  const initialBackground = await row.evaluate((element) => getComputedStyle(element).backgroundColor)
  const initialNumberColor = await row.locator('.ap-no').evaluate((element) => getComputedStyle(element).color)

  await row.hover()

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

  const group = page.locator('.toolchain-group').first()

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
