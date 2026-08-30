import { expect, test, type Page } from '@playwright/test'

const destinations = [
  ['index.html', '#home-beyond'],
  ['academics.html', '#sec-ap-archive'],
  ['honors.html', '#sec-honors-archive'],
  ['research.html', '#sec-toolchain'],
  ['works.html', '#project-fresheye'],
  ['concerts.html', '#concert-archive']
] as const

const localeRoutes = [
  '/',
  '/academics.html',
  '/honors.html',
  '/research.html',
  '/works.html',
  '/concerts.html',
  '/zh-hk/',
  '/zh-hk/academics.html',
  '/zh-hk/honors.html',
  '/zh-hk/research.html',
  '/zh-hk/works.html',
  '/zh-hk/concerts.html',
  '/en/',
  '/en/academics.html',
  '/en/honors.html',
  '/en/research.html',
  '/en/works.html',
  '/en/concerts.html'
] as const

const compassViewports = [
  { name: 'tablet', width: 1024, height: 900 },
  { name: 'wide', width: 1440, height: 900 }
] as const

const representativeRoutes = [
  '/research.html',
  '/zh-hk/research.html',
  '/en/research.html',
  '/works.html',
  '/zh-hk/works.html',
  '/en/works.html',
  '/concerts.html',
  '/zh-hk/concerts.html',
  '/en/concerts.html'
] as const

const representativeViewports = [
  { name: 'narrow', width: 320, height: 844 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 900 }
] as const

function expectedExpandedWidth(route: string, viewportWidth: number) {
  const english = route.startsWith('/en/')
  if (viewportWidth <= 760) {
    const minimum = english ? 288 : 272
    const maximum = english ? 324 : 312
    return {
      exact: Math.min(Math.max(viewportWidth - 24, minimum), maximum),
      minimum,
      maximum
    }
  }

  return {
    exact: null,
    minimum: english ? 268 : 252,
    maximum: english ? 296 : 280
  }
}

type ScrollToCall = [{ top: number; left: number; behavior?: ScrollBehavior }] | [number, number]

const PRECLICK_MIN_CLEARANCE = 140
const PRECLICK_TARGET_RATIO = 0.65
const PRECLICK_BOTTOM_CLEARANCE = 120
const PRECLICK_EXTRA_ANCHOR_GAP = 20

async function positionDestinationAwayFromAnchor(page: Page, destination: string) {
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
  await expect(page.locator('html')).toHaveAttribute('data-fonts-ready', 'ready', { timeout: 10_000 })

  const target = page.locator(destination)
  const initialGeometry = await target.evaluate((element, options) => {
    const navigation = document.querySelector<HTMLElement>('.site-nav')
    if (!navigation) {
      throw new Error('PageCompass geometry requires .site-nav')
    }

    const navigationBottom = navigation.getBoundingClientRect().bottom
    const targetRect = element.getBoundingClientRect()
    const currentScrollY = window.scrollY
    const viewportHeight = window.innerHeight
    const scrollHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)
    const maxScrollY = Math.max(0, scrollHeight - viewportHeight)
    const documentTop = currentScrollY + targetRect.top
    const anchorOffset = Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--anchor-offset')
    ) || 0
    const requiredClearance = Math.max(options.minimumClearance, anchorOffset + 12)
    const desiredTargetTop = Math.max(
      navigationBottom + requiredClearance + options.extraAnchorGap,
      Math.min(viewportHeight * options.targetRatio, viewportHeight - options.bottomClearance)
    )
    const desiredScrollY = Math.min(
      Math.max(documentTop - desiredTargetTop, 0),
      maxScrollY
    )

    return { desiredScrollY }
  }, {
    minimumClearance: PRECLICK_MIN_CLEARANCE,
    targetRatio: PRECLICK_TARGET_RATIO,
    bottomClearance: PRECLICK_BOTTOM_CLEARANCE,
    extraAnchorGap: PRECLICK_EXTRA_ANCHOR_GAP
  })

  await page.evaluate((scrollTop) => {
    window.scrollTo({ top: scrollTop, left: 0, behavior: 'instant' })
  }, initialGeometry.desiredScrollY)

  const measuredGeometry = await target.evaluate((element, minimumClearance) => {
    const navigation = document.querySelector<HTMLElement>('.site-nav')
    if (!navigation) {
      throw new Error('PageCompass geometry requires .site-nav')
    }

    const anchorOffset = Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--anchor-offset')
    ) || 0
    return {
      navBottom: navigation.getBoundingClientRect().bottom,
      targetTop: element.getBoundingClientRect().top,
      requiredClearance: Math.max(minimumClearance, anchorOffset + 12)
    }
  }, PRECLICK_MIN_CLEARANCE)

  expect(measuredGeometry.targetTop, `${destination} must start away from the final anchor zone`)
    .toBeGreaterThanOrEqual(measuredGeometry.navBottom + measuredGeometry.requiredClearance)

  return { navBottom: measuredGeometry.navBottom }
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 })
})

