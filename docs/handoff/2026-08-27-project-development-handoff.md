
# Yance Personal Website 项目开发背景与通用交接文档

> 生成日期：2026-08-27（Asia/Shanghai）
> GitHub 的时间和运行记录以 UTC 为准。
> 仓库：yance7/yance7.github.io
> 用途：让没有历史上下文的新 Agent 快速理解项目定位、技术结构、设计原则、开发流程和当前状态。
> 本文是项目级总览，不是某一个 PR 的完整操作记录。

## 0. 先看结论

这是一个以“个人档案、作品集、研究与学业记录、音乐现场档案”为核心的静态个人网站。它不是传统单页应用，而是由多个 HTML 入口组成的 Vue 3 + TypeScript + Vite MPA，最终部署到 GitHub Pages。

项目当前已经具备：

- 6 个主要内容页面和 1 个 404 页面；
- zh-CN、zh-HK、en 三套 URL 级别的多语言页面；
- light/dark 主题；
- 响应式桌面端和移动端布局；
- 自适应章节 PageCompass；
- 作品展示、研究时间线、学业/荣誉档案和演唱会/专辑档案；
- ImageLightbox、轮播、筛选器、主题控制和多种微交互；
- SEO metadata、canonical、hreflang、sitemap 和 GitHub Pages 发布链路；
- Vitest、Playwright、axe、Lighthouse、视觉回归、Firefox/Android/WebKit 兼容性门禁。

当前远程发布状态：

- PR #16 已经合并；
- origin/main 当前精确为 7fa75a3101788c5ee54ce3bf8288f4d7adcc30dc；
- Pages 已经成功部署这个 merge SHA；
- 合并前 Quality Audit #71 已完整通过；
- post-merge Quality Audit #72/#73 的失败属于 GitHub Actions 平台事故；
- 事故恢复后的 Quality Audit #74 已正常创建 job，但在 WebKit desktop 的 honors PageCompass 用例中失败；
- 因此网站已经上线，但最后的 post-merge 质量闭环还没有完全关闭。

如果只有几分钟，优先阅读：

1. 根目录 AGENTS.md；
2. 本文第 2、3、5、8、9 节；
3. 第 10 节的当前 blocker；
4. 需要改代码时，再阅读对应的源码和测试文件。

## 1. 项目定位与产品背景

### 1.1 产品是什么

站点是 Yance 的个人长期档案和作品展示站，把以下内容放在同一套视觉与数据系统中：

- Home：个人入口、精选内容和站点总览；
- Academics：教育经历、成绩/能力指标和学业档案；
- Honors：里程碑、荣誉统计和荣誉档案；
- Research：研究方向、时间线和工具链；
- Works：项目、作品和 case-study 展示；
- Concerts：现场演出、专辑/曲目和音乐档案。

页面不是孤立的营销落地页，而是一个可持续更新的 archive。因此内容、页面章节、导航、SEO 和多语言数据之间有明确契约。新增内容时，应优先扩展对应 data module 和 page registry，而不是把内容散落在模板或生成后的 HTML 中。

### 1.2 视觉和交互方向

当前视觉语言偏 editorial、archive、digital instrument：

- 深色与浅色主题都属于正式产品状态，不是开发辅助主题；
- 标题、正文、元信息和数字指标有不同的排版层级；
- serif、sans、mono 字体承担不同的内容、界面和元数据角色；
- 页面通过细线、标签、状态 badge、章节导航和局部动效建立层级；
- 动效应该帮助用户理解状态变化，不应该成为持续抢占主线程的装饰；
- 页面要保持安静、精确、可读，不要引入模板化 dashboard、过度渐变、无意义粒子或复杂动画框架。

任何视觉调整都需要同时考虑：

- desktop 和 mobile；
- light 和 dark；
- reduced-motion；
- 键盘和屏幕阅读器；
- 视觉回归基线；
- Lighthouse interaction budget；
- WebKit 的 actionability 和几何稳定性。

### 1.3 URL 和 locale 原则

Locale 由 URL 决定，是 source of truth：

- 默认简体中文：根路径，例如 /、/research.html；
- 繁体中文：/zh-hk/；
- 英文：/en/。

不要用浏览器默认语言、运行时猜测或 localStorage 覆盖 URL locale。语言切换时应尽量保留：

