import { expect, test, type Page } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { concerts } from '../../src/data/concerts'

async function gotoMediaFixture(page: Page, query: string) {
  const root = process.env.MEDIA_FIXTURE_ROOT ?? resolve(process.cwd(), 'test-results/media-fixture')
  await page.route('**/media-fixture/**', async route => {
    const relative = new URL(route.request().url()).pathname.slice('/media-fixture/'.length) || 'index.html'
    const file = resolve(root, relative)
    if (!file.startsWith(root + sep)) return route.abort()
    await route.fulfill({ path: file })
  })
  await page.goto('/media-fixture/?' + query, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('html')).toHaveAttribute('data-fixture-ready', 'true')
}

function deferred() {
  let release = () => {}
  const promise = new Promise<void>(resolve => { release = resolve })
  return { promise, release }
}

async function startPosterRetryEventCapture(page: Page) {
  await page.evaluate(() => {
    type RetryDebug = {
      events: Array<Record<string, unknown>>
      mutations: Array<Record<string, unknown>>
      buttonRect: Record<string, number>
    }
    const debugWindow = window as typeof window & { __posterRetryDebug?: RetryDebug }
    const retry = document.querySelector<HTMLButtonElement>('.concert-poster .poster-retry')
    const poster = retry?.closest<HTMLElement>('.concert-poster')
    const card = retry?.closest<HTMLElement>('.concert-rail-card')
    if (!retry || !poster) throw new Error('The poster retry button was not present for event capture')

    const rect = retry.getBoundingClientRect()
    const debug: RetryDebug = {
      events: [],
      mutations: [],
      buttonRect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom }
    }
    debugWindow.__posterRetryDebug = debug

    const describe = (element: Element | null) => element
      ? `${element.tagName.toLowerCase()}${element.id ? '#' + element.id : ''}${element.getAttribute('class') ? '.' + element.getAttribute('class')!.trim().replace(/\s+/gu, '.') : ''}`
      : null
    const record = (event: Event, phase: 'capture' | 'bubble') => {
      const pointer = event as PointerEvent
      const hasPoint = typeof pointer.clientX === 'number' && typeof pointer.clientY === 'number'
      const x = hasPoint ? pointer.clientX : null
      const y = hasPoint ? pointer.clientY : null
      const target = event.target instanceof Element ? event.target : null
      const path = event.composedPath().filter((node): node is Element => node instanceof Element)
      const isInsidePoster = path.includes(poster)
      const isNearRetry = x !== null && y !== null
        && x >= rect.left - 80 && x <= rect.right + 80
        && y >= rect.top - 80 && y <= rect.bottom + 80
      if (event.type !== 'scroll' && !isInsidePoster && !isNearRetry) return
      if (event.type === 'pointermove' && debug.events.filter(entry => entry.type === 'pointermove').length >= 8) return

      const hit = x !== null && y !== null ? document.elementFromPoint(x, y) : null
      const buttonRect = retry.getBoundingClientRect()
      const cardStyle = card ? getComputedStyle(card) : null
      debug.events.push({
        type: event.type,
        phase,
        time: performance.now(),
        trusted: event.isTrusted,
        defaultPrevented: event.defaultPrevented,
        eventPhase: event.eventPhase,
        target: describe(target),
        path: path.slice(0, 6).map(describe),
        hitAtPoint: describe(hit),
        point: x !== null && y !== null ? { x, y } : null,
        pointerType: 'pointerType' in event ? pointer.pointerType : null,
        pointerId: 'pointerId' in event ? pointer.pointerId : null,
        key: 'key' in event ? (event as KeyboardEvent).key : null,
        scrollY: window.scrollY,
        railScrollLeft: retry.closest<HTMLElement>('.concert-archive-rail')?.scrollLeft ?? null,
        activeElement: describe(document.activeElement),
        retryConnected: retry.isConnected,
        retryRect: { left: buttonRect.left, top: buttonRect.top, right: buttonRect.right, bottom: buttonRect.bottom },
        posterState: poster.dataset.posterState,
        requestId: poster.querySelector<HTMLImageElement>('.poster-foreground')?.dataset.requestId ?? null,
        posterTransform: getComputedStyle(poster).transform,
        posterTranslate: getComputedStyle(poster).translate,
        cardRect: card ? (() => {
          const cardRect = card.getBoundingClientRect()
          return { left: cardRect.left, top: cardRect.top, right: cardRect.right, bottom: cardRect.bottom }
        })() : null,
        cardClass: card?.className ?? null,
        cardRevealImmediate: card?.dataset.revealImmediate ?? null,
        cardTransitionDelay: card?.style.transitionDelay ?? null,
        cardOpacity: cardStyle?.opacity ?? null,
        cardTransform: cardStyle?.transform ?? null,
        cardTranslate: cardStyle?.translate ?? null
      })
    }

    for (const type of ['pointerover', 'pointermove', 'pointerdown', 'mousedown', 'focusin', 'pointerup', 'mouseup', 'click', 'pointercancel', 'keydown', 'keyup']) {
      document.addEventListener(type, event => record(event, 'capture'), true)
      document.addEventListener(type, event => record(event, 'bubble'))
    }
    window.addEventListener('scroll', event => record(event, 'capture'), true)

    const observer = new MutationObserver(records => {
      for (const mutation of records) {
        debug.mutations.push({
          time: performance.now(),
          type: mutation.type,
          attributeName: mutation.attributeName,
          target: mutation.target instanceof Element ? describe(mutation.target) : null,
          requestId: poster.querySelector<HTMLImageElement>('.poster-foreground')?.dataset.requestId ?? null,
          posterState: poster.dataset.posterState
        })
      }
    })
    observer.observe(poster, {
      attributes: true,
      attributeFilter: ['data-poster-state', 'data-request-id'],
      childList: true,
      subtree: true
    })
  })
}

