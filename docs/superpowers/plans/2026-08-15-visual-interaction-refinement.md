# 视觉与交互精修实现计划

> **For Codex:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**目标：** 在不修改任何文字信息、内容数据、URL 或生成产物的前提下，完成移动 PageCompass 上下文出现、专辑 spotlight 状态反馈与键盘焦点精修。

**设计依据：** `docs/superpowers/specs/2026-08-15-visual-interaction-refinement-design.md`

**验证方式：** 先在 E2E 中写出当前实现无法满足的断言并运行确认失败；再实现功能，按阶段运行相关测试，最后执行完整质量门禁。

## 任务 1：建立移动罗盘遮挡与状态回归测试

**文件：** `tests/e2e/compatibility.spec.ts`

- 新增 390 × 844 首页初始视口测试，断言移动 PageCompass 处于 quiet 状态，且隐藏时不接受指针/键盘交互。
- 滚动超过首屏 quiet 阈值后，断言罗盘可见并恢复可操作性。
- 保留现有 44px 触控目标、窄屏溢出与桌面 PageCompass 测试。
- 运行 `npx playwright test tests/e2e/compatibility.spec.ts -g "mobile PageCompass" --project=chromium`，确认新增测试在实现前失败。

## 任务 2：实现 PageCompass 的移动上下文出现

**文件：** `src/components/PageCompass.vue`、`src/styles/shell.css`、`src/styles/responsive.css`

- 使用 `matchMedia('(max-width: 760px)')` 识别移动断点，复用 `useScrollProgress()` 判断是否越过 quiet 阈值。
- 为导航绑定状态 class、`aria-hidden` 与 `inert`，确保视觉隐藏时不进入焦点顺序。
- 仅在移动断点下应用淡出、位移和 pointer-events；桌面端保持现有布局和行为。
- 在 reduced-motion 下取消状态过渡，保留可见性与可操作性逻辑。
- 重新运行任务 1 的回归测试。

## 任务 3：建立专辑 spotlight loading 与键盘焦点回归测试

**文件：** `tests/e2e/concerts.spec.ts` 或 `tests/e2e/compatibility.spec.ts`

- 通过路由拦截专辑封面请求制造短暂 loading，断言 `.album-visual-slot` 暴露 `data-spotlight-state="loading"` 并仍保留当前封面节点。
- 使用键盘聚焦 selected tile，断言 focus-visible 状态不会丢失。
- 运行对应 Playwright 测试，确认状态样式断言在实现前失败或缺失。

## 任务 4：实现专辑状态反馈与 focus ring 精修

**文件：** `src/components/AlbumWall.vue`

- 增加 loading/error 状态的非文字视觉层，沿用当前舞台颜色和 `--danger` token。
- 保持当前封面同位显示、快速切换令牌与 existing reduced-motion 规则，不改选择逻辑。
- 为 `.album-tile.selected:focus-visible` 提供独立 focus ring，并确保 coarse pointer 不引入 hover 位移。
- 运行专辑相关 E2E 与 axe 检查。

## 任务 5：质量门禁与视觉回归

**文件：** 无新增生产文件；必要时更新测试断言

- 运行 `npm run lint`、`npm run typecheck`、`npm run deadcode`、`npm run unit`。
- 运行 `npm run build` 与 `npm run smoke`，确认只由源码生成 `dist/`，不手工修改产物。
- 启动构建预览，核对首页/研究/作品/演唱会的桌面与移动亮暗主题，以及 reduced-motion。
- 运行完整 `npm run test:e2e`，记录通过、跳过和失败数量。
- 检查 `git diff --check`、`git status --short --branch`，确认没有文字数据文件、root HTML 或 `dist/` 的非预期变更。

## 任务 6：提交与推送 main

**文件：** Git history

- 仅在所有验证通过后提交一个简洁中文 commit，直接提交当前 `main`。
- 使用已认证的 GitHub HTTPS 远端推送 `origin/main`，不创建分支、不创建 PR。
- 推送后核对远端 main SHA 与 GitHub Pages / Actions 部署状态。
