import { expect, test } from '@playwright/test'
import { waitForHydration } from './helpers/hydration'

// Request rendering once, then observe the original CSS and JavaScript cleanup.
// Waiting for a RAF callback can hide cleanup that already met the poll budget.
function expectPreferenceCleanup<T>(page: import('@playwright/test').Page, read: () => Promise<T>) {
  let renderingRequest: Promise<number> | undefined
  return expect.poll(async () => {
    renderingRequest ??= page.evaluate(() => requestAnimationFrame(() => {}))
    await renderingRequest
    return read()
  })
}

test('@pointer-refinement runtime pointer capability changes clear magnetic feedback and restore the native cursor', async ({ page }) => {
  test.skip(!(await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches)), 'fine pointer only')
  // Playwright cannot change pointer/hover media at runtime. Override only these
  // capability values on real MediaQueryList objects and emit their change events.
  await page.addInitScript(() => {
    const original = window.matchMedia.bind(window)
    const lists: MediaQueryList[] = []
    let capable = true
    window.matchMedia = (query) => {
      const media = original(query)
      if (query === '(pointer: fine)' || query === '(hover: hover)') {
        Object.defineProperty(media, 'matches', { get: () => capable })
        lists.push(media)
      }
      return media
    }
    Object.assign(window, {
      setTestPointerCapability: (value: boolean) => {
        capable = value
        for (const media of lists) media.dispatchEvent(new Event('change'))
      }
    })
  })
  await page.goto('/404.html')
  const button = page.locator('.y-button').first()
  const visual = button.locator('.y-button__visual')
  await button.hover({ position: { x: 8, y: 8 } })
  await expect.poll(() => visual.evaluate((element) => element.style.translate)).not.toBe('')
  await page.evaluate(() => (window as Window & { setTestPointerCapability?: (value: boolean) => void }).setTestPointerCapability!(false))
  await expect(page.locator('.sitewide-cursor')).toHaveCount(0)
  await expect(page.locator('html')).not.toHaveClass(/sitewide-cursor-active/)
  await expect.poll(() => visual.evaluate((element) => element.style.translate)).toBe('')
  await page.evaluate(() => (window as Window & { setTestPointerCapability?: (value: boolean) => void }).setTestPointerCapability!(true))
  await button.hover({ position: { x: 12, y: 12 } })
  await expect(page.locator('.sitewide-cursor')).toBeVisible()
  await expect.poll(() => visual.evaluate((element) => element.style.translate)).not.toBe('')
})

test('@pointer-refinement Hero CTA uses a stable inner magnetic layer without moving its hit area', async ({ page }) => {
  await page.goto('/')
  test.skip(!(await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches)), 'fine pointer only')
  await waitForHydration(page)
  await expect(page.locator('.home-hero')).toHaveAttribute('data-intro-state', 'complete')
  const action = page.locator('.hero-action').first()
  const baseline = await action.boundingBox()
  await action.hover({ position: { x: 8, y: 8 } })
  await expect(action.locator('[data-magnetic-visual]')).toBeAttached()
  await expect.poll(() => action.locator('[data-magnetic-visual]').evaluate((element) => element.style.translate)).not.toBe('')
  const hovered = await action.boundingBox()
  expect(hovered?.x).toBeCloseTo(baseline!.x, 1)
  const verticalLift = baseline!.y - hovered!.y
  expect(verticalLift).toBeGreaterThanOrEqual(-0.05)
  expect(verticalLift).toBeLessThanOrEqual(1.05)
  expect(hovered?.width).toBeCloseTo(baseline!.width, 1)
  expect(hovered?.height).toBeCloseTo(baseline!.height, 1)
})

test('@pointer-refinement magnetic buttons keep a stable hit area and bounded visual displacement', async ({ page }) => {
  await page.goto('/404.html')
  test.skip(!(await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches)), 'fine pointer only')
  const button = page.locator('.y-button').first()
  await expect(button).toBeVisible()
  const baseline = await button.boundingBox()
  await button.hover({ position: { x: 8, y: 8 } })
  const visual = button.locator('.y-button__visual')
  await expect(visual).toBeAttached()
  await expect.poll(() => visual.evaluate((element) => element.style.translate)).not.toBe('')
  const offsets = await visual.evaluate((element) => element.style.translate.split(' ').map(Number.parseFloat))
  expect(Math.hypot(...offsets)).toBeLessThanOrEqual(4)
  const hovered = await button.boundingBox()
  expect(hovered?.x).toBeCloseTo(baseline!.x, 1)
  expect(hovered?.y).toBeCloseTo(baseline!.y, 1)
  await page.mouse.move(0, 0)
  await expect.poll(() => visual.evaluate((element) => element.style.translate)).toBe('')
})

