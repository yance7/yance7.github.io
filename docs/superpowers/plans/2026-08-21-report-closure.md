# Personal Archive Report Closure Implementation Plan

> **For agentic workers:** Execute this plan inline in the current task. Do not create a branch, pull request, or subagent. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将最新优化报告中尚未形成可验证证据的排版、对比度、媒体发布、无障碍、安全记录和视觉回归建议收口到当前 Personal Archive。

**Architecture:** 保留现有 Vue 3 + Vite MPA 和本地字体/媒体来源。新增纯函数对比度契约、一个只读资源审计 CLI，以及 Playwright 几何验证；CSS 只做语义化迁移和无行为改变的重复声明清理。版权授权和真实用户监测不伪造结论，分别保留为发布门槛和隐私决策记录。

**Tech Stack:** Vue 3, TypeScript, CSS custom properties, Vitest, Playwright, Python/Pillow, Node.js scripts.

**Spec:** `docs/superpowers/specs/2026-08-21-archive-system-refinement-design.md`

## Global Constraints

- 不修改 `src/data/*.ts`、`html-src/*.html` 中的个人内容、页面文案、外部链接和信息架构。
- 保留亮色/暗色、reduced motion、forced colors、键盘导航、深链接和无第三方 tracker 的现状。
- `dist/` 只能由 `npm run build` 生成，不手工编辑。
- 资源审计只读并报告 EXIF/GPS、尺寸和格式，不自动删除用户资产元数据。
- 直接在 `main` 提交并 push；不创建 branch 或 PR。
- 每个新的生产行为变更必须先写一个会失败的测试，再写最小实现。

---

### Task 1: Close semantic typography and contrast contracts

**Files:**
- Create: `src/utils/contrast.ts`
- Modify: `src/styles/*.css` only for remaining role-level literal tracking values
- Modify: `tests/designTokens.test.ts`
- Create: `tests/contrast.test.ts`

**Interfaces:**
- `getContrastRatio(foreground: string, background: string): number`
- `parseHexColor(value: string): { r: number; g: number; b: number }`
- Theme tests consume the semantic text roles `--ink`, `--muted`, `--dim`, `--gold-text`, `--aqua`, and their light/dark background values.

- [x] **Step 1: Write the failing contrast tests**

  Add tests for WCAG relative luminance and the minimum ratios required by the existing text roles: normal text at least 4.5:1, large text at least 3:1, and `--dim` only used where the CSS contract marks it as decorative/non-body metadata. Include known values such as `#1B2523` on `#F7F8F6` and `#F3F0E9` on `#0A1014`.

- [x] **Step 2: Run the focused test and verify RED**

  Run `npm run unit -- tests/contrast.test.ts`. It must fail because `src/utils/contrast.ts` does not exist yet, not because of a test syntax or environment error.

- [x] **Step 3: Implement the minimal contrast helper**

  Implement hex parsing for six-digit values, sRGB linearization, relative luminance, and the `(lighter + 0.05) / (darker + 0.05)` ratio. Reject malformed colors with a clear `Error`.

- [x] **Step 4: Run the helper tests and migrate remaining tracking roles**

  Run `npm run unit -- tests/contrast.test.ts`. Replace literal `.14em` metadata tracking with `var(--tracking-latin-meta)`, `.18em` wide Latin metadata with `var(--tracking-latin-wide)`, `.06em` Chinese metadata with `var(--tracking-zh-meta)`, and editorial negative tracking with `var(--tracking-editorial)` only where the selector's role matches. Leave genuinely expressive project wordmarks unchanged and add a source-contract assertion explaining the exception.

- [x] **Step 5: Add theme-level contrast assertions**

  Extend `tests/contrast.test.ts` to parse the light/dark declarations in `src/theme.css` and assert the normal-text pairs (`ink/bg`, `muted/bg`, `gold-text/bg`, `aqua/bg`) meet 4.5:1. Assert interactive focus and CTA pairs meet 3:1 against their adjacent surface. Keep the test based on declared hex colors; do not attempt to infer semi-transparent compositing.

- [x] **Step 6: Run the focused design and contrast tests**

  Run `npm run unit -- tests/contrast.test.ts tests/designTokens.test.ts`. Expected: all tests pass with no warnings.

### Task 2: Make media layout and release auditing deterministic

**Files:**
- Modify: `src/styles/components.css`
- Create: `scripts/audit-assets.py`
- Create: `tests/assetAudit.test.ts`
- Modify: `ASSET_RIGHTS.md`
- Modify: `docs/privacy-release-checklist.md`
- Modify: `package.json`

**Interfaces:**
- `python scripts/audit-assets.py` exits non-zero when an image has GPS metadata or cannot be opened, and otherwise prints a stable summary of image count, dimensions, formats, and metadata findings.
- `npm run audit:assets` invokes that command without modifying files.

- [x] **Step 1: Write the failing lightbox and asset-audit contracts**

  Add a source contract asserting that the lightbox image has an explicit `width`, `height`, or an explicit `aspect-ratio` contract on `.lb-stage`. Add `tests/assetAudit.test.ts` that invokes the CLI against `public/assets`, expects a zero exit code for the current repository, and checks that the output contains `GPS metadata: 0`.

- [x] **Step 2: Run the focused contracts and verify RED**

  Run `npm run unit -- tests/assetAudit.test.ts`. The lightbox contract must fail against the current image without dimensions; the CLI invocation must fail because the script and npm command are not present.

