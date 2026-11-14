import { expect, test, type Page } from '@playwright/test'
import { waitForHydration } from './helpers/hydration'

const contacts = [
  { href: 'mailto:yc@yance.me', value: 'yc@yance.me', external: false },
  { href: 'https://github.com/yance7', value: '@yance7', external: true }
] as const

const locales = [
  { name: 'Simplified Chinese', path: '/', contactLabel: '联系方式' },
  { name: 'Traditional Chinese', path: '/zh-hk/', contactLabel: '聯絡方式' },
  { name: 'English', path: '/en/', contactLabel: 'Contact' }
] as const

async function waitForFooterTypography(page: Page) {
  await waitForHydration(page)
  await expect(page.locator('html')).toHaveAttribute('data-fonts-ready', /^(ready|fallback)$/)
  await page.evaluate(() => document.fonts.ready)
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
      // The visible footer shows icons only; the address/username stays accessible.
      expect((await link.textContent())?.trim()).toBe('')
      await expect(link).toHaveAttribute('aria-label', new RegExp(`${contact.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`))
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
        hitAreas: rects.map((rect) => ({ width: rect.width, height: rect.height }))
      }
    })

    expect(geometry.documentWidth, `${width}px footer overflow`).toBeLessThanOrEqual(geometry.viewportWidth)
    expect(geometry.hitAreas).toHaveLength(2)
    expect(geometry.hitAreas.every(({ width: hitWidth, height }) => hitWidth >= 44 && height >= 44)).toBe(true)
    expect(Math.abs(geometry.tops[0]! - geometry.tops[1]!), `${width}px parallel row`).toBeLessThanOrEqual(1)
  })
}

test('footer contact icons expose focus, hover, press feedback and stay legible in dark mode', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  const footer = page.locator('footer.site-footer')
  await footer.scrollIntoViewIfNeeded()
  const link = footer.locator('.foot-contact').first()

  const base = await link.evaluate((element) => {
    const style = getComputedStyle(element)
    return { background: style.backgroundColor, border: style.borderTopColor, transform: style.transform }
  })

  await link.hover()
  await expect.poll(() => link.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(base.background)
  await expect.poll(() => link.evaluate((element) => getComputedStyle(element).borderTopColor)).not.toBe(base.border)
  await expect.poll(() => link.evaluate((element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).m42)).toBe(-1)

  await link.focus()
  const focus = await link.evaluate((element) => {
    const style = getComputedStyle(element)
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth }
  })
  expect(focus.outlineStyle).toBe('solid')
  expect(Number.parseFloat(focus.outlineWidth)).toBeGreaterThan(0)

  await page.evaluate(() => document.addEventListener('click', (event) => event.preventDefault(), { once: true }))
  const box = await link.boundingBox()
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await page.mouse.down()
  await expect.poll(() => link.evaluate((element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).a)).toBeLessThan(1)
  await page.mouse.up()

  await page.evaluate(() => localStorage.setItem('yance-theme', 'dark'))
  await page.reload()
  await footer.scrollIntoViewIfNeeded()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  const darkColors = await footer.locator('.foot-contact').first().evaluate((element) => ({
    icon: getComputedStyle(element.querySelector('svg')!).color,
    background: getComputedStyle(element).backgroundColor
  }))
  expect(darkColors.icon).toBe('rgb(232, 185, 98)')
  expect(darkColors.icon).not.toBe(darkColors.background)
})