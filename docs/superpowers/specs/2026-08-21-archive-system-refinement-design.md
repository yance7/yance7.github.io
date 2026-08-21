# Personal Archive System Refinement Design

## 背景

本设计将《Yance Personal Archive 全面设计与工程优化建议报告》转化为可实施的工程方案。项目已经具备稳定的 Vue 3 + TypeScript + Vite MPA 架构，因此本轮不做框架迁移、不改变页面内容表达，也不引入新的主要视觉语言。

当前仓库已经具备较完整的质量链路，但视觉 token、交互层级、Reveal 实现、全局 CSS 加载范围和 Lighthouse 覆盖范围仍有收敛空间。本设计以“内容优先、动效服务结构、装饰服务气氛”为最高原则。

## 目标

1. 在不修改现有文字、个人基本信息、页面结构语义和外部内容链接的前提下，建立更明确的字体、字号、字距、色彩、圆角、间距和动效系统。
2. 让 elevation、pointer tracking 和 glow 只出现在真正可交互或具有签名意义的元素上。
3. 让 PageCompass 成为桌面端的主要章节导航，避免它与独立滚动进度视觉争夺注意力。
4. 消除 Reveal 在现代浏览器中的重复滚动/尺寸监听。
5. 让页面级 CSS 与当前动态页面加载架构匹配，减少每个页面初始下载的无关样式。
6. 将 Lighthouse、Playwright、axe 和视觉回归覆盖扩展到桌面、移动、键盘、减少动态效果、forced colors 和 200% 缩放场景。
7. 建立媒体版权、隐私、EXIF 和发布前检查记录，不以增加 Cookie banner 或第三方追踪为代价。

## 非目标

- 不迁移到 Nuxt、Next、Astro 或 Vue Router。
- 不新增 Three.js、WebGL、粒子背景、自动播放音乐、自定义鼠标或 Splash Screen。
- 不改变现有中文/英文文案、个人成绩、研究结果、项目名称、演唱会记录或页面信息架构。
- 不将图片替换为未经确认的新来源。
- 不为了提高 Lighthouse 分数而移除现有必要的可访问性、错误处理或深链接能力。

## 设计原则

### 视觉身份

保留 Quiet Atelier / Editorial Archive / Scientific Precision 的既有身份。唯一的视觉冒险是进一步强化排版纪律和内容层级，不增加新的渐变、材质或装饰体系。

### 语义强调色

- Gold：品牌主强调、CTA、当前导航、关键结果和精选作品。
- Aqua：研究、技术 metadata、系统状态和进度信息。
- Violet：音乐或少量罕见/文化语义，不作为普通卡片的通用强调色。

现有亮色和暗色的可读性保持不变；所有颜色变更必须通过对比度测试确认。

### 字体职责

继续使用现有四套本地字体，不增加字体文件：

- 正文：Inter + Noto Sans SC fallback，16px，1.75–1.8。
- Editorial 标题：Inter + Noto Serif SC，中文标题由 Noto Serif SC 承担。
- 数据和普通 secondary text：Inter / Noto Sans SC，使用 tabular 数字时显式开启 tabular-nums。
- 技术标签、坐标、编号：IBM Plex Mono，仅用于真正的技术 metadata。

字体 token 要表达语义，而不是仅表达字体形态。英文 uppercase metadata 保持 0.12–0.18em；中文标题不使用大幅正字距；中文 metadata 控制在 0.03–0.08em。

### 阅读宽度

- Editorial prose：`--w-editorial: 700px`。
- Data / research panel：`--w-data: 840px`。
- 站点主容器：继续使用约 1240px。
- Wide stage：继续支持约 1440px。

章节标题、正文和研究时间轴使用 editorial 宽度；指标、AP 表格、工具链和媒体墙使用 data 或主容器宽度。

### 层级与交互

只允许四个主要圆角语义：6px small、14px card、20px large/modal、999px pill。保留旧 token 作为兼容层，但新增样式不得继续引入任意圆角。

静态信息不升起；只有链接、按钮、可筛选项、可选择媒体和真正的 CTA 才允许 elevation。静态 Metric、Toolchain、Leadership 等元素只使用颜色、边界或内容状态反馈。

### 动效预算

- Micro：120–180ms。
- Component：180–280ms。
- Section reveal：320–450ms。
- Page/theme：450–600ms。

保留 `prefers-reduced-motion`、coarse pointer 和 forced colors 降级。任何非必要持续动画不得影响内容读取或键盘导航。

## 架构方案

### 1. Token 层

在现有 `src/theme.css` 中增加语义化 typography、width、spacing、radius 和 motion token，并让现有样式逐步改用这些 token。主题颜色继续由 Vite 的 theme token plugin 注入 HTML；不改变现有 CSP bootstrap 流程。

推荐基础间距为 4px，常用值为 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128px。结构性间距继续使用 `clamp()`，但上下限必须落在这套阶梯附近。

### 2. 导航层级

`PageCompass.vue` 和 `usePageCompass.ts` 保留现有 hash、IntersectionObserver、移动端状态和键盘焦点逻辑。

- Desktop：保留顶部导航和 PageCompass；独立横向 scroll progress 降至极低视觉权重，不再与 Compass 的圆形进度争夺焦点。
- Mobile：保留顶部导航和极轻的 scroll progress；Compass 只在阅读方向、焦点或章节切换需要时出现。
- 所有 sticky UI 必须给 hash target 和 focus target 留出 `--anchor-offset` 的安全空间。

### 3. Reveal 生命周期

`src/directives/reveal.ts` 使用单一路径：

