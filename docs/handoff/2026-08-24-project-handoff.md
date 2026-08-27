# Yance Personal Website 项目交接文档

> 更新时间：2026-08-24 20:48（Asia/Shanghai）
> 用途：将当前项目、实现结果、验证证据和下一步操作完整迁移给下一位 Agent。
> 当前状态以本文件生成时的仓库和 GitHub 状态为准；远程 Quality Audit 当时仍在运行，接手后必须重新查询。

## 0. 一句话结论

本轮个人网站 UI 审查与发布链路修复基本完成，所有实现代码已经在功能分支 `fix/ui-refinement-recovery`，当前分支 HEAD 为 `b728d2d`，工作区干净并已推送到远程。Pull Request CI 已通过；带 Linux 视觉基线生成的手动 Quality Audit 已通过；推送 Linux 基线后的最新 PR Quality Audit `32728805720` 在本文件生成时仍在运行。PR #13 仍为 Draft，尚未合并到 `main`，当前分支也没有触发新的生产 Pages 部署。

不要把“代码已推送”“PR CI 通过”误认为“已经发布”：当前仍需要确认最新 Quality Audit，随后由用户决定是否合并；在得到明确授权前不要合并或部署 `main`。

## 1. 当前事实状态

| 项目 | 当前值 |
| --- | --- |
| 仓库 | `https://github.com/yance7/yance7.github.io` |
| 项目 | Vue 3 + TypeScript + Vite 多页面静态站点 |
| 当前分支 | `fix/ui-refinement-recovery` |
| 当前 HEAD | `b728d2d` — `更新Linux视觉基线` |
| 远程分支 | `origin/fix/ui-refinement-recovery`，与本地 HEAD 同步 |
| 相对 `origin/main` | `0 35`，即没有落后，领先 35 个提交 |
| 工作区 | 干净，无未提交修改 |
| PR | #13，`修复个人站点 UI 审查遗留问题` |
| PR 地址 | `https://github.com/yance7/yance7.github.io/pull/13` |
| PR 状态 | OPEN + Draft，base 为 `main` |
| Pull Request CI | run `32728805658`，HEAD `b728d2d`，已成功 |
| 最新 PR Quality Audit | run `32728805720`，HEAD `b728d2d`，本文件生成时 `in_progress` |
| 手动 Linux 基线 Audit | run `32727165210`，HEAD `b17a798`，已成功 |
| 最近生产部署 | run `32632002502`，部署的是 `main` 的 `b0363e0`，已成功；不是当前功能分支 |
| 是否已合并 | 否 |
| 是否已部署当前分支 | 否 |

最新远程检查链接：

