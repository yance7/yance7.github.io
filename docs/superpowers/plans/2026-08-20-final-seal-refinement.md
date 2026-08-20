# 全站封板级精修 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变现有视觉身份、内容与信息架构的前提下，完成全站 UI、动效、交互、代码逻辑、注释以及桌面端和移动端浏览器适配的最终封板精修。

**Architecture:** 以主题 token 和集中式响应式样式校准全站排版与空间，不重构既有页面结构；保留 `AlbumWall.vue` 的编排职责，仅把键盘导航计算抽成纯函数。通过单元测试锁定导航边界，通过 Chromium、WebKit、Firefox 与 Android 项目的 E2E 锁定标题断行、罗盘状态、输入能力、动效降级、几何尺寸和错误边界。

**Tech Stack:** Vue 3.5、TypeScript 5.9、Vite 8、Vitest 4、Playwright 1.62、ESLint 10、GitHub Pages Actions

**Spec:** `docs/superpowers/specs/2026-08-20-final-seal-refinement-design.md`

## Global Constraints

- 直接在 `main` 上提交并推送，不创建分支或 PR。
- 不更换字体、主题、主色、品牌名称、页面信息架构、展示文案、内容数据、项目 URL、章节 ID 或外部链接。
- 不新增运行时依赖、第三方动画库、客户端路由或在线图片热链。
- `html-src/*.html` 是 HTML 源文件；不得手工编辑根目录生成的 `*.html` 或 `dist/`。
- 位移不超过 3px，图标移动不超过 4px，媒体缩放不超过 1.03，按压使用 `scale(.985)`。
- 关键触控目标至少 44×44 CSS px；所有页面满足 `scrollWidth <= clientWidth`。
- fine pointer 才启用 tilt、sheen 与 magnetic；coarse pointer 禁止 hover 位移；reduced-motion 下内容立即可见且无位移、缩放、扫描、扩散或字符入场。
- 保留移动菜单、灯箱、复制、主题切换和专辑选择现有 ARIA、焦点恢复、inert 与滚动锁语义。
- `AlbumWall.vue` 继续作为专辑墙唯一编排组件，不拆分 DOM refs、ARIA live 与异步 spotlight 状态。
- 测试截图、Lighthouse 输出、Playwright 输出与 `dist/` 均不得提交。

---

### Task 1: 抽离并验证专辑网格键盘导航

**Files:**
- Create: `src/utils/albumNavigation.ts`
- Create: `tests/albumNavigation.test.ts`
- Modify: `src/components/AlbumWall.vue:1-88`

**Interfaces:**
- Consumes: `KeyboardEvent.key`、当前 tile 索引、专辑总数、由 `gridColumnCount()` 读取的当前 CSS grid 列数。
- Produces: `getAlbumNavigationIndex(input: AlbumNavigationInput): number | null`；只为 `ArrowLeft`、`ArrowRight`、`ArrowUp`、`ArrowDown`、`Home`、`End` 返回钳制后的索引。

- [ ] **Step 1: 写入失败的纯函数边界测试**