- 当前页面；
- query string；
- hash；
- 页面语义和可访问性状态。

## 2. 页面、路由与信息架构

### 2.1 页面总表

| PageKey | 默认入口 | 主要内容 | 关键 section |
| --- | --- | --- | --- |
| home | index.html | 个人首页、精选作品、站点总览 | selected-work、home-worlds、home-beyond |
| academics | academics.html | 教育、成绩指标、学业档案 | sec-education、sec-scoreboard、sec-ap-archive |
| honors | honors.html | 荣誉里程碑、统计、荣誉档案 | sec-milestones、sec-honors-archive |
| research | research.html | 研究时间线、工具链 | sec-research-timeline、sec-toolchain |
| works | works.html | 作品概览、项目展示 | works-overview、project-fresheye |
| concerts | concerts.html | 演唱会概览、专辑/现场档案 | concerts-overview、album-frequencies、concert-archive |
| not-found | 404.html | 404 fallback | 无固定 section |

页面注册表文件：

```text
src/data/pageRegistry.ts
```

这个文件同时影响页面 key、HTML 名称、sitemap 路径、OG image 和 PageCompass section IDs。新增或改页面时，不能只改某一个 HTML 文件。

### 2.2 HTML 和 Vue 的关系

真实 HTML 源文件在：

```text
html-src/index.html
html-src/academics.html
html-src/honors.html
html-src/research.html
html-src/works.html
html-src/concerts.html
html-src/404.html
```

