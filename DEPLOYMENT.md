# 静态部署与飞书评审

## 1. 已有的构建结果

构建命令：`npm run build`。发布目录：`dist`。

产物只有 HTML、CSS、JavaScript 和可选静态响应头配置，没有后端、SSR 入口、Worker 或服务器运行要求。生产站点不需要执行 `npm run dev` 或 `npm run preview`；这两条命令只用于本地开发和验收。

部署时发布整个 dist 的**内容**，保证站点入口下有 `index.html` 和 `assets/`，不要只传 index.html，也不要把源码目录或 node_modules 当作发布目录。

## 2. base 与 404

`vite.config.js` 使用 `base: './'`，构建引用形如 `./assets/index-xxxx.js`。同一套 dist 可以放在域名根目录或子目录，例如：

- `https://review.example.com/`
- `https://review.example.com/material-prototype/`

子目录入口请以 `/` 结尾或显式访问 `index.html`，否则浏览器可能将相对资源定位到上一级目录。托管平台需把 `/material-prototype` 规范跳转到 `/material-prototype/`。

新增图片建议通过 Vite import 或 `new URL(..., import.meta.url)` 引用，避免写死根路径。打包脚本已经检查 index.html 中每个 JS/CSS 引用都能找到本地文件，并验证根目录和子目录解析。

## 3. 当前路由：无需生产重写

现在的页面切换是前端状态 `go(page)`；没有使用 `history.pushState`、React Router 或 Vue Router。访客入口保留 `#agency`。

因此当前只需正常提供入口页与静态资源。刷新 `/`、`/index.html`、`/#agency` 或 `/material-prototype/#agency` 不会把 hash 当成服务器路径。刷新会重置演示数据，这是原有行为；这里只保证入口可加载，不把演示任务变成持久化任务。

不要为了当前原型先新增 History 路由或全站重定向。

### 将来改为 History 路由时才使用

若以后需要 `/materials/123` 这类地址，必须一起调整 base 和托管回退：

- 根域部署：构建 `npm run build -- --base=/`。
- 子目录部署：构建 `npm run build -- --base=/material-prototype/`。
- 不要在多级 History 路由下继续依赖 `base: './'`，否则回退 HTML 后，JS/CSS 可能按错误的深层路径解析。

Netlify/兼容 `_redirects` 的平台可配置以下**200 重写**（不是 301/302 跳转），现有文件优先：

```text
/* /index.html 200
```

如果只托管在子目录，回退目标对应改为该子目录的 index.html。Nginx 根路径示例：

```nginx
location /assets/ { try_files $uri =404; }
location / { try_files $uri $uri/ /index.html; }
```

这些是未来切换 History 的配置示例，当前项目没有启用它们。

## 4. 保持同一个网址、源码推送后自动发布

建议将**本项目目录的内容**单独放进一个 Git 仓库，再连接支持 Git 自动部署的静态平台。不要每次都创建一个新站点。

Cloudflare Pages 或 Netlify 可使用：

| 配置 | 值 |
| --- | --- |
| 项目根目录 | 本项目目录，独立仓库时为仓库根目录 |
| Node.js | 24 |
| 生产分支 | main，或团队指定的固定分支 |
| 安装依赖 | npm ci；平台自动安装时保留其默认 npm 安装流程 |
| 构建命令 | npm run build |
| 发布目录 | dist |
| 应用类型 | 静态站点 / Vite；不要选择 SSR 模板 |

如果把整个当前工作目录推送到仓库，则平台的根目录应设为 `outputs/material-prototype`。附带 GitHub Actions 默认按独立仓库运行；采用大仓库结构时还需设置 `working-directory` 和 lockfile 路径。

项目已带 Netlify 配置；Cloudflare Pages 可在站点设置中录入同样的构建命令与发布目录。首次连接仓库后，提交到生产分支会触发构建并更新**同一个生产网址**。不要把每次构建产生的临时预览地址放进飞书。

当前尚未连接任何托管账号或仓库，也没有发布到互联网；自动发布需在选择平台并完成首次 Git 连接后生效。

“自动更新线上版本”表示成功部署后原网址提供新文件，不代表已打开的页面会像开发环境一样热替换内存状态。同事已打开的网页或飞书嵌入区，部署后需刷新或重新打开。

## 5. 避免更新后还看到旧版本

JS/CSS 文件名由 Vite 按内容生成 hash。`public/_headers` 提供 HTML 每次校验缓存、hash 资源长期缓存的示例。

`_headers` 仅对支持该格式的托管平台有效；Nginx、对象存储或 CDN 需要设置等价规则。如果部署在子目录，响应头规则也应按实际挂载路径设置。

部署应尽量原子替换整套 dist；上传一半就切换 index.html 可能导致新 index 引用尚未上传的资源。不要设置 Service Worker 或额外离线缓存，本项目没有引入它们。

## 6. 放进飞书文档前的验收

先获取同事可以访问的固定 **HTTPS 生产网址**。`file://` 和 `localhost` 只属于当前电脑，不能作为团队内嵌地址。

随后在团队实际使用的飞书文档入口中尝试内嵌/网页预览。任意第三方网址是否能完整内嵌，取决于飞书当前入口、租户能力及浏览器策略，不能仅凭本地打包就保证。

托管响应头不能用 `X-Frame-Options: DENY` 或仅允许同源的 `SAMEORIGIN` 阻止飞书加载。如果配置了 CSP `frame-ancestors`，应允许真实飞书父页面及嵌套祖先的域名；这是 HTTP 响应头配置，不能用 HTML meta 代替。飞书的网页预览插件文档给出过 `https://*.feishupkg.com` 和 `https://*.feishu.cn`，实际飞书文档嵌入仍需按所用入口验收。

原型保留行内事件以维持交互；托管平台若额外强制阻止行内事件的脚本 CSP，也会让按钮失效。当前没有附加这类 CSP。嵌入时还应检查文件选择、弹窗、剪贴板复制是否受 iframe sandbox 或浏览器权限限制。

至少检查：默认全部素材、左侧导航、收素材弹窗、上传文件选择、命名、识别、标签、勾选、相似图片确认、入库成功。生产内嵌未验收前，不应宣称已兼容所有飞书环境。

## 7. 官方参考

- [Vite：静态部署、dist 与预览](https://vite.dev/guide/static-deploy.html)
- [Vite：base 支持相对路径](https://vite.dev/config/shared-options.html#base)
- [Cloudflare Pages：Git 自动部署](https://developers.cloudflare.com/pages/configuration/git-integration/)
- [Cloudflare Pages：静态响应头](https://developers.cloudflare.com/pages/configuration/headers/)
- [Netlify：文件式构建配置](https://docs.netlify.com/build/configure-builds/file-based-configuration/)
- [MDN：frame-ancestors 的作用及不能用于 meta 的限制](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors)
- [飞书：网页预览插件和内嵌域名说明](https://www.feishu.cn/hc/zh-CN/articles/788010002801-%E4%BD%BF%E7%94%A8%E5%A4%9A%E7%BB%B4%E8%A1%A8%E6%A0%BC%E7%BD%91%E9%A1%B5%E9%A2%84%E8%A7%88%E6%8F%92%E4%BB%B6)
- [飞书：HTML 预览与长期分享的不同方式](https://www.feishu.cn/content/article/7652603741358590921)
