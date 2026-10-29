import { expect, type Page } from '@playwright/test'
import { test } from './helpers/page-fixture'
import { readMimoReferenceGlyph } from './helpers/mimo-reference'

async function ready(page: Page) {
  await page.goto('/')
  await expect(page.locator('.home-hero-particles')).toHaveAttribute('data-render-mode', 'canvas')
  await expect(page.locator('.home-hero-particles')).toHaveAttribute('data-particle-state', 'settled', { timeout: 8000 })
}

async function frames(page: Page, count = 8) {
  await page.evaluate(count => new Promise<void>(resolve => {
    const next = () => { if (--count <= 0) resolve(); else requestAnimationFrame(next) }
    requestAnimationFrame(next)
  }), count)
}

async function gesture(page: Page, type: string, pointerType = 'pen', pointerId = 17) {
  await page.locator('.home-hero-particles').evaluate((stage, input) => {
    const bounds = stage.getBoundingClientRect()
    const ink = JSON.parse((stage as HTMLElement).dataset.inkBounds!)
    const event = new PointerEvent(input.type, {
      bubbles: true, pointerType: input.pointerType, pointerId: input.pointerId,
      clientX: bounds.left + ink.left + ink.width * .25,
      clientY: bounds.top + ink.top + ink.height * .5
    })
    const recipient = input.type === 'pointerup' || input.type === 'pointercancel' ? window : stage
    recipient.dispatchEvent(event)
  }, { type, pointerType, pointerId })
}

async function expectSampledHomes(page: Page) {
  const stage = page.locator('.home-hero-particles')
  const reference = await stage.evaluate(readMimoReferenceGlyph)
  expect(reference.points.length).toBeGreaterThan(0)
  const result = await stage.evaluate((element, reference) => {
    const stage = element as HTMLElement
    const actual = stage.querySelector('canvas')!
    const expected = document.createElement('canvas')
    expected.width = actual.width
    expected.height = actual.height
    const drawing = expected.getContext('2d')!
    drawing.setTransform(reference.ratio, 0, 0, reference.ratio, 0, 0)
    for (const point of reference.points) {
      drawing.fillStyle = point.color
      drawing.fillRect(point.x - .9, point.y - .9, 1.8, 1.8)
    }
    const actualPixels = actual.getContext('2d')!.getImageData(0, 0, actual.width, actual.height).data
    const expectedPixels = drawing.getImageData(0, 0, expected.width, expected.height).data
    let different = 0
    for (let i = 0; i < actualPixels.length; i++) if (actualPixels[i] !== expectedPixels[i]) different++
    return { different, count: reference.points.length, actualCount: Number(stage.dataset.particleCount) }
  }, reference)
  expect(result.actualCount).toBe(result.count)
  expect(result.different).toBe(0)
}

test('MiMo cancels a native pinch without waiting for another animation frame', async ({ page }) => {
  await page.addInitScript(() => {
    const requestFrame = requestAnimationFrame.bind(window)
    window.requestAnimationFrame = callback => requestFrame(time => {
      if (!(window as Window & { pausePinchFrames?: boolean }).pausePinchFrames) callback(time)
    })
  })
  await ready(page)
  await gesture(page, 'pointerdown', 'touch', 17)
  const stage = page.locator('.home-hero-particles')
  await expect(stage).toHaveAttribute('data-particle-state', 'disturbed')
  await page.evaluate(() => { (window as Window & { pausePinchFrames?: boolean }).pausePinchFrames = true })
  try {
    await gesture(page, 'pointerdown', 'touch', 18)
    await expect(stage).toHaveAttribute('data-moving-particle-count', '0')
    await expect(stage).toHaveAttribute('data-particle-state', 'settled')
    await expectSampledHomes(page)
    await gesture(page, 'pointerup', 'touch', 17)
    await gesture(page, 'pointermove', 'touch', 18)
    await expect(stage).toHaveAttribute('data-particle-state', 'settled')
  } finally {
    await page.evaluate(() => {
      (window as Window & { pausePinchFrames?: boolean }).pausePinchFrames = false
      window.dispatchEvent(new Event('blur'))
      window.dispatchEvent(new Event('focus'))
    })
  }
})

