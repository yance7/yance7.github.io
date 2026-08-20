# 全站封板级精修设计规格

日期：2026-08-20
范围：全站 UI、动画逻辑、交互状态、响应式布局、相关代码逻辑与注释

## 目标

在保留现有 Quiet Atelier / Editorial Archive 视觉身份的前提下，完成发布封板级精修：统一排版、空间、动效与交互反馈；修复移动端中文标题孤字换行和深层内容遮挡感；收敛高风险交互逻辑和重复样式；以桌面、平板、手机、横屏、触控、键盘和辅助功能矩阵证明最终状态。

本轮不是视觉重做。暖白纸与深空蓝黑主题、金色与青色强调、网格与 grain 材质、首页编辑舞台、档案编号、章节罗盘、研究时间轴、作品 dossier、演唱会海报和专辑墙继续构成同一套个人档案语言。

## 当前证据

代码与 18 张桌面、移动、亮色、暗色截图审计给出以下结论：

- 当前设计身份已经成立，不需要更换字体、配色、页面结构或视觉方向。
- 移动端部分 Archive Hero 会把一个汉字留在独立末行，例如演唱会标题末尾的“外”；SectionHeading 的强调短语也可能出现单字尾行。
- 首页与 Archive Hero 的纵向节奏在不同视口高度下不完全一致；宽屏可接受，但手机和矮屏需要更稳定的内容起点。
- 移动端 PageCompass 已有 quiet / reading / visible 状态，但在深层内容停下后仍会形成较强覆盖感，需要进一步压缩几何体而不牺牲 44px 触控面积。
- `AlbumWall.vue` 共 874 行，其中脚本约 122 行，主要体积来自组件局部样式；强制拆分组件会增加 props、emit、焦点和 DOM ref 通信成本，不符合本轮风险边界。
- 专辑网格键盘导航仍与组件 DOM 逻辑耦合，适合抽成纯函数并补充边界测试。
- AlbumWall 存在两组 reduced-motion 规则，可合并；全站部分持续 pulse / breathe 动画可以进一步收敛。
- 现有事件监听、观察器、定时器和 RAF 基本都有卸载清理；当前基线通过 typecheck、dead-code、28 个单元测试和生产构建。

## 设计原则

### 1. 保留身份，只校准精度

不新增视觉装饰，不替换主题，不引入新的主色。全站记忆点继续是“档案坐标”：网格底纹、金色叙事线、青色技术标签和中文衬线标题。新增规则必须改善层级、方向或状态，不承担纯装饰作用。

### 2. 排版优先于动画

中文标题的分行、正文阅读宽度、章节起点和控件密度先稳定，再判断动效是否仍有必要。任何动画都不能修饰一个本来不稳定的布局。

### 3. 一个时刻只有一个主要动效

Hero 字符入场和主题扩散保留为主要编排动效。滚动中的 reveal、当前位置反馈、加载反馈和 hover 只提供局部信息，不能同时形成多个持续视觉焦点。

### 4. 同一状态在所有输入方式下等价

鼠标 hover、键盘 focus、触控 pressed、加载、错误、选中和禁用状态共享同一套语义 token；差异只来自输入能力，不来自视觉优先级。触控设备不模拟 hover，reduced-motion 不删除内容或状态。

## UI 与排版设计

### 中文标题换行

- `.hero-title` 与 `.section-head h2` 使用平衡换行和严格中文断行。
- 在支持 `word-break: auto-phrase` 的浏览器中启用短语级断行；不支持时依靠 `text-wrap: balance`、现有字符节点和响应式字号回退。
- Archive Hero 继续保留逐字符 span 和入场动画，不更改可访问标题；只调整换行算法与移动端字号上限。
- SectionHeading 的短强调语作为完整语义单元，避免强调部分最后一个汉字独占一行；在极窄屏仍允许整段强调语换到下一行，不能产生横向溢出。
- 320–414px 下 Hero 目标为 2–3 个视觉均衡行；不以压缩字距、改变字重或缩小到影响识别为代价。

### 纵向节奏

- 在全局 token 中定义 Hero、章节、卡片组和窄屏内容的流体间距，替代多个页面各自累加的近似值。
- 桌面端保留宽松编辑舞台；手机端缩短导航之后的无信息空白，使 kicker、标题和正文更早建立阅读关系。
- 矮屏横屏单独降低 Hero 最小高度和上下 padding，避免必须滚动后才能看见标题或首个动作。
- SectionHeading 与首个内容块的距离在所有页面统一；页面内部仍可通过现有 minor 变体表达层级。

### 文字重量与对比

