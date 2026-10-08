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

test('prioritizes an actionable descendant inside the particle field', async ({ page }) => {
  test.skip(!(await supportsCustomCursor(page)), 'custom pointer is only enabled for a fine, hovering pointer')
  await page.goto('/')

  await page.locator('.home-hero-particles').evaluate((particleField) => {
    particleField.setAttribute('aria-hidden', 'false')
    const action = document.createElement('button')
    action.type = 'button'
    action.setAttribute('aria-label', 'Temporary hero action')
    action.style.cssText = 'position: fixed; top: 180px; left: 220px; z-index: 2147483647; pointer-events: auto'
    particleField.append(action)
  })

  const action = page.getByRole('button', { name: 'Temporary hero action' })
  await action.hover()
  await expect(page.locator('.sitewide-cursor')).toHaveAttribute('data-context', 'interactive')
})

test('keeps the native cursor over disabled controls', async ({ page }) => {
  test.skip(!(await supportsCustomCursor(page)), 'custom pointer is only enabled for a fine, hovering pointer')
  await page.goto('/works/')

  await page.evaluate(() => {
    const disabledAction = document.createElement('button')
    disabledAction.type = 'button'
    disabledAction.disabled = true
    disabledAction.setAttribute('aria-label', 'Disabled cursor control')
    disabledAction.style.cssText = 'position: fixed; top: 180px; left: 220px; z-index: 2147483647; cursor: not-allowed'
    document.body.append(disabledAction)
  })

  const disabledAction = page.getByRole('button', { name: 'Disabled cursor control' })
  await disabledAction.hover()
  await expect(page.locator('html')).not.toHaveClass(/sitewide-cursor-active/)
  await expect(page.locator('.sitewide-cursor')).toBeHidden()
  await expect(disabledAction).toHaveCSS('cursor', 'not-allowed')
})

test('keeps the center dot at the pointer while the ring follows', async ({ page }) => {
  test.skip(!(await supportsCustomCursor(page)), 'custom pointer is only enabled for a fine, hovering pointer')
  await page.setViewportSize({ width: 1200, height: 900 })
  await page.goto('/')

  const cursor = page.locator('.sitewide-cursor')
  const dot = cursor.locator('.sitewide-cursor-dot')
  await page.mouse.move(110, 160)
  await expect(cursor).toBeVisible()
  await page.mouse.move(820, 640, { steps: 1 })

  await expect.poll(async () => {
    const box = await dot.boundingBox()
    if (!box) return null
    return { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) }
  }).toEqual({ x: 820, y: 640 })

  const ring = cursor.locator('.sitewide-cursor-ring')
  await expect(ring).toBeAttached()
  await expect.poll(async () => {
    const box = await ring.boundingBox()
    if (!box) return false
    return Math.abs(box.x + box.width / 2 - 820) < 1
      && Math.abs(box.y + box.height / 2 - 640) < 1
  }).toBe(true)
})

test('sizes the ring for surface, controls, and particles', async ({ page }) => {
  test.skip(!(await supportsCustomCursor(page)), 'custom pointer is only enabled for a fine, hovering pointer')
  await page.goto('/')
  await page.evaluate(() => {
    const surface = document.createElement('div')
    surface.setAttribute('aria-label', 'Cursor surface fixture')
    surface.style.cssText = 'position: fixed; top: 260px; left: 220px; width: 80px; height: 60px; z-index: 2147483647'
    document.body.append(surface)
  })

  const ring = page.locator('.sitewide-cursor-ring')
  const dot = page.locator('.sitewide-cursor-dot')
  await page.locator('[aria-label="Cursor surface fixture"]').hover()
  await expect.poll(() => ring.evaluate((element) => getComputedStyle(element).width)).toBe('32px')
  await expect(dot).toHaveCSS('width', '5px')

  await page.locator('.site-nav .nav-rail a').first().hover()
  await expect.poll(() => ring.evaluate((element) => getComputedStyle(element).width)).toBe('52px')

  await page.locator('.home-hero-particles').hover()
  await expect.poll(() => ring.evaluate((element) => getComputedStyle(element).width)).toBe('80px')
})

test('reclassifies a target moved under a stationary pointer', async ({ page }) => {
  test.skip(!(await supportsCustomCursor(page)), 'custom pointer is only enabled for a fine, hovering pointer')
  await page.goto('/research/')
  await page.mouse.move(220, 180)

  const cursor = page.locator('.sitewide-cursor')
  await expect(cursor).toHaveAttribute('data-context', 'surface')

  await page.evaluate(() => {
    const action = document.createElement('button')
    action.type = 'button'
    action.id = 'stationary-pointer-action'
    action.setAttribute('aria-label', 'Moved under stationary pointer')
    action.style.cssText = 'position: fixed; top: -1000px; left: 190px; width: 100px; height: 60px; z-index: 2147483647'
    document.body.append(action)
  })
  await page.evaluate(() => {
    const action = document.getElementById('stationary-pointer-action')
    if (action instanceof HTMLButtonElement) action.style.top = '150px'
  })

  await expect(cursor).toHaveAttribute('data-context', 'interactive')
})

