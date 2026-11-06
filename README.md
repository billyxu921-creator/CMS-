# 素材库交互原型 · Vite 静态项目

这是用于评审的纯前端原型，没有接口服务、数据库、SSR、登录服务器或云端文件存储。

## 项目文件

- `src/prototype.js`：现有业务与界面渲染逻辑，从原型 HTML 原样拆分。
- `src/styles.css`：现有样式，原样保留。
- `src/main.js`、`index.html`：Vite 入口。
- `vite.config.js`：相对资源路径、静态构建及行内事件兼容层。
- `scripts/inline-event-bridge.mjs`：让原有 `onclick`、`onchange` 等事件在模块打包后继续访问原状态与函数，不重写交互。
- `tests/interactions.cjs`：上传、勾选、字段切换、标签、版本、相似图片提醒、收集任务等回归检查。
- `public/_headers`：可选的静态缓存响应头示例，构建时复制到 dist。
- `netlify.toml`：Netlify 静态构建配置；无 Functions 配置。
- `.github/workflows/validate.yml`：Git 提交自动检查和构建；此工作流不负责发布。
- `DEPLOYMENT.md`：部署、稳定网址、路径和飞书内嵌说明。
- `dist/`：`npm run build` 生成的可发布文件；不要手动修改。

## 本地操作

推荐 Node.js 24；依赖版本由 `package-lock.json` 锁定。

```sh
npm ci
npm run dev
```

修改 `src/` 后，本地 Vite 会热更新或重新加载。构建及生产预览：

```sh
npm run build
npm run preview
```

预览需通过命令显示的 HTTP 地址打开。构建后的模块资源不要用 `file://.../dist/index.html` 双击打开验收。

## 持续迭代约定

以后以本项目的 `src/` 为唯一源码，不再编辑旧的多份 HTML 副本。改动后执行 `npm run build`，将源码推送到静态托管平台关联的同一 Git 分支。平台发布成功后，生产网址不变。

原型的素材、收集任务、访问密码、上传预览等仍是当前页面的内存演示数据；刷新后恢复初始状态，不会跨同事、浏览器或设备共享。文件读取和图片相似度比对在本地浏览器中进行。整理构建方式没有新增数据持久化或改变这些交互。

## 资源约定

新增界面图片等文件，优先放在 `src/assets/` 并通过 `import` 或 `new URL('./assets/example.png', import.meta.url)` 引用。不要写死 `/Users/...`、`file://...`、`localhost` 或根目录 `/assets/...`。

当前界面图标为内联 SVG，上传素材缩略图是浏览器创建的 `blob:` URL，不依赖外部图片服务器。用户上传图片不属于 dist 文件，刷新后失效是原有行为。

## 检查命令

```sh
npm run check       # 源码语法、全局事件桥接与原型逻辑回归
npm run check:dist  # 生产资源引用、文件存在性、JS 语法、根目录/子目录路径
```

`npm run build` 已串联上述检查。界面和原有脚本的迁移来源记录在 `scripts/migration-provenance.json`；没有为打包而重新设计页面。
