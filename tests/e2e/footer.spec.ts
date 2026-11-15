import { expect, test, type Page } from '@playwright/test'
import { waitForHydration } from './helpers/hydration'

const contacts = [
  { key: 'email', href: 'mailto:yc@yance.me', value: 'yc@yance.me', external: false },
  { key: 'github', href: 'https://github.com/yance7', value: '@yance7', external: true }
] as const

const locales = [
  { name: 'Simplified Chinese', path: '/', contactLabel: '联系方式', labels: { email: '邮箱', github: 'GitHub' } },
  { name: 'Traditional Chinese', path: '/zh-hk/', contactLabel: '聯絡方式', labels: { email: '電郵', github: 'GitHub' } },
  { name: 'English', path: '/en/', contactLabel: 'Contact', labels: { email: 'Email', github: 'GitHub' } }
] as const

async function waitForFooterTypography(page: Page) {
  await waitForHydration(page)
  await expect(page.locator('html')).toHaveAttribute('data-fonts-ready', /^(ready|fallback)$/)
  await page.evaluate(() => document.fonts.ready)
}

async function hasFinePointer(page: Page) {
  return page.evaluate(() => (
    window.matchMedia('(hover: hover) and (pointer: fine)').matches
    && !window.matchMedia('(hover: none), (pointer: coarse)').matches
  ))
}

for (const locale of locales) {
  test(`footer exposes two localized icon contact links: ${locale.name}`, async ({ page }) => {
    await page.goto(locale.path)
    const footer = page.locator('footer.site-footer')
    await footer.scrollIntoViewIfNeeded()
    await waitForFooterTypography(page)

    const contactGrid = footer.locator('.foot-contacts')
    const links = contactGrid.locator('.foot-contact')
    await expect(contactGrid).toHaveAttribute('aria-label', locale.contactLabel)
    await expect(links).toHaveCount(2)
    await expect(contactGrid.locator('.foot-contact-value, .foot-contact-arrow')).toHaveCount(0)

    for (const [index, contact] of contacts.entries()) {
      const link = links.nth(index)
      await expect(link).toHaveAttribute('href', contact.href)
      // Icons only: no visible address/username, but the full localized name is exposed.
      expect((await link.textContent())?.trim()).toBe('')
      await expect(link).toHaveAttribute('aria-label', `${locale.labels[contact.key]}: ${contact.value}`)
      await expect(link.locator('svg')).toHaveAttribute('aria-hidden', 'true')
      await expect(link.locator('svg')).toHaveAttribute('viewBox', '0 0 24 24')
      if (contact.external) {
        await expect(link).toHaveAttribute('target', '_blank')
        await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
      } else {
        await expect(link).not.toHaveAttribute('target')
        await expect(link).not.toHaveAttribute('rel')
      }
    }
  })
}

for (const width of [320, 390, 768, 1024, 1440]) {
  test(`footer contact icons stay parallel and touchable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    const footer = page.locator('footer.site-footer')
    await footer.scrollIntoViewIfNeeded()
    await expect(footer).toBeVisible()

    const geometry = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll<HTMLElement>('.foot-contact'))
      const rects = links.map((link) => link.getBoundingClientRect())
      return {
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        tops: rects.map((rect) => rect.top),
        right: Math.max(...rects.map((rect) => rect.right)),
        gap: rects[1]!.left - rects[0]!.right,
        hitAreas: rects.map((rect) => ({ width: rect.width, height: rect.height }))
      }
    })

    expect(geometry.documentWidth, `${width}px footer overflow`).toBeLessThanOrEqual(geometry.viewportWidth)
    expect(geometry.right, `${width}px contact right edge`).toBeLessThanOrEqual(geometry.viewportWidth)
    expect(geometry.hitAreas).toHaveLength(2)
    expect(geometry.hitAreas.every(({ width: hitWidth, height }) => hitWidth >= 44 && height >= 44)).toBe(true)
    expect(Math.abs(geometry.tops[0]! - geometry.tops[1]!), `${width}px parallel row`).toBeLessThanOrEqual(1)
    expect(geometry.gap, `${width}px contact gap`).toBeGreaterThanOrEqual(8)
  })
}

test('footer contact icons expose keyboard focus and feedback appropriate to the pointer', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  const footer = page.locator('footer.site-footer')
  await footer.scrollIntoViewIfNeeded()
  const link = footer.locator('.foot-contact').first()
  const finePointer = await hasFinePointer(page)

  const base = await link.evaluate((element) => {
    const style = getComputedStyle(element)
    return { background: style.backgroundColor, border: style.borderTopColor }
  })

  if (finePointer) {
    // Keyboard Tab from the identity mark moves focus to the first contact with a visible outline.
    await footer.locator('.foot-mark').focus()
    await page.keyboard.press('Tab')
    await expect(link).toBeFocused()
    const focus = await link.evaluate((element) => {
      const style = getComputedStyle(element)
      return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth }
    })
    expect(focus.outlineStyle).toBe('solid')
    expect(Number.parseFloat(focus.outlineWidth)).toBeGreaterThan(0)

    await link.hover()
    await expect.poll(() => link.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(base.background)
    await expect.poll(() => link.evaluate((element) => getComputedStyle(element).borderTopColor)).not.toBe(base.border)
    await expect.poll(() => link.evaluate((element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).m42)).toBe(-1)

    // Press feedback without coordinate clicks: prevent the navigation on the link itself.
    await link.evaluate((element) => element.addEventListener('click', (event) => event.preventDefault(), { once: true }))
    await link.hover()
    await page.mouse.down()
    await expect.poll(() => link.evaluate((element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).a)).toBeLessThan(1)
    await page.mouse.up()
  } else {
    // Coarse pointers must keep the static control appearance (no hover lift).
    await expect.poll(() => link.evaluate((element) => getComputedStyle(element).transform)).toBe('none')
  }

  const contrast = await link.evaluate((element) => {
    const parse = (value: string) => (value.match(/rgba?\(([^)]+)\)/)?.[1] ?? '0,0,0')
      .split(',').map((part) => Number.parseFloat(part.trim()))
    const luminance = ([r, g, b]: number[]) => {
      const channel = (value: number) => {
        const unit = value / 255
        return unit <= .03928 ? unit / 12.92 : ((unit + .055) / 1.055) ** 2.4
      }
      return .2126 * channel(r!) + .7152 * channel(g!) + .0722 * channel(b!)
    }
    const icon = parse(getComputedStyle(element.querySelector('svg')!).color)
    const raw = parse(getComputedStyle(element).backgroundColor)
    const page = parse(getComputedStyle(document.body).backgroundColor || 'rgb(255,255,255)')
    const alpha = raw[3] ?? 1
    const backdrop = [0, 1, 2].map((index) => (raw[index]! * alpha) + (page[index]! * (1 - alpha)))
    const iconL = luminance(icon)
    const backL = luminance(backdrop)
    return (Math.max(iconL, backL) + .05) / (Math.min(iconL, backL) + .05)
  })
  expect(contrast, 'icon contrast against the control background').toBeGreaterThanOrEqual(3)
})

test('footer contact icons stay static under reduced motion', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await context.newPage()
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  const footer = page.locator('footer.site-footer')
  await footer.scrollIntoViewIfNeeded()
  const link = footer.locator('.foot-contact').first()
  if (await hasFinePointer(page)) {
    await link.hover()
    await expect.poll(() => link.evaluate((element) => getComputedStyle(element).transform)).toBe('none')
  }
  await expect(link).toBeVisible()
  await context.close()
})