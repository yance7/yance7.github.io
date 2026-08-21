# Yance · Personal Archive

Vue 3 + Vite MPA，部署目标为 GitHub Pages。

## 本地检查

```bash
npm ci
npm run check
npm run test:e2e
npm run links
```

`npm run check` 会依次执行 ESLint、TypeScript/Vue 类型检查、死代码检查、Vitest、sitemap、生产构建和 smoke 检查。浏览器测试首次运行前需要安装 Playwright 浏览器：

```bash
npx playwright install --with-deps chromium webkit firefox
```

## 海报缩略图

缩略图脚本继续使用 Python/Pillow，支持 JPG、JPEG 和 PNG 输入。首次运行前安装工具依赖：

```bash
python -m pip install -r requirements-tools.txt
npm run images:concerts
```

发布前资源审计（只读，不会改写图片）：

```bash
npm run audit:assets
```

该命令检查图片格式、尺寸、可解码性和 EXIF GPS；出现 GPS 元数据或不可读文件时返回非零。版权与授权状态仍以 `ASSET_RIGHTS.md` 的人工确认记录为准。

## Core Web Vitals 目标

持续集成以 `.lighthouserc.json` 和 `.lighthouserc.mobile.json` 中的预算作为上线门槛：桌面 Performance ≥ 90、移动 Performance ≥ 85，Accessibility ≥ 98、Best Practices ≥ 95、SEO ≥ 95，LCP ≤ 2.5s、TBT ≤ 300ms、CLS ≤ 0.1、INP ≤ 200ms。运行 `npm run lighthouse` 会在本地预览构建上分别执行三轮桌面与移动采样；TBT 是实验室主线程阻塞指标，INP 是交互响应的 Core Web Vital，两者关注点不同。