```ts
import { describe, expect, it } from 'vitest'
import { getAlbumNavigationIndex } from '../src/utils/albumNavigation'

describe('album grid keyboard navigation', () => {
  it('moves horizontally and clamps at the first and last album', () => {
    expect(getAlbumNavigationIndex({ key: 'ArrowLeft', index: 0, total: 42, columns: 6 })).toBe(0)
    expect(getAlbumNavigationIndex({ key: 'ArrowRight', index: 0, total: 42, columns: 6 })).toBe(1)
    expect(getAlbumNavigationIndex({ key: 'ArrowRight', index: 41, total: 42, columns: 6 })).toBe(41)
  })

  it('moves vertically with the rendered column count', () => {
    expect(getAlbumNavigationIndex({ key: 'ArrowUp', index: 8, total: 42, columns: 6 })).toBe(2)
    expect(getAlbumNavigationIndex({ key: 'ArrowDown', index: 8, total: 42, columns: 6 })).toBe(14)
    expect(getAlbumNavigationIndex({ key: 'ArrowDown', index: 40, total: 42, columns: 6 })).toBe(41)
  })

  it('handles home, end, invalid geometry, and non-navigation keys', () => {
    expect(getAlbumNavigationIndex({ key: 'Home', index: 17, total: 42, columns: 4 })).toBe(0)
    expect(getAlbumNavigationIndex({ key: 'End', index: 17, total: 42, columns: 4 })).toBe(41)
    expect(getAlbumNavigationIndex({ key: 'ArrowDown', index: 0, total: 1, columns: 0 })).toBe(0)
    expect(getAlbumNavigationIndex({ key: 'ArrowRight', index: -4, total: 0, columns: 3 })).toBeNull()
    expect(getAlbumNavigationIndex({ key: 'Enter', index: 3, total: 42, columns: 6 })).toBeNull()
    expect(getAlbumNavigationIndex({ key: ' ', index: 3, total: 42, columns: 6 })).toBeNull()
  })
})
```

- [ ] **Step 2: 运行测试并确认因模块不存在而失败**

Run: `npm run unit -- tests/albumNavigation.test.ts`

Expected: FAIL，错误包含 `Cannot find module '../src/utils/albumNavigation'`。

- [ ] **Step 3: 实现无 DOM 依赖的索引计算函数**

```ts
export interface AlbumNavigationInput {
  key: string
  index: number
  total: number
  columns: number
}

export function getAlbumNavigationIndex({ key, index, total, columns }: AlbumNavigationInput): number | null {
  const itemCount = Math.max(0, Math.trunc(total))
  if (itemCount === 0) return null

  const currentIndex = Math.min(Math.max(Math.trunc(index), 0), itemCount - 1)
  const columnCount = Math.max(1, Math.trunc(columns))
  const candidates: Record<string, number> = {
    ArrowLeft: currentIndex - 1,
    ArrowRight: currentIndex + 1,
    ArrowUp: currentIndex - columnCount,
    ArrowDown: currentIndex + columnCount,
    Home: 0,
    End: itemCount - 1
  }
  const candidate = candidates[key]
  return candidate === undefined
    ? null
    : Math.min(Math.max(candidate, 0), itemCount - 1)
}
```

- [ ] **Step 4: 将组件键盘处理改为消费纯函数**

```ts
import { getAlbumNavigationIndex } from '../utils/albumNavigation'

function onTileKeydown(event: KeyboardEvent, index: number) {
  if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
    event.preventDefault()
    selectAlbum(index)
    return
  }

  const nextIndex = getAlbumNavigationIndex({
    key: event.key,
    index,
    total,
    columns: gridColumnCount()
  })
  if (nextIndex === null) return
  event.preventDefault()
  selectAlbum(nextIndex, true)
}
```

- [ ] **Step 5: 运行专辑单测、类型检查和现有专辑 E2E**

Run: `npm run unit -- tests/albumNavigation.test.ts tests/architecture.test.ts`

Expected: PASS。

Run: `npm run typecheck`

Expected: PASS。

Run: `npm run test:e2e -- tests/e2e/concerts.spec.ts --project=chromium --workers=2`

Expected: PASS，方向键、循环翻页、最新异步选择和 ARIA announcement 既有断言保持通过。

- [ ] **Step 6: 提交纯逻辑边界**

```powershell
git add src/utils/albumNavigation.ts tests/albumNavigation.test.ts src/components/AlbumWall.vue
git commit -m "优化专辑墙键盘导航逻辑"
```

---

### Task 2: 统一标题断行与全站流体纵向节奏

**Files:**
- Modify: `src/theme.css:13-74`
- Modify: `src/styles/shell.css:164-552`
- Modify: `src/styles/responsive.css:1-176`
- Modify: `tests/e2e/archive.spec.ts`
- Modify: `tests/e2e/home.spec.ts`

