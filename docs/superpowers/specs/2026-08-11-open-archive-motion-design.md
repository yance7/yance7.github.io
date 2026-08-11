# OPEN ARCHIVE 首页与全站交互设计规格

## Goal

把首页从“歌词轮转 + LIVE INDEX”重构为一个清晰、可主动探索的 `OPEN ARCHIVE` 首屏，并为全站卡片、按钮、主题和过渡建立一致的交互规则；同时移除 Works 页 FreshEye 与 Encore 的悬浮加粗效果。

## Scope and non-goals

- 首页不再渲染 `LyricCarousel`、`SONG NOTES` 或 `LIVE INDEX`。
- 现有研究、作品、学业、荣誉、演唱会事实文案和 URL 保持不变，不新增未经确认的个人经历。
- 不新增图片、视频、音频、第三方运行时依赖、持续粒子或鼠标跟随效果。
- Concerts 专辑墙、海报轮播和灯箱继续使用现有实现；本次只统一它们可见的交互节奏和主题 token，不改变数据行为。

## Visual direction: OPEN ARCHIVE

首页首屏是一个“个人档案索引”，不是自动播放的内容轮播。顶部保留 `PERSONAL ARCHIVE / BEIJING · 2026`，主区域用稳定的大型身份层级表达 `RESEARCHER / BUILDER / MUSIC LISTENER`，右侧或下方显示三个可主动选择的档案路径：`RESEARCH`、`BUILD`、`LIVE`。

默认路径为 Research。选择路径后，当前路径卡片、档案编号、摘要、数据标签和行动链接同步更新。右侧预览使用 CSS 线条、编号、网格和状态条表达“档案被打开”的感觉，不使用假图片或持续动画。音乐只保留为页面气质和 `MUSIC LISTENER` 身份层，不再承担自动叙事。

桌面端采用主标题/档案预览双栏布局；平板端改为上下结构；手机端把三个路径变成完整宽度的可聚焦卡片。首屏进入动画按“眉题 → 身份层 → 档案路径 → 行动按钮”顺序执行一次，页面稳定后不再自动运动。

## Component and state design

新建 `src/components/HomeArchiveIndex.vue`，由 `HomeHero.vue` 负责布局和传入 `kicker`、`copy`，组件从现有 `homeSignals` 派生三条路径。组件内部只维护 `activeIndex`，不写入全局状态。

每条路径使用 `button` 作为选择控制，外层为 `role="tablist"`，按钮为 `role="tab"`，预览区为对应 `role="tabpanel"`。键盘支持 `ArrowUp`、`ArrowDown`、`Home`、`End`、`Enter`、`Space`；当前按钮拥有 `aria-selected` 和 roving `tabindex`。预览中的页面入口仍使用普通链接，外链保持安全 `rel` 属性。

## Interaction system

所有可交互表面遵循同一个状态节奏：

1. 默认态：保留清晰边界和内容层级，不使用无意义闪烁。
2. 精确指针悬浮/键盘聚焦：最多 `translateY(-3px)`，边框混合当前 accent，阴影增加一层，箭头最多移动 4px。
3. 按下：`scale(.985)` 或 `translateY(1px)`，不改变文字字重。

悬浮规则只放在 `@media (hover: hover) and (pointer: fine)` 内；键盘 `:focus-visible` 与悬浮共享边界和阴影反馈。可点击卡片使用同一组 easing 和 duration token；非交互文章卡不伪装成链接。展开、灯箱、轮播和主题切换只做必要的透明度、尺寸或颜色过渡。

## Theme and motion contract

- 亮色：暖白纸面、青绿色信息色、金色行动色，降低大面积阴影浓度，增强细边界。
- 暗色：深蓝黑背景、低透明度表面、金色和青色边界，保证标题与控件对比度。
- 颜色变化使用现有主题 token，不在组件中硬编码第二套颜色。
- `prefers-reduced-motion: reduce` 时取消揭示位移、卡片位移、路径预览位移和页面进入动画；所有内容立即可用。
- 不添加自动轮播、不播放音频、不使用持续旋转。

## Works change

删除 `.showcase:hover .sc-wordmark` 和 `.sc-wordmark` 的字重/字距过渡。FreshEye 与 Encore 保留卡片边框、阴影、章节箭头和按钮反馈，但悬浮前后字体计算值必须一致。

## Verification contract

- 首页 DOM 不再包含 `.lyric-carousel`、`.home-signal` 或 `LIVE INDEX`。
- 首页拥有三条档案路径，默认 Research；点击和键盘切换时 active path、预览标题、编号、摘要和链接同步。
- 1440、1024、768、390、320px 均无横向溢出；亮色、暗色和 reduced-motion 均可操作。
- 全站卡片 hover/focus 不出现字体加粗变化；按钮最小触控区为 44px。
- 现有全站页面、Concerts 专辑墙/海报灯箱、axe 审计和部署 smoke test 继续通过。