test('@pointer-refinement motion directives clear immediately when runtime preferences change', async ({ page }) => {
  await page.goto('/404.html')
  test.skip(!(await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches)), 'fine pointer only')
  const button = page.locator('.y-button').first()
  await button.hover({ position: { x: 8, y: 8 } })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect.poll(() => button.evaluate((element) => element.style.translate)).toBe('')
  await expect.poll(() => button.locator('.y-button__visual').evaluate((element) => element.style.translate)).toBe('')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/works/')
  await page.mouse.move(0, 0)
  const sheen = page.locator('[data-pointer-sheen]').first()
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
  await expect(page.locator('html')).toHaveAttribute('data-fonts-ready', 'ready')
  await sheen.scrollIntoViewIfNeeded()
  await expect(sheen).toHaveClass(/revealed/)
  await expect(sheen).toHaveCSS('transform', 'none')
  await sheen.hover()
  await expect.poll(() => sheen.evaluate((element) => element.style.getPropertyValue('--pointer-active'))).toBe('1')
  await page.emulateMedia({ forcedColors: 'active' })
  await expect.poll(() => page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(true)
  await expectPreferenceCleanup(page, () => sheen.evaluate(element => ({
    active: element.style.getPropertyValue('--pointer-active'),
    height: getComputedStyle(document.querySelector('.pointer-motion-preference-sentinel')!).height
  }))).toEqual({ active: '', height: '2px' })
})

test('@pointer-refinement motion directives clear when native media change notifications are missed', async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.matchMedia.bind(window)
    window.matchMedia = query => {
      const media = original(query)
      if (query === '(prefers-reduced-motion: reduce)' || query === '(forced-colors: active)') {
        media.addEventListener = () => undefined
      }
      return media
    }
    const addListener = Element.prototype.addEventListener
    Element.prototype.addEventListener = function (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) {
      if (type === 'transitionend' && this.classList.contains('pointer-motion-preference-sentinel')) return
      addListener.call(this, type, listener, options)
    }
  })
  await page.goto('/works/')
  test.skip(!(await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches)), 'fine pointer only')
  const sheen = page.locator('[data-pointer-sheen]').first()
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
  await expect(page.locator('html')).toHaveAttribute('data-fonts-ready', 'ready')
  await sheen.scrollIntoViewIfNeeded()
  await expect(sheen).toHaveClass(/revealed/)
  await expect(sheen).toHaveCSS('transform', 'none')
  await sheen.hover()
  await expect.poll(() => sheen.evaluate(element => element.style.getPropertyValue('--pointer-active'))).toBe('1')
  await page.emulateMedia({ forcedColors: 'active' })
  await expect.poll(() => page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(true)
  await expectPreferenceCleanup(page, () => sheen.evaluate(element => ({
    active: element.style.getPropertyValue('--pointer-active'),
    height: getComputedStyle(document.querySelector('.pointer-motion-preference-sentinel')!).height
  }))).toEqual({ active: '', height: '2px' })
  await expect(page.locator('.sitewide-cursor')).toHaveCount(0)
  await expect(page.locator('html')).not.toHaveClass(/sitewide-cursor-active/)
  await page.emulateMedia({ forcedColors: 'none' })
  await expectPreferenceCleanup(page, () => page.evaluate(() => ({
    count: document.querySelectorAll('.sitewide-cursor').length,
    height: getComputedStyle(document.querySelector('.pointer-motion-preference-sentinel')!).height
  }))).toEqual({ count: 1, height: '1px' })
  await sheen.hover({ position: { x: 100, y: 100 } })
  await expect.poll(() => sheen.evaluate(element => element.style.getPropertyValue('--pointer-active'))).toBe('1')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect.poll(() => page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true)
  await expectPreferenceCleanup(page, () => sheen.evaluate(element => ({
    active: element.style.getPropertyValue('--pointer-active'),
    width: getComputedStyle(document.querySelector('.pointer-motion-preference-sentinel')!).width
  }))).toEqual({ active: '', width: '2px' })
})

