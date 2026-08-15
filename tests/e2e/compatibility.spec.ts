import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { htmlPageEntries } from '../../src/data/pageRegistry'

const archiveRoutes = htmlPageEntries.map(({ htmlName }) => `${htmlName}.html`)

test('compatibility pages boot without horizontal overflow', async ({ page }) => {
  for (const route of archiveRoutes) {
    await page.goto(`/${route}`)
    await expect(page.locator('main#main')).toBeVisible()
    const layout = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      viewportWidth: window.innerWidth
    }))
    expect(layout.documentWidth, route).toBeLessThanOrEqual(layout.viewportWidth)
    expect(layout.bodyWidth, route).toBeLessThanOrEqual(layout.viewportWidth)
  }
})

test('compatibility hash navigation and PageCompass settle together', async ({ page }) => {
  await page.goto('/works.html#project-encore')
  const target = page.locator('#project-encore')
  await expect(target).toBeVisible()
  await expect.poll(() => target.evaluate((element) => Math.round(element.getBoundingClientRect().top))).toBeGreaterThanOrEqual(12)
  await expect(page.locator('.page-compass-link[href="#project-encore"]')).toHaveAttribute('aria-current', 'location')
})

test('mobile PageCompass follows reading direction without trapping focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/index.html')

  const compass = page.locator('.page-compass')
  await expect(compass).toHaveAttribute('data-mobile-state', 'quiet')
  await expect(compass).toHaveAttribute('aria-hidden', 'true')
  await expect(compass).toHaveAttribute('inert', '')
  await expect(compass).toHaveCSS('visibility', 'hidden')
  await expect(compass).toHaveCSS('pointer-events', 'none')

  await page.evaluate(() => {
    window.scrollTo({ top: 320, behavior: 'auto' })
    window.dispatchEvent(new Event('scroll'))
  })
  await expect.poll(() => compass.getAttribute('data-mobile-state'), { timeout: 300 }).toBe('reading')
  await expect(compass).toHaveAttribute('aria-hidden', 'true')
  await expect(compass).toHaveAttribute('inert', '')
  await expect(compass).toHaveCSS('visibility', 'hidden')
  await expect(compass).toHaveCSS('pointer-events', 'none')

  await expect.poll(() => compass.getAttribute('data-mobile-state'), { timeout: 1200 }).toBe('visible')
  await expect(compass).toHaveAttribute('data-mobile-state', 'visible')
  await expect(compass).not.toHaveAttribute('aria-hidden', 'true')
  await expect(compass).not.toHaveAttribute('inert', '')
  await expect(compass).toHaveCSS('visibility', 'visible')
  await expect(compass).toHaveCSS('pointer-events', 'auto')

  const firstLink = compass.locator('.page-compass-link').first()
  await firstLink.focus()
  await expect(firstLink).toBeFocused()
  await page.evaluate(() => {
    window.scrollTo({ top: 620, behavior: 'auto' })
    window.dispatchEvent(new Event('scroll'))
  })
  await expect(compass).toHaveAttribute('data-mobile-state', 'visible')
  await expect(compass).not.toHaveAttribute('aria-hidden', 'true')

  await page.locator('.menu-trigger').focus()
  await expect(page.locator('.menu-trigger')).toBeFocused()
  await expect.poll(() => compass.getAttribute('data-mobile-state'), { timeout: 300 }).toBe('reading')
})

test('compatibility menu, carousel, modal, and axe smoke remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/index.html')
  await page.locator('.menu-trigger').click()
  await expect(page.locator('.mobile-menu-overlay')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.mobile-menu-overlay')).toHaveCount(0)

  await page.goto('/concerts.html')
  const carousel = page.locator('.concert-poster').filter({ has: page.locator('.carousel-controls') }).first()
  const counter = carousel.locator('.carousel-controls span')
  const before = await counter.textContent()
  await carousel.locator('button[aria-label="下一张"]').click()
  await expect(counter).not.toHaveText(before || '')

  await page.locator('.concert-poster .poster-open').first().click()
  await expect(page.locator('.lightbox')).toBeVisible()
  await expect(new AxeBuilder({ page }).analyze()).resolves.toMatchObject({ violations: [] })
  await page.keyboard.press('Escape')
  await expect(page.locator('.lightbox')).toHaveCount(0)
})

test('mobile menu typography follows the light-theme semantic text tokens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/index.html')
  await page.locator('.menu-trigger').click()

  const colors = await page.evaluate(() => {
    const resolveColor = (variable: string) => {
      const probe = document.createElement('span')
      probe.style.color = `var(${variable})`
      document.body.append(probe)
      const value = getComputedStyle(probe).color
      probe.remove()
      return value
    }

    return {
      number: getComputedStyle(document.querySelector('.mobile-menu .mm-num')!).color,
      english: getComputedStyle(document.querySelector('.mobile-menu .mm-en')!).color,
      description: getComputedStyle(document.querySelector('.mobile-menu .mm-desc')!).color,
      goldText: resolveColor('--gold-text'),
      dim: resolveColor('--dim'),
      muted: resolveColor('--muted')
    }
  })

  expect(colors.number).toBe(colors.goldText)
  expect(colors.english).toBe(colors.dim)
  expect(colors.description).toBe(colors.muted)
})

test('touch carousel hover suppression follows the active theme control tokens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/concerts.html')
  await page.locator('.theme-orbit').click()
  await page.waitForTimeout(420)

  const colors = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement)
    const button = document.querySelector<HTMLElement>('.carousel-controls button')!
    const resolveColor = (variable: string, property: 'backgroundColor' | 'borderColor') => {
      const probe = document.createElement('span')
      probe.style[property] = `var(${variable})`
      document.body.append(probe)
      const value = getComputedStyle(probe)[property]
      probe.remove()
      return value
    }

    return {
      background: getComputedStyle(button).backgroundColor,
      border: getComputedStyle(button).borderColor,
      expectedBackground: resolveColor('--media-control-bg', 'backgroundColor'),
      expectedBorder: resolveColor('--media-control-border', 'borderColor'),
      theme: root.getPropertyValue('--media-control-bg').trim()
    }
  })

  expect(colors.theme).not.toBe('')
  expect(colors.background).toBe(colors.expectedBackground)
  expect(colors.border).toBe(colors.expectedBorder)
})
