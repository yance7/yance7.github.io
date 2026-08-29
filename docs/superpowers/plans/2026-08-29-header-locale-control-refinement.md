# Header + Locale Control Refinement Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Refine the single adaptive header and three-locale control without changing URL-first navigation, adaptive-header state logic, accessibility contracts, or quality budgets.

**Architecture:** Keep one SiteHeader.vue DOM and one .nav-rail, but place the brand, centered nav, and control group in a three-column CSS Grid. Keep locale navigation as real anchors, use a CSS-driven three-segment indicator, and isolate optional document prefetch in a small deduplicated utility.

**Tech Stack:** Vue 3, TypeScript, Vite, CSS, Vitest, Playwright, existing npm scripts and theme tokens.

**Spec:** docs/superpowers/specs/2026-08-29-header-locale-control-refinement-design.md

## Global Constraints

- Start from the latest healthy origin/main: fec4e02520e0c7a95ab8611cf15f6a60f38e7dd9 at plan creation; re-check before implementation and push.
- Use branch codex/feat/header-locale-control-refinement; do not push directly to main, force-push, or rewrite published history.
- Keep Vue 3, TypeScript, Vite, the existing multi-page locale architecture, and GitHub Pages deployment model.
- Locale path source of truth remains /, /zh-hk/..., and /en/...; preserve page, query string, and hash.
- Keep exactly one .site-nav, one primary desktop .nav-rail, one canonical raster BrandMark, and the existing useAdaptiveHeader IntersectionObserver contract.
- Do not add a router, carousel/dependency, hover-only action, runtime text measurement, arbitrary test sleep, waitForTimeout(), retry, force clicks, or weakened assertion.
- Interactive touch controls remain at least 44×44px; visible focus, keyboard navigation, Escape, outside-click, modal focus trap, inert isolation, focus restoration, and reduced motion remain functional.
- Do not lower any existing Lighthouse or accessibility threshold and do not hand-edit dist/.

## File map

| File | Responsibility in R1 |
| --- | --- |
| src/components/SiteHeader.vue | Single header DOM, three visual groups, preserved mobile menu composition. |
| src/components/LocaleSwitcher.vue | Locale order, real destination anchors, active state metadata, mobile details, prefetch intent hooks. |
| src/utils/documentPrefetch.ts | Same-origin, current-document-aware, deduplicated document prefetch registration. |
| src/styles/shell.css | Desktop grid, locale orbit visuals, control group, obsolete status/pulse removal. |
| src/styles/responsive.css | Compact desktop/mobile geometry, locale popover bounds, 44px controls, motion compatibility. |
| src/theme.css | Only if a missing reusable token is proven necessary. |
| tests/documentPrefetch.test.ts | Pure unit coverage of prefetch registration. |
| tests/architecture.test.ts | Source invariants for one header/nav, no status, explicit grid/indicator contracts. |
| tests/e2e/locale.spec.ts | Three locale anchors, active state, URL preservation, mobile popover, prefetch evidence. |
| tests/e2e/adaptive-header.spec.ts | Header geometry and resting/floating/reduced-motion matrix. |
| tests/e2e/site.spec.ts | Existing shared header and mobile menu behavior where the structure changes semantics. |
| tests/e2e/english-layout.spec.ts | Existing English overflow behavior plus R1 geometry assertions if needed. |

### Task 1: Add the testable document-prefetch helper

**Files:**

- Create: tests/documentPrefetch.test.ts
- Create: src/utils/documentPrefetch.ts

**Interfaces:**

- Produces PrefetchDocument and createDocumentPrefetcher(documentRef, currentHref).
- documentRef is Pick<Document, 'createElement' | 'head'> so Vitest can test real link creation without a browser DOM.

- [ ] Step 1: Write the failing unit tests

~~~ts
import { describe, expect, it } from 'vitest'
import { createDocumentPrefetcher } from '../src/utils/documentPrefetch'

function createDocumentStub() {
  const links: Array<{ rel: string; href: string }> = []
  return {
    links,
    document: {
      head: { append: (link: { rel: string; href: string }) => links.push(link) },
      createElement: () => ({ rel: '', href: '' })
    } as unknown as Pick<Document, 'createElement' | 'head'>
  }
}