**Interfaces:**
- Consumes: 现有 `.archive-hero`、`.hero-title`、`.lyric-char`、`.section-head h2`、`.section-head .accent` 与 `.home-stage` DOM。
- Produces: `--space-hero-block`、`--space-section-block`、`--space-section-head-gap`、`--space-mobile-shell` 四个全局空间 token；窄屏标题行几何断言。

- [ ] **Step 1: 先增加会暴露孤字与矮屏节奏问题的 E2E 断言**

在 `tests/e2e/archive.spec.ts` 增加：

```ts
test('archive titles keep balanced Chinese lines at narrow widths', async ({ page }) => {
  for (const width of [320, 360, 390, 414]) {
    await page.setViewportSize({ width, height: 844 })
    for (const route of contentRoutes) {
      await page.goto(`/${route}`)
      const lineSizes = await page.locator('.hero-title .lyric-char').evaluateAll((characters) => {
        const lines = new Map<number, number>()
        characters.forEach((character) => {
          const top = Math.round(character.getBoundingClientRect().top)
          lines.set(top, (lines.get(top) ?? 0) + 1)
        })
        return [...lines.values()]
      })
      expect(lineSizes.length, `${route} hero line count at ${width}px`).toBeGreaterThan(0)
      expect(lineSizes.every((count) => count >= 2), `${route} hero orphan at ${width}px`).toBe(true)

      const accents = await page.locator('.section-head .accent').evaluateAll((elements) =>
        elements.map((element) => {
          const rect = element.getBoundingClientRect()
          return {
            rects: element.getClientRects().length,
            inside: rect.left >= 0 && rect.right <= window.innerWidth + 1
          }
        })
      )
      expect(accents.every(({ rects, inside }) => rects === 1 && inside), `${route} accents at ${width}px`).toBe(true)
    }
  }
})
```

在 `tests/e2e/home.spec.ts` 的 viewport 矩阵加入 `{ width: 844, height: 390 }`，断言 `.home-stage-title` 与 `.home-stage-actions` 均落在首屏且页面无横向溢出。

- [ ] **Step 2: 运行新增断言并确认当前移动端孤字或矮屏几何失败**

Run: `npm run test:e2e -- tests/e2e/archive.spec.ts tests/e2e/home.spec.ts --project=chromium --workers=2`

Expected: FAIL，至少一个窄屏 Hero 行只有一个字符，或 844×390 首屏几何不满足断言。

- [ ] **Step 3: 在主题层定义流体空间 token**

在 `:root` 的尺寸 token 区域增加：

```css
--space-hero-block: clamp(5rem, 8vw, 8.5rem);
--space-section-block: clamp(4.5rem, 7vw, 7.5rem);
--space-section-head-gap: clamp(1.75rem, 3vw, 3rem);
--space-mobile-shell: clamp(1rem, 4vw, 1.5rem);
```

这些 token 只描述结构间距，不覆盖现有主题颜色或组件私有微间距。

- [ ] **Step 4: 校准 Archive Hero 与 SectionHeading 的中文断行**

对 `.hero-title` 和 `.section-head h2` 增加：

```css
text-wrap: balance;
word-break: normal;
line-break: strict;
```

在支持短语断行的浏览器中增加：

```css
@supports (word-break: auto-phrase) {
  .hero-title,
  .section-head h2 { word-break: auto-phrase; }
}
```

将 `.section-head .accent` 设为 `display: inline-block`、`max-width: 100%`，确保强调短语整体换行且不溢出。将 `.hero-title.hero-lyric` 的 flex wrapping 与移动端字号范围调到 320–414px 下每行至少两个字符；`.hero-works-title` 仅在桌面保持单行，窄屏允许均衡换行。

- [ ] **Step 5: 让页面结构消费统一节奏 token**

用 `--space-hero-block`、`--space-section-block` 和 `--space-section-head-gap` 替代 Archive Hero、主要 `.content` 段落以及 SectionHeading 到首个内容块之间重复的近似 padding/margin。手机竖屏使用 `--space-mobile-shell` 缩短导航后的空白；`@media (orientation: landscape) and (max-height: 520px)` 下缩短 Hero 上下 padding 和 min-height，但不隐藏 kicker、标题、正文或动作。

