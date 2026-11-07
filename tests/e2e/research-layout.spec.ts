import { expect, test, type Page } from '@playwright/test'

const routes = [
  { name: 'zh-CN', path: '/research/' },
  { name: 'zh-HK', path: '/zh-hk/research/' },
  { name: 'en', path: '/en/research/' }
] as const

test('research reading state preserves the revealed timeline geometry', async ({ page }) => {
  await page.goto('/research/')
  await expect(page.locator('.site-shell')).toHaveAttribute('data-page-load-state', 'ready')
  await expect(page.locator('html')).toHaveAttribute('data-fonts-ready', 'ready')
  const item = page.locator('#fishfreshnet-v1')
  await item.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }))
  await expect(item).toHaveAttribute('data-reading-state', 'current')
  await expect(item).toHaveClass(/reveal/)
  await expect(item).toHaveClass(/revealed/)
  await expect(item).toHaveCSS('transform', 'none')
  await page.locator('#fresheye').evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }))
  await expect(item).toHaveAttribute('data-reading-state', 'idle')
  await expect(item).toHaveClass(/revealed/)
  await expect(item).toHaveCSS('transform', 'none')
})

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

const citationPapers = [
  { id: 'fishfreshnet-v1', citationStart: '@INPROCEEDINGS{11605650', toggleKey: 'Enter' },
  { id: 'corn-growth', citationStart: '@article{bioconf202623702029', toggleKey: 'Space' }
] as const
const citationViewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 1000 }
] as const

for (const paper of citationPapers) {
  for (const viewport of citationViewports) {
    test(`Research citation panel keeps full width and stable actions: ${paper.id} ${viewport.name}`, async ({ page }) => {
      await expectResearchReady(page, '/research/', viewport.width, viewport.height)

      const item = page.locator(`#${paper.id}`)
      await item.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }))
      await expect(item).toHaveClass(/revealed/)
      await expect(item).toHaveCSS('transform', 'none')
      await page.evaluate(() => new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      }))
      const actions = item.locator('.tl-actions')
      const button = actions.locator('.copy-citation')
      await expect(button).toHaveCount(1)
      await expect(actions.locator('.citation-source')).toHaveCount(0)

      const before = await actions.evaluate((element) => {
        const rect = element.getBoundingClientRect()
        const itemRect = element.closest('.tl-item')!.getBoundingClientRect()
        return { height: rect.height, left: rect.left, top: rect.top - itemRect.top, width: rect.width }
      })

      const summary = item.locator('.citation-source summary')
      await summary.focus()
      await expect(summary).toBeFocused()
      await page.keyboard.press(paper.toggleKey)
      await expect(item.locator('.citation-source')).toHaveAttribute('open', '')
      await expect(item.locator('.citation-source pre')).toBeVisible()
      await page.evaluate(() => new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      }))

      const geometry = await item.evaluate((element) => {
        const body = element.querySelector<HTMLElement>('.tl-body')!
        const source = element.querySelector<HTMLElement>('.citation-source')!
        const pre = source.querySelector('pre')!
        const actions = element.querySelector<HTMLElement>('.tl-actions')!
        const doi = element.querySelector<HTMLElement>('.tl-doi')
        const bodyStyle = getComputedStyle(body)
        const preStyle = getComputedStyle(pre)
        const bodyRect = body.getBoundingClientRect()
        const itemRect = element.getBoundingClientRect()
        const sourceRect = source.getBoundingClientRect()
        const actionsRect = actions.getBoundingClientRect()
        const doiRect = doi?.getBoundingClientRect()
        const overlaps = (left: DOMRect, right: DOMRect) => (
          left.left < right.right - .5
          && right.left < left.right - .5
          && left.top < right.bottom - .5
          && right.top < left.bottom - .5
        )

        return {
          actionsAfter: {
            height: actionsRect.height,
            left: actionsRect.left,
            top: actionsRect.top - itemRect.top,
            width: actionsRect.width
          },
          bodyContentLeft: bodyRect.left + Number.parseFloat(bodyStyle.paddingLeft),
          bodyContentWidth: body.clientWidth - Number.parseFloat(bodyStyle.paddingLeft) - Number.parseFloat(bodyStyle.paddingRight),
          documentWidth: document.documentElement.scrollWidth,
          doiActionsOverlap: doiRect ? overlaps(doiRect, actionsRect) : false,
          preMaxHeight: preStyle.maxHeight,
          preOverflowY: preStyle.overflowY,
          preVisible: preStyle.display !== 'none' && preStyle.visibility !== 'hidden' && pre.getBoundingClientRect().height > 0,
          preWidth: pre.getBoundingClientRect().width,
          sourceLeft: sourceRect.left,
          sourceWidth: sourceRect.width,
          viewportWidth: window.innerWidth
        }
      })

      expect(geometry.documentWidth, `${paper.id} ${viewport.name} overflow`).toBeLessThanOrEqual(geometry.viewportWidth + 1)
      expect(geometry.preVisible).toBe(true)
      expect(geometry.preMaxHeight).toBe('256px')
      expect(geometry.preOverflowY).toBe('auto')
      expect(Math.abs(geometry.sourceWidth - geometry.bodyContentWidth), `${paper.id} ${viewport.name} source width`).toBeLessThanOrEqual(1)
      expect(Math.abs(geometry.sourceLeft - geometry.bodyContentLeft), `${paper.id} ${viewport.name} source left`).toBeLessThanOrEqual(1)
      expect(geometry.preWidth, `${paper.id} ${viewport.name} pre width`).toBeLessThanOrEqual(geometry.sourceWidth + 1)
      expect(geometry.doiActionsOverlap, `${paper.id} ${viewport.name} DOI overlap`).toBe(false)
      expect(Math.abs(geometry.actionsAfter.width - before.width), `${paper.id} ${viewport.name} actions width`).toBeLessThanOrEqual(1)
      expect(Math.abs(geometry.actionsAfter.height - before.height), `${paper.id} ${viewport.name} actions height`).toBeLessThanOrEqual(1)
      expect(Math.abs(geometry.actionsAfter.left - before.left), `${paper.id} ${viewport.name} actions left`).toBeLessThanOrEqual(1)
      expect(Math.abs(geometry.actionsAfter.top - before.top), `${paper.id} ${viewport.name} actions top`).toBeLessThanOrEqual(1)
    })
  }
}

test('Research mobile methodology disclosure remains explicit after layout balancing', async ({ page }) => {
  await expectResearchReady(page, '/research/', 390, 844)

  const toggle = page.locator('.method-toggle').first()
  const disclosureId = await toggle.getAttribute('aria-controls')
  const disclosure = page.locator(`#${disclosureId}`)
  const details = page.locator('.tl-method').first()
  await expect(details).not.toHaveAttribute('open')
  await expect(disclosure).not.toHaveClass(/open/)

  await toggle.click()
  await expect(details).toHaveAttribute('open', '')
  await expect(disclosure).toHaveClass(/open/)
})