async function attachPosterRetryEventCapture(page: Page, scenario: Awaited<ReturnType<typeof preparePosterRetry>>) {
  const pageState = await page.evaluate(() => {
    const debugWindow = window as typeof window & { __posterRetryDebug?: { events: Array<Record<string, unknown>>, mutations: Array<Record<string, unknown>>, buttonRect: Record<string, number> } }
    const poster = document.querySelector<HTMLElement>('.concert-poster')
    const retry = poster?.querySelector<HTMLButtonElement>('.poster-retry')
    const image = poster?.querySelector<HTMLImageElement>('.poster-foreground')
    const rect = retry?.getBoundingClientRect()
    return {
      events: debugWindow.__posterRetryDebug?.events ?? [],
      initialButtonRect: debugWindow.__posterRetryDebug?.buttonRect ?? null,
      final: {
        scrollY: window.scrollY,
        activeElement: document.activeElement instanceof Element ? document.activeElement.tagName.toLowerCase() + '.' + document.activeElement.getAttribute('class') : null,
        posterState: poster?.dataset.posterState ?? null,
        retryConnected: retry?.isConnected ?? false,
        retryRect: rect ? { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom } : null,
        imageSource: image?.currentSrc ?? null,
        imageComplete: image?.complete ?? null,
        imageNaturalWidth: image?.naturalWidth ?? null,
        requestId: image?.dataset.requestId ?? null
      }
    }
  })
  const diagnostic = JSON.stringify({
    ...pageState,
    initialUrls: scenario.initialUrls,
    retryUrls: scenario.retryUrls
  }, null, 2)
  const diagnosticPath = test.info().outputPath('poster-retry-native-events.json')
  await writeFile(diagnosticPath, diagnostic, 'utf8')
  await test.info().attach('poster-retry-native-events.json', {
    path: diagnosticPath,
    contentType: 'application/json'
  })
  return diagnostic
}

const latestConcert = concerts.reduce((latest, concert) => concert.date > latest.date ? concert : latest)
const posterRetryTarget = `**/assets/concerts/thumbs/${latestConcert.poster.file.replace(/\.[^.]+$/, '')}.*`

