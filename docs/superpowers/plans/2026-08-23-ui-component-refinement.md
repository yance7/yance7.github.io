# Yance UI Component Refinement

## Mission

将现有网站继续收敛为精致、克制、组件一致的 Quiet Atelier / Editorial Archive / Scientific Precision 个人档案站。实现只借鉴 Shadcn Vue、Origin UI 和 Inspira UI 的 API、信息密度与效果思路，不引入它们的视觉主题或运行时依赖。

## Guardrails

- 保留 Vue 3 + Vite MPA 架构、个人内容、页面结构、URL、SEO metadata 和 PageRegistry。
- 不引入 Tailwind、Shadcn、Origin UI、Inspira UI、Reka UI、GSAP、Motion runtime 或新图标库。
- 每个 viewport 最多保留一个明显动态焦点；不叠加 pointer sheen 与 Border Beam。
- 保持 WCAG AA、键盘操作、`:focus-visible`、44px 触控目标、modal focus trap/inert/focus restore 和 reduced-motion 行为。
- 生产分支遵循项目约定：直接提交并推送 `main`，不创建 feature branch 或 PR。

## Delivered tasks

- [x] 修复 Image Preloader 自定义 timeout 未向下传递的问题，并改为精确计时单测。
- [x] 增加 component tokens 与 `YanceButton`，统一 Works、404 和 Lightbox 控件；清理旧 `.btn-primary/.btn-ghost`。
- [x] 升级既有 `StatusBadge` 的七种状态映射，去除 pulse，改为紧凑语义表面。
- [x] 升级 PageCompass tooltip 语义层级、`aria-describedby` 和回顶部提示；修复桌面 tooltip 被 paint/overflow 裁剪的问题。
- [x] 增强 ImageLightbox 的 index 边界安全、渐进模糊 metadata dock、LIVE ARCHIVE metadata 和 quiet/icon controls。
- [x] 将 Works/Research proof links 统一为 `.y-archive-link`，保持页面专属布局，未启用 Border Beam。
- [x] 微调 MetricStrip 的 surface、数字基线和标签间距，不增加 hover lift。
- [x] 扩展 UI primitive E2E、Axe 回归和 light/dark visual matrix，覆盖 Works、PageCompass 聚焦态以及 Lightbox 横图、竖图和移动端。
- [x] 保留 Research 现有静态 rail，不强行加入 Animated Beam：当前 timeline 已提供足够的信息流语义，新增持续动画会增加焦点竞争。

## Verification entry points

```text
npm run lint
npm run typecheck
npm run deadcode
npm run audit:assets
npm run unit
npm run sitemap
npm run build
npm run smoke
npm run test:e2e -- --project=chromium --workers=1
npm run test:e2e -- --project=chromium-visual
npm run test:e2e -- --workers=2
npm run lighthouse
npm run lighthouse:interactions
```

Visual snapshots are updated only after a no-update run, manual diff inspection, and confirmation that the change is intentional.

## Commits

The implementation is split into independently reviewable commits on `main`, covering preloader, button, status, compass, lightbox, archive links, metric refinement, and visual coverage.
