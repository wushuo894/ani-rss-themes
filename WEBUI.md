# ani-rss 替代 WebUI

给 [ani-rss](https://github.com/wushuo894/ani-rss) 做的两套完整前端，整个替换掉自带界面 —— 不是换肤。

上游在 `test` 分支（2026-08-19，commit `a79d482`）加了「备用 webui」：把文件放进 `{configDir}/webui/`，
后端就优先从那里取静态资源。这两套就是给那个目录用的。

| | webui-vt | webui-qb |
| --- | --- | --- |
| 参照 | [VueTorrent](https://github.com/VueTorrent/VueTorrent) | [qb-web](https://github.com/CzBiX/qb-web) |
| 首页 | 总览（指标卡 + 最近更新 + 下载中 + 疑似停更） | 直接是订阅列表，打开就干活 |
| 订阅主视图 | 海报网格，可切列表 | 紧凑表格，自带多选 |
| 密度 | 舒适 | 紧凑 |
| 导航 | 左侧抽屉，桌面端可收成图标条 | 顶栏通栏 + 抽屉（lg 以上常驻） |
| 配色 | Element Plus 蓝，过渡不突兀 | Vuetify 经典蓝，表格衬底更冷 |

两套共用同一套接口层、状态层和弹窗，差别只在布局语言和密度。

## 安装

```bash
cd webui-vt        # 或 webui-qb
npm install
npm run build
```

把 `dist/` 里的**内容**（不是 `dist` 目录本身）复制到 ani-rss 的配置目录下的 `webui/`：

```
{configDir}/webui/
├── index.html
└── assets/
```

`{configDir}` 的确定顺序（`ConfigUtil.getConfigDir()`）：环境变量 `CONFIG` → 当前工作目录下的 `config/` →
Windows/macOS 为 `~/ani-rss`，其他系统为 `config`。

刷新页面即可。想换回自带界面，把 `webui/` 清空或改名。

> qBittorrent 的替代 WebUI 要求产物根目录下有 `public/` 子目录，**ani-rss 没有这个要求**，文件直接放 `webui/` 根下。

## 开发

```bash
npm run dev        # 默认把 /api 代理到 http://127.0.0.1:7789
npm run typecheck
```

改后端地址就编辑 `vite.config.ts` 里的 `server.proxy`。

## 几个绕不开的约束

这些不是风格选择，是上游机制决定的：

- **必须 hash 路由。** 后端用 `registry.addResourceHandler("/**")` 把 `webui` 挂成静态目录，
  没有 SPA fallback —— 直接访问 `/settings` 或在该路径刷新一律 404。`#/settings` 则永远只请求 `index.html`。
- **`base` 必须是相对路径。** 反代挂在子路径下时，绝对路径的 `/assets/...` 会 404。
- **接口地址相对当前页面目录**，不硬编码 `/api`，同样是为了子路径反代。
- **登录密码传 MD5**，不是明文（`Login.password` 的注解写明「密码 (MD5摘要)」）。
  设置页里改密码同理，留空表示不修改 —— 空串的 MD5 是个合法摘要，会把密码真改成空。
- **令牌有三套用法**：常规请求走 `Authorization` 头（无 `Bearer` 前缀）；
  封面图和文件下载这类设不了请求头的走 `?s=<token>`；
  ICS 日历和 Emby Webhook 走 `?api-key=<配置里的 apiKey>`，因为那是给外部系统长期用的，登录令牌会过期。
- **令牌存 `localStorage['authorization']`**，与自带界面同键 —— 在自带界面登录过的人切过来就已经是登录态。

页面显示偏好（`show-score` / `show-week` / `show-playlist` / `show-last-download-time` /
`max-content-width`）也沿用上游同名的键，切换界面时设置不丢。

## 功能覆盖

后端 66 个接口（22 个 controller）全部封装，界面侧对齐上游 64 个 `.vue`：

- 登录、Bangumi OAuth 回调
- 订阅：列表（海报/表格、按星期分组、拼音与首字母搜索）、增删改、批量启用/禁用/刮削/更新总集数
- 添加订阅五个来源：RSS 地址、Bangumi 搜索、Mikan、AniBT、AnimeGarden
- 订阅编辑三个标签页（基本 / 自定义 / 其它），含备用 RSS、自定义集数规则、路径、上传、完结迁移、重命名模版、标签、优先保留
- 预览匹配结果（含遗漏集数推断）、合集下载、导入订阅、封面重抓、Bangumi 评分、视频列表
- 下载器任务（可见时轮询，3 秒）、删除任务
- 日志（可见时轮询、级别过滤、跟随最新、下载、清空）
- 设置 8 个标签页 / 基本设置 9 个折叠面板 / 通知 10 种类型，共 121 个配置字段
- 备份导入导出、缓存清理、检查更新、重启与停止服务

### 播放

在线播放用 [webplayer](https://github.com/zzzwannasleep/webplayer)（LinWeb）。

它不是又一个 `<video>` 皮肤：容器在浏览器本地被拆开、重新封装成 fragmented MP4 交给 MSE，
编码码流原封不动，零转码。所以 **mkv 能放**，ASS 特效字幕由 jassub（libass 的 wasm 移植）
完整渲染，PGS 图形字幕走 libpgs，HDR / Dolby Vision 也在。

它是独立的静态站，不打进本 WebUI 的产物（那要连 wasm 一起 vendor，还会丢掉它自己的播放界面），
而是并排放在 `webui/player/` 下，由本界面的 `#/play` 路由整屏 iframe 引入。
两边同源，所以 webplayer README 里对 Emby 场景强调的混合内容与 CORS 两道墙，在这里天然不存在。

#### 一起打包

```bash
# 1. 构建 webplayer
git clone https://github.com/zzzwannasleep/webplayer && cd webplayer
npm install && npm run build          # -> dist/

# 2. 回到本仓库，构建并组装
cd ../ani-rss-themes
npm --prefix webui-vt run build
node webui-shared/tools/pack.mjs vt --player ../webplayer/dist
```

产物在 `dist-webui/vt/`，把里面的内容复制到 `{configDir}/webui/` 即可。
不给 `--player` 也能装，只是点播放时会提示怎么补上。

**体积**：webplayer 的 dist 约 40 MB，其中 `vendor/ffmpeg-core.wasm` 就占 31 MB
（音频转码用），`jassub-worker*.wasm` 各 2 MB（ASS 渲染），`anime4k.js` 3.4 MB。
本界面自己只有 1.8 MB。放进配置目录前心里有个数。

#### ⚠️ 先跑一下 Range 探针

webplayer 靠**按字节范围精确取流**来拆容器，服务端在范围长度上差一个字节就会崩，
而且崩在解复用阶段 —— 连接正常、总长也读得到，看起来像播放器的锅。

```bash
node webui-shared/tools/range-probe.mjs "http://<ani-rss>/api/file?filename=<base64>&s=<token>"
```

**当前上游 `FileController.doFile()` 没通过这个检查**：

```java
long length = end - start;        // 现在 —— 每个分段响应都少一字节
long length = end - start + 1;    // 应该（RFC 7233 的 Range 是闭区间）
```

已用 webplayer 自己的 `HttpSource` 对着复刻该算术的服务器实测：`open()` 正常、总长正确，
但每次 `read(offset, n)` 只回 `n-1` 字节。顺带 `hasRange` 是无条件置 true 的，
不带 Range 的普通 GET 也会返回 206（这条只是不合规范，不影响播放）。

在上游修掉之前，在线播放大概率不可用 —— 用「用本机播放器打开」把地址交给
PotPlayer / VLC / MPV / IINA / Infuse / 弹弹Play 等，那条路不受影响。

### 已知没做的

- **没有在真实 ani-rss 实例上跑过。** 类型检查、构建、主题自检都过了，接口签名逐个对着后端源码核过，
  但端到端联调没做 —— 手上没有可连的实例。

## 类型是生成的，不是手抄的

`webui-shared/types.ts`（77 个 interface / 11 个枚举）由 `webui-shared/tools/gen-types.mjs`
从上游 Java 实体直接抽取，带字段数自校验：生成结果和源码里的 `private` 字段数对不上就直接失败。

这么做是因为 `Config` 有 121 个字段、`Ani` 55 个、`NotificationConfig` 52 个 —— 手抄必错。
实际开发中这套自校验揪出过 4 个静默丢字段的解析 bug（注解里的嵌套括号会吞掉整个字段、
类注释会吞掉每个类的第一个字段等），全都不报错、只是少东西。

上游改了字段就重跑一次生成器，diff 即本次接口变更。用法见 [`webui-shared/tools/README.md`](webui-shared/tools/README.md)。

## 主题

仓库原有的 17 款 CSS 主题已全部迁过来，在 **设置 → 基本设置 → 页面设置 → 主题** 里选。

迁移带过来的是设计决策本身（字体栈、主色、圆角尺度、背景与装饰），不是原来的选择器 —— 类名体系已换成 Vuetify。
每款从 12~60KB 缩到几十行：原来要逐个覆盖 Element Plus 的上百个组件，现在 DOM 是自己的，
变量到组件的接线统一由 `webui-shared/themes/base.css` 完成。

**这一层的意义不只是省代码。** 原来的主题是贴在 ani-rss 自己的 DOM 上的，
换个版本、换个「页面设置」就可能散架；现在主题只依赖 Vuetify 的公开类名和一组自有变量，不再赌别人的内部结构。

7 款带壁纸的主题会向第三方公共接口请求图片，在选择器里标了「联网」。

三个 JS 附加件没有迁：

- `js/autobangumi.js` —— 它的作用是把 AutoBangumi 的界面渲染到 ani-rss 上。现在 DOM 本来就是我们的，
  这个需求消失了，AutoBangumi 变成一款普通主题。
- `js/material-motion.js` —— 涟漪 Vuetify 自带；动态取色（种子色现算 M3 全套配色）没迁。
- `js/genshin-login.js` —— 登录页的 three.js 场景，独立且体量大，没迁。

## 目录

```
webui-shared/          两套共用，不含 UI 组件
├── http.ts            传输层：Result 拆包、令牌、子路径自适应
├── api.ts             66 个端点的具名封装
├── types.ts           从 Java 实体生成
├── format.ts          体积/时间/集数格式化
├── player.ts          webplayer 接入：地址拼装与部署探测
├── vite-mdi-woff2.ts  构建期插件：图标字体只留 woff2（省 3.2MB）
├── themes/            主题系统 + 17 款主题 + 自检
└── tools/             类型/接口生成器、产物组装、Range 探针
webui-vt/              VueTorrent 风
webui-qb/              qb-web 风
```

## 许可

MIT。与 ani-rss 官方、VueTorrent、qb-web 均无隶属关系。