test('coalesces stationary-pointer hit testing until the next animation frame', async ({ page }) => {
  test.skip(!(await supportsCustomCursor(page)), 'custom pointer is only enabled for a fine, hovering pointer')
  await page.goto('/research/')
  await page.mouse.move(220, 180)

  const frameCounts = await page.evaluate(() => new Promise<{ immediate: string; afterNextFrame: string }>((resolve) => {
    const original = Document.prototype.elementFromPoint
    document.documentElement.dataset.cursorHitTestCount = '0'
    Document.prototype.elementFromPoint = function (x, y) {
      const count = Number(document.documentElement.dataset.cursorHitTestCount) + 1
      document.documentElement.dataset.cursorHitTestCount = String(count)
      return original.call(this, x, y)
    }

    for (let index = 0; index < 5; index += 1) {
      window.dispatchEvent(new Event('scroll'))
    }
    const immediate = document.documentElement.dataset.cursorHitTestCount ?? '0'
    window.requestAnimationFrame(() => {
      resolve({
        immediate,
        afterNextFrame: document.documentElement.dataset.cursorHitTestCount ?? '0'
      })
    })
  }))

  expect(frameCounts.immediate).toBe('0')
  expect(frameCounts.afterNextFrame).toBe('1')
})

test('restores the native cursor when touch input reaches a fine-pointer page', async ({ page }) => {
  test.skip(!(await supportsCustomCursor(page)), 'custom pointer is only enabled for a fine, hovering pointer')
  await page.goto('/research/')
  const cursor = page.locator('.sitewide-cursor')

  await page.mouse.move(220, 180)
  await expect(page.locator('html')).toHaveClass(/sitewide-cursor-active/)
  await page.evaluate(() => {
    window.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true,
      pointerType: 'touch',
      clientX: 220,
      clientY: 180
    }))
  })

  await expect(page.locator('html')).not.toHaveClass(/sitewide-cursor-active/)
  await expect(cursor).toBeHidden()
  await page.mouse.move(224, 184)
  await expect(page.locator('html')).toHaveClass(/sitewide-cursor-active/)
})

test('clears the pressed cursor state on release and pointer cancellation', async ({ page }) => {
  test.skip(!(await supportsCustomCursor(page)), 'custom pointer is only enabled for a fine, hovering pointer')
  await page.goto('/works/')
  const cursor = page.locator('.sitewide-cursor')
  const themeButton = page.locator('.theme-orbit')
  const ring = cursor.locator('.sitewide-cursor-ring')
  const dot = cursor.locator('.sitewide-cursor-dot')
  const ringFollowsDot = async () => {
    const ringBox = await ring.boundingBox()
    const dotBox = await dot.boundingBox()
    if (!ringBox || !dotBox) return false
    return Math.abs(ringBox.x + ringBox.width / 2 - dotBox.x - dotBox.width / 2) < 1
      && Math.abs(ringBox.y + ringBox.height / 2 - dotBox.y - dotBox.height / 2) < 1
  }
  const pressedRingIsCentered = async () => {
    const ringBox = await ring.boundingBox()
    const dotBox = await dot.boundingBox()
    const pressScale = await ring.evaluate((element) => {
      const transform = getComputedStyle(element, '::before').transform
      return transform === 'none' ? 1 : Number(transform.match(/^matrix\(([^,]+)/)?.[1] ?? Number.NaN)
    })
    if (!ringBox || !dotBox || Math.abs(pressScale - .94) >= .001) return false
    return Math.abs(ringBox.x + ringBox.width / 2 - dotBox.x - dotBox.width / 2) < 1
      && Math.abs(ringBox.y + ringBox.height / 2 - dotBox.y - dotBox.height / 2) < 1
  }

  await themeButton.hover()
  await expect.poll(ringFollowsDot).toBe(true)
  await page.mouse.down()
  await expect(cursor).toHaveClass(/is-pressed/)
  await expect.poll(pressedRingIsCentered).toBe(true)
  await page.mouse.up()
  await expect(cursor).not.toHaveClass(/is-pressed/)

  await page.mouse.down()
  await page.evaluate(() => {
    window.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerType: 'mouse' }))
  })
  await expect(cursor).not.toHaveClass(/is-pressed/)
  await page.mouse.up()
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
  await expect(cursor).toBeHidden()
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

  await page.emulateMedia({ forcedColors: 'none' })
  await expect(cursor).toBeAttached()
  await page.mouse.move(36, 192)
  await expect(page.locator('html')).toHaveClass(/sitewide-cursor-active/)
})