for (const [route, destination] of destinations) {
  test(`PageCompass navigation settles independently on ${route}`, async ({ page }) => {
    await page.goto(`/${route}`)
    const trigger = page.locator('.page-compass-trigger')
    const destinationLink = page.locator(`.page-compass-link[href="${destination}"]`)
    const { navBottom } = await positionDestinationAwayFromAnchor(page, destination)
    await trigger.focus()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await expect(destinationLink).toBeVisible()

    await destinationLink.click()
    await expect.poll(
      () => page.locator(destination).evaluate((element) => element.getBoundingClientRect().top),
      { message: `${route}${destination}` }
    ).toBeGreaterThanOrEqual(navBottom + 12)
    await expect(trigger).toBeFocused()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })
}

test('Return Top performs one instant scroll, clears hash, closes, and keeps trigger focus', async ({ page }) => {
  await page.addInitScript(() => {
    type ScrollWindow = Window & { __compassScrollToCalls?: ScrollToCall[] }
    const scrollWindow = window as ScrollWindow
    const originalScrollTo = window.scrollTo.bind(window)
    scrollWindow.__compassScrollToCalls = []
    window.scrollTo = ((...args: ScrollToCall) => {
      scrollWindow.__compassScrollToCalls?.push(args)
      if (args.length === 1) originalScrollTo(args[0])
      else originalScrollTo(args[0], args[1])
    }) as typeof window.scrollTo
  })

  await page.goto('/honors.html#sec-honors-archive')
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
  const trigger = page.locator('.page-compass-trigger')
  const panel = page.locator('.page-compass-panel')
  await trigger.click()
  await page.evaluate(() => {
    const scrollWindow = window as Window & { __compassScrollToCalls?: ScrollToCall[] }
    scrollWindow.__compassScrollToCalls = []
    window.scrollTo({ top: 900, left: 0, behavior: 'instant' })
    scrollWindow.__compassScrollToCalls = []
  })

  await page.locator('.page-compass-top').click()
  await expect.poll(() => page.evaluate(() => {
    const scrollWindow = window as Window & { __compassScrollToCalls?: ScrollToCall[] }
    return scrollWindow.__compassScrollToCalls?.length ?? 0
  })).toBe(1)
  const scrollCalls = await page.evaluate(() => {
    const scrollWindow = window as Window & { __compassScrollToCalls?: ScrollToCall[] }
    return scrollWindow.__compassScrollToCalls
  })
  expect(scrollCalls).toEqual([[{ top: 0, left: 0, behavior: 'instant' }]])
  await expect(page).toHaveURL(/honors\.html$/)
  await expect(page.evaluate(() => Math.round(window.scrollY))).resolves.toBeLessThan(8)
  await expect(trigger).toBeFocused()
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await expect(panel).toHaveAttribute('inert', '')
})