test('MiMo ignores multiple contacts while reduced motion is active', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const stage = page.locator('.home-hero-particles')
  await expect(stage).toHaveAttribute('data-particle-state', 'paused')
  await gesture(page, 'pointerdown', 'touch', 17)
  await gesture(page, 'pointerdown', 'touch', 18)
  await expect(stage).toHaveAttribute('data-moving-particle-count', '0')
  await expect(stage).toHaveAttribute('data-particle-state', 'paused')
  await expect(stage).toHaveAttribute('data-animation-running', 'false')
})

test('MiMo geometry cancellation clears pixels without frames and ignores stationary mouse redispatch', async ({ page }) => {
  await page.addInitScript(() => {
    const requestFrame = requestAnimationFrame.bind(window)
    window.requestAnimationFrame = callback => requestFrame(time => {
      const target = window as Window & { pauseMimoFrames?: boolean, pendingMimoFrames?: FrameRequestCallback[] }
      if (target.pauseMimoFrames) (target.pendingMimoFrames ??= []).push(callback)
      else callback(time)
    })
  })
  await ready(page)
  // Yield native proximity before testing a real coordinate-frame change.
  await page.locator('.theme-orbit').focus()
  await expect(page.locator('html')).toHaveCSS('scroll-snap-type', 'none')
  const stage = page.locator('.home-hero-particles')
  await gesture(page, 'pointermove', 'mouse', 1)
  await expect(stage).toHaveAttribute('data-particle-state', 'disturbed')
  try {
    await stage.evaluate(element => {
      const bounds = element.getBoundingClientRect()
      const ink = JSON.parse((element as HTMLElement).dataset.inkBounds!)
      const x = bounds.left + ink.left + ink.width * .25
      const y = bounds.top + ink.top + ink.height * .5
      ;(window as Window & { pauseMimoFrames?: boolean }).pauseMimoFrames = true
      scrollBy({ top: 40, behavior: 'instant' })
      if (element.getBoundingClientRect().top >= bounds.top - 1) {
        throw new Error('The geometry test did not move the particle stage')
      }
      document.dispatchEvent(new Event('scroll'))
      // Layout can also generate boundary events while the mouse stays still.
      element.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse', pointerId: 1, clientX: x, clientY: y }))
      element.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'mouse', pointerId: 1, clientX: x, clientY: y }))
    })
    await expect(stage).toHaveAttribute('data-particle-state', 'settled', { timeout: 1000 })
    await expectSampledHomes(page)
    await page.evaluate(() => new Promise<void>(resolve => {
      const target = window as Window & { pauseMimoFrames?: boolean, pendingMimoFrames?: FrameRequestCallback[] }
      target.pauseMimoFrames = false
      const pending = target.pendingMimoFrames ?? []
      target.pendingMimoFrames = []
      requestAnimationFrame(time => { pending.forEach(callback => callback(time)); resolve() })
    }))
    await frames(page)
    await expect(stage).toHaveAttribute('data-particle-state', 'settled')
    await expect(stage).toHaveAttribute('data-moving-particle-count', '0')
    await gesture(page, 'pointermove', 'mouse', 1)
    await expect(stage).toHaveAttribute('data-particle-state', 'disturbed')
  } finally {
    await page.evaluate(() => {
      ;(window as Window & { pauseMimoFrames?: boolean }).pauseMimoFrames = false
      dispatchEvent(new Event('blur'))
      dispatchEvent(new Event('focus'))
    })
  }
})