async function preparePosterRetry(page: Page) {
  const initialResponse = deferred()
  const retryResponse = deferred()
  let acceptingRetry = false
  const initialUrls: string[] = []
  const retryUrls: string[] = []
  await page.route(posterRetryTarget, async route => {
    const url = route.request().url()
    if (!acceptingRetry) {
      initialUrls.push(url)
      await initialResponse.promise
      await route.fulfill({ status: 404, headers: { 'cache-control': 'no-store' } })
      return
    }
    retryUrls.push(url)
    await retryResponse.promise
    await route.continue()
  })
  await page.goto('/en/concerts/')
  const poster = page.locator('.concert-poster').first()
  await poster.scrollIntoViewIfNeeded()
  const initialSize = await poster.evaluate(element => ({ width: element.clientWidth, height: element.clientHeight }))
  initialResponse.release()
  const retry = poster.getByRole('button', { name: 'Retry image', exact: true })
  await expect(retry).toBeVisible()
  const failedImage = poster.locator('.poster-foreground')
  await expect.poll(() => failedImage.evaluate(element => (element as HTMLImageElement).complete)).toBe(true)
  await expect.poll(() => failedImage.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBe(0)
  await expect(failedImage).toHaveAttribute('data-request-id', /^\d+$/)
  const initialRequestId = Number(await failedImage.getAttribute('data-request-id'))
  const failedLayer = await poster.locator('.poster-foreground-layer').elementHandle()
  if (!failedLayer) throw new Error('The failed poster generation was not present')
  const failedSize = await poster.evaluate(element => ({ width: element.clientWidth, height: element.clientHeight }))
  expect(Math.abs(initialSize.width - failedSize.width)).toBeLessThanOrEqual(1)
  expect(Math.abs(initialSize.height - failedSize.height)).toBeLessThanOrEqual(1)
  await expect(poster.getByRole('link', { name: 'Open original image', exact: true })).toHaveAttribute('href', /\/assets\/concerts\/[^/]+\.jpg$/)
  expect(initialUrls.length).toBeGreaterThan(0)

  return {
    poster,
    retry,
    failedLayer,
    initialSize,
    initialRequestId,
    initialUrls,
    retryUrls,
    allowRetry: () => { acceptingRetry = true },
    releaseRetry: () => retryResponse.release()
  }
}

async function activatePosterRetry(
  scenario: Awaited<ReturnType<typeof preparePosterRetry>>,
  page: Page,
  activate: () => Promise<void>,
  pointerMode: 'mouse' | 'touch' | null = null
) {
  if (pointerMode) {
    await scenario.retry.scrollIntoViewIfNeeded()
    await expect.poll(() => page.evaluate(() => new Promise<boolean>((resolve) => {
      let previous = window.scrollY
      let stableFrames = 0
      let checkedFrames = 0
      const check = () => {
        const current = window.scrollY
        stableFrames = current === previous ? stableFrames + 1 : 0
        checkedFrames += 1
        if (stableFrames >= 3) resolve(true)
        else if (checkedFrames >= 120) resolve(false)
        else {
          previous = current
          requestAnimationFrame(check)
        }
      }
      requestAnimationFrame(check)
    }))).toBe(true)
  }
  await startPosterRetryEventCapture(page)
  scenario.allowRetry()
  try {
    await activate()
    if (pointerMode) {
      const eventLog = await page.evaluate(() => {
        const debug = (window as typeof window & { __posterRetryDebug?: { events: Array<Record<string, unknown>> } }).__posterRetryDebug
        return debug?.events ?? []
      })
      const pointerEvents = eventLog.filter(event => event.phase === 'capture' && ['pointerdown', 'pointerup', 'click'].includes(String(event.type)))
      const mouseEvents = eventLog.filter(event => event.phase === 'capture' && ['mousedown', 'mouseup'].includes(String(event.type)))
      expect(pointerEvents.map(event => event.type)).toEqual(['pointerdown', 'pointerup', 'click'])
      expect(pointerEvents.every(event => event.target === 'button.poster-retry')).toBe(true)
      expect(Math.max(...pointerEvents.map(event => Number(event.scrollY))) - Math.min(...pointerEvents.map(event => Number(event.scrollY)))).toBeLessThanOrEqual(1)
      expect(mouseEvents.every(event => event.target === 'button.poster-retry')).toBe(true)
      if (pointerMode === 'mouse') expect(mouseEvents.map(event => event.type)).toEqual(['mousedown', 'mouseup'])
      const mouseDownBubble = eventLog.find(event => event.type === 'mousedown' && event.phase === 'bubble')?.defaultPrevented ?? null
      if (pointerMode === 'mouse') expect(mouseDownBubble).toBe(true)
      else if (mouseDownBubble !== null) expect(mouseDownBubble).toBe(true)
    }
    await expect.poll(
      () => scenario.retryUrls.length,
      { message: 'Retry activation must issue a new target image request before its response is released' }
    ).toBeGreaterThan(0)
    await expect.poll(
      () => scenario.poster.locator('.poster-foreground').getAttribute('data-request-id'),
      { message: 'One retry activation must advance the image request generation exactly once' }
    ).toBe(String(scenario.initialRequestId + 1))
    await expect.poll(
      () => scenario.failedLayer.evaluate(element => element.isConnected),
      { message: 'Retry activation must replace the failed picture generation before image recovery' }
    ).toBe(false)
    await expect(scenario.poster).toHaveAttribute('data-poster-state', 'loading')
    expect(scenario.retryUrls.every(url => scenario.initialUrls.includes(url))).toBe(true)
    expect([...scenario.initialUrls, ...scenario.retryUrls].every(url => new URL(url).search === '')).toBe(true)
  } catch (error) {
    let diagnostic = 'Event capture failed before diagnostic data could be saved.'
    try {
      diagnostic = await attachPosterRetryEventCapture(page, scenario)
    } catch (captureError) {
      diagnostic += ` ${String(captureError)}`
    }
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`${message}\n\nPoster retry native event capture:\n${diagnostic}`, { cause: error })
  } finally {
    scenario.releaseRetry()
  }

  await expect(scenario.poster).toHaveAttribute('data-poster-state', 'ready')
  expect(scenario.retryUrls.slice().sort()).toEqual([...new Set(scenario.initialUrls)].sort())
  await expect(scenario.poster.locator('.poster-foreground')).toHaveAttribute('data-request-id', String(scenario.initialRequestId + 1))
  const readySize = await scenario.poster.evaluate(element => ({ width: element.clientWidth, height: element.clientHeight }))
  expect(Math.abs(scenario.initialSize.width - readySize.width)).toBeLessThanOrEqual(1)
  expect(Math.abs(scenario.initialSize.height - readySize.height)).toBeLessThanOrEqual(1)
}