for (const media of [{ reducedMotion: 'reduce' }, { forcedColors: 'active' }] as const) {
  test(`@pointer-refinement effects clear without animation frames or preference notifications ${JSON.stringify(media)}`, async ({ page }) => {
    await page.addInitScript(() => {
      const requestFrame = requestAnimationFrame.bind(window)
      window.requestAnimationFrame = callback => requestFrame(time => {
        if (!(window as Window & { pausePreferenceFrames?: boolean }).pausePreferenceFrames) callback(time)
      })
      const match = matchMedia.bind(window)
      window.matchMedia = query => {
        const result = match(query)
        if (query === '(prefers-reduced-motion: reduce)' || query === '(forced-colors: active)') {
          result.addEventListener = () => {}
        }
        return result
      }
      const NativeObserver = ResizeObserver
      window.ResizeObserver = class extends NativeObserver {
        constructor(callback: ResizeObserverCallback) {
          super((entries, observer) => {
            const observable = entries.filter(entry => !entry.target.classList.contains('pointer-motion-preference-sentinel'))
            if (observable.length) callback(observable, observer)
          })
        }
      }
    })
    await page.goto('/works/')
    test.skip(!(await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches)), 'fine pointer only')
    await expect(page.locator('html')).toHaveAttribute('data-fonts-ready', 'ready')
    const sheen = page.locator('[data-pointer-sheen]').first()
    await sheen.scrollIntoViewIfNeeded()
    await expect(sheen).toHaveClass(/revealed/)
    await expect(sheen).toHaveCSS('transform', 'none')
    await sheen.hover()
    await expect.poll(() => sheen.evaluate(element => element.style.getPropertyValue('--pointer-active'))).toBe('1')
    // This case exercises the timer fallback independently of the CSS sentinel.
    // Its dimensions can also remain stale while WebKit rendering is stalled.
    await page.addStyleTag({ content: '.pointer-motion-preference-sentinel { width: 1px !important; height: 1px !important; }' })
    try {
      await page.evaluate(() => { (window as Window & { pausePreferenceFrames?: boolean }).pausePreferenceFrames = true })
      await page.emulateMedia(media)
      await expect.poll(() => sheen.evaluate(element => ({
        active: element.style.getPropertyValue('--pointer-active'),
        reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        forcedColors: matchMedia('(forced-colors: active)').matches
      }))).toEqual({ active: '', reducedMotion: 'reducedMotion' in media, forcedColors: 'forcedColors' in media })
      await expect(page.locator('.sitewide-cursor')).toHaveCount(0)
      await expect(page.locator('html')).not.toHaveClass(/sitewide-cursor-active/)
      await page.emulateMedia('reducedMotion' in media ? { reducedMotion: 'no-preference' } : { forcedColors: 'none' })
      await expect.poll(() => page.evaluate(() => ({
        reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        forcedColors: matchMedia('(forced-colors: active)').matches
      }))).toEqual({ reducedMotion: false, forcedColors: false })
      await expect(page.locator('.sitewide-cursor')).toHaveCount(1)
      await expect(page.locator('html')).not.toHaveClass(/sitewide-cursor-active/)
    } finally {
      await page.evaluate(() => {
        ;(window as Window & { pausePreferenceFrames?: boolean }).pausePreferenceFrames = false
        dispatchEvent(new Event('blur'))
      })
    }
  })
}