test('does not intercept navigation or remain visible after route changes', async ({ page }) => {
  test.skip(!(await supportsCustomCursor(page)), 'custom pointer is only enabled for a fine, hovering pointer')
  await page.goto('/research/')

  const cursor = page.locator('.sitewide-cursor')
  const nextPageLink = page.locator('.site-nav .nav-rail a[href="/works/"]')
  await nextPageLink.hover()
  await expect(cursor).toHaveAttribute('data-context', 'interactive')
  await nextPageLink.click()
  await expect(page).toHaveURL(/\/works\/$/)
  await expect(page.locator('html')).not.toHaveClass(/sitewide-cursor-active/)
})

test('theme changes restore the native cursor until the pointer moves again', async ({ page }) => {
  test.skip(!(await supportsCustomCursor(page)), 'custom pointer is only enabled for a fine, hovering pointer')
  await page.goto('/works/')

  await page.locator('.theme-orbit').hover()
  await expect(page.locator('html')).toHaveClass(/sitewide-cursor-active/)
  await page.locator('.theme-orbit').click()
  await expect(page.locator('html')).not.toHaveClass(/sitewide-cursor-active/)
  await page.mouse.move(40, 190)
  await expect(page.locator('html')).toHaveClass(/sitewide-cursor-active/)
})

test('lightbox changes restore the native cursor after closing', async ({ page }) => {
  test.skip(!(await supportsCustomCursor(page)), 'custom pointer is only enabled for a fine, hovering pointer')
  await page.goto('/concerts/')
  const cursor = page.locator('.sitewide-cursor')
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

test('clears cursor state when the pointer leaves or the page lifecycle changes', async ({ page }) => {
  test.skip(!(await supportsCustomCursor(page)), 'custom pointer is only enabled for a fine, hovering pointer')
  await page.goto('/research/')

  const root = page.locator('html')
  await page.mouse.move(240, 180)
  await expect(root).toHaveClass(/sitewide-cursor-active/)
  await page.evaluate(() => {
    document.dispatchEvent(new PointerEvent('pointerout', { bubbles: true, pointerType: 'mouse', relatedTarget: null }))
  })
  await expect(root).not.toHaveClass(/sitewide-cursor-active/)

  await page.mouse.move(244, 184)
  await expect(root).toHaveClass(/sitewide-cursor-active/)
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')))
  await expect(root).not.toHaveClass(/sitewide-cursor-active/)
  await page.evaluate(() => window.dispatchEvent(new Event('pageshow')))
  await expect(root).not.toHaveClass(/sitewide-cursor-active/)

  await page.mouse.move(248, 188)
  await expect(root).toHaveClass(/sitewide-cursor-active/)
  await page.evaluate(() => window.dispatchEvent(new Event('blur')))
  await expect(root).not.toHaveClass(/sitewide-cursor-active/)
})

test('keeps cursor support consistent across every page, locale, and theme', async ({ page }) => {
  test.setTimeout(120_000)
  const localeRoutes = [
    { locale: 'zh-CN', prefix: '' },
    { locale: 'zh-HK', prefix: '/zh-hk' },
    { locale: 'en', prefix: '/en' }
  ] as const
  const pageRoutes = [
    '/',
    '/academics/',
    '/honors/',
    '/research/',
    '/works/',
    '/concerts/',
    '/404.html'
  ]
  const hasCustomCursor = await supportsCustomCursor(page)
  const cursor = page.locator('.sitewide-cursor')
  let pointerStep = 0

  await page.goto('/')
  for (const { locale, prefix } of localeRoutes) {
    for (const theme of ['light', 'dark'] as const) {
      await page.evaluate((value) => localStorage.setItem('yance-theme', value), theme)
      for (const path of pageRoutes) {
        const response = await page.goto(`${prefix}${path}`)
        const status = response?.status() ?? 0
        expect(status, `${locale} ${theme} ${prefix}${path} response`).toBeGreaterThanOrEqual(200)
        expect(status, `${locale} ${theme} ${prefix}${path} response`).toBeLessThan(400)
        await expect(page.locator('html')).toHaveAttribute('lang', locale)
        await expect(page.locator('html')).toHaveAttribute('data-locale', locale)
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
        await expect(page.locator('main')).toBeVisible()

        if (hasCustomCursor) {
          await expect(cursor).toBeAttached()
          pointerStep += 1
          await page.mouse.move(28 + pointerStep * 5, 220 + pointerStep * 3)
          await expect(cursor).toBeVisible()
          await expect(page.locator('html')).toHaveClass(/sitewide-cursor-active/)
        } else {
          await expect(cursor).toHaveCount(0)
          await expect(page.locator('html')).not.toHaveClass(/sitewide-cursor-active/)
        }
      }
    }
  }
})
