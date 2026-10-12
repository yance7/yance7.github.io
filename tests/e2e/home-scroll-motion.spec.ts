import { expect, test, type Page } from '@playwright/test'

async function openHome(page: Page, path = '/') {
  await page.goto(path)
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
  await expect(page.locator('html')).toHaveAttribute('data-fonts-ready', 'ready')
}

async function hasDesktopInput(page: Page) {
  return page.evaluate(() => matchMedia('(min-width: 1025px) and (hover: hover) and (pointer: fine)').matches)
}

test('home native snap follows desktop input, width and runtime motion preferences', async ({ page }) => {
  await openHome(page)
  const desktop = await hasDesktopInput(page)
  expect(await page.evaluate(() => scrollY)).toBe(0)
  // Browsers serialize the default proximity keyword as just "y".
  await expect(page.locator('html')).toHaveCSS('scroll-snap-type', desktop ? /^y(?: proximity)?$/ : 'none')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.locator('html')).toHaveCSS('scroll-snap-type', 'none')
  await expect(page.locator('.reveal:not(.revealed)')).toHaveCount(0)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect(page.locator('html')).toHaveCSS('scroll-snap-type', desktop ? /^y(?: proximity)?$/ : 'none')
  await page.setViewportSize({ width: 640, height: 844 })
  await expect(page.locator('html')).toHaveCSS('scroll-snap-type', 'none')
})

test('native proximity aligns near a stable section and permits reading between targets', async ({ page }) => {
  await openHome(page)
  test.skip(!await hasDesktopInput(page), 'Native snapping is reserved for desktop fine pointers')
  const target = page.locator('#home-worlds')
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto' })
  await target.evaluate(element => {
    const top = scrollY + element.getBoundingClientRect().top
    const offset = parseFloat(getComputedStyle(element).scrollMarginTop)
    scrollTo({ top: top - offset - 24, behavior: 'instant' })
  })
  await expect.poll(() => target.evaluate(element => Math.abs(
    element.getBoundingClientRect().top - parseFloat(getComputedStyle(element).scrollMarginTop)
  ))).toBeLessThan(3)
  await expect(target).toHaveCSS('transform', 'none')
  const middle = await target.evaluate(element => {
    const rect = element.getBoundingClientRect()
    const top = scrollY + rect.top + rect.height * 0.5
    scrollTo({ top, behavior: 'instant' })
    return top
  })
  await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(middle, 0)
  await page.mouse.wheel(0, 1800)
  await expect.poll(() => page.locator('#home-beyond').evaluate(element =>
    element.getBoundingClientRect().top <= parseFloat(getComputedStyle(element).scrollMarginTop) + 1
  )).toBe(true)
  await page.locator('.site-footer').scrollIntoViewIfNeeded()
  await expect(page.locator('.site-footer')).toBeInViewport()
})

test('home direct hash opens below navigation with its content already revealed', async ({ page }) => {
  await openHome(page, '/#home-beyond')
  await expect(page.locator('#home-beyond .reveal:not(.revealed)')).toHaveCount(0)
  await expect.poll(() => page.locator('#home-beyond .section-head').evaluate(element => {
    const header = document.querySelector('.site-nav')!.getBoundingClientRect()
    return element.getBoundingClientRect().top >= Math.max(0, header.bottom)
  })).toBe(true)
  await expect(page.locator('html')).toHaveCSS('scroll-snap-type', 'none')
})

test('focus reveals a pending home card synchronously and preserves native keyboard scrolling', async ({ page }) => {
  await openHome(page)
  const card = page.locator('.world-card').last()
  await expect(card).not.toHaveClass(/revealed/)
  const opacity = await card.evaluate(element => {
    element.focus({ preventScroll: true })
    return getComputedStyle(element).opacity
  })
  expect(opacity).toBe('1')
  await expect(card).toHaveClass(/revealed/)
  await expect(page.locator('html')).toHaveCSS('scroll-snap-type', 'none')
  await page.keyboard.press('End')
  await expect(page.locator('.site-footer')).toBeInViewport()
  await expect.poll(() => page.evaluate(() => Math.abs(
    scrollY - (document.documentElement.scrollHeight - innerHeight)
  ))).toBeLessThan(2)
  await page.keyboard.press('Home')
  await expect(page.locator('.home-hero')).toBeInViewport()
})

