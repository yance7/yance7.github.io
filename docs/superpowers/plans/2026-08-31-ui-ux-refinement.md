# UI / UX Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在保留现有视觉语言、内容结构、多语言体系和性能预算的前提下，完成荣誉坐标档案重构、PageCompass 完全移除并保留 2px 阅读进度、页脚身份与联系方式重构。

**Architecture:** 先把荣誉数据在筛选前标注稳定坐标，再用连续台账卡片呈现；把阅读进度从 PageCompass 状态/工具中抽成独立的 `ScrollProgress.vue` 与 `scrollProgress.ts`；把页脚联系方式抽成类型安全的数据模块和统一 SVG 图标组件。三个逻辑方向分别从最新 `main` 创建顺序分支，前一个 PR 合并且 Pages/Quality 通过后再开始下一个。

**Tech Stack:** Vue 3, TypeScript, Vite MPA, Vitest, Playwright, axe, Lighthouse, npm, GitHub Actions。

**Spec:** `C:\Users\yance\.codex\attachments\5a0a1803-65c7-4327-9327-eda726bac6e3\pasted-text-1.txt`

## Global Constraints

- 只编辑 `html-src/*.html` 作为 HTML 源文件；不手工编辑根目录生成 HTML 或 `dist/`。
- 共享内容放入对应 `src/data/` 模块，页面专属视图文案放入对应 `src/pages/*.vue`。
- 三语言必须同步：`zh-CN`、`zh-HK`、`en`。
- 不引入新的 UI、图标或动画依赖；CSS 不使用 `transition: all`。
- 保留 `pageRegistry.sectionIds`、URL hash 深链接、原生滚动、页面顶部 2px 阅读进度条。
- 使用两空格缩进、单引号、无分号、kebab-case CSS class；每个 PR 只处理一个逻辑方向。
- E2E 使用语义 locator 与 `locator.click()`，不使用坐标点击、任意 sleep、`force: true` 或降低断言强度。
- 远端当前最高 PR 为 #32；方案明确列出三个功能 PR（#33–#35），未发现第四个产品方向前不凭空制造 PR #36。

---

### Task 1: R1 荣誉坐标档案与 TRAE 文案修正

**Branch:** `codex/feat/honors-coordinate-archive-refinement`

**Files:**
- Modify: `src/pages/HonorsPage.vue`, `src/styles/honors.css`, `src/data/honors.ts`
- Modify: `src/data/locales/zh-CN/honors.ts`, `src/data/locales/zh-HK/honors.ts`, `src/data/locales/en/honors.ts`
- Modify: `src/components/ArchiveFilter.vue`, `tests/i18n.test.ts`, `tests/englishContent.test.ts`, `tests/e2e/visual-matrix.spec.ts`
- Create: `tests/honorsContent.test.ts`, `tests/e2e/honors-archive.spec.ts`

**Interfaces:**
- Consumes: localized honors, categories, level labels, and existing `ArchiveFilter` event contract.
- Produces: `filteredHonors` entries carrying `coordinate`, `data-honor-filter` buttons, and non-interactive `.honor-card` records.