test('MiMo cursor enlarges for an anchor without href', async ({ page }) => {
  test.skip(!await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches))
  await page.goto('/')
  await page.evaluate(() => {
    const anchor = document.createElement('a')
    anchor.id = 'mimo-plain-anchor'
    anchor.textContent = 'Plain anchor'
    anchor.style.cssText = 'position:fixed;left:240px;top:200px;padding:20px;z-index:2147483647'
    document.body.append(anchor)
  })
  await page.locator('#mimo-plain-anchor').hover()
  await expect(page.locator('.sitewide-cursor')).toHaveAttribute('data-context', 'text')
  await expect(page.locator('.sitewide-cursor-ring')).toHaveCSS('width', '80px')
})

for (const route of ['/', '/zh-hk/', '/en/']) {
  test(`MiMo ${route} retains the loaded Amiri 2px samples within the point cap`, async ({ page }) => {
    await page.goto(route)
    const stage = page.locator('.home-hero-particles')
    await expect(stage).toHaveAttribute('data-render-mode', 'canvas')
    await expect(stage).toHaveAttribute('data-particle-state', 'settled', { timeout: 8000 })
    const result = await stage.evaluate(element => {
      const stage = element as HTMLElement
      const canvas = stage.querySelector('canvas')!
      const width = Math.floor(stage.getBoundingClientRect().width - stage.clientLeft * 2)
      const height = Math.floor(stage.getBoundingClientRect().height - stage.clientTop * 2)
      const source = Number(stage.dataset.sourceParticleCount)
      return {
        font: [...document.fonts].some(face => face.family.includes('Amiri') && face.weight === '400' && face.status === 'loaded'),
        count: Number(stage.dataset.particleCount), expected: Math.min(source, 12000), source,
        ratio: Number(stage.dataset.pixelRatio), expectedRatio: Math.min(devicePixelRatio || 1, 2),
        width: canvas.width, height: canvas.height, expectedWidth: Math.floor(width * Math.min(devicePixelRatio || 1, 2)),
        expectedHeight: Math.floor(height * Math.min(devicePixelRatio || 1, 2))
      }
    })
    expect(result.font).toBe(true)
    await expect(stage).toHaveAttribute('data-grid-step', '2')
    expect(result.count).toBe(result.expected)
    expect(result.count).toBeGreaterThan(100)
    expect(result.count).toBeLessThanOrEqual(12000)
    expect(result.count / result.source).toBeGreaterThanOrEqual(.9)
    const reference = await stage.evaluate(readMimoReferenceGlyph)
    if (reference.points.length !== result.count) {
      const state = await stage.evaluate(element => {
        const stage = element as HTMLElement
        const bounds = stage.getBoundingClientRect()
        const context = document.createElement('canvas').getContext('2d')!
        context.font = '400 100px Amiri, serif'
        return { width: bounds.width, height: bounds.height, border: stage.clientLeft,
          canvasWidth: stage.querySelector('canvas')!.width, canvasHeight: stage.querySelector('canvas')!.height,
          count: Number(stage.dataset.particleCount), frameCount: Number(stage.dataset.frameCount),
          fontStatus: document.fonts.status, fontReady: document.fonts.check('400 100px Amiri', 'YANCE'),
          fontWidth: context.measureText('YANCE').width, viewport: { width: innerWidth, height: innerHeight }, dpr: devicePixelRatio }
      })
      await test.info().attach('mimo-reference-diagnostics', { body: JSON.stringify({ result, reference: {
        width: reference.width, height: reference.height, count: reference.points.length, ratio: reference.ratio
      }, state }, null, 2), contentType: 'application/json' })
    }
    expect(reference.points).toHaveLength(result.count)
    expect(result.ratio).toBe(result.expectedRatio)
    expect(result.width).toBe(result.expectedWidth)
    expect(result.height).toBe(result.expectedHeight)
  })
}

test('MiMo keeps foreground microdrift frames and pauses offscreen', async ({ page }) => {
  await ready(page)
  const stage = page.locator('.home-hero-particles')
  const initial = Number(await stage.getAttribute('data-frame-count'))
  await frames(page)
  expect(Number(await stage.getAttribute('data-frame-count'))).toBeGreaterThan(initial)
  await expect(stage).toHaveAttribute('data-animation-running', 'true')
  await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }))
  await expect(stage).toHaveAttribute('data-particle-state', 'paused')
  const paused = await stage.getAttribute('data-frame-count')
  await frames(page)
  await expect(stage).toHaveAttribute('data-frame-count', paused!)
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
  await expect(stage).toHaveAttribute('data-particle-state', 'settled')
  await expect(stage).toHaveAttribute('data-animation-running', 'true')
})

