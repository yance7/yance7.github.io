# 个人网站项目交接文档：PR #15 多语言与自适应章节罗盘

生成时间：2026-08-25（Asia/Shanghai）

本文用于把当前对话和仓库状态交接给下一个对话。内容分为“已经完成”“仍未完成”“证据”“困难与限制”，避免把历史状态或推测误认为当前事实。

## 先看结论

PR #15 的功能代码已经在分支上形成，基础检查和大部分正式质量门禁通过；但正式 Quality Audit #57 仍在 WebKit site + axe 阶段失败，因此当前不能合并到 main。

当前没有完成以下动作：

- 没有合并 PR #15 到 main。
- 没有触发或等待本次改动对应的 GitHub Pages 正式部署。
- 没有执行部署后的双域名 smoke。
- 没有把最新的两个本地候选修复提交或 push。

PR 当前已经是 Ready 状态，不是 Draft；问题不是“忘记标记 ready”，而是正式质量门禁仍然失败。

## 1. 当前远端和本地状态

| 项目 | 当前值 |
| --- | --- |
| 仓库 | yance7/yance7.github.io |
| 分支 | feat/i18n-adaptive-compass |
| 本地 HEAD | 4915e13537236b2251afc2ec4e5587bc4aa405a2 |
| origin 分支 HEAD | 4915e13537236b2251afc2ec4e5587bc4aa405a2 |
| PR | [#15 集成多语言内容与自适应章节罗盘](https://github.com/yance7/yance7.github.io/pull/15) |
| PR 状态 | OPEN |
| Draft 状态 | false，已经 Ready |
| base | main |
| mergeable | GitHub 查询结果为 MERGEABLE，但这不代表质量门禁通过 |
| Pull Request CI | run 32860921108，job 97844403367，SUCCESS |
| Quality Audit | run 32860921109，job 97844403923，FAILURE |
| Quality Audit head | 4915e13537236b2251afc2ec4e5587bc4aa405a2 |

远端链接：

- [PR #15](https://github.com/yance7/yance7.github.io/pull/15)
- [Pull Request CI #32860921108](https://github.com/yance7/yance7.github.io/actions/runs/32860921108)
- [Quality Audit #32860921109](https://github.com/yance7/yance7.github.io/actions/runs/32860921109)

## 2. 当前工作区状态

当前分支与远端同一个 commit，但工作区还有两个未提交、未 push 的候选修改：

~~~text
 M src/composables/usePageCompass.ts
 M src/styles/responsive.css
?? docs/handoff/
~~~

候选修改一：src/composables/usePageCompass.ts

~~~diff
- window.scrollTo(0, 0)
- window.requestAnimationFrame(() => window.scrollTo(0, 0))
+ const scrollToTop = () => window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
+ scrollToTop()
+ window.requestAnimationFrame(scrollToTop)
~~~

目的：针对 WebKit 下点击“返回顶部”后 scrollY 仍未稳定回到 0 的失败，显式指定 behavior 为 auto，并在下一帧再次执行。

候选修改二：src/styles/responsive.css

~~~diff
+ .page-compass,
+ .page-compass-panel,
+ .page-compass-trigger-icon { transition: none !important; }
~~~

位置是在全局 prefers-reduced-motion: reduce 规则中。

目的：针对 reduced-motion 下 PageCompass 外层已经 expanded，但 panel 内的 destination link 仍处于 visibility hidden 的跨浏览器过渡竞态，移除 PageCompass 相关 transition。

重要：这两个修改只是本地候选，尚未经过完整 npm run check、正式远端 Audit 或正式 visual compare。下一个 Agent 不应直接把它们当成已经验证的修复，也不应直接 merge。

docs/handoff/ 目录是本次和此前用户交接文档所在目录。原有文件：

Y:/Personal Website/docs/handoff/2026-08-24-project-handoff.md

是之前 PR #13 的历史交接文档，不能用其中的旧分支、旧 commit 或旧门禁结果代表当前状态。本文件是当前 PR #15 的新交接文档。

## 3. 已完成的产品和代码工作

以下内容已经在 feat/i18n-adaptive-compass 分支的 commit 中落地，且基础检查通过；“已完成”表示代码已写入分支，不表示已经部署到生产。

### 多语言基础架构

- 建立 zh-CN、zh-HK、en 三套 locale。
- 以 URL locale 作为 locale source of truth。
- 生成对应的本地化页面、页面导航和 sitemap URL。
- 保持既有 PageKey、页面路由和 hash 语义。
- 加入多语言字典、页面 scoped content 和共享 data contract。
- 加入对应的 SEO、alternate、语言相关 HTML 元数据和部署静态资源。
- 处理 HK 字体和多语言排版。

### LocaleSwitcher

- 实现语言切换控件。
- 切换语言时保留当前页面语义和 hash。
- 处理 keyboard、focus、aria-expanded、aria-controls 等无障碍契约。
- 覆盖 mobile language menu 和 reduced-motion 场景。

### Adaptive PageCompass

- 将章节罗盘接入页面章节数据。
- 支持 pinned、hover、focus-within、keyboard 和 mobile 场景。
- 支持章节定位、阅读进度和返回顶部。
- 处理 collapsed panel 的 visibility、pointer-events、inert/focusability 和 aria-current。
- 返回顶部后保留 trigger focus，并避免 focus handoff 重新打开 panel。
- 通过 E2E、axe 和多浏览器测试验证主要交互。

### 主要功能 commit

按时间从早到晚：

| Commit | 摘要 | 作用 |
| --- | --- | --- |
| 7925c83 | 新增多语言基础架构 | 建立 locale、字典、URL/页面基础 |
| 03462a1 | 集成多语言内容与自适应章节罗盘 | 接入三语内容与 PageCompass |
| 0ef10ec | 修复多语言控件无障碍门禁 | 收敛 LocaleSwitcher 的 axe/键盘契约 |
| 9845eac | 修复正式门禁中的异步状态观察 | 等待页面和交互状态真正稳定 |
| c0fa4f3 | 修复 WebKit 导航测试就绪竞态 | 加强目标页面/目标链接 ready 观察 |
| 729dcac | 修复 WebKit 罗盘悬停状态竞态 | 每次导航后把鼠标移出，避免遗留 hover |
| 5d20438 | 修复罗盘跨页焦点交接竞态 | 增加 destination 完成后的 trigger focus 契约 |
| 1cb61bd | 修复首页横屏布局测试就绪竞态 | 等待 shell、字体和布局帧稳定 |
| 85fd6b6 | 修复 WebKit 罗盘字体就绪竞态 | 导航/滚动后等待 document.fonts 和 RAF |
| 72e7b87 | 修复 WebKit 罗盘键盘激活竞态 | 用 keyboard activation 避免 pointer actionability 问题 |
| c03bcb5 | 修复 WebKit 罗盘焦点展开竞态 | 识别 focus-first 设计，避免冗余 Enter 二次切换 |
| 4915e13 | 修复 WebKit 站点测试超时 | 将六页面串行测试的 test timeout 从 60s 调到 90s |

## 4. 已通过的检查和证据

### 本地基础检查

在远端 HEAD 4915e13 上，候选本地修改产生之前，npm run check 已通过：

- lint：通过。
- typecheck：通过。
- dead-code 检查：通过。
- Vitest：13 个文件、104 个测试通过。
- sitemap：18 个 URL 通过。
- production build：通过。
- smoke：7 个根页面、18 个 localized sitemap URL 和静态资源通过。

Vite 会打印 native config 的 extensionless import warning，但没有导致命令失败。

### 远端 Pull Request CI

run 32860921108 已成功，以下步骤均通过：

- lint source
- typecheck Vue app
- dead-code check
- asset audit
- unit tests
- generate sitemap
- build site
- smoke test artifact
- Playwright Chromium 安装
- browser release smoke

### Quality Audit #57 中已经实际通过的 gate

run 32860921109 的 job 97844403923 中，以下步骤为 success：

- Build audit target
- Smoke test audit target
- Lighthouse quality budget
- Lighthouse interaction budget
- Chromium browser and axe quality
- Firefox compatibility quality
- Android compatibility quality
- Upload quality artifacts

因此当前没有证据表明 Lighthouse、Chromium axe、Firefox、Android 或基础多语言构建是 blocker。

### 本地 WebKit 证据

- 在 4915e13 上执行完整 site.spec.ts 的 webkit-mobile 项目时，31 个测试均打印为 passed。
- 但 Windows 下 Vite 子进程没有干净退出，测试进程需要人工停止。因此这只能算本地行为证据，不能替代 GitHub Quality Audit。
- 在当前两个候选本地修改上，返回顶部 targeted test 的 repeat-each=3 已完成 3/3 passed，耗时约 30.8s。
- 跨页 destination targeted test 的 repeat-each=3 中，前两轮通过；第三轮在用户要求停止前尚未完成，不能写成 3/3 通过。
- 当前两个候选修改之后还没有重新运行 npm run check。

## 5. 正式门禁失败的完整演进

这是本次任务持续时间很长的主要原因：每次修复都需要等待远端质量门禁，失败点在不同浏览器和不同异步阶段之间移动。

### Quality Audit #48：基础异步状态问题

- run：32833858083。
- job：97758279224。
- head：0ef10ecb1c5964523fad012f183d6a088b9af6f4。
- 现象：基础 CI 绿，但正式 Quality Audit 中 Chromium/Firefox 等异步观察相关阶段有失败。
- 修复：9845eac，统一等待页面状态、字体、shell ready 和交互状态。
- 结论：不是单一生产页面崩溃，而是测试观察时机没有等到最终状态。

### WebKit 目标链接和 hover/actionability

- run 32839190991：Chromium 通过，WebKit site 在导航 destination 准备阶段失败；修复 c0fa4f3。
- run 32840955380：WebKit 触发器 actionability 超时；页面状态已经基本正确，但遗留 hover/pointer 状态影响了点击；修复 729dcac，在导航后执行 page.mouse.move(0, 0)。
- run 32843072633：WebKit 在 honors 等页面中点击 destination 后仍出现隐藏/焦点交接问题；修复 5d20438，增加 trigger focus 断言。

### Chromium 横屏布局和 WebKit 字体/布局就绪

- run 32845928905（对应 Quality Audit #52）：基础、Lighthouse 通过，但 Chromium 在 844×390 首页横屏布局中失败，actionsBottom 为 477.484，超过预期 390；WebKit/Visual 因前置失败跳过，Firefox/Android 通过；修复 1cb61bd。
- run 32848403419：Chromium 通过，WebKit 在 concerts route 的 locator click 处失败，触发器 aria-expanded 仍为 false；修复 85fd6b6，等待 fonts ready 和双 RAF。
- run 32851693352：WebKit 在 honors route 仍遇到 aria-expanded=false/actionability 问题；本地几何采样稳定，但 WebKit pointer 点击仍不稳定；修复 72e7b87，改用键盘激活。

### Focus-first 设计与冗余 Enter

- run 32854814241：WebKit 在 works destination 上出现 link hidden。原因不是简单的“Enter 没有执行”，而是 PageCompass 的设计是 focus 就展开；测试先 focus 已经打开 panel，再额外 Enter 可能触发第二次 toggle，把 panel 关闭。
- 修复 c03bcb5：去掉冗余 Enter，改为 focus 后直接断言 aria-expanded=true。
- 这个修复保留了产品的 keyboard focus 行为，没有通过删除 assertion 或放宽契约来过测试。

### Quality Audit #56：WebKit 仍是唯一 blocker

- run：32858185985。
- head：c03bcb52dff0a5fa0e8a3b8d1c1bce9c3f7789b5。
- Build、Smoke、Lighthouse、Chromium、Firefox、Android 等通过；WebKit site + axe 失败；WebKit primitives 和 Visual 因前置 WebKit 失败而跳过。
- 当时 WebKit job 运行约两分钟，六个页面串行测试的总预算只有 60s，因此尝试了 4915e13：只把 tests/e2e/site.spec.ts 中该测试的 test.setTimeout 从 60000 调到 90000。
- 这个修改不是 waitForTimeout，也没有增加 retries；但下一轮证明延长总预算本身没有解决当前两个具体 assertion。

### Quality Audit #57：当前正式 blocker

- run：32860921109。
- job：97844403923。
- head：4915e13537236b2251afc2ec4e5587bc4aa405a2。
- 运行时间：约 15 分 20 秒。
- WebKit site + axe：FAIL。
- WebKit UI primitive：SKIP。
- Chromium visual：SKIP。
- Firefox：PASS。
- Android：PASS。
- 站点测试结果：27 passed、2 failed、2 skipped。

两条真实失败如下。

#### 失败一：返回顶部的 scrollY 未在 30 秒内回到 0

测试：

tests/e2e/site.spec.ts:187

名称：

page compass unifies section navigation, reading progress, and return to top

失败断言：

~~~text
await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBeLessThan(8)
~~~

结果是：

~~~text
Error: Test timeout of 30000ms exceeded
~~~

发生在点击 PageCompass top 之后。远端日志引用了 trace.zip，但下载到本地的 quality artifact 目录中没有实际 trace 文件，因此没有办法用 trace 还原完整动画时序。

当前本地候选修复是把 usePageCompass.goTop 的 scrollTo 改为：

~~~ts
const scrollToTop = () => window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
scrollToTop()
window.requestAnimationFrame(scrollToTop)
~~~

#### 失败二：focus 后 panel expanded，但 destination link 仍 hidden

测试：

tests/e2e/site.spec.ts:302

名称：

site navigation stays pinned and every compass destination clears it

失败点：

~~~text
Locator: locator('.page-compass-link[href="#concert-archive"]')
Expected: visible
Received: hidden
Timeout: 5000ms
~~~

发生在 concerts route、目标 #concert-archive。此时 trigger 的 aria-expanded 已经是 true，但 panel 内目标链接的 visibility 仍为 hidden。

当前本地候选修复是在 reduced-motion 全局规则中移除 PageCompass、panel 和 trigger icon 的 transition：

~~~css
.page-compass,
.page-compass-panel,
.page-compass-trigger-icon { transition: none !important; }
~~~

这说明当前 blocker 更像是 WebKit 对 scroll/transition/visibility/focus 状态的时序观察问题，不能仅凭“总测试慢”处理。仍需通过 targeted test 和正式 Audit 证明。

## 6. 当前遇到的困难和技术风险

### 6.1 WebKit actionability 与实际 DOM 状态不一致

多次出现“trigger 已经有正确 aria-expanded、几何位置也稳定，但 Playwright 仍把目标当作 hidden 或不可点击”的情况。WebKit mobile emulation 下 hover、pointer、transform、visibility、opacity 和布局帧之间的交互与 Chromium 不同。

有一次本地采样显示：

~~~text
page-compass page-compass-expanded
activeElement: page-compass-trigger
triggerExpanded: true
panel display: grid
panel visibility: visible
panel opacity: 0
panel maxHeight: 0px
panel transform: matrix(... -4)
link visibility: hidden
~~~

这个中间状态可以解释“容器看似打开，但 link 仍 hidden”。但本地有时最终会通过，远端 WebKit 则能在 5s 内持续看到 hidden，导致难以只靠单次复现定位。

### 6.2 PageCompass 是 focus-first，而测试容易误把 Enter 当成打开动作

产品契约是 focus trigger 就展开 panel。测试曾经 focus 后再 press Enter，WebKit 可能把 Enter 解释为第二次 toggle，结果 panel 重新关闭。这个问题已经通过 c03bcb5 修复，但后续修改必须保持：

~~~text
focus trigger
→ panel opens
→ aria-expanded=true
→ select destination
→ panel closes
→ trigger remains focused
~~~

不能为了稳定测试而删除 focus、aria-expanded 或 focus-return assertion。

### 6.3 异步链条较长

页面导航、site-shell ready、document.fonts.ready、Vue nextTick、requestAnimationFrame、setTimeout、CSS transition 和 scroll settling 叠在一起。生产代码中 closeCompass 的焦点恢复曾经是 nextTick 再 setTimeout，测试观察到的是最终状态而不是某一个中间状态，因此很容易形成跨浏览器竞态。

### 6.4 返回顶部在 WebKit 中不稳定

window.scrollTo(0, 0) 在有滚动行为、CSS reduced-motion 和页面异步布局时，并不能保证下一次轮询立即得到 scrollY=0。当前候选修复显式指定 behavior:auto，但没有远端证据。

### 6.5 六页面串行测试的总 deadline 较大

site navigation stays pinned... 一条测试顺序访问 Home、Academics、Honors、Research、Works、Concerts，每页都要加载、等待字体、滚动、打开 Compass、定位章节和交接焦点。WebKit mobile emulation 很慢，60s 确实偏紧，所以 4915e13 将 test timeout 调到 90s。

但提高 deadline 不能替代修复具体的 visibility 或 scroll assertion。下一步不能继续无条件调成 120s/180s。

### 6.6 Gate 有前置跳过关系

WebKit site + axe 失败后，WebKit UI primitive 和 Chromium visual 会被 skip。于是某一轮显示“总 gate 失败”，并不代表 Visual 已经正式 compare；也不能把 skip 当作 pass。

当前仍没有一轮正式 Audit 同时证明：

- WebKit site 通过；
- WebKit primitives 真实执行并通过；
- Chromium visual 真实执行并通过；
- 新的三语 UI 和 Adaptive PageCompass baseline 在 CI 环境中稳定。

### 6.7 失败证据不总是完整

GitHub 最初只暴露 job 失败，没有完整 assertion 文本。后续通过 job failed log 才拿到具体行号；远端日志引用 trace.zip，但下载的 artifacts 目录没有 trace 文件。因此排查依赖 commit 对比、失败阶段、测试代码和本地复现交叉判断，不能只看 job 名称。

### 6.8 Windows 本地环境有噪音

- Playwright 测试全部打印 passed 后，Vite 子进程偶尔不退出，需要人工停止。
- 曾出现 Windows spawn EPERM 类进程问题。
- PowerShell 下部分搜索工具可能被系统策略拦截，必要时改用 Get-ChildItem、Select-String 或 git 自带命令。
- Vite 的 extensionless import / native config warning 会污染日志，但目前没有证据表明它们是本次 WebKit blocker。

这些是本地工具和可观测性问题，不应直接当成生产代码故障；但它们会显著延长一次验证的时间。

### 6.9 当前工作树存在未提交候选代码

如果下一个对话直接执行 commit 或 push，可能把未经完整验证的两个候选改动带入 PR。应先看 diff、跑 targeted test、再决定保留、调整或撤销。

## 7. 明确未完成的事项

按优先级排列：

1. 找到并修复 Quality Audit #57 的 WebKit 返回顶部 scrollY 失败。
2. 找到并修复 WebKit focus 后 destination link hidden 失败。
3. 在 retries=0 下重复运行两个 targeted test，确认不是偶然通过。
4. 重新运行 npm run check；候选修改当前还没有经过这一步。
5. 推送新的 commit，等待新的 Quality Audit 首次完整成功。
6. 确认 WebKit UI primitive 和 Chromium visual 不再因前置失败而 skip。
7. Visual 正式运行必须是普通 compare，不能直接使用 --update-snapshots；只有确认是本 PR 明确造成的 intentional UI change 才能更新一次 baseline。
8. Quality Audit 全部通过后，才进入 PR 合并流程。
9. 合并到 main 后，等待 GitHub Pages workflow 完成并确认部署 commit。
10. 部署后执行两个域名的 smoke：
    - https://yance7.github.io/
    - https://www.yance777.com/

## 8. 下一个 Agent 的推荐处理顺序

### 第一步：确认未提交候选

~~~powershell
git status --short --branch
git diff -- src/composables/usePageCompass.ts src/styles/responsive.css
git diff --check
~~~

先不要改更多文件，也不要增加 retries、waitForTimeout 或放宽 assertion。

### 第二步：单点复现当前两个 WebKit blocker

~~~powershell
npx playwright test tests/e2e/site.spec.ts --project=webkit-mobile --grep "page compass unifies section navigation, reading progress, and return to top" --workers=1 --retries=0 --repeat-each=20
~~~

~~~powershell
npx playwright test tests/e2e/site.spec.ts --project=webkit-mobile --grep "site navigation stays pinned and every compass destination clears it" --workers=1 --retries=1 --repeat-each=10
~~~

正式排查时建议把第二条也改为 retries=0；这里先用较少次数快速看是否稳定复现。若失败，记录第一条真实 expected/received、route、activeElement、aria-expanded、panel visibility、opacity、max-height 和 bounding box。

### 第三步：按失败类型决策

- 如果仍是 scrollY 未回到 0：检查 scroll-behavior、页面是否存在 smooth scroll、hash/history 更新是否触发滚动，以及 usePageCompass 的双阶段 scroll 是否和页面布局冲突。
- 如果仍是 destination link hidden：检查 PageCompass 的 expanded CSS、reduced-motion 规则、panel visibility/opacity/max-height 的同一帧状态；不要只继续加 timeout。
- 如果是 focus/aria 失败：回到 PageCompass 的状态机，保证 focus 不会重新打开已关闭的 panel。
- 如果是 axe：按实际 rule/node 修复生产无障碍，不要隐藏仍然可 focus 的内容。
- 如果是 visual：先检查 diff，确认是本 PR 明确造成的 intentional change，再单次更新 baseline；更新后必须普通 compare。

### 第四步：重新验证本地门禁

~~~powershell
npm run check
~~~

然后至少运行对应的 WebKit site、WebKit primitives、Chromium visual、Firefox 和 Android 项目，全部使用 retries=0，并以仓库 workflow 的实际命令为准。

可以参考：

~~~text
CI=1 npm run test:e2e -- --project=chromium --workers=4 --retries=0
CI=1 npm run test:e2e -- tests/e2e/site.spec.ts --project=webkit-mobile --workers=4 --retries=0
CI=1 npm run test:e2e -- tests/e2e/ui-primitives.spec.ts --project=webkit-mobile --workers=4 --retries=0
CI=1 npm run test:e2e -- --project=chromium-visual --workers=2 --retries=0
CI=1 npm run test:e2e -- --project=firefox-desktop-smoke --workers=2 --retries=0
CI=1 npm run test:e2e -- --project=chromium-android-smoke --workers=2 --retries=0
~~~

PowerShell 可先设置 $env:CI = '1'，不要把上面的 shell 语法直接当作 PowerShell 语法执行。

### 第五步：核对远端 Audit

~~~powershell
gh run view 32860921109 --repo yance7/yance7.github.io --job 97844403923 --log-failed
gh pr view 15 --repo yance7/yance7.github.io --json state,isDraft,mergeable,headRefOid,statusCheckRollup,url
~~~

每次修复后都要确认新的 head SHA，并确认新的 Quality Audit 是在新 head 上运行。不能因为 Basic CI 绿就合并。

### 第六步：最后才部署和双域名 smoke

只有当 Quality Audit 的 WebKit、Visual、Lighthouse、Chromium、Firefox、Android 等正式 gate 全部实际通过后，才继续：

1. 确认 PR 已 Ready；当前已经是 Ready，所以不需要重复执行 gh pr ready。
2. 按用户原始要求合并 PR #15 到 main。
3. 等待 Pages workflow 完成。
4. 确认部署 commit 是合并后的 main commit。
5. 在 yance7.github.io 和 www.yance777.com 上分别检查根页、一个本地化页面、语言切换、hash 导航和返回顶部。

## 9. 明确禁止的快捷处理

不要使用以下方式掩盖失败：

- 不能删除或削弱 toBeFocused、aria-expanded、visibility、scrollY 等既有契约。
- 不能用 waitForTimeout 等固定睡眠替代状态等待。
- 不能靠增加 retries 让偶发失败消失。
- 不能跳过 WebKit、Visual 或某个 browser project。
- 不能无证据直接 --update-snapshots。
- 不能仅因为 mergeable=true 就合并。
- 不能把 WebKit/UI primitive/Visual 的 skipped 当作 passed。
- 不能把未提交候选修改说成已经修复。

## 10. 最终交接判断

当前最准确的状态是：

~~~text
功能实现：大部分已完成
基础 CI：通过
本地 npm run check：在 4915e13 上通过；候选修改后未重跑
远端 Quality Audit：失败
当前 blocker：WebKit site + axe 的两个真实失败
Visual：本轮因 WebKit 前置失败而 skip，尚未正式证明
PR Ready：是
PR merged：否
Pages deployment：未进行
双域名 smoke：未进行
工作区：有两个未提交候选修改
~~~

因此下一个对话应从“验证并收敛两个 WebKit blocker”开始，而不是从合并或部署开始。