- [x] **Step 3: Stabilize lightbox image geometry**

  Add intrinsic `width` and `height` values to the lightbox image contract through its media metadata path if available; otherwise set `.lb-stage` and its image to an explicit responsive `aspect-ratio`/`contain` layout that prevents layout shift without distorting posters. Preserve `fetchpriority`, error handling, and navigation.

- [x] **Step 4: Implement the read-only asset audit**

  Use Pillow to walk `public/assets` in stable path order, inspect each raster file, count formats and dimensions, report EXIF GPS presence, and return exit code 1 for unreadable images or GPS-bearing assets. Do not rewrite or strip any file.

- [x] **Step 5: Add the command and governance output**

  Add `"audit:assets": "python scripts/audit-assets.py"` to `package.json`. Update `ASSET_RIGHTS.md` and `docs/privacy-release-checklist.md` with the audit command, current audit date, and an explicit rule that any non-zero result blocks release until reviewed.

- [x] **Step 6: Run asset and media checks**

  Run `npm run unit -- tests/assetAudit.test.ts` and `npm run audit:assets`. Expected: both exit 0 and the report contains no GPS findings.

### Task 3: Add WCAG focus-obscured, keyboard, zoom, and visual review coverage

**Files:**
- Modify: `tests/e2e/compatibility.spec.ts`
- Create: `tests/e2e/visual-matrix.spec.ts`

**Interfaces:**
- Representative routes: `/index.html`, `/research.html`, `/works.html`, `/concerts.html`.
- Geometry assertions compare focused target rectangles with `.site-nav` and `.page-compass`; screenshot files are written only under ignored `test-screenshots/`.

- [x] **Step 1: Add failing focus-obscured geometry checks**

  Focus representative section links and assert their target rectangles are below the sticky header bottom, inside the viewport, and not intersecting a visible PageCompass rectangle. Run `npm run test:e2e -- tests/e2e/compatibility.spec.ts --project=chromium` and record any real failure before changing CSS.

- [x] **Step 2: Add keyboard-only and 200% reflow checks**

  Use a 640px reflow viewport as a deterministic 200%-equivalent proxy, focus a representative reading control, and assert no horizontal overflow, main content visibility, and that the focused control remains within the viewport and below sticky UI. Keep this as geometry/reflow evidence, not a pixel-perfect claim about browser zoom internals.

- [x] **Step 3: Add a compact screenshot review matrix**

  Capture light and dark representative pages at 390px and 1440px into `test-screenshots/` with stable names. Do not commit platform-specific baselines; the test verifies page boot, content visibility, and screenshot creation for local review.

- [x] **Step 4: Run the focused browser matrix**

  Run `npm run test:e2e -- tests/e2e/compatibility.spec.ts tests/e2e/visual-matrix.spec.ts --project=chromium`. Expected: no overflow, no obscured focused controls, no console/page errors, and screenshots generated only in the ignored review directory.

### Task 4: Record CSP/RUM decisions, clean CSS drift, and complete gates

**Files:**
- Create: `docs/security-privacy-decisions.md`
- Create: `tests/securityPolicy.test.ts`
- Modify: `src/styles/*.css` only for proven duplicate/dead declarations found by the focused audit
- Modify: `README.md`

**Interfaces:**
- Security decision record documents the current CSP, the theme bootstrap hash, the remaining `style-src 'unsafe-inline'` constraint from Vue style bindings, and the deliberate absence of third-party analytics/RUM.
- Tests verify every `html-src/*.html` keeps the theme bootstrap hash placeholder and does not introduce remote script, tracker, or analytics sources.

- [x] **Step 1: Write the failing security-policy contract**

  Add `tests/securityPolicy.test.ts` to scan all `html-src/*.html`, require `__THEME_BOOTSTRAP_HASH__`, reject `http://`/`https://` script sources and analytics/tracker terms, and require the documented CSP directives. Run it and confirm it fails because the decision document does not yet exist.

- [x] **Step 2: Add the decision record and source contract**

  Create `docs/security-privacy-decisions.md` with the current-state CSP, why `style-src 'unsafe-inline'` remains until Vue inline style bindings are converted to nonce/hash-compatible output, the no-tracker decision, and the release-owner actions required before tightening policy.

- [x] **Step 3: Audit and remove only proven CSS duplication**

  Search the split stylesheets for identical selector/property declarations and unused selectors exposed by the existing build/deadcode evidence. Remove only duplicates with an equivalent surviving rule; do not rename selectors or alter layout based on speculative static analysis.

- [x] **Step 4: Run the complete verification matrix**

  Run `npm run lint`, `npm run typecheck`, `npm run deadcode`, `npm run unit`, `npm run sitemap`, `npm run build`, `npm run smoke`, `npm run audit:assets`, and the focused/full Playwright suites available in the environment. Lighthouse was attempted; Windows Chrome cleanup returned `EPERM` after collection, so it remains an environment limitation rather than a relaxed threshold.

- [ ] **Step 5: Review scope and publish directly**

  Confirm `git diff -- src/data html-src` is empty, inspect the staged file list, commit with `完善档案站报告建议与发布审计`, push `origin main`, then verify local `HEAD` equals `origin/main` and the worktree is clean.

---

## Completion Audit

- [ ] Every report recommendation that can be proven in-repository has a source contract, test, or release audit output.
- [x] Copyright ownership and real-world monitoring remain explicitly unresolved/disabled rather than being represented as completed.
- [x] All required quality commands have fresh exit-code evidence, with Lighthouse's Windows cleanup limitation recorded above.
- [ ] GitHub `main` contains the verified commit and no PR/branch was created.
