# UI Refinement Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Recover the GitHub Pages release path and implement every deployment, accessibility, component, Lightbox, motion, test, and visual correction in the supplied audit report.

**Architecture:** Preserve the Vue 3 + TypeScript + Vite MPA and existing content/URLs. Keep Pages production independent from Quality Audit, put behavior in the existing components and styles, and validate visual changes before updating snapshots.

**Tech Stack:** Vue 3, TypeScript, Vite, Vitest, Playwright, GitHub Actions, GitHub Pages.

**Spec:** C:\Users\yance\.codex\attachments\1655df4c-2f5f-47a9-8b32-8b4ca867f570\pasted-text-1.txt

## Global Constraints

- Keep runtime UI dependency count at zero.
- Do not add Tailwind, Shadcn, Origin UI, Inspira UI, Reka UI, Motion-V, GSAP, icon frameworks, particles, WebGL, custom cursors, or continuous decorative animations.
- Preserve light/dark themes, Gold/Aqua/Violet identity, existing content, URLs, PageRegistry, and accessibility behavior.
- Do not lower lint, TypeScript, Lighthouse, accessibility, or test thresholds.
- Do not hand-edit dist/.
- Work only on fix/ui-refinement-recovery and do not develop directly on main.

---

### Task 0: Deployment evidence

**Files:** Modify this plan document.

- [x] Verify HEAD, origin/main, branch, and status after fetch. On 2026-08-23, both HEAD and origin/main were b0363e09252d909bab18956737190aa68e1b182c; the branch is fix/ui-refinement-recovery. The only status entry is this new plan document.
- [x] Attempt to query the latest failed pages.yml run with gh run list. The current environment returned an invalid keyring token for account yance7 and proxyconnect tcp dial tcp 127.0.0.1:9 connection refused. No run ID, failed job, failed step, or error log was available, so none was invented.
- [ ] Reproduce the recorded failed step locally. If GitHub access remains unavailable, record the exact gh auth/proxy errors and do not invent a root cause.
- [ ] Commit the evidence record as "记录Pages部署恢复证据".

### Task 1: Release architecture

**Files:** .github/workflows/pages.yml, .github/workflows/quality.yml, new .github/workflows/ci.yml, tests/architecture.test.ts, and the active UI refinement plan.

- [ ] Add failing workflow contract tests for configure-pages, artifact/deploy versions, PR CI, and Quality Audit PR triggers.
- [ ] Add actions/configure-pages@983d7736d9b0ae728b81ab479565c72886d7745b before Pages artifact upload.
- [ ] Add deterministic PR CI for npm ci, Python tools, lint, typecheck, deadcode, asset audit, unit, sitemap, build, smoke, and Chromium release smoke; it must never deploy Pages.
- [ ] Add pull_request targeting main to Quality Audit while keeping Pages and Quality independent.
- [ ] Remove the active instruction to push implementation commits directly to main.
- [ ] Run focused contract tests, then lint/typecheck/deadcode/asset audit/unit/sitemap/build/smoke. Commit as "加固Pages发布流水线".

### Task 2: Shared component contracts

**Files:** YanceButton.vue, yanceButtonTypes.ts, StatusBadge.vue, PageCompass.vue, primitives.css, shell.css, responsive.css, theme.css, tests/e2e/ui-primitives.spec.ts, and architecture tests.

- [ ] Add failing tests for disabled link href removal, safe blank-target rel, disabled hover/active suppression, 44px coarse targets, pointer-independent keyboard tooltips, data-status, and no PageCompass passive aria-live.
- [ ] Implement effectiveHref and effectiveRel; disabled links bind no href and cannot navigate.
- [ ] Add AA-safe aqua-text, tooltip-muted, and motion-control-lift semantic tokens to both themes.
- [ ] Make active/deployed StatusBadge text use aqua-text, while dot/border retain aqua.
- [ ] Exclude aria-disabled=true as well as :disabled from hover/active selectors.
- [ ] Guarantee .y-button and .y-archive-link are at least 44px under coarse pointers; preserve 44px icon width.
- [ ] Separate PageCompass keyboard focus tooltip rules from fine-pointer hover rules and remove passive aria-live.
- [ ] Add data-status and update selectors. Run focused E2E, unit, lint, and typecheck. Commit as "修复共享UI组件契约".

