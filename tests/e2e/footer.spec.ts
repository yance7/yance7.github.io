import { expect, test } from '@playwright/test'

const contacts = [
  { label: '邮箱', href: 'mailto:yance777@outlook.com', value: 'yance777@outlook.com', external: false },
  { label: 'GitHub', href: 'https://github.com/yance7', value: '@yance7', external: true },
  { label: 'Instagram', href: 'https://www.instagram.com/andreasyan.826/', value: '@andreasyan.826', external: true },
  { label: 'X', href: 'https://x.com/CeYan77777', value: '@CeYan77777', external: true }
] as const

const locales = [
  { name: 'Simplified Chinese', path: '/index.html', homeHref: '/', contactLabel: '联系方式' },
  { name: 'Traditional Chinese', path: '/zh-hk/index.html', homeHref: '/zh-hk/', contactLabel: '聯絡方式' },
  { name: 'English', path: '/en/index.html', homeHref: '/en/', contactLabel: 'Contact channels' }
] as const

for (const locale of locales) {
  test(`footer exposes the localized four-contact system: ${locale.name}`, async ({ page }) => {
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
    await expect(links).toHaveCount(4)

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
    await page.goto('/index.html')
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
        gridColumns: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
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
    expect(geometry.svgCount).toBe(4)
    expect(geometry.hitAreas.every(({ width: hitWidth, height }) => hitWidth >= 44 && height >= 44)).toBe(true)
    expect(geometry.rowHeights.every((height) => Math.abs(height - geometry.rowHeights[0]!) <= 1)).toBe(true)
    if (width >= 961) {
      expect(geometry.gridColumns, `${width}px contact grid`).toBe(4)
    } else if (width >= 320) {
      expect(geometry.gridColumns, `${width}px contact grid`).toBe(2)
      expect(geometry.firstRowTopDelta, `${width}px contact first row`).toBeLessThanOrEqual(1)
    }
  })
}

test('footer contact links expose a visible keyboard focus ring', async ({ page }) => {
  await page.goto('/index.html')
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
  await page.goto('/index.html')
  const link = page.locator('.foot-contact').first()
  const coarse = await page.evaluate(() => window.matchMedia('(pointer: coarse)').matches)

  if (!coarse) {
    await link.hover()
    await page.evaluate(() => new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    }))
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

  if (coarse) {
    expect(focusedTransforms.icon).toBe('none')
    expect(focusedTransforms.arrow).toBe('none')
  } else {
    expect(focusedTransforms.icon).toBe('matrix(1.04, 0, 0, 1.04, 0, 0)')
    expect(focusedTransforms.arrow).toBe('matrix(1, 0, 0, 1, 2, -2)')
  }
})
