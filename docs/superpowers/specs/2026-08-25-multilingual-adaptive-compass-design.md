# Multilingual + Adaptive PageCompass Design

## Goal

Add three complete, URL-addressable locales (`zh-CN`, `zh-HK`, `en`) while preserving the existing Simplified Chinese URLs, and replace the always-expanded PageCompass with a quiet collapsed navigator that expands on deliberate interaction.

## URL and locale contract

- Root paths remain `https://www.yance777.com/` and `/academics.html`, `/honors.html`, `/research.html`, `/works.html`, `/concerts.html` for `zh-CN`.
- Hong Kong Traditional Chinese uses `/zh-hk/` plus the same page names.
- English uses `/en/` plus the same page names.
- `window.location.pathname` is the locale source of truth. `localStorage['yance-locale']` records an explicit choice but never overrides a locale encoded in the URL.
- Home is `/`, `/zh-hk/`, or `/en/`; `/index.html` is not generated as a preferred localized home URL.
- Page and section IDs remain stable across locales. Language links preserve the current page, query, and hash; a localized 404 links to that locale's home.

## Architecture

`src/i18n/` owns locale definitions, path parsing, typed UI dictionaries, and the pre-mount locale state. Existing `src/data/*.ts` modules remain the single source for stable facts (IDs, dates, URLs, metrics, media, and technical names). `src/data/locales/<locale>/` owns localized copy keyed by those stable IDs; accessors merge facts with a locale copy without runtime language fallback.

`pageRegistry` contains only route and section facts. Navigation labels, section labels, page hero copy, status text, SEO metadata, and shared chrome strings come from typed locale data. Components receive localized data through `useLocale()`/page accessors and render one language at a time.

## Build and SEO

Vite still builds the seven source HTML entries under `html-src/`. A post-build generator clones the six canonical content pages into `dist/zh-hk/` and `dist/en/`, rewrites locale-sensitive metadata, canonical URLs, reciprocal `hreflang` links, JSON-LD language where present, and localized body metadata without changing hashed assets, CSP, or the theme bootstrap. A dev-server middleware internally rewrites `/en/...` and `/zh-hk/...` to the existing source entries while keeping the browser URL unchanged.

The sitemap contains 18 content URLs (six pages × three locales), with three `xhtml:link` alternates per entry and no 404 URL. Smoke tests inspect all generated pages, metadata, CSP, hashed assets, locale attributes, and absence of source paths.

## UI requirements

- Header, mobile menu, ThemeOrbit, footer, 404, buttons, tooltips, statuses, filters, lightbox controls, and PageCompass expose only the active locale's UI copy.
- `LocaleSwitcher` uses desktop anchor navigation with `hreflang` and `aria-current="page"`; mobile uses a compact `<details>` menu with 44px options.
- English page copy is admissions-oriented and concise; it may reorganize language but cannot add or alter facts. zh-HK is independently authored Hong Kong Traditional Chinese, not runtime conversion.
- PageCompass keeps progress, current section, section links, and return-to-top. It defaults collapsed, expands on hover/focus/click, removes previous/next arrows, uses an accessible disclosure state, and closes after mobile section selection or outside click.

## Verification contract

Unit tests cover locale parsing/building, dictionary and SEO completeness, stable entity IDs, and section parity. E2E covers each locale, language switching with page/hash preservation, theme persistence, localized 404, desktop/mobile Compass behavior, axe, visual baselines, and compatibility browsers. All formal runs use `--retries=0`; visual snapshots are updated only after intentional diffs are inspected and then compared normally.