- [x] **Step 1: Write failing content and coordinate tests.** Assert 13 records, original order, category counts, TRAE ID/title/org in all locales, no legacy strings, default coordinates `01`–`13`, and Peak coordinates `02`, `03`, `07`, `10`.
- [x] **Step 2: Run `npm run unit -- tests/honorsContent.test.ts tests/i18n.test.ts tests/englishContent.test.ts` and confirm failure.** The failure must identify the old TRAE record or missing coordinate behavior.
- [x] **Step 3: Correct the TRAE record in all locales.** Use ID `trae-ai-2026-top-350`; use `TRAE AI 创造力大赛 · Top 350` / `约 14,000 份作品`, `TRAE AI 創造力大賽 · Top 350` / `約 14,000 份作品`, and `TRAE AI Creativity Competition · Top 350` / `Approximately 14,000 submissions`. Remove old ID, Top 300, 创意大赛/創意大賽, and entrant wording.
- [x] **Step 4: Add coordinates before filtering.** Map `{ ...honor, coordinate: index + 1 }`, filter that collection, render `String(honor.coordinate).padStart(2, '0')`, and add `:data-honor-filter="cat.key"` while preserving `aria-pressed`.
- [x] **Step 5: Replace the scattered-card visual model with one bordered archive ledger.** Use desktop columns `56px 104px minmax(0, 1fr) max-content`; use a coordinate column, date, content, and quiet level label. Keep pointer sheen but remove glowing dots, interactive semantics, pointer cursor, sticky touch hover, and reduced-motion movement.
- [x] **Step 6: Add focused Chromium coverage** for 13 records, Peak coordinates, non-interactive cards, filter hooks, light/dark themes, and 320/390/768/1024/1440 no-overflow checks.
- [ ] **Step 7: Run the R1 fast lane, `npm run check`, inspect visual diffs, commit `优化荣誉坐标档案与修正奖项信息`, push the branch, and create PR #33.** Wait for PR CI, Quality, and Pages green before merging.

---

### Task 2: R2 移除 PageCompass 并保留 ScrollProgress

**Branch:** `codex/refactor/remove-page-compass`

**Files:**
- Delete: `src/components/PageCompass.vue`, `src/composables/usePageCompass.ts`, `src/composables/usePageCompassDisclosure.ts`, `src/utils/pageCompass.ts`
- Create: `src/components/ScrollProgress.vue`
- Modify: `src/App.vue`, `src/composables/useScrollProgress.ts`, `src/utils/scrollProgress.ts`
- Modify: `src/styles/shell.css`, `src/styles/responsive.css`, `src/styles/research.css`
- Modify: `src/data/types.ts`, `src/data/locales/types.ts`, `src/data/locales/index.ts`, all three localized `site.ts` files
- Modify: `src/i18n/types.ts` and all three UI message files
- Delete/migrate: `tests/pageCompassDisclosure.test.ts`, `tests/pageCompass.test.ts` to `tests/scrollProgress.test.ts`, dedicated PageCompass E2E specs/snapshots
- Modify: named PageCompass assertions in architecture/design/i18n/English/lighthouse/adaptive tests, E2E tests, `playwright.config.ts`, `.github/workflows/quality.yml`, and `scripts/lighthouse-interactions.mjs`

**Interfaces:**
- Consumes: `useScrollProgress()` and `getScrollProgress(scrollTop, scrollHeight, viewportHeight)`.
- Produces: a top-level `ScrollProgress` progressbar on normal pages with localized label and `aria-valuenow` in 0–100.

- [ ] **Step 1: Write failing ScrollProgress tests and update absence assertions.** Cover top/middle/bottom values, finite clamping, localized label, and no PageCompass residue.
- [ ] **Step 2: Run the focused unit tests and confirm failure** against the old PageCompass utility/component contract.
- [ ] **Step 3: Move `getScrollProgress` into `src/utils/scrollProgress.ts`** beside `clampScrollProgress`; update `useScrollProgress.ts` without changing its RAF, resize, visualViewport, or ResizeObserver lifecycle.
- [ ] **Step 4: Create `ScrollProgress.vue`** with fixed 2px progressbar semantics and a child bar using `transform: scaleX()` and `transform-origin: left`; render it from `App.vue` only for normal content pages.
- [ ] **Step 5: Remove PageCompass imports/rendering/state/styles/copy/types** while retaining `pageRegistry.sectionIds`, section IDs, hash scrolling, Header behavior, and Research content width.
- [ ] **Step 6: Replace Lighthouse interaction with `honor-filter`** using `honors.html`, `[data-honor-filter="peak"]`, and `.honor-card` count 4; add `scroll-progress.spec.ts` for desktop/mobile and all locales.
- [ ] **Step 7: Delete only dedicated PageCompass snapshots and inspect all expected full-page diffs** for Linux/Windows, light/dark, 320×568, 1024×768, and 1440×900.
- [ ] **Step 8: Run the exact residue scan, full quality gates, commit `移除PageCompass并保留阅读进度`, push, and create PR #34.** The scan must produce no output:

