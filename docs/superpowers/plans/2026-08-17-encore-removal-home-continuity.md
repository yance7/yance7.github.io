# Encore Removal and Home Continuity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with verification checkpoints.

**Goal:** Remove the abandoned Encore project from the site's maintained records and make the home page flow continuously from the editorial stage into `01 SELECTED WORK` while refining the related interaction details.

**Architecture:** Keep FreshEye as the only maintained `Project` record, derive the Works page compass and count from that single source, and update source HTML metadata rather than generated root HTML. Keep the home hero and body on the shared background, remove the hard hero boundary, and use restrained atmospheric fading and focus-state polish without adding a new divider.

**Tech Stack:** Vue 3, TypeScript, Vite multi-page build, CSS modules imported through `src/styles`, Vitest, Playwright, ESLint, vue-tsc.

## Global Constraints

- Edit `html-src/*.html` as the HTML source of truth; never hand-edit root generated HTML.
- Never hand-edit `dist/`; regenerate it with `npm run build`.
- Keep all commits on `main`; do not create a branch or PR.
- Preserve the existing warm-paper / blue-black theme tokens, 44px touch targets, reduced-motion behavior, and no-layout-shift hover rules.
- Use local assets only; do not add dependencies or runtime hotlinks.

---

### Task 1: Lock the new content and home-surface contract in tests

**Files:**
- Modify: `tests/e2e/archive.spec.ts`
- Modify: `tests/e2e/compatibility.spec.ts`
- Modify: `tests/e2e/site.spec.ts`
- Modify: `tests/e2e/home.spec.ts`

**Interfaces:**
- Consumes the existing Works page, PageCompass, home hero, and project data contracts.
- Produces regression coverage proving there is one maintained Works project, no Encore anchor/content remains, and the home hero has no bottom border.

- [x] **Step 1: Replace Encore-specific Works expectations with the single-project contract**

  Update the existing Works archive assertions to expect exactly one `.showcase`, `#project-fresheye` only, and no `#project-encore`, `Encore`, `余响`, or `FROM LIVE TO MEMORY` text. Update the expected project wordmark array to contain only FreshEye.

- [x] **Step 2: Remove obsolete Encore hash and compass scenarios**

  Remove the compatibility test that navigates to `#project-encore`, remove the Encore compass keyboard assertions, and change any Works destination lists from `#project-encore` to the remaining valid sections.

- [x] **Step 3: Add a failing home continuity assertion**

  Add one browser assertion to `tests/e2e/home.spec.ts` that reads `getComputedStyle(document.querySelector('.home-hero')!).borderBottomWidth` and expects `0px`. Keep the existing shared-background assertion so the hero still matches the body surface in both themes.

- [x] **Step 4: Run the focused tests and confirm they fail for the expected old behavior**

  Run:

  ```bash
  npm run test:e2e -- tests/e2e/home.spec.ts tests/e2e/archive.spec.ts tests/e2e/compatibility.spec.ts tests/e2e/site.spec.ts --project=chromium --workers=2
  ```

  Expected result: failure only on the new Encore absence assertions and the new `borderBottomWidth` assertion, because the old source still contains Encore and the hero still declares a bottom border.

### Task 2: Remove Encore from maintained content and navigation metadata

**Files:**
- Modify: `src/data/projects.ts`
- Modify: `src/data/site.ts`
- Modify: `src/data/pageRegistry.ts`
- Modify: `html-src/works.html`
- Modify: `tests/e2e/archive.spec.ts`
- Modify: `tests/e2e/compatibility.spec.ts`
- Modify: `tests/e2e/site.spec.ts`

**Interfaces:**
- `projects` remains an array of `Project` records consumed by `WorksPage`, home `featuredProjects`, page metadata, and tests.
- `pageRegistry.works.sections` remains the source for the page compass and contains only `works-overview` and `project-fresheye`.

- [x] **Step 1: Delete the Encore project record**

  Remove the `id: 'encore'` object from `src/data/projects.ts`; keep `featuredProjects = projects.filter((item) => item.id === 'fresheye')` so the home product card remains stable.

- [x] **Step 2: Update Works registry metadata and section anchors**

  Change the Works OG alt text to `FreshEye product portfolio` and remove the `project-encore` section from `src/data/pageRegistry.ts`. Do not add a replacement fake section.