test('native home scrolling reaches the entire natural footer', async ({ page }) => {
  await openHome(page)
  test.skip(!await hasDesktopInput(page), 'Desktop native proximity tail must allow footer access')
  await page.locator('#home-beyond').evaluate(element => element.scrollIntoView({ behavior: 'instant', block: 'start' }))
  await page.mouse.wheel(0, 1200)
  await page.mouse.wheel(0, 1200)
  await expect.poll(() => page.evaluate(() => Math.abs(
    scrollY - (document.documentElement.scrollHeight - innerHeight)
  ))).toBeLessThan(2)
  await expect.poll(() => page.locator('.site-footer').evaluate(element => element.getBoundingClientRect().bottom))
    .toBeLessThanOrEqual(await page.evaluate(() => innerHeight + 1))
})

test('home reveals remain visible after scrolling up and changing theme', async ({ page }) => {
  await openHome(page)
  await page.locator('.site-footer').scrollIntoViewIfNeeded()
  await expect(page.locator('.reveal:not(.revealed)')).toHaveCount(0)
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
  await page.locator('.theme-orbit').click()
  await expect(page.locator('.reveal:not(.revealed)')).toHaveCount(0)
  await expect.poll(() => page.locator('.page-home .reveal').evaluateAll(elements => elements.every(
    element => getComputedStyle(element).opacity === '1'
  ))).toBe(true)
})