test('reduced-motion PageCompass has discrete collapsed and actionable expanded geometry', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/works.html')
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')

  const trigger = page.locator('.page-compass-trigger')
  const panel = page.locator('.page-compass-panel')
  const link = page.locator('.page-compass-link[href="#project-fresheye"]')
  await expect(panel).toHaveCSS('display', 'none')
  await trigger.focus()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')

  const geometry = await panel.evaluate((element) => {
    const panelStyle = getComputedStyle(element)
    const panelRect = element.getBoundingClientRect()
    const linkElement = element.querySelector<HTMLAnchorElement>('.page-compass-link')
    const linkRect = linkElement?.getBoundingClientRect()
    return {
      display: panelStyle.display,
      maxHeight: Number.parseFloat(panelStyle.maxHeight),
      transition: panelStyle.transition,
      panelHeight: panelRect.height,
      linkWidth: linkRect?.width ?? 0,
      linkHeight: linkRect?.height ?? 0
    }
  })

  expect(geometry.display).toBe('grid')
  expect(geometry.maxHeight).toBeGreaterThan(0)
  expect(geometry.panelHeight).toBeGreaterThan(0)
  expect(geometry.linkWidth).toBeGreaterThan(0)
  expect(geometry.linkHeight).toBeGreaterThan(0)
  expect(geometry.transition).toBe('none')
  await expect(link).toBeVisible()
})

test('focus-first expansion does not require a second Enter activation', async ({ page }) => {
  await page.goto('/works.html')
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
  const trigger = page.locator('.page-compass-trigger')
  const link = page.locator('.page-compass-link[href="#project-fresheye"]')

  await trigger.focus()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await expect(link).toBeVisible()
  await link.click()
  await expect(trigger).toBeFocused()
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
})

test('desktop PageCompass is a secondary numeric progress surface', async ({ page }) => {
  await page.goto('/research.html')
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
  await expect(page.locator('.page-compass')).toBeVisible()
  await expect(page.locator('.scroll-progress')).toHaveCSS('opacity', '1')
  await expect(page.locator('.page-compass-read')).toBeHidden()
  await page.locator('.page-compass-trigger').click()
  await expect(page.locator('.page-compass-read')).toBeVisible()
})

test('desktop PageCompass exposes stable collapsed and expanded geometry', async ({ page }) => {
  await page.goto('/en/research.html')
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')

  const compass = page.locator('.page-compass')
  const trigger = compass.locator('.page-compass-trigger')
  const index = compass.locator('.page-compass-trigger-index')

  await expect(compass).toHaveAttribute('data-mode', 'closed')

  const collapsed = await compass.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return { width: rect.width, height: rect.height }
  })

  expect(collapsed.width).toBeGreaterThanOrEqual(116)
  expect(collapsed.width).toBeLessThanOrEqual(136)

  const indexGeometry = await index.evaluate((element) => {
    const style = getComputedStyle(element)
    const rect = element.getBoundingClientRect()
    return {
      whiteSpace: style.whiteSpace,
      height: rect.height,
      lineHeight: Number.parseFloat(style.lineHeight)
    }
  })

  expect(indexGeometry.whiteSpace).toBe('nowrap')
  expect(indexGeometry.height)
    .toBeLessThanOrEqual(Math.ceil(indexGeometry.lineHeight) + 2)

  await trigger.click()

  await expect(compass).toHaveAttribute('data-mode', 'pinned')
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')

  const expandedWidth = await compass.evaluate(
    (element) => element.getBoundingClientRect().width
  )

  expect(expandedWidth).toBeGreaterThanOrEqual(268)
  expect(expandedWidth).toBeLessThanOrEqual(296)
})

