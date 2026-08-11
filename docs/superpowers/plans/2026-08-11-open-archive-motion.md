# OPEN ARCHIVE 首页与全站交互优化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (\`- [ ]\`) syntax for tracking.

**Goal:** 用主动选择的 \`OPEN ARCHIVE\` 档案索引替换首页歌词轮转与 \`LIVE INDEX\`，统一全站卡片/主题/动画状态，并移除 Works 项目名称的悬浮加粗。

**Architecture:** \`HomeHero.vue\` 保留首页首屏容器与传入文案，新建无全局副作用的 \`HomeArchiveIndex.vue\` 管理三条档案路径、roving tabindex 和当前预览；旧 \`LyricCarousel\` 不再挂载。全站通过 \`theme.css\` 增加交互 token，并在 \`styles.css\` 的统一交互层收敛卡片 hover/focus/active/reduced-motion 规则，Concerts 专辑墙继续使用自己的 scoped 样式。

**Tech Stack:** Vue 3 Composition API、TypeScript、Vite MPA、CSS custom properties、Vue \`<Transition>\`、Vitest、Playwright、axe-core。

## Global Constraints

- 首页不再渲染 \`LyricCarousel\`、\`SONG NOTES\` 或 \`LIVE INDEX\`。
- 保留现有研究、作品、学业、荣誉、演唱会事实文案和 URL，不新增未经确认的个人信息。
- 不新增图片、视频、音频、第三方运行时依赖、持续粒子或鼠标跟随效果。
- 精确指针 hover 最多 \`translateY(-3px)\`；按钮 active 反馈不超过 \`scale(.985)\`；文字字重不得因 hover 改变。
- \`prefers-reduced-motion: reduce\` 下取消揭示位移、卡片位移和首页进入动画，内容立即可用。
- 所有可操作控件保持至少 44px 触控区域，并保留统一 \`:focus-visible\` 焦点环。
- 不修改 \`html-src/*.html\`、页面 URL、Concerts 专辑墙数据、海报轮播或灯箱数据行为。

---

### Task 1: 先建立首页与 Works 的失败验收测试

**Files:**
- Modify: \`tests/e2e/site.spec.ts\`
- Test data: existing \`src/data/site.ts\` and \`src/data/projects.ts\`

**Interfaces:**
- Produces the DOM contract consumed by \`HomeArchiveIndex.vue\`: \`.home-archive-index\`, \`.home-archive-route\`, \`.home-archive-preview\`, \`data-route\`, \`aria-selected\`, \`role="tab"\`, and \`role="tabpanel"\`.

- [ ] **Step 1: Add the failing homepage contract test**

Add a test that visits \`/index.html\` and asserts the old carousel/index are gone and the new archive index is present:

~~~ts
test('home opens an interactive archive index instead of the lyric carousel', async ({ page }) => {
  await page.goto('/index.html')
  await expect(page.locator('.lyric-carousel, .home-signal, .home-signal-board')).toHaveCount(0)
  const archive = page.locator('.home-archive-index')
  await expect(archive).toBeVisible()
  await expect(archive.locator('.home-archive-route')).toHaveCount(3)
  await expect(archive.locator('.home-archive-route[aria-selected="true"]')).toHaveAttribute('data-route', 'research')
  await expect(archive.locator('.home-archive-preview')).toContainText('FishFreshNet V2')
})
~~~

- [ ] **Step 2: Add the failing selection and keyboard test**

Assert click, \`ArrowDown\`, \`Home\`, \`End\`, \`Enter\`, and \`Space\` keep the selected route, preview content, and action URL synchronized:

~~~ts
test('home archive routes synchronize selection, preview, and keyboard focus', async ({ page }) => {
  await page.goto('/index.html')
  const archive = page.locator('.home-archive-index')
  const routes = archive.locator('.home-archive-route')
  await routes.nth(1).click()
  await expect(routes.nth(1)).toHaveAttribute('aria-selected', 'true')
  await expect(archive.locator('.home-archive-preview')).toContainText('FreshEye')
  await expect(archive.locator('.home-archive-action')).toHaveAttribute('href', 'works.html')
  await routes.nth(1).focus()
  await page.keyboard.press('ArrowDown')
  await expect(routes.nth(2)).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('Home')
  await expect(routes.nth(0)).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('End')
  await expect(routes.nth(2)).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Space')
})
~~~

- [ ] **Step 3: Add responsive/theme/reduced-motion assertions**

For 1440, 1024, 768, 390, and 320px assert no horizontal overflow. For light/dark themes assert the archive root stays visible. With reduced motion, assert the root and all routes are revealed and the route preview has no transform.

- [ ] **Step 4: Add the Works font regression test**

Visit \`/works.html\`, read \`fontWeight\` and \`letterSpacing\` for both \`.sc-wordmark\` elements before and after \`page.mouse.move()\` over each \`.showcase\`, then assert each pair is unchanged.

- [ ] **Step 5: Run the new tests and verify RED**

Run:

~~~text
npx playwright test tests/e2e/site.spec.ts --grep "archive index|Works font" --workers=1
~~~

Expected: FAIL because \`.home-archive-index\` does not exist and the old \`.showcase:hover .sc-wordmark\` rule still changes computed typography.

- [ ] **Step 6: Commit the failing contract tests**

~~~text
git add tests/e2e/site.spec.ts
git commit -m "新增首页档案索引与交互回归测试"
~~~

### Task 2: Implement the OPEN ARCHIVE homepage

**Files:**
- Create: \`src/components/HomeArchiveIndex.vue\`
- Modify: \`src/components/HomeHero.vue\`
- Modify: \`src/styles.css\`

**Interfaces:**
- Consumes: \`homeSignals\` from \`src/data/site.ts\` and the existing \`kicker\`/\`copy\` props from \`HomeHero.vue\`.
- Produces: \`.home-archive-index\`, \`.home-archive-route\`, \`.home-archive-preview\`, \`.home-archive-action\`; each route exposes \`role="tab"\`, \`aria-selected\`, \`aria-controls\`, \`data-route\`, and roving \`tabindex\`.

- [ ] **Step 1: Create the route state and keyboard contract**

Implement \`HomeArchiveIndex.vue\` with a local \`activeIndex = ref(0)\`, three derived routes from \`homeSignals\`, and these behaviors:

~~~ts
function selectRoute(index: number) {
  activeIndex.value = (index + routes.length) % routes.length
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
    event.preventDefault()
    selectRoute(activeIndex.value + 1)
  }
  if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
    event.preventDefault()
    selectRoute(activeIndex.value - 1)
  }
  if (event.key === 'Home') { event.preventDefault(); selectRoute(0) }
  if (event.key === 'End') { event.preventDefault(); selectRoute(routes.length - 1) }
  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectRoute(activeIndex.value) }
}
~~~

Use \`button\` controls in a \`role="tablist"\`; only the selected route has \`tabindex="0"\`. Keep links in the preview panel so selecting a route never unexpectedly navigates.

- [ ] **Step 2: Build the preview and route markup**

Render the current \`homeSignals\` value, meta, route label, number, and existing href in the preview. Add a CSS-only archive readout made of status bars and grid rules. Do not add fake metrics or new biographical claims. Keep \`aria-live="polite"\` on the preview summary so active selection is announced.

- [ ] **Step 3: Replace the lyric hero markup**

Rewrite \`HomeHero.vue\` to remove \`LyricCarousel\`, \`homeSignals\` rail, and lyric-specific copy. Keep \`.home-hero\`, existing \`kicker\`, \`copy\`, \`#selected-work\`, and research/works/concerts navigation paths. Render \`HomeArchiveIndex\` after the identity block.

- [ ] **Step 4: Add desktop/tablet/mobile layout CSS**

Use a two-column stage at \`min-width: 900px\`, a stacked stage below it, and full-width route buttons at mobile sizes. Ensure \`min-width: 0\`, \`overflow-wrap\`, and \`max-width: 100%\` prevent overflow at 320px. Keep the signature archive path line and one-time reveal sequence; do not add autoplay.

- [ ] **Step 5: Run targeted tests and verify GREEN**

Run:

~~~text
npx playwright test tests/e2e/site.spec.ts --grep "archive index|Works font" --workers=1
~~~

Expected: all new homepage and Works tests pass.

- [ ] **Step 6: Commit the homepage implementation**

~~~text
git add src/components/HomeArchiveIndex.vue src/components/HomeHero.vue src/styles.css tests/e2e/site.spec.ts
git commit -m "重构首页为OPEN ARCHIVE档案索引"
~~~

### Task 3: Unify full-site animation and theme interaction tokens

**Files:**
- Modify: \`src/theme.css\`
- Modify: \`src/styles.css\`
- Inspect/modify only if needed: \`src/components/ThemeOrbit.vue\`, \`src/components/SiteHeader.vue\`, \`src/components/ImageLightbox.vue\`, \`src/components/AlbumWall.vue\`

**Interfaces:**
- Consumes: existing \`--ease-*\`, \`--dur-*\`, accent and surface tokens.
- Produces: shared interaction tokens and consistent hover/focus/active/reduced-motion behavior without changing page data or navigation.

- [ ] **Step 1: Add shared theme tokens**

Add light/dark values for \`--surface-hover\`, \`--interactive-shadow\`, \`--interactive-border\`, and \`--focus-ring\`; keep light surfaces readable and dark surfaces separated without hardcoded component-specific theme colors.

- [ ] **Step 2: Normalize interactive surfaces**

Update focus cards, world cards, research links/tools, honor controls, project dossiers, chapter links, album tiles, concert controls, header/footer links, and buttons so precision hover/focus uses the same duration/easing, lifts no more than 3px, and arrows move no more than 4px. Keep non-clickable article rows from presenting a false link affordance.

- [ ] **Step 3: Normalize active and focus behavior**

Make \`:active\` feedback immediate and small, preserve the existing focus trap/lightbox behavior, and ensure \`:focus-visible\` is visible in both themes. Do not use font-weight transitions for hover states.

- [ ] **Step 4: Add reduced-motion overrides**

Extend the existing reduced-motion section so route reveals, shared card transforms, button transforms, arrow transforms, and theme ripple/transition effects become immediate while visibility and keyboard behavior remain intact.

- [ ] **Step 5: Run CSS/build checks**

Run:

~~~text
npm run typecheck
npm run lint
npm run build
~~~

Expected: all pass with no new warnings.

- [ ] **Step 6: Commit the interaction system**

~~~text
git add src/theme.css src/styles.css src/components/ThemeOrbit.vue src/components/SiteHeader.vue src/components/ImageLightbox.vue src/components/AlbumWall.vue
git commit -m "统一全站动画与主题交互状态"
~~~

Only include files that actually changed in the final \`git add\` command.

### Task 4: Remove Works hover typography mutation and complete visual QA

**Files:**
- Modify: \`src/styles.css\`
- Modify: \`tests/e2e/site.spec.ts\`
- Create locally only: \`test-screenshots/open-archive-*.png\` (gitignored)

- [ ] **Step 1: Remove the typography mutation**

Delete the \`.showcase:hover .sc-wordmark\`/\`.showcase:focus-within .sc-wordmark\` rule and remove \`font-weight\`/\`letter-spacing\` from the \`.sc-wordmark\` transition. Keep the project surface lift and border feedback.

- [ ] **Step 2: Capture the visual matrix**

Using Playwright screenshots, save:

~~~text
test-screenshots/open-archive-1440-light.png
test-screenshots/open-archive-1440-dark.png
test-screenshots/open-archive-390-light.png
test-screenshots/open-archive-390-dark.png
test-screenshots/open-archive-320-dark.png
~~~

Inspect the images for hierarchy, no clipped text, visible focus, and stable card geometry.

- [ ] **Step 3: Run the full quality gate**

Run in a normal local/CI permission context if the sandbox reports Node \`spawn EPERM\`:

~~~text
npm run typecheck
npm run lint
npm run unit
npm run build
npm run smoke
npm run test:e2e -- --workers=2
~~~

Expected: typecheck/lint/build/smoke pass, Vitest tests pass, and all existing plus new Chromium/WebKit tests pass.

- [ ] **Step 4: Perform final diff and accessibility audit**

Confirm \`git diff --check\`, no generated \`dist/\` changes, no temporary probe files, no old lyric/live-index DOM, no hover font-weight rule, and axe tests remain green in both page themes.

- [ ] **Step 5: Commit the final QA adjustments**

~~~text
git add src/styles.css tests/e2e/site.spec.ts
git commit -m "完成首页交互与全站视觉验收"
~~~

### Task 5: Publish and verify deployment

**Files:**
- No source files; inspect \`.github/workflows/pages.yml\` and repository state.

- [ ] **Step 1: Verify clean main and commit range**

Run:

~~~text
git status --short --branch
git log origin/main..HEAD --oneline
~~~

- [ ] **Step 2: Push through the configured proxy**

~~~text
git -c http.proxy=http://127.0.0.1:7897 push origin main
~~~

- [ ] **Step 3: Verify remote SHA and Actions**

Confirm \`git ls-remote origin refs/heads/main\` equals local \`HEAD\`; poll the Pages workflow until the run for that SHA is \`completed/success\`.

- [ ] **Step 4: Verify the real site**

Use a real Chromium probe at desktop and 390px to confirm \`.home-archive-index\`, three routes, route selection, no horizontal overflow, and that Works no longer changes wordmark weight on hover. Confirm existing Concerts lightbox still opens and closes.

- [ ] **Step 5: Report the published commit and URLs**

Include the final commit SHA, workflow URL, live URL, verification commands, and representative screenshots in the final response.

