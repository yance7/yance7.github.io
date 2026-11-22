import { test, expect } from '@playwright/test'

test.afterEach(async ({ page }) => {
  await page.evaluate(() => {
    document.querySelectorAll<HTMLVideoElement>('video').forEach(video => {
      video.pause()
      video.removeAttribute('src')
      video.load()
    })
  }).catch(() => undefined)
})

test('leaving the viewport during an unfinished media request retains the source and resumes', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'WebKit media requests bypass Playwright routing in this environment')
  let release!: () => void
  let requested!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  const requestStarted = new Promise<void>(resolve => { requested = resolve })
  await page.addInitScript(() => {
    const load = HTMLMediaElement.prototype.load
    HTMLMediaElement.prototype.load = function () {
      if (this.dataset.src?.endsWith('/maize.mp4')) this.dataset.loadCalls = String(Number(this.dataset.loadCalls || 0) + 1)
      return load.call(this)
    }
  })
  await page.route('**/assets/videos/home-projects/maize.mp4', async route => {
    requested()
    await gate
    await route.continue()
  })
  try {
    await page.goto('/')
    const video = page.locator('.home-project-video video').first()
    await video.scrollIntoViewIfNeeded()
    await requestStarted
    await expect(video).toHaveJSProperty('paused', false)
    expect(await video.evaluate((v: HTMLVideoElement) => v.readyState)).toBe(0)
    const source = await video.getAttribute('src')
    const calls = await video.getAttribute('data-load-calls')
    await page.evaluate(() => window.scrollTo(0, 0))
    await expect(video).toHaveJSProperty('paused', true)
    await expect(video).toHaveAttribute('src', source!)
    await expect(video).toHaveAttribute('data-load-calls', calls!)
    await video.scrollIntoViewIfNeeded()
    release()
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime), { timeout: 15000 }).toBeGreaterThan(0)
    await expect(video).toHaveAttribute('data-load-calls', calls!)
  } finally { release() }
})

test('a stale rejected play promise cannot reset a newer playback', async ({ page }) => {
  await page.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play
    let rejectOld: ((error: DOMException) => void) | undefined
    let intercepted = false
    HTMLMediaElement.prototype.play = function () {
      if (this.dataset.src?.endsWith('/maize.mp4') && !intercepted) {
        intercepted = true
        return new Promise<void>((_, reject) => { rejectOld = reject })
      }
      if (this.dataset.src?.endsWith('/maize.mp4') && rejectOld) {
        const pending = rejectOld
        rejectOld = undefined
        const result = play.call(this)
        queueMicrotask(() => pending(new DOMException('Old play was interrupted', 'NotAllowedError')))
        return result
      }
      return play.call(this)
    }
  })
  await page.goto('/')
  const video = page.locator('.home-project-video video').first()
  await video.scrollIntoViewIfNeeded()
  await expect(video).toHaveAttribute('src', /maize\.mp4$/)
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    document.dispatchEvent(new Event('visibilitychange'))
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0)
  await expect(video).toHaveAttribute('src', /maize\.mp4$/)
})

test('hydration preserves selected work position without video playback controls', async ({ page }) => {
  let release!: () => void
  let requested!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  const entryRequested = new Promise<void>(resolve => { requested = resolve })
  await page.route(/\/assets\/vue\/main-[^/]+\.js$/u, async route => { requested(); await gate; await route.continue() })
  try {
    await page.goto('/', { waitUntil: 'commit' })
    await entryRequested
    await page.locator('#selected-work').scrollIntoViewIfNeeded()
    await page.evaluate(() => document.fonts.ready)
    const measure = () => page.evaluate(() => {
      const rail = document.querySelector('.home-projects__rail')!.getBoundingClientRect()
      const section = document.querySelector('.home-projects')!.getBoundingClientRect()
      const selected = document.querySelector('#selected-work')!.getBoundingClientRect()
      return { railHeight: rail.height, controlHeight: section.bottom - rail.bottom, selectedTop: selected.top + scrollY }
    })
    const before = await measure()
    release()
    await expect(page.locator('body')).toHaveAttribute('data-hydrated', 'true')
    await expect(page.locator('.home-projects button')).toHaveCount(0)
    await expect(page.locator('.home-projects__controls')).toHaveCount(0)
    const after = await measure()
    expect(Math.abs(after.railHeight - before.railHeight)).toBeLessThanOrEqual(2)
    expect(Math.abs(after.controlHeight)).toBeLessThanOrEqual(1)
    expect(Math.abs(after.selectedTop - before.selectedTop)).toBeLessThanOrEqual(2)
  } finally { release() }
})