- [ ] **Step 6: 运行标题、首页、全站无溢出测试**

Run: `npm run test:e2e -- tests/e2e/archive.spec.ts tests/e2e/home.spec.ts tests/e2e/site.spec.ts --project=chromium --workers=2`

Expected: PASS；320、360、390、414、844×390 均无孤字、SectionHeading accent 分裂或横向溢出。

- [ ] **Step 7: 提交排版与节奏校准**

```powershell
git add src/theme.css src/styles/shell.css src/styles/responsive.css tests/e2e/archive.spec.ts tests/e2e/home.spec.ts
git commit -m "优化全站排版与响应式节奏"
```

---

### Task 3: 压缩移动端 PageCompass 并锁定状态优先级

**Files:**
- Modify: `src/styles/shell.css:258-418`
- Modify: `src/styles/responsive.css:328-444`
- Modify: `src/composables/usePageCompass.ts:1-229`
- Modify: `tests/e2e/site.spec.ts`
- Test: `tests/pageCompass.test.ts`

**Interfaces:**
- Consumes: `transitionMobileCompassState()` 的 `quiet | reading | visible` 状态、`mobileFocusWithin`、`data-mobile-state`。
- Produces: 保持“内部焦点 > 桌面常驻 > 移动顶部 quiet > 下滑 reading > 上滑或停止 visible”的视觉状态；340px 以下隐藏当前章节文字但保留进度与章节控制。

- [ ] **Step 1: 增加移动罗盘状态和几何失败测试**

在 `tests/e2e/site.spec.ts` 增加测试，使用 320×568、390×844、844×390 三个视口：

```ts
test('mobile compass preserves its state priority with compact geometry', async ({ page }) => {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 844, height: 390 }
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/honors.html')
    const compass = page.locator('.page-compass')

    if (viewport.width <= 760) {
      await expect(compass).toHaveAttribute('data-mobile-state', 'quiet')
      await page.evaluate(() => window.scrollTo(0, 700))
      await expect(compass).toHaveAttribute('data-mobile-state', 'reading')
      await expect.poll(() => compass.getAttribute('data-mobile-state'), { timeout: 1200 }).toBe('visible')
    } else {
      await expect(compass).toHaveAttribute('data-mobile-state', 'visible')
    }

    await compass.locator('.page-compass-top').focus()
    await expect(compass).toHaveAttribute('data-mobile-state', 'visible')
    await expect(compass.locator('.page-compass-top')).toBeFocused()

    const geometry = await compass.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      return { left: rect.left, right: rect.right, bottom: rect.bottom, width: rect.width }
    })
    expect(geometry.left).toBeGreaterThanOrEqual(0)
    expect(geometry.right).toBeLessThanOrEqual(viewport.width)
    expect(geometry.bottom).toBeLessThanOrEqual(viewport.height)

    const targets = await compass.locator('button, a').evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect()
        return { width: rect.width, height: rect.height }
      })
    )
    expect(targets.every(({ width, height }) => width >= 44 && height >= 44)).toBe(true)
  }
})
```

- [ ] **Step 2: 运行罗盘测试并确认紧凑几何或状态时序失败**

Run: `npm run test:e2e -- tests/e2e/site.spec.ts --project=chromium --grep "mobile compass preserves" --workers=1`

Expected: FAIL，当前 320px 的 visible 状态或 844×390 的几何至少有一项不满足；844px fine-pointer 仍保持桌面 `visible`，不强行套用移动滚动状态。

- [ ] **Step 3: 调整移动端罗盘视觉盒而不缩小触控目标**

在 `max-width: 760px` 规则中压缩 nav 外层 padding、列间 gap、边框半径和非交互 current 区域。保持 `.page-compass-top`、`.page-compass-link`、`.page-compass-step a` 的 44px 尺寸；`max-width: 340px` 隐藏 `.page-compass-current`，网格变为 `44px minmax(0, 1fr) 88px`。横屏矮屏将底部安全区设为 `max(8px, env(safe-area-inset-bottom))`。