test('PageCompass visually exposes transient, pinned, and suppressed modes', async ({ page }) => {
  await page.goto('/research.html')
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')

  const compass = page.locator('.page-compass')
  const trigger = compass.locator('.page-compass-trigger')

  await expect(compass).toHaveAttribute('data-mode', 'closed')

  await trigger.hover()

  await expect(compass).toHaveAttribute('data-mode', 'transient')
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')

  await trigger.click()

  await expect(compass).toHaveAttribute('data-mode', 'pinned')

  await page.locator('.archive-hero').hover()

  await expect(compass).toHaveAttribute('data-mode', 'pinned')

  await page.keyboard.press('Escape')

  await expect(compass).toHaveAttribute('data-mode', 'suppressed')
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
})

test('PageCompass hover intent filters brief transit and preserves grace returns', async ({ page }) => {
  await page.goto('/research.html')
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')

  const compass = page.locator('.page-compass')
  const trigger = compass.locator('.page-compass-trigger')

  const modeAfterTransit = await compass.evaluate((element) => {
    const eventInit = { bubbles: false, pointerType: 'mouse' }
    element.dispatchEvent(new PointerEvent('pointerenter', eventInit))
    element.dispatchEvent(new PointerEvent('pointerleave', eventInit))
    return element.getAttribute('data-mode')
  })

  expect(modeAfterTransit).toBe('closed')
  await trigger.hover()
  await expect(compass).toHaveAttribute('data-mode', 'transient')

  const modeAfterGraceReturn = await compass.evaluate((element) => {
    const eventInit = { bubbles: false, pointerType: 'mouse' }
    element.dispatchEvent(new PointerEvent('pointerleave', eventInit))
    element.dispatchEvent(new PointerEvent('pointerenter', eventInit))
    return element.getAttribute('data-mode')
  })

  expect(modeAfterGraceReturn).toBe('transient')
})

for (const route of localeRoutes) {
  for (const viewport of compassViewports) {
    test(`PageCompass keeps ${route} bounded at ${viewport.name} width`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto(route)
      await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')

      const compass = page.locator('.page-compass')
      const trigger = compass.locator('.page-compass-trigger')
      const collapsedWidth = await compass.evaluate((element) => element.getBoundingClientRect().width)

      expect(collapsedWidth, `${route} collapsed width`).toBeGreaterThanOrEqual(116)
      expect(collapsedWidth, `${route} collapsed width`).toBeLessThanOrEqual(136)

      await trigger.click()
      await expect(compass).toHaveAttribute('data-mode', 'pinned')

      const geometry = await compass.evaluate((element) => {
        const rect = element.getBoundingClientRect()
        const header = document.querySelector<HTMLElement>('.site-nav')?.getBoundingClientRect()
        const labels = [...element.querySelectorAll<HTMLElement>('.page-compass-link-label')]
        const intersectsHeader = Boolean(header
          && rect.left < header.right
          && rect.right > header.left
          && rect.top < header.bottom
          && rect.bottom > header.top)

        return {
          left: rect.left,
          right: rect.right,
          width: rect.width,
          labelOverflow: labels.map((label) => label.scrollWidth - label.clientWidth),
          documentWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
          intersectsHeader
        }
      })

      expect(geometry.left, `${route} left edge`).toBeGreaterThanOrEqual(-1)
      expect(geometry.right, `${route} right edge`).toBeLessThanOrEqual(viewport.width + 1)
      const widthRange = expectedExpandedWidth(route, viewport.width)
      expect(geometry.width, `${route} expanded width`).toBeGreaterThanOrEqual(widthRange.minimum)
      expect(geometry.width, `${route} expanded width`).toBeLessThanOrEqual(widthRange.maximum)
      expect(Math.max(...geometry.labelOverflow, 0), `${route} label overflow`).toBeLessThanOrEqual(1)
      expect(geometry.documentWidth, `${route} document overflow`).toBeLessThanOrEqual(viewport.width + 1)
      expect(geometry.intersectsHeader, `${route} header collision`).toBe(false)
    })
  }
}