test('Academics passive rows remain inside layout after pointer emphasis', async ({ page }) => {
  await page.goto('/academics/')
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

test('Academics AP rows emphasize their result without shifting layout', async ({ page }) => {
  await page.goto('/academics/')
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
  await page.goto('/research/')
  await waitForHydration(page)

  const groups = page.locator('.toolchain-group')

  await expect(groups).toHaveCount(3)

  const delays = await groups.evaluateAll((elements) => (
    elements.map((element) => element.style.transitionDelay.split(',')[0])
  ))

  expect(delays).toEqual(['', '60ms', '120ms'])
})

test('Research toolchain groups expose a passive accent without lifting the group', async ({ page }) => {
  await page.goto('/research/')
  await waitForHydration(page)
  const finePointer = await page.evaluate(() => window.matchMedia('(hover: hover) and (pointer: fine)').matches)
  test.skip(!finePointer, 'Hover emphasis is only observable on fine-pointer projects')

  const group = page.locator('.toolchain-group').first()

  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto'
  })
  await group.scrollIntoViewIfNeeded()
  await expect.poll(() => group.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    const headerBottom = document.querySelector('.site-nav')?.getBoundingClientRect().bottom ?? 0
    return rect.top >= headerBottom && rect.bottom <= window.innerHeight
  })).toBe(true)
  await expect(group).toHaveClass(/revealed/)
  await expect(group).toHaveCSS('transform', 'none')
  await group.hover()

  await expect.poll(() => group.evaluate((element) => {
    const hovered = element.matches(':hover')
    const opacity = Number.parseFloat(getComputedStyle(element, '::after').opacity)
    return hovered && opacity > 0
  })).toBe(true)

  const state = await group.evaluate((element) => ({
    content: getComputedStyle(element, '::after').content,
    transform: getComputedStyle(element).transform
  }))

  expect(state.content).not.toBe('none')
  expect(state.transform).toBe('none')
})

test('Research tool tags remain flat information labels on hover', async ({ page }) => {
  await page.goto('/research/')
  await waitForHydration(page)

  const tool = page.locator('.tc-tool').first()

  await tool.hover()

  await expect.poll(() => tool.evaluate((element) => getComputedStyle(element).transform))
    .toBe('none')
})

test('Honor filter controls keep hover-only styling off coarse pointers', async ({ page }) => {
  const coarsePointer = await page.evaluate(() => window.matchMedia('(hover: none), (pointer: coarse)').matches)
  test.skip(!coarsePointer, 'Hover-only styling is only observable on coarse-pointer projects')

  await page.goto('/honors/')
  const filter = page.locator('[data-honor-filter="international"]')
  await expect(filter).toBeVisible()
  await page.mouse.move(0, 0)

  const before = await filter.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      background: style.backgroundColor,
      border: style.borderColor,
      color: style.color,
      boxShadow: style.boxShadow,
      transform: style.transform
    }
  })

  await filter.hover()
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  const after = await filter.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      background: style.backgroundColor,
      border: style.borderColor,
      color: style.color,
      boxShadow: style.boxShadow,
      transform: style.transform
    }
  })

  expect(after).toEqual(before)
})

test('New interaction polish does not introduce motion under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/research/')
  await waitForHydration(page)

  const group = page.locator('.toolchain-group').first()

  await group.hover()
  await expect(group).toBeVisible()

  const pseudoTransition = await group.evaluate((element) => (
    getComputedStyle(element, '::after').transitionDuration
  ))

  expect(['0s', '0.01ms', '1e-05s']).toContain(pseudoTransition)
})

