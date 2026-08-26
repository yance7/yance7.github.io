# Multilingual + Adaptive PageCompass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver URL-addressable `zh-CN`, `zh-HK`, and admissions-oriented `en` versions of the six-page site, plus a collapsed, accessible Adaptive PageCompass, without changing stable facts or existing Simplified Chinese URLs.

**Architecture:** Keep route facts, IDs, dates, links, metrics, media, and technical names in the existing data modules. Add a typed `src/i18n/` core, keyed locale copy under `src/data/locales/`, localized UI accessors, and a post-build generator for `/zh-hk/` and `/en/`. Keep Compass scroll tracking in `usePageCompass.ts`; keep expanded/collapsed view state in `PageCompass.vue`.

**Tech Stack:** Vue 3, TypeScript, Vite multi-page build, `tsx` build scripts, Vitest, Playwright, axe, Fontsource variable fonts.

**Spec:** `docs/superpowers/specs/2026-08-25-multilingual-adaptive-compass-design.md`

## Global Constraints

- `zh-CN` keeps the root URLs; do not migrate to `/zh-cn/`.
- Locale is resolved from `window.location.pathname`; `yance-locale` never overrides an explicit `/en/` or `/zh-hk/` path.
- Do not use query/hash language switches, CSS-hidden parallel languages, runtime translation, IP redirects, or runtime OpenCC conversion.
- Do not add `vue-i18n`; typed dictionaries must be complete and must not fall back to Chinese.
- Stable facts and entity IDs remain single-source; do not change real scores, awards, research results, dates, links, or metrics.
- Do not add retries, fixed `waitForTimeout`, weakened assertions, or unreviewed visual snapshots.
- Build output is generated only by `npm run build`; do not hand-edit `dist/`.
- Formal E2E and Lighthouse runs use `--retries=0`.

---

### Task 1: Locale core and typed dictionaries

**Files:**
- Create: `src/i18n/types.ts`, `src/i18n/locales.ts`, `src/i18n/index.ts`, `src/i18n/useLocale.ts`
- Create: `src/i18n/ui/zh-CN.ts`, `src/i18n/ui/zh-HK.ts`, `src/i18n/ui/en.ts`
- Test: `tests/i18n.test.ts`
- Modify: `src/main.ts`

**Interfaces:**
- Produce `Locale`, `LocaleDefinition`, `UiMessages`, `resolveLocaleFromPath()`, `getLocalePrefix()`, `stripLocalePrefix()`, `buildLocalizedPageHref()`, `resolvePageFromPath()`, `initializeLocale()`, and `useLocale()`.
- `useLocale()` returns the initialized locale, its `LocaleDefinition`, and a complete `UiMessages` dictionary with no fallback branch.

- [ ] **Step 1: Write failing parser and URL tests.** Assert `/`, `/research.html`, `/zh-hk/`, `/zh-hk/research.html`, `/en/`, and `/en/research.html`; assert home/research URLs preserve `?from=nav#sec-toolchain` and never emit `/en/index.html`.
- [ ] **Step 2: Run `npm run unit -- tests/i18n.test.ts` and confirm the expected missing-module failure.**
- [ ] **Step 3: Implement locale definitions, path functions, pre-mount initialization, and complete UI dictionaries.** The UI schema must include navigation, theme, locale switcher, Compass, accessibility, common status, error, page actions, research disclosure, lightbox, album, honors filter, and footer messages.
- [ ] **Step 4: Set `document.documentElement.lang` and `data-locale` before `createApp()` in `src/main.ts`; keep theme initialization behavior unchanged.**
- [ ] **Step 5: Run the focused unit suite and `npm run typecheck`.**

### Task 2: Stable registry and localized content contracts

**Files:**
- Modify: `src/data/pageRegistry.ts`, `src/data/types.ts`, `src/data/index.ts`, `src/data/site.ts`
- Create: `src/data/locales/index.ts`
- Create: `src/data/locales/zh-CN/{site,academics,honors,research,projects,concerts,albums,community}.ts`
- Create: `src/data/locales/zh-HK/{site,academics,honors,research,projects,concerts,albums,community}.ts`
- Create: `src/data/locales/en/{site,academics,honors,research,projects,concerts,albums,community}.ts`
- Test: `tests/i18n.test.ts`

