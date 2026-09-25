import { expect, test, type Page } from '@playwright/test'

const routes = ['/', '/research/', '/works/', '/concerts/']

async function supportsCustomCursor(page: Page) {
  return page.evaluate(() => window.matchMedia('(hover: hover) and (pointer: fine)').matches)
}

test('shares pointer feedback across Home, Research, Works, and Concerts', async ({ page }) => {
  test.skip(!(await supportsCustomCursor(page)), 'custom pointer is only enabled for a fine, hovering pointer')

  const cursor = page.locator('.sitewide-cursor')

  for (const route of routes) {
    await page.goto(route)
    await expect(cursor).toBeAttached()

    const pageHero = page.locator(route === '/' ? '.home-hero' : '.archive-hero')
    await pageHero.hover({ position: { x: 12, y: 12 } })
    await expect(cursor).toHaveAttribute('data-context', 'surface')
    await expect(page.locator('html')).toHaveClass(/sitewide-cursor-active/)

    await page.locator('.site-nav .nav-rail a').first().hover()
    await expect(cursor).toHaveAttribute('data-context', 'interactive')
  }
})

test('distinguishes particle and editable text areas without hiding the native text cursor', async ({ page }) => {
  test.skip(!(await supportsCustomCursor(page)), 'custom pointer is only enabled for a fine, hovering pointer')
  await page.goto('/')

  const cursor = page.locator('.sitewide-cursor')
  await page.locator('.home-hero-particles').hover()
  await expect(cursor).toHaveAttribute('data-context', 'particle')

  await page.evaluate(() => {
    const input = document.createElement('input')
    input.type = 'text'
    input.setAttribute('aria-label', 'Cursor text fixture')
    input.style.position = 'fixed'
    input.style.top = '50%'
    input.style.left = '50%'
    input.style.width = '220px'
    input.style.height = '48px'
    input.style.zIndex = '2147483647'
    document.body.append(input)
  })

  const input = page.getByRole('textbox', { name: 'Cursor text fixture' })
  await input.hover()
  await expect(cursor).toHaveAttribute('data-context', 'text')
  await expect(page.locator('html')).not.toHaveClass(/sitewide-cursor-active/)
  await expect(input).toHaveCSS('cursor', 'text')
  await expect(cursor.locator('.sitewide-cursor-dot')).toBeHidden()
})

test('restores the native cursor after keyboard use, reduced motion, and forced colors', async ({ page }) => {
  test.skip(!(await supportsCustomCursor(page)), 'custom pointer is only enabled for a fine, hovering pointer')
  await page.goto('/research/')

  const cursor = page.locator('.sitewide-cursor')
  await page.mouse.move(24, 180)
  await expect(page.locator('html')).toHaveClass(/sitewide-cursor-active/)

  await page.keyboard.press('Tab')
  await expect(page.locator('html')).not.toHaveClass(/sitewide-cursor-active/)
  await expect(cursor).toBeHidden()

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.mouse.move(28, 184)
  await expect(cursor).toBeHidden()
  await expect(page.locator('html')).not.toHaveClass(/sitewide-cursor-active/)

  await page.emulateMedia({ reducedMotion: 'no-preference', forcedColors: 'active' })
  await page.mouse.move(32, 188)
  await expect(cursor).toBeHidden()
  await expect(page.locator('html')).not.toHaveClass(/sitewide-cursor-active/)
})

test('does not intercept navigation or remain visible through theme and lightbox changes', async ({ page }) => {
  test.skip(!(await supportsCustomCursor(page)), 'custom pointer is only enabled for a fine, hovering pointer')
  await page.goto('/research/')

  const cursor = page.locator('.sitewide-cursor')
  const nextPageLink = page.locator('.site-nav .nav-rail a[href="/works/"]')
  await nextPageLink.hover()
  await expect(cursor).toHaveAttribute('data-context', 'interactive')
  await nextPageLink.click()
  await expect(page).toHaveURL(/\/works\/$/)
  await expect(page.locator('html')).not.toHaveClass(/sitewide-cursor-active/)

  await page.locator('.theme-orbit').hover()
  await expect(page.locator('html')).toHaveClass(/sitewide-cursor-active/)
  await page.locator('.theme-orbit').click()
  await expect(page.locator('html')).not.toHaveClass(/sitewide-cursor-active/)
  await page.mouse.move(40, 190)
  await expect(page.locator('html')).toHaveClass(/sitewide-cursor-active/)

  await page.goto('/concerts/')
  await page.locator('.poster-open').first().click()
  await expect(page.locator('.lightbox')).toBeVisible()
  await expect(page.locator('html')).not.toHaveClass(/sitewide-cursor-active/)
  await page.locator('.lb-close').hover()
  await expect(cursor).toHaveAttribute('data-context', 'interactive')
  await page.locator('.lb-close').click()
  await expect(page.locator('.lightbox')).toHaveCount(0)
  await expect(page.locator('html')).not.toHaveClass(/sitewide-cursor-active/)
})

test('keeps custom cursor disabled on coarse touch devices', async ({ page }) => {
  test.skip(await supportsCustomCursor(page), 'coarse-pointer fallback is covered only by touch projects')
  await page.goto('/')

  await expect(page.locator('.sitewide-cursor')).toHaveCount(0)
  await expect(page.locator('html')).not.toHaveClass(/sitewide-cursor-active/)
})

test('does not attach global cursor pointer listeners on coarse touch devices', async ({ page }) => {
  test.skip(await supportsCustomCursor(page), 'coarse-pointer fallback is covered only by touch projects')
  await page.addInitScript(() => {
    const audit = { pointerMoveListeners: 0 }
    Object.assign(window, { __cursorListenerAudit: audit })
    const originalAddEventListener = window.addEventListener.bind(window)
    window.addEventListener = ((
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ) => {
      if (type === 'pointermove') audit.pointerMoveListeners += 1
      return originalAddEventListener(type, listener, options)
    }) as typeof window.addEventListener
  })
  await page.goto('/')

  await expect.poll(() => page.evaluate(() => (
    (window as Window & { __cursorListenerAudit?: { pointerMoveListeners: number } })
      .__cursorListenerAudit?.pointerMoveListeners ?? -1
  ))).toBe(0)
})
