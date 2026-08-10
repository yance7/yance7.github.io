# Concerts Album Wall Implementation Plan

**Goal:** Add a self-contained 24-cover Album Frequencies stage to `concerts.html` without changing existing concert archive behavior.

**Architecture:** Keep album content in a typed data module, media-path logic in a small utility, and all UI state/styles inside one `AlbumWall.vue` component. `ConcertsPage.vue` only imports and renders the component between the intro block and year groups. All artwork is local at runtime.

**Global constraints:**

- Exactly 24 releases: eight named artists with three releases each; default is 周杰伦《范特西》.
- No runtime third-party image requests, autoplay, audio, modal, background video, wave/sweep effect, or new Vue dependency.
- Preserve current concerts data, metrics, Next Up, year grouping, poster carousel, lightbox, URLs, header, footer, theme controller, and page metadata.
- Desktop, tablet, 390px, and 320px layouts must remain free of horizontal overflow.
- Light, dark, keyboard, touch, and reduced-motion behavior are first-class requirements.
- Follow strict TDD: write and observe the relevant test fail before production code.

## Task 1: Album content and local media

- Add the `Album` contract, 24-item data module, exports, and album media URL helpers.
- Add failing unit tests for count, artist distribution, metadata, URLs, palettes, and media helpers before implementation.
- Acquire verified square artwork at native resolution >=1200px, create 1200px JPEG plus 640/1200 WebP variants, and record source URL/date/dimensions.
- Add a Pillow preparation/validation script and verify all generated files and size targets.

## Task 2: AlbumWall UI and Concerts integration

- Add failing Playwright coverage for section isolation, default state, click and keyboard selection, looping controls, Apple Music link, theme, reduced motion, responsive overflow, assets, and axe.
- Build the stage-wall component with a large sleeve/vinyl spotlight, 24-cover grid, dynamic palette, roving focus, live announcement, precise-pointer tilt, and local responsive images.
- Import/render it once in `ConcertsPage.vue` after the intro/Next Up section and before year groups.
- Keep all new visual rules scoped to the component.

## Task 3: Review, verification, and release

- Capture required light/dark and desktop/mobile screenshots and inspect them visually.
- Run typecheck, lint, unit, build, smoke, and the full two-worker Playwright suite.
- Review the full diff for scope and regressions, commit to `main`, push through proxy port 7897, and verify GitHub Pages plus the live domain.
