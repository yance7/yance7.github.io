# 首页歌词轮播 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended) or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 恢复首页两处 `Yance.` 锚点，新增可访问的歌词轮播，并统一其在双主题、移动端与 reduced-motion 下的交互表现。

**Architecture:** 在 `src/data/site.ts` 维护静态歌词记录，在 `src/components/LyricCarousel.vue` 内封装定时器、暂停条件、键盘导航和 ARIA 状态；`ArchiveHero.vue` 只负责把轮播放入首页主视觉。共享 `styles.css` 只增加轮播、wordmark 和响应式规则，不改变其他页面的数据边界。

**Tech Stack:** Vue 3 Composition API、TypeScript、现有 CSS 令牌与 Vue `<Transition>`、Playwright、axe-core。

## Global Constraints

- 编辑 `src/` 与 `tests/` 源文件，禁止手工编辑根目录 HTML 或 `dist/`。
- 复用现有 `--gold`、`--aqua`、`--control-*`、`--focus`、`--dur-*` 令牌，不新增前端依赖。
- `prefers-reduced-motion: reduce` 必须移除自动轮播与位移动效，但不能移除内容或键盘操作。
- 歌词只使用短句，并展示歌手与歌曲来源。
- 代码遵循两空格缩进、单引号、分号与现有 Vue 命名约定。

---

### Task 1: 验证与建模歌词数据

**Files:**
- Modify: `src/data/types.ts`
- Modify: `src/data/site.ts`
- Test: `tests/e2e/site.spec.ts`

**Interfaces:**
- Produces `HomeLyric` records with `id`, `artist`, `song`, `quote` and `accent`.

- [x] **Step 1: Write the failing E2E assertions** for the two wordmarks, `.lyric-carousel`, first two artists, and reduced-motion state.
- [x] **Step 2: Run the targeted tests** with `npx playwright test tests/e2e/site.spec.ts --project=chromium --grep "home keeps|home lyric"`; expected failure is missing `.wordmark`/`.lyric-carousel`.
- [x] **Step 3: Add the `HomeLyric` type and eight short lyric records.**
- [x] **Step 4: Run `npm run typecheck`** and confirm the data contract compiles.

### Task 2: Implement the isolated carousel behavior

**Files:**
- Create: `src/components/LyricCarousel.vue`
- Modify: `src/components/ArchiveHero.vue`
- Modify: `src/styles.css`

**Interfaces:**
- `LyricCarousel.vue` consumes `homeLyrics` and exposes a root `.lyric-carousel[data-index]` with controls labelled `上一句`, `暂停轮播`/`继续轮播`, `下一句`, and `播放轮播` for reduced motion.

- [x] **Step 1: Render the active quote and controls** with a keyed Vue transition and semantic slide/region labels.
- [x] **Step 2: Add the timer lifecycle**: six-second timeout, reset after manual navigation, pause on hover/focus/hidden document/manual pause, and no timer under reduced motion.
- [x] **Step 3: Add keyboard navigation and progress indicator** without moving the interactive target during touch interaction.
- [x] **Step 4: Add the compact desktop/mobile and light/dark styles** using existing theme tokens.
- [x] **Step 5: Run the targeted carousel tests** and confirm they pass in Chromium.

### Task 3: Restore both `Yance.` anchors and integrate the homepage

**Files:**
- Modify: `src/components/SiteHeader.vue`
- Modify: `src/components/SiteFooter.vue`
- Modify: `src/components/ArchiveHero.vue`
- Modify: `src/styles.css`

**Interfaces:**
- Header and footer use the existing `.wordmark` class so the same visual language can be tested and maintained.

- [x] **Step 1: Restore the header wordmark** with `Yance.` as the accessible link name and retain mobile fit.
- [x] **Step 2: Restore the footer left brand mark** with visible `Yance.` text and archive descriptor.
- [x] **Step 3: Replace the old home statement markup** with `LyricCarousel`, preserving the home copy, actions, and live index.
- [x] **Step 4: Run targeted E2E tests** for anchors, navigation and carousel together.

### Task 4: Full verification and deployment

**Files:**
- Modify: `tests/e2e/site.spec.ts` only if test selectors need final stabilization.

- [ ] **Step 1: Run `npm run typecheck`.**
- [ ] **Step 2: Run `npm run lint`.**
- [ ] **Step 3: Run `npm run unit`.**
- [ ] **Step 4: Run `npm run build` and `npm run smoke`.**
- [ ] **Step 5: Run `npm run test:e2e -- --workers=2` in Chromium and WebKit mobile.**
- [ ] **Step 6: Capture light/dark desktop and 320px/390px screenshots for visual review.**
- [ ] **Step 7: Inspect `git diff --check`, commit the feature, push `main`, and verify the Pages workflow and live domain.**