- [ ] **Step 4: 为不可交换的罗盘状态优先级添加客观注释**

在 `mobileVisible` 上方增加：

```ts
// Focus visibility has priority over scroll-driven hiding so keyboard users never lose the active control.
```

在 `setupTargets()` 的 hash 初始化前增加：

```ts
// Resolve the initial hash after async page content mounts, then attach observers to the final section nodes.
```

不为简单条件、变量名或模板结构增加注释。

- [ ] **Step 5: 运行罗盘单元与 E2E 测试**

Run: `npm run unit -- tests/pageCompass.test.ts`

Expected: PASS。

Run: `npm run test:e2e -- tests/e2e/site.spec.ts --project=chromium --workers=2`

Expected: PASS；quiet、reading、visible、停止滚动恢复、焦点优先、锚点落点和 44px 目标全部通过。

- [ ] **Step 6: 提交罗盘适配**

```powershell
git add src/styles/shell.css src/styles/responsive.css src/composables/usePageCompass.ts tests/e2e/site.spec.ts tests/pageCompass.test.ts
git commit -m "优化移动端章节罗盘适配"
```

---

### Task 4: 收敛持续动画、输入能力与 AlbumWall 样式

**Files:**
- Modify: `src/components/AlbumWall.vue:90-874`
- Modify: `src/directives/pointerSheen.ts`
- Modify: `src/directives/magnetic.ts`
- Modify: `src/styles/shell.css`
- Modify: `src/styles/content.css`
- Modify: `src/styles/media.css`
- Modify: `src/theme.css:349-393`
- Modify: `tests/architecture.test.ts`
- Modify: `tests/e2e/site.spec.ts`
- Modify: `tests/e2e/concerts.spec.ts`

**Interfaces:**
- Consumes: `--dur-micro`、`--dur-fast`、`--dur-base`、`--dur-slow`、`--dur-page` 和 motion limit token；`matchMedia('(hover: hover) and (pointer: fine)')`、`prefers-reduced-motion`。
- Produces: 单一 reduced-motion AlbumWall 规则、静态仍可识别的 timeline current 状态、卸载安全的 RAF 清理、无 `transition: all` 的状态过渡。

- [ ] **Step 1: 增加静态架构约束和 reduced-motion E2E 断言**

在 `tests/architecture.test.ts` 读取 `src/**/*.css` 与 `.vue` style 内容，断言：

```ts
expect(styleSource).not.toMatch(/transition\s*:\s*all\b/)
const translatedPixels = [...styleSource.matchAll(/translate(?:X|Y)?\([^)]*?(-?\d+(?:\.\d+)?)px/g)]
  .map((match) => Math.abs(Number(match[1])))
expect(translatedPixels.every((value) => value <= 4)).toBe(true)
```

在 `tests/e2e/site.spec.ts` 的 reduced-motion 测试中遍历 `.reveal`、`.lyric-char`、`.world-card`、`.tl-item.current .tl-node`，断言 `animationName === 'none'`、`transform === 'none'` 或对应静态 transform；在 `tests/e2e/concerts.spec.ts` 断言专辑 loading 结束或 error 后 `.album-visual-slot::after` 不再运行动画。

- [ ] **Step 2: 运行架构与动效测试并记录当前重复或持续动画失败**

Run: `npm run unit -- tests/architecture.test.ts`

Expected: 新约束通过或准确指出越界声明；不得放宽正则来掩盖真实越界。

Run: `npm run test:e2e -- tests/e2e/site.spec.ts tests/e2e/concerts.spec.ts --project=chromium --grep "reduced motion|loading" --workers=2`

Expected: FAIL，当前至少一个持续 animation 或 transform 未在 reduced-motion / settled 状态清除。

- [ ] **Step 3: 合并 AlbumWall 的 reduced-motion 规则并收敛 loading 扫描**