- [x] **Step 3: Update source page metadata**

  Change `html-src/works.html` title description and Open Graph description to describe only FreshEye. Leave the canonical URL and page route unchanged.

- [x] **Step 4: Run the focused tests and confirm they pass**

  Re-run the focused Playwright command from Task 1. Expected result: all affected archive, compatibility, site, and home assertions pass after the source metadata/data cleanup and before styling changes.

### Task 3: Create the continuous home-stage transition and polish local interaction states

**Files:**
- Modify: `src/styles/shell.css`
- Modify: `src/styles/content.css`
- Modify: `src/styles/responsive.css`
- Modify: `src/styles/works.css`
- Modify: `src/pages/WorksPage.vue`
- Modify: `src/components/HomeHero.vue` only if the final focus/semantics require a markup adjustment
- Modify: `tests/e2e/home.spec.ts` only if a new semantic hook is required

**Interfaces:**
- `HomeHero` keeps the existing `#selected-work` and `#home-worlds` fragment destinations.
- `WorksPage` derives its copy from `projects.length` and must remain correct when the array has one record.

- [x] **Step 1: Remove the hard hero boundary without adding another rule**

  Remove `border-bottom: 1px solid var(--line)` from `.home-hero`. Keep the same `var(--bg)` surface as the body and tune the existing bottom atmosphere so it fades into the page rather than ending at a visible edge. Do not use a new horizontal border, pseudo-element rule, or full-width separator under `SCROLL TO EXPLORE`.

- [x] **Step 2: Give the first content section a deliberate but quiet handoff**

  Add only the necessary top breathing room to `.page-home > .home-focus`, retain the section heading's semantic `01` marker, and ensure the first section begins on the shared surface. Refine `.home-stage-scroll` hover/focus treatment so the arrow and line remain within the existing 4px motion limit and the focus ring remains visible.

- [x] **Step 3: Tune one-project Works presentation and home focus states**

  Make the Works heading copy grammatical for a single maintained project. Preserve the existing dossier structure and URLs, but tune the single-project list spacing and focus-visible surface so keyboard users get the same editorial cue as pointer users without changing text weight, tracking, or wrapping.

- [x] **Step 4: Preserve mobile, dark-theme, touch, and reduced-motion constraints**

  Add or adjust responsive rules only where the new top handoff or single dossier spacing needs it. Under `prefers-reduced-motion: reduce`, keep the continuity surface static and remove any new transitions. Under coarse pointers, do not add hover transforms.

- [x] **Step 5: Run the focused tests and inspect the built page**

  Run the focused Playwright command again, then run `npm run build` and inspect the generated `dist/index.html` and `dist/works.html` through the existing smoke checks. Confirm no Encore text or anchor exists in the generated artifact and no hard bottom border is computed on the home hero.

### Task 4: Full verification and direct main deployment

**Files:**
- Modify: generated `dist/` only through `npm run build`; do not stage it.
- Modify: no additional source files unless a verification failure identifies a directly related regression.

- [x] **Step 1: Run static and unit quality gates**

  Run `npm run check` and require lint, typecheck, deadcode, unit tests, sitemap generation, build, and smoke to pass.

- [x] **Step 2: Run external-link and full browser checks**

  Run `npm run links` and `CI=1 npm run test:e2e -- --workers=2`. Record the exact pass/skip counts and any documented anti-bot link notice.

- [x] **Step 3: Review the final diff and tracked-file scope**

  Run `git diff --check`, `git status --short --branch`, and inspect `git diff --stat`. Confirm only source, tests, metadata, and the committed plan are present; generated `dist/`, Lighthouse output, Playwright output, and local screenshots remain ignored.

- [x] **Step 4: Commit and push directly to main**

  Use a concise Chinese action-style commit message such as:

  ```bash
  git add src html-src tests docs/superpowers/plans/2026-08-17-encore-removal-home-continuity.md
  git commit -m "移除Encore并优化首页连续舞台"
  git push origin main
  ```

- [x] **Step 5: Verify GitHub Actions and Pages deployment**

  Through the configured `127.0.0.1:7897` proxy, verify the new `main` workflow's build and deploy jobs are successful, then report the commit SHA and workflow URL.