**Interfaces:**
- Produce `getLocalizedPageMeta(locale, page)`, `getLocalizedNavItems(locale)`, `getLocalizedSections(locale, page)`, and typed `getLocalizedData(locale)` accessors.
- Every localized entity map is keyed by a stable ID and is checked against the base IDs at test time.

- [ ] **Step 1: Add failing tests for registry shape, identical research/project/honor/concert IDs, three-label section parity, and no `nav.en`/`item.en` registry fields.**
- [ ] **Step 2: Run the focused unit suite and record the expected failures.**
- [ ] **Step 3: Remove localized labels from `pageRegistry`; retain route facts, OG image path, and stable section IDs only.**
- [ ] **Step 4: Add keyed zh-CN, zh-HK, and en copy maps.** Keep factual fields shared; author English as concise admissions copy and zh-HK as Hong Kong Traditional Chinese. Preserve official names, titles, technical names, and all factual numbers.
- [ ] **Step 5: Implement merge/accessor functions and run the focused unit suite plus `npm run typecheck`.**

### Task 3: Localized shared chrome and internal links

**Files:**
- Create: `src/components/LocaleSwitcher.vue`
- Modify: `src/App.vue`, `src/components/SiteHeader.vue`, `src/components/SiteFooter.vue`, `src/components/ThemeOrbit.vue`, `src/components/ArchiveHero.vue`, `src/components/HomeHero.vue`, `src/components/SectionHeading.vue`, `src/components/StatusBadge.vue`, `src/components/ArchiveFilter.vue`, `src/components/PageLoadError.vue`, `src/components/YanceButton.vue`
- Modify: `src/components/TimelineTrack.vue`, `src/components/ProjectShowcase.vue`, `src/components/CopyCitation.vue`, `src/components/ImageLightbox.vue`, `src/components/AlbumWall.vue`
- Modify: `src/pages/HomePage.vue`, `src/pages/AcademicsPage.vue`, `src/pages/HonorsPage.vue`, `src/pages/ResearchPage.vue`, `src/pages/WorksPage.vue`, `src/pages/ConcertsPage.vue`, `src/pages/NotFoundPage.vue`

- [ ] **Step 1: Add locale E2E assertions for root, `/zh-hk/`, and `/en/`: html language, clean single-language nav, current switcher, localized 404 copy, and no paired `nav-en`/`item.en` chrome.**
- [ ] **Step 2: Run the new locale test and watch it fail against the existing bilingual chrome.**
- [ ] **Step 3: Add `LocaleSwitcher` with desktop `<nav>` anchors and a mobile `<details>` menu; preserve current page/hash and store only explicit choices.**
- [ ] **Step 4: Replace hardcoded chrome strings and bilingual labels with `useLocale()` messages; route every internal page link through `buildLocalizedPageHref()`.**
- [ ] **Step 5: Render localized page data in all six page components and shared child components; keep proper names/technical strings unchanged.**
- [ ] **Step 6: Run locale E2E and focused existing page tests in Chromium with `--retries=0`.**

### Task 4: Localized fonts, build variants, SEO, sitemap, and smoke

**Files:**
- Modify: `package.json`, `package-lock.json`, `src/fonts.css`, `src/theme.css`, `vite.config.ts`
- Create: `src/data/seo.ts`, `scripts/generate-localized-pages.ts`
- Modify: `scripts/generate-sitemap.ts`, `scripts/smoke-test.ts`, `html-src/*.html`
- Test: `tests/i18n.test.ts`, `tests/final-seal.test.ts`

- [ ] **Step 1: Add failing unit/smoke expectations for 18 URLs, three hreflang alternates, self-canonical metadata, locale attributes, and HK font variables.**
- [ ] **Step 2: Run the focused tests and confirm they fail before the generator exists.**
- [ ] **Step 3: Add `@fontsource-variable/noto-sans-hk` and `noto-serif-hk` aligned to `^5.3.0`; select them only under `:lang(zh-HK)`.**
- [ ] **Step 4: Implement complete `LocalizedSeo` data and the post-build generator; rewrite only locale-sensitive metadata and root-relative asset references.**
- [ ] **Step 5: Add Vite dev middleware for `/en/...` and `/zh-hk/...`, including locale-preserving unknown-path fallback to `404.html`.**
- [ ] **Step 6: Generate 18 sitemap entries with reciprocal xhtml alternates and update smoke to inspect root pages, localized pages, 404, CSP, hashes, canonical, hreflang, OG locale/image, and source-path absence.**
- [ ] **Step 7: Run `npm run sitemap`, `npm run build`, and `npm run smoke`; inspect generated HTML and verify `/en/` and `/zh-hk/` in dev/preview.**

