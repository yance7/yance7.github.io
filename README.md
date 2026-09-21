<p align="center">
  <img src="public/assets/brand/yance-mark-128.webp" alt="Yance brand mark" width="96" />
</p>

<h1 align="center">Yance · Personal Archive</h1>

<p align="center">一个以档案叙事组织学术、研究、作品与现场记忆的多语言个人网站。</p>

<p align="center">
  <a href="https://www.yance777.com">www.yance777.com</a>
</p>

<p align="center">
  <a href="https://github.com/yance7/yance7.github.io/actions/workflows/ci.yml"><img src="https://github.com/yance7/yance7.github.io/actions/workflows/ci.yml/badge.svg?branch=main" alt="Pull Request CI" /></a>
  <a href="https://github.com/yance7/yance7.github.io/actions/workflows/quality.yml"><img src="https://github.com/yance7/yance7.github.io/actions/workflows/quality.yml/badge.svg?branch=main" alt="Quality Audit" /></a>
  <a href="https://github.com/yance7/yance7.github.io/actions/workflows/pages.yml"><img src="https://github.com/yance7/yance7.github.io/actions/workflows/pages.yml/badge.svg?branch=main" alt="GitHub Pages" /></a>
</p>

<p align="center">
  <img src="public/assets/og-card.png" alt="Yance Personal Archive preview" />
</p>

## 快速导航

| 如果你想…… | 从这里开始 |
| --- | --- |
| 浏览线上网站 | [www.yance777.com](https://www.yance777.com) |
| 修改页面结构或路由视图 | [`src/pages/`](src/pages/) |
| 修改页面共享内容与多语言文案 | [`src/data/`](src/data/) |
| 修改自定义 Vue 指令 | [`src/directives/`](src/directives/) |
| 修改页面多语言内容 | [`src/data/locales/`](src/data/locales/) |
| 修改界面翻译与语言状态 | [`src/i18n/`](src/i18n/) |
| 修改通用界面组件 | [`src/components/`](src/components/) |
| 调整全站或页面样式 | [`src/styles/`](src/styles/) |
| 修改 HTML 入口源 | [`html-src/`](html-src/) |
| 查找静态图片与媒体 | [`public/assets/`](public/assets/) |
| 运行构建与审计工具 | [`scripts/`](scripts/) |
| 查阅项目文档 | [`docs/README.md`](docs/README.md) |
| 参与贡献 | [`CONTRIBUTING.md`](CONTRIBUTING.md) |
| 报告安全或隐私问题 | [`SECURITY.md`](SECURITY.md) |

## 项目简介

网站以档案方式整理个人经历与创作，包含：

- Academics
- Honors
- Research
- Works
- Concerts
- 简体中文、繁体中文和英文
- 明暗主题
- 响应式布局
- 无障碍与减弱动效支持

## 技术栈

- Vue 3
- TypeScript
- Vite
- Vitest
- Playwright
- axe-core
- Lighthouse CI
- GitHub Actions
- GitHub Pages

## 项目结构

```text
src/
├── components/       可复用 Vue 组件
├── pages/             页面级组件
├── composables/       可复用组合式逻辑
├── directives/        自定义 Vue 指令
├── data/              页面共享内容与类型
│   └── locales/       页面多语言内容
├── i18n/              界面翻译与语言状态
├── styles/            全局与页面样式
└── utils/             导航、媒体与预加载工具
html-src/              HTML 源文件
public/assets/         静态媒体与品牌资源
tests/                 单元、浏览器与视觉测试
docs/                  交互、媒体、隐私与发布文档
.github/workflows/     GitHub Actions 工作流
```

- HTML 源文件位于 `html-src/`，根目录 HTML 文件由构建流程生成。
- 页面共享内容位于 `src/data/`。
- `dist/` 是生成产物，不提交到 Git。
- 视觉基线位于 `tests/e2e/visual-snapshots/`。

## 本地开发

环境要求：

- Node.js >= 22.12.0
- npm >= 10.9.0
- Python 工具依赖来自 `requirements-tools.txt`

安装依赖并启动开发环境：

```bash
npm ci
npm run dev
npm run check
npm run test:e2e
npm run preview
```

首次运行 Playwright 前安装浏览器：

```bash
npx playwright install --with-deps chromium webkit firefox
```

## 质量门禁

- `npm run check`：运行仓库检查、品牌资源检查、lint、类型检查、死代码检查、单元测试、构建和 smoke 检查。
- `npm run audit:repo`：检查跟踪文件、忽略规则和公开说明文本边界。
- `npm run audit:assets`：检查媒体格式、尺寸、可解码性和隐私相关元数据。
- `npm run links`：检查项目中的外部链接。
- GitHub Quality Audit：在 GitHub Actions 中运行 Lighthouse、浏览器、视觉、兼容性和无障碍质量检查。

当前 Lighthouse 预算如下，具体结果以每次审计为准：

| 指标 | 目标 |
| --- | --- |
| Desktop Performance | >= 90 |
| Mobile Performance | >= 85 |
| Accessibility | >= 98 |
| Best Practices | >= 95 |
| SEO | >= 95 |
| LCP | <= 2.5s |
| TBT | <= 300ms |
| CLS | <= 0.1 |
| INP | <= 200ms |

## 部署

- 通过 `.github/workflows/pages.yml` 部署。
- 发布目标为 GitHub Pages。
- 自定义域名为 `www.yance777.com`。
- `dist/` 不进入 Git。

## 资源、隐私与使用边界

- [ASSET_RIGHTS.md](ASSET_RIGHTS.md)
- [docs/album-cover-sources.md](docs/album-cover-sources.md)
- [docs/privacy-release-checklist.md](docs/privacy-release-checklist.md)
- [docs/security-privacy-decisions.md](docs/security-privacy-decisions.md)

仓库当前未提供通用开源许可证。仓库公开可见不等于授予复制、再分发或商业使用权限。第三方专辑封面、演唱会图像和其他媒体仍受原权利人权利约束。网站不接入第三方分析、广告或用户跟踪脚本。