- 支持 IntersectionObserver 时，只注册 IntersectionObserver。
- 不支持 IntersectionObserver 时，元素立即显示，不注册 scroll/resize fallback。
- reduced motion 时，元素立即显示。
- unmount 时解除 observer、pending 状态和 transition delay。

这样保留了现有的“快速深链不会隐藏过去内容”行为，同时删除现代浏览器中的重复 scroll、resize 和 rAF 检查。

### 4. Pointer Sheen

`pointerSheen` 继续只在 fine pointer + hover 环境启用。进入元素时缓存 bounds，resize、scroll 或 layout 变化后失效；pointermove 只使用缓存几何信息并通过 rAF 合并写入。touch、reduced motion 和不支持 hover 的设备保持无 tracking 的静态状态。

Magnetic 仅保留给重要 CTA 和少数签名控件；普通 Academic、Honor、Metric 信息不使用 magnetic 或 sheen。

### 5. CSS code splitting

全局样式拆为：

- `src/theme.css`：全局 token 和主题语义（保留现有文件位置，避免破坏 Vite 的主题 bootstrap 依赖）。
- `base.css`：reset、body、focus 和通用辅助类。
- `shell.css`：站点外壳、顶部导航、Hero、Compass、主题控件。
- `components.css`：跨页面组件，如 SectionHeading、MetricStrip、StatusBadge、Lightbox、共享按钮。
- `responsive.css`：真正跨页面的响应式规则。
- `academics.css`、`honors.css`、`research.css`、`works.css`、`concerts.css`：页面专属规则。

页面专属 CSS 由对应的异步 page component 导入，使 Vite 能将其与页面 chunk 关联。现有 `content.css`、`media.css` 和 `works.css` 的规则按责任迁移，不做无证据的大规模 selector 重命名。

### 6. 媒体性能

- 专辑墙继续使用本地 JPG fallback + 640/1200 WebP srcset。
- 演唱会首屏继续使用 thumbnail，原图只在灯箱需要时加载。
- 所有媒体保留明确 width、height 或 aspect-ratio。
- 只对非首屏媒体使用 lazy loading；不盲目 preload 全部字体或原图。
- Lighthouse 增加移动端页面，覆盖图片密集的 Concerts 和组件密集的 Research/Works。

### 7. 可访问性与治理

新增或加强以下验证：

- WCAG 2.2 AA Focus Not Obscured：聚焦元素不得被 sticky header 或 Compass 完全遮挡。
- 触屏与桌面 target size 检查。
- light/dark、reduced motion、forced colors、键盘和 200% zoom 检查。
- 设计 token 对比度检查。
- `ASSET_RIGHTS.md` 记录专辑封面、演唱会海报、摄影图、OG 图和案例图的来源、授权状态、公开状态及 EXIF 检查结果。
- 不新增第三方 analytics、tracker 或 Cookie banner。

## 分阶段交付

### P0：系统收敛与低风险修正

修改 token、字体职责、字距、阅读宽度、静态卡片层级、PageCompass 视觉权重、Hero 高度和 Reveal 生命周期；补充对应的 Vitest、Playwright、axe 和资产审计记录。

P0 的 Lighthouse 第一阶段目标为：Desktop Performance ≥ 90、Mobile Performance ≥ 85、Accessibility ≥ 98、Best Practices ≥ 95、SEO ≥ 95、LCP ≤ 2.5s、TBT ≤ 300ms、CLS ≤ 0.10、INP ≤ 200ms。

### P1：CSS、媒体和质量矩阵

执行 CSS page-level code splitting、Pointer Sheen bounds caching、媒体加载审计、完整 Lighthouse URL 矩阵和 WCAG 2.2 自动回归。

### P2：封板与长期治理

完成 CSS dead selector 清理、未使用字体 weight 审计、CSP 可行性评估、截图回归矩阵、200% zoom、完整键盘/主题/减少动态效果 QA，并在实测稳定后将 Lighthouse 目标推进到 Desktop ≥ 95、Mobile ≥ 90、Accessibility 100、Best Practices 100、SEO 100、LCP ≤ 2.0s、CLS ≤ 0.05、INP ≤ 150ms。

## 文件边界

预计会修改：

- `src/theme.css`
- `src/styles.css` 及 `src/styles/*.css`
- `src/directives/reveal.ts`
- `src/directives/pointerSheen.ts`
- `src/pages/*.vue` 的样式导入
- `src/components/PageCompass.vue` 或其样式
- `.lighthouserc.json`、必要时新增移动端 Lighthouse 配置
- `package.json`
- `tests/**/*.test.ts`、`tests/e2e/*.spec.ts`
- `.github/workflows/pages.yml`（仅在命令或矩阵需要调整时）
- `ASSET_RIGHTS.md`

不会修改：

- `src/data/*.ts` 中的个人内容和文字信息
- `html-src/*.html` 中已有的页面文案和基本信息
- 现有专辑、演唱会、研究和作品资产来源

## 验收标准

1. `npm run lint`、`npm run typecheck`、`npm run deadcode`、`npm run unit`、`npm run build`、`npm run smoke` 均通过。
2. `npm run test:e2e` 在 Chromium、WebKit、Firefox 和 Android smoke 项目中通过。
3. 首页、学业、研究、作品、演唱会的 Desktop Lighthouse 检查通过；首页、研究、演唱会的 Mobile 检查通过。
4. 所有页面在 light/dark、reduced motion、forced colors、键盘和窄视口下保持内容可读和可操作。
5. 研究、作品、演唱会、专辑墙现有交互和深链接行为保持不变。
6. 生成的 `dist/` 不手工编辑，所有构建产物由脚本重新生成。
7. 工作区最终只包含本轮必要变更，并直接在 `main` 提交和 push，不创建 branch 或 PR。