test('slow poster shows only its delayed static placeholder and then becomes ready', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-22T00:00:00Z') })
  await page.clock.pauseAt(new Date('2026-10-22T00:00:01Z'))
  const gate = deferred()
  await page.route('**/assets/concerts/thumbs/*.webp', async route => {
    const response = await route.fetch()
    await gate.promise
    await route.fulfill({ response })
  })
  await gotoMediaFixture(page, 'view=poster')
  const poster = page.locator('.concert-poster')
  await expect(poster).toHaveAttribute('data-poster-state', 'loading')
  await page.clock.runFor(119)
  await expect(poster.locator('.poster-skeleton')).toHaveCount(0)
  await page.clock.runFor(2)
  await expect(poster.locator('.poster-skeleton')).toBeVisible()
  const status = poster.getByRole('status')
  const open = poster.locator('.poster-open')
  try {
    await expect(status).toHaveText('Loading poster')
    await expect(status).toHaveAttribute('aria-live', 'off')
    await expect(open).toHaveAttribute('aria-describedby', /.+/)
    expect(await open.getAttribute('aria-describedby')).toBe(await status.getAttribute('id'))
  } finally { gate.release() }
  await expect(poster).toHaveAttribute('data-poster-state', 'ready')
  await expect(poster.locator('.poster-skeleton')).toHaveCount(0)
  await expect(status).toHaveCount(0)
  await expect(open).not.toHaveAttribute('aria-describedby', /.+/)
  await page.clock.fastForward(12001)
  await expect(poster).toHaveAttribute('data-poster-state', 'ready')
})