test('video cards use the shared card radius and a slim aligned caption bar', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/')
  const geometry = await page.evaluate(() => {
    const particles = getComputedStyle(document.querySelector('.home-hero-particles')!)
    const slideshowMedia = getComputedStyle(document.querySelector('.home-hero-slideshow__media')!)
    const cards = Array.from(document.querySelectorAll<HTMLElement>('.home-project-video')).map(card => {
      const cardRect = card.getBoundingClientRect()
      const caption = card.querySelector<HTMLElement>('.home-project-video__caption')!
      const label = caption.querySelector<HTMLElement>('span')!
      const link = caption.querySelector<HTMLAnchorElement>('a')!
      const captionRect = caption.getBoundingClientRect()
      const labelRect = label.getBoundingClientRect()
      const linkRect = link.getBoundingClientRect()
      return {
        radius: getComputedStyle(card).borderRadius,
        captionHeight: captionRect.height,
        labelBottomInset: cardRect.bottom - labelRect.bottom,
        centerDelta: Math.abs((labelRect.top + labelRect.height / 2) - (linkRect.top + linkRect.height / 2)),
        arrow: link.textContent?.trim()
      }
    })
    return {
      particlesRadius: particles.borderRadius,
      slideshowMediaRadius: slideshowMedia.borderRadius,
      cards
    }
  })
  expect(geometry.particlesRadius).toBe('14px')
  expect(geometry.slideshowMediaRadius).toBe('13px')
  for (const card of geometry.cards) {
    expect(card.radius).toBe('14px')
    expect(card.captionHeight).toBeLessThanOrEqual(40)
    expect(card.labelBottomInset).toBeLessThanOrEqual(14)
    expect(card.centerDelta).toBeLessThanOrEqual(1.5)
    expect(card.arrow).toBe('→')
  }
})

test('1024px shows all three aligned cards without horizontal scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 })
  await page.goto('/')
  const boxes = await page.locator('.home-project-video').evaluateAll(cards => cards.map(card => {
    const r = card.getBoundingClientRect(); return { x: r.x, right: r.right, width: r.width, height: r.height }
  }))
  const photo = (await page.locator('.home-hero-visual').boundingBox())!
  expect(Math.abs(boxes[0]!.x - photo.x)).toBeLessThanOrEqual(2)
  expect(Math.abs(boxes[2]!.right - photo.x - photo.width)).toBeLessThanOrEqual(2)
  for (const box of boxes) expect(Math.abs(box.width / box.height - 10 / 7)).toBeLessThan(.02)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('home project videos align with the photo and link to localized entries', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/en/')
  const photo = await page.locator('.home-hero-visual').boundingBox()
  const cards = page.locator('.home-project-video')
  await expect(cards).toHaveCount(3)
  const first = await cards.nth(0).boundingBox()
  const last = await cards.nth(2).boundingBox()
  expect(Math.abs(first!.x - photo!.x)).toBeLessThanOrEqual(2)
  expect(Math.abs(last!.x + last!.width - photo!.x - photo!.width)).toBeLessThanOrEqual(2)
  await expect(cards.nth(0).locator('a')).toHaveAttribute('href', '/en/research/#corn-growth')
  await expect(cards.nth(1).locator('a')).toHaveAttribute('href', '/en/research/#fishfreshnet-v1')
  await expect(cards.nth(2).locator('a')).toHaveAttribute('href', '/en/works/#project-fresheye')
})

