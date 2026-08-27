# 个人网站项目当前交接文档：PR #15、main、Pages 与双域名 Smoke

> 生成日期：2026-08-26（Asia/Shanghai）
> 项目：yance7/yance7.github.io
> 本文是当前状态的“真相源”，用于交接给下一位 Agent。
> docs/handoff/2026-08-25-i18n-adaptive-compass-handoff.md 和 docs/handoff/2026-08-24-project-handoff.md 均为历史交接，保留但不再代表合并、部署和线上验证的最新状态。

## 0. 一句话结论Q

PR #15 已按用户明确授权 squash 合并到 main，合并提交为 1ee48b72e11215d0a492712f67876261d03f690f。main 上的 GitHub Pages 部署已成功，GitHub Pages deployment 状态为 success；两个域名的 12 条多语言路由均已通过 HTTP 与 Playwright Chromium 线上 smoke，页面交互、SEO、主题、LocaleSwitcher、PageCompass 和移动端触摸/键盘行为均通过。

当前没有已知的 WebKit blocker、视觉基线 blocker、CI blocker 或线上路由 blocker。当前工作区仍停留在合并前的本地功能分支，并有未提交的交接/计划文档；没有新增源代码改动需要继续合并。

## 1. 用户请求、授权与已完成范围

### 用户先前提供的上下文

用户要求先阅读并全面了解个人网站项目的原始交接文档：

docs/handoff/2026-08-25-i18n-adaptive-compass-handoff.md

该文档覆盖：

- 多语言与 PageCompass 的实现情况；
- PR #15、CI、Quality Audit #57 的当时状态；
- Quality Audit #48–#57 的失败与修复历史；
- 当时的两个 WebKit blocker；
- 本地未提交候选修改；
- 环境和调试困难；
- 未完成事项、后续命令、合并、Pages 部署及双域名 smoke 流程。

之后用户明确授权：

> 允许将 PR #15 squash 合并到 main，并继续 Pages 部署与双域名 smoke。

因此本轮已获得执行以下范围内外部操作的授权：

1. squash merge PR #15 到 main；
2. 等待并核验 push 后的 Pages workflow 与 Pages deployment；
3. 对 yance7.github.io 与 www.yance777.com 执行线上 HTTP/浏览器 smoke。

本轮没有删除远程功能分支，没有提交或 push 本交接文档，也没有修改 dist/ 或历史交接文档。

## 2. 当前 Git、PR 与合并状态

### PR #15

- PR：https://github.com/yance7/yance7.github.io/pull/15
- 标题：集成多语言内容与自适应章节罗盘
- 源分支：feat/i18n-adaptive-compass
- 合并前最终 head：b3689d319e0e590f7d16c60f078973f2b0024b3d
- 目标分支：main
- 合并方式：squash
- 合并时间：2026-08-26T02:27:50Z
- 合并提交：1ee48b72e11215d0a492712f67876261d03f690f
- PR 最终状态：MERGED
- PR head 分支没有因合并而删除：本次使用了 --delete-branch=false。

执行过的合并命令（不要重复执行）：

    gh pr merge 15 --repo yance7/yance7.github.io --squash --delete-branch=false

### 合并前 PR 门禁

PR head b3689d3 上的两个门禁均已成功：

- PR CI run 32887248884：
  https://github.com/yance7/yance7.github.io/actions/runs/32887248884
- PR Quality Audit run 32887248926：
  https://github.com/yance7/yance7.github.io/actions/runs/32887248926

### 当前本地工作区

本地 checkout 仍在合并前的：

    feat/i18n-adaptive-compass

合并前该分支的最新提交为 b3689d3。远程 main 已通过 GitHub API 核验为合并提交 1ee48b7，但本地 checkout 没有切换到 main，也没有为了本次交接强制同步或重置工作区。

当时工作区状态为：

    ## feat/i18n-adaptive-compass...origin/feat/i18n-adaptive-compass
    ?? docs/handoff/
    ?? docs/superpowers/plans/2026-08-25-pr15-completion.md

其中：

- docs/handoff/ 下包含历史交接文档以及本文件；
- docs/superpowers/plans/2026-08-25-pr15-completion.md 是执行计划，保留为未跟踪文件；
- 没有未提交的 src/、测试、配置、workflow 或其他产品代码修改；
- dist/ 是构建产物并被忽略，没有提交。

下一位 Agent 如果要继续开发，应先 git fetch origin，再从远程 main 建立新的 codex/... 工作分支；不要重复执行 PR #15 合并。