test('poster decode failure uses one JPEG fallback without a retry loop', async ({ page }) => {
  await page.addInitScript(() => {
    const nativeDecode = HTMLImageElement.prototype.decode
    HTMLImageElement.prototype.decode = function () {
      if (this.matches('.poster-foreground') && this.currentSrc.endsWith('.webp')) return Promise.reject(new DOMException('Fixture decode failure', 'EncodingError'))
      return nativeDecode.call(this)
    }
  })
  await gotoMediaFixture(page, 'view=poster')
  const poster = page.locator('.concert-poster')
  await expect(poster).toHaveAttribute('data-poster-state', 'ready')
  await expect.poll(() => poster.locator('.poster-foreground').evaluate(element => (element as HTMLImageElement).currentSrc)).toMatch(/\.jpg$/)
  await expect(poster.locator('.poster-error')).toHaveCount(0)
})

test('poster source changes reject a previous image decode completion', async ({ page }) => {
  await page.addInitScript(() => {
    const nativeDecode = HTMLImageElement.prototype.decode
    const state = globalThis as typeof globalThis & { __releasePosterDecode?: () => void; __oldPosterImage?: HTMLImageElement }
    let heldSource = ''
    let release = () => {}
    const gate = new Promise<void>(resolve => { release = resolve })
    HTMLImageElement.prototype.decode = function () {
      if (this.matches('.poster-foreground')) {
        heldSource ||= this.currentSrc
        if (this.currentSrc === heldSource) {
          state.__releasePosterDecode = release
          state.__oldPosterImage = this
          return gate
        }
      }
      return nativeDecode.call(this)
    }
  })
  await gotoMediaFixture(page, 'view=poster')
  const poster = page.locator('.concert-poster')
  await expect.poll(() => page.evaluate(() => !!(globalThis as typeof globalThis & { __releasePosterDecode?: unknown }).__releasePosterDecode)).toBe(true)
  const oldSource = await poster.locator('.poster-foreground').getAttribute('data-original-src')
  await page.getByRole('button', { name: 'Change poster', exact: true }).click()
  await expect(poster).toHaveAttribute('data-poster-state', 'ready')
  await expect(poster.locator('.poster-foreground')).not.toHaveAttribute('data-original-src', oldSource!)
  await page.evaluate(() => {
    const state = globalThis as typeof globalThis & { __releasePosterDecode?: () => void; __oldPosterImage?: HTMLImageElement }
    state.__releasePosterDecode?.()
    state.__oldPosterImage?.dispatchEvent(new Event('error'))
  })
  await expect(poster).toHaveAttribute('data-poster-state', 'ready')
  await expect.poll(() => poster.locator('.poster-foreground').evaluate(element => (element as HTMLImageElement).currentSrc)).toMatch(/\.webp$/)
})

test('native lazy poster fallback works without IntersectionObserver', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'IntersectionObserver', { value: undefined, configurable: true }) })
  const originals: string[] = []
  page.on('request', request => { if (/\/assets\/concerts\/[^/]+\.jpg$/.test(request.url())) originals.push(request.url()) })
  await gotoMediaFixture(page, 'view=rail&count=16')
  const first = page.locator('.concert-poster').first()
  await expect(first).toHaveAttribute('data-poster-state', 'ready')
  await expect(page.locator('.concert-rail-card')).toHaveCount(16)
  expect(originals).toEqual([])
})

test('a decoded poster remount becomes ready after a native cache warmup', async ({ page }) => {
  await gotoMediaFixture(page, 'view=poster')
  const poster = page.locator('.concert-poster')
  await expect(poster).toHaveAttribute('data-poster-state', 'ready')
  const source = await poster.locator('.poster-foreground').evaluate(element => (element as HTMLImageElement).currentSrc)
  await page.getByRole('button', { name: 'Toggle poster', exact: true }).click()
  await expect(poster).toHaveCount(0)
  await page.unroute('**/media-fixture/**')
  await page.evaluate(async src => {
    const image = new Image()
    image.src = src
    await image.decode()
  }, source)
  await page.getByRole('button', { name: 'Toggle poster', exact: true }).click()
  await expect(poster).toHaveAttribute('data-poster-state', 'ready')
  await expect(poster.locator('.poster-error')).toHaveCount(0)
})