test('reveal content uses the shared fade-up tokens with a bounded stagger', async ({ page }) => {
  await page.goto('/works/')
  await waitForHydration(page)
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
  await expect(page.locator('html')).toHaveAttribute('data-fonts-ready', 'ready')

  const secondProject = page.locator('#project-ap-microeconomics-notes')
  await expect(secondProject).toHaveClass(/reveal/)
  await expect(secondProject).not.toHaveClass(/revealed/)
  // Hydration moves the SSR-visible card back to its hidden reveal state; wait for
  // the fade to finish (opacity string is exactly "0") and for the sub-pixel matrix
  // to settle before sampling the authored tokens.
  await expect.poll(() => secondProject.evaluate((element) => {
    const style = getComputedStyle(element)
    const offset = new DOMMatrixReadOnly(style.transform).m42
    return Math.abs(offset - 16) < 0.5 && style.opacity === '0'
  })).toBe(true)

  const initialMotion = await secondProject.evaluate((element) => {
    const style = getComputedStyle(element)
    const properties = style.transitionProperty.split(',').map((property) => property.trim())
    const durations = style.transitionDuration.split(',').map((duration) => duration.trim())
    const transformDuration = durations[properties.indexOf('transform')] ?? '0s'
    const durationMs = transformDuration.endsWith('ms')
      ? Number.parseFloat(transformDuration)
      : Number.parseFloat(transformDuration) * 1000

    return {
      distance: getComputedStyle(document.documentElement).getPropertyValue('--reveal-distance').trim(),
      offsetY: new DOMMatrixReadOnly(style.transform).m42,
      opacity: Number(style.opacity),
      fadeDuration: durations[properties.indexOf('opacity')],
      durationMs
    }
  })
  expect(initialMotion.distance).toBe('16px')
  // WebKit can report the computed matrix a few thousandths off the authored px.
  expect(initialMotion.offsetY).toBeCloseTo(16, 0)
  expect(initialMotion.opacity).toBe(0)
  expect(initialMotion.fadeDuration).toBe('0.5s')
  expect(initialMotion.durationMs).toBe(500)

  await secondProject.evaluate((element) => {
    element.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'nearest' })
  })
  await expect(secondProject).toHaveClass(/revealed/)
  await expect.poll(() => secondProject.evaluate((element) => getComputedStyle(element).transform)).toBe('none')

  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }))
  await expect.poll(() => secondProject.evaluate((element) => element.classList.contains('revealed'))).toBe(true)

  for (const route of ['/', '/honors/']) {
    await page.goto(route)
    await waitForHydration(page)
    const delays = await page.locator('.reveal').evaluateAll((elements) => elements
      .map((element) => element.style.transitionDelay)
      .filter(Boolean)
      .map((value) => Number.parseFloat(value)))
    expect(delays.every((delay) => delay <= 180)).toBe(true)
  }
})

test('page titles and section headings use the tightened entrance values', async ({ page }) => {
  await page.goto('/honors/')
  await waitForHydration(page)
  const titleMotion = await page.locator('.hero-title.hero-lyric').evaluate((element) => {
    const style = getComputedStyle(element)
    return { name: style.animationName, duration: style.animationDuration }
  })
  expect(titleMotion.name).toBe('hero-title-rise')
  expect(Number.parseFloat(titleMotion.duration)).toBeCloseTo(0.56, 3)

  await page.goto('/')
  await waitForHydration(page)
  const head = page.locator('.reveal.section-head').first()
  await expect(head).toHaveClass(/reveal/)
  const headMotion = await head.evaluate((element) => {
    const style = getComputedStyle(element)
    const properties = style.transitionProperty.split(',').map((property) => property.trim())
    const durations = style.transitionDuration.split(',').map((duration) => duration.trim())
    return {
      distance: style.getPropertyValue('--reveal-distance').trim(),
      transformDuration: durations[properties.indexOf('transform')] ?? '0s'
    }
  })
  expect(headMotion.distance).toBe('10px')
  expect(Number.parseFloat(headMotion.transformDuration)).toBeCloseTo(0.36, 3)
})

test('Chinese archive titles stay readable on the first frame and rise once as a group', async ({ page }) => {
  const cases = [
    { route: '/research/', width: 1280 },
    { route: '/works/', width: 1280 },
    { route: '/zh-hk/research/', width: 1280 },
    { route: '/works/', width: 390 }
  ] as const

  for (const item of cases) {
    await page.setViewportSize({ width: item.width, height: item.width === 390 ? 844 : 720 })
    await page.goto(item.route)
    await waitForHydration(page)

    const title = page.locator('h1.hero-title.hero-lyric')
    await expect(title).toHaveCount(1)
    const characters = title.locator('.lyric-char')
    await expect(characters.first()).toHaveCSS('animation-name', 'none')
    await expect(characters.first()).toHaveCSS('opacity', '1')
    const lastCharacter = characters.last()
    const visible = await lastCharacter.evaluate((element) => {
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return style.visibility === 'visible' && Number(style.opacity) === 1 && rect.width > 0 && rect.height > 0
    })
    expect(visible, `${item.route} last glyph visible at ${item.width}px`).toBe(true)

    const initial = await title.evaluate((element) => {
      const animations = element.getAnimations().filter((animation) => (
        (animation as CSSAnimation).animationName === 'hero-title-rise'
      ))
      if (!animations.length) throw new Error('Missing hero-title-rise animation')
      for (const animation of animations) {
        animation.pause()
        animation.currentTime = 0
      }
      const style = getComputedStyle(element)
      return { offset: new DOMMatrixReadOnly(style.transform).m42, opacity: Number(style.opacity) }
    })
    expect(initial.opacity, `${item.route} title readable at the first frame`).toBe(1)
    expect(initial.offset, `${item.route} title starts with a short rise`).toBeGreaterThan(2)

    await title.evaluate((element) => {
      element.getAnimations().forEach((animation) => animation.play())
    })
    await expect.poll(() => title.evaluate((element) => {
      const transform = getComputedStyle(element).transform
      return transform === 'none' || transform === 'matrix(1, 0, 0, 1, 0, 0)'
    })).toBe(true)
    await expect(lastCharacter).toHaveCSS('opacity', '1')
  }
})

