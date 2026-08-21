# 安全与隐私决策记录

更新时间：2026-08-21

## 当前 CSP

所有 `html-src/*.html` 入口都使用同一组 meta CSP：

```text
default-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'; script-src 'self' '__THEME_BOOTSTRAP_HASH__'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; media-src 'self'; connect-src 'self'; manifest-src 'self'
```

- `script-src` 只允许同源脚本和由构建插件替换的 `__THEME_BOOTSTRAP_HASH__`，主题初始化脚本不会依赖 `unsafe-inline`。
- `style-src 'unsafe-inline'` 暂时保留，因为 Vue 组件会为指针光泽、进度和媒体状态写入元素级 CSS custom properties；GitHub Pages 不能提供可配置的 HTTP nonce header。
- 收紧 `style-src` 前，必须先把这些动态值迁移到可审计的 class/stylesheet 或完成 nonce/hash 方案，并重新运行所有页面的主题、交互和 CSP 检查。
- `img-src` 的 `data:` 仅服务于现有本地图像占位/媒体流程；没有远程图像域名白名单。

## 隐私与真实用户监测

本项目决定不接入第三方 analytics、tracker、广告脚本、RUM 上报或 Cookie banner。当前浏览器持久化状态只有 `yance-theme` 主题偏好；`connect-src` 保持同源，站点不向外部端点发送访问数据。

因此，Core Web Vitals 目前通过本地/CI Lighthouse 实验室采样和 Playwright 回归验证，而不是通过新增跟踪器获取真实用户数据。若未来需要真实用户监测，必须先单独确认数据字段、同意机制、保留期限、供应商和隐私政策，再修改 CSP 与发布清单。

## 发布审计入口

每次发布前执行：

```bash
npm run audit:assets
```

命令只读扫描 `public/assets` 的格式、尺寸、EXIF GPS 和可解码性；出现 GPS 元数据或不可读文件时，命令返回非零并阻断发布。版权、肖像、演出海报和第三方封面授权仍以 `ASSET_RIGHTS.md` 中的人工确认状态为准。
