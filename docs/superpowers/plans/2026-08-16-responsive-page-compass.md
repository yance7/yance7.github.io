# 响应式页面罗盘与章节导航实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将全站页面罗盘重构为由统一状态驱动的响应式阅读仪表盘，提升桌面、平板、移动端和辅助技术环境下的定位稳定性与可操作性。

**Architecture:** 把进度计算和罗盘状态转换提取为纯函数，把浏览器监听、章节观察和移动端显隐集中在 `usePageCompass`；`PageCompass.vue` 只负责语义模板和事件绑定。CSS 使用现有主题 token，在 1024px、760px 和 340px 三个响应区间中调整几何结构，不通过 JS 决定布局。

**Tech Stack:** Vue 3.5、TypeScript、Vitest、Playwright、axe-core、现有 CSS token 系统和 Vite 多页面构建。

## Global Constraints

- 所有代码版本直接提交并推送 `main`，不新建分支，不创建 PR。
- 不修改任何中文或英文文案、页面内容、URL、章节 ID、外链、路由或数据顺序。
- 编辑 `src/` 与 `src/styles/` 源码；不手工修改根目录 HTML 或 `dist/`。
- 不引入新的运行时依赖。
- 保留现有 `PageCompass` 的章节链接、返回顶部、上一/下一章节、hash 定位、`aria-current`、`aria-hidden` 和 `inert` 语义。
- 所有滚动与视口监听必须使用 passive listener、单帧调度并在卸载时清理。
- 正常 hover 位移不超过 3px，移动端触控不依赖 hover，reduced-motion 取消位移和过渡动画。

---

### Task 1: 建立罗盘纯逻辑边界

**Files:**
- Create: `src/utils/pageCompass.ts`
- Modify: `src/utils/scrollProgress.ts`
- Test: `tests/pageCompass.test.ts`
- Test: `tests/robustness.test.ts`

**Interfaces:**
- Produces `getScrollProgress(scrollTop, scrollHeight, viewportHeight): number`。
- Produces `transitionMobileCompassState(input): CompassScrollState`，状态类型为 `'quiet' | 'reading' | 'visible'`。
- Produces `chooseActiveSection(candidates, anchorY, fallbackId): string`，候选项包含 `id`、`index`、`top` 和 `isIntersecting`。
- Produces `formatCompassIndex(index, total): string`，输出两位编号格式，例如 `01 / 03`。
- Preserves `clampScrollProgress(value): number` as the existing public utility.

- [ ] **Step 1: Write failing unit tests for progress and formatting**

```ts
it('calculates bounded progress for missing, negative, and oversized scroll ranges', () => {
  expect(getScrollProgress(0, 800, 800)).toBe(0)
  expect(getScrollProgress(-40, 1600, 800)).toBe(0)
  expect(getScrollProgress(400, 1600, 800)).toBe(0.5)
  expect(getScrollProgress(1800, 1600, 800)).toBe(1)
})

it('formats compass indices with stable two-digit values', () => {
  expect(formatCompassIndex(0, 3)).toBe('01 / 03')
  expect(formatCompassIndex(2, 3)).toBe('03 / 03')
})
```

- [ ] **Step 2: Run the focused unit test and verify the expected RED failure**

Run: `npx vitest run tests/pageCompass.test.ts tests/robustness.test.ts`

Expected: FAIL because `getScrollProgress`, `formatCompassIndex`, and the new compass transition helpers do not yet exist.

- [ ] **Step 3: Implement the minimal pure helpers**

Implement `getScrollProgress` by returning `0` when `scrollHeight <= viewportHeight`, otherwise clamp `scrollTop / (scrollHeight - viewportHeight)`. Implement `transitionMobileCompassState` using the existing thresholds: top position returns `quiet`, downward delta above 4px returns `reading`, upward delta below -4px returns `visible`, and smaller deltas preserve the current state. Implement `chooseActiveSection` by filtering intersecting candidates and selecting the candidate with the smallest absolute distance to `anchorY`, using `index` as a stable tie-breaker. Keep `clampScrollProgress` as a delegating utility.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run: `npx vitest run tests/pageCompass.test.ts tests/robustness.test.ts`

Expected: all focused tests pass with no TypeScript or runtime errors.

### Task 2: Centralize browser state in `usePageCompass`

**Files:**
- Create: `src/composables/usePageCompass.ts`
- Modify: `src/composables/useScrollProgress.ts`
- Test: `tests/pageCompass.test.ts`

