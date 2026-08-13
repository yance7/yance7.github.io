# Layered Motion and Page Compass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 统一全站交互语言，并用智能章节罗盘整合章节导航、阅读进度和回到顶部。

**Architecture:** `App.vue` 根据当前页面提供章节配置，`PageCompass.vue` 独立处理进度、章节观察与导航。页面只声明稳定锚点；全局 CSS 提供共享交互 token，页面组件只实现各自标志性交互。

**Tech Stack:** Vue 3、TypeScript、CSS、Playwright、Vitest

## Global Constraints

- 直接更新 `main`，不创建分支或 PR。
- 不新增运行时依赖，不修改根目录 HTML 或 `dist/`。
- 触控与 reduced-motion 禁用位移、倾斜和指针追踪。
- hover 不改变字体度量或布局尺寸。

---

### Task 1: 智能章节罗盘

**Files:** Create `src/components/PageCompass.vue`; modify `src/App.vue`, page components, `src/styles.css`; remove obsolete `SectionDots` usage.

- [ ] 写 Playwright 失败测试，覆盖章节数量、fragment、active 状态、进度与回顶。
- [ ] 运行目标测试确认因 `.page-compass` 不存在而失败。
- [ ] 实现全局章节配置、稳定锚点与响应式罗盘。
- [ ] 运行目标测试确认通过。

### Task 2: 统一交互 token 与标志性交互

**Files:** Modify `src/theme.css`, `src/styles.css`, `src/components/ProjectShowcase.vue`, `src/pages/ConcertsPage.vue`, tests.

- [ ] 写失败测试，覆盖统一 hover 上限、字体稳定、触控与 reduced-motion。
- [ ] 增加共享 token、方向光泽指令及首页 / Works / Concerts 局部应用。
- [ ] 验证键盘、主题和现有交互链路无回归。

### Task 3: 全量验证与发布

**Files:** Review all changed files only.

- [ ] 运行 `npm run typecheck`、`npm run lint`、`npm run unit`、`npm run build`、`npm run smoke`。
- [ ] 运行 `npm run test:e2e -- --workers=2` 并检查视觉截图。
- [ ] 审查 diff、提交并通过 `127.0.0.1:7897` 推送 `main`。
