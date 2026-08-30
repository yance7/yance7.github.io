import { expect, test, type Page } from '@playwright/test'

const routes = [
  { name: 'zh-CN', path: '/research.html' },
  { name: 'zh-HK', path: '/zh-hk/research.html' },
  { name: 'en', path: '/en/research.html' }
] as const

const viewports = [
  { name: 'narrow', width: 320, height: 844 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1024, height: 768 },
  { name: 'wide', width: 1280, height: 900 },
  { name: 'large', width: 1440, height: 1000 }
] as const

type Rect = { bottom: number; height: number; left: number; right: number; top: number; width: number }

async function expectResearchReady(page: Page, path: string, width: number, height: number) {
  await page.setViewportSize({ width, height })
  await page.goto(path)
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
}

for (const route of routes) {
  for (const viewport of viewports) {
    test(`Research content balances its available width: ${route.name} ${viewport.name}`, async ({ page }) => {
      await expectResearchReady(page, route.path, viewport.width, viewport.height)

      const geometry = await page.evaluate(() => {
        const overlaps = (left: Rect, right: Rect) => (
          left.left < right.right - .5
          && right.left < left.right - .5
          && left.top < right.bottom - .5
          && right.top < left.bottom - .5
        )
        const toRect = (element: Element): Rect => {
          const { bottom, height, left, right, top, width } = element.getBoundingClientRect()
          return { bottom, height, left, right, top, width }
        }
        const measureSurface = (selector: string) => {
          const surface = document.querySelector<HTMLElement>(selector)
          const content = surface?.closest<HTMLElement>('.content')
          if (!surface || !content) throw new Error(`${selector} is missing its content section`)

          const contentRect = toRect(content)
          const contentStyle = getComputedStyle(content)
          const paddingLeft = Number.parseFloat(contentStyle.paddingLeft)
          const paddingRight = Number.parseFloat(contentStyle.paddingRight)
          const contentLeft = contentRect.left + paddingLeft
          const contentRight = contentRect.right - paddingRight
          const rect = toRect(surface)

          return {
            availableWidth: contentRight - contentLeft,
            leftGap: rect.left - contentLeft,
            rect,
            rightGap: contentRight - rect.right,
            scrollOverflow: surface.scrollWidth - surface.clientWidth
          }
        }
        const timeline = document.querySelector<HTMLElement>('.timeline-track')
        const rail = document.querySelector<HTMLElement>('.tl-rail')
        const toolchain = document.querySelector<HTMLElement>('.toolchain-panel')
        if (!timeline || !rail || !toolchain) throw new Error('Research layout primitives are missing')

        const visibleRect = (element: Element | null) => {
          if (!element) return null
          const style = getComputedStyle(element)
          const rect = toRect(element)
          return style.display === 'none' || style.visibility === 'hidden' || rect.width === 0 || rect.height === 0
            ? null
            : rect
        }
        const railRect = toRect(rail)
        const timelineItems = [...document.querySelectorAll<HTMLElement>('.tl-item')].map((item) => {
          const date = visibleRect(item.querySelector('.tl-date'))
          const node = visibleRect(item.querySelector('.tl-node'))
          const body = visibleRect(item.querySelector('.tl-body'))
          const textRects = [...item.querySelectorAll<HTMLElement>('.tl-tag, .tl-body h3, .tl-body > p')]
            .map((element) => visibleRect(element))
            .filter((rect): rect is Rect => rect !== null)

          return {
            date,
            dateBodyOverlap: date && body ? overlaps(date, body) : false,
            node,
            nodeBodyOverlap: node && body ? overlaps(node, body) : false,
            railTextOverlap: textRects.some((rect) => overlaps(railRect, rect))
          }
        })

        const panelFlow = toolchain.querySelector<HTMLElement>('.toolchain-flow')
        const groupOverflows = [...toolchain.querySelectorAll<HTMLElement>('.toolchain-group')]
          .map((group) => group.scrollWidth - group.clientWidth)

        return {
          documentWidth: document.documentElement.scrollWidth,
          timeline: measureSurface('.timeline-track'),
          timelineItems,
          toolchain: {
            ...measureSurface('.toolchain-panel'),
            flowOverflow: panelFlow ? panelFlow.scrollWidth - panelFlow.clientWidth : Number.POSITIVE_INFINITY,
            groupOverflows,
            panelHeight: toRect(toolchain).height
          },
          viewportWidth: window.innerWidth,
          paragraphWidths: [...document.querySelectorAll<HTMLElement>('.page-research p')]
            .map((paragraph) => toRect(paragraph).width)
        }
      })

      for (const surface of [geometry.timeline, geometry.toolchain]) {
        expect(surface.rect.width).toBeGreaterThanOrEqual(surface.availableWidth * .98)
        expect(Math.abs(surface.leftGap - surface.rightGap)).toBeLessThanOrEqual(8)
        expect(surface.scrollOverflow).toBeLessThanOrEqual(1)
      }

      expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth + 1)
      expect(geometry.paragraphWidths.every((width) => width <= 701)).toBe(true)
      expect(geometry.timelineItems.every((item) => (
        !item.dateBodyOverlap && !item.nodeBodyOverlap && !item.railTextOverlap
      ))).toBe(true)
      expect(geometry.toolchain.flowOverflow).toBeLessThanOrEqual(1)
      expect(geometry.toolchain.groupOverflows.every((overflow) => overflow <= 1)).toBe(true)
      expect(geometry.toolchain.panelHeight).toBeLessThan(2400)
    })
  }
}

test('Research mobile methodology disclosure remains explicit after layout balancing', async ({ page }) => {
  await expectResearchReady(page, '/research.html', 390, 844)

  const toggle = page.locator('.method-toggle').first()
  const disclosureId = await toggle.getAttribute('aria-controls')
  const disclosure = page.locator(`#${disclosureId}`)
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(disclosure).not.toHaveClass(/open/)

  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(disclosure).toHaveClass(/open/)
})