describe('document prefetch registration', () => {
  it('registers one same-origin destination and deduplicates repeated intent', () => {
    const stub = createDocumentStub()
    const prefetch = createDocumentPrefetcher(stub.document, 'https://site.test/en/research.html?tab=tools#timeline')

    expect(prefetch('/zh-hk/research.html?tab=tools#timeline')).toBe(true)
    expect(prefetch('https://site.test/zh-hk/research.html?tab=tools#timeline')).toBe(false)
    expect(stub.links).toEqual([{
      rel: 'prefetch',
      href: 'https://site.test/zh-hk/research.html?tab=tools#timeline'
    }])
  })

  it('skips the current document and cross-origin destinations', () => {
    const stub = createDocumentStub()
    const prefetch = createDocumentPrefetcher(stub.document, 'https://site.test/en/research.html?tab=tools#timeline')

    expect(prefetch('/en/research.html?tab=tools#other')).toBe(false)
    expect(prefetch('https://other.test/zh-hk/research.html')).toBe(false)
    expect(stub.links).toHaveLength(0)
  })
})
~~~

- [ ] Step 2: Run the unit file and verify the expected missing-helper failure

Run:

~~~powershell
npm run unit -- tests/documentPrefetch.test.ts
~~~

Expected: Vitest reports the missing src/utils/documentPrefetch.ts module; it must not pass before the implementation exists.

- [ ] Step 3: Implement the minimal helper

Create src/utils/documentPrefetch.ts with:

~~~ts
export type PrefetchDocument = (href: string) => boolean

export function createDocumentPrefetcher(
  documentRef: Pick<Document, 'createElement' | 'head'>,
  currentHref: string
): PrefetchDocument {
  const current = new URL(currentHref)
  const registered = new Set<string>()

  return (href) => {
    let target: URL
    try {
      target = new URL(href, current)
    } catch {
      return false
    }
    if (target.origin !== current.origin) return false
    if (target.pathname === current.pathname && target.search === current.search) return false

    const normalizedHref = target.href
    if (registered.has(normalizedHref)) return false

    const link = documentRef.createElement('link') as HTMLLinkElement
    link.rel = 'prefetch'
    link.href = normalizedHref
    documentRef.head.append(link)
    registered.add(normalizedHref)
    return true
  }
}
~~~

- [ ] Step 4: Run the unit file and verify green

Run:

~~~powershell
npm run unit -- tests/documentPrefetch.test.ts
~~~

Expected: 2 tests pass with no assertion or collection errors.

- [ ] Step 5: Commit the isolated helper

~~~powershell
git add tests/documentPrefetch.test.ts src/utils/documentPrefetch.ts
git commit -m "新增语言切换文档预取助手"
~~~

### Task 2: Add failing R1 structure and behavior coverage

**Files:**

- Modify: tests/architecture.test.ts
- Modify: tests/e2e/locale.spec.ts
- Modify: tests/e2e/adaptive-header.spec.ts

**Interfaces:**

- Existing selectors remain .site-nav, .site-nav-surface, .nav-rail, .locale-switcher-desktop, .locale-switcher-mobile, and data-header-state.
- New selectors are .site-nav-brand, .site-nav-controls, .locale-switcher-desktop[data-current-locale], .locale-switcher-desktop a, and link[rel="prefetch"].

- [ ] Step 1: Add source-contract assertions

Assert that SiteHeader.vue contains one .site-nav-brand, one .site-nav-controls, no nav-status, and that LocaleSwitcher.vue contains data-current-locale, pointerenter/focus intent hooks, and the prefetch helper. Assert that shell.css contains the symmetric grid declaration and no transition: all. Keep the existing one-header, one-nav, adaptive-composable, and canonical-brand assertions.

- [ ] Step 2: Add failing browser assertions

Extend locale.spec.ts with a 1440px English route containing query and hash. Assert that the desktop control is visible, has exactly three anchors, exposes data-current-locale="en", marks the English anchor current, and preserves /research.html?tab=tools#sec-toolchain and /zh-hk/research.html?tab=tools#sec-toolchain destinations.

Add an intent test that hovers the Traditional Chinese anchor and observes one same-origin link[rel="prefetch"] for the localized research document. Triggering the same intent twice must not add a duplicate; the current English destination must not be prefetched.

Extend adaptive-header.spec.ts with surface/nav center geometry at 1440, 1024, and 768 where desktop navigation is active, plus absence of .nav-status. Add 320px and 390px checks for compact controls, viewport-bounded locale popover, and three reachable locale anchors.

- [ ] Step 3: Run the focused tests and verify the expected red state

Run:

~~~powershell
npm run unit -- tests/architecture.test.ts
$env:PLAYWRIGHT_USE_PREVIEW = '0'
$env:PLAYWRIGHT_OUTPUT_DIR = 'test-results/r1-red-chromium'
npm run test:e2e -- --project=chromium tests/e2e/locale.spec.ts tests/e2e/adaptive-header.spec.ts
~~~

