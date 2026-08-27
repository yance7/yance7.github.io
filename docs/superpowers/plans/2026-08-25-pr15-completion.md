# PR #15 Multilingual Adaptive Compass Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete PR #15 as a stable three-locale personal site release by replacing PageCompass race-prone state with an explicit interaction model, separating WebKit desktop/mobile coverage, improving Playwright observability, and verifying the production artifact before merge.

**Architecture:** Keep the existing Vite multi-page/static architecture and locale URL model. Make PageCompass derive expansion from one `CompassMode` state plus pointer/focus boundary facts; make interactive panel geometry discrete and immediately actionable. Make browser projects and test files own distinct desktop/mobile responsibilities, run browser tests against the built preview, and isolate every Playwright invocation's output.

**Tech Stack:** Vue 3, TypeScript, Vite, Playwright, Vitest, axe-core, GitHub Actions, GitHub Pages.

**Spec:** `C:/Users/yance/.codex/attachments/57dea713-0e6d-401e-b759-941376286655/pasted-text-1.txt` and `Y:/Personal Website/docs/handoff/2026-08-25-i18n-adaptive-compass-handoff.md`.

## Global Constraints

- Preserve locales `zh-CN`, `zh-HK`, and `en`; the root path remains `zh-CN`, `/zh-hk/...` is `zh-HK`, and `/en/...` is English.
- URL path is the locale source of truth; explicit URL wins over localStorage; localStorage only remembers an explicit user choice; do not add Accept-Language redirects.
- Locale navigation preserves page, compatible hash, query/search, and theme through real URL navigation; UI chrome remains single-language.
- Preserve stable section IDs, SEO/canonical/hreflang, 18 sitemap URLs, locale-aware 404 pages, CNAME, and Pages build behavior.
- PageCompass must keep desktop/mobile navigation, hash navigation, active chapter, progress, Return Top, Escape, focus restoration, reduced-motion, pointer/touch, inert, and axe contracts.
- Do not edit, delete, or commit `docs/handoff/`; do not hand-edit `dist/`; do not update snapshots blindly.
- Do not use `waitForTimeout`, `sleep`, forced/coordinate clicks, retries, weakened assertions, or larger global timeouts to mask a race.
- Use `retries=0` for targeted and release-candidate verification; commit one logical change per checkpoint with concise Chinese action-verb messages.
- Fast lane is relevant unit/typecheck/targeted Playwright with workers 1; targeted lane is browser stress with repeat-each 10 and retries 0; full lane is `npm run check`, Lighthouse, all browser projects, axe, and visual compare.

---

### Task 1: Establish current evidence and preserve the handoff boundary

**Files:**
- Read: `AGENTS.md`, `docs/handoff/2026-08-25-i18n-adaptive-compass-handoff.md`
- Read: `src/components/PageCompass.vue`, `src/composables/usePageCompass.ts`, `src/styles/shell.css`, `src/styles/responsive.css`, `tests/e2e/site.spec.ts`, `playwright.config.ts`, `.github/workflows/quality.yml`
- Do not modify: `docs/handoff/`

**Interfaces:**
- Consumes: current working tree, local refs, and any available GitHub PR/Audit state.
- Produces: a dated evidence note in the working session, not in `docs/handoff/`, containing current branch/head, local diff, PR head, failed log lines, and the exact baseline commands.

- [ ] **Step 1: Capture local state**

```powershell
git status --short --branch
git branch -vv
git diff -- src/composables/usePageCompass.ts src/styles/responsive.css
git diff --check
```

- [ ] **Step 2: Capture remote state when credentials/network permit**

```powershell
gh pr view 15 --repo yance7/yance7.github.io --json state,isDraft,mergeable,headRefOid,statusCheckRollup,url
gh run view <latest-quality-run> --repo yance7/yance7.github.io --log-failed
```

- [ ] **Step 3: Confirm the handoff directory remains untouched and uncommitted**

```powershell
git status --short -- docs/handoff
```

Expected: only the pre-existing `?? docs/handoff/` status, with no file content changes.