test('rapid lightbox navigation rejects the previous pending image result', async ({ page }) => {
  const gate = deferred()
  await page.route('**/assets/concerts/fixture-*.jpg', async route => {
    if (route.request().url().endsWith('fixture-first.jpg')) await gate.promise
    await route.fulfill({ path: resolve(process.cwd(), 'public/assets/concerts/concert-20251108-kpl-finals.jpg') })
  })
  try {
    await gotoMediaFixture(page, 'view=lightbox')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await page.keyboard.press('ArrowRight')
    await expect(dialog.locator('.lb-meta-index')).toHaveText('2 / 2')
    await expect(dialog.locator('.lb-stage img')).toHaveClass(/loaded/)
    gate.release()
    await expect(dialog.locator('.lb-stage img')).toHaveAttribute('src', '/assets/concerts/fixture-second.jpg')
    await expect(dialog.locator('.lb-stage img')).toHaveClass(/loaded/)
    await expect(dialog.getByRole('alert')).toHaveCount(0)
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
  } finally {
    gate.release()
  }
})

test('poster WebP failure falls back to a decoded JPEG exactly once', async ({ page }) => {
  const requests = new Map<string, number>()
  await page.route('**/assets/concerts/thumbs/*.webp', async route => {
    const url = route.request().url()
    requests.set(url, (requests.get(url) ?? 0) + 1)
    await route.fulfill({ status: 404, headers: { 'cache-control': 'no-store' } })
  })
  await page.goto('/en/concerts/')
  const poster = page.locator('.concert-poster').first()
  await poster.scrollIntoViewIfNeeded()
  const image = poster.locator('.poster-foreground')
  await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).currentSrc)).toMatch(/\.jpg$/)
  expect([...requests.values()].every(count => count <= 2)).toBe(true)
  await expect(poster).toHaveAttribute('data-poster-state', 'ready')
})

test('poster double failure preserves dimensions and retries the same URLs', async ({ page }) => {
  const scenario = await preparePosterRetry(page)
  await activatePosterRetry(scenario, page, () => scenario.retry.click(), 'mouse')
})

test('poster retry supports keyboard Enter activation', async ({ page }) => {
  const scenario = await preparePosterRetry(page)
  await scenario.retry.focus()
  await activatePosterRetry(scenario, page, () => page.keyboard.press('Enter'))
})

test('poster retry supports keyboard Space activation', async ({ page }) => {
  const scenario = await preparePosterRetry(page)
  await scenario.retry.focus()
  await activatePosterRetry(scenario, page, () => page.keyboard.press('Space'))
})

test('poster retry supports touch activation', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.use.hasTouch, 'Touch activation is covered by mobile browser projects')
  const scenario = await preparePosterRetry(page)
  await activatePosterRetry(scenario, page, () => scenario.retry.tap(), 'touch')
})

test('poster deadline ignores a real late image load until the user retries', async ({ page }) => {
  await page.clock.install()
  const responseGate = deferred()
  await page.route('**/assets/concerts/thumbs/*.webp', async route => {
    const response = await route.fetch()
    await responseGate.promise
    await route.fulfill({ response })
  })
  await page.goto('/en/concerts/', { waitUntil: 'domcontentloaded' })
  const poster = page.locator('.concert-poster').first()
  await poster.scrollIntoViewIfNeeded()
  await expect(poster).toHaveAttribute('data-poster-state', 'loading')
  await page.clock.fastForward(12001)
  await expect(poster).toHaveAttribute('data-poster-state', 'error')
  responseGate.release()
  await expect.poll(() => poster.locator('.poster-foreground').evaluate(element => (element as HTMLImageElement).complete)).toBe(true)
  await expect(poster).toHaveAttribute('data-poster-state', 'error')
  await poster.getByRole('button', { name: 'Retry image', exact: true }).click()
  await expect(poster).toHaveAttribute('data-poster-state', 'ready')
})

