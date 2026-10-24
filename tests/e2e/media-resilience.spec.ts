import { expect, test, type Page } from '@playwright/test'
import { resolve, sep } from 'node:path'

type PosterRetryDiagnostics = {
  armed: boolean
  events: Array<Record<string, unknown>>
  mutations: Array<Record<string, unknown>>
  pictureGeneration: number
}

type PosterRetryDiagnosticWindow = Window & { __posterRetryDiagnostics?: PosterRetryDiagnostics }

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

test('poster double failure preserves dimensions and retries the same URLs', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const trace: PosterRetryDiagnostics = { armed: false, events: [], mutations: [], pictureGeneration: 0 }
    const diagnosticWindow = window as PosterRetryDiagnosticWindow
    diagnosticWindow.__posterRetryDiagnostics = trace
    let retryButton: HTMLElement | null = null

    const describe = (target: EventTarget | null) => {
      if (target === document) return '#document'
      if (target === window) return '#window'
      if (!(target instanceof Element)) return target?.constructor?.name ?? 'unknown'
      return `${target.tagName.toLowerCase()}${[...target.classList].map(name => `.${name}`).join('')}`
    }

    const record = (phase: string, event: Event) => {
      if (!trace.armed) return
      retryButton ??= document.querySelector<HTMLElement>('.poster-retry')
      if (!retryButton) return
      const pointer = event as PointerEvent
      const mouse = event as MouseEvent
      const hasPoint = Number.isFinite(mouse.clientX) && Number.isFinite(mouse.clientY)
      const poster = retryButton.closest<HTMLElement>('.concert-poster')
      const rail = document.querySelector<HTMLElement>('#concert-archive-rail')
      const pointTarget = hasPoint ? document.elementFromPoint(mouse.clientX, mouse.clientY) : null
      const rect = (element: Element | null) => {
        if (!element) return null
        const bounds = element.getBoundingClientRect()
        return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
      }
      const revealAncestors = [...document.querySelectorAll<HTMLElement>('.reveal')]
        .filter(element => Boolean(poster && element.contains(poster)))
        .map(element => {
          const style = getComputedStyle(element)
          return {
            immediate: element.dataset.revealImmediate ?? null,
            transitionDelay: style.transitionDelay,
            opacity: style.opacity,
            transform: style.transform,
            revealed: element.classList.contains('revealed')
          }
        })

      trace.events.push({
        at: performance.now(),
        type: event.type,
        phase,
        target: describe(event.target),
        composedPath: event.composedPath().map(describe),
        activeElement: describe(document.activeElement),
        defaultPrevented: event.defaultPrevented,
        pointerId: 'pointerId' in event ? pointer.pointerId : null,
        pointerType: 'pointerType' in event ? pointer.pointerType : null,
        button: 'button' in event ? mouse.button : null,
        key: 'key' in event ? (event as KeyboardEvent).key : null,
        clientX: hasPoint ? mouse.clientX : null,
        clientY: hasPoint ? mouse.clientY : null,
        scrollY: window.scrollY,
        railScrollLeft: rail?.scrollLeft ?? null,
        retryRect: rect(retryButton),
        posterRect: rect(poster),
        pointTarget: hasPoint ? describe(pointTarget) : null,
        pointTargetIsRetry: pointTarget === retryButton,
        revealAncestors
      })
    }

    for (const type of ['pointerdown', 'mousedown', 'focusin', 'pointerup', 'mouseup', 'click']) {
      document.addEventListener(type, event => record('capture', event), true)
      document.addEventListener(type, event => record('bubble', event))
    }
  })
  const firstResponse = deferred()
  let failing = true
  const urls: string[] = []
  const networkEvents: Array<{ type: string, url: string, status?: number, errorText?: string }> = []
  const isTargetUrl = (value: string) => new URL(value).pathname.startsWith('/assets/concerts/thumbs/concert-20261006-fforever.')
  page.on('request', request => {
    if (isTargetUrl(request.url())) networkEvents.push({ type: 'request', url: request.url() })
  })
  page.on('response', response => {
    if (isTargetUrl(response.url())) networkEvents.push({ type: 'response', url: response.url(), status: response.status() })
  })
  page.on('requestfailed', request => {
    if (isTargetUrl(request.url())) networkEvents.push({ type: 'requestfailed', url: request.url(), errorText: request.failure()?.errorText })
  })
  const attachDiagnostics = async (writeToOutput = false) => {
    const browser = await page.evaluate(() => (window as PosterRetryDiagnosticWindow).__posterRetryDiagnostics ?? null)
    const body = JSON.stringify({ browser, requestedUrls: urls, networkEvents }, null, 2)
    if (writeToOutput) console.info(`POSTER_RETRY_ACTIVATION_DIAGNOSTICS_BEGIN\n${body}\nPOSTER_RETRY_ACTIVATION_DIAGNOSTICS_END`)
    await testInfo.attach('poster-retry-activation-diagnostics.json', {
      body,
      contentType: 'application/json'
    })
  }
  await page.route('**/assets/concerts/thumbs/concert-20261006-fforever.*', async route => {
    urls.push(route.request().url())
    if (failing) {
      await firstResponse.promise
      await route.fulfill({ status: 404, headers: { 'cache-control': 'no-store' } })
    } else await route.continue()
  })
  await page.goto('/en/concerts/')
  const poster = page.locator('.concert-poster').filter({
    has: page.locator('.poster-foreground[data-original-src$="concert-20261006-fforever.jpg"]')
  }).first()
  await poster.scrollIntoViewIfNeeded()
  const size = () => poster.evaluate(element => ({ width: element.clientWidth, height: element.clientHeight }))
  const initial = await size()
  firstResponse.release()
  const retry = poster.getByRole('button', { name: 'Retry image', exact: true })
  await expect(retry).toBeVisible()
  const failedSize = await size()
  expect(Math.abs(initial.width - failedSize.width)).toBeLessThanOrEqual(1)
  expect(Math.abs(initial.height - failedSize.height)).toBeLessThanOrEqual(1)
  await expect(poster.getByRole('link', { name: 'Open original image', exact: true })).toHaveAttribute('href', /\/assets\/concerts\/[^/]+\.jpg$/)
  const failedImage = poster.locator('.poster-foreground')
  await expect.poll(() => failedImage.evaluate(element => (element as HTMLImageElement).complete)).toBe(true)
  await expect.poll(() => failedImage.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBe(0)

  await poster.evaluate(element => {
    const trace = (window as PosterRetryDiagnosticWindow).__posterRetryDiagnostics
    if (!trace) throw new Error('Poster retry diagnostics were not installed')
    trace.armed = true
    trace.pictureGeneration = 0
    let picture = element.querySelector('.poster-foreground-layer')
    const revealAncestors = [...document.querySelectorAll<HTMLElement>('.reveal')]
      .filter(ancestor => ancestor.contains(element))
    const observer = new MutationObserver(records => {
      const nextPicture = element.querySelector('.poster-foreground-layer')
      const pictureReplaced = nextPicture !== picture
      if (pictureReplaced) {
        trace.pictureGeneration += 1
        picture = nextPicture
      }
      trace.mutations.push({
        at: performance.now(),
        posterState: element.dataset.posterState,
        pictureReplaced,
        pictureGeneration: trace.pictureGeneration,
        changedAttributes: records
          .filter(record => record.type === 'attributes')
          .map(record => ({ target: (record.target as Element).className, attribute: record.attributeName })),
        revealAncestors: revealAncestors.map(ancestor => ({
          immediate: ancestor.dataset.revealImmediate ?? null,
          transitionDelay: getComputedStyle(ancestor).transitionDelay,
          revealed: ancestor.classList.contains('revealed')
        }))
      })
    })
    observer.observe(element, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['class', 'data-poster-state', 'data-reveal-immediate', 'style']
    })
    for (const ancestor of revealAncestors) {
      observer.observe(ancestor, {
        attributes: true,
        attributeFilter: ['class', 'data-reveal-immediate', 'style']
      })
    }
    trace.mutations.push({ at: performance.now(), marker: 'watching', posterState: element.dataset.posterState })
  })
  const initialPictureGeneration = await page.evaluate(() => (
    (window as PosterRetryDiagnosticWindow).__posterRetryDiagnostics?.pictureGeneration ?? -1
  ))
  const failedRequestCount = urls.length
  failing = false
  try {
    await retry.click()
    await expect.poll(() => page.evaluate(() => (
      (window as PosterRetryDiagnosticWindow).__posterRetryDiagnostics?.pictureGeneration ?? -1
    ))).toBeGreaterThan(initialPictureGeneration)
    await expect.poll(() => urls.length).toBeGreaterThan(failedRequestCount)
    await expect(poster).toHaveAttribute('data-poster-state', 'ready')
  } catch (error) {
    await attachDiagnostics(true)
    throw error
  }
  await attachDiagnostics()
  const readySize = await size()
  expect(Math.abs(initial.width - readySize.width)).toBeLessThanOrEqual(1)
  expect(Math.abs(initial.height - readySize.height)).toBeLessThanOrEqual(1)
  expect(urls.every(url => !new URL(url).search)).toBe(true)
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