### Task 2: Add PageCompass regression contracts before production changes

**Files:**
- Create: `tests/e2e/page-compass-desktop.spec.ts`
- Create: `tests/e2e/page-compass-mobile.spec.ts`
- Modify: `tests/e2e/site.spec.ts` to remove the six-route monolithic desktop-width Compass test and other tests that belong only to the desktop file.
- Modify: `tests/e2e/ui-primitives.spec.ts` to keep primitive tests viewport-neutral and compatible with both WebKit projects.

**Interfaces:**
- Consumes: `.page-compass`, `.page-compass-trigger`, `.page-compass-panel`, `.page-compass-link`, `.page-compass-top` contracts.
- Produces: independent route tests and explicit regression coverage for Escape, destination selection, Return Top, reduced-motion geometry, focus-first behavior, and pointer/touch ownership.

- [ ] **Step 1: Write independent desktop route tests**

Each route gets its own Playwright `test()` and fresh page. Use `await destinationLink.click()` after `await expect(destinationLink).toBeVisible()`; do not call `boundingBox()` or `page.mouse.click(x, y)`. Cover `index.html`, `academics.html`, `honors.html`, `research.html`, `works.html`, and `concerts.html` with the existing section destinations and assert pinned navigation clearance and trigger focus after navigation.

- [ ] **Step 2: Write the Return Top regression test**

```ts
test('Return Top clears hash, scrolls instantly, closes, and keeps trigger focus', async ({ page }) => {
  await page.goto('/honors.html#sec-honors-archive')
  const trigger = page.locator('.page-compass-trigger')
  const top = page.locator('.page-compass-top')
  await trigger.click()
  await page.evaluate(() => window.scrollTo({ top: 900, left: 0, behavior: 'instant' }))
  await top.click()
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBeLessThan(8)
  await expect(page).toHaveURL(/honors\.html$/)
  await expect(trigger).toBeFocused()
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('.page-compass-panel')).toHaveAttribute('inert', '')
})
```

- [ ] **Step 3: Write Escape and reduced-motion contracts**

Focus the trigger, assert immediate expansion and a non-zero panel/link geometry, press Escape, then assert trigger focus, `aria-expanded="false"`, `aria-hidden="true"`, and `inert`. For reduced motion, assert `transitionDuration` is zero and `getBoundingClientRect()` for the panel and destination link is non-zero without any fixed sleep.

- [ ] **Step 4: Write pointer/touch ownership contracts**

On a hover-capable desktop project, dispatch/observe pointer entry and assert transient opening. On the mobile WebKit project, assert a fresh page is collapsed and does not open merely because the page uses touch semantics; focus and explicit trigger click remain valid ways to open it.

- [ ] **Step 5: Run the new tests against the current implementation and record RED**

```powershell
npx playwright test tests/e2e/page-compass-desktop.spec.ts --project=chromium --workers=1 --retries=0
npx playwright test tests/e2e/page-compass-mobile.spec.ts --project=webkit-mobile --workers=1 --retries=0
```

Expected: at least the new geometry/Return Top or state-boundary assertion fails against the current implementation, proving the tests detect the reported defects before production code changes.

### Task 3: Replace PageCompass boolean feedback loops with an explicit state model

**Files:**
- Modify: `src/components/PageCompass.vue`
- Modify: `src/composables/usePageCompass.ts`
- Test: `tests/e2e/page-compass-desktop.spec.ts`, `tests/e2e/page-compass-mobile.spec.ts`

**Interfaces:**
- Consumes: existing section/progress/hash API from `usePageCompass`.
- Produces: `CompassMode = 'closed' | 'transient' | 'pinned' | 'suppressed'`; `isExpanded` derived only from `transient` and `pinned`; synchronous focus-boundary transitions.

- [ ] **Step 1: Define the state transition table before implementation**

Use these transitions:

| Event | From | To | Effect |
| --- | --- | --- | --- |
| hover-capable `pointerenter` | `closed` | `transient` | Expand temporarily |
| `focusin` inside Compass | `closed` | `transient` | Expand temporarily |
| trigger click | any non-pinned mode | `pinned` | Explicitly pin |
| trigger click | `pinned` | `closed` | Explicitly close |
| Escape/destination/Return Top | any expanded mode | `suppressed` | Close, restore focus without reopening |
| `pointerleave` + focus outside | `transient` | `closed` | Collapse |
| focusout with `relatedTarget` outside + pointer outside | `transient` | `closed` | Collapse |
| focus boundary leaves Compass after suppression | `suppressed` | `closed` | Clear suppression |

Never let `focusin` reopen `suppressed`; an explicit trigger click may enter `pinned`.

- [ ] **Step 2: Implement boundary handling without queued activeElement reads**

Use `PointerEvent` `pointerenter`/`pointerleave`, accept only hover-capable pointer types/media, and use `FocusEvent.relatedTarget` synchronously in `focusout`. Remove `closedByEscape`, `suppressNextFocusOpen`, `nextTick(() => document.activeElement...)`, and delayed `setTimeout` focus restoration.

- [ ] **Step 3: Implement synchronous close and focus restoration**

For Escape, destination selection, and Return Top, set `mode.value = 'suppressed'`, call `triggerRef.value?.focus({ preventScroll: true })`, and rely on the mode guard to ignore the synchronous `focusin`. Outside pointer-down should close to `closed` without suppressing future explicit interaction.

- [ ] **Step 4: Run focused tests GREEN**

```powershell
npx playwright test tests/e2e/page-compass-desktop.spec.ts --project=chromium --workers=1 --retries=0
npx playwright test tests/e2e/page-compass-mobile.spec.ts --project=webkit-mobile --workers=1 --retries=0
npm run unit -- tests/pageCompass.test.ts
```

Expected: Escape, destination, Return Top, focus-first, and pointer/touch contracts pass without adding retries or sleeps.

### Task 4: Make panel geometry and Return Top deterministic

**Files:**
- Modify: `src/styles/shell.css`
- Modify: `src/styles/responsive.css`
- Modify: `src/composables/usePageCompass.ts`
- Test: PageCompass reduced-motion and Return Top contracts.

**Interfaces:**
- Consumes: `page-compass-expanded` class and `goTop()` public composable behavior.
- Produces: collapsed panel `display: none`; expanded panel immediate grid geometry; reduced-motion `transition: none !important` and `animation: none !important`; `goTop()` using one `behavior: 'instant'` scroll command.

- [ ] **Step 1: Remove layout transitions from the interactive panel**

Keep `display: none` in the collapsed panel state and `display: grid` in the expanded state. Remove `max-height`, padding, transform, and width transitions that can make links move or have zero geometry during actionability; decorative color/shadow/opacity transitions may remain only where they do not affect link geometry.

- [ ] **Step 2: Make reduced motion explicit**

In the reduced-motion rule, set `transition: none !important; animation: none !important;` for `.page-compass`, `.page-compass-panel`, and `.page-compass-trigger-icon`, and remove the weaker `.01ms` PageCompass override.

- [ ] **Step 3: Implement deterministic Return Top**

Replace all duplicate/rAF scroll calls with:

```ts
window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
```

Leave hash removal and active-section reset in `usePageCompass.goTop()`, and keep focus restoration in the component with `{ preventScroll: true }`.

- [ ] **Step 4: Verify RED-to-GREEN behavior**

```powershell
npx playwright test tests/e2e/page-compass-desktop.spec.ts --project=webkit-desktop --grep "Return Top|reduced motion" --workers=1 --retries=0 --repeat-each=10
```

Expected: 10/10 for each targeted contract, with panel/link geometry non-zero immediately after expansion and no WebKit hidden-link failure.

### Task 5: Separate browser ownership and split the monolithic navigation test

**Files:**
- Modify: `playwright.config.ts`
- Modify: `tests/e2e/site.spec.ts`
- Modify: `tests/e2e/ui-primitives.spec.ts`
- Create or modify: `tests/e2e/page-compass-desktop.spec.ts`, `tests/e2e/page-compass-mobile.spec.ts`