test('reduced motion keeps Chinese archive titles readable without a rise', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/research/')
  await waitForHydration(page)

  const title = page.locator('h1.hero-title.hero-lyric')
  await expect(title).toHaveCSS('animation-name', 'none')
  await expect(title).toHaveCSS('transform', 'none')
  await expect(title.locator('.lyric-char').last()).toHaveCSS('opacity', '1')
})

test('Chinese archive titles stay readable when the entry bundle is delayed', async ({ page }) => {
  await page.route(/\/assets\/vue\/main-[^/]+\.js$/u, (route) => route.abort())
  await page.goto('/zh-hk/research/', { waitUntil: 'domcontentloaded' })

  const title = page.locator('h1.hero-title.hero-lyric')
  await expect(title).toContainText('不完美')
  await expect(title.locator('.lyric-char').last()).toHaveCSS('visibility', 'visible')
  await expect(title.locator('.lyric-char').last()).toHaveCSS('opacity', '1')
})

test('English concerts keeps one heading, epigraph, and credit after takeover', async ({ page }) => {
  await page.goto('/en/concerts/')
  await waitForHydration(page)

  await expect(page.locator('h1')).toHaveCount(1)
  await expect(page.locator('h1')).toHaveText('Concerts')
  await expect(page.locator('.hero-epigraph')).toHaveText('Fate brought us together beyond this restless world')
  await expect(page.locator('.lyric-credit')).toContainText('G.E.M.')
  await expect(page.locator('.lyric-credit')).toContainText('「光年之外」')
})

test('reduced motion completes every reveal immediately', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/research/')
  await waitForHydration(page)

  await expect.poll(() => page.locator('.reveal').count()).toBeGreaterThan(0)
  await expect.poll(() => page.locator('.reveal:not(.revealed)').count()).toBe(0)
  const states = await page.locator('.reveal').evaluateAll((elements) => elements.map((element) => {
    const style = getComputedStyle(element)
    const toMilliseconds = (duration: string) => {
      const value = Number.parseFloat(duration)
      return duration.trim().endsWith('ms') ? value : value * 1000
    }

    return {
      opacity: Number.parseFloat(style.opacity),
      transform: style.transform,
      transformIsIdentity: style.transform === 'none' || new DOMMatrixReadOnly(style.transform).isIdentity,
      transitionDuration: style.transitionDuration.split(',').map(toMilliseconds),
      transitionDelay: style.transitionDelay.split(',').map(toMilliseconds)
    }
  }))
  expect(states.every(({ opacity, transformIsIdentity, transitionDuration, transitionDelay }) => (
    opacity === 1
      && transformIsIdentity
      && transitionDuration.every((duration) => duration <= 0.01)
      && transitionDelay.every((delay) => delay === 0)
  )), JSON.stringify(states)).toBe(true)
})

