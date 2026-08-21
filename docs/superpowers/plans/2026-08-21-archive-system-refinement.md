# Personal Archive System Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将建议报告中的 P0、P1、P2 视觉系统、交互、性能、可访问性和发布治理改进落实到现有 Personal Archive，同时保持内容和 MPA 架构不变。

**Architecture:** 保留 html-src 多页入口、统一 App.vue、pageRegistry 和动态 page import。先建立语义 token、交互层级和行为测试，再拆分页面 CSS 与 Lighthouse 矩阵；页面级样式从异步 page component 进入对应 chunk，主题 token 继续由现有 src/theme.css 和 Vite HTML plugin 提供。

**Tech Stack:** Vue 3.5, TypeScript, Vite 8, Vitest, Playwright, axe-core, Lighthouse CI, Python/Pillow。

**Spec:** docs/superpowers/specs/2026-08-21-archive-system-refinement-design.md

## Global Constraints

- 不修改 src/data/*.ts 中的个人内容、成绩、研究结果、项目名称和演唱会记录。
- 不修改 html-src/*.html 中已有的页面文案和个人基本信息。
- 保留 Vue 3 + Vite MPA，不引入 Router、WebGL、Three.js、tracker、Cookie banner 或自动播放媒体。
- 亮色/暗色、reduced motion、coarse pointer、forced colors、键盘导航和深链接必须继续可用。
- dist/ 只能通过 npm run build 生成，不手工编辑。
- 直接在 main 上提交并 push；不创建 branch，不创建 PR。
- 每个生产行为变更必须先有一个会失败的测试，再写最小实现。

---

### Task 1: 建立设计契约和媒体治理记录

**Files:**
- Create: tests/designTokens.test.ts
- Create: tests/reveal.test.ts
- Create: ASSET_RIGHTS.md
- Create: docs/privacy-release-checklist.md
- Modify: vitest.config.ts only if the new tests need an explicit include adjustment

**Interfaces:**
- Produces token and behavior contracts used by Tasks 2–4.
- Produces a rights/privacy audit record without making unverified ownership claims.

- [ ] **Step 1: Write failing design-token tests**

Add tests that read the source CSS and assert the public contract:

~~~
it('defines the archive typography and layout scale', () => {
  const theme = readFileSync(resolve(process.cwd(), 'src/theme.css'), 'utf8')
  const base = readFileSync(resolve(process.cwd(), 'src/styles/base.css'), 'utf8')

  expect(theme).toContain('--type-body-size: 1rem')
  expect(theme).toContain('--type-meta-size: .75rem')
  expect(theme).toContain('--w-editorial: 700px')
  expect(theme).toContain('--w-data: 840px')
  expect(base).toContain('font-size: var(--type-body-size)')
})
~~~

- [ ] **Step 2: Run the new test and confirm RED**

Run: npm run unit -- tests/designTokens.test.ts

Expected: failure because the semantic variables do not exist yet; it must not fail because of a syntax or import error.

- [ ] **Step 3: Write failing Reveal-mode tests**

Define this pure helper contract before changing the directive:

~~~
it('chooses immediate mode when IntersectionObserver is unavailable or motion is reduced', () => {
  expect(getRevealMode({ supportsIntersectionObserver: false, prefersReducedMotion: false })).toBe('immediate')
  expect(getRevealMode({ supportsIntersectionObserver: true, prefersReducedMotion: true })).toBe('immediate')
  expect(getRevealMode({ supportsIntersectionObserver: true, prefersReducedMotion: false })).toBe('observer')
})
~~~

- [ ] **Step 4: Run the Reveal test and confirm RED**

Run: npm run unit -- tests/reveal.test.ts

Expected: import failure for the not-yet-created helper, not a test-environment failure.

- [ ] **Step 5: Add the initial rights audit**

Create ASSET_RIGHTS.md with rows for album covers, concert posters, concert photographs, OG images, FreshEye case image, lyrics/song-title attribution, audio and video. Record known facts only: album source documentation points to Apple Music CDN and Apple Music pages; all other ownership/licensing fields are 待确认 until the owner confirms them. Include a release checklist for EXIF/GPS, QR codes, seat numbers, private contact information, addresses and real-time location.

- [ ] **Step 6: Add the privacy release checklist**

Create docs/privacy-release-checklist.md with checks for address, real-time location, inferred routine, private phone, unintended account exposure, EXIF/GPS removal, certificate identifiers, and concert ticket QR/seat review. State that the current site stores only yance-theme locally and has no analytics/tracker consent flow.

- [ ] **Step 7: Commit the contracts and governance documents**

~~~
git add tests/designTokens.test.ts tests/reveal.test.ts ASSET_RIGHTS.md docs/privacy-release-checklist.md
git commit -m "新增个人档案设计与发布审计契约"
~~~

Push this commit to main after the repository checks in the current task are clean.

### Task 2: Implement the semantic visual token system

**Files:**
- Modify: src/theme.css
- Modify: src/styles/base.css
- Modify: src/styles/content.css
- Modify: src/styles/shell.css
- Modify: src/styles/media.css
- Modify: src/styles/works.css
- Modify: src/styles/responsive.css
- Test: tests/designTokens.test.ts

**Interfaces:**
- Consumes the token contract from Task 1.
- Produces type, width, spacing, radius and motion contracts used by all styles.

- [ ] **Step 1: Add semantic aliases and run the token test**

Add these values to :root in src/theme.css while preserving old aliases:

~~~
--font-prose: "Inter Variable", "Noto Sans SC Variable", sans-serif;
--font-editorial: "Inter Variable", "Noto Serif SC Variable", serif;
--font-technical: "IBM Plex Mono", "Noto Sans SC Variable", monospace;
--type-body-size: 1rem;
--type-body-leading: 1.78;
--type-secondary-size: .8125rem;
--type-meta-size: .75rem;
--tracking-latin-meta: .14em;
--tracking-latin-wide: .18em;
--tracking-zh-meta: .06em;
--tracking-editorial: -.01em;
--w-editorial: 700px;
--w-data: 840px;
--radius-small: 6px;
--radius-card: 14px;
--radius-large: 20px;
--radius-pill: 999px;
~~~

Set --sans, --display, --mono, --text-micro, --text-xs, --text-sm and --w-read to compatibility aliases of the semantic values.

Run: npm run unit -- tests/designTokens.test.ts

Expected: PASS.

- [ ] **Step 2: Apply body and metadata scale**

Change body to use font-size: var(--type-body-size) and line-height: var(--type-body-leading). Replace metadata uses of --text-micro that describe navigation, buttons, statuses, links and important labels with --type-meta-size; leave only decorative text at the smallest compatibility size. Use --type-secondary-size for secondary prose.

- [ ] **Step 3: Apply explicit typography roles**

Use --font-prose for body and ordinary UI, --font-editorial for archive titles, and --font-technical for coordinates and technical labels. Replace broad hard-coded letter spacing with the tracking tokens according to semantic role; do not apply wide tracking to Chinese prose or titles.

- [ ] **Step 4: Apply editorial/data widths and spacing tokens**

Use --w-editorial for section heads, section copy, research descriptions and prose; use --w-data for AP panels, research timeline/toolchain and data-heavy archive panels. Add the 4px spacing scale and replace touched components’ arbitrary 18/22/26/28/30px values with 4/8/12/16/24/32/48px values.

- [ ] **Step 5: Apply radius and motion budgets**

Map touched surfaces to 6px, 14px, 20px or pill radius. Shorten --dur-slow and --dur-page into the 450–600ms budget, and keep micro/component transitions within 120–280ms. Preserve all reduced-motion overrides.

- [ ] **Step 6: Run focused checks**

~~~
npm run lint -- src/theme.css src/styles/base.css src/styles/content.css src/styles/shell.css src/styles/media.css src/styles/works.css src/styles/responsive.css
npm run unit -- tests/designTokens.test.ts
~~~

Expected: both commands exit 0.

- [ ] **Step 7: Commit the token pass**

~~~
git add src/theme.css src/styles/base.css src/styles/content.css src/styles/shell.css src/styles/media.css src/styles/works.css src/styles/responsive.css tests/designTokens.test.ts
git commit -m "优化个人档案排版与视觉设计令牌"
~~~

### Task 3: Reduce visual competition and unify navigation hierarchy

**Files:**
- Modify: src/styles/content.css
- Modify: src/styles/shell.css
- Modify: src/styles/media.css
- Modify: src/styles/responsive.css
- Modify: src/pages/HomePage.vue
- Modify: tests/e2e/home.spec.ts
- Modify: tests/e2e/site.spec.ts

**Interfaces:**
- Consumes semantic tokens from Task 2.
- Preserves all page links, data loops, section ids, compass labels and current page navigation.

- [ ] **Step 1: Add failing browser contracts**

Add tests for static metrics and desktop progress hierarchy:

~~~
test('static metric surfaces do not advertise elevation on hover', async ({ page }) => {
  await page.goto('/academics.html')
  const metric = page.locator('.metric-card').first()
  const before = await metric.evaluate((element) => getComputedStyle(element).transform)
  await metric.hover()
  const after = await metric.evaluate((element) => getComputedStyle(element).transform)
  expect(after).toBe(before)
})

test('desktop PageCompass is the primary progress surface', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/research.html')
  await expect(page.locator('.page-compass')).toBeVisible()
  await expect(page.locator('.scroll-progress')).toHaveCSS('opacity', /0(?:\\.0*|)$/)
})
~~~

- [ ] **Step 2: Run the browser tests and confirm RED**

Run: npm run test:e2e -- tests/e2e/home.spec.ts tests/e2e/site.spec.ts --project=chromium

Expected: the new assertions fail against the current lift and scroll-progress styles.

- [ ] **Step 3: Remove static elevation**

Remove transform and interactive shadow from .metric-card:hover, .toolchain-group:hover and unused/non-clickable leadership surfaces. Keep elevation for world cards, focus cards, project links, buttons, filters, selectable album tiles, poster controls and actual CTAs.

- [ ] **Step 4: Reduce decorative stacking**

Keep at most two environmental treatments per surface. Remove pointer sheen from the five non-featured home world links; retain it for the project showcase and selected media surfaces where it communicates an interactive artifact.

- [ ] **Step 5: Make PageCompass primary on desktop and light on mobile**

Add a desktop-only rule scoped by .site-shell.has-page-compass that reduces the horizontal .scroll-progress to a quiet non-competing state, while keeping mobile progress visible and preserving progressbar semantics. Do not remove it from the accessibility tree.

- [ ] **Step 6: Shorten the home stage without changing copy**

Reduce the desktop .home-hero minimum from 700px to around 640px while preserving the fluid upper bound and mobile overrides.

- [ ] **Step 7: Run focused browser tests**

Run: npm run test:e2e -- tests/e2e/home.spec.ts tests/e2e/site.spec.ts --project=chromium --project=webkit-mobile

Expected: PASS with no regressions in home navigation, PageCompass, theme persistence or mobile menu behavior.

- [ ] **Step 8: Commit the interaction hierarchy pass**

~~~
git add src/styles/content.css src/styles/shell.css src/styles/media.css src/styles/responsive.css src/pages/HomePage.vue tests/e2e/home.spec.ts tests/e2e/site.spec.ts
git commit -m "收敛档案站交互层级与章节导航"
~~~

### Task 4: Make Reveal and Pointer Sheen lifecycle-efficient

**Files:**
- Create: src/utils/reveal.ts
- Create: src/utils/pointerSheen.ts
- Modify: src/directives/reveal.ts
- Modify: src/directives/pointerSheen.ts
- Modify: tests/reveal.test.ts
- Modify: tests/robustness.test.ts
- Modify: relevant tests/e2e/*.spec.ts

**Interfaces:**
- getRevealMode(input: { supportsIntersectionObserver: boolean; prefersReducedMotion: boolean }): 'observer' | 'immediate'.
- getPointerSheenPosition(bounds: { left: number; top: number; width: number; height: number }, clientX: number, clientY: number): { x: number; y: number }.

- [ ] **Step 1: Implement the pure helper contracts from the failing tests**

Create the test-facing functions with the signatures above and add tests for reduced motion, unsupported IO, clamped pointer coordinates and zero-sized bounds.

- [ ] **Step 2: Run the helper tests**

Run: npm run unit -- tests/reveal.test.ts tests/robustness.test.ts

Expected: helper tests pass while directive integration remains unchanged.

- [ ] **Step 3: Remove the duplicate Reveal fallback path**

Update reveal.ts to call getRevealMode. In observer mode, register only the shared IntersectionObserver and never call startFallback. In immediate mode, reveal the element and return before listener/observer registration. Delete pending, fallbackListening, fallbackRaf, scheduleFallback, startFallback and revealPassedElements.

- [ ] **Step 4: Cache Pointer Sheen geometry**

Update pointerSheen.ts to cache bounds on pointerenter, invalidate on resize/scroll and lazily refresh if pointermove arrives before pointerenter. Use getPointerSheenPosition for clamping and keep one rAF per frame. Remove all global listeners and frame state during unmount.

- [ ] **Step 5: Verify fallbacks and rapid interactions**

~~~
npm run unit -- tests/reveal.test.ts tests/robustness.test.ts
npm run test:e2e -- tests/e2e/site.spec.ts tests/e2e/concerts.spec.ts --project=chromium --project=webkit-mobile
~~~

Expected: reduced-motion, coarse-pointer, rapid interaction, album spotlight and poster/lightbox tests pass.

- [ ] **Step 6: Commit the lifecycle pass**

~~~
git add src/utils/reveal.ts src/utils/pointerSheen.ts src/directives/reveal.ts src/directives/pointerSheen.ts tests/reveal.test.ts tests/robustness.test.ts tests/e2e/site.spec.ts tests/e2e/concerts.spec.ts
git commit -m "优化档案站滚动与指针交互生命周期"
~~~

### Task 5: Expand Lighthouse and page-quality gates

**Files:**
- Modify: .lighthouserc.json
- Create: .lighthouserc.mobile.json
- Modify: package.json
- Modify: README.md
- Modify: .github/workflows/quality-budget.yml
- Modify: .github/workflows/pages.yml only if the new command needs an explicit CI step
- Test: tests/lighthouse-config.test.ts

**Interfaces:**
- npm run lighthouse runs desktop and mobile collections sequentially against a built preview.
- Desktop URLs: /index.html, /academics.html, /research.html, /works.html, /concerts.html.
- Mobile URLs: /index.html, /research.html, /concerts.html.

- [ ] **Step 1: Add a failing config contract**

Parse both JSON config files and assert the exact URL matrices and first-stage thresholds, including interaction-to-next-paint at 200ms when the installed Lighthouse version exposes that audit.

- [ ] **Step 2: Run the config test and confirm RED**

Run: npm run unit -- tests/lighthouse-config.test.ts

Expected: failure because the current desktop config contains only three URLs and no mobile config.

- [ ] **Step 3: Add desktop and mobile configurations**

Keep three-run sampling. Set desktop Performance to 0.90, mobile Performance to 0.85, Accessibility to 0.98, Best Practices to 0.95, SEO to 0.95, LCP to 2500ms, TBT to 300ms, CLS to 0.10 and INP to 200ms. Use Lighthouse’s supported mobile form factor and screen emulation settings in the mobile config.

- [ ] **Step 4: Update the npm command and documentation**

Change the script to:

~~~
"lighthouse": "lhci autorun --config=.lighthouserc.json && lhci autorun --config=.lighthouserc.mobile.json"
~~~

Document the expanded matrix and distinguish lab TBT from Core Web Vital INP in README.md.

- [ ] **Step 5: Run config and Lighthouse checks**

Run npm run unit -- tests/lighthouse-config.test.ts, then npm run build followed by npm run lighthouse.

Expected: config tests pass; Lighthouse either passes the thresholds or reports a concrete page/metric to optimize before proceeding.

- [ ] **Step 6: Commit the quality-gate pass**

~~~
git add .lighthouserc.json .lighthouserc.mobile.json package.json README.md .github/workflows/quality-budget.yml tests/lighthouse-config.test.ts
git commit -m "提升档案站 Lighthouse 与页面质量门槛"
~~~

### Task 6: Split page CSS and preserve async page loading

**Files:**
- Create: src/styles/components.css
- Create: src/styles/academics.css
- Create: src/styles/honors.css
- Create: src/styles/research.css
- Create: src/styles/concerts.css
- Modify: src/styles.css
- Modify: src/styles/content.css
- Modify: src/styles/media.css
- Modify: src/styles/works.css
- Modify: src/pages/AcademicsPage.vue
- Modify: src/pages/HonorsPage.vue
- Modify: src/pages/ResearchPage.vue
- Modify: src/pages/ConcertsPage.vue
- Modify: src/pages/WorksPage.vue
- Modify: tests/architecture.test.ts

**Interfaces:**
- Global entry imports only shell, base, shared component and responsive CSS.
- Each async page imports its own page CSS once.
- Output retains hashed CSS assets and no page references another page’s source CSS at runtime.

- [ ] **Step 1: Add a failing build-output contract**

After the current build, read generated page HTML and assert page-specific CSS asset references are present only for their page chunk, while shared CSS remains common. Allow Vite hash names; do not assert a fragile numeric chunk count.

- [ ] **Step 2: Run the contract against the current build and confirm RED**

Run npm run build then npm run unit -- tests/architecture.test.ts.

Expected: the contract identifies that every page currently receives the same content.css, media.css and works.css imports.

- [ ] **Step 3: Partition styles by responsibility**

Move shared headings, badges, metrics, buttons, lightbox, reveal and shared layout rules into components.css. Move academic, honors, research and concert-only selectors into named files. Keep works.css as the works page file. Preserve selector names and CSS order within each responsibility group.

- [ ] **Step 4: Change the global import surface**

Make styles.css import only base.css, shell.css, components.css and responsive.css. Remove page-only content.css, media.css and works.css imports from the global file after partitioning.

- [ ] **Step 5: Import page CSS from async page components**

At the top of each page component’s script setup, add one static CSS import:

~~~
import '../styles/academics.css'
~~~

Use the corresponding file for each page. Do not import page styles from App.vue or main.ts.

- [ ] **Step 6: Build and run the output contract**

~~~
npm run build
npm run unit -- tests/architecture.test.ts
npm run smoke
~~~

Expected: output contract passes, every generated page still contains CSP/theme/OG metadata, and smoke finds all required assets.

- [ ] **Step 7: Commit the CSS split**

~~~
git add src/styles.css src/styles/*.css src/pages/*.vue tests/architecture.test.ts
git commit -m "拆分档案站页面级样式并保持异步加载"
~~~

### Task 7: Complete WCAG, visual regression and final governance checks

**Files:**
- Modify: tests/e2e/compatibility.spec.ts
- Modify: tests/e2e/final-seal.spec.ts
- Modify: tests/e2e/site.spec.ts
- Create: tests/e2e/visual-matrix.spec.ts
- Modify: eslint.config.js or knip.json only if the CSS split exposes a real unused-file contract

**Interfaces:**
- Visual matrix widths: 320, 375, 390, 768, 1024, 1280, 1440 and 1920.
- Tests verify content presence and geometry, not platform-specific pixel-perfect text rendering.

- [ ] **Step 1: Add failing focus-obscured checks**

For representative routes, focus a section link and assert its rectangle is below the sticky header bottom and inside the viewport. On pages with Compass, assert the focused control is not covered by the Compass rectangle. Use computed rectangles rather than screenshot pixels.

- [ ] **Step 2: Run the new checks and confirm RED where needed**

Run: npm run test:e2e -- tests/e2e/visual-matrix.spec.ts --project=chromium

Expected: any failure identifies route, viewport and obscuring surface.

- [ ] **Step 3: Add visual matrix coverage**

Cover home, academics, research, works and concerts at the stable widths. Add light/dark, reduced-motion, keyboard-only, 200% zoom where supported and forced-colors checks. Save review screenshots only under ignored test-screenshots/.

- [ ] **Step 4: Run the full browser matrix**

Run: npm run test:e2e -- --workers=2

Expected: Chromium desktop, WebKit mobile, Firefox compatibility and Android smoke pass with no overflow, stale reveal content, focus obstruction or accessibility regressions.

- [ ] **Step 5: Run static and production gates**

~~~
npm run lint
npm run typecheck
npm run deadcode
npm run unit
npm run sitemap
npm run build
npm run smoke
npm run links
npm run lighthouse
~~~

Expected: every command exits 0 and generated sitemap/assets match the source registry.

- [ ] **Step 6: Review the complete diff for content immutability**

~~~
git diff --name-only origin/main...HEAD
git diff -- src/data html-src
~~~

Expected: no content or personal-information changes; only planned style, behavior, test, configuration and governance files are changed.

- [ ] **Step 7: Commit the final QA pass**

~~~
git add tests/e2e/*.spec.ts tests/e2e/visual-matrix.spec.ts ASSET_RIGHTS.md docs/privacy-release-checklist.md
git commit -m "完善档案站无障碍与视觉回归验证"
~~~

### Task 8: Final review and direct main deployment

**Files:**
- Review: all changes since the initial refinement commit
- Verify: .github/workflows/pages.yml, package.json, dist/ generated output

- [ ] **Step 1: Inspect final diff and repository state**

~~~
git status --short --branch
git diff --stat origin/main...HEAD
git log --oneline --decorate -8
~~~

Expected: main is current branch, no unrelated files are modified, and all planned commits are present.

- [ ] **Step 2: Request an independent code review**

Provide the reviewer with the refinement spec, implementation plan, base SHA before Task 1 and final HEAD SHA. Review content immutability, CSS loading boundaries, Reveal lifecycle, pointer cleanup, Lighthouse config validity and accessibility geometry.

- [ ] **Step 3: Fix Critical and Important review findings**

For each finding, add or update a failing regression test first, implement the smallest fix, rerun the affected focused command and then rerun the full gates in Task 7.

- [ ] **Step 4: Push the verified main branch**

~~~
git push origin main
~~~

Expected: GitHub accepts the direct push and the Pages workflow is triggered from main.

- [ ] **Step 5: Verify remote state**

~~~
git status --short --branch
git ls-remote --heads origin main
~~~

Expected: local main SHA matches origin/main and the worktree is clean.