test('videos load only when visible and pause when scrolled out or hidden', async ({ page }) => {
  const requests: string[] = []
  page.on('request', request => { if (request.url().endsWith('.mp4')) requests.push(request.url()) })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  expect(requests).toHaveLength(0)
  const rail = page.locator('.home-projects__rail')
  await rail.scrollIntoViewIfNeeded()
  const video = page.locator('.home-project-video video').first()
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0)
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(video).toHaveJSProperty('paused', true)
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(video).toHaveJSProperty('paused', false)
})

test('reduced motion and disabled JavaScript retain posters and clickable links', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, reducedMotion: 'reduce' })
  const page = await context.newPage()
  await page.goto('/en/')
  await expect(page.locator('.home-project-video video[poster]')).toHaveCount(3)
  await expect(page.locator('.home-project-video a')).toHaveCount(3)
  await page.locator('.home-project-video a').first().click()
  await expect(page).toHaveURL(/\/en\/research\/#corn-growth$/)
  await context.close()
})

test('mobile rail scrolls to the last card without page overflow', async ({ page }) => {
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/')
    const rail = page.locator('.home-projects__rail')
    const last = page.locator('.home-project-video a').last()
    await last.focus()
    await expect.poll(() => rail.evaluate(element => element.scrollLeft)).toBeGreaterThan(0)
    const geometry = await last.evaluate(element => {
      const link = element.getBoundingClientRect()
      const parent = element.closest('.home-projects__rail')!.getBoundingClientRect()
      return { visible: link.right <= parent.right + 1, overflow: document.documentElement.scrollWidth > innerWidth }
    })
    expect(geometry).toEqual({ visible: true, overflow: false })
  }
})

test('mobile rail pauses an offscreen video and plays the visible card', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const videos = page.locator('.home-project-video video')
  await videos.first().scrollIntoViewIfNeeded()
  await expect.poll(() => videos.first().evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0)
  await page.locator('.home-project-video a').last().focus()
  await expect(videos.first()).toHaveJSProperty('paused', true)
  await expect.poll(() => videos.last().evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0)
})

test('rapidly leaving and returning resumes the same media source', async ({ page }) => {
  await page.goto('/')
  const video = page.locator('.home-project-video video').first()
  await video.scrollIntoViewIfNeeded()
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0)
  const source = await video.getAttribute('src')
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(video).toHaveJSProperty('paused', true)
  await video.scrollIntoViewIfNeeded()
  await expect(video).toHaveJSProperty('paused', false)
  await expect(video).toHaveAttribute('src', source!)
})

const localeMatrix = [
  {
    prefix: '',
    locale: '简中',
    entries: [
      { index: 0, name: '玉米', label: '查看 玉米 项目', route: 'research', hash: 'corn-growth' },
      { index: 1, name: 'FishFreshNet', label: '查看 FishFreshNet 项目', route: 'research', hash: 'fishfreshnet-v1' },
      { index: 2, name: '鲜眸', label: '查看 鲜眸 项目', route: 'works', hash: 'project-fresheye' }
    ]
  },
  {
    prefix: '/zh-hk',
    locale: '繁中',
    entries: [
      { index: 0, name: '玉米', label: '查看 玉米 項目', route: 'research', hash: 'corn-growth' },
      { index: 1, name: 'FishFreshNet', label: '查看 FishFreshNet 項目', route: 'research', hash: 'fishfreshnet-v1' },
      { index: 2, name: '鮮眸', label: '查看 鮮眸 項目', route: 'works', hash: 'project-fresheye' }
    ]
  },
  {
    prefix: '/en',
    locale: 'English',
    entries: [
      { index: 0, name: 'Maize', label: 'View Maize project', route: 'research', hash: 'corn-growth' },
      { index: 1, name: 'FishFreshNet', label: 'View FishFreshNet project', route: 'research', hash: 'fishfreshnet-v1' },
      { index: 2, name: 'FreshEye', label: 'View FreshEye project', route: 'works', hash: 'project-fresheye' }
    ]
  }
] as const