### Task 3: Lightbox geometry

**Files:** ImageLightbox.vue, components.css, responsive.css, tests/e2e/ui-primitives.spec.ts, tests/e2e/visual-matrix.spec.ts.

- [ ] Add a failing image-vs-metadata geometry assertion: image bottom must be at least 12px above metadata top for portrait desktop and mobile.
- [ ] Remove the three metadata blur elements and replace them with one gradient dock and one 10px backdrop blur.
- [ ] Add --lb-meta-reserve: 132px; constrain image height with min(82vh, calc(100dvh - var(--lb-meta-reserve) - 72px)); use 118px at the mobile breakpoint.
- [ ] Run Lightbox and visual tests without snapshot updates, inspect generated diffs, then update only intentional baselines. Commit as "简化灯箱深度并修复元数据遮挡".

### Task 4: Motion hierarchy

**Files:** ProjectShowcase.vue, MetricStrip.vue, TimelineTrack.vue, research.css, works.css, site/architecture tests.

- [ ] Add failing tests for no nested magnetic bindings, one MetricStrip observer, data metric indexes, motion-policy-safe initial values, and empty timeline current state.
- [ ] Remove v-magnetic from ProjectShowcase buttons.
- [ ] Use one MetricStrip IntersectionObserver; unobserve each card; move reveal to the strip; use a 600–700ms count-up.
- [ ] Initialize animated metrics from zero-plus-suffix and reduced-motion metrics at final values, preventing final-to-zero-to-final flashes.
- [ ] Clear TimelineTrack currentId when the reading-zone set is empty.
- [ ] Normalize control-only translateY(-2px) lifts to motion-control-lift = -1px.
- [ ] Run focused unit/E2E/lint/typecheck. Commit as "统一交互动效层级".

### Task 5: Test and visual hardening

**Files:** tests/e2e/ui-primitives.spec.ts, site.spec.ts, concerts.spec.ts, visual-matrix.spec.ts, compatibility.spec.ts if needed, and reviewed snapshots.

- [ ] Replace relevant click force calls with visible/enabled ordinary clicks.
- [ ] Gate the album image route so loading is guaranteed; assert aria-busy, loading animation, decoded old cover, then ready/new cover after release.
- [ ] Change coarse checks from 42px to 44px; make keyboard PageCompass checks independent of pointer capability.
- [ ] Add Lightbox geometry and timeline no-current assertions.
- [ ] Add Academics and Honors to the 390x844 and 1440x900 visual matrix.
- [ ] Use 0.02 full-page, 0.01 viewport/page, and 0.005 component screenshot tolerances. Inspect diffs before any snapshot update.
- [ ] Run Chromium, Chromium visual, WebKit site, and Firefox smoke suites. Commit as "强化UI与发布回归测试".

### Task 6: Final audit and release handoff

**Files:** Modify this plan document.

- [ ] Run, in order: npm ci, lint, typecheck, deadcode, asset audit, unit, sitemap, build, smoke.
- [ ] Run production-equivalent Chromium release smoke, UI primitives, full Chromium, Chromium visual, WebKit site, and Firefox smoke.
- [ ] Run Lighthouse last without changing thresholds; record Windows cleanup errors separately.
- [ ] Audit the final diff, package manifests, branch, absence of force clicks, active direct-main instructions, and new runtime dependencies.
- [ ] Push the repair branch and create a Draft PR when GitHub authentication is available; do not merge.
- [ ] After authorized merge, record successful Pages build/deploy jobs and verify both public domains and representative pages. If external access is unavailable, mark that gate unverified.
- [ ] Complete the requirement-by-requirement evidence audit; only then mark the goal complete.