## 3. 项目结构和重要约束

仓库根目录：Y:/Personal Website

主要目录：

- src/：Vue 3 源码；
  - components/：PascalCase 可复用组件；
  - pages/：Home、Academics、Honors、Research、Works、Concerts、404 等页面；
  - composables/：主题、滚动进度、模态框、相册、PageCompass 状态；
  - data/：页面内容、类型契约、SEO 和页面注册表；
  - i18n/：Locale 类型、消息和语言相关逻辑；
  - styles/：基础、内容、响应式、shell、works 样式；
  - utils/：导航、媒体和预加载辅助函数。
- html-src/：Vite 多入口 HTML 源文件；编辑这里，不编辑根目录生成的 HTML；
- public/assets/：静态资源；
- public/：CNAME、robots.txt、sitemap.xml 等部署元数据；
- dist/：生成的 GitHub Pages artifact，被 Git 忽略，只能通过构建生成。

仓库级 Agent 约束：

- 两空格缩进、单引号、无分号、CSS class 使用 kebab-case；
- 共享文案放在对应的 src/data/ 页面模块，页面视图专属文案放在对应的 src/pages/*.vue；
- 修改 Vue 或 data 后先运行 npm run typecheck；
- UI 改动要覆盖桌面/移动端以及明暗主题，并运行相应的 npm run check、npm run test:e2e；
- 不能手改 dist/；不能直接手改根目录 HTML；
- 新增或替换演出海报后运行 npm run images:concerts；
- 不要为了掩盖交互竞态而增加任意 sleep、盲目增大 timeout、重复 retry 或盲目更新 snapshot；
- Playwright 必须保留 trace: 'retain-on-failure' 和 screenshot: 'only-on-failure'；
- CI 浏览器测试必须通过 PLAYWRIGHT_USE_PREVIEW=1 验证生产 artifact；每次运行使用独立的 PLAYWRIGHT_OUTPUT_DIR；
- PageCompass 的 focused stress lane 在声明完成前需要使用 --repeat-each=10 --retries=0；
- docs/handoff/ 只有在用户明确要求时才能编辑或提交。本次用户已明确要求生成交接文档，因此本文件是有意新增的未提交文件。

常用命令：

    npm install
    npm run check
    npm run typecheck
    npm run build
    npm run smoke
    npm run test:e2e
    npm run preview

## 4. PR #15 实现内容

### 4.1 多语言架构

支持的 Locale：

- zh-CN
- zh-HK
- en

核心原则是 URL locale 为真相源。静态多语言入口由 html-src/*.html 和生成脚本构建，页面运行时不通过浏览器默认语言猜测来决定当前语言。

相关文件/模块：

- scripts/generate-localized-pages.ts
- scripts/generate-sitemap.ts
- scripts/smoke-test.ts
- vite.config.ts
- src/i18n/index.ts
- src/i18n/locales.ts
- src/i18n/messages.ts
- src/i18n/types.ts
- src/i18n/useLocale.ts
- src/i18n/ui/en.ts
- src/i18n/ui/zh-CN.ts
- src/i18n/ui/zh-HK.ts
- src/data/locales/**
- src/data/seo.ts
- src/data/pageRegistry.ts
- src/data/types.ts

内容按页面和 Locale 拆分，src/data/index.ts 是公开出口。站点实现了：

- 本地化页面内容和 UI 文案；
- LocaleSwitcher；
- 页面、query string 和 hash 的保留式语言切换；
- canonical 和 3 个 hreflang 链接；
- sitemap 中的多语言 URL；
- html lang、body data-locale、body data-page 等语义状态。

### 4.2 PageCompass

PageCompass 是自适应章节罗盘，用于显示当前页面章节、进度和返回顶部能力。

相关文件：

- src/components/PageCompass.vue
- src/composables/usePageCompass.ts
- src/styles/shell.css
- src/styles/responsive.css
- tests/e2e/page-compass-desktop.spec.ts
- tests/e2e/page-compass-mobile.spec.ts

最终交互模型使用显式模式：

    closed | transient | pinned | suppressed

isExpanded 只由 transient/pinned 推导。实现覆盖了：

- pointer、focus、click、Escape、outside interaction；
- 目的地点击后的 hash 与焦点交接；
- Return Top 后清理 hash；
- 跨页导航后的抑制状态；
- reduced-motion；
- 桌面与移动端的不同输入语义。

关键实现细节：

- PageCompass.vue 使用同步 relatedTarget 焦点边界判断，不依赖延迟焦点 handoff；
- 目的地点击使用 preventDefault、selectSection、hash 更新和 suppress 状态；
- Return Top 调用 goTop 后 suppress；
- usePageCompass.ts 通过 IntersectionObserver、hash 激活和 section 选择管理章节状态；
- goTop 以 history.replaceState 清除 hash，并使用即时滚动：window.scrollTo({ top: 0, left: 0, behavior: 'instant' })；
- shell.css 将收起 panel 设为 display: none，并使用稳定的 expanded grid geometry；
- 移除了会让 actionability 与实际几何位置不同步的连续 max-height/padding/transform 几何过渡；
- responsive.css 为 reduced-motion 提供 transition: none !important 和 animation: none !important。

注意：不能表述为“项目中完全没有 nextTick”。src/App.vue 和 src/composables/usePageCompass.ts 仍有用于合法的 hash/observer 初始化的 Vue nextTick。准确表述是：PageCompass 的焦点交接和测试不再使用延迟 nextTick、任意 timeout 或 sleep 来掩盖竞态。

### 4.3 构建、测试和 CI 改造

Playwright 配置现在包括 Chromium、WebKit desktop、WebKit mobile、Chromium visual、Firefox 和 Android 项目。WebKit desktop 明确使用：

- viewport 1200x900；
- isMobile: false；
- hasTouch: false。

WebKit mobile 使用 iPhone 13 配置。测试职责拆分如下：

- tests/e2e/page-compass-desktop.spec.ts：Chromium 与 WebKit desktop；
- tests/e2e/page-compass-mobile.spec.ts：WebKit mobile；
- tests/e2e/ui-primitives.spec.ts：共享语义原语；
- tests/e2e/locale.spec.ts：多语言；
- tests/e2e/compatibility.spec.ts：Firefox/Android/兼容性；
- tests/e2e/site.spec.ts：站点页面和通用行为；
- visual 项目负责视觉回归。

相关 CI 文件：

- .github/workflows/ci.yml
- .github/workflows/pages.yml
- .github/workflows/quality.yml
- playwright.config.ts
- scripts/lighthouse-interactions.mjs
- AGENTS.md

Quality workflow 已拆分 WebKit desktop/mobile 的 PageCompass、site、UI primitive 质量门禁；生产 preview、artifact 输出隔离和失败 trace 规则已经落实。scripts/lighthouse-interactions.mjs 还修正了测量区域之外的 hover 准备逻辑。

## 5. 历史失败与根因总结

原始 2026-08-25 交接文档记录了 Quality Audit #48–#57 的连续失败。下面是保留给下一位 Agent 的压缩版历史：

1. 7925c83：新增多语言基础架构。
2. 03462a1：集成多语言内容与自适应章节罗盘。
3. 0ef10ec：修复多语言控件无障碍门禁。
4. 9845eac：修复正式门禁中的异步状态观察。
5. c0fa4f3：修复 WebKit 导航测试就绪竞态。
6. 729dcac：修复 WebKit 罗盘悬停状态竞态。
7. 5d20438：修复罗盘跨页焦点交接竞态。
8. 1cb61bd：修复首页横屏布局测试就绪竞态。
9. 85fd6b6：修复 WebKit 罗盘字体就绪竞态。
10. 72e7b87：修复 WebKit 罗盘键盘激活竞态。
11. c03bcb5：修复 WebKit 罗盘焦点展开竞态。
12. 4915e13：修复 WebKit 站点测试 timeout（旧的 60 秒调整为 90 秒）。
13. 07682e4：修复 WebKit 压力回归 timeout；只在 rapid-controls stress 测试使用 test.setTimeout(60000)，没有添加 sleep 或 retry 掩盖问题。
14. b3689d3：更新 PageCompass 视觉基线，包含 28 个 Linux snapshot 文件。

这些提交最终在 PR CI、Quality Audit 和后续 main workflow 中通过。旧交接文档中“PR 尚未合并”“Quality Audit #57 失败”“有两个候选本地修复待核验”等描述均已被本文件后面的结果 supersede，不应继续作为当前状态使用。

主要根因归纳：

- WebKit 中 hover、focus、touch 与 PageCompass 模式之间存在状态竞态；
- CSS 连续几何过渡导致 Playwright actionability 检查和实际按钮位置短暂不一致；
- 全局 smooth scrolling 与 Return Top 的断言产生冲突；
- WebKit desktop/mobile 的设备语义混用导致 desktop 被识别为 mobile 或反之；
- 多个 Playwright 运行共用输出目录，导致 trace、截图和失败证据相互覆盖；
- CI 的 dev server 行为和生产 artifact 行为不同，导致本地通过而正式门禁失败；
- 旧的 focus-first 行为与重复 Enter 会让 panel 被切换两次。

修复策略是重构交互状态和几何稳定性，而不是在测试中增加等待。经过连续回归后，当前实现已经消除了原先的 WebKit blocker。

## 6. 本地验证证据

以下验证均在合并前完成，且最终 PR Quality 也再次通过：

### 构建与单元/契约

新鲜工作区执行 npm run check 成功，包含：

- lint/typecheck/dead-code；
- Vitest：13 passed；
- 其余单元/content contract：104 passed；
- sitemap：18 URLs；
- Vite production build；
- smoke：7 root pages, 18 localized sitemap URLs, and static assets verified。

只剩 Vite 对 extensionless import 的未来行为 warning，不是失败。

### 浏览器回归

已完成的本地/正式浏览器验证包括：

- Chromium full E2E：113/113；
- WebKit desktop PageCompass：11/11；
- WebKit desktop site：25 passed / 2 expected skipped；
- WebKit desktop UI primitives：8/8；
- WebKit mobile PageCompass/site/UI primitives：通过；
- Locale 测试：通过；
- Firefox compatibility：通过；
- Android compatibility：通过；
- local Lighthouse interaction：通过。

Focused PageCompass stress lane，均使用 --repeat-each=10 --retries=0：

- Chromium：110/110；
- WebKit desktop：110/110；
- WebKit mobile：20/20。

### Firefox 兼容性审计的第一次失败和复跑

main Quality Audit run 32922811336 的 attempt 1 曾失败，但失败仅发生在 Firefox compatibility：

- 失败测试：tests/e2e/compatibility.spec.ts:175；
- 失败步骤：点击 button[aria-label="下一张"] 后期待 2 / 2；
- 实际在 5 秒内仍为 1 / 2；
- 日志结果：Firefox 项目 11 passed, 3 skipped, 1 failed，其他项目通过。

该失败的 trace/screenshot 显示 click action 完成但 counter 未更新，没有 console/page error 证据；本地无法复现。临时下载并检查过 artifact，确认不是可以从截图中直接判断出的代码错误。

本地精确复现命令：

    $env:PLAYWRIGHT_USE_PREVIEW='1'; $env:PLAYWRIGHT_OUTPUT_DIR='test-results/firefox-local'; npm run test:e2e -- --project=firefox-desktop-smoke --workers=2 --retries=0

结果：12 passed, 3 skipped。

本地 Firefox carousel stress：

    $env:PLAYWRIGHT_USE_PREVIEW='1'; $env:PLAYWRIGHT_OUTPUT_DIR='test-results/firefox-carousel-stress'; npm run test:e2e -- --project=firefox-desktop-smoke --grep 'compatibility menu, carousel' --workers=2 --retries=0 --repeat-each=10

结果：10 passed。

随后只对该 main Quality Audit 进行了官方 rerun，没有修改产品代码：

    gh run rerun 32922811336 --repo yance7/yance7.github.io

attempt 2 在相同 merge SHA 上成功，见下节。

### 视觉基线

Linux visual baseline refresh run 32884887123 成功；下载 artifact 后核对为 48 个文件，与仓库现有数量一致，其中 28 个 PageCompass geometry snapshot 有意更新。更新由 b3689d3 提交。正常 Chromium visual compare 结果为：

    13 passed (23.2s)

没有盲目更新 snapshot；PR Quality 的 visual project 也通过。

## 7. main 上的 GitHub Actions 与 Pages 部署

### main Pages workflow

- workflow run：32922811317
- 链接：https://github.com/yance7/yance7.github.io/actions/runs/32922811317
- event：push
- head SHA：1ee48b72e11215d0a492712f67876261d03f690f
- attempt：1
- conclusion：success
- build job：98039557340，success
- deploy job：98039807540，success

Build job 已通过的关键步骤：

- checkout、Node/Python setup、依赖安装；
- lint、typecheck、dead-code、asset release audit；
- unit tests；
- sitemap、build、smoke artifact；
- Playwright Chromium 安装和 browser release smoke；
- Configure Pages、Upload Pages artifact。

Deploy job 已成功执行 Deploy Pages artifact。Upload smoke artifacts 被跳过是预期行为，不是失败。

### Pages deployment

- deployment id：6095879853
- ref：main
- SHA：1ee48b72e11215d0a492712f67876261d03f690f
- environment：github-pages
- deployment status id：17338020862
- deployment state：success
- environment URL：https://www.yance777.com/

### main Quality Audit

- workflow run：32922811336
- 链接：https://github.com/yance7/yance7.github.io/actions/runs/32922811336
- head SHA：1ee48b72e11215d0a492712f67876261d03f690f
- attempt 1：Firefox carousel 检查偶发失败，详见上节；
- attempt 2：success。

attempt 2 的 job 98044118094：

- started：2026-08-26T02:53:05Z；
- completed：2026-08-26T03:08:20Z；
- 全部实际质量步骤通过，包括 Lighthouse、Chromium、WebKit desktop/mobile、Firefox、Android、visual、axe 和 artifact 上传；
- Upload refreshed visual baselines 因没有 snapshot update 请求而 skipped，属于预期。

Quality run 有 GitHub Actions Node.js 20 deprecated annotation：actions/setup-node、actions/setup-python、actions/upload-artifact 被 GitHub 强制使用 Node 24。该 annotation 不影响当前成功状态，后续可作为依赖升级维护项处理。

## 8. 双域名线上 HTTP Smoke

验证域名：

- https://yance7.github.io/
- https://www.yance777.com/

每个域名都检查了以下 6 条路由，共 12 个 URL：

    /
    /research.html
    /en/
    /en/research.html
    /zh-hk/
    /zh-hk/research.html

12/12 请求返回 HTTP 200，没有观察到意外 redirect 或错误响应。每条页面均检查：

- id="app" 存在；
- Vue entry script 存在；
- html lang 与 URL Locale 匹配：根路由 zh-CN、英文路由 en、繁体路由 zh-HK；
- 正好 3 个 hreflang；
- canonical 指向自定义域名对应的同一路径。

canonical 映射规则示例：

    /                    -> https://www.yance777.com/
    /research.html       -> https://www.yance777.com/research.html
    /en/                 -> https://www.yance777.com/en/
    /en/research.html    -> https://www.yance777.com/en/research.html
    /zh-hk/              -> https://www.yance777.com/zh-hk/
    /zh-hk/research.html -> https://www.yance777.com/zh-hk/research.html

PowerShell HTTP 检查在尝试打印最终 ResponseUri 时，遇到 PowerShell 对 BaseResponse.ResponseUri 返回 null 的显示限制；因此不要把该脚本描述成提供了完整 redirect chain 证据。可确认的证据是 12 条请求均为 200、没有异常错误，且 canonical 一致。

## 9. 双域名线上 Playwright Smoke

曾临时生成 test-results/live-dual-domain-smoke.mjs 使用 Playwright Chromium 直接访问生产线上两个域名，验证完成后已清理临时脚本和临时失败 artifact；没有产品源码变化。

最终线上浏览器 smoke 通过的内容：

- 两个域名、6 条路由，共 12 个 route case；
- 等待 .site-shell[data-page-load-state="ready"]；
- html lang、body data-locale、body data-page、main 可见；
- LocaleSwitcher 可见，桌面端有 3 个语言选项且恰有一个 current locale；
- 6 个 primary nav 项目及其带 Locale 前缀的 route；
- theme control 可见；
- PageCompass 存在；
- canonical 与 head 中 hreflang 的精确 route map；
- 在 /en/research.html?smoke=1#sec-toolchain 切换到 zh-HK 后，页面、query、hash 均保留；
- 主题切换后的 dark 状态持久化；
- desktop PageCompass 展开、panel 可见、多条章节链接、目的地点击后的 URL/hash、panel 关闭与 aria-hidden；
- 滚动到底部后点击 Return Top，scrollY <= 8 且 hash 清除；
- mobile viewport 390x844 下展开 PageCompass，章节链接触摸目标至少 44x44；
- mobile Escape 后焦点回到 trigger，panel 关闭；
- console errors、page errors 和实际本地资源失败均为空。

线上 smoke 记录的交互检查名称：

    locale-preservation
    theme-persistence
    desktop-compass-destination
    desktop-return-top
    mobile-compass-touch-target
    mobile-compass-escape

两个最终线上入口：

- https://yance7.github.io/
- https://www.yance777.com/

第一次浏览器脚本运行时，两个字体请求被浏览器导航关闭产生 net::ERR_ABORTED，脚本曾误把它们统计为失败。已确认这是关闭旧 route page 时的浏览器取消，不是 HTTP 资源错误；脚本随后只忽略该类 requestfailed 诊断并重新运行，最终诊断为空。该临时 smoke 脚本没有提交。

## 10. 当前已知 warning / 非阻塞事项

目前没有阻塞发布的问题。仅有以下维护性信息：

1. Vite 对若干 extensionless imports 给出未来 native config loader warning，例如 src/data/seo.ts、src/i18n/...。当前 build/test 均成功。
2. GitHub Actions 标注 Node.js 20 deprecated，相关 actions 已被 GitHub 强制切换到 Node 24。当前 workflow 成功，后续可升级 action 版本或显式处理。
3. 本地 checkout 不是 main，而是已合并的功能分支；这是交接现场状态，不是线上状态错误。
4. PR 源分支没有删除，是用户授权范围内的保留状态。
5. 本交接文档和 docs/superpowers/plans/2026-08-25-pr15-completion.md 尚未 commit/push；这是有意保留，避免未经用户再次要求把交接记录写入远程历史。

## 11. 下一位 Agent 的建议操作

如果只是了解项目或检查发布，不需要重新合并或重新部署。建议只读核验：

    git status --short --branch
    git log -1 --format='%H %s'
    gh api repos/yance7/yance7.github.io/git/ref/heads/main --jq '{ref:.ref,sha:.object.sha}'
    gh pr view 15 --repo yance7/yance7.github.io --json state,mergedAt,mergeCommit,headRefName,baseRefName,statusCheckRollup
    gh run view 32922811317 --repo yance7/yance7.github.io
    gh run view 32922811336 --repo yance7/yance7.github.io

如果要继续开发新功能：

1. git fetch origin；
2. 从 origin/main 建立新的 codex/... 分支；
3. 不要在当前已合并功能分支上追加与 PR #15 无关的产品改动；
4. 继续遵守生产 preview、独立 PLAYWRIGHT_OUTPUT_DIR、focused stress lane 和 verification-before-completion 规则；
5. 新的 UI/交互修改应先跑最小相关测试，再跑 npm run typecheck 和对应 browser project，最后才跑完整质量门禁；
6. 若未来再遇到相同 PageCompass/WebKit 失败，优先检查状态机、设备语义、字体/资源 ready 状态和几何稳定性，避免加入任意等待。

如果要更新交接资料，应新增日期明确的新文件或在用户明确要求时更新本文件；不要删除 2026-08-24 和 2026-08-25 的历史交接。

## 12. 本轮清理与未做事项

已做：

- PR #15 squash merge；
- main Pages workflow 和 deployment 核验；
- main Quality Audit rerun 并核验 success；
- 两个域名 12 条路由的 HTTP smoke；
- 两个域名 12 条路由的 Playwright Chromium 线上 smoke；
- 检查 Firefox 失败 artifact 并进行本地精确复现/stress；
- 清理临时线上 smoke 脚本、下载的失败 artifact 解压目录及临时诊断文件；
- 新增本交接文档。

未做：

- 没有把本交接文档 commit；
- 没有 push 本交接文档；
- 没有删除 PR #15 源分支；
- 没有修改产品代码、测试代码、workflow 或视觉基线；
- 没有重新触发已经成功的 Pages workflow；
- 没有切换当前本地 checkout 到 main；
- 没有把任何生成的 dist/ artifact 加入 Git。

## 13. 相关历史资料

- 当前文档：docs/handoff/2026-08-26-pr15-main-pages-smoke-handoff.md
- 上一份 i18n/PageCompass 交接：docs/handoff/2026-08-25-i18n-adaptive-compass-handoff.md
- 更早的项目交接：docs/handoff/2026-08-24-project-handoff.md
- 执行计划：docs/superpowers/plans/2026-08-25-pr15-completion.md
- PR #15：https://github.com/yance7/yance7.github.io/pull/15
- main Pages run：https://github.com/yance7/yance7.github.io/actions/runs/32922811317
- main Quality Audit run：https://github.com/yance7/yance7.github.io/actions/runs/32922811336
- PR CI run：https://github.com/yance7/yance7.github.io/actions/runs/32887248884
- PR Quality Audit run：https://github.com/yance7/yance7.github.io/actions/runs/32887248926
