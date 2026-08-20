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

## Core Web Vitals 目标

持续集成以 `.lighthouserc.json` 中的预算作为上线门槛：Performance ≥ 70、Accessibility ≥ 95、Best Practices ≥ 95、SEO ≥ 95、LCP ≤ 2.5s、TBT ≤ 300ms、CLS ≤ 0.1。运行 `npm run lighthouse` 可在本地预览构建上执行三轮桌面采样。
