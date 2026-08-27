# Yance Personal Website 项目基础交接文档

> 生成日期：2026-08-27（Asia/Shanghai）
> 用途：为新的 Agent 提供项目的最小必要背景信息。本文只记录项目基础资料，不记录具体迭代任务、专项优化、审计过程或历史变更。

## 1. 项目概览

| 项目 | 信息 |
| --- | --- |
| 仓库 | <https://github.com/yance7/yance7.github.io> |
| 项目名称 | `yance-personal-site` |
| 项目类型 | Vue 3 + TypeScript + Vite 多页面静态个人网站 |
| 包管理器 | npm |
| Node.js | `>=22.12.0` |
| npm | `>=10.9.0` |
| 生产地址 | <https://www.yance777.com/> |
| 部署平台 | GitHub Pages |
| 默认部署分支 | `main` |

网站主要用于展示个人简介、学业经历、荣誉、研究、作品和演唱会记录，并提供中文、繁体中文和英文版本。

## 2. 页面与 URL

项目包含 7 个 HTML 入口：

| 页面 | 源文件 |
| --- | --- |
| 首页 | `html-src/index.html` |
| 学业 | `html-src/academics.html` |
| 荣誉 | `html-src/honors.html` |
| 研究 | `html-src/research.html` |
| 作品 | `html-src/works.html` |
| 演唱会记录 | `html-src/concerts.html` |
| 404 | `html-src/404.html` |

URL 语言约定：

- 简体中文使用根路径，例如 `/`、`/academics.html`。
- 繁体中文使用 `/zh-hk/` 前缀。
- 英文使用 `/en/` 前缀。
- 页面内部内容、导航文案、SEO 信息和 404 页面会随语言切换。

站点同时支持桌面端和移动端布局、浅色/深色主题、页面内章节导航、档案内容筛选、图片 Lightbox 以及演唱会专辑浏览等基础能力。

## 3. 目录结构

```text
html-src/                Vite MPA 的 HTML 源入口，只编辑这里
src/
  components/            可复用 Vue 组件，文件名使用 PascalCase
  pages/                 页面级 Vue 组件
  composables/           主题、滚动进度、章节导航、弹窗和专辑状态等逻辑
  directives/            自定义 Vue 指令
  data/                  页面数据、类型契约和公共数据导出
  i18n/                  语言、locale 和界面文案
  styles/                基础、内容、响应式、shell 和页面样式
  utils/                 导航、媒体、预加载等工具
public/                  静态资源和部署元数据
  assets/                图片、海报、案例视觉等资源
tests/                   Vitest 单元/内容测试和 Playwright 浏览器测试
scripts/                 sitemap、构建辅助、资源审计等脚本
.github/workflows/       CI、Quality Audit 和 Pages 部署工作流
dist/                    构建生成物，已被 Git 忽略，不手工编辑或提交
```

内容维护约定：

- 页面共享内容放在对应的 `src/data/` 模块中。
- 页面视图专属文案放在对应的 `src/pages/*.vue` 中。
- `src/data/index.ts` 是数据公共入口，`src/data/types.ts` 保存核心类型契约。
- `html-src/*.html` 是 HTML 的权威源文件；根目录下的生成 HTML 不直接编辑。

## 4. 本地开发

在项目根目录 `Y:\Personal Website` 执行：

```powershell
npm install
npm run dev
npm run build
npm run preview
```

常用检查命令：

```powershell
npm run typecheck
npm run unit
npm run test:e2e
npm run sitemap
npm run smoke
npm run audit:assets
npm run check
```

其中 `npm run check` 会串联静态检查、类型检查、死代码检查、单元测试、sitemap 生成、生产构建和 smoke 检查。

## 5. 测试与质量约定

- Vitest 负责单元测试、内容契约和静态数据检查。
- Playwright 负责浏览器、响应式、交互、兼容性和 axe 检查。
- UI 改动后应检查桌面/移动布局以及浅色/深色主题。
- 浏览器测试应针对生产预览产物运行；CI 使用 `PLAYWRIGHT_USE_PREVIEW=1`。
- 使用语义定位器和正常的 `locator.click()`，不要通过坐标模拟点击。
- 需要修改演唱会海报时运行 `npm run images:concerts`。
- 需要修改 OG 卡片时运行 `python scripts/render-og-card.py`。
- 具体测试归属、质量门禁和命令细节以仓库根目录 `AGENTS.md` 为准。

## 6. Git 与部署

- GitHub Actions 工作流位于 `.github/workflows/`，分别负责基础 CI、质量审计和 GitHub Pages 部署。
- 常规开发使用功能分支和 Pull Request；`main` 用于生产发布。
- 提交信息使用简短的中文动作式摘要，例如 `新增...`、`修复...`、`优化...`、`更新...`。
- 不要提交 `dist/` 或其他构建生成物。
- 修改前先检查工作区，保留用户已有的未提交修改，不执行未经授权的重置或清理操作。

## 7. 新 Agent 接手时的最短流程

```powershell
git status --short --branch
git log -1 --oneline --decorate
Get-Content AGENTS.md
npm install
npm run check
```

如果需要确认线上状态，再检查：

```powershell
gh run list --repo yance7/yance7.github.io --branch main
gh api repos/yance7/yance7.github.io/pages
```