test('card hover composes with a running reveal without replacing its offset', async ({ page }) => {
  test.skip(!(await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches)), 'fine pointer only')
  await page.goto('/works/')
  await waitForHydration(page)
  await expect(page.locator('html')).toHaveAttribute('data-fonts-ready', 'ready')
  const card = page.locator('#project-ap-microeconomics-notes')
  await expect(card).not.toHaveClass(/revealed/)
  await expect.poll(() => card.evaluate(element => new DOMMatrixReadOnly(getComputedStyle(element).transform).m42)).toBe(16)
  const offset = await card.evaluate(element => new Promise<number>((resolve, reject) => {
    // A queued transitionrun event can arrive after a 500ms transition finishes
    // on a busy browser. Observe the real reveal class mutation in its microtask
    // and pause the original CSS transition before the next painting opportunity.
    const observer = new MutationObserver(() => {
      if (!element.classList.contains('revealed')) return
      observer.disconnect()
      const transition = element.getAnimations().find(animation => (
        'transitionProperty' in animation && animation.transitionProperty === 'transform'
      ))
      if (!transition) {
        reject(new Error('Expected the CSS transform transition at reveal start'))
        return
      }
      transition.pause()
      transition.currentTime = 250
      resolve(new DOMMatrixReadOnly(getComputedStyle(element).transform).m42)
    })
    observer.observe(element, { attributes: true, attributeFilter: ['class'] })
    element.scrollIntoView({ block: 'center', behavior: 'instant' })
  }))
  expect(offset).toBeGreaterThan(0)
  await card.hover()
  await expect.poll(() => card.evaluate(element => element.matches(':hover'))).toBe(true)
  await expect.poll(() => card.evaluate(element => getComputedStyle(element).translate)).toBe('0px -2px')
  expect(await card.evaluate(element => new DOMMatrixReadOnly(getComputedStyle(element).transform).m42)).toBeCloseTo(offset, 2)
  await card.evaluate(element => element.getAnimations().forEach(animation => animation.finish()))
  await expect(card).toHaveCSS('opacity', '1')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(card).toHaveCSS('translate', 'none')
  await expect(card).toHaveCSS('transform', 'none')
})

test('AP rows and method groups enter without an animated parent displacement', async ({ page }) => {
  for (const [route, panel, child] of [
    ['/academics/', '.ap-panel', '.ap-row'],
    ['/research/', '.toolchain-panel', '.toolchain-group']
  ]) {
    await page.goto(route!)
    await expect(page.locator(panel!)).not.toHaveClass(/reveal/)
    await expect(page.locator(child!).first()).toHaveClass(/reveal/)
    const motion = await page.locator(child!).last().evaluate(element => {
      const style = getComputedStyle(element)
      return { properties: style.transitionProperty.split(',').map(value => value.trim()), durations: style.transitionDuration.split(',').map(value => value.trim()) }
    })
    for (const property of ['opacity', 'transform']) {
      expect(motion.durations[motion.properties.indexOf(property)]).toBe('0.5s')
    }
  }
})

test('theme controls use bounded transitions for state changes', async ({ page }) => {
  await page.goto('/en/')

  const durations = await page.locator('.theme-orbit, .orbit-knob').evaluateAll((elements) => (
    elements.map((element) => getComputedStyle(element).transitionDuration)
  ))
  const milliseconds = durations.map((duration) => (
    duration.endsWith('ms') ? Number.parseFloat(duration) : Number.parseFloat(duration) * 1000
  ))

  expect(milliseconds.every((duration) => duration >= 180 && duration <= 320), JSON.stringify(durations)).toBe(true)
})

test('interactive button feedback stays inside the 160–220ms budget', async ({ page }) => {
  test.skip(!(await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches)), 'fine pointer only')
  for (const [route, selector] of [
    ['/404.html', '.y-button'],
    ['/honors/', '.filter-btn'],
    ['/research/', '.method-toggle, .tl-link'],
    ['/', '.hero-action__visual']
  ]) {
    await page.goto(route!)
    const control = page.locator(selector!).first()
    await expect(control).toBeAttached()
    const durations = await page.locator(selector!).evaluateAll(elements => elements.flatMap(element => getComputedStyle(element).transitionDuration.split(',').map(value => Number.parseFloat(value) * (value.trim().endsWith('ms') ? 1 : 1000))))
    expect(durations.every(value => value >= 160 && value <= 220), `${route}: ${durations}`).toBe(true)
  }
})

test('disabled rail buttons keep their passive appearance on hover', async ({ page }) => {
  test.skip(!(await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches)), 'fine pointer only')
  await page.goto('/concerts/')
  const previous = page.locator('[data-rail-direction="previous"]')
  await expect(previous).toBeDisabled()
  await previous.hover()
  const feedback = await previous.evaluate(element => {
    const style = getComputedStyle(element)
    return { animations: element.getAnimations().length, transform: style.transform }
  })
  expect(feedback.animations).toBe(0)
  expect(feedback.transform).toBe('none')
})