```powershell
rg -n "PageCompass|page-compass|pageCompass|messages\.compass|has-page-compass" src tests scripts .github playwright.config.ts
```

Wait for PR CI, Quality, and Pages green before merging.

---

### Task 3: R3 页脚身份与联系方式重构

**Branch:** `codex/feat/footer-contact-system`

**Files:**
- Modify: `src/components/SiteFooter.vue`, `src/components/BrandMark.vue`, `src/styles/components.css`, `src/styles/responsive.css`, `src/data/index.ts`
- Create: `src/data/footerContacts.ts`, `src/components/FooterContactIcon.vue`, `tests/footerContacts.test.ts`, `tests/e2e/footer.spec.ts`
- Modify: `src/i18n/types.ts`, `src/i18n/ui/en.ts`, `src/i18n/ui/zh-CN.ts`, `src/i18n/ui/zh-HK.ts`

**Interfaces:**
- Consumes: `footerContacts`, `FooterContactKey`, localized `messages.footer`, `buildLocalizedPageHref`, and existing `BrandMark` variants.
- Produces: four ordered accessible footer links and a current-locale home icon link.

- [ ] **Step 1: Write failing data, i18n, SVG, and E2E contract tests.** Assert exact order/URLs, mailto behavior, external target/rel, one GitHub link, no visible `Yance.`, current-locale home href, four hidden icons, and responsive geometry.
- [ ] **Step 2: Run the focused tests and confirm failure** against the old three-link footer and old message fields.
- [ ] **Step 3: Add `footerContacts.ts`** with the exact `FooterContactKey` union and readonly Email/GitHub/Instagram/X records; export through `src/data/index.ts`.
- [ ] **Step 4: Replace footer message fields in all locales** with `homeLabel`, `contactsLabel`, `archive`, `identity`, `email`, `github`, `instagram`, and `x`; remove `profile`, `researchRepos`, and old `contact`.
- [ ] **Step 5: Implement `FooterContactIcon.vue`** with inline SVGs, `viewBox="0 0 24 24"`, `currentColor`, consistent stroke width, and `aria-hidden="true"`; add recognizable icons without dependencies.
- [ ] **Step 6: Rebuild `SiteFooter.vue`** into the icon-plus-two-line identity block and semantic `<address>` with exactly four links; use `_blank` plus `noopener noreferrer` only for external contacts and reset address italics.
- [ ] **Step 7: Implement responsive/focus-visible styling** for a 2×2 matrix through normal mobile widths, a single column only when truly narrow, 44×44 hit areas, safe email wrapping, both themes, and no `transition: all`.
- [ ] **Step 8: Run focused browser checks and full gates, inspect screenshots, commit `重构页脚身份与联系方式`, push, and create PR #35.** Wait for PR CI, Quality, and Pages green before merging.

---

### Task 4: Final production audit and delivery evidence

- [ ] **Step 1:** From merged latest `main`, run the complete production check and preview E2E matrix with isolated output directories.
- [ ] **Step 2:** Verify all 18 localized routes, header states, locale switching, FreshEye, honors, TRAE Top 350, PageCompass absence, ScrollProgress, hash links, footer contacts, concert rail/lightbox, themes, overflow, console errors, missing assets, and hydration errors.
- [ ] **Step 3:** Run Lighthouse desktop/mobile and retain raw evidence for any sampling variance; do not loosen budgets.
- [ ] **Step 4:** Confirm local `main` is clean and equals `origin/main`; record base/head SHAs, PR/Pages/Quality links, screenshots, and blockers.
- [ ] **Step 5:** Reconcile the objective's mention of PR #36 against the pasted spec, which defines only PR #33–#35. Do not fabricate a fourth product change without an independently defined scope.