**Interfaces:**
- `usePageCompass(sections: MaybeRefOrGetter<readonly PageCompassSection[]>)` returns `progress`, `percent`, `activeIndex`, `activeSection`, `previousSection`, `nextSection`, `mobileState`, `mobileViewport`, `mobileVisible`, `mobileDataState`, `progressStyle`, `selectSection`, and `goTop`.
- `useScrollProgress()` continues returning `progress` and `percent`, while also updating after `visualViewport` changes and document size changes.

- [ ] **Step 1: Add failing transition and active-section tests**

```ts
it('transitions the mobile compass through quiet, reading, and visible states', () => {
  expect(transitionMobileCompassState({ state: 'quiet', scrollTop: 320, previousScrollTop: 0 })).toBe('reading')
  expect(transitionMobileCompassState({ state: 'reading', scrollTop: 320, previousScrollTop: 320 })).toBe('reading')
  expect(transitionMobileCompassState({ state: 'reading', scrollTop: 280, previousScrollTop: 320 })).toBe('visible')
  expect(transitionMobileCompassState({ state: 'visible', scrollTop: 0, previousScrollTop: 280 })).toBe('quiet')
})

it('chooses the intersecting chapter nearest the reading anchor', () => {
  expect(chooseActiveSection([
    { id: 'first', index: 0, top: 180, isIntersecting: true },
    { id: 'second', index: 1, top: 210, isIntersecting: true }
  ], 200, 'first')).toBe('second')
  expect(chooseActiveSection([], 200, 'first')).toBe('first')
})
```

- [ ] **Step 2: Run the tests and verify the expected RED failure**

Run: `npx vitest run tests/pageCompass.test.ts`

Expected: FAIL on the new transition and nearest-section assertions before the composable consumes the helpers.

- [ ] **Step 3: Implement `usePageCompass` with explicit lifecycle ownership**

Use `computed(() => toValue(sections))` so page registry changes are reactive. Keep a `Map<string, IntersectionObserverEntry>` for currently intersecting chapters; on every observer callback add intersecting entries, remove exited entries, and call `chooseActiveSection` with an anchor at roughly 24% of the viewport height. Resolve a hash target before observing and update `activeId` immediately on link selection. Use the pure mobile transition helper for scroll direction, retain the existing 420ms idle reveal, and keep the compass visible whenever focus is inside it. Attach `matchMedia('(max-width: 760px)')` with an `addEventListener` path and an `addListener` fallback for older Safari/WebKit.

Add cleanup for the IntersectionObserver, media-query listener, scroll listener, idle timer, and any scheduled frame. Keep `goTop` using `auto` under reduced motion and `smooth` otherwise.

- [ ] **Step 4: Improve `useScrollProgress` without changing its public return shape**

Use the shared `getScrollProgress` helper. Register the existing scroll/resize listeners plus `visualViewport.resize` when available and a `ResizeObserver` on `document.documentElement` when supported. All sources call the same `requestAnimationFrame` scheduler. Remove every listener, observer, timeout/frame reference on unmount.

- [ ] **Step 5: Run focused tests and typecheck the composables**

Run: `npx vitest run tests/pageCompass.test.ts tests/robustness.test.ts`  
Run: `npm run typecheck`

Expected: all focused tests pass and `vue-tsc` accepts the composable interfaces.

### Task 3: Make `PageCompass.vue` a semantic presentation layer

**Files:**
- Modify: `src/components/PageCompass.vue`
- Test: `tests/e2e/compatibility.spec.ts`

**Interfaces:**
- `PageCompass.vue` consumes only the `sections` prop and the `usePageCompass` return values.
- DOM contracts remain `.scroll-progress`, `.page-compass`, `.page-compass-progress`, `.page-compass-current`, `.page-compass-link`, `.page-compass-step`, `data-mobile-state`, `aria-current`, `aria-hidden`, and `inert`.

- [ ] **Step 1: Add failing E2E assertions for semantic progress and index states**

```ts
test('PageCompass exposes progress text and a single active chapter', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/works.html')

  await expect(page.locator('.scroll-progress')).toHaveAttribute('aria-valuetext', /阅读进度/)
  await expect(page.locator('.page-compass-current span')).toHaveText('01 / 03')
  await expect(page.locator('.page-compass-link.active')).toHaveCount(1)
  await expect(page.locator('.page-compass-link.active span')).toHaveText('01')
  await expect(page.locator('.page-compass-link.active')).toHaveAttribute('aria-current', 'location')
})
```

