# Repository Guidelines

## Project Structure & Module Organization

- `src/` — Vue 3 source code:
  - `components/` — reusable PascalCase `.vue` components
  - `pages/` — one component per page (Home, Academics, Honors, Research, Works, Concerts, 404)
  - `composables/` — `useX.ts` helpers (theme, scroll progress, modal and album state)
  - `directives/` — custom Vue directives
  - `data/` — page-scoped content modules, `index.ts` public exports, and `types.ts` contracts
  - `styles/` — base, content, responsive, shell, and works stylesheets
  - `utils/` — navigation, media, and preload helpers
- `html-src/` — source HTML entry points consumed by `vite.config.ts`; edit here, never root `*.html`.
- `public/assets/` — static media (concert posters in `public/assets/concerts/`, case-study visuals in `public/assets/case/`).
- `html-src/` is the HTML source; `dist/` is the generated GitHub Pages artifact and is ignored by Git.
- `public/` — Vite-native static assets and deployment metadata (`CNAME`, `robots.txt`, `sitemap.xml`).

## Build, Test, and Development Commands

- `npm install` — install dependencies.
- `npm run dev` — start the Vite dev server with hot reload.
- `npm run build` — production build; output is written to `dist/`.
- `npm run smoke` — verify all generated pages, hashed entries, and required static assets.
- `npm run preview` — serve the production build locally to verify it before committing.

## Coding Style & Naming Conventions

- Two-space indentation, single quotes, no semicolons, and kebab-case CSS classes.
- PascalCase for component files and imports; camelCase for composables and variables.
- Keep shared page copy in the matching page-scoped module under `src/data/`; page-specific view copy stays in `src/pages/*.vue`.
- ESLint is configured; match the existing files and keep diffs minimal.

## Testing Guidelines

- Vitest covers unit/content contracts; Playwright covers browser, responsive, interaction, and axe checks.
- After UI changes, verify desktop and mobile layouts in both light and dark themes, then run `npm run check` and `npm run test:e2e`.
- Save local review screenshots under `test-screenshots/` (gitignored).

## Commit & Pull Request Guidelines

- Git history uses concise Chinese summaries led by an action verb: `新增`, `修复`, `优化`, `重构`, `更新`, `移除`, `集成`.
- Example: `修复Service Worker缓存导致页面元素丢失`.
- New branches use `codex/<type>/<short-kebab-topic>`, where `<type>` is one of `feat`, `fix`, `refactor`, `chore`, `docs`, or `test`; `main` is reserved for the release baseline.
- Existing branches with older names are historical references and should not be used as the starting point for new work.
- PRs: one logical change per PR; describe what changed and why, include before/after screenshots for UI work, and note which pages were verified.
- GitHub Pages is deployed by `.github/workflows/pages.yml`; do not commit generated `dist/` output.

## Agent-Specific Instructions

- Edit `html-src/*.html` as the source of truth; do not edit root `*.html` directly.
- Never hand-edit `dist/` build output; regenerate it with `npm run build`.
- Regenerate the social preview image with `python scripts/render-og-card.py` after changing the OG card design.
- Update shared content in the matching `src/data/*.ts` module; keep page-specific content in the matching `src/pages/*.vue`.
- After deployment changes, verify the `dist/` artifact and the GitHub Pages workflow run.

## Current Quality Gates

- Shared content is split into page-scoped modules under `src/data/`, with `src/data/index.ts` as the public entry and `src/data/types.ts` for core contracts.
- Run `npm run typecheck` before committing Vue or data changes.
- Run `npm run images:concerts` after adding or replacing concert posters.

## Agent Feedback and Test Ownership

- Use the fast lane for a focused change: run the smallest relevant unit or E2E test first, then `npm run typecheck` and the matching browser project. Run the full lane only after the focused lane is green.
- PageCompass behavior belongs in `tests/e2e/page-compass-desktop.spec.ts` for Chromium and `webkit-desktop`, and in `tests/e2e/page-compass-mobile.spec.ts` for `webkit-mobile`. Shared semantic primitives remain in `tests/e2e/ui-primitives.spec.ts`; Firefox, Android, and visual projects cover compatibility and visual regressions.
- Keep one independent behavior or route per E2E test. Use semantic locators and `locator.click()`; do not use coordinate clicks through `boundingBox()`. Wait for observable state, not arbitrary sleeps or timeout inflation.
- Treat repeated focus, pointer, touch, and reduced-motion failures as state-machine or geometry issues. After three unsuccessful patch-and-rerun cycles, stop patching locally and refactor the interaction model or document the blocker with evidence. Do not update snapshots blindly.
- CI browser tests must exercise the production artifact with `PLAYWRIGHT_USE_PREVIEW=1`. Keep each invocation's `PLAYWRIGHT_OUTPUT_DIR` isolated so traces and failure screenshots remain attributable to that run.
- Preserve `trace: 'retain-on-failure'` and `screenshot: 'only-on-failure'` for Playwright runs. Before declaring a browser fix complete, run the focused PageCompass stress lane with `--repeat-each=10 --retries=0`, then the full quality gates.
- Do not edit or commit files under `docs/handoff/` unless the user explicitly requests a handoff update. Keep generated `dist/` output uncommitted.
