# Yance · Personal Archive

Vue 3 + Vite MPA，部署目标为 GitHub Pages。

## 本地检查

```bash
npm ci
npm run lint
npm run typecheck
npm run unit
npm run build
npm run sitemap
npm run smoke
npm run test:e2e
```

端到端测试需要 Playwright Chromium：

```bash
npx playwright install chromium
```

## 海报缩略图

缩略图脚本继续使用 Python/Pillow，支持 JPG、JPEG 和 PNG 输入。首次运行前安装工具依赖：

```bash
python -m pip install -r requirements-tools.txt
npm run images:concerts
```

## Core Web Vitals 目标

持续集成以以下目标作为上线门槛：Performance ≥ 90、Accessibility ≥ 95、SEO ≥ 95、LCP ≤ 2.5s、CLS ≤ 0.1。当前 CI 负责静态、类型、单元、构建、smoke 与浏览器/axe 回归；Lighthouse 分数应在发布前用真实部署环境采样记录。