Vite 的 root 指向 html-src/。根目录下若出现生成的 HTML，不应直接编辑；应该编辑 html-src/*.html，再通过 build 生成部署产物。

Vue 入口和页面加载逻辑主要在：

```text
src/main.ts
src/App.vue
src/pageLoaders.ts
vite.config.ts
```

这是 MPA，不要未经设计评估就引入 Vue Router 或把所有页面改造成单一 SPA。

### 2.3 SEO 和部署元数据

页面 metadata 由源 HTML、Vite plugin 和 data module 共同生成：

- title、description、OG metadata；
- canonical；
- 3 个 locale alternate / hreflang；
- html lang；
- body data-locale；
- body data-page；
- JSON-LD URL/language；
- sitemap。

相关文件：

```text
src/data/seo.ts
src/data/pageRegistry.ts
src/data/locales/
scripts/generate-sitemap.ts
scripts/generate-localized-pages.ts
public/CNAME
public/robots.txt
public/sitemap.xml
vite.config.ts
```

修改 URL 或 locale 时，要同步检查页面入口、生成脚本、SEO、sitemap、导航链接和 E2E route contract。

## 3. 技术架构

### 3.1 总体数据流

```text
html-src/*.html
      +
src/data/pageRegistry.ts
src/data/seo.ts
src/data/locales/**
      |
      v
Vite MPA + Vue entry
      |
      v
dist/（build 生成，不能手工编辑）
      |
      v
GitHub Pages
```

运行时大致是：

```text
HTML body data-page / URL locale
      |
      v
src/main.ts 初始化主题、locale、页面 chunk 和字体状态
      |
      v
src/App.vue 组装 shell、导航、页面和共享控件
      |
      v
src/pages/*.vue 读取 page-scoped data
      |
      v
src/components/*.vue + composables + styles
```

### 3.2 目录职责

| 目录/文件 | 职责 |
| --- | --- |
| src/components/ | 可复用 Vue 组件，文件名 PascalCase |
| src/pages/ | 每个页面一个页面级组件 |
| src/composables/ | useTheme、usePageCompass、scroll、modal、album 等状态逻辑 |
| src/directives/ | reveal、pointer sheen 等自定义指令 |
| src/data/ | 页面内容、类型、页面注册和本地化数据 |
| src/i18n/ | locale 类型、语言切换、UI 字典 |
| src/styles/ | base、shell、responsive、页面和组件样式 |
| src/utils/ | 导航、媒体、预加载、Lightbox、PageCompass 工具 |
| public/assets/ | 静态图片、演出海报、case-study 资源 |
| tests/ | 架构、内容、契约、Vitest 和 Playwright |
| scripts/ | sitemap、localized pages、smoke、资源和 Lighthouse 辅助脚本 |
| .github/workflows/ | CI、Pages 发布和 Quality Audit |
| docs/ | specs、plans、handoff 等项目文档 |
| dist/ | build 生成物，Git 忽略，不手工维护 |

### 3.3 内容和类型契约

内容按页面和 locale 拆分，不要把共享内容直接写进大模板：

```text
src/data/types.ts
src/data/index.ts
src/data/academics.ts
src/data/honors.ts
src/data/research.ts
src/data/projects.ts
src/data/concerts.ts
src/data/albums.ts
src/data/community.ts
src/data/locales/zh-CN/**
src/data/locales/zh-HK/**
src/data/locales/en/**
```

src/data/index.ts 是公共出口，src/data/types.ts 是核心 contract。页面专属视图文案可以留在页面组件，但可复用的内容、标签、section、SEO 和 locale 文案应放到 data module。

## 4. 当前主要产品能力

### 4.1 PageCompass

PageCompass 是固定在页面边缘的章节导航和阅读进度控件，负责：

- 显示当前 section 和数值进度；
- 通过 IntersectionObserver 选择当前 section；
- 展开章节列表并导航到 hash；
- 支持 pointer、focus、click、Escape、outside interaction；
- 支持 desktop 和 mobile 输入语义；
- 支持 Return Top；
- 在 hash 导航后保持正确的 focus、aria 和 panel 状态；
- 遵守 reduced-motion 和固定导航遮挡边界。

核心文件：

```text
src/components/PageCompass.vue
src/composables/usePageCompass.ts
src/utils/pageCompass.ts
src/utils/navigation.ts
src/styles/shell.css
src/styles/responsive.css
tests/e2e/page-compass-desktop.spec.ts
tests/e2e/page-compass-mobile.spec.ts
```

当前组件使用显式 mode：

```text
closed | transient | pinned | suppressed
```

isExpanded 由 transient/pinned 推导。不要用多个互相独立的 boolean 重新引入状态冲突。

当前已经解决过的典型问题包括：

- focus-first 展开后重复 Enter 会把 panel 再次关闭；
- WebKit hover、focus、touch 和 actionability 竞态；
- destination click 后 hash、scroll、focus 和 panel 状态不同步；
- 连续 max-height/padding/transform 过渡造成几何不稳定；
- Return Top 的 smooth scroll 与即时断言冲突；
- desktop/mobile device semantics 混用；
- 多个 E2E 运行共用输出目录导致失败证据互相覆盖。

注意：usePageCompass.ts 中仍有用于 observer 初始化的 Vue nextTick()。不要把“禁止用延迟掩盖竞态”误解成“删除所有 nextTick”。

### 4.2 主题和动效

主题相关文件：

```text
src/composables/useTheme.ts
src/components/ThemeOrbit.vue
src/themeColors.ts
src/theme.css
src/styles/theme.css
src/styles/primitives.css
src/styles/shell.css
```

主题切换的关键契约：

- 控件状态要立即反映新的 theme；
- 完整 document restyle 可以延后到下一任务，降低 interaction cost；
- restyle 期间用 data-theme-changing 暂停 transition；
- 恢复 transition 前使用 requestAnimationFrame 确保状态稳定；
- reduced-motion 不能依赖连续动画；
- light/dark 都要保持文字和控件对比度。

不要为了通过 Lighthouse interaction budget 而删除用户能理解状态所需的反馈；应先测量事件链和主线程成本。

### 4.3 共享组件

重要共享组件包括：

```text
src/components/YanceButton.vue
src/components/StatusBadge.vue
src/components/SectionHeading.vue
src/components/MetricStrip.vue
src/components/ImageLightbox.vue
src/components/ThemeOrbit.vue
src/components/ArchiveFilter.vue
src/components/TimelineTrack.vue
src/components/ProjectShowcase.vue
src/components/PageCompass.vue
```

共享组件的长期目标是让交互、ARIA、触控尺寸、主题 token 和动效层级一致。修改一个原语时，要搜索所有调用方和对应的 tests/e2e/ui-primitives.spec.ts、架构测试及视觉基线。

### 4.4 档案页、筛选、Lightbox 和媒体

- Honors/Academics 使用 archive/filter/timeline 结构；
- Research 使用时间线和 toolchain；
- Works 使用项目展示和 case visuals；
- Concerts 使用 album/concert 数据、封面预加载和 Lightbox；
- ImageLightbox 负责焦点保留、Escape、focus trap、背景 inert、滚动锁定、邻近图预加载、加载失败状态和 metadata 几何；
- 演出海报存放在 public/assets/concerts/；
- case-study visual 存放在 public/assets/case/。

新增或替换演出海报后运行：

```powershell
npm run images:concerts
```

版权和资源状态还要参考 ASSET_RIGHTS.md 的人工确认记录。

## 5. 工程和设计原则

### 5.1 优先保持的契约

修改时优先保持：

- 既有 URL 和 hash；
- PageKey、PageRegistry 和 locale mapping；
- 已有页面内容；
- light/dark 主题；
- 键盘、ARIA、focus 和 inert 语义；
- desktop/mobile 响应式行为；
- reduced-motion；
- 性能预算；
- 视觉基线；
- GitHub Pages 的静态部署模型。

### 5.2 交互问题的处理方式

遇到 WebKit、focus、pointer、touch、scroll 或 reduced-motion 失败时：

1. 先确认失败发生在状态机、几何、DOM 挂载、页面加载还是测试观察时机；
2. 保存 trace、截图、console/page error 和 URL/hash 证据；
3. 在 production preview 中复现；
4. 用最小结构性修复解决根因；
5. 再运行 focused test、stress test 和完整门禁。

不要把以下行为当成修复：

- 任意 waitForTimeout、sleep；
- 盲目增加 timeout；
- 增加 retry 掩盖 flake；
- 调低几何或性能阈值；
- 跳过测试；
- 盲目更新 snapshot；
- 修改 workflow 让失败步骤不执行。

### 5.3 性能预算

README 中记录的上线预算是：

- Desktop Performance >= 90；
- Mobile Performance >= 85；
- Accessibility >= 98；
- Best Practices >= 95；
- SEO >= 95；
- LCP <= 2.5s；
- TBT <= 300ms；
- CLS <= 0.1；
- INP <= 200ms。

Lighthouse 和 interaction budget 是不同门禁，不要用一个结果代替另一个。

## 6. 本地开发、分支和测试流程

### 6.1 环境

package.json 要求：

```text
Node >=22.12.0
npm >=10.9.0
npm package manager: npm@10.9.0
```

首次准备：

```powershell
npm install
npx playwright install --with-deps chromium webkit firefox
python -m pip install -r requirements-tools.txt
```

### 6.2 常用命令

```powershell
npm run dev
npm run build
npm run preview
npm run smoke
npm run typecheck
npm run lint
npm run deadcode
npm run unit
npm run check
npm run test:e2e
npm run lighthouse
npm run lighthouse:interactions
npm run links
npm run audit:assets
```

npm run check 当前顺序是：

```text
lint
typecheck
deadcode
unit
sitemap
build
smoke
```

### 6.3 Playwright 运行约定

playwright.config.ts 的关键设定：

- baseURL 默认 http://127.0.0.1:4173；
- PLAYWRIGHT_USE_PREVIEW=1 时使用 npm run preview；
- CI 通过 preview 验证 production artifact；
- 默认保留失败 trace；
- 默认只在失败时截图；
- outputDir 可由 PLAYWRIGHT_OUTPUT_DIR 覆盖；
- webkit-desktop 使用 1200x900、isMobile=false、hasTouch=false；
- webkit-mobile 使用 iPhone 13；
- Chromium、WebKit desktop/mobile、Firefox 和 Android 分成独立 project。

focused preview 示例：

```powershell
npm run build
$env:PLAYWRIGHT_USE_PREVIEW = '1'
$env:PLAYWRIGHT_OUTPUT_DIR = 'test-results/local-webkit-desktop'
npm run test:e2e -- tests/e2e/page-compass-desktop.spec.ts --project=webkit-desktop --workers=4 --retries=0
```

声明 PageCompass 修复完成前，必须再运行：

```powershell
$env:PLAYWRIGHT_USE_PREVIEW = '1'
$env:PLAYWRIGHT_OUTPUT_DIR = 'test-results/local-webkit-desktop-stress'
npm run test:e2e -- tests/e2e/page-compass-desktop.spec.ts --project=webkit-desktop --workers=4 --retries=0 --repeat-each=10
```

每次运行使用不同 outputDir，避免 trace 和 screenshot 互相覆盖。

### 6.4 测试职责

| 测试 | 所有者/用途 |
| --- | --- |
| tests/architecture.test.ts | workflow、依赖、结构和实现约束 |
| tests/content.test.ts / tests/englishContent.test.ts | 内容 contract |
| tests/i18n.test.ts | locale、URL 和语言切换 contract |
| tests/designTokens.test.ts / tests/contrast.test.ts | 设计 token 和对比度 |
| tests/pageCompass.test.ts | PageCompass utility/state contract |
| tests/e2e/site.spec.ts | 页面启动、主题和全站行为 |
| tests/e2e/page-compass-desktop.spec.ts | Chromium/WebKit desktop PageCompass |
| tests/e2e/page-compass-mobile.spec.ts | WebKit mobile PageCompass |
| tests/e2e/ui-primitives.spec.ts | 共享控件、ARIA、touch target |
| tests/e2e/english-layout.spec.ts | 英文布局和 overflow |
| tests/e2e/motion-system.spec.ts | 动效与 reduced-motion |
| tests/e2e/compatibility.spec.ts | Firefox/Android |
| tests/e2e/visual-matrix.spec.ts | 页面、主题、响应式和组件视觉 |
| tests/e2e/concerts.spec.ts | 专辑墙、Lightbox、海报和主题 |
| tests/e2e/archive.spec.ts | 档案页交互 |

## 7. GitHub Actions 和发布流程

### 7.1 三类 workflow

| Workflow | 作用 | 是否部署 |
| --- | --- | --- |
| .github/workflows/ci.yml | PR 基础质量、构建和 release smoke | 否 |
| .github/workflows/quality.yml | 完整 Lighthouse、浏览器、axe、视觉和兼容性审计 | 否 |
| .github/workflows/pages.yml | 生产质量门、构建 Pages artifact 和部署 | 是 |

quality.yml 目前是 active，Actions 已启用。其主要顺序是：

```text
Checkout
Setup Node
Install dependencies
Setup Python tools
Install Python tools
Build audit target
Smoke test audit target
Install Playwright browsers
Select Playwright Chromium for Lighthouse
Lighthouse quality budget
Lighthouse interaction budget
Chromium browser and axe quality
WebKit desktop PageCompass quality
WebKit desktop site and axe quality
WebKit desktop UI primitive quality
WebKit mobile PageCompass quality
WebKit mobile site and axe quality
WebKit mobile UI primitive quality
Chromium visual quality
Firefox compatibility quality
Android compatibility quality
Upload quality artifacts
```

常规 audit 不更新视觉基线；只有手动输入 update_visual_snapshots=true 才执行 Linux baseline refresh。不要通过删步骤、改 threshold 或改 timeout 来规避失败。

### 7.2 发布原则

- main 是生产发布分支；
- 产品开发应在功能分支/隔离 worktree；
- PR CI 和 Quality Audit 先验证；
- 用户明确授权后才 merge；
- Pages workflow 成功后再做生产 Smoke；
- 不提交 dist/；
- 不直接手改线上生成 artifact。

## 8. 项目演进背景

### 8.1 多语言与 PageCompass 阶段

早期项目从单语言静态页面逐步扩展为：

- zh-CN、zh-HK、en 的 URL locale；
- localized page generation；
- shared data/type contracts；
- LocaleSwitcher；
- PageCompass；
- sitemap、canonical 和 hreflang；
- 多浏览器和移动端测试。

这一阶段的重要原则是：locale、page key、section ID 和 URL 必须一致，不能只修视觉而破坏生成链路。

### 8.2 UI 精修和发布链路阶段

随后项目集中处理了：

- 共享 UI 原语契约；
- YanceButton、StatusBadge、ThemeOrbit；
- ImageLightbox 几何、焦点和加载失败状态；
- MetricStrip、TimelineTrack、ProjectShowcase；
- 主题切换的 interaction budget；
- 首屏加载、chunk preload、字体调度；
- WebKit PageCompass 的 hover/focus/touch/scroll 竞态；
- Linux visual baselines；
- PR CI、独立 Quality Audit 和 Pages workflow。

历史交接中记录过很多 WebKit 失败。不要机械重复旧补丁；先确认当前 failure 是否属于同一状态机问题。

### 8.3 已经稳定下来的部分

以下部分在 PR-level Quality Audit #71 已完整通过，当前没有证据要求重做：

- Build 和 Smoke；
- Lighthouse quality budget；
- Lighthouse interaction budget；
- Chromium browser/axe；
- WebKit desktop/mobile 的主要 PageCompass、site 和 primitive；
- Chromium visual；
- Firefox；
- Android；
- 多语言内容和英文布局；
- 生产 Pages 部署。

如果后续修改没有触及这些区域，也不要为了“重新确认”而盲目重写。

## 9. 当前仓库和远程状态

### 9.1 Git 状态

最近一次核对：

```text
Local branch:  feat/site-polish-abc
Local HEAD:    17d21061b0e5bc17d2e17df8fe916c36a24f92e5
origin/main:   7fa75a3101788c5ee54ce3bf8288f4d7adcc30dc
```

当前工作区已有：

```text
 M src/fonts.css
?? docs/handoff/
?? docs/superpowers/plans/2026-08-25-pr15-completion.md
```

不要 reset、checkout、clean、删除或覆盖这些用户已有内容。尤其不要为了切换到 main 而丢弃 src/fonts.css。

### 9.2 PR、Pages 和审计状态

- PR #16 已合并，merge commit 为 7fa75a3101788c5ee54ce3bf8288f4d7adcc30dc；
- PR head 为 17d21061b0e5bc17d2e17df8fe916c36a24f92e5；
- 合并前 Quality Audit #71：PASS；
- Pages run #69：同一 merge SHA，PASS；
- production Smoke：已检查代表性 URL，PASS；
- post-merge #72/#73：平台事故期间的 startup_failure；
- recovery run #74：真实 job 已启动，但 WebKit desktop PageCompass 失败。

主要链接：

- [仓库](https://github.com/yance7/yance7.github.io)
- [PR #16](https://github.com/yance7/yance7.github.io/pull/16)
- [Quality Audit #71](https://github.com/yance7/yance7.github.io/actions/runs/32974752734)
- [Pages #69](https://github.com/yance7/yance7.github.io/actions/runs/32982342581)
- [Quality Audit #72](https://github.com/yance7/yance7.github.io/actions/runs/32982342710)
- [Quality Audit #73](https://github.com/yance7/yance7.github.io/actions/runs/32984427800)
- [Recovery Quality Audit #74](https://github.com/yance7/yance7.github.io/actions/runs/32988556046)

## 10. 当前唯一已知 blocker

### 10.1 现象

Quality Audit #74：

```text
Run number: #74
Run ID:     32988556046
Event:      workflow_dispatch
Branch:     main
HEAD SHA:   7fa75a3101788c5ee54ce3bf8288f4d7adcc30dc
Job:        audit / 98240426925
Status:     completed
Conclusion: failure
```

它已经创建真实 runner/job，因此不是 startup failure。

失败前已经通过：

- Build；
- Smoke；
- Playwright browsers；
- Lighthouse quality；
- Lighthouse interaction；
- Chromium browser and axe。

第一个失败步骤：

`WebKit desktop PageCompass quality`

CI 命令：

```bash
npm run test:e2e -- tests/e2e/page-compass-desktop.spec.ts --project=webkit-desktop --workers=4 --retries=0
```

测试结果：

```text
Running 14 tests using 4 workers
13 passed
1 failed
13 passed (1.1m)
```

失败测试：

```text
PageCompass navigation settles independently on honors.html
```

精确错误：

```text
Test timeout of 30000ms exceeded.
Error: locator.evaluate: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('#sec-honors-archive')
```

失败位置：

```text
tests/e2e/page-compass-desktop.spec.ts:35:39
```

### 10.2 相关代码

测试数据和断言在：

```text
tests/e2e/page-compass-desktop.spec.ts
```

其中 honors route 对应：

```ts
['honors.html', '#sec-honors-archive']
```

目标 section 在：

```text
src/pages/HonorsPage.vue
```

其静态结构包含：

```html
<section id="sec-honors-archive" class="content">
```

PageCompass 实现位于：

```text
src/components/PageCompass.vue
src/composables/usePageCompass.ts
```

目前还不能断言根因是产品代码、测试时序、WebKit flake、页面 chunk 挂载时序或布局变化。PR-level #71 的同名 WebKit desktop PageCompass 步骤曾通过，且 merge tree 与 PR head tree 一致；这说明需要证据化复现，不应立即下结论。

### 10.3 推荐接手动作

如果后续任务明确要求继续排查/修复，顺序建议是：

1. 先读取 #74 的失败日志、error-context、截图和 trace；
2. 使用 production preview 本地复现，不使用 dev server 代替；
3. 记录点击前后的 URL、hash、shell ready、fonts ready、PageCompass mode、trigger focus 和目标 DOM；
4. 先跑 honors 单用例，再跑完整 desktop PageCompass；
5. 找到根因后做最小结构性修复；
6. 再跑 WebKit desktop focused stress，参数为 repeat-each=10、retries=0；
7. 检查 WebKit mobile、typecheck、check 和完整相关质量门；
8. 只有新代码形成新的目标 SHA 后，才由用户决定是否创建新的 PR/远程 audit。

建议命令：

```powershell
gh run view 32988556046 --repo yance7/yance7.github.io --log-failed
gh run download 32988556046 --repo yance7/yance7.github.io --name quality-audit-artifacts --dir test-results/remote-quality-32988556046

npm run build
$env:PLAYWRIGHT_USE_PREVIEW = '1'
$env:PLAYWRIGHT_OUTPUT_DIR = 'test-results/webkit-honors-investigation'
npm run test:e2e -- tests/e2e/page-compass-desktop.spec.ts --project=webkit-desktop --grep 'honors.html' --workers=1 --retries=0
```

当前没有授权新 Agent 自动改代码或反复触发 audit；本节是接手路线，不是本轮已执行的命令。

## 11. 质量完成标准

未来任何继续开发都应以证据为准。至少需要：

- 相关 focused test 通过；
- WebKit desktop PageCompass repeat-each=10、retries=0 通过；
- WebKit mobile 相关测试通过；
- npm run typecheck 通过；
- 按改动范围执行 npm run check 和相关 full E2E；
- 不靠 retry、skip、阈值降低或 timeout inflation；
- 视觉变更有实际 diff 依据，不盲目更新 snapshot；
- 新 PR 的 CI 和 Quality Audit 通过；
- Pages 对目标 SHA 成功；
- production Smoke 通过；
- 用户已有工作区内容没有被覆盖。

只有对应目标 SHA 的 post-merge Quality Audit 完整 success，才能把当前项目质量闭环称为完成，并开始后续方向，包括 Direction D。

## 12. 新 Agent 的最短接手清单

```powershell
Get-Content -Raw -LiteralPath AGENTS.md
git status --short --branch
git log -5 --oneline --decorate
git rev-parse origin/main
gh pr view 16 --repo yance7/yance7.github.io --json state,mergedAt,mergeCommit,headRefName,headRefOid,url
gh run view 32988556046 --repo yance7/yance7.github.io --json status,conclusion,event,headSha,jobs,url
```

然后：

- 不要重置当前工作区；
- 不要重复 merge PR #16；
- 不要把 Pages PASS 当成完整质量闭环 PASS；
- 不要把 #72/#73 的 startup_failure 当成当前 WebKit 错误；
- 不要直接开始 Direction D；
- 若要开发，先建立隔离 worktree/功能分支并保护 src/fonts.css 等现有改动。

## 13. 最终交接摘要

新 Agent 应记住四句话：

1. 这是一个 Vue 3 + TypeScript + Vite MPA 的多语言个人档案/作品集站点，HTML 源文件在 html-src/，内容和 locale contract 在 src/data/。
2. PageCompass、主题、响应式、无障碍、性能和视觉基线都是现有核心契约，修改时要做结构性验证。
3. 线上已经运行 main@7fa75a3101788c5ee54ce3bf8288f4d7adcc30dc，但 post-merge Quality Audit #74 在 WebKit desktop 的 honors PageCompass 用例失败。
4. 下一步应该先获取证据并复现这个具体 blocker；不要用修改阈值、增加等待、跳过测试或反复触发 workflow 来制造“全绿”。
