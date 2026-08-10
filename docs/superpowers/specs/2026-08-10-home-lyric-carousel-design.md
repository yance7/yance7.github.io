# 首页歌词轮播设计

## 目标

把首页的静态主标语改成一个可阅读、可暂停、可手动浏览的音乐索引，同时恢复左上角与页面底部左侧的 `Yance.` 视觉锚点。首页的单一任务仍然是让访客理解“这是一个研究、作品与现场记忆的个人档案”，歌词轮播负责表达这个人的情绪入口，不取代研究与作品导航。

## 设计方向

- **主体**：面向第一次访问个人档案的访客；页面需要先建立气质，再给出研究、作品与现场内容的入口。
- **视觉签名**：`SONG NOTES` 歌词卡片。歌词以大号衬线体作为主视觉，歌手/歌曲以 IBM Plex Mono 作为索引标签，右侧保留现有 `LIVE INDEX` 档案板，形成“音乐索引 → 内容索引”的关系。
- **色彩**：沿用现有 `--gold`、`--aqua`、`--control-*` 与 `--card-hover`，浅色主题保持纸张与墨色的对比，深色主题保持深空蓝黑与暖金。轮播不新增渐变扫光、背景视频或卡片光波。
- **字体**：歌词使用 `Noto Serif SC Variable`，歌手、歌曲、编号、状态使用 `IBM Plex Mono`，说明文字使用 `Noto Sans SC Variable`。
- **布局**：桌面端左侧为歌词卡片，右侧为 `LIVE INDEX`；移动端自然堆叠为歌词、控制条、档案索引。左上 `Yance.` 与左下 `Yance.` 使用同一 wordmark 语言，但尺寸和辅助信息不同。

```text
[ Yance. ]                         [ theme ] [ menu ]

PERSONAL ARCHIVE / BEIJING · 2026          LIVE INDEX
SONG NOTES 01 / 08                          SELECTED RESEARCH
                                            LIVE PRODUCTS
“家是唯一的城堡”                          FIELD NOTES
周杰伦 / 稻香
[上一句] [暂停] [下一句]   01 02 03 ... 08
这里收录研究、已上线的作品，以及被音乐和现场照亮的生活切片。

...精选内容...
[ Yance. / PERSONAL ARCHIVE ]
```

## 歌词内容

使用 8 条短句，每条只显示一个可独立阅读的片段，并展示歌手与歌曲来源：周杰伦《稻香》、林俊杰《明日坐标》、邓紫棋《光年之外》、汪苏泷《慢慢懂》、薛之谦《天外来物》、张杰《最美的太阳》、王力宏《改变自己》、陶喆《就是爱你》。不在页面中展开或连续显示完整歌词。

## 交互契约

- 默认每 6 秒切换一次；切换通过 Vue transition 完成，使用短距离纵向位移与透明度，不使用扫光。
- 鼠标悬停、键盘焦点进入或页面不可见时暂停计时；离开/失焦/回到页面后恢复。
- 提供上一句、暂停/继续、下一句和圆点导航；圆点带有当前状态，所有按钮有清晰的 `aria-label`。
- 轮播容器支持 `ArrowLeft`、`ArrowRight`、`Home`、`End` 与空格键；手动切换会重置计时器。
- `prefers-reduced-motion: reduce` 下停留在第一条，不自动轮播，仍保留手动浏览能力。
- 组件状态通过 `data-index` 暴露给端到端测试；源数据保持在 `src/data/site.ts`，轮播行为封装在独立的 `LyricCarousel.vue`。

## 验收标准

1. 首页左上与底部左侧都能看到 `Yance.`，并且链接回 `index.html` 或保留现有页脚品牌语义。
2. 首页不再渲染旧的 `.home-statement`/大号静态主标语，而是渲染 `.lyric-carousel`。
3. 自动切换、手动按钮、键盘导航、暂停/继续、焦点/悬停暂停和 reduced motion 均有可重复的端到端验证。
4. 轮播在 320px、390px、桌面宽度以及浅色/深色主题下无横向溢出，焦点可见，axe 审计无新增问题。
5. `npm run typecheck`、`npm run lint`、`npm run unit`、`npm run build`、`npm run smoke` 与完整 Playwright 套件通过。
