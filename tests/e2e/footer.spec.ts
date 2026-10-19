import { expect, test, type Page } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'

const contacts = [
  { label: '邮箱', href: 'mailto:yance777@outlook.com', value: 'yance777@outlook.com', external: false },
  { label: 'GitHub', href: 'https://github.com/yance7', value: '@yance7', external: true }
] as const

const locales = [
  { name: 'Simplified Chinese', path: '/', homeHref: '/', contactLabel: '联系方式' },
  { name: 'Traditional Chinese', path: '/zh-hk/', homeHref: '/zh-hk/', contactLabel: '聯絡方式' },
  { name: 'English', path: '/en/', homeHref: '/en/', contactLabel: 'Contact' }
] as const

for (const locale of locales) {
  test(`footer exposes the localized two-contact system: ${locale.name}`, async ({ page }) => {
    await page.goto(locale.path)

    const footer = page.locator('footer.site-footer')
    const mark = footer.locator('.foot-mark')
    const contactGrid = footer.locator('.foot-contacts')
    const links = contactGrid.locator('.foot-contact')

    await expect(footer).toBeVisible()
    await expect(mark).toHaveAttribute('href', locale.homeHref)
    await expect(mark.locator('.brand-mark-image')).toBeVisible()
    await expect(footer.locator('.foot-meta p')).toHaveCount(2)
    await expect(footer).not.toContainText('Yance.')
    await expect(contactGrid).toHaveAttribute('aria-label', locale.contactLabel)
    await expect(links).toHaveCount(2)
    await expect(contactGrid.locator('a[href^="https://www.instagram.com/"]')).toHaveCount(0)
    await expect(contactGrid.locator('a[href^="https://x.com/"]')).toHaveCount(0)

    for (const [index, contact] of contacts.entries()) {
      const link = links.nth(index)
      await expect(link).toHaveAttribute('href', contact.href)
      await expect(link).toContainText(contact.value)
      await expect(link.locator('svg')).toHaveAttribute('aria-hidden', 'true')
      await expect(link.locator('svg')).toHaveAttribute('viewBox', '0 0 24 24')
      await expect(link.locator('.foot-contact-arrow')).toHaveText('↗')

      if (contact.external) {
        await expect(link).toHaveAttribute('target', '_blank')
        await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
      } else {
        await expect(link).not.toHaveAttribute('target')
        await expect(link).not.toHaveAttribute('rel')
      }
    }

    await expect(contactGrid.locator('a[href="https://github.com/yance7"]')).toHaveCount(1)
  })
}