- 不替换 Inter、Noto Sans SC、Noto Serif SC 和 IBM Plex Mono。
- 移动端长正文保持当前字号范围，但将过细的视觉重量校准到稳定阅读值；技术标签和装饰文字继续保持较轻层级。
- 所有颜色继续来自主题语义 token；不得为单页写新的亮色 / 暗色硬编码文本颜色。

### 移动端导航与罗盘

- SiteHeader 保留主题切换和菜单按钮的 44px 以上目标，优化视觉边界、间距和矮屏占用，不改变焦点陷阱、Escape、滚动锁和焦点恢复。
- PageCompass 的状态优先级保持：内部焦点 > 桌面常驻 > 移动顶部 quiet > 下滑 reading > 上滑或停止 visible。
- 移动 visible 状态压缩非交互留白、边框和标签区域；进度、章节入口和上一 / 下一章仍保持至少 44px。
- 不通过缩小点击区域换取紧凑；340px 及以下优先隐藏当前章节文字，保留进度与章节控制。
- 页脚继续保留安全区，动态浏览器工具栏与 `env(safe-area-inset-bottom)` 不得遮住最后一段内容。

## 动画与交互设计

### 动效层级

沿用现有时长，并明确用途：

- 120ms：按压与即时图标反馈。
- 200ms：hover、focus、边框、颜色和局部 opacity。
- 320ms：过滤、菜单、罗盘显隐和同位状态切换。
- 600ms：章节 reveal 与 Hero 字符编排。
- 720ms：主题扩散等页面氛围变化。

禁止 `transition: all`。位移仍不超过 3px，图标不超过 4px，媒体缩放不超过 1.03，按压使用 `scale(.985)`。

### 持续动画收敛

- 保留真正表达“在线”“当前阅读项”或“加载中”的持续状态动画。
- 同一视口中不让多个普通装饰点同时 pulse / breathe。
- timeline 当前节点的状态必须在取消呼吸动画后仍可通过颜色、边框和静态光晕识别。
- loading 扫描只在资源确实等待期间出现，结束或失败后立即停止。

### 输入能力与降级

- tilt、pointer sheen 和 magnetic 只在 `(hover: hover) and (pointer: fine)` 且未请求 reduced-motion 时工作。
- pointer move 的布局读取与样式写入继续合并在单帧调度内，离开、取消和卸载时清理 RAF。
- coarse pointer 下 hover 不改变 transform、shadow、媒体比例或隐藏信息。
- reduced-motion 下取消 reveal、位移、缩放、扫描、主题扩散和字符入场；所有内容立即可见，状态语义保持不变。
- forced-colors 下边框、outline、当前项和禁用态不能只依赖阴影或色相。

### 交互状态

- 所有可操作卡片、按钮和链接有独立 `:focus-visible`，不会被 selected 或 hover 样式覆盖。
- hover 不改变字重、字距、元素尺寸或文字换行。
- loading 与 error 不改变媒体容器尺寸；专辑切换期间保留已解码画面，不出现黑屏。
- 快速专辑选择继续使用最新请求令牌：旧请求完成后不得覆盖最新 selected / displayed 状态。
- 图片灯箱、移动菜单和复制状态继续保留焦点恢复、inert、ARIA 与滚动锁；本轮只统一视觉和边界行为。

## 代码结构与逻辑

### AlbumWall 边界

`AlbumWall.vue` 继续作为专辑墙唯一编排组件，负责数据、spotlight 状态、DOM refs、ARIA live 和模板关系。其脚本职责集中，不拆成需要跨组件传递 42 个按钮 ref、键盘焦点和异步选择状态的子组件。

新增 `src/utils/albumNavigation.ts`，提供纯函数：

```ts
export interface AlbumNavigationInput {
  key: string
  index: number
  total: number
  columns: number
}

export function getAlbumNavigationIndex(input: AlbumNavigationInput): number | null
```

函数只计算 ArrowLeft、ArrowRight、ArrowUp、ArrowDown、Home、End 的目标索引并钳制到有效范围；Enter、Space 和其他按键返回 `null`，仍由组件负责选择与阻止默认行为。该函数必须覆盖空集合、单项、首尾、列数变化和越界输入。

### 样式收敛

- 合并 AlbumWall 重复的 reduced-motion 规则。
- 保留组件局部样式，不为了减少文件行数把强相关样式搬到全局。
- 全局响应式规则继续集中在 `responsive.css`；组件私有断点留在组件内。
- 新的排版与空间 token 放在 `theme.css`，页面样式只消费 token，不复制数值。
- 删除失效、被后续规则完全覆盖或仅重复默认值的选择器。

### 注释规范

只为无法从代码直接看出的不变量添加注释：

- 最新异步请求令牌为什么能阻止旧选择回写。
- pointer 动画为什么在 RAF 内同时读取布局与写入变量。
- PageCompass 状态优先级与焦点可见性为什么不能交换。
- hash 初始定位与异步页面加载之间的顺序约束。