保留一处 `@media (prefers-reduced-motion: reduce)`，集中处理 `.album-sleeve`、`.album-tile`、`.album-tile-meta`、`.album-vinyl`、`.album-visual-slot::after`。loading 扫描仅由 `[data-spotlight-state='loading']` 启用；idle、ready 和 error 均设为 `animation: none` 且不改变 `.album-visual-slot` 尺寸。

- [ ] **Step 4: 统一 fine/coarse pointer 与 RAF 生命周期**

将专辑 sleeve 的入口条件改为同时要求 `(hover: hover) and (pointer: fine)`。在 `tiltSleeve()` 中保留一次 `getBoundingClientRect()` 与一次 RAF 写入；在 `pointerleave`、`pointercancel`、directive `unmounted` 和组件 `onUnmounted` 中取消待执行 RAF 并删除 CSS 变量。

在 RAF 邻近位置添加：

```ts
// Read pointer geometry before the frame write so repeated pointer events cannot interleave layout reads and CSS updates.
```

- [ ] **Step 5: 收敛普通装饰 pulse/breathe 并补齐 forced-colors**

移除不表达 loading、online 或 current 的持续 pulse/breathe；timeline current 节点通过静态颜色、边框和光晕保持识别。为 current、selected、disabled、focus-visible 增加 `@media (forced-colors: active)` 的 `outline`、`border-color: ButtonText/Highlight` 和 `forced-color-adjust` 边界，确保状态不只依赖阴影或色相。

- [ ] **Step 6: 运行架构、交互和浏览器测试**

Run: `npm run lint && npm run typecheck && npm run unit -- tests/architecture.test.ts`

Expected: PASS。

Run: `npm run test:e2e -- tests/e2e/site.spec.ts tests/e2e/concerts.spec.ts --project=chromium --workers=2`

Expected: PASS；fine pointer 有反馈，coarse pointer 与 reduced-motion 静止，loading/error 容器稳定。

- [ ] **Step 7: 提交动效与输入能力收敛**

```powershell
git add src/components/AlbumWall.vue src/directives/pointerSheen.ts src/directives/magnetic.ts src/styles/shell.css src/styles/content.css src/styles/media.css src/theme.css tests/architecture.test.ts tests/e2e/site.spec.ts tests/e2e/concerts.spec.ts
git commit -m "优化全站动效与输入能力降级"
```

---

### Task 5: 完成全视口、全浏览器和辅助功能封板矩阵

**Files:**
- Create: `tests/e2e/final-seal.spec.ts`
- Modify: `tests/e2e/compatibility.spec.ts`
- Modify: `playwright.config.ts`

**Interfaces:**
- Consumes: 7 个页面入口、`@axe-core/playwright` 的 `AxeBuilder`、Playwright Chromium/WebKit/Firefox/Android projects。
- Produces: 手机竖屏、手机横屏、平板、桌面、亮暗主题、键盘、coarse pointer、reduced-motion 与 forced-colors 的发布证据。

- [ ] **Step 1: 新增所有页面几何与运行时错误矩阵**

`tests/e2e/final-seal.spec.ts` 定义：

```ts
import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const routes = [
  'index.html', 'academics.html', 'honors.html', 'research.html',
  'works.html', 'concerts.html', '404.html'
] as const

const viewports = [
  { width: 320, height: 568 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 414, height: 896 },
  { width: 844, height: 390 },
  { width: 768, height: 1024 },
  { width: 820, height: 1180 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1440, height: 1000 }
] as const

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
}
```

对每个组合收集 `console.error` 和 `pageerror`，断言 `documentElement.scrollWidth <= clientWidth`、首尾内容可见、sticky header 未覆盖当前锚点、关键移动控件至少 44px。404 不应渲染 PageCompass，其余 archive 页面应渲染正确章节数。

- [ ] **Step 2: 新增主题、输入与排版不跳动矩阵**

