# Repository Guidelines

## Project Structure & Module Organization

- `src/` — Vue 3 source code:
  - `components/` — reusable PascalCase `.vue` components
  - `pages/` — one component per page (Home, Academics, Honors, Research, Works, Concerts, 404)
  - `composables/` — `useX.js` helpers (theme, scroll progress)
  - `directives/` — custom Vue directives
  - `data/content.js` — centralized site copy and data
  - `styles.css` + `theme.css` — base styles and light/dark theme tokens
- `html-src/` — source HTML entry points. `vite.config.js` copies these to the repo root at build start; edit here, never root `*.html`.
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

- Two-space indentation, single quotes, semicolons, and kebab-case CSS classes.
- PascalCase for component files and imports; camelCase for composables and variables.
- Keep shared page copy in Chinese in `src/data/content.js`; page-specific copy stays in the matching `src/pages/*.vue`.
- No formatter or linter is configured yet; match the existing files and keep diffs minimal.

## Testing Guidelines

- No automated test framework is set up; testing is manual and visual.
- After UI changes, verify desktop and mobile layouts in both light and dark themes, then run `npm run build` and `npm run preview`.
- Save local review screenshots under `test-screenshots/` (gitignored).

## Commit & Pull Request Guidelines

- Git history uses concise Chinese summaries led by an action verb: `新增`, `修复`, `优化`, `重构`, `更新`, `移除`, `集成`.
- Example: `修复Service Worker缓存导致页面元素丢失`.
- PRs: one logical change per PR; describe what changed and why, include before/after screenshots for UI work, and note which pages were verified.
- GitHub Pages is deployed by `.github/workflows/pages.yml`; do not commit generated `dist/` output.

## Agent-Specific Instructions

- Edit `html-src/*.html` as the source of truth; do not edit root `*.html` directly.
- Never hand-edit `dist/` build output; regenerate it with `npm run build`.
- Regenerate the social preview image with `python scripts/render-og-card.py` after changing the OG card design.
- Update shared content in `src/data/content.js`; keep page-specific content in the matching `src/pages/*.vue`.
- After deployment changes, verify the `dist/` artifact and the GitHub Pages workflow run.

## Current Quality Gates

- Shared content is split into page-scoped modules under `src/data/`, with `src/data/index.js` as the public entry and `src/data/types.ts` for core contracts.
- Run `npm run typecheck` before committing Vue or data changes.
- Run `npm run images:concerts` after adding or replacing concert posters.