- [ ] **Step 2: Run the focused E2E test and verify the expected RED failure**

Run: `$env:CI='1'; npx playwright test tests/e2e/compatibility.spec.ts -g "progress text and a single active chapter" --workers=2`

Expected: FAIL because the current progressbar lacks `aria-valuetext` and the template still owns the old state implementation.

- [ ] **Step 3: Replace component-local browser logic with composable bindings**

Remove duplicated observers, timers, viewport state and scroll handlers from `PageCompass.vue`. Bind the composable outputs to the existing template. Add `aria-valuetext="页面阅读进度 ${percent}%"` to the progressbar, preserve the percent in the return-top button label/title, and use `formatCompassIndex(activeIndex, sections.length)` for the current index. Keep all existing chapter labels, IDs, hrefs and button text unchanged.

Ensure `aria-live="polite"` is attached only to the current chapter container, not to the rapidly changing percent value. Preserve focus-in/focus-out behavior and do not make a hidden mobile compass focusable.

- [ ] **Step 4: Run the focused E2E suite and verify GREEN**

Run: `$env:CI='1'; npx playwright test tests/e2e/compatibility.spec.ts -g "PageCompass|hash navigation" --workers=2`

Expected: existing mobile direction, hash synchronization, keyboard focus, and new semantic progress assertions pass.

### Task 4: Refine the compass visual system across device classes

**Files:**
- Modify: `src/theme.css`
- Modify: `src/styles/shell.css`
- Modify: `src/styles/responsive.css`
- Test: `tests/e2e/compatibility.spec.ts`

**Interfaces:**
- Preserve existing theme token names and add only compass-specific semantic tokens when a hardcoded color or shadow cannot use an existing token.
- Preserve `.page-compass-quiet`, `.page-compass-reading`, `.page-compass-link.active`, and `.page-compass-step-disabled` contracts.

- [ ] **Step 1: Add failing viewport and visual-state assertions**

```ts
test('compass stays inside the viewport and keeps touch targets usable', async ({ page }) => {
  for (const width of [320, 390, 768, 820, 1024, 1440]) {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/research.html')
    const box = await page.locator('.page-compass').boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(width)
    if (width <= 1024) {
      const linkBox = await page.locator('.page-compass-link').first().boundingBox()
      expect(linkBox!.width).toBeGreaterThanOrEqual(44)
      expect(linkBox!.height).toBeGreaterThanOrEqual(44)
    }
  }
})
```

- [ ] **Step 2: Run the focused E2E test and verify the expected RED failure**

Run: `$env:CI='1'; npx playwright test tests/e2e/compatibility.spec.ts -g "inside the viewport" --workers=2`

Expected: fail at the current tablet touch target or narrow-screen geometry before the responsive refinements are applied.

- [ ] **Step 3: Implement the visual refinements**

Update the compass shell to use safe viewport fallbacks (`50vh` followed by `50dvh` where supported), a bounded max height, `contain: layout paint`, and a right-side clearance that respects the wide content column. Make the active numbered link visibly selected with the existing semantic control surface, gold indicator, tabular numerals, and a stable focus ring; keep label reveal as a desktop hover/focus enhancement only.

At 761–1024px, keep the right rail but set numbered links and step controls to at least 44px. At 760px and below, use a bottom dock with `width: min(370px, calc(100vw - 12px))`, `min()`/`max()` fallbacks, `env(safe-area-inset-bottom)`, `min-width: 0`, and a three-number rail that cannot overflow at 320px. Keep the current chapter label ellipsized rather than forcing page width. Add an orientation-landscape adjustment for short mobile viewports and a `forced-colors: active` fallback for borders and active markers.

All transitions must continue to use the global duration/easing tokens. The reduced-motion block must remove translation, scale and opacity motion while keeping the component’s final visible/hidden state.

- [ ] **Step 4: Run viewport and theme tests and inspect screenshots**

Run: `$env:CI='1'; npx playwright test tests/e2e/compatibility.spec.ts -g "inside the viewport|theme|reduced" --workers=2`

Save review screenshots under `test-screenshots/` for light/dark desktop at 1440px, light/dark tablet at 820px, and light/dark mobile at 320px and 390px. Inspect the rail/dock placement, active index, ring percentage, focus state, safe-area clearance and absence of text overlap.