test('MiMo mouse up retains repulsion until mouse leave', async ({ page }) => {
  await ready(page)
  const stage = page.locator('.home-hero-particles')
  await gesture(page, 'pointermove', 'mouse', 1)
  await expect(stage).toHaveAttribute('data-particle-state', 'disturbed')
  await gesture(page, 'pointerup', 'mouse', 1)
  await frames(page)
  await expect(stage).toHaveAttribute('data-particle-state', 'disturbed')
  await gesture(page, 'pointerleave', 'mouse', 1)
  await expect(stage).toHaveAttribute('data-particle-state', 'settled', { timeout: 1500 })
})

test('MiMo tracks repeated pen gestures and matching window releases', async ({ page }) => {
  await ready(page)
  const stage = page.locator('.home-hero-particles')
  await gesture(page, 'pointermove', 'mouse', 1)
  for (const end of ['pointerup', 'pointercancel']) {
    await gesture(page, 'pointerdown')
    await expect(stage).toHaveAttribute('data-particle-state', 'disturbed')
    await gesture(page, end, 'pen', 18)
    await frames(page)
    await expect(stage).toHaveAttribute('data-particle-state', 'disturbed')
    await gesture(page, end)
    await expect(stage).toHaveAttribute('data-particle-state', 'settled', { timeout: 1500 })
  }
})

test('MiMo keeps the pen contact owner when mouse input is interleaved', async ({ page }) => {
  await ready(page)
  const stage = page.locator('.home-hero-particles')
  await gesture(page, 'pointerdown')
  await expect(stage).toHaveAttribute('data-particle-state', 'disturbed')
  await gesture(page, 'pointermove', 'mouse', 1)
  await gesture(page, 'pointerleave', 'mouse', 1)
  await gesture(page, 'pointermove')
  // This case checks ownership under interleaved inputs. MiMo consumes one
  // 0.55 blend per actual frame; the separate pixel test measures wall time.
  await frames(page, 9)
  await expect(stage).toHaveAttribute('data-particle-state', 'settled', { timeout: 1500 })
  await gesture(page, 'pointermove', 'mouse', 1)
  await expect(stage).toHaveAttribute('data-particle-state', 'disturbed')
  await gesture(page, 'pointerup')
  await frames(page, 9)
  await expect(stage).toHaveAttribute('data-particle-state', 'settled', { timeout: 1500 })
})

test('MiMo reduced motion keeps the sampled canvas static without ongoing frames', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const stage = page.locator('.home-hero-particles')
  await expect(stage).toHaveAttribute('data-render-mode', 'canvas')
  await expect(stage).toHaveAttribute('data-particle-state', 'paused')
  await expect(stage).toHaveAttribute('data-animation-running', 'false')
  const first = await stage.locator('canvas').evaluate(element => (element as HTMLCanvasElement).toDataURL())
  const count = await stage.getAttribute('data-frame-count')
  await frames(page)
  await gesture(page, 'pointermove', 'mouse', 1)
  await frames(page)
  expect(await stage.locator('canvas').evaluate(element => (element as HTMLCanvasElement).toDataURL())).toBe(first)
  await expect(stage).toHaveAttribute('data-frame-count', count!)
  expect(Number(await stage.getAttribute('data-particle-count'))).toBeGreaterThan(100)
})