对 light/dark、keyboard focus、fine-pointer hover 分别采集 title/wordmark 的 `fontSize`、`fontWeight`、`letterSpacing`、`clientWidth`、行 top 集合；交互前后必须相同。forced-colors 下当前项和 focus-visible 必须有非零 outline 或可见 border。reduced-motion 下所有 reveal 立即可见且 `animationName` 为 `none`。

- [ ] **Step 3: 扩展 Firefox 与 Chromium Android 烟雾检查**

在 `tests/e2e/compatibility.spec.ts` 中让 Firefox 覆盖章节导航、主题切换与 direct hash；让 Chromium Android 覆盖 390px touch 菜单、PageCompass、专辑选择和横竖屏无溢出。保留 compatibility 文件只在两个 smoke project 运行的现有配置。

- [ ] **Step 4: 先运行 Chromium 与 WebKit 矩阵并修复测试发现的真实源码问题**

Run: `npm run test:e2e -- tests/e2e/final-seal.spec.ts --project=chromium --workers=2`

Expected: PASS。

Run: `npm run test:e2e -- tests/e2e/final-seal.spec.ts --project=webkit-mobile --workers=2`

Expected: PASS。

只修复被稳定复现的源码几何、焦点或状态问题；不得通过删除视口、隐藏错误或放宽 44px / overflow / orphan 阈值让测试变绿。

- [ ] **Step 5: 运行 Firefox 与 Android compatibility**

Run: `npm run test:e2e -- tests/e2e/compatibility.spec.ts --project=firefox-desktop-smoke --workers=1`

Expected: PASS。

Run: `npm run test:e2e -- tests/e2e/compatibility.spec.ts --project=chromium-android-smoke --workers=1`

Expected: PASS。

- [ ] **Step 6: 提交封板浏览器矩阵**

```powershell
git add tests/e2e/final-seal.spec.ts tests/e2e/compatibility.spec.ts playwright.config.ts
git commit -m "完善全站封板浏览器测试矩阵"
```

---

### Task 6: 清理客观注释与失效样式并执行本地发布门禁

**Files:**
- Modify: 仅限前五项任务触及且经搜索证明存在主观/重复注释或完全失效规则的源码文件
- Inspect: `src/`、`html-src/`、`public/`、`tests/`、`.github/workflows/`

**Interfaces:**
- Consumes: Task 1–5 的最终源码与测试。
- Produces: 无主观注释、无重复默认样式、无失效选择器、无无关工作区文件的可发布提交。

- [ ] **Step 1: 搜索并逐条判断注释与样式风险**

Run:

```powershell
Get-ChildItem src -Recurse -File | Select-String -Pattern @('丝滑|苹果|柔和|transition\s*:\s*all', ('TO' + 'DO'), ('FIX' + 'ME'))
```

Expected: 无主观注释、占位注释或 `transition: all`。只删除能由后续同等/更具体规则或浏览器默认值证明完全无效的声明。

- [ ] **Step 2: 为异步最新请求令牌保留一条不变量注释**

在 `useAlbumSpotlight.ts` 请求令牌检查前保留：

```ts
// Only the newest selection may commit displayed/status state after image decoding settles.
```

确认 hash 异步挂载、PageCompass 焦点优先和 pointer RAF 三类注释已在相应实现邻近位置，且没有解释显而易见代码的逐行注释。

- [ ] **Step 3: 运行全部静态与构建门禁**

Run: `npm run lint`

Expected: PASS，0 warnings。

Run: `npm run typecheck`

Expected: PASS。

Run: `npm run deadcode`

Expected: PASS。

Run: `npm run unit`

Expected: PASS。

Run: `npm run sitemap`

Expected: PASS，且 `git diff -- html-src public` 不包含非预期内容变化。

Run: `npm run build`

Expected: PASS，全部 7 个 HTML 入口与静态资源生成到忽略的 `dist/`。

Run: `npm run smoke`

Expected: PASS。

Run: `npm run links`

Expected: PASS；若代理/网络导致失败，使用 `HTTP_PROXY=http://127.0.0.1:7897` 和 `HTTPS_PROXY=http://127.0.0.1:7897` 重试，并区分网络失败与真实链接失败。

