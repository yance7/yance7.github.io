import { test, expect } from '@playwright/test'

test('pausing during an unfinished media request retains the source and resumes', async ({ page, browserName }) => {
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
    await page.getByRole('button', { name: '暂停视频' }).click()
    await expect(video).toHaveJSProperty('paused', true)
    await expect(video).toHaveAttribute('src', source!)
    await expect(video).toHaveAttribute('data-load-calls', calls!)
    await page.getByRole('button', { name: '播放视频' }).click()
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
  await page.getByRole('button', { name: '暂停视频' }).click()
  await page.getByRole('button', { name: '播放视频' }).click()
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0)
  await expect(video).toHaveAttribute('src', /maize\.mp4$/)
})

test('hydration preserves selected work position while enabling video controls', async ({ page }) => {
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
    await expect(page.getByRole('button', { name: '暂停视频' })).toBeVisible()
    const after = await measure()
    expect(Math.abs(after.railHeight - before.railHeight)).toBeLessThanOrEqual(2)
    expect(Math.abs(after.controlHeight - before.controlHeight)).toBeLessThanOrEqual(2)
    expect(Math.abs(after.selectedTop - before.selectedTop)).toBeLessThanOrEqual(2)
  } finally { release() }
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

test('videos load only when visible and manual pause persists after scrolling', async ({ page }) => {
  const requests: string[] = []
  page.on('request', request => { if (request.url().endsWith('.mp4')) requests.push(request.url()) })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  expect(requests).toHaveLength(0)
  const rail = page.locator('.home-projects__rail')
  await rail.scrollIntoViewIfNeeded()
  const video = page.locator('.home-project-video video').first()
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0)
  const toggle = page.getByRole('button', { name: '暂停视频' })
  await toggle.click()
  await expect(video).toHaveJSProperty('paused', true)
  await page.evaluate(() => window.scrollTo(0, 0))
  await rail.scrollIntoViewIfNeeded()
  await expect(page.getByRole('button', { name: '播放视频' })).toBeVisible()
  await expect(video).toHaveJSProperty('paused', true)
  await page.getByRole('button', { name: '播放视频' }).click()
  await expect(video).toHaveJSProperty('paused', false)
})

test('reduced motion and disabled JavaScript retain posters and links', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, reducedMotion: 'reduce' })
  const page = await context.newPage()
  await page.goto('/en/')
  await expect(page.locator('.home-project-video video[poster]')).toHaveCount(3)
  await expect(page.locator('.home-project-video a')).toHaveCount(3)
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

for (const [prefix, locale] of [['', '简中'], ['/zh-hk', '繁中'], ['/en', 'English']] as const) {
  for (const [index, route, hash] of [[0, 'research', 'corn-growth'], [1, 'research', 'fishfreshnet-v1'], [2, 'works', 'project-fresheye']] as const) {
    test(`${locale} project ${hash} opens its specific entry`, async ({ page }) => {
      await page.goto(`${prefix}/`)
      await page.locator('.home-project-video a').nth(index).click()
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

test('reduced motion keeps the poster until explicitly played', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.locator('.home-projects__rail').scrollIntoViewIfNeeded()
  await expect(page.getByRole('button', { name: '播放视频' })).toBeVisible()
  await expect(page.locator('.home-project-video video').first()).toHaveJSProperty('paused', true)
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
  await expect(card.locator('span')).toHaveText('Maize')
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