for (const query of ['(prefers-reduced-motion: reduce)', '(forced-colors: active)']) {
  test(`MiMo ${query} resumes on a valid preference restore after the disabling notification was missed`, async ({ page }) => {
    await page.addInitScript(query => {
      const original = matchMedia.bind(window)
      const lists: MediaQueryList[] = []
      let reduced = false
      window.matchMedia = candidate => {
        const media = original(candidate)
        if (candidate === query) {
          Object.defineProperty(media, 'matches', { get: () => reduced })
          lists.push(media)
        }
        return media
      }
      Object.assign(window, { setHeroPreferenceTest: (value: boolean, notify: boolean) => {
        reduced = value
        if (notify) for (const media of lists) media.dispatchEvent(new Event('change'))
      } })
    }, query)
    await ready(page)
    const stage = page.locator('.home-hero-particles')
    const change = (value: boolean, notify: boolean) => page.evaluate(({ value, notify }) => {
      (window as Window & { setHeroPreferenceTest?: (value: boolean, notify: boolean) => void }).setHeroPreferenceTest!(value, notify)
    }, { value, notify })
    await change(true, false)
    await expect(stage).toHaveAttribute('data-animation-running', 'false')
    await change(false, true)
    await expect(stage).toHaveAttribute('data-animation-running', 'true')
  })
}

test('MiMo resumes data-saving fallback when its valid restore event arrives', async ({ page }) => {
  await page.addInitScript(() => {
    const connection = Object.assign(new EventTarget(), { saveData: false })
    Object.defineProperty(navigator, 'connection', { configurable: true, value: connection })
    Object.assign(window, { setHeroSaveDataTest: (value: boolean, notify: boolean) => {
      connection.saveData = value
      if (notify) connection.dispatchEvent(new Event('change'))
    } })
  })
  await ready(page)
  const stage = page.locator('.home-hero-particles')
  const change = (value: boolean, notify: boolean) => page.evaluate(({ value, notify }) => {
    (window as Window & { setHeroSaveDataTest?: (value: boolean, notify: boolean) => void }).setHeroSaveDataTest!(value, notify)
  }, { value, notify })
  await change(true, false)
  await expect(stage).toHaveAttribute('data-render-mode', 'static')
  await change(false, true)
  await expect(stage).toHaveAttribute('data-render-mode', 'canvas')
  await expect(stage).toHaveAttribute('data-animation-running', 'true')
})

test('MiMo static canvas matches an independently reconstructed sampled glyph', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const stage = page.locator('.home-hero-particles')
  await expect(stage).toHaveAttribute('data-render-mode', 'canvas')
  for (const theme of ['light', 'dark', 'light']) {
    await page.evaluate(theme => document.documentElement.setAttribute('data-theme', theme), theme)
    await expectSampledHomes(page)
    await expect(stage).toHaveAttribute('data-animation-running', 'false')
  }
})

test('MiMo ring and dot follow the pointer directly with exact hover sizes', async ({ page }) => {
  test.skip(!await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches))
  await ready(page)
  const cursor = page.locator('.sitewide-cursor')
  const ring = cursor.locator('.sitewide-cursor-ring')
  const dot = cursor.locator('.sitewide-cursor-dot')
  await page.locator('.home-hero-particles').hover({ position: { x: 10, y: 10 } })
  await expect(cursor).toHaveAttribute('data-context', 'particle')
  await expect(ring).toHaveCSS('width', '32px')
  await expect(dot).toHaveCSS('width', '6px')
  await expect(ring).toHaveCSS('border-top-color', 'rgb(0, 0, 0)')
  await page.evaluate(() => {
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse', clientX: 211, clientY: 173 }))
  })
  for (const part of [ring, dot]) {
    const position = await part.evaluate(element => {
      const bounds = element.getBoundingClientRect()
      return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }
    })
    expect(position.x).toBeCloseTo(211, 5)
    expect(position.y).toBeCloseTo(173, 5)
  }
  await page.locator('.home-hero-actions a').first().hover()
  await expect(ring).toHaveCSS('width', '80px')
  await expect(ring).toHaveCSS('transition-timing-function', 'cubic-bezier(0.23, 1, 0.32, 1), cubic-bezier(0.23, 1, 0.32, 1)')
})