test('lightbox deadline keeps its caption and rejects a late result until retry', async ({ page }) => {
  await page.clock.install()
  const responseGate = deferred()
  await page.route('**/assets/concerts/*.jpg', async route => {
    const response = await route.fetch()
    await responseGate.promise
    await route.fulfill({ response })
  })
  await page.goto('/en/concerts/')
  await page.locator('.poster-open').first().click()
  const lightbox = page.getByRole('dialog')
  await expect(lightbox).toBeVisible()
  const caption = await lightbox.locator('figcaption').textContent()
  await page.clock.fastForward(10001)
  await expect(lightbox.getByRole('alert')).toBeVisible()
  responseGate.release()
  await expect.poll(() => lightbox.locator('.lb-stage img').evaluate(element => (element as HTMLImageElement).complete)).toBe(true)
  await expect(lightbox.getByRole('alert')).toBeVisible()
  await lightbox.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(lightbox.locator('.lb-stage img')).toHaveClass(/loaded/)
  expect(await lightbox.locator('figcaption').textContent()).toBe(caption)
  await expect(lightbox.getByRole('alert')).toHaveCount(0)
  await expect(page.locator('.site-shell')).toHaveAttribute('inert', '')
  await page.keyboard.press('Escape')
  await expect(lightbox).toHaveCount(0)
  await expect(page.locator('.poster-open').first()).toBeFocused()
})

test('pending page content shows one delayed skeleton then a terminal error', async ({ page }) => {
  await page.clock.install()
  const responseGate = deferred()
  let chunkUrl = ''
  await page.route(/\/assets\/vue\/WorksPage-[^/]+\.js$/, async route => {
    chunkUrl = route.request().url()
    const response = await route.fetch()
    await responseGate.promise
    await route.fulfill({ response })
  })
  try {
    await page.goto('/en/works/#project-fresheye', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'loading')
    await page.clock.fastForward(151)
    await expect(page.locator('.page-content-skeleton')).toBeVisible()
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('.site-footer')).toHaveCount(0)
    await page.clock.fastForward(15000)
    await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'error')
    await expect(page.locator('.page-load-error')).toBeVisible()
    await expect(page.locator('.page-content-skeleton')).toHaveCount(0)
    await expect(page.locator('.site-footer')).toBeVisible()
    await page.getByRole('button', { name: /^Switch to dark theme:/ }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    responseGate.release()
    await page.evaluate(async url => { await import(url) }, chunkUrl)
    await expect(page.locator('.page-load-error')).toBeVisible()
    await expect(page.locator('.page-works')).toHaveCount(0)
  } finally {
    responseGate.release()
  }
})

test('a slow successful page replaces its single delayed skeleton', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-22T00:00:00Z') })
  await page.clock.pauseAt(new Date('2026-10-22T00:00:01Z'))
  const gate = deferred()
  await page.route(/\/assets\/vue\/WorksPage-[^/]+\.js$/, async route => {
    const response = await route.fetch()
    await gate.promise
    await route.fulfill({ response })
  })
  try {
    await page.goto('/en/works/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'loading')
    await expect(page.locator('.page-content-skeleton')).toHaveCount(0)
    await page.clock.runFor(151)
    await expect(page.locator('.page-content-skeleton')).toHaveCount(1)
    gate.release()
    await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
    await expect(page.locator('.page-works')).toBeVisible()
    await expect(page.locator('.page-content-skeleton')).toHaveCount(0)
    await expect(page.locator('.page-load-error')).toHaveCount(0)
    await expect(page.locator('.site-footer')).toBeVisible()
  } finally {
    gate.release()
  }
})

test('rejected page chunks expose one error and leave navigation available', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route(/\/assets\/vue\/WorksPage-[^/]+\.js$/, route => route.abort('failed'))
  await page.goto('/en/works/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.page-load-error')).toHaveCount(1)
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'error')
  await expect(page.locator('.site-footer')).toBeVisible()
  let navigation = page.getByRole('navigation', { name: 'Main navigation', exact: true })
  if (!await navigation.isVisible()) {
    await page.getByRole('button', { name: 'Open navigation', exact: true }).click()
    navigation = page.getByRole('navigation', { name: 'Mobile navigation', exact: true })
  }
  await navigation.locator('a[href="/en/academics/"]').click()
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
  await expect(page.locator('.page-academics')).toBeVisible()
  expect(errors).toEqual([])
})

