# ani-rss-themes

给 [ani-rss](https://github.com/wushuo894/ani-rss) 用的一组自定义 CSS 主题。15 款，每款有自己的字体、按钮、背景，不是只换配色。

纯 CSS，不需要改动 ani-rss 本体，也不需要重新编译前端。

**在线预览：** https://zzzwannasleep.github.io/ani-rss-themes/

## 主题一览

### 纯 CSS（不联网、不吃流量）

| 文件 | 名称 | 字体 | 按钮 | 背景 | 明暗 |
| --- | --- | --- | --- | --- | --- |
| `themes/paper.css` | 纸感极简 · Paper | 宋体/Georgia 标题 + 等线正文 | 方角线框，hover 墨色反转填充 | 稿纸横纹 + 颗粒 | 跟随 |
| `themes/neon.css` | 午夜霓虹 · Neon | Bahnschrift 窄体，西文全大写 | 切角，hover 扫光划过 | 透视网格地平线，无限推进 | 强制深色 |
| `themes/sakura.css` | 樱花物语 · Sakura | 幼圆 / Yuanti SC 圆体 | 药丸渐变，按下回弹 | 飘落花瓣，纯 CSS 动画 | 跟随 |
| `themes/glass.css` | 云海玻璃 · Glass | Optima 细体，超大字距 | 极透玻璃 + 内高光，hover 光泽平移 | 流动极光，漂移换色 | 跟随 |
| `themes/liquid-glass.css` | 液态玻璃 · Liquid Glass | SF Pro 系统栈，字距收紧 | 胶囊玻璃，按下 scale(.95) 弹簧回弹 | 高饱和网格渐变 + 一层细网格 | 跟随 |
| `themes/terminal.css` | 绿光终端 · Terminal | 等宽 + 全大写 + 等宽数字 | `[ 方括号 ]`，hover 整块反色 | 扫描线 + CRT 闪烁 + 暗角 | 强制深色 |
| `themes/github.css` | 代码仓库 · GitHub | Primer 系统字栈，数值走等宽 | Primer 规格，主按钮是那只绿色 | 贡献热力图格子，向下渐隐 | 跟随 |
| `themes/calendar.css` | 挂历 · Calendar | 楷体标题 + DIN 等宽数字 | 方角，顶端一道红边，hover 转红 | 月历方格细线 + 纸面颗粒 | 跟随 |

### 随机壁纸（横竖屏自适应，每次刷新换图）

| 文件 | 名称 | 壁纸源 | 字体 | 按钮 | 明暗 |
| --- | --- | --- | --- | --- | --- |
| `themes/acg-wallpaper.css` | 二次元 · 随机壁纸 | LoliAPI | 鸿蒙/思源黑体 | 玻璃药丸，hover 光晕扩散 | 跟随 |
| `themes/acg-starry.css` | 二次元 · 星空夜 | LoliAPI | 楷体标题 + 黑体正文 | 细线框，hover 星芒外发光 | 强制深色 |
| `themes/acg-peach.css` | 二次元 · 蜜桃樱 | LoliAPI | 幼圆圆体 | 大圆角方块 + 蜜桃渐变 | 强制浅色 |
| `themes/acg-cyber.css` | 二次元 · 电子霓虹 | alcy | 等宽窄体全大写 | 双层描边，hover 抖动 | 强制深色 |
| `themes/acg-glass.css` | 二次元 · 玻璃 | LoliAPI | 系统默认 | 玻璃质感，透明度可调 | 跟随 |
| `themes/bing-mist.css` | 必应4K · 晨雾 | 必应 UHD 4K | 衬线标题，摄影画册排法 | 极细线框，hover 下划线展开 | 强制浅色 |
| `themes/bing-night.css` | 必应4K · 夜航 | 必应 UHD 4K | DIN 冷峻 + 等宽数字 | 实心暗块 + 左侧色条 | 强制深色 |

**玻璃有两款，别选错**：`glass.css` 是 2020 年那套毛玻璃 —— 均匀模糊、半透明白、1px 白边，
整体偏淡偏轻。`liquid-glass.css` 复刻的是 Apple WWDC25 的 Liquid Glass：边缘一条渐隐折射带
（上下亮、左右暗，上缘偏冷下缘偏暖），顶缘一道弧光，控件全是胶囊形，按下 `scale(.95)` 弹簧回弹，
背景是高饱和网格渐变，底下还铺了一层细网格 —— 玻璃是靠「把背后的细节抹掉」被认出来的，
背后只有平滑渐变的话，模糊前后长得一模一样。想省电就把文件开头的 `--lg-blur` 调小。

「强制深色 / 强制浅色」指该主题不跟随右上角的明暗切换 —— 蒙版和面板透明度是按一个方向调好的，反过来会糊。

## 安装

ani-rss 里：**设置 → 基础设置 → 页面设置 → 自定义 → CSS**

两种填法，任选其一。

### 一、在线引用（推荐，跟着仓库自动更新）

只填一行：

```css
@import url("https://zzzwannasleep.github.io/ani-rss-themes/themes/paper.css");
```

把 `paper.css` 换成上表里任意一个文件名即可。

国内访问 GitHub Pages 不稳的话，走 jsDelivr：

```css
@import url("https://cdn.jsdelivr.net/gh/zzzwannasleep/ani-rss-themes@main/themes/paper.css");
```

### 二、直接粘贴（离线可用，不依赖任何外部站点）

打开 `themes/` 里对应的 `.css`，全选复制，粘进自定义CSS 框。

保存后刷新页面生效。**一次只放一个主题**，混着放会互相打架。

## 预览

### 在线预览

https://zzzwannasleep.github.io/ani-rss-themes/

左上角下拉换主题，旁边可切明暗、可跳到登录页。选到「强制深色/浅色」的主题时明暗开关会自动锁定并说明原因。URL 支持三个参数，可以叠加后直接分享：`?t=neon.css` 指定主题、`?dark=1` / `?dark=0` 指定明暗（强制明暗的主题会忽略它）、`?login=1` 直接开在登录页。

右上角的按钮，对着当前选中的主题一键复制：

| 按钮 | 复制到剪贴板的内容 |
| --- | --- |
| 复制链接 · GitHub | `@import url("https://zzzwannasleep.github.io/…/themes/xxx.css");` |
| 复制链接 · jsDelivr | `@import url("https://cdn.jsdelivr.net/gh/…/themes/xxx.css");` |
| 复制 CSS 全文 | 整份 CSS 源码，粘完就不再依赖任何外部站点 |
| 复制 JS 链接 / 全文 | 金色那个，**只有配了 JS 的主题才出现**（目前是原神启动） |

金色那个按钮一个顶俩：上面写着什么就复制什么，复制完自动翻到另一档 —— 点第一下拿
`import(…)` 一行，再点一下拿整份 JS 源码。复制失败不翻档，免得重点一次拿到的是另一个
东西。选到这类主题时，右边那行提示也会变成「这款要填两个框：CSS 一份、JS 一份」。

**预览用的是真实的东西**，不是截图也不是仿写：

- 组件样式是 ani-rss 实际引用的那份 Element Plus 样式表
- ani-rss 自己那层样式（圆角、字体栈、折叠面板等）从上游仓库热链，跟着它更新
- DOM 结构、类名、图标全部按真实界面 1:1 复刻
- 弹窗、下拉、标签页、折叠面板走 Element Plus 真实的过渡动画
- 番剧数据取自 [Bangumi 每日放送](https://api.bgm.tv/calendar)：真实标题、评分、封面，按星期分组

所以预览看到什么样，装上去就是什么样。

**它是能操作的**，不是一张长图。顶部按钮真的会打开对应弹窗，页面覆盖：

| 界面 | 内容 |
| --- | --- |
| 登录页 | 顶栏「看登录页」切过去；图标、标题、账密框、记住密码、底部链接 |
| 首页 | 搜索实时过滤、发布月份与启用状态下拉、六个工具按钮、按星期分组的订阅卡片，列数随窗口自适应 |
| 添加订阅 | 左置标签页 Mikan / AniBT / AG / Other，RSS 地址文本域与提示 |
| 修改订阅 | 基本 / 自定义两个标签页，标题、TMDB、剧集组、主备 RSS、季、集数偏移、总集数、匹配排除、自定义路径与重命名模版等 |
| 管理 | 搜索、筛选、批量操作下拉、带封面的订阅列表 |
| 日志 | 日志等级复选框组、类名筛选、按等级着色的等宽日志区 |
| 下载 | 排序切换、进度条、处理链路标签、体积与状态 |
| 设置 | 八个标签页：下载设置 / 基本设置（九个折叠面板）/ 全局排除 / 代理设置 / 登录设置 / 通知 / 捐赠 / 关于 |

「页面设置」里的控件**真的生效**：外观三档切明暗、主题色取色器改强调色（被主题用 `!important` 固定时会明确提示）、最大内容宽度改布局、四个复选框真的控制评分 / 星期分组 / 视频列表 / 更新时间的显隐。开关、复选框、单选、数字框、折叠、标签页也都可点。

这样一个主题在各种状态下的样子都能直接看到，而不用装上去才知道。所有内容为演示数据，页面不连接任何 ani-rss 实例。`preview/` 目录的构成与许可证说明见 [preview/NOTICE.md](preview/NOTICE.md)。

### 本地预览

克隆下来，起个静态服务即可（直接双击 `index.html` 也能看，但 `@import` 提示里的地址会是 `file://`）：

```bash
git clone https://github.com/zzzwannasleep/ani-rss-themes.git
cd ani-rss-themes
python -m http.server 8080
```

然后打开 `http://localhost:8080`。

### 装到 ani-rss 里预览

主题只是 CSS，随时可以撤：清空自定义CSS 框、保存、刷新，就回到原样。放心试。

## 调参

带壁纸的主题，文件开头都留了一组旋钮：

```css
--ani-bg-blur: 0px;      /* 背景模糊，觉得字不清楚就调 2~6px */
--ani-bg-scale: 1.04;    /* 轻微放大，避免模糊后边缘露白 */
--ani-bg-bright: 1;      /* 背景亮度，图太亮调 .85，太暗调 1.15 */
--ani-panel-blur: 18px;  /* 面板毛玻璃强度，卡设备调 0 */
```

觉得壁纸压得太狠或太浅，改文件里 `body::after` 那段蒙版的 alpha 值。

主题色想用自己的，改文件里那行 `--el-color-primary: xxx !important;`。

## 壁纸接口

| 用途 | 地址 |
| --- | --- |
| 二次元 横屏 | `https://www.loliapi.com/acg/pc/` |
| 二次元 竖屏 | `https://www.loliapi.com/acg/pe/` |
| 二次元 横屏（备选源） | `https://t.alcy.cc/pc` |
| 二次元 竖屏（备选源） | `https://t.alcy.cc/mp` |
| 必应 随机 4K 横屏 | `https://bing.ee123.net/img/?date=random&size=UHD` |
| 必应 随机 竖屏 | `https://bing.ee123.net/img/?date=random&size=1080x1920` |

换源只需改主题文件里 `background-image` 那两行，横屏一行、竖屏一行。alcy 还有 `/moe`（萌图）、`/ycy`、`/ys`（原神）等分类，列在 `themes/acg-cyber.css` 文件末尾。

这些都是第三方公共接口，可能限速、挂掉或换域名。挂了的表现是没有背景图（配色照常成立），换上表另一个源即可。

## 附加：原神启动（登录页专用，CSS + JS 两件套）

把 ani-rss 的登录页改成《原神》启动器那一屏。两个文件，可以只装一个，一起装最完整：

| 文件 | 填在哪 | 管什么 |
| --- | --- | --- |
| `themes/genshin-login.css` | 自定义 **CSS** | 登录窗口：白色圆角卡片、右上角「×」、金色点缀、通栏的「点击登录」 |
| `js/genshin-login.js` | 自定义 **JS** | 卡片后面那片天：渐变天空、云海、极光、星尘、悬空的桥柱，相机一直往前推 |

```css
/* CSS 框 */
@import url("https://cdn.jsdelivr.net/gh/zzzwannasleep/ani-rss-themes@main/themes/genshin-login.css");
```

```js
/* JS 框 */
import("https://cdn.jsdelivr.net/gh/zzzwannasleep/ani-rss-themes@main/js/genshin-login.js")
```

两个都支持直接粘全文。

**关于这份 CSS**

- **只管登录页**，列表页一行不碰。所以它能和上面任意一款主题叠着用 —— 那些管列表页，
  这份管登录页。也因此它不跟随明暗切换，启动器那个弹窗本来就只有白色一种。
- **单用也成立**。不装 JS 的话，背后是一层按真实渲染取色的渐变兜底；装了 JS 就被真的
  天空盖住，canvas 淡入那 1.2 秒正好当过渡。
- 卡片宽度、金色、按钮底色都在文件开头的 `--gs-*` 变量里。
- 启动器原样是米哈游的企业 logo，本仓库不默认带，用的还是 ani-rss 自己的图标。想换看
  文件里「换 logo」那一段，两行的事。

**关于这份 JS**

- **只在登录页跑**。检测到 `#login-page` 挂载才建场景，登录后销毁 canvas 并显式
  释放 WebGL 上下文，列表页一点三维开销都不留。
- **资产只引用不转存**。模型贴图走 `ASSET_BASE` 热链上游仓库，本仓库不放米哈游的
  任何文件。移植来源与免责声明见 [`js/NOTICE.md`](js/NOTICE.md)。
- **要流量**。首次进登录页拉 three.js 约 600 KB + Draco 解码器约 200 KB + 模型贴图
  约 3 MB，之后走浏览器缓存。移动网络上这不便宜，介意就只装 CSS。
- **要 WebGL2**，且系统开了「减弱动态效果」时脚本自行退出，此时 CSS 的兜底天空接管。

## 已知点

- **流量**：必应两款默认拉 UHD 真 4K，一张 3~5MB。手机流量或线路慢，把 `size=UHD` 改成 `size=1920x1080`，降到 300KB 左右。竖屏那条本来就是 1080x1920，不用改。
- **主题色会被接管**：ani-rss 的取色器是把 `--el-color-primary` 以内联样式写在 `<html>` 上的，所以主题里用了 `!important` 才能盖过。想用自己的颜色改那一行。
- **毛玻璃** (`backdrop-filter`) 在老设备上可能掉帧，把 `--ani-panel-blur` 调成 `0` 即可。
- **动画**：飘落花瓣、极光漂移、CRT 闪烁等都包了 `@media (prefers-reduced-motion: reduce)`，系统开了「减少动态效果」会自动静止。
- **字体**：全部走系统字体栈，零 CDN，断网照常。想要 JetBrains Mono / 思源宋体这类特定字形，本机装上就会自动命中。
- **`!important`**：订阅卡片、封面、评分这几处是 Vue scoped 样式（带 `[data-v-]`），权重比普通 class 高，所以对应几行必须带 `!important`，别删。
- **壁纸随机度**取决于接口侧，浏览器缓存住同一张是正常的，强刷（Ctrl+F5）会换。

## 兼容性

按 ani-rss 当前前端（Vue 3 + Element Plus 2.x）的 CSS 变量写的。ani-rss 大版本更新后如果哪个组件跑色了，多半是变量名变了，对着 Element Plus 的 `--el-*` 改一下即可。

## License

MIT