for (const { prefix, locale, entries } of localeMatrix) {
  for (const { index, name, label, route, hash } of entries) {
    test(`${locale} project ${hash} renders localized name and opens its specific entry`, async ({ page }) => {
      await page.goto(`${prefix}/`)
      await expect(page.locator('body')).toHaveAttribute('data-hydrated', 'true')
      const card = page.locator('.home-project-video').nth(index)
      await expect(card.locator('span')).toHaveText(name)
      const link = card.locator('a')
      await expect(link).toHaveText('→')
      await expect(link).toHaveAttribute('aria-label', label)
      await link.click()
      await expect(page).toHaveURL(new RegExp(`${prefix}/${route}/#${hash}$`))
      const target = page.locator(`#${hash}`)
      await expect(target).toBeVisible()
      await expect.poll(() => target.evaluate(element => {
        const bounds = element.getBoundingClientRect()
        return bounds.top < innerHeight && bounds.bottom > 0
      })).toBe(true)
    })
  }
}

test('reduced motion keeps the static poster and clickable link without playback controls', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.locator('.home-projects__rail').scrollIntoViewIfNeeded()
  await expect(page.locator('.home-projects button')).toHaveCount(0)
  const video = page.locator('.home-project-video video').first()
  await expect(video).toHaveJSProperty('paused', true)
  await expect(video).not.toHaveAttribute('src', /.+/)
  await page.locator('.home-project-video a').first().click()
  await expect(page).toHaveURL(/\/research\/#corn-growth$/)
})

test('video wraps to the beginning of its loop', async ({ page }) => {
  await page.goto('/')
  const video = page.locator('.home-project-video video').first()
  await video.scrollIntoViewIfNeeded()
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState)).toBeGreaterThanOrEqual(2)
  await expect(video).toHaveJSProperty('paused', false)
  const wrapped = await video.evaluate((element: HTMLVideoElement) => new Promise<boolean>((resolve) => {
    element.addEventListener('seeked', () => {
      const onTimeUpdate = () => {
        if (element.seeking || element.currentTime >= 1) return
        element.removeEventListener('timeupdate', onTimeUpdate)
        resolve(true)
      }
      element.addEventListener('timeupdate', onTimeUpdate)
    }, { once: true })
    element.currentTime = element.duration - .5
  }))
  expect(wrapped).toBe(true)
})

test('failed media leaves the poster and link available', async ({ page }) => {
  await page.route('**/assets/videos/home-projects/*.mp4', route => route.abort())
  await page.goto('/')
  const card = page.locator('.home-project-video').first()
  await card.scrollIntoViewIfNeeded()
  await expect(card.locator('video')).toHaveAttribute('poster', /maize\.jpg$/)
  await expect(card.locator('a')).toHaveAttribute('href', '/research/#corn-growth')
  await expect(card.locator('span')).toHaveText('玉米')
  await card.locator('a').click()
  await expect(page).toHaveURL(/\/research\/#corn-growth$/)
})

test('a genuine media request failure returns to the static poster', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'WebKit media requests bypass Playwright routing in this environment')
  let requested!: () => void
  const requestStarted = new Promise<void>(resolve => { requested = resolve })
  await page.route('**/assets/videos/home-projects/maize.mp4', async route => {
    requested()
    await route.abort()
  })
  await page.goto('/')
  const card = page.locator('.home-project-video').first()
  const video = card.locator('video')
  await video.scrollIntoViewIfNeeded()
  await requestStarted
  await expect(video).not.toHaveAttribute('src', /.+/)
  await expect(video).toHaveAttribute('poster', /maize\.jpg$/)
  await expect(card.locator('a')).toHaveAttribute('href', '/research/#corn-growth')
})

test('desktop photo height grows in proportion to its baseline at each viewport', async ({ page }) => {
  for (const width of [1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/')
    const box = await page.locator('.home-hero-visual').boundingBox()
    const originalWidth = await page.locator('.home-hero-inner').evaluate(element => {
      const style = getComputedStyle(element)
      return Math.min(1260, element.parentElement!.clientWidth) - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
    })
    const originalHeight = Math.max(340, Math.min(480, width * .36))
    expect(Math.abs(box!.height - originalHeight * box!.width / originalWidth)).toBeLessThanOrEqual(2)
  }
})
