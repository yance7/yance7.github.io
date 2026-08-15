# 视觉与交互精修设计规格

日期：2026-08-15  
范围：只优化美观与交互，不修改任何文字、内容数据、URL 或页面结构语义。

## 目标

在现有 Quiet Atelier / Editorial Archive 方向上做一轮克制的精修：让移动端首屏更安静，减少固定工具对内容的遮挡，并让键盘用户与专辑墙用户更清楚地感知当前状态。

## 当前证据

- 390 × 844 移动视口下，首页首个内容章节从约 700px 开始，固定底部 PageCompass 从约 774px 开始，章节标题和说明会被工具栏覆盖。
- PageCompass 在桌面端承担持续的章节导航职责，不能整体移除或改变为普通文档流元素。
- 专辑墙已有 `aria-selected`、键盘移动、快速选择令牌和同位淡入，但 spotlight 的 loading 状态缺少明确的视觉反馈。
- 现有卡片和按钮已经统一使用 `--motion-lift`、`--focus-ring`、`--motion-press-scale` 以及 reduced-motion 约束；本轮继续复用这些 token。

## 方案比较

### 方案 A：只增加底部安全间距

优点是改动很小；缺点是只保护页脚，无法解决首页首屏和滚动过程中的固定工具遮挡，视觉上也会留下不必要的首屏控制噪音。

### 方案 B：上下文出现的移动罗盘 + 状态精修（采用）

- 桌面端保持现有竖向罗盘常驻。
- 移动端在阅读进度尚未离开首屏时将罗盘置于 quiet 状态：不可点击、不可获得焦点、视觉上淡出；用户开始阅读后平滑出现。
- 继续保留页脚安全间距与 44px 触控目标，避免页面末端被浮层覆盖。
- 为专辑 spotlight loading 状态增加轻量的扫描/边缘反馈，保持当前封面同位显示，避免黑屏和布局跳动。
- 为专辑选中且获得键盘焦点的 tile 保留独立的 focus ring，避免选中边框覆盖键盘可见性。

### 方案 C：重做移动端导航和专辑墙布局

可以带来更明显的视觉变化，但会改变已有阅读节奏、导航认知和专辑墙的空间关系，超出本轮“细化优化”的风险边界。

## 详细设计

### 1. 移动 PageCompass

- 使用当前 `useScrollProgress()` 的进度值，在移动断点下以小于约 3% 的阅读进度作为 quiet 区间；桌面端不受影响。
- quiet 状态使用 `opacity`、`visibility`、`transform` 与 `pointer-events` 组合实现，不改变文档流尺寸。
- quiet 状态同步 `aria-hidden` 和 `inert`，避免隐藏的导航链接继续进入键盘焦点顺序。
- 进入/退出使用现有 `--dur-base` 与 `--ease-out`；reduced-motion 下取消过渡。
- 保留原有章节链接、当前章节、阅读进度、上一/下一章节和回到顶部行为。

### 2. 专辑墙状态反馈

- `.album-visual-slot[data-spotlight-state="loading"]` 显示轻量的边缘扫描层，不改变封面位置和尺寸。
- loading 期间继续保持上一张已显示封面，只有资源成功后才切换 displayed album。
- loading 反馈不依赖新增文字；error 状态只使用现有 danger token 做边缘提示，不改变已有错误处理逻辑。
- `.album-tile.selected:focus-visible` 叠加独立 focus ring，selected 的金色边框和键盘焦点都清晰可见。
- coarse pointer 不增加 hover 位移；reduced-motion 下扫描层、tile 过渡和 spotlight 过渡均停止。

### 3. 验收标准

- 移动端首页初始视口中，PageCompass 不遮挡首个内容章节；开始滚动后罗盘可见并可操作。
- 桌面端 PageCompass 的现有章节数量、当前状态、深链接定位和回到顶部行为不变。
- 触控目标仍至少 44px；窄屏无水平溢出。
- 专辑快速切换不出现黑屏，不提交过期选择；loading 期间有可见但克制的状态提示。
- 键盘 Tab / 方向键可清楚识别当前专辑 tile 的 focus 状态。
- `prefers-reduced-motion: reduce` 下无 reveal、位移、缩放或 loading 扫描动画。
- 不修改 `src/data/`、页面文案、HTML entry 内容、URL、`dist/` 或静态资源。

## 验证矩阵

- Playwright：390 × 844 首页初始罗盘遮挡回归、滚动后可见、桌面罗盘行为回归、专辑键盘选择与 loading 状态。
- Playwright：320 / 390 窄屏无水平溢出，axe 无新增违规。
- `npm run lint`
- `npm run typecheck`
- `npm run deadcode`
- `npm run unit`
- `npm run build`
- `npm run smoke`
- 完整 E2E 与构建预览的桌面/移动、亮色/暗色、reduced-motion 检查。
