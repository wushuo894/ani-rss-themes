# ani-rss 替代 WebUI

给 [ani-rss](https://github.com/wushuo894/ani-rss) 做的六套完整前端，整个替换掉自带界面 —— 不是换肤。

上游在 `test` 分支（2026-08-19，commit `a79d482`）加了「备用 webui」：把文件放进 `{configDir}/webui/`，
后端就优先从那里取静态资源。这六套就是给那个目录用的。

**👉 [在线预览](https://zzzwannasleep.github.io/ani-rss-themes/webui/)** —— 六款都能点开试，数据是内置的假数据。

| id | 首页 | 订阅主视图 | 导航形态 | 动作语言 |
| --- | --- | --- | --- | --- |
| `acg` 二次元 | 今天更新的横向海报条 | 海报墙：整张是图，字压在图上，操作悬停浮出 | 宽屏图标栏 / 窄屏底部导航，半透明浮在壁纸上 | 弹（末端过冲），悬停抬起 + 主色光晕 |
| `liquid-glass` 液态玻璃 | 三块大玻璃板，封面当背景透出来 | 横躺玻璃板，宽屏两列 | 悬浮玻璃胶囊（不占布局） | 飘（长时长阻尼曲线），悬停提亮高光边 |
| `vue` Vue 文档 | 文档站首页：hero + feature 卡 + 表格 | 细线分隔的行清单 | 左侧**分组**侧栏 + 居中正文 | 几乎不动，只淡入，悬停换底色 |
| `github` GitHub | 没有首页，打开就是清单 | 带边框的清单，行内状态点 | 顶栏 + 一排 tab，无侧栏 | 没有动效，层级靠 1px 边框（Primer 就这样） |
| `material` Material 3 | 大标题 + tonal 指标卡 + 横向轨道 | M3 卡片网格（带集数进度线），可切表格 | 导航栏杆 / 底部导航 + 扩展 FAB | M3 emphasized 曲线，反馈是 state layer 不是位移 |
| `win98` Windows 98 | 一页「系统属性」：几个分组框 + 一格一格的进度条 | 资源管理器的详细信息视图：一行一条、点表头排序、右键出菜单 | 整个应用是一扇窗（标题栏 + 菜单栏 + 左侧窗格），底下钉一条带开始菜单的任务栏 | 一帧都没有，反馈只有「立体边框翻个面」 |

**不是六套配色。** 首页、订阅页、卡片形态、导航、连动效曲线都不一样；
但底下是同一份接口层、状态层、弹窗和设置页 —— 一处修好六款同时好。

实现上是**一套源码 + 六个预设**：`webui/src/presets/<id>/` 各出一个外壳（`Shell.vue`）、
一个总览页（`DashboardView.vue`）、一个订阅页（`SubsView.vue`）、一份控件默认值（`defaults.ts`）
和一份动作签名（`preset.css`），构建时用 `VITE_PRESET` 选一款。
复制六份源码那种「六款」，改一个 bug 要改六次。

动效不是每款各写一遍：`src/styles/motion.css` 只定义**有哪些动作**（入场、悬停、按下、
骨架屏），曲线和时长全走 CSS 变量，各款的 `preset.css` 改写变量。
所以六款共用同一批类名，动起来却是六种手感。

页面之间没有整页过渡：路由组件套在 `<keep-alive>` 里，切走再切回来不重新挂载 ——
列表不用重新渲染、滚动位置还在、日志和下载器也不必重新拉一遍。`<transition>` 和
keep-alive 一起用会死锁（离场组件被移进 keep-alive 的隐藏容器，leave 过渡永远收不到
结束事件，`out-in` 就一直等在那儿，路由卡死在上一页），所以整页淡入淡出这一层直接不要，
入场动效留在页面内部的卡片和列表上。

## 安装

### 一行装好（推荐）

Linux / macOS / NAS / Docker 宿主机：

```bash
curl -fsSL https://raw.githubusercontent.com/zzzwannasleep/ani-rss-themes/main/install.sh | bash
```

Windows PowerShell：

```powershell
irm https://raw.githubusercontent.com/zzzwannasleep/ani-rss-themes/main/install.ps1 | iex
```

脚本会问两件事：webui 目录在哪、装哪一款（序号或 id 都行），然后自己下载解压。
**在线播放器包含在每个包里**，不用单独选。
填配置目录也行 —— 认出 `config.v2.json` 后会自动补上 `webui/`。
已有内容会先备份成 `webui.bak.<时间戳>`。

非交互（脚本自动化用）：

```bash
curl -fsSL .../install.sh | bash -s -- --dir /vol1/docker/ani-rss/config/webui --ui vue -y
```

```powershell
$env:ANIRSS_WEBUI_DIR='D:\ani-rss\config\webui'; $env:ANIRSS_UI='vue'
irm .../install.ps1 | iex
```

### 手动装

[Releases](https://github.com/zzzwannasleep/ani-rss-themes/releases) 里六个包，一款一个，**挑一个**解压到 `webui/`：

| 压缩包 | 下载 | 解压后 |
|---|---|---|
| `ani-rss-webui-acg.zip` | ~14 MB | ~42 MB |
| `ani-rss-webui-liquid-glass.zip` | ~14 MB | ~42 MB |
| `ani-rss-webui-vue.zip` | ~14 MB | ~42 MB |
| `ani-rss-webui-github.zip` | ~14 MB | ~42 MB |
| `ani-rss-webui-material.zip` | ~14 MB | ~42 MB |
| `ani-rss-webui-win98.zip` | ~14 MB | ~42 MB |

界面本体只有 1.6 MB，其余全是播放器的 wasm。**每个包都自带播放器** ——
在线播放本来就是 ani-rss 的功能，我们只是把它自带的播放器换成支持 ASS 特效字幕和 HDR 的那个；
拆成两个包只会让人少装一个，然后以为坏了。

```
{configDir}/webui/
├── index.html
├── assets/
└── player/
    └── play.html
```

`{configDir}` 的确定顺序（`ConfigUtil.getConfigDir()`）：环境变量 `CONFIG` → 当前工作目录下的
`config/` → Windows/macOS 为 `~/ani-rss`，其他系统为 `config`。

**重启 ani-rss** —— 程序只在启动时扫 `config/webui/`，光刷新页面不生效。
想换回自带界面，把 `webui/` 清空或改名，再重启一次。

> qBittorrent 的替代 WebUI 要求产物根目录下有 `public/` 子目录，**ani-rss 没有这个要求**，文件直接放 `webui/` 根下。

### 自己构建

```bash
npm ci --prefix webui
npm run build:all --prefix webui -- --only vue     # 不带 --only 就是六款全建
node webui/shared/tools/pack.mjs vue --player ../webplayer/dist
```

单款产物在 `webui/dist/<id>/`，组装结果在 `dist-webui/<id>/`。
打 `webui-v*` 标签会由 GitHub Actions 自动构建并发布上面那六个包。

## 开发

```bash
cd webui
VITE_PRESET=github VITE_API_TARGET=http://<你的 ani-rss> npm run dev
npm run typecheck
npm run build:all -- --demo    # 六款演示构建（假数据，Pages 预览用的就是它）
npm test                       # 主题 / 接口地址 / 外部播放器的断言
npm run test:mobile            # 手机宽度版式体检，要先有 --demo 产物
```

`test:mobile` 用无头 Chrome/Edge 跑六款 × 360/390/414 × 13 条路由，
只认四类可判定的事实：整页横向滚动、元素伸出视口、可点元素不足 36px、
固定元素压住按钮。手机上的毛病看截图很难认（「按钮被顶出去 11px」和「有点挤」长得一样），
vue-tsc 和单元测试又完全看不见 CSS，所以单开一份。
本机没装浏览器时它直接跳过并返回 0，不会卡住别人。

`VITE_PRESET` 不给默认是 `vue`。**后端地址走环境变量，不写进仓库**（也可以放进不进版本控制的
`webui/.env.local`）—— 地址、端口这类东西一旦硬编码进去，之后就没人会去清了。

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

#### 装它

不用单独装 —— 六个发布包里都带着。自己构建见 `webui/shared/tools/pack.mjs` 的 `--player` 参数。

**体积**：播放器下载 13 MB、解压后 40 MB —— 其中 `vendor/ffmpeg-core.wasm` 独占 31 MB（音频转码用），
`jassub-worker*.wasm` 各 2 MB（ASS 渲染），`anime4k.js` 3.4 MB。界面本体只有 1.6 MB。

#### ⚠️ 先跑一下 Range 探针

webplayer 靠**按字节范围精确取流**来拆容器，服务端在范围长度上差一个字节就会崩，
而且崩在解复用阶段 —— 连接正常、总长也读得到，看起来像播放器的锅。

```bash
node webui/shared/tools/range-probe.mjs "http://<ani-rss>/api/file?filename=<base64>&s=<token>"
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

`webui/shared/types.ts`（77 个 interface / 11 个枚举）由 `webui/shared/tools/gen-types.mjs`
从上游 Java 实体直接抽取，带字段数自校验：生成结果和源码里的 `private` 字段数对不上就直接失败。

这么做是因为 `Config` 有 121 个字段、`Ani` 55 个、`NotificationConfig` 52 个 —— 手抄必错。
实际开发中这套自校验揪出过 4 个静默丢字段的解析 bug（注解里的嵌套括号会吞掉整个字段、
类注释会吞掉每个类的第一个字段等），全都不报错、只是少东西。

上游改了字段就重跑一次生成器，diff 即本次接口变更。用法见 [`webui/shared/tools/README.md`](webui/shared/tools/README.md)。

## 主题

从仓库原有的 CSS 主题里挑了 6 款迁过来，在 **设置 → 基本设置 → 页面设置 → 主题** 里选：

| id | 名字 | 长什么样 |
|---|---|---|
| `acg` | 二次元 | 随机壁纸 + 玻璃药丸，每次刷新换图（联网） |
| `liquid-glass` | 液态玻璃 | 复刻 Apple WWDC25，胶囊控件按下回弹 |
| `vue` | Vue 文档 | VitePress 配色，顶部绿紫晕染 |
| `github` | GitHub | Primer 配色与字栈，贡献热力图格子 |
| `material` | Material Design 3 | Roboto，全圆角胶囊 |
| `win98` | Windows 98 | 银灰双层斜角，靛蓝标题栏，方角滚动条，一格一格的进度条（只在浅色下成立） |

原来那些 `.css` 主题文件一个没动，只是挪进了 `legacy/`，给 ani-rss 自带界面换肤照用。

迁移带过来的是设计决策本身（字体栈、主色、圆角尺度、背景与装饰），不是原来的选择器 —— 类名体系已换成 Vuetify。
每款从 12~60KB 缩到几十行：原来要逐个覆盖 Element Plus 的上百个组件，现在 DOM 是自己的，
变量到组件的接线统一由 `webui/shared/themes/base.css` 完成。

**这一层的意义不只是省代码。** 原来的主题是贴在 ani-rss 自己的 DOM 上的，
换个版本、换个「页面设置」就可能散架；现在主题只依赖 Vuetify 的公开类名和一组自有变量，不再赌别人的内部结构。

「二次元」会向第三方公共接口请求壁纸，在选择器里标了「联网」，介意就选别的五款。

三个 JS 附加件没有迁：

- `legacy/js/autobangumi.js` —— 它的作用是把 AutoBangumi 的界面渲染到 ani-rss 上。现在 DOM 本来就是我们的，
  这个需求消失了，AutoBangumi 变成一款普通主题。
- `legacy/js/material-motion.js` —— 涟漪 Vuetify 自带；动态取色（种子色现算 M3 全套配色）没迁。
- `legacy/js/genshin-login.js` —— 登录页的 three.js 场景，独立且体量大，没迁。

## 目录

```
webui/
├── shared/                六款共用，不含 UI 组件
│   ├── http.ts            传输层：Result 拆包、令牌、子路径自适应
│   ├── api.ts             66 个端点的具名封装
│   ├── types.ts           从 Java 实体生成
│   ├── format.ts          体积/时间/集数格式化
│   ├── player.ts          webplayer 接入：地址拼装与部署探测
│   ├── vite-mdi-svg.ts    构建期插件：扫源码，只把用到的图标打进产物（省 700KB）
│   ├── themes/            主题系统 + 6 款主题 + 自检
│   └── tools/             类型/接口生成器、产物组装、Range 探针
├── src/
│   ├── presets/<id>/      六款各自的外壳、总览页、订阅页、控件默认值、动作签名
│   ├── styles/motion.css  动效底座：动作定义在这里，曲线由各款覆盖
│   ├── components/        弹窗、设置项、卡片、骨架屏 —— 六款共用
│   ├── views/             下载器/日志/设置/登录/播放 —— 六款共用
│   ├── stores/            订阅、下载、日志、配置、偏好
│   ├── composables/       外壳逻辑、订阅页逻辑、主题管理
│   └── demo/              演示模式：拦掉请求用假数据顶上（只进预览构建）
├── preview-index.html     Pages 上的六款选择页
└── tools/build-all.mjs    一口气构建六款

legacy/                    旧的 CSS + JS 主题，给 ani-rss 自带界面换肤
├── themes/*.css           17 款
├── js/*.js                3 个附加件
├── preview/ + index.html  预览站（Pages 的根就是它）
└── fonts/
```

## 预览站是怎么发布的

`.github/workflows/pages.yml` 把 `legacy/` 铺回站点根、六款演示构建放进 `/webui/<id>/`。

之所以改成用 Actions 发布而不是「从分支根目录发布」：仓库拆成两半之后，
线上必须保留 `/themes/xxx.css` 这个地址 —— 用户 `@import` 的就是它，换地址等于把已经装好的人的主题弄没。
（直连仓库的 githack / jsDelivr 链接不在此列，那类地址要加上 `legacy/`。）

演示构建带 `VITE_DEMO=1`：`src/demo/` 会把 `fetch` 换成一个只认识 `api/` 的假服务端，
封面是现画的 SVG，写操作一律「成功但什么也没做」。正式产物里这些代码会被整块摇掉，
CI 里也有一条检查：正式包里出现演示数据就直接失败。

## 许可

MIT。与 ani-rss 官方无隶属关系；六款界面只是参照了各自的设计语言，与 Vue、GitHub、Google、Apple、Microsoft 均无关联。