Expected: the new assertions fail because the current header is flex-aligned, still renders nav-status, uses independent locale links, and has no prefetch intent hooks. Existing baseline assertions must remain meaningful.

### Task 3: Implement the single-DOM header and desktop locale orbit

**Files:**

- Modify: src/components/SiteHeader.vue
- Modify: src/components/LocaleSwitcher.vue
- Modify: src/styles/shell.css
- Modify: src/styles/responsive.css
- Modify: src/theme.css only if an existing token cannot express a reusable value

**Interfaces:**

- SiteHeader.vue keeps navItems, buildLocalizedPageHref, useLocale, useModalDialog, and useAdaptiveHeader contracts.
- LocaleSwitcher.vue keeps localeRegistry, resolvePageFromPath, buildLocalizedPageHref, rememberLocale, and the UiMessages schema.
- createDocumentPrefetcher is the only new runtime utility.

- [ ] Step 1: Implement the minimum template structure and locale metadata

Wrap the existing brand anchor in .site-nav-brand, wrap LocaleSwitcher/ThemeOrbit/menu trigger in .site-nav-controls, and leave one .nav-rail between them. Remove only the nav-status markup. Use explicit locale order, data-current-locale, complete localized aria-label values, and pointerenter/focus calls to the helper. Do not call preventDefault.

- [ ] Step 2: Implement the desktop grid and segmented indicator

Change .site-nav-surface to grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr). Set brand start, nav center, and controls end with min-width: 0 where needed. Replace independent desktop-link backgrounds with a padded three-column locale grid and one ::before active surface moved by data-current-locale="zh-CN", "zh-HK", or "en". Keep link text above the indicator, visible focus, and forced-colors behavior.

- [ ] Step 3: Remove obsolete status CSS and preserve adaptive morphing

Delete only .nav-status, .nav-status b, and @keyframes pulse from shell.css. Preserve the sentinel, sticky outer geometry, floating surface, explicit transitions, backdrop, and useAdaptiveHeader.ts unchanged.

- [ ] Step 4: Run focused unit and Chromium tests and verify green

Run:

~~~powershell
npm run unit -- tests/documentPrefetch.test.ts tests/architecture.test.ts tests/i18n.test.ts
$env:PLAYWRIGHT_USE_PREVIEW = '0'
$env:PLAYWRIGHT_OUTPUT_DIR = 'test-results/r1-green-chromium'
npm run test:e2e -- --project=chromium tests/e2e/locale.spec.ts tests/e2e/adaptive-header.spec.ts
~~~

Expected: helper, structure, locale, prefetch, geometry, URL-preservation, and existing header assertions pass.

### Task 4: Complete mobile, responsive, and motion behavior

**Files:**

- Modify: src/styles/responsive.css
- Modify: src/styles/shell.css only for shared control rules
- Modify: tests/e2e/locale.spec.ts
- Modify: tests/e2e/adaptive-header.spec.ts
- Modify: tests/e2e/site.spec.ts only if the new control-group structure changes a mobile-menu assertion

- [ ] Step 1: Add failing mobile and reduced-motion assertions

At 320px and 390px, assert that compact locale summary, theme, and menu controls have 44px minimum boxes, the opened locale popover stays within the viewport, all three real anchors are reachable, and document/body scroll widths do not exceed the viewport. Under reduced motion, assert that surface and indicator transition durations are effectively instant while active state remains present.

- [ ] Step 2: Implement mobile details and compact desktop rules

Keep native details. Make the summary show the current short label plus a chevron; bound the popover with max-width: calc(100vw - 24px) and viewport-safe placement. Put the controls in the grid right column on mobile, remove obsolete flex order/margin-left assumptions, keep nav-rail hidden below the existing breakpoint, and preserve the one modal menu. At compact desktop widths, hide only nonessential theme text or navigation metadata if measurements prove it necessary; do not hide locale options or wrap the nav.

- [ ] Step 3: Run the mobile and WebKit focused tests

Run:

~~~powershell
$env:PLAYWRIGHT_USE_PREVIEW = '0'
$env:PLAYWRIGHT_OUTPUT_DIR = 'test-results/r1-webkit-desktop'
npm run test:e2e -- --project=webkit-desktop tests/e2e/adaptive-header.spec.ts tests/e2e/locale.spec.ts tests/e2e/site.spec.ts tests/e2e/english-layout.spec.ts
$env:PLAYWRIGHT_OUTPUT_DIR = 'test-results/r1-webkit-mobile'
npm run test:e2e -- --project=webkit-mobile tests/e2e/adaptive-header.spec.ts tests/e2e/locale.spec.ts tests/e2e/site.spec.ts tests/e2e/english-layout.spec.ts
~~~