### Task 5: Adaptive PageCompass

**Files:**
- Modify: `src/components/PageCompass.vue`, `src/composables/usePageCompass.ts`, `src/utils/pageCompass.ts`, `src/styles/shell.css`, `src/styles/responsive.css`
- Test: `tests/pageCompass.test.ts`, `tests/e2e/site.spec.ts`, `tests/e2e/locale.spec.ts`, `tests/e2e/compatibility.spec.ts`

- [ ] **Step 1: Add failing tests for desktop collapsed state, disclosure semantics, hover/focus expansion, section selection, removed previous/next controls, mobile 44px trigger, outside/Escape close, and top/hash reset.**
- [ ] **Step 2: Run targeted Chromium tests and confirm failures describe the old always-expanded Compass.**
- [ ] **Step 3: Keep scroll/active/progress/goTop in `usePageCompass`; add only the minimum selection/close hooks needed by the view.**
- [ ] **Step 4: Implement a localized collapsed trigger and expanded panel with `aria-expanded`, `aria-controls`, inert/aria-hidden only when no focusable content is exposed, and 44px mobile targets.**
- [ ] **Step 5: Remove previous/next arrows and redundant always-visible numeric progress; keep the top progress rail and expanded numeric progress.**
- [ ] **Step 6: Run targeted Chromium, WebKit mobile, and Android Compass tests with retries 0.**

### Task 6: Regression, visual review, and quality gates

**Files:**
- Create: `tests/e2e/locale.spec.ts`
- Modify: `tests/e2e/site.spec.ts`, `tests/e2e/compatibility.spec.ts`, `tests/e2e/visual-matrix.spec.ts`, `tests/e2e/ui-primitives.spec.ts`, `tests/pageCompass.test.ts`
- Modify: visual snapshots only after reviewing intentional diffs

- [ ] **Step 1: Run the required Chromium locale/site stress command with `--repeat-each=10 --retries=0`; fix real failures without sleeps or weakened assertions.**
- [ ] **Step 2: Run WebKit locale/site, Android locale/site, axe, and UI primitive suites with retries 0.**
- [ ] **Step 3: Run the visual suite without snapshot updates; inspect diffs for only LocaleSwitcher, single-language labels, new Compass, and language-length layout effects.**
- [ ] **Step 4: If and only if reviewed diffs are intentional, update snapshots once and rerun normal visual comparison with `--retries=0`.**
- [ ] **Step 5: Run `npm run check`, full Chromium, WebKit site/UI, visual, Firefox, Android, desktop/mobile Lighthouse, and interaction budget.**
- [ ] **Step 6: Run the hardcoded-string audit and remove unintended UI chrome matches; confirm old bilingual schema matches are zero.**

### Task 7: PR and post-merge Final Seal

**Files:**
- Modify: PR description/review artifacts only; no generated `dist/` commit

- [ ] **Step 1: Review `git diff`, `git diff --check`, stable facts, English copy, zh-HK copy, URL mappings, and screenshots in light/dark/desktop/mobile/English/zh-HK.**
- [ ] **Step 2: Commit logical changes with concise Chinese action summaries and push the feature branch.**
- [ ] **Step 3: Open a PR against `main`, report head SHA, changed files, test matrix, retries/flaky state, and snapshot status.**
- [ ] **Step 4: After merge, verify the same merge SHA has green Quality Audit and Pages deployment; verify `pages_build_version` matches that SHA.**
- [ ] **Step 5: Run production smoke for `/`, `/en/`, `/zh-hk/`, `/en/research.html`, and `/zh-hk/research.html`; only then report `Multilingual + Adaptive Compass — Production Final Seal: PASS`.**