**Interfaces:**
- Consumes: independent route tests from Task 2.
- Produces: explicit `webkit-desktop` at `1200x900`, `isMobile: false`, `hasTouch: false`; `webkit-mobile` using the iPhone 13 device without artificial desktop viewport overrides.

- [ ] **Step 1: Add browser projects**

Define `webkit-desktop` with `browserName: 'webkit'`, viewport `{ width: 1200, height: 900 }`, `isMobile: false`, `hasTouch: false`. Keep `webkit-mobile` on `devices['iPhone 13']` with explicit `browserName: 'webkit'`. Keep Chromium visual and Android ownership unchanged.

- [ ] **Step 2: Move desktop-width PageCompass coverage out of `site.spec.ts`**

Remove the six-route serial test, the 1200x900 integrated PageCompass test, and the desktop-only numeric progress test from `site.spec.ts`. Put each route in `page-compass-desktop.spec.ts` as an independent `test()` with no shared page/context state.

- [ ] **Step 3: Keep mobile tests mobile**

Retain narrow portrait/landscape, touch target, Escape, and compact-panel behavior in `page-compass-mobile.spec.ts` and ensure no mobile test calls `setViewportSize({ width: 1200, height: 900 })`.

- [ ] **Step 4: Run both projects with retries disabled**

```powershell
npx playwright test tests/e2e/page-compass-desktop.spec.ts --project=webkit-desktop --workers=1 --retries=0
npx playwright test tests/e2e/page-compass-mobile.spec.ts --project=webkit-mobile --workers=1 --retries=0
```

Expected: desktop tests exercise only desktop WebKit, mobile tests exercise only the iPhone WebKit context, and each failure names one route.

### Task 6: Isolate Playwright artifacts and move Quality Audit E2E to production preview

**Files:**
- Modify: `playwright.config.ts`
- Modify: `.github/workflows/quality.yml`
- Modify: `tests/e2e/site.spec.ts` and any slow/failed chunk interception selectors required by hashed preview assets.

**Interfaces:**
- Consumes: `npm run build` output and `npm run preview` server.
- Produces: `PLAYWRIGHT_USE_PREVIEW=1` support, stable `test-results/<lane>` output per invocation, `screenshot: 'only-on-failure'`, retained failure traces, and artifact upload coverage.

- [ ] **Step 1: Make the web server selectable**

Use `process.env.PLAYWRIGHT_USE_PREVIEW === '1'` to select `npm run preview -- --host 127.0.0.1 --port ...`; keep `npm run dev` for local default. Set CI Quality Audit to use preview after `npm run build` and `npm run smoke`.

- [ ] **Step 2: Add output isolation**

Accept `PLAYWRIGHT_OUTPUT_DIR` in the config and set `outputDir` to that value, defaulting to `test-results/local`. Set `screenshot: 'only-on-failure'` and keep `trace: 'retain-on-failure'`.

- [ ] **Step 3: Give every Quality invocation a distinct output directory**

Use directories `test-results/chromium`, `test-results/webkit-desktop`, `test-results/webkit-mobile`, `test-results/webkit-primitives`, `test-results/visual`, `test-results/firefox`, and `test-results/android`; set `PLAYWRIGHT_USE_PREVIEW=1` for all browser invocations.

- [ ] **Step 4: Verify trace preservation with one intentional targeted failure**

Run one known-failing targeted assertion into a temporary output directory, confirm a real `trace.zip` exists, then remove only that temporary test artifact and rerun the corrected test. Do not alter production code or commit the intentional failure.

### Task 7: Document the feedback architecture and complete local verification

**Files:**
- Modify: `AGENTS.md`
- Do not modify: `docs/handoff/`

**Interfaces:**
- Consumes: final test ownership, preview, output, and debugging rules from Tasks 2–6.
- Produces: repository-local guidance for future agents covering subsystem-to-test mapping, three-fix stop rule, retries/sleep prohibition, visual rules, production preview, WebKit ownership, trace isolation, full Audit prerequisites, one logical commit, and handoff exclusion.