删除“更柔和”“像苹果”“丝滑”等主观注释；不为变量名、简单条件和模板结构增加逐行说明。

## 数据流与错误处理

- 页面内容、URL、章节 ID、外链、图片和数据模块保持不变。
- 异步页面加载继续最多重试两次，失败时进入受控错误组件，不产生刷新循环。
- 专辑封面预加载失败时保留稳定容器和 error 状态，快速选择只提交最新请求。
- 图片灯箱加载失败继续提供重试与关闭路径；背景 inert 和滚动锁必须在关闭完成后解除。
- 所有事件监听、观察器、定时器和 RAF 在组件卸载时清理。

## 响应式与浏览器矩阵

### 必测视口

- 手机竖屏：320×568、360×800、390×844、414×896。
- 手机横屏：844×390，并覆盖不高于 520px 的矮屏规则。
- 平板：768×1024、820×1180、1024×768。
- 桌面：1280×800、1440×900、1440×1000。

### 必测浏览器与能力

- Chromium 桌面主流程与 fine-pointer 动效。
- WebKit 手机布局、安全区、菜单、灯箱和专辑墙。
- Firefox 桌面章节导航、主题与基本交互。
- Chromium Android 触控与横竖屏烟雾检查。
- 亮色、暗色、reduced-motion、forced-colors、键盘和 coarse pointer。

### 几何验收

- 所有页面 `scrollWidth <= clientWidth`。
- 关键触控目标至少 44×44 CSS px。
- 锚点落点位于 sticky header 下方至少 12px。
- 移动 Hero 和 SectionHeading 不出现只有一个汉字的末行。
- PageCompass、移动菜单、灯箱和 sticky header 不覆盖当前焦点或不可恢复地遮挡内容。
- 字体加载前后不改变控件可操作性，不因 hover / focus 产生换行或布局跳动。

## 测试策略

### 单元测试

- 为专辑键盘导航纯函数新增边界测试。
- 保留 PageCompass 状态、滚动进度、异步图片预载和页面注册表测试。
- 对修改过的异步与导航逻辑执行失败测试，再实现通过。

### E2E

- 扩展所有页面多宽度无溢出矩阵。
- 使用字符 span 的 `getBoundingClientRect().top` 分组，断言 Archive Hero 每一视觉行至少包含两个字符。
- 断言 SectionHeading `.accent` 在窄屏不会拆成多段 client rect 或超出视口。
- 验证移动 PageCompass quiet / reading / visible、焦点保持、停止滚动恢复和矮屏布局。
- 验证 hover / focus 不改变标题和 wordmark 的字号、字重、字距与换行。
- 验证 reduced-motion 下 reveal 立即可见、transform 静止、持续动画停止。
- 验证 7 个页面没有 `console.error`、未处理 `pageerror`、横向溢出或 axe 新违规。

### 发布门禁

- `npm run lint`
- `npm run typecheck`
- `npm run deadcode`
- `npm run unit`
- `npm run sitemap`
- `npm run build`
- `npm run smoke`
- `npm run links`
- `npm run lighthouse`
- `CI=1 npm run test:e2e -- --workers=2`

Lighthouse 质量预算以 GitHub Actions 的 Linux 结果为最终依据。如果 Windows 本地运行已生成并通过全部报告、唯一失败发生在 Chrome Launcher 清理阶段的 `EPERM`，记录该环境错误后继续远程验证；任何性能、可访问性、最佳实践或 SEO 阈值失败仍然阻断发布。

本地可执行门禁通过后直接提交并推送 `main`，不创建分支或 PR；确认 GitHub Actions build、Lighthouse、Browser/axe、artifact upload 与 Pages deploy 全部成功。

## 非目标

- 不更换字体、主题、主色、品牌名称或页面信息架构。
- 不修改展示文案、内容数据、项目 URL、章节 ID 或外部链接。
- 不新增运行时依赖、第三方动画库、客户端路由或在线图片热链。
- 不为减少行数进行无收益的大规模组件拆分。
- 不手工编辑或提交 `dist/`、测试截图、Lighthouse 输出和 Playwright 输出。

## 完成定义

只有在以下条件同时成立时才可称为封板完成：

1. 上述 UI、排版、动画、交互、逻辑和注释约束全部落实到源码。
2. 所有必测视口、浏览器、主题和输入能力获得自动化或截图证据。
3. 没有孤字标题、水平溢出、低于 44px 的关键触控目标、锚点遮挡、焦点丢失、动画降级缺口或异步旧状态回写。
4. 本地全部发布门禁通过，工作区只包含本次预期文件。
5. `main` 推送成功，GitHub Pages 工作流和线上部署成功。
