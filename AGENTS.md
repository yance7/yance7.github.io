# Repository Guidelines

## Project Structure & Module Organization

- `src/` — React 19 source code:
  - `components/` — reusable PascalCase `.jsx` components
  - `pages/` — one component per page (Home, Academics, Honors, Research, Works, Concerts, 404)
  - `hooks/` — `useX.js` helpers (theme, scroll progress, spotlight, magnetic)
  - `data/content.js` — centralized site copy and data
  - `styles.css` + `theme.css` — base styles and light/dark theme tokens
- `html-src/` — source HTML entry points. `vite.config.js` copies these to the repo root at build start; edit here, never root `*.html`.
- `assets/` — static media (concert posters in `assets/concerts/`). `assets/vue/` holds committed build output served by GitHub Pages.
- Root files: `404.html`, `service-worker.js`, `CNAME`; web app manifest 位于 `assets/vue/site.webmanifest`.

## Build, Test, and Development Commands

- `npm install` — install dependencies.
- `npm run dev` — start the Vite dev server with hot reload.
- `npm run build` — production build; output is written to the repo root.
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
- Because the repo root is the deployment target, include rebuilt `assets/vue/` output and root HTML in the commit.

## Agent-Specific Instructions

- Edit `html-src/*.html` as the source of truth; do not edit root `*.html` directly.
- Never hand-edit `assets/vue/` build output; regenerate it with `npm run build`.
- Update shared content in `src/data/content.js`; keep page-specific content in the matching `src/pages/*.vue`.
- After service-worker changes, verify cached pages refresh correctly (hard reload in preview).