- [ ] **Step 1: Add the new Agent feedback rules to AGENTS.md**

Document exact commands for the fast, targeted, and full lanes, including PageCompass desktop/mobile project ownership and the condition that full Audit is allowed only after targeted stress is green.

- [ ] **Step 2: Run the local fast lane**

```powershell
npm run lint
npm run typecheck
npm run deadcode
npm run unit
npm run sitemap
npm run build
npm run smoke
```

- [ ] **Step 3: Run PageCompass targeted stress**

```powershell
npx playwright test tests/e2e/page-compass-desktop.spec.ts --project=chromium --workers=1 --retries=0 --repeat-each=10
npx playwright test tests/e2e/page-compass-desktop.spec.ts --project=webkit-desktop --workers=1 --retries=0 --repeat-each=10
npx playwright test tests/e2e/page-compass-mobile.spec.ts --project=webkit-mobile --workers=1 --retries=0 --repeat-each=10
```

Record passed, failed, skipped, retries, and flaky counts for every command.

- [ ] **Step 4: Run the release lane**

```powershell
npm run check
```

Then run the exact preview-backed Chromium, WebKit desktop, WebKit mobile/primitives, Chromium visual, Firefox, and Android commands used by the workflow, all with `retries=0` and isolated output directories. Visuals must first run in compare mode; update snapshots only after inspecting an intentional diff, then run compare mode again.

### Task 8: Push one release candidate, pass all remote gates, merge, deploy, and smoke both domains

**Files:**
- No further source changes after the release candidate is verified.

**Interfaces:**
- Consumes: clean release-candidate worktree, local full-lane evidence, and remote credentials.
- Produces: final PR head SHA, successful PR CI and Quality Audit SHA mapping, merge SHA, successful Pages deployment for that exact merge SHA, and dual-domain locale/interaction smoke.

- [ ] **Step 1: Commit only intended source/config/test/AGENTS changes**

Verify `git diff -- docs/handoff` is empty and `git status --short` does not include `docs/handoff/`; stage only the intended files. Use a Chinese action-verb commit summary.

- [ ] **Step 2: Push one meaningful checkpoint and wait for complete gates**

Confirm all required checks pass with retries 0, zero flaky failures, no unexpected skips, WebKit desktop/mobile and primitives actually executed, and Chromium visual compare actually executed and passed.

- [ ] **Step 3: Merge only after the full gate is green**

Record PR head SHA, merge SHA, PR CI run, Quality Audit run, and each run's SHA before merging. Do not treat `mergeable=true` or a green Basic CI alone as sufficient.

- [ ] **Step 4: Verify Pages and both domains**

Confirm the Pages workflow deployed the exact merge SHA, then check the custom domain and GitHub Pages domain for `/`, `/research.html`, `/en/`, `/en/research.html`, `/zh-hk/`, and `/zh-hk/research.html`. Verify status/redirect behavior, locale, `html lang`, assets, LocaleSwitcher, PageCompass, theme, canonical, hreflang, single-language chrome, and browser console/runtime health.

## Self-Review Checklist

- Root causes addressed: PageCompass boolean feedback loop, CSS geometry transition, smooth-scroll Return Top, mixed WebKit context, trace overwrite, and dev-vs-preview mismatch.
- Functional requirements preserved: three locales, root `zh-CN`, page/hash/query/theme-preserving navigation, SEO, 18 URLs, single-language UI, stable section IDs, and no Accept-Language redirect.
- PageCompass requirements covered: Escape, destination, Return Top, focus-first, suppressed restoration, reduced motion, hover-capability, touch behavior, desktop/mobile ownership, and independent route failures.
- Quality requirements covered: local fast lane, 10x targeted stress, full release lane, retries 0, no blind snapshot update, actual visual compare, isolated traces, and exact-SHA deploy verification.
- No task changes `docs/handoff/` or commits it.