test('mobile menu close control uses a bounded hover transition', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/en/')

  await page.locator('.menu-trigger').click()
  const close = page.locator('.mobile-menu-close')
  await expect(close).toBeVisible()

  const duration = await close.evaluate((element) => getComputedStyle(element).transitionDuration)
  const milliseconds = duration.endsWith('ms') ? Number.parseFloat(duration) : Number.parseFloat(duration) * 1000
  expect(milliseconds, duration).toBeGreaterThanOrEqual(180)
  expect(milliseconds, duration).toBeLessThanOrEqual(320)
})

test('reduced motion removes delayed mobile menu entry motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/en/')

  await page.locator('.menu-trigger').click()
  const delays = await page.locator('.mobile-menu a').evaluateAll((elements) => (
    elements.map((element) => getComputedStyle(element).animationDelay)
  ))

  expect(delays.every((delay) => delay === '0s'), JSON.stringify(delays)).toBe(true)
})

test('quick hash navigation reveals the targeted Works project', async ({ page }) => {
  await page.goto('/works/#project-ap-microeconomics-notes', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('html')).toHaveAttribute('data-fonts-ready', 'ready')

  const target = page.locator('#project-ap-microeconomics-notes')
  await expect(target).toHaveClass(/revealed/)
  await expect.poll(() => target.evaluate((element) => Number.parseFloat(getComputedStyle(element).opacity))).toBe(1)
  await expect.poll(() => target.evaluate((element) => getComputedStyle(element).transform)).toBe('none')
})

test('main titles rise once without hiding their content', async ({ page }) => {
  const settled = (element: Element) => {
    const transform = getComputedStyle(element).transform
    return transform === 'none' || transform === 'matrix(1, 0, 0, 1, 0, 0)'
  }
  await page.goto('/en/honors/')
  await waitForHydration(page)

  const heading = page.locator('h1.hero-title')
  await expect(heading).toHaveCSS('animation-name', 'hero-title-rise')
  await expect(heading).toHaveCSS('animation-iteration-count', '1')
  await expect(heading).toHaveCSS('opacity', '1')
  await expect.poll(() => heading.evaluate(settled)).toBe(true)

  await page.goto('/')
  await waitForHydration(page)
  const heroCopy = page.locator('.home-hero-typewriter')
  await expect(heroCopy).toHaveCSS('animation-name', 'home-title-rise')
  await expect(heroCopy).toHaveCSS('opacity', '1')
  await expect.poll(() => heroCopy.evaluate(settled)).toBe(true)
})

test('reduced motion removes the title rise', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/en/honors/')
  await waitForHydration(page)

  const heading = page.locator('h1.hero-title')
  await expect(heading).toHaveCSS('animation-name', 'none')
  await expect(heading).toHaveCSS('transform', 'none')

  await page.goto('/')
  await waitForHydration(page)
  await expect(page.locator('.home-hero-typewriter')).toHaveCSS('animation-name', 'none')
})

test('hash arrival keeps the archive heading and epigraph readable', async ({ page }) => {
  await page.goto('/en/research/#fishfreshnet-v2', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('html')).toHaveAttribute('data-fonts-ready', 'ready')

  const heading = page.locator('h1.hero-title')
  await expect(heading).toHaveText('Research')
  await expect(heading).toHaveCSS('opacity', '1')
  await expect(page.locator('.hero-epigraph')).toHaveText('You share this imperfect dream with me')

  const target = page.locator('#fishfreshnet-v2')
  await expect(target).toHaveClass(/revealed/)
  await expect.poll(() => target.evaluate((element) => Number.parseFloat(getComputedStyle(element).opacity))).toBe(1)
  await expect.poll(() => target.evaluate((element) => getComputedStyle(element).transform)).toBe('none')
})

test('scrolling to the document end reveals the footer and all remaining content', async ({ page }) => {
  await page.goto('/concerts/')

  await page.locator('.site-footer').scrollIntoViewIfNeeded()
  await expect(page.locator('.site-footer')).toBeVisible()
  await expect.poll(() => page.locator('.reveal:not(.revealed)').count()).toBe(0)
})