test('home Hero anchors and history navigation preserve their native target', async ({ page }) => {
  await openHome(page)
  const action = page.locator('.home-hero-actions a[href="#home-worlds"]')
  await action.focus()
  await action.click()
  await expect(page).toHaveURL(/#home-worlds$/)
  await expect(page.locator('#home-worlds .reveal:not(.revealed)')).toHaveCount(0)
  await expect(page.locator('html')).toHaveCSS('scroll-snap-type', 'none')
  await page.goto('/research/')
  await page.goBack()
  await expect(page).toHaveURL(/#home-worlds$/)
  await expect(page.locator('#home-worlds .section-head')).toBeInViewport()
  await page.goForward()
  await expect(page).toHaveURL(/\/research\/$/)
  await expect(page.locator('html')).not.toHaveClass(/home-scroll-snap/)
})

test('home snap yields to scroll locks and resumes after unlock', async ({ page }) => {
  await openHome(page)
  test.skip(!await hasDesktopInput(page), 'Desktop input is required for snap lifecycle')
  await page.evaluate(() => { document.body.style.overflow = 'hidden' })
  await expect(page.locator('html')).toHaveCSS('scroll-snap-type', 'none')
  await page.evaluate(() => { document.body.style.removeProperty('overflow') })
  await expect(page.locator('html')).toHaveCSS('scroll-snap-type', /^y(?: proximity)?$/)
})

test('home history restores a reading position without snapping to a chapter', async ({ page }) => {
  await openHome(page)
  await page.locator('.theme-orbit').focus()
  const position = await page.locator('#home-worlds').evaluate(element => {
    const top = Math.round(scrollY + element.getBoundingClientRect().top + element.getBoundingClientRect().height * 0.4)
    scrollTo({ top, behavior: 'instant' })
    return Math.round(top)
  })
  await expect.poll(() => page.evaluate(() => Math.round(scrollY))).toBe(position)
  await page.goto('/research/')
  await page.goBack()
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
  await expect.poll(() => page.evaluate(() => Math.round(scrollY))).toBe(position)
  await expect(page.locator('html')).toHaveCSS('scroll-snap-type', 'none')
})

for (const cancelWithTouch of [false, true]) {
  test(`home history ${cancelWithTouch ? 'yields to touch input' : 'waits for locale fonts'} during cold restoration`, async ({ page }) => {
    await openHome(page)
    await page.locator('.theme-orbit').focus()
    await page.evaluate(() => scrollTo({ top: 700, behavior: 'instant' }))
    await expect.poll(() => page.evaluate(() => Math.round(scrollY))).toBe(700)
    await page.goto('/research/')
    let releaseFonts = () => {}
    const heldFonts = new Promise<void>(resolve => { releaseFonts = resolve })
    let pendingFonts = 0
    await page.route('**/assets/vue/fonts-*.css', async route => {
      pendingFonts += 1
      await heldFonts
      await route.continue()
    })
    try {
      await page.goBack({ waitUntil: 'domcontentloaded' })
      await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
      await expect.poll(() => pendingFonts).toBeGreaterThan(0)
      await expect(page.locator('html')).toHaveAttribute('data-fonts-ready', 'loading')
      await expect(page.locator('html')).toHaveAttribute('data-home-scroll-restore', 'true')
      if (cancelWithTouch) {
        await page.locator('.home-hero-particles').dispatchEvent('pointerdown', { pointerType: 'touch' })
        await expect(page.locator('html')).not.toHaveAttribute('data-home-scroll-restore')
        await page.evaluate(() => scrollTo({ top: 200, behavior: 'instant' }))
      }
      releaseFonts()
      await expect(page.locator('html')).toHaveAttribute('data-fonts-ready', 'ready')
      await expect(page.locator('html')).not.toHaveAttribute('data-home-scroll-restore')
      await expect.poll(() => page.evaluate(() => Math.round(scrollY))).toBe(cancelWithTouch ? 200 : 700)
    } finally {
      releaseFonts()
    }
  })
}

test('home loading failure keeps native document scrolling available', async ({ page }) => {
  await page.route('**/assets/vue/HomePage-*.js', route => route.abort())
  await page.goto('/')
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'error')
  await expect(page.locator('.home-hero')).toBeVisible()
  await expect(page.locator('html')).not.toHaveClass(/home-scroll-snap/)
  await expect(page.locator('html')).toHaveCSS('scroll-snap-type', 'none')
})

test('home stays visible when IntersectionObserver is unavailable', async ({ page }) => {
  await page.addInitScript(() => { delete (window as unknown as { IntersectionObserver?: unknown }).IntersectionObserver })
  await openHome(page)
  await expect(page.locator('.page-home .reveal')).not.toHaveCount(0)
  await expect(page.locator('.page-home .reveal:not(.revealed)')).toHaveCount(0)
})

test('immediate focus reveal restores the normal card interaction transitions', async ({ page }) => {
  await openHome(page)
  const card = page.locator('.focus-product')
  await card.locator('.focus-card-main').focus()
  await expect(card).toHaveClass(/revealed/)
  await expect(card).not.toHaveAttribute('data-reveal-immediate', 'true')
  await expect.poll(() => card.evaluate(element => getComputedStyle(element).transitionDuration)).not.toBe('0s')
})

test('focus during an observer-triggered home stagger immediately shows its card', async ({ page }) => {
  await openHome(page)
  await page.keyboard.press('PageDown')
  const card = page.locator('.world-card').last()
  await card.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }))
  await expect(card).toHaveClass(/revealed/)
  const opacity = await card.evaluate(element => {
    element.focus({ preventScroll: true })
    return getComputedStyle(element).opacity
  })
  expect(opacity).toBe('1')
  await expect.poll(() => card.evaluate(element => getComputedStyle(element).transitionDuration)).not.toBe('0s')
})

for (const path of ['/zh-hk/', '/en/']) {
  test(`home hash content in ${path} avoids replay on reload`, async ({ page }) => {
    await openHome(page, `${path}#home-worlds`)
    await expect(page.locator('#home-worlds .reveal:not(.revealed)')).toHaveCount(0)
    await page.reload()
    await expect(page.locator('#home-worlds .reveal:not(.revealed)')).toHaveCount(0)
    await expect(page.locator('html')).toHaveCSS('scroll-snap-type', 'none')
  })
}

for (const route of ['academics', 'honors', 'research', 'works', 'concerts', '404']) {
  test(`${route} does not inherit home document snap`, async ({ page }) => {
    await page.goto(route === '404' ? '/404.html' : `/${route}/`)
    await expect(page.locator('html')).not.toHaveClass(/home-scroll-snap/)
    await expect(page.locator('html')).toHaveCSS('scroll-snap-type', 'none')
  })
}