for (const failure of ['network', 'http'] as const) test('page chunk errors keep the original deep link for a successful reload after ' + failure, async ({ page }) => {
  const chunk = /\/assets\/vue\/WorksPage-[^/]+\.js$/
  await page.route(chunk, route => failure === 'network'
    ? route.abort('failed')
    : route.fulfill({ status: 503, headers: { 'cache-control': 'no-store' }, body: 'Temporary service failure' }))
  await page.goto('/en/works/#project-fresheye', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.page-load-error')).toBeVisible()
  expect(page.url()).toMatch(/\/en\/works\/#project-fresheye$/)
  expect(await page.evaluate(() => scrollY)).toBeLessThanOrEqual(2)
  await page.unroute(chunk)
  await page.getByRole('button', { name: 'Reload page', exact: true }).click()
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
  await expect(page.locator('#project-fresheye')).toBeInViewport()
})

test('a page deadline preserves a newer hash chosen while loading', async ({ page }) => {
  await page.clock.install()
  const gate = deferred()
  const routeSettled = deferred()
  let routeStarted = false
  await page.route(/\/assets\/vue\/WorksPage-[^/]+\.js$/, async route => {
    routeStarted = true
    await gate.promise
    try {
      await route.fulfill({ status: 503, headers: { 'cache-control': 'no-store' }, body: 'Late chunk failure' })
    } finally {
      routeSettled.release()
    }
  })
  try {
    await page.goto('/en/works/#project-fresheye', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'loading')
    const skip = page.getByRole('link', { name: 'Skip to main content', exact: true })
    await skip.focus()
    await expect(skip).toBeFocused()
    await skip.click()
    await expect(page).toHaveURL(/#main$/)
    await page.clock.fastForward(15001)
    await expect(page.locator('.page-load-error')).toBeVisible()
    await expect(page).toHaveURL(/#main$/)
  } finally {
    gate.release()
    if (routeStarted) await routeSettled.promise
  }
})

const emptyCopy = {
  'zh-CN': { works: '作品正在整理中', honors: '这一分类暂时没有记录', concerts: '暂时还没有演唱会记录', home: '精选内容正在整理中' },
  'zh-HK': { works: '作品正在整理中', honors: '這一分類暫時沒有記錄', concerts: '暫時還沒有演唱會記錄', home: '精選內容正在整理中' },
  en: { works: 'Projects are being organized', honors: 'There are no records', concerts: 'There are no concert records', home: 'Selected work is being organized' }
}
for (const locale of ['zh-CN', 'zh-HK', 'en'] as const) {
  for (const view of ['works', 'honors', 'concerts', 'home'] as const) {
    test('empty ' + view + ' shows a real localized state in ' + locale, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await gotoMediaFixture(page, 'view=' + view + '&empty=1&locale=' + locale)
      await expect(page.locator('.archive-empty')).toContainText(emptyCopy[locale][view])
      if (view === 'works') await expect(page.locator('.showcase')).toHaveCount(0)
      if (view === 'honors') {
        await expect(page.locator('.honor-card')).toHaveCount(0)
        await expect(page.locator('.archive-empty button')).toHaveCount(0)
        await expect(page.locator('.metric-card b')).toHaveText(['0', '0', '0', '0'])
      }
      if (view === 'concerts') await expect(page.locator('.concert-rail-controls')).toHaveCount(0)
      if (view === 'home') await expect(page.locator('.home-focus-connector')).toHaveCount(0)
    })
  }
}

test('an empty honors filter offers a working view-all action', async ({ page }) => {
  await gotoMediaFixture(page, 'view=honors&filtered=1')
  await expect(page.locator('.honor-card')).toHaveCount(1)
  await page.getByRole('button').and(page.locator('[data-honor-filter="emerging"]')).click()
  await expect(page.locator('.archive-empty')).toBeVisible()
  await page.getByRole('button', { name: 'View all', exact: true }).click()
  await expect(page.locator('.honor-card')).toHaveCount(1)
  await expect(page.locator('.archive-empty')).toHaveCount(0)
  await expect(page.getByRole('button').and(page.locator('[data-honor-filter="all"]'))).toHaveAttribute('aria-pressed', 'true')
})