- [PR #13](https://github.com/yance7/yance7.github.io/pull/13)
- [Pull Request CI 32728805658](https://github.com/yance7/yance7.github.io/actions/runs/32728805658)
- [Quality Audit 32728805720](https://github.com/yance7/yance7.github.io/actions/runs/32728805720)
- [手动 Quality Audit 32727165210](https://github.com/yance7/yance7.github.io/actions/runs/32727165210)

接手后第一时间执行：

```powershell
git status --short --branch
git log -1 --oneline --decorate
gh run view 32728805720 --repo yance7/yance7.github.io --json status,conclusion,jobs,url
gh pr checks 13 --repo yance7/yance7.github.io
```

## 2. 项目结构和运行方式

主要页面和入口：

- `html-src/index.html`：首页
- `html-src/academics.html`：学业
- `html-src/honors.html`：荣誉
- `html-src/research.html`：研究
- `html-src/works.html`：作品
- `html-src/concerts.html`：演唱会 / Live Archive
- `html-src/404.html`：404 页面

主要目录：

- `src/components/`：共享 Vue 组件，例如 `YanceButton`、`StatusBadge`、`PageCompass`、`ImageLightbox`、`MetricStrip`、`ThemeOrbit`
- `src/pages/`：页面级组件
- `src/composables/`：主题、模态框、章节罗盘、专辑状态等逻辑
- `src/data/`：按页面拆分的内容模块、类型和 `pageRegistry`
- `src/styles/`：组件、shell、responsive、theme 和页面样式
- `src/utils/`：导航、图片预加载、Lightbox、reveal 等工具
- `tests/`：Vitest 架构/内容测试及 Playwright 浏览器测试
- `tests/e2e/visual-snapshots/chromium-visual/win32/`：Windows Chromium 视觉基线
- `tests/e2e/visual-snapshots/chromium-visual/linux/`：本轮从远程 Ubuntu 审计产物导入的 48 张 Linux Chromium 基线
- `html-src/`：Vite MPA HTML 真正的源文件；不要编辑根目录生成 HTML
- `public/`：静态资源、`CNAME`、`robots.txt`、`sitemap.xml`
- `dist/`：构建生成物，已被 Git 忽略，不允许手工修改

本地命令：

```powershell
npm install
npm run dev
npm run check
npm run test:e2e
npm run test:e2e -- tests/e2e/visual-matrix.spec.ts --project=chromium-visual --workers=1
npm run lighthouse
npm run lighthouse:interactions
npm run preview
npm run links
npm run audit:assets
```

工程要求 Node `>=22.12.0`、npm `>=10.9.0`。`npm run check` 顺序为 lint、typecheck、deadcode、Vitest、sitemap、build、smoke。

## 3. 必须遵守的仓库规则

权威规则来自仓库根目录 `AGENTS.md`，当前任务还额外要求只在 `fix/ui-refinement-recovery` 上工作，不直接开发或推送 `main`。

- HTML 只编辑 `html-src/*.html`，不要编辑根目录 HTML。
- 不要手工编辑 `dist/`；需要时运行 `npm run build`。
- 代码使用两空格缩进、单引号、无分号、kebab-case CSS 类名。
- Vue 组件文件和导入使用 PascalCase；composable 和变量使用 camelCase。
- 页面共享文案放在对应 `src/data/*.ts`，视图专属文案留在对应 `src/pages/*.vue`。
- 不要添加 Tailwind、Shadcn、UI 框架、GSAP、Motion-V、图标框架、WebGL、粒子背景、自定义光标或连续装饰动画。
- 保持 Vue 3 + TypeScript + Vite MPA、现有 URL、PageRegistry、内容、主题以及可访问性契约。
- UI 或数据改动后至少运行 `npm run typecheck`；UI 改动要覆盖 desktop/mobile、light/dark，并运行相应 Playwright 检查。
- 添加或替换演唱会海报后运行 `npm run images:concerts`。
- 修改 OG 卡片后运行 `python scripts/render-og-card.py`。
- Git 提交使用简短中文 action 摘要，例如 `修复...`、`优化...`、`更新...`。
- 不要把生成的 `dist/` 提交到 Git。

### 历史交接文件中的冲突

早期附件 `C:\Users\yance\.codex\attachments\f6aa85a4-dc79-474b-9c70-c1a1bbb7a2f8\pasted-text.txt` 曾记录“直接修改并推送 `main`、不使用 PR”。那是历史状态，已被当前仓库 `AGENTS.md`、当前用户授权范围和本轮实施计划取代。当前事实是：使用功能分支和 Draft PR，`main` 只作为生产部署分支，不能未经用户明确决定合并。

原审查报告路径记录在实施计划中：

`C:\Users\yance\.codex\attachments\1655df4c-2f5f-47a9-8b32-8b4ca867f570\pasted-text-1.txt`

该路径属于当前机器的附件目录，迁移到其他 Agent 时不要假设它一定存在；本文件已经概括本轮任务和结果。

## 4. 本轮已经完成的任务

### 4.1 发布链路恢复

相关文件：`.github/workflows/pages.yml`、`.github/workflows/ci.yml`、`.github/workflows/quality.yml`、`tests/architecture.test.ts`。

已完成：

- Pages 生产工作流只负责生产质量门和部署，不再被 Lighthouse、完整兼容性矩阵或视觉实验阻塞。
- Pages 流程包含 npm ci、Python 工具、lint、typecheck、deadcode、asset audit、unit、sitemap、build、smoke、Chromium release smoke、Pages artifact 和 deploy。
- Pages artifact 上传前加入 pinned `actions/configure-pages`。
- 新增 PR CI：不部署 Pages，只执行代码质量、构建和 release smoke。
- Quality Audit 独立运行，包含 Lighthouse、interaction budget、Chromium、WebKit、Firefox、Android 和 Chromium visual。
- workflow action 均使用固定 SHA；常规 PR 不生成视觉基线，只有手动输入 `update_visual_snapshots=true` 时才生成 Linux 基线。
- 生产 workflow 使用 `pages-production` 且 `cancel-in-progress: false`，避免连续 push 主动取消生产部署。

### 4.2 共享 UI 组件契约

已完成：

- `YanceButton` 统一 `primary`、`secondary`、`ghost`、`quiet`、`archive` 和 `sm`、`md`、`lg`、`icon` 尺寸。
- disabled link 不绑定 href，不会导航；安全 blank target 自动补充 rel；disabled/`aria-disabled` 不触发 hover/active。
- coarse pointer 控件最小触控区域为 44px；fine-pointer 继续保留现有视觉契约要求的 42px 基线。
- `StatusBadge` 的 active/deployed 使用语义 aqua 文本，published 使用 gold，open-source 使用 violet，completed/archived 使用 neutral，planned 使用 muted/dashed。
- PageCompass 使用自定义 tooltip、`aria-describedby` 和键盘焦点规则，移除原生 title 和不合适的 passive `aria-live`；移动端隐藏不适合触摸操作的 tooltip。
- 添加 `aqua-text`、`tooltip-muted`、`motion-control-lift` 等主题 token，并在 light/dark 中保持对比度。

### 4.3 ImageLightbox

已完成：

- 索引使用 `clampLightboxIndex`，处理 NaN、负数、小数和越界值。
- 保留焦点、Escape 关闭、焦点陷阱、背景 inert、滚动锁定和邻近图片预加载。
- 加载失败有重试状态，保留旧封面并用状态断言确认新封面最终 ready。
- 统一使用 `YanceButton`。
- 由多个 blur 元素改为单一 gradient dock + 10px backdrop blur。
- 使用显式 stage bounds、`--lb-meta-reserve: 132px`，移动端 reserve 为 118px。
- 通过 image bottom 与 metadata top 至少 12px 的 geometry assertion，覆盖横向、纵向和移动端。

### 4.4 动效层级、首屏和主题性能

已完成：

- `ProjectShowcase` 移除嵌套 magnetic binding，避免与按钮自身交互叠加。
- `MetricStrip` 使用单一 IntersectionObserver，逐卡 unobserve；count-up 为约 600–700ms。
- reduced-motion 直接使用最终指标值，避免 final → zero → final 闪烁。
- `TimelineTrack` 在 reading-zone 为空时清空 currentId。
- 控件 lift 统一为 `motion-control-lift = -1px`。
- 页面 active chunk 预加载，非演唱会页面的 bundled fonts 延后到 idle / timeout；演唱会保持即时字体加载。
- reveal 时序和页面首屏加载经过修复，保留现有内容和视觉效果。
- 主题切换中，`theme.value` 立即更新控件状态；完整 document restyle 通过 `setTimeout(0)` 延后，恢复 transition 前使用两次 `requestAnimationFrame`。
- 该主题修复将远程 Lighthouse interaction budget 从桌面约 202–250ms 的失败降到通过；本地最新交互测量最高为 concerts album 120ms。
- `App.vue` 移除不必要的 root theme class subscription，降低主题切换时的根组件重渲染。
- `data-theme-changing` 在主题提交期间关闭 transition，防止全站 transition 放大交互成本。

### 4.5 视觉和回归覆盖

已完成：

- 视觉矩阵覆盖首页、Academics、Honors、Research、Works、Concerts。
- 每个页面覆盖 light/dark 与 390x844 mobile、1440x900 desktop。
- 增加 PageCompass 的 320x568、1024x768、1440x900 两套主题截图。
- 增加 Lightbox landscape、portrait、mobile 两套主题截图。
- screenshot 容差保持为 full-page `0.02`、viewport/page `0.01`、component `0.005`。
- `tests/e2e/visual-matrix.spec.ts` 的 desktop 聚合用例现在使用 60 秒单测预算；移动端仍使用默认预算。原因是 CI 在串行生成 6 个页面和多组截图时实际耗时约 31–33 秒，默认 30 秒会造成 `data-fonts-ready` 等待点假失败。
- Windows `win32` 基线保留；远程 Ubuntu 生成的 Linux 基线共 48 张，已逐文件 hash 校验并提交到 `tests/e2e/visual-snapshots/chromium-visual/linux/visual-matrix.spec.ts/`。

## 5. 关键文件索引

| 文件 | 作用 / 本轮重点 |
| --- | --- |
| `src/composables/useTheme.ts` | 主题持久化、系统主题、低成本主题提交和过渡恢复 |
| `src/main.ts` | App mount、页面 chunk preload、字体 idle 调度和 `data-fonts-ready` |
| `src/pageLoaders.ts` | 当前页面 chunk 预加载 |
| `src/App.vue` | 根壳层、页面导航、初始化主题 |
| `src/components/YanceButton.vue` | 全站按钮原语和 href/rel/disabled 契约 |
| `src/components/PageCompass.vue` | 章节罗盘、键盘 tooltip、移动端状态 |
| `src/components/ImageLightbox.vue` | 灯箱 focus、loading、metadata 和操作按钮 |
| `src/components/MetricStrip.vue` | 指标观察、计数动画和 reduced-motion |
| `src/components/StatusBadge.vue` | 状态语义和 `data-status` |
| `src/components/ThemeOrbit.vue` | 主题按钮视觉/ARIA 状态 |
| `src/styles/primitives.css` | 按钮、tooltip、控件基础样式 |
| `src/styles/shell.css` | 导航、PageCompass、主题旋钮、全局壳层 |
| `src/styles/responsive.css` | coarse pointer、移动端布局和触控尺寸 |
| `src/styles/theme.css` | light/dark token 和 theme transition suppression |
| `src/styles/components.css` | Lightbox、MetricStrip 等共享组件样式 |
| `tests/architecture.test.ts` | workflow、组件契约、主题性能、依赖和结构检查 |
| `tests/e2e/visual-matrix.spec.ts` | 页面、主题、响应式、PageCompass、Lightbox 视觉矩阵 |
| `tests/e2e/ui-primitives.spec.ts` | 按钮、tooltip、coarse target、控件交互 |
| `tests/e2e/concerts.spec.ts` | 专辑墙、主题、reduced motion、Lightbox 和海报状态 |
| `tests/e2e/site.spec.ts` | 全站页面启动、主题持久化、普通交互 |
| `.github/workflows/pages.yml` | 生产构建和 GitHub Pages deploy |
| `.github/workflows/ci.yml` | PR CI，不部署 |
| `.github/workflows/quality.yml` | 独立远程质量审计和可选 Linux 基线生成 |
| `docs/superpowers/plans/2026-08-23-ui-refinement-recovery.md` | 本轮实施计划和证据记录，当前最后几项尚未跟进更新 |

## 6. 验证证据

### 6.1 最新本地证据

在 `b17a798` / `b728d2d` 附近完成的本地检查：

- `npm run check`：通过。
  - ESLint 通过
  - Vue/TypeScript typecheck 通过
  - Knip deadcode 通过
  - Vitest：12 个测试文件、88 个测试通过
  - sitemap：6 URLs
  - Vite build：7 个 HTML 页面成功生成
  - smoke：7 页面及静态资源通过
- `npm run test:e2e -- tests/e2e/visual-matrix.spec.ts --project=chromium-visual --workers=1`：13/13 通过，约 2.2 分钟。
- 桌面视觉回归单独运行：light 27.6 秒通过，dark 30.3 秒通过，证明 60 秒预算修复确实覆盖 CI 运行时间。
- 主题和演唱会相关 targeted E2E：4/4 通过，包括主题持久化、快速主题切换、专辑墙主题/reduced-motion 和视觉表面契约。
- `npm run lighthouse:interactions`：本地完整交互预算通过。代表性结果：desktop index theme 27ms、research compass 42ms、concerts album 120ms；mobile index theme 18ms、menu 42ms、research compass 30ms、concerts album 62ms；Lightbox 操作最高约 35ms。

更早但仍适用于未改变部分的完整浏览器证据记录在实施计划中：Chromium 96/96、Chromium visual 13/13、WebKit site 28 passed/1 skipped、Firefox 12 passed/3 skipped、Android 14 passed/1 skipped。推送后的最新 PR CI 和 Quality Audit 负责再次确认 Ubuntu 环境。

### 6.2 远程证据

- `32727165210`：手动 Quality Audit，输入 `update_visual_snapshots=true`，HEAD `b17a798`，15m34s，全绿。通过 build、smoke、Lighthouse quality、Lighthouse interaction、Chromium browser/axe、WebKit site/axe、WebKit UI primitive、Chromium visual、Firefox、Android，并成功上传 `linux-visual-snapshots`。
- `b728d2d` 推送后 `32728805658`：Pull Request CI 已成功。
- `b728d2d` 推送后 `32728805720`：Quality Audit 在文档生成时仍 `in_progress`，未提前宣称通过。
- GitHub Actions 有 Node 20 deprecated annotation，原因是 pinned action 当前在 GitHub runner 上被强制用 Node 24；这不是本轮代码失败，也没有导致 job 失败。

### 6.3 远程失败的诊断记录

- 早期主题切换版本在远程交互审计中出现 desktop theme 约 202–250ms。经过 `652d26a`、`ec76cda`、`33b1e34` 和本地/远程实测，最终通过延后完整 document restyle 解决，没有降低 200ms 门槛。
- run `32724996898`（HEAD `33b1e34`）唯一失败步骤是 Chromium visual。日志表面显示 `data-fonts-ready` 仍为 `loading`，但根因是桌面 visual test 串行执行 6 个路由和多次截图，在 CI 上超过默认 30 秒总测试预算；不是字体文件坏损，也不是应直接更新错误基线。
- `b17a798` 在 `tests/e2e/visual-matrix.spec.ts` 为 desktop visual test 设置 60 秒预算；本地验证 2/2 通过；远程手动基线审计随即全绿。
- 首次沙箱运行 Vitest/Playwright 曾出现 Windows `spawn EPERM`，使用允许的提升权限重跑后通过；这是本机进程权限限制，不是测试失败。
- 本机完整 `npm run lighthouse` 曾在 Windows `chrome-launcher` 清理临时目录时出现 `EPERM`。采样阶段有结果，但本机进程清理失败；不能据此宣称本地 full Lighthouse 通过。远程 Ubuntu Quality Audit 才是本轮 Lighthouse 的权威结果。

## 7. 当前提交历史

相对 `origin/main` 的完整实施提交顺序如下。前几项是发布架构和 UI 修复主体，后几项是性能、远程回归和最终 Linux 基线：

```text
c2f1b35 记录Pages部署恢复证据
0aa8003 加固Pages发布流水线
9644b5d 修复共享UI组件契约
f831cff 修复Lightbox元数据层级与视觉基线
0d76d2c 统一交互动效层级
b61688c 强化UI与发布回归测试
f082023 修复灯箱跨浏览器几何
c89596b 修复审查遗留时序与控件契约
5636fef 记录审查分支提交流程
e75627e 优化移动端首屏加载与视觉稳定性
716b38d 优化主题切换交互性能
0aba048 进一步优化主题切换响应
cedb30b 修复跨平台视觉回归与控件动效
1745fa1 统一遗留控件悬浮动效
f320264 修复主题切换测试竞态
2db6bee 更新UI恢复验收记录
fa9651e 修复移动菜单触控尺寸
f00502f 补充最终分支取证信息
0727199 澄清实现与取证版本
874acc6 修复WebKit滚动测试时序
83a6503 优化移动端首屏加载时序
84d7a57 更新UI精修交接证据
a1f8661 收口主题状态与视觉回归
bbe9c54 优化主题切换性能
499d56c 优化演唱会首屏加载审计
df97b2c 修复档案首屏Reveal时序
3941ce9 优化首屏加载与可访问性
fb34eec 优化演唱会首屏加载预算
8c0bbd0 优化主题按钮交互响应
f48e4a9 修复主题旋钮交互延迟
652d26a 修复主题切换交互性能超预算
ec76cda 优化主题切换首帧性能
33b1e34 修复主题切换交互预算
b17a798 修复视觉审计超时
b728d2d 更新Linux视觉基线
```

若需要按实现主题阅读，优先看这些提交：`0aa8003`、`9644b5d`、`f082023`、`0d76d2c`、`83a6503`、`bbe9c54`、`33b1e34`、`b17a798`、`b728d2d`。

## 8. 尚未完成的事项

以下是当前真正剩余事项，不要把已完成的代码实现重复做一遍：

1. 等待并记录最新 PR Quality Audit `32728805720` 的最终结果。若失败，先读取失败步骤和日志，再决定是否修改；不要盲目更新视觉基线。
2. 更新 `docs/superpowers/plans/2026-08-23-ui-refinement-recovery.md`。当前计划仍保留旧的“post-PR hardening commits pending push”未勾选项，需改为记录 `b17a798`、`b728d2d`、run `32727165210`、run `32728805658` 和最终 Quality Audit 结果。
3. 更新 Draft PR #13 的 body。当前 PR 描述仍写着旧数据（77 unit、Chromium 95/95、视觉 9/9、旧的 WebKit/Lighthouse 未通过表述），应替换为当前真实证据，至少写明 88 unit、Chromium visual 13/13、Linux baseline 48 张、PR CI run 和最终 Quality Audit run。
4. PR 仍为 Draft，尚未合并。是否转为 Ready、合并到 `main`、触发 Pages 部署必须由用户明确决定；本轮没有授权自动 merge。
5. 合并后才可验证新的 Pages build/deploy、`https://yance7.github.io/`、`https://www.yance777.com/` 及代表性页面。此前 `32632002502` 只证明 `main@b0363e0` 的生产部署成功。

## 9. 建议的接手顺序

### A. 先确认远程状态

```powershell
git status --short --branch
git log -5 --oneline --decorate
gh pr view 13 --repo yance7/yance7.github.io --json state,isDraft,headRefName,baseRefName,headRefOid,statusCheckRollup,url
gh run view 32728805720 --repo yance7/yance7.github.io --json status,conclusion,jobs,url
gh pr checks 13 --repo yance7/yance7.github.io
```

### B. 若 Quality Audit 已成功

用 `apply_patch` 更新实施计划和 PR body，记录：

- `b17a798`：桌面 visual timeout 修复
- `b728d2d`：48 张 Linux 基线
- `32727165210`：带更新基线的手动 Quality Audit 全绿
- `32728805658`：最新 HEAD 的 PR CI 全绿
- `32728805720`：最新 HEAD 的普通 PR Quality Audit 全绿
- 本地 `npm run check`、Chromium visual 13/13 和 interaction budget 结果

然后重新检查：

```powershell
git diff --check
git status --short --branch
gh pr checks 13 --repo yance7/yance7.github.io
```

### C. 若 Quality Audit 失败

```powershell
gh run view 32728805720 --repo yance7/yance7.github.io --log-failed
gh run view 32728805720 --repo yance7/yance7.github.io --json jobs
```

只修复日志明确指向的问题。若是视觉失败，先下载 `quality-audit-artifacts` 或比较 `actual/expected/diff`，确认是运行环境问题、测试时序问题还是实际设计变化；不要用 `--update-snapshots` 掩盖真实回归。

### D. 只有用户明确允许合并后

```powershell
gh pr ready 13 --repo yance7/yance7.github.io   # 仅在用户要求转为 Ready 时
gh pr merge 13 --repo yance7/yance7.github.io    # 仅在用户明确要求合并时
gh run list --repo yance7/yance7.github.io --workflow pages.yml --limit 5
```

合并前不应直接 push `main`，也不应手工修改 `dist`。合并后的 Pages 验证才是新的独立任务。

## 10. 最终交接结论

代码实现、单元/静态检查、桌面和移动视觉覆盖、主题交互性能优化、Ubuntu Linux 基线生成和功能分支推送已经完成。当前唯一需要立即确认的远程状态是 `32728805720`；随后需要同步计划文档和 PR 描述。生产环境仍然是 `main@b0363e0` 的旧已验证部署，当前功能分支没有发布到线上。任何下一步合并、转 Ready 或生产部署都必须保留用户决策点。
