# Header + Locale Control Refinement Design

> Workstream: R1 — Header + Locale Control Refinement
>
> Date: 2026-08-29
>
> Baseline: `fec4e02520e0c7a95ab8611cf15f6a60f38e7dd9`

## Goal

Refine the single adaptive header and its locale control so that the brand mark remains on the left, the primary navigation is geometrically centered, and locale/theme controls form a coherent right-hand control group across the three supported locales and the tested responsive widths.

The work preserves the existing URL-first multi-page architecture, adaptive-header state machine, canonical raster brand mark, accessibility semantics, and current quality thresholds.

## Evidence and current constraints

- `origin/main` is currently the expected healthy baseline `fec4e02520e0c7a95ab8611cf15f6a60f38e7dd9`.
- There are currently no open pull requests.
- The latest `main` Pages run `33185428364` and Quality Audit run `33185428273` both succeeded.
- `SiteHeader.vue` currently renders one header and one `.nav-rail`, while `.site-nav-surface` uses flex alignment and the nav uses `margin-left: auto`.
- `LocaleSwitcher.vue` already emits real localized anchors and preserves page/search/hash through `buildLocalizedPageHref`, but its desktop links are independent 24px controls and its mobile summary exposes two locale labels.
- `useAdaptiveHeader.ts` is an IntersectionObserver-only resting/floating state composable with cleanup and must remain unchanged unless a test demonstrates a real regression.
- Baseline `npm run typecheck` passed. The focused source-contract unit run passed 23/23 tests when allowed to start Vitest outside the sandbox; the sandbox-only run failed before test collection with `spawn EPERM`.

## Scope

### Included

1. Replace the desktop locale links with a three-equal-segment control using one animated active surface.
2. Keep every locale option as a real anchor with localized accessible names, `href`, `hreflang`, and `aria-current`.
3. Add a small same-origin document-prefetch helper, deduplicated by normalized destination URL, triggered by pointer intent and keyboard focus on non-current locale links.
4. Change the desktop header surface to a single three-column grid: brand, centered navigation, controls.
5. Remove the header-only `ONLINE / 2026` status and its pulse animation.
6. Keep the mobile locale selector as a semantic `<details>` popover, visually aligned with the desktop control family and bounded by the viewport.
7. Add geometry, responsive, locale-preservation, prefetch, reduced-motion, and interaction regression coverage.

### Explicitly excluded

- Any change to the `useAdaptiveHeader` IntersectionObserver state logic.
- A second header or a second desktop navigation DOM.
- SPA routing, default-navigation interception, or a router dependency.
- Runtime text measurement, continuous animation, per-frame JavaScript styling, or arbitrary timing sleeps in tests.
- Changes to PageCompass active-section selection, the canonical Y icon, SEO thresholds, Lighthouse budgets, branch protection, governance, or handoff documents.

## Architecture

### Header layout

`SiteHeader.vue` keeps one `.site-nav` and one `.site-nav-surface`. Its direct visual children become:

```text
.site-nav-surface
├── .site-nav-brand       (brand anchor + BrandMark)
├── .nav-rail             (single primary navigation)
└── .site-nav-controls    (LocaleSwitcher + ThemeOrbit + mobile menu trigger)
```

On desktop the surface uses:

```css
grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
```

The brand is `justify-self: start`, the nav is `justify-self: center`, and controls are `justify-self: end`. Symmetric surface padding makes the nav center comparable to the surface center. The existing sticky outer height and resting/floating morph remain owned by `.site-nav` and `.site-nav-surface`.

On mobile the nav rail remains hidden and the existing single modal navigation remains the only expanded site navigation. The right control group contains the compact locale summary, theme button, and menu trigger; all touch targets remain at least 44px.

### Locale control

The locale order is the explicit registry order `zh-CN`, `zh-HK`, `en`. The desktop nav receives `data-current-locale` and uses CSS attribute selectors to move one `::before` active surface across three equal grid tracks. This avoids JavaScript text-width measurement and avoids three unrelated active backgrounds.

The mobile control keeps native `<details>` disclosure. Its summary shows only the current short label and a chevron; its popover contains all three real anchors. The popover has a viewport-bounded maximum width and uses the existing control/theme tokens.

`rememberLocale` remains a non-blocking click-side preference write. No locale link handler calls `preventDefault`; navigation remains authoritative in the destination URL.

### Document prefetch

Add `src/utils/documentPrefetch.ts` with this public factory:

```ts
export type PrefetchDocument = (href: string) => boolean

export function createDocumentPrefetcher(
  documentRef: Pick<Document, 'createElement' | 'head'>,
  currentHref: string
): PrefetchDocument
```

The returned function:

1. Resolves `href` against `currentHref` with `URL`.
2. Returns `false` for malformed or cross-origin URLs.
3. Returns `false` when pathname and search identify the current document.
4. Uses a `Set<string>` local to the factory to deduplicate normalized absolute hrefs.
5. Appends one `<link rel="prefetch" href="...">` to `document.head` and returns `true` for a new destination.

`LocaleSwitcher.vue` creates one prefetcher with the browser document/location and invokes it from `pointerenter` and `focus` on non-current options. The helper never blocks or changes the link's default navigation.

### Error and compatibility behavior

- If `document`, `window`, or `URL` input is unavailable, the component simply renders normal anchors and does not prefetch.
- Storage failure remains optional and is swallowed by the existing `rememberLocale` behavior.
- Forced-colors and reduced-motion rules disable decorative indicator transition while preserving active state and focus visibility.
- Browsers without prefetch support still receive normal anchors; prefetch is an enhancement, not a navigation dependency.

## Acceptance invariants

- Exactly one `.site-nav` and one `.nav-rail` exist in the document.
- `ONLINE / 2026` is absent from the header.
- The canonical `BrandMark` source path and header link remain unchanged.
- Desktop navigation center is within 4px of the surface center at applicable tested widths.
- Resting/floating outer header bottom differs by no more than 2px.
- No document or body horizontal overflow at 768, 900, 1024, 1280, or 1440px for all locales; mobile remains usable at 320 and 390px.
- Three locale anchors remain visible on desktop; all three remain reachable through the mobile popover.
- Locale links preserve page, search, and hash; current locale is not prefetched and repeated intent creates no duplicate prefetch link.
- Theme switching, visible focus, keyboard navigation, Escape/outside-click menu behavior, deep-link offsets, and reduced-motion behavior remain intact.

## Verification strategy

1. Add unit tests for the prefetcher's same-origin, current-document, normalization, and deduplication behavior before implementing it.
2. Add failing browser assertions for the new header structure, locale control, geometry, and URL-preservation behavior before changing the Vue/CSS implementation.
3. Run focused Chromium/WebKit tests at the required locale and viewport matrix.
4. Run `npm run typecheck`, `npm run check`, `npm run build`, `npm run smoke`, `npm run brand:assets:check`, `npm run lighthouse:interactions`, and one normal `npm run lighthouse` without changing thresholds.
5. Review the intended visual states at 1440 light/dark resting/floating, 1024 English, 768 English where desktop navigation remains active, and 390 light/dark before creating the Draft PR.

## R1 completion gate

R1 is complete only after its branch has passed the local gates, Draft PR CI, Quality Audit, visual review, normal merge, and post-merge `main` Pages and Quality runs. R2 must not start before those post-main runs are green.
