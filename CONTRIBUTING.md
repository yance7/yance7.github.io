# 贡献指南

感谢关注这个个人档案网站。本项目用于整理学术、研究、作品与现场记忆，贡献应保持内容准确、范围清晰，并尊重媒体资源的授权与隐私边界。

## 环境与开发

环境要求：

- Node.js >= 22.12.0
- npm >= 10.9.0
- Python 工具依赖来自 `requirements-tools.txt`

常用命令：

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

## 分支与提交

分支命名格式为：

```text
codex/<type>/<short-kebab-topic>
```

`type` 允许使用：

- `feat`
- `fix`
- `refactor`
- `chore`
- `docs`
- `test`

提交信息使用简洁的中文动作动词开头，例如：

- `新增`
- `修复`
- `优化`
- `重构`
- `更新`
- `移除`
- `集成`

## Pull Request

- 一个 PR 只包含一个逻辑变更。
- UI 修改必须提供前后截图。
- 必须说明验证过的页面、主题和设备。
- 修改 Vue 或数据文件前运行 `npm run typecheck`。
- 提交前运行 `npm run check`。
- UI 修改运行匹配的 Playwright 测试。
- 禁止提交 `dist/` 和本地测试产物。
- 媒体资源必须核验授权、隐私与元数据。
- 不得提交内部协作资料。

请在 PR 描述中说明变更范围、验证命令、未覆盖的风险，以及是否涉及内容或媒体资源。