for (const route of representativeRoutes) {
  test(`PageCompass keeps ${route} compact at representative narrow widths`, async ({ page }) => {
    for (const viewport of representativeViewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto(route)
      await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')

      const compass = page.locator('.page-compass')
      await compass.locator('.page-compass-trigger').click()
      await expect(compass).toHaveAttribute('data-mode', 'pinned')

      const geometry = await compass.evaluate((element) => {
        const rect = element.getBoundingClientRect()
        const labels = [...element.querySelectorAll<HTMLElement>('.page-compass-link-label')]
        return {
          left: rect.left,
          right: rect.right,
          width: rect.width,
          labelOverflow: labels.map((label) => label.scrollWidth - label.clientWidth),
          documentWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
        }
      })
      const widthRange = expectedExpandedWidth(route, viewport.width)

      if (widthRange.exact !== null) {
        expect(Math.abs(geometry.width - widthRange.exact), `${route} ${viewport.name} expanded width`).toBeLessThanOrEqual(1)
      }
      expect(geometry.width, `${route} ${viewport.name} minimum width`).toBeGreaterThanOrEqual(widthRange.minimum)
      expect(geometry.width, `${route} ${viewport.name} maximum width`).toBeLessThanOrEqual(widthRange.maximum)
      expect(geometry.left, `${route} ${viewport.name} left edge`).toBeGreaterThanOrEqual(12)
      expect(geometry.right, `${route} ${viewport.name} right edge`).toBeLessThanOrEqual(viewport.width - 12)
      expect(Math.max(...geometry.labelOverflow, 0), `${route} ${viewport.name} label overflow`).toBeLessThanOrEqual(1)
      expect(geometry.documentWidth, `${route} ${viewport.name} document overflow`).toBeLessThanOrEqual(viewport.width + 1)
    }
  })
}

test('active PageCompass row uses an icon-only semantic current marker', async ({ page }) => {
  await page.goto('/en/research.html')
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
  await page.locator('.page-compass-trigger').click()

  const activeRow = page.locator('.page-compass-link[aria-current="location"]')
  const marker = activeRow.locator('.page-compass-link-current')
  await expect(activeRow).toHaveCount(1)
  await expect(marker).toHaveAttribute('aria-hidden', 'true')
  await expect(marker).toHaveText('')

  const geometry = await marker.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    const style = getComputedStyle(element)
    return {
      width: rect.width,
      height: rect.height,
      borderRadius: Number.parseFloat(style.borderTopLeftRadius)
    }
  })

  expect(geometry.width).toBeGreaterThanOrEqual(5)
  expect(geometry.width).toBeLessThanOrEqual(7)
  expect(geometry.height).toBeGreaterThanOrEqual(5)
  expect(geometry.height).toBeLessThanOrEqual(7)
  expect(geometry.borderRadius).toBeGreaterThanOrEqual(2.5)
})

test('expanded English PageCompass labels are readable without horizontal overflow', async ({ page }) => {
  await page.goto('/en/research.html')
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')

  await page.locator('.page-compass-trigger').click()

  const labels = page.locator('.page-compass-link-label')

  for (const label of await labels.all()) {
    const geometry = await label.evaluate((element) => ({
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth
    }))

    expect(geometry.scrollWidth)
      .toBeLessThanOrEqual(geometry.clientWidth + 1)
  }
})

test('direct deep links settle below the pinned navigation', async ({ page }) => {
  await page.goto('/works.html#project-fresheye')
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')

  const navigation = page.locator('.site-nav')
  const navBottom = await navigation.evaluate((element) => element.getBoundingClientRect().bottom)
  await expect.poll(
    () => page.locator('#project-fresheye').evaluate((element) => element.getBoundingClientRect().top)
  ).toBeGreaterThanOrEqual(navBottom + 8)
  await expect(page.locator('.page-compass-link[href="#project-fresheye"]')).toHaveAttribute('aria-current', 'location')
})
