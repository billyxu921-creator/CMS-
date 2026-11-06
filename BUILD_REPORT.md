# 构建验收记录

日期：2026-11-05（Asia/Shanghai）

- Node.js：24.11.1；npm：11.6.2；Vite：8.3.6。
- `npm ci`：通过，按 package-lock.json 干净安装。
- `npm run build`：通过，无 SSR 或服务端构建。
- 源码及 CSS 与迁移前单文件 HTML 逐字节比对：一致。
- 上传、命名、勾选、按素材切换字段、标签、版本、相似度提示和收集任务回归：通过。
- 模块作用域与原行内事件兼容：通过，并在生产构建页面实际点击验证。
- dist 入口、JS、CSS 文件及引用检查：通过。
- HTTP 验证：域名根路径与 `/reviews/prototype/` 子目录入口、JS、CSS、`#agency` 均返回 200。
- 浏览器验收：实际打开 Vite 生产预览，默认“全部素材”正常，点击 Portfolio 素材组和“收素材”后弹窗正常。页面验收截图位于项目外的 `material-prototype-preview.png`。
- 目前未发布外部站点，未连接 Git 托管部署；未在真实飞书文档 iframe 中验收。

## 当前生产文件

- `dist/index.html`
- `dist/assets/index-B3TDkhxI.css`
- `dist/assets/index-BuLeFrCl.js`
- `dist/_headers`

业务源码不依赖构建后的具体 hash；后续改源码并构建时，Vite 会更新入口引用。