for (const width of [320, 390, 768, 1024, 1440]) {
  test(`footer keeps contact hit areas and document geometry at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    const footer = page.locator('footer.site-footer')
    await footer.scrollIntoViewIfNeeded()
    await expect(footer).toBeVisible()

    const geometry = await page.evaluate(() => {
      const grid = document.querySelector('.foot-contacts')!
      const links = Array.from(document.querySelectorAll<HTMLElement>('.foot-contact'))
      const rects = links.map((link) => link.getBoundingClientRect())
      const firstRow = rects.slice(0, 2)
      const svgCount = document.querySelectorAll('.foot-contact svg[aria-hidden="true"]').length
      return {
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        groupWidth: grid.getBoundingClientRect().width,
        firstRowTopDelta: Math.abs(firstRow[0]!.top - firstRow[1]!.top),
        hitAreas: links.map((link) => {
          const rect = link.getBoundingClientRect()
          return { width: rect.width, height: rect.height }
        }),
        rowHeights: rects.map(({ height }) => height),
        svgCount
      }
    })

    expect(geometry.documentWidth, `${width}px footer overflow`).toBeLessThanOrEqual(geometry.viewportWidth)
    expect(geometry.svgCount).toBe(2)
    expect(geometry.hitAreas.every(({ width: hitWidth, height }) => hitWidth >= 44 && height >= 44)).toBe(true)
    if (width >= 768) {
      expect(geometry.firstRowTopDelta, `${width}px contact first row`).toBeLessThanOrEqual(1)
    }
  })
}

async function observeFooterGeometry(page: Page, resize: { width: number; padding: number } | null = null) {
  await page.locator('.site-footer').waitFor({ state: 'attached' })
  return page.evaluateHandle(target => {
    type ResizeEvent = { time: number; wall: number; width: number; trusted: boolean }
    type LayoutSample = { time: number; wall: number; width: number; padding: string; paddingRight: string; trigger: string }
    const footer = document.querySelector<HTMLElement>('.site-footer')!
    const measure = (resizeEvent: ResizeEvent | null = null, layoutObservations: LayoutSample[] = []) => {
      footer.scrollIntoView({ behavior: 'instant', block: 'center' })
      const cards = Array.from(footer.querySelectorAll<HTMLElement>('.foot-contact'), link => {
        const rect = link.getBoundingClientRect()
        const arrow = link.querySelector('.foot-contact-arrow')!.getBoundingClientRect()
        const copy = link.querySelector('.foot-contact-copy')!.getBoundingClientRect()
        const textRanges = [...link.querySelectorAll('.foot-contact-copy > span')].map(span => {
          const range = document.createRange()
          range.selectNodeContents(span)
          return range.getBoundingClientRect()
        })
        return {
          width: rect.width,
          gap: arrow.left - Math.max(...textRanges.map(text => text.right)),
          columnGap: arrow.left - copy.right,
          copyWidth: copy.width,
          containsText: textRanges.every(text => text.left >= rect.left && text.right <= rect.right),
          overflow: link.scrollWidth > link.clientWidth + 1
        }
      })
      const frame = {
        time: performance.now(), wall: Date.now(), width: innerWidth,
        padding: getComputedStyle(footer).paddingLeft,
        paddingRight: getComputedStyle(footer).paddingRight
      }
      return {
        cards,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: innerWidth,
        rendering: {
          timeOrigin: performance.timeOrigin,
          phase: resizeEvent ? 'resize-layout' : 'initial-layout',
          sampledAt: frame,
          layoutObservations: [...layoutObservations],
          resizeEvents: resizeEvent ? [resizeEvent] : []
        }
      }
    }
    // Initial viewports are set before navigation. Their synchronous layout read
    // needs no empty RAFs, which can be seconds apart in a busy WebKit runner.
    const before = measure()
    let cancel = () => {}
    let settled = false
    let event: ResizeEvent | null = null
    const observations: LayoutSample[] = []
    const resized = target === null ? null : new Promise<ReturnType<typeof measure>>((resolve, reject) => {
      const captureIfReady = (trigger: string) => {
        if (settled) return
        try {
          const style = getComputedStyle(footer)
          const sample = {
            time: performance.now(), wall: Date.now(), width: innerWidth,
            padding: style.paddingLeft, paddingRight: style.paddingRight, trigger
          }
          if (observations.length < 20) observations.push(sample)
          // The shared shell uses 5vw padding (16px at this test's 320px
          // viewport with zero emulated safe-area insets). A resize event or
          // fixed frame count can precede that used-value update. Observe it
          // without polling the card gap that the assertions must still test.
          if (!event || sample.width !== target.width
            || parseFloat(sample.padding) !== target.padding || parseFloat(sample.paddingRight) !== target.padding) return
          cancel()
          resolve(measure(event, observations))
        } catch (error) {
          cancel()
          reject(error)
        }
      }
      const observer = new ResizeObserver(() => captureIfReady('resize-observer'))
      const onResize = (nativeEvent: Event) => {
        if (innerWidth !== target.width) return
        event = { time: performance.now(), wall: Date.now(), width: innerWidth, trusted: nativeEvent.isTrusted }
        captureIfReady('resize-event')
      }
      cancel = () => {
        settled = true
        removeEventListener('resize', onResize)
        observer.disconnect()
      }
      observer.observe(footer)
      addEventListener('resize', onResize, { passive: true })
    })
    return { before, resized, cancel: () => cancel(), inspect: () => ({ target, event, observations, settled }) }
  }, resize)
}

type FooterGeometry = Awaited<ReturnType<Awaited<ReturnType<typeof observeFooterGeometry>>['jsonValue']>>['before']
const footerObservations = new WeakMap<Page, {
  handle: Awaited<ReturnType<typeof observeFooterGeometry>>
  startedAt: number
}>()

// The body deadline can cancel browser calls before finally can inspect them.
// afterEach runs before the page fixture closes, so retain and release ownership
// here and record an explicit unavailable reason if the browser already died.
test.afterEach(async ({ page }, info) => {
  const observation = footerObservations.get(page)
  if (!observation) return
  footerObservations.delete(page)
  let state: unknown
  let unavailable: string | undefined
  try {
    state = await observation.handle.evaluate(value => {
      const snapshot = value.inspect()
      value.cancel()
      return snapshot
    })
  } catch (error) {
    unavailable = String(error)
  } finally {
    await observation.handle.dispose().catch(error => { unavailable ??= String(error) })
  }
  if (info.status !== info.expectedStatus || unavailable) {
    const lifecyclePath = info.outputPath('footer-resize-lifecycle.json')
    await mkdir(info.outputDir, { recursive: true })
    await writeFile(lifecyclePath, JSON.stringify({ hostStartedAt: observation.startedAt, hostFinishedAt: Date.now(), state, unavailable }))
    await info.attach('footer-resize-lifecycle', { path: lifecyclePath, contentType: 'application/json' })
  }
  if (unavailable) throw new Error(`Footer observer cleanup unavailable: ${unavailable}`)
})

async function expectContentFittedContacts(geometry: FooterGeometry, label: string, hostStartedAt: number) {
  const { cards } = geometry
  const evidencePath = test.info().outputPath(`footer-geometry-${label.replace(/[^a-z0-9-]/gi, '-')}.json`)
  await mkdir(test.info().outputDir, { recursive: true })
  await writeFile(evidencePath, JSON.stringify({ label, hostStartedAt, hostFinishedAt: Date.now(), ...geometry }))
  await test.info().attach(`footer-geometry-${label}`, {
    path: evidencePath,
    contentType: 'application/json'
  })
  expect(cards).toHaveLength(2)
  for (const card of cards) {
    expect(card.gap, `${label} text-to-arrow gap`).toBeGreaterThanOrEqual(10)
    expect(card.gap, `${label} text-to-arrow gap`).toBeLessThanOrEqual(14)
    expect(card.containsText).toBe(true)
    expect(card.overflow).toBe(false)
  }
  expect(cards[0]!.width, 'short GitHub card does not stretch to match email').toBeGreaterThan(cards[1]!.width + 20)
  expect(geometry.documentWidth <= geometry.viewportWidth).toBe(true)
}

for (const locale of locales) {
  for (const width of [1440, 960, 768, 390, 320]) {
    test(`footer cards fit their actual contact content: ${locale.name} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 })
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto(locale.path)
      await expect(page.locator('html')).toHaveAttribute('data-fonts-ready', 'ready')
      const startedAt = Date.now()
      const observation = await observeFooterGeometry(page)
      try {
        await expectContentFittedContacts(await observation.evaluate(value => value.before), `${locale.name} ${width}px`, startedAt)
      } finally {
        await observation.dispose()
      }
    })
  }

  test(`footer cards retain their content fit after a responsive resize: ${locale.name}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(locale.path)
    await expect(page.locator('html')).toHaveAttribute('data-fonts-ready', 'ready')
    const startedAt = Date.now()
    const observation = await observeFooterGeometry(page, { width: 320, padding: 16 })
    footerObservations.set(page, { handle: observation, startedAt })
    await expectContentFittedContacts(await observation.evaluate(value => value.before), `${locale.name} before resize`, startedAt)
    const resizedAt = Date.now()
    await page.setViewportSize({ width: 320, height: 1000 })
    const resized = await observation.evaluate(value => value.resized!)
    await expectContentFittedContacts(resized, `${locale.name} after resize`, resizedAt)
  })
}

test('footer contact links expose a visible keyboard focus ring', async ({ page }) => {
  await page.goto('/')
  const link = page.locator('.foot-contact').first()
  await link.focus()
  const focusStyle = await link.evaluate((element) => {
    const style = getComputedStyle(element)
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth, boxShadow: style.boxShadow }
  })

  expect(focusStyle.outlineStyle).toBe('solid')
  expect(focusStyle.outlineWidth).not.toBe('0px')
})

test('footer contact feedback is scoped to pointer capabilities', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
  await expect(page.locator('html')).toHaveAttribute('data-fonts-ready', 'ready')
  const link = page.locator('.foot-contact').first()
  const touchLike = await page.evaluate(() => (
    window.matchMedia('(hover: none)').matches || window.matchMedia('(pointer: coarse)').matches
  ))

  if (!touchLike) {
    const contactGrid = page.locator('.foot-contacts')
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto' })
    // Native navigation yields homepage snapping. Capture hover only after
    // the footer's reveal has reached its final geometry.
    await page.keyboard.press('End')
    await expect(contactGrid).toHaveClass(/revealed/)
    await expect(contactGrid).toHaveCSS('transform', 'none')
    await link.scrollIntoViewIfNeeded()
    await expect(link).toBeInViewport()
    await link.hover()
    await expect(link).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, -1)')
    await expect(link.locator('.foot-contact-arrow')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 2, -2)')
  }

  await link.focus()
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  }))
  const focusedTransforms = await link.evaluate((element) => ({
    icon: getComputedStyle(element.querySelector('svg')!).transform,
    arrow: getComputedStyle(element.querySelector<HTMLElement>('.foot-contact-arrow')!).transform
  }))

  if (touchLike) {
    expect(focusedTransforms.icon).toBe('none')
    expect(focusedTransforms.arrow).toBe('none')
  } else {
    expect(focusedTransforms.icon).toBe('matrix(1.04, 0, 0, 1.04, 0, 0)')
    expect(focusedTransforms.arrow).toBe('matrix(1, 0, 0, 1, 2, -2)')
  }
})
