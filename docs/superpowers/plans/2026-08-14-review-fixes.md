# Code Review Boundary Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the latest review report's confirmed lifecycle, state-model, reproducibility, type-safety, security-hardening, and compatibility-test fixes without changing site copy or visual direction.

**Architecture:** The app will expose an explicit `pageLoadState`, load pages from a typed `PageKey` loader map, and mount the PageCompass only after the page component has rendered. Modal interaction state will remain active until Vue's leave transition finishes. Shared image loading will have one bounded promise-based implementation used by both the preloader and album spotlight.

**Tech Stack:** Vue 3, TypeScript, Vite 8, Vitest, Playwright, axe-core, ESLint, npm lockfile, GitHub Actions.

## Global Constraints

- Keep `html-src/*.html` as the HTML source of truth and never hand-edit `dist/`.
- Do not change page copy, URLs, content records, or visual direction.
- Keep the existing `main` branch workflow; do not create a branch or PR.
- Preserve the current retry limit of two retries and the current reduced-motion behavior.
- Every production behavior change gets a regression test before implementation.

### Task 1: Make async page loading and section navigation lifecycle-driven

**Files:**
- Modify: `src/App.vue`, `src/components/PageCompass.vue`, `src/utils/navigation.ts`, `src/data/pageRegistry.ts`
- Create: `src/components/PageLoadError.vue`
- Test: `tests/e2e/site.spec.ts`, `tests/architecture.test.ts`

- [ ] Add E2E coverage for a delayed Works page chunk and a permanently failed Works page chunk.
- [ ] Add an explicit `PageLoadState` with `loading`, `ready`, and `error`; set `ready` only after the bounded retry resolves and `error` only after final failure.
- [ ] Replace registry module strings with a `Record<PageKey, PageLoader>` in `App.vue`, and use a controlled error component for final chunk failure.
- [ ] Run the targeted E2E tests, then remove App and PageCompass MutationObservers and five-second timers.
- [ ] After `ready` and `nextTick`, perform the hash scroll; mount PageCompass only in `ready` state and let its mounted hook establish IntersectionObserver directly.

### Task 2: Keep modal containment active through leave transitions

**Files:**
- Modify: `src/composables/useModalDialog.ts`, `src/components/ImageLightbox.vue`, `src/components/SiteHeader.vue`
- Test: `tests/e2e/site.spec.ts`, `tests/e2e/concerts.spec.ts`

- [ ] Add an E2E assertion that Escape leaves `.site-shell[inert]` and body scroll locked until the lightbox leave transition completes, then restores focus and cleanup.
- [ ] Split lightbox visibility from dialog activity, release activity from `Transition @after-leave`, and remove the fixed close timer.
- [ ] Make arrow-key handling ignore the leave interval and use `.site-shell` as the inert background.
- [ ] Remove duplicate initial-focus work from `useModalDialog` while preserving mobile-menu behavior.

### Task 3: Bound image loading and simplify state/data contracts

**Files:**
- Modify: `src/utils/imagePreload.ts`, `src/components/AlbumWall.vue`, `src/composables/useAlbumSpotlight.ts`, `src/data/types.ts`, `src/data/albums.ts`, `src/data/concerts.ts`, `src/pages/ConcertsPage.vue`, `src/data/index.ts`, `src/components/StatusBadge.vue`, `src/components/TimelineTrack.vue`, `src/components/ProjectShowcase.vue`, `src/data/projects.ts`
- Test: `tests/architecture.test.ts`, `tests/robustness.test.ts`

- [ ] Add unit tests proving image load timeout clears pending state and that srcset fallback remains bounded.
- [ ] Implement one timeout-aware `loadImage` utility and use it from shared preloading and AlbumWall spotlight loading.
- [ ] Remove `requestToken` from public spotlight state, derive StatusBadge labels from `Status`, remove project `statusLabel`, and remove Timeline's status map.
- [ ] Add `ReadonlyNonEmptyArray<T>` and make the album dataset satisfy it.
- [ ] Remove unused page metadata labels and unused concert return fields; expose `venueCount` from `getConcertState`.
- [ ] Use a reactive carousel index record and runtime-check tile refs instead of asserting arbitrary values.

### Task 4: Complete registry-driven build and local/CI parity

**Files:**
- Modify: `src/data/pageRegistry.ts`, `vite.config.ts`, all six content files under `html-src/`, `scripts/smoke-test.ts`, `tests/e2e/site.spec.ts`, `package.json`
- Test: `tests/architecture.test.ts`, `tests/content.test.ts`

- [ ] Put the existing OG image filenames and alt strings in page registry metadata and replace HTML placeholders during Vite build without changing rendered values.
- [ ] Make smoke checks and generic E2E routes derive from `pageEntries`/`htmlPageEntries` rather than duplicated maps.
- [ ] Add `npm run sitemap` to `npm run check` immediately before build.

### Task 5: Make CI dependency execution reproducible and failure-visible

**Files:**
- Modify: `package.json`, `package-lock.json`, `.github/workflows/pages.yml`, `.github/workflows/quality-budget.yml`, `.github/workflows/external-links.yml`, `scripts/check-external-links.ts`
- Create: `.github/dependabot.yml`

- [ ] Add exact `@lhci/cli@0.15.1`, plus `lighthouse` and `links` scripts, and regenerate the lockfile.
- [ ] Replace all `npx` execution with `npm ci` followed by the locked npm scripts; add npm caching to External Links.
- [ ] Remove `continue-on-error` from External Links and retain its HEAD/GET fallback with bounded retries.
- [ ] Remove the `push` trigger from the standalone Lighthouse workflow so main is measured only inside the deploy gate.

### Task 6: Add browser/type/security hardening

**Files:**
- Modify: `eslint.config.js`, `tsconfig.json`, `package.json`, all `_blank` link components, `.github/workflows/pages.yml`, `.github/workflows/external-links.yml`, `.github/workflows/quality-budget.yml`, `.github/workflows/*.yml`
- Create: `tsconfig.base.json`, `tsconfig.app.json`, `tsconfig.node.json`, `tsconfig.test.json`, `.github/dependabot.yml`, `tests/e2e/compatibility.spec.ts`

- [ ] Split app, Node, and test TypeScript environments and make the typecheck script check all three projects.
- [ ] Split ESLint browser, Node, and test globals; enable `vue/no-v-html` and strict explicit-any handling.
- [ ] Add `rel="noopener noreferrer"` to external `_blank` links.
- [ ] Add Firefox desktop and Pixel Chromium compatibility smoke projects, while keeping the full suite on Chromium and WebKit mobile.
- [ ] Pin GitHub Actions to verified full SHAs and configure weekly Dependabot updates for npm and GitHub Actions.
- [ ] Add LCP and TBT Lighthouse budgets alongside the existing accessibility, SEO, best-practices, and CLS assertions using measured local baselines.

## Verification

- `npm run lint`
- `npm run typecheck`
- `npm run deadcode`
- `npm run unit`
- `npm run sitemap`
- `npm run build`
- `npm run smoke`
- `npm run test:e2e -- --workers=2`
- `npm run lighthouse`
- `git status --short --branch`
