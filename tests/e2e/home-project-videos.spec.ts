import { test, expect } from '@playwright/test'

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
  await page.setViewportSize({ width: 390, height: 844 })
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
  await video.evaluate((element: HTMLVideoElement) => { element.currentTime = element.duration - .15 })
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeLessThan(1)
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