- [ ] **Step 4: 运行 Lighthouse 与完整 E2E**

Run: `npm run lighthouse`

Expected: 四项质量预算全部通过。若 Windows 唯一错误是报告已通过后的 Chrome Launcher 清理 `EPERM`，保存日志并以 GitHub Actions Linux 结果作为最终证据；任何预算失败都阻断发布。

Run: `$env:CI='1'; npm run test:e2e -- --workers=2`

Expected: Chromium、WebKit、Firefox 与 Android 项目全部通过，允许仓库既有明确 skip，不允许 flaky。

- [ ] **Step 5: 检查工作区只包含预期源码与测试**

Run: `git status --short --ignored`

Expected: tracked changes只来自本计划；`dist/`、`test-screenshots/`、`playwright-report/`、`test-results/`、`.lighthouseci/` 显示为 ignored 且未暂存。

Run: `git diff --check`

Expected: 无空白错误。

- [ ] **Step 6: 生成并人工检查封板截图证据**

使用 Playwright 在 `test-screenshots/final-seal/` 生成：首页、Academics、Honors、Research、Works、Concerts、404 的 1440×900 light、390×844 dark、844×390 light 截图。检查标题断行、章节起点、卡片边界、PageCompass、页脚安全区和媒体裁切；该目录保持 ignored。

- [ ] **Step 7: 提交最终清理**

```powershell
git add -A
git status --short
git commit -m "完成全站封板级精修"
```

提交前若 `git status --short` 出现 `dist/`、截图、报告、日志、临时脚本或与本任务无关文件，先取消暂存并保持 ignored，不得提交。

---

### Task 7: 推送 main、验证 Actions 与线上部署

**Files:**
- Inspect only: Git commit graph、GitHub Actions、GitHub Pages deployment、线上 7 个页面

**Interfaces:**
- Consumes: Task 1–6 的本地提交与全部门禁结果。
- Produces: `origin/main` 与本地 HEAD 一致、Pages workflow 全绿、线上发布内容对应最终 commit。

- [ ] **Step 1: 推送前核对分支、提交和远端差异**

Run: `git status --short --branch`

Expected: 当前分支为 `main`，工作区 clean，ahead 数量对应本轮提交。

Run: `git log --oneline origin/main..HEAD`

Expected: 只包含本计划的中文动作型提交。

- [ ] **Step 2: 通过指定代理推送 main**

```powershell
$env:HTTP_PROXY='http://127.0.0.1:7897'
$env:HTTPS_PROXY='http://127.0.0.1:7897'
git push origin main
```

Expected: `main -> main` 成功，不创建其他远端分支或 PR。

- [ ] **Step 3: 等待并验证 GitHub Actions 全部阶段**

Run: `gh run list --branch main --limit 5`

Expected: 最终 HEAD 对应的 Pages workflow 完成且 conclusion 为 success。

Run: `gh run view <最终运行 ID> --json headSha,status,conclusion,jobs,url`

Expected: lint、typecheck、deadcode、unit、sitemap、build、smoke、Lighthouse、Playwright/axe、artifact upload、deploy 全部成功；`headSha` 等于本地 `git rev-parse HEAD`。

- [ ] **Step 4: 验证线上 7 个入口与关键内容**

访问 `https://www.yance777.com/` 以及 academics、honors、research、works、concerts、404 页面，确认 HTTP 成功、标题与静态资源可加载、无控制台错误、部署 HTML 引用最终构建资产。对移动 390×844 和桌面 1440×900 各做一次线上烟雾检查。

- [ ] **Step 5: 完成要求逐项审计**

逐项对照设计规格“完成定义”：UI/排版、动画、交互、逻辑、注释、11 个视口、4 个浏览器项目、light/dark、reduced-motion、forced-colors、键盘、coarse pointer、44px、锚点、无溢出、无孤字、异步最新状态、全部本地门禁、远端 Actions、线上部署。任何证据缺失均继续修复或补测，不以“未发现问题”代替证明。