Expected: desktop and mobile pass without body overflow, focus, locale, or modal regressions. Classify every failure by its exact assertion before changing code.

### Task 5: Run the full R1 local quality lane and inspect visual output

**Files:**

- Modify only exact intended visual snapshots under tests/e2e/visual-snapshots/ if geometry review proves a baseline change is expected.

- [ ] Step 1: Run source-quality gates

Run:

~~~powershell
npm run typecheck
npm run check
~~~

Expected: both commands exit 0. Generated dist remains untracked and is removed or ignored after verification.

- [ ] Step 2: Run build, smoke, asset, and interaction checks

Run:

~~~powershell
npm run brand:assets:check
npm run build
npm run smoke
npm run lighthouse:interactions
~~~

Expected: brand consistency, generated pages, smoke, and interaction budgets pass without threshold edits.

- [ ] Step 3: Run normal Lighthouse once

Run:

~~~powershell
npm run lighthouse
~~~

Expected: performance, accessibility, best practices, SEO, LCP, TBT, and CLS remain within existing budgets. Do not rerun merely to seek a preferred score.

- [ ] Step 4: Run the required PageCompass stress lane

Run the relevant Chromium/WebKit PageCompass suites with an isolated PLAYWRIGHT_OUTPUT_DIR, --repeat-each=10, and --retries=0, preserving trace and screenshot policies. This verifies that header geometry has not masked deep-link or PageCompass regressions.

- [ ] Step 5: Perform visual review before snapshot updates

Inspect 1440 light/dark resting/floating, 1024 English, 768 English where desktop nav is active, and 390 light/dark. If a snapshot differs, inspect the exact diff and update only the intended baseline after confirming the change is caused by R1.

### Task 6: Commit, Draft PR, and post-merge verification

**Files:**

- All intended R1 implementation and test files above; no dist/, test-results/, or handoff files.

- [ ] Step 1: Review and commit the final diff

Run:

~~~powershell
git status --short
git diff --check
git diff --stat
git add src/components/SiteHeader.vue src/components/LocaleSwitcher.vue src/utils/documentPrefetch.ts src/styles/shell.css src/styles/responsive.css src/theme.css tests/documentPrefetch.test.ts tests/i18n.test.ts tests/architecture.test.ts tests/e2e/locale.spec.ts tests/e2e/adaptive-header.spec.ts tests/e2e/site.spec.ts tests/e2e/english-layout.spec.ts tests/e2e/visual-snapshots
git commit -m "优化全站导航与语言切换控件"
~~~

Expected: only intended R1 files are staged; generated output is absent.

- [ ] Step 2: Push and create the Draft PR

~~~powershell
git push -u origin codex/feat/header-locale-control-refinement
gh pr create --repo yance7/yance7.github.io --base main --head codex/feat/header-locale-control-refinement --draft --title "优化全站导航与语言切换控件" --body "R1: header grid, locale orbit, intent prefetch, responsive and accessibility refinements. See the committed design spec for acceptance criteria."
~~~

Expected: a Draft PR targets main and contains the R1 summary, tests, visual review, and known environment distinction.

- [ ] Step 3: Verify exact PR CI and Quality Audit

Use gh pr checks and gh run view for the exact PR head. Confirm Pull Request CI and every required Quality lane executed and passed; a successful workflow with skipped required jobs is insufficient.

- [ ] Step 4: Mark ready and merge normally only after green review

After visual review and green checks, mark the PR ready and merge normally. Do not bypass branch protection or force-push.

- [ ] Step 5: Verify post-merge main before R2

~~~powershell
git fetch origin --prune
git rev-parse origin/main
gh run list --repo yance7/yance7.github.io --branch main --limit 5
~~~

Record R1_MERGE_SHA and R1_FINAL_MAIN_SHA, plus post-main Pages and Quality run IDs/results. Start R2 only if both are green.

## R1 report fields

Report WORKSTREAM, START_MAIN_SHA, BRANCH, ROOT_CAUSE / DESIGN CHANGE, FILES_CHANGED, TESTS_ADDED_OR_CHANGED, LOCAL_RESULTS, COMMIT_SHA, PR_NUMBER, PR_CI_RUN, PR_CI_RESULT, QUALITY_RUN, QUALITY_RESULT, VISUAL_REVIEW, MERGE_SHA, POST_MERGE_PAGES, POST_MERGE_QUALITY, and BLOCKER before starting R2.