### Task 5: Expand cross-browser and interaction regression coverage

**Files:**
- Modify: `tests/e2e/compatibility.spec.ts`
- Modify: `tests/e2e/site.spec.ts`
- Modify: `tests/architecture.test.ts`

**Interfaces:**
- Test existing page routes from `htmlPageEntries` without adding routes or content.
- Use Playwright’s `emulateMedia` only for test environments; production behavior remains CSS/media-query driven.

- [ ] **Step 1: Add failing regression cases for reduced motion, keyboard, resize, and section navigation**

Add tests that:

```ts
await page.emulateMedia({ reducedMotion: 'reduce' })
await page.goto('/works.html')
await expect(page.locator('.page-compass')).toHaveCSS('transition-duration', /0\.01ms|0s/)

await page.locator('.page-compass-link[href="#project-encore"]').focus()
await expect(page.locator('.page-compass-link[href="#project-encore"]')).toBeFocused()
await page.keyboard.press('Enter')
await expect(page).toHaveURL(/#project-encore$/)

await page.setViewportSize({ width: 390, height: 844 })
await page.setViewportSize({ width: 844, height: 390 })
await expect(page.locator('.page-compass')).toBeVisible()
```

Also verify all routes have exactly one active chapter and no horizontal overflow at the required viewport list.

- [ ] **Step 2: Run the focused cases and verify the expected RED failure**

Run: `$env:CI='1'; npx playwright test tests/e2e/compatibility.spec.ts tests/e2e/site.spec.ts -g "compass|reduced|resize|overflow" --workers=2`

Expected: at least the new resize or reduced-motion assertion fails before the full cross-device refinements are complete.

- [ ] **Step 3: Implement only the minimum test-facing behavior required by the design**

Adjust the implementation when a test exposes an actual state, focus, or viewport defect; do not weaken assertions or change content to make a test pass. Add architecture assertions for the new utility/composable boundary and preserve the existing page registry contracts.

- [ ] **Step 4: Run the focused cross-browser matrix**

Run: `$env:CI='1'; npx playwright test tests/e2e/compatibility.spec.ts tests/e2e/site.spec.ts --project=chromium --project=webkit --project=firefox --workers=2`

Expected: all selected browser projects pass with no flaky retries; axe checks remain clean.

### Task 6: Full verification and direct `main` release

**Files:**
- Verify: `src/components/PageCompass.vue`
- Verify: `src/composables/usePageCompass.ts`
- Verify: `src/composables/useScrollProgress.ts`
- Verify: `src/utils/pageCompass.ts`
- Verify: `src/utils/scrollProgress.ts`
- Verify: `src/styles/shell.css`
- Verify: `src/styles/responsive.css`
- Verify: `src/theme.css`
- Verify: `tests/pageCompass.test.ts`
- Verify: `tests/e2e/compatibility.spec.ts`
- Verify: `tests/e2e/site.spec.ts`

**Interfaces:**
- The release contains only source, tests, and documentation changes; no generated `dist/` files are staged.
- Remote `origin/main` must equal the release commit after push.

- [ ] **Step 1: Run all local quality gates from a clean build state**

Run:

```powershell
npm run lint
npm run typecheck
npm run unit
npm run deadcode
npm run sitemap
npm run build
npm run smoke
$env:CI='1'; npm run test:e2e -- --workers=2
```

Expected: every command exits 0; unit and E2E output reports zero failures and no flaky retries.

- [ ] **Step 2: Inspect the final diff and generated artifact boundary**

Run: `git diff --check; git status --short --branch; git diff --stat`

Confirm only the planned source, test, and documentation files changed; `dist/` is not tracked or manually edited; no text/data/URL files changed.

- [ ] **Step 3: Commit directly to `main`**

```powershell
git add -A
git commit -m "优化全站响应式罗盘与章节导航"
```

- [ ] **Step 4: Push directly through the configured proxy**

```powershell
$env:HTTP_PROXY='http://127.0.0.1:7897'
$env:HTTPS_PROXY='http://127.0.0.1:7897'
git -c http.proxy=$env:HTTP_PROXY -c https.proxy=$env:HTTPS_PROXY push origin main
```

- [ ] **Step 5: Verify GitHub Actions, Pages, and branch policy**

Confirm the workflow for the release SHA succeeds, the Pages URL serves the release artifact, `git ls-remote origin refs/heads/main` matches the local commit, the repository has only `main`, and there are no open PRs.
