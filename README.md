# ani-rss-themes

给 [ani-rss](https://github.com/wushuo894/ani-rss) 用的 17 款自定义 CSS 主题。每款换的是字体、按钮、背景，不只是配色。

纯 CSS，不动 ani-rss 本体，不用重新编译前端。随时可撤。

**👉 [在线预览](https://zzzwannasleep.github.io/ani-rss-themes/)**（可点、可操作，看到什么样装上就什么样）

## 安装

ani-rss 里：**设置 → 基础设置 → 页面设置 → 自定义 → CSS**，填一行：

```css
@import url("https://zzzwannasleep.github.io/ani-rss-themes/themes/paper.css");
```

把 `paper.css` 换成下表任意文件名。Pages 不通就走备用源 githack：

```css
@import url("https://raw.githack.com/zzzwannasleep/ani-rss-themes/main/themes/paper.css");
```

保存刷新即可。**一次只放一个主题**，混着放会打架。不想依赖外部站点，就把 `.css` 全文复制粘进去。

## 主题一览

| 文件 | 名称 | 长什么样 | 明暗 |
| --- | --- | --- | --- |
| `paper.css` | 纸感极简 | 宋体标题，方角线框，稿纸横纹 | 跟随 |
| `neon.css` | 午夜霓虹 | 窄体全大写，切角扫光，透视网格 | 深色 |
| `sakura.css` | 樱花物语 | 圆体，药丸按钮，飘落花瓣 | 跟随 |
| `glass.css` | 云海玻璃 | 细体大字距，毛玻璃，流动极光 | 跟随 |
| `liquid-glass.css` | 液态玻璃 | 复刻 Apple WWDC25，胶囊控件按下回弹 | 跟随 |
| `terminal.css` | 绿光终端 | 等宽全大写，`[方括号]` 按钮，CRT 扫描线 | 深色 |
| `github.css` | 代码仓库 | Primer 字栈，贡献热力图格子 | 跟随 |
| `calendar.css` | 挂历 | 楷体 + DIN 数字，月历方格 | 跟随 |
| `material.css` | 质感设计 M3 | Roboto，全圆角胶囊，按下起涟漪 | 跟随 |
| `autobangumi.css` | AutoBangumi | Inter 字栈，填充式控件，海报网格 + 侧边导航 | 跟随 |
| `acg-wallpaper.css` | 二次元 · 随机壁纸 | 玻璃药丸，hover 光晕 | 跟随 |
| `acg-starry.css` | 二次元 · 星空夜 | 细线框，星芒外发光 | 深色 |
| `acg-peach.css` | 二次元 · 蜜桃樱 | 圆体，蜜桃渐变 | 浅色 |
| `acg-cyber.css` | 二次元 · 电子霓虹 | 双层描边，hover 抖动 | 深色 |
| `acg-glass.css` | 二次元 · 玻璃 | 玻璃质感，透明度可调 | 跟随 |
| `bing-mist.css` | 必应4K · 晨雾 | 衬线标题，摄影画册排法 | 浅色 |
| `bing-night.css` | 必应4K · 夜航 | DIN 冷峻，实心暗块 | 深色 |

后 7 款是随机壁纸主题（横竖屏自适应，每次刷新换图）。「深色 / 浅色」指该主题不跟随明暗切换 —— 透明度是按一个方向调的，反过来会糊。

<details>
<summary><b>玻璃有两款，别选错</b></summary>

`glass.css` 是 2020 年那套毛玻璃：均匀模糊、半透明白、1px 白边，偏淡偏轻。

`liquid-glass.css` 复刻的是 Apple WWDC25 的 Liquid Glass：边缘一条渐隐折射带（上下亮、左右暗，上缘偏冷下缘偏暖），顶缘一道弧光，控件全是胶囊形，按下 `scale(.95)` 弹簧回弹。背景用高饱和网格渐变 + 一层细网格 —— 玻璃是靠「把背后的细节抹掉」被认出来的，背后只有平滑渐变的话，模糊前后长得一模一样。

想省电就把文件开头的 `--lg-blur` 调小。
</details>

<details>
<summary><b>调参：背景太亮 / 太糊 / 卡</b></summary>

带壁纸的主题，文件开头都留了一组旋钮：

```css
--ani-bg-blur: 0px;      /* 背景模糊，觉得字不清楚就调 2~6px */
--ani-bg-scale: 1.04;    /* 轻微放大，避免模糊后边缘露白 */
--ani-bg-bright: 1;      /* 背景亮度，图太亮调 .85，太暗调 1.15 */
--ani-panel-blur: 18px;  /* 面板毛玻璃强度，卡设备调 0 */
```

- 壁纸压得太狠或太浅 → 改 `body::after` 那段蒙版的 alpha
- 想用自己的主题色 → 改 `--el-color-primary: xxx !important` 那行
- 换壁纸源 → 改 `background-image` 那两行（横屏一行、竖屏一行）

可用壁纸接口：

| 用途 | 地址 |
| --- | --- |
| 二次元 横屏 / 竖屏 | `https://www.loliapi.com/acg/pc/` · `/acg/pe/` |
| 二次元 备选源 | `https://t.alcy.cc/pc` · `https://t.alcy.cc/mp` |
| 必应 4K 横屏 | `https://bing.ee123.net/img/?date=random&size=UHD` |
| 必应 竖屏 | `https://bing.ee123.net/img/?date=random&size=1080x1920` |

alcy 还有 `/moe`、`/ycy`、`/ys` 等分类，列在 `themes/acg-cyber.css` 末尾。
</details>

<details>
<summary><b>预览页能干什么</b></summary>

https://zzzwannasleep.github.io/ani-rss-themes/

左上角换主题、切明暗、跳登录页。URL 参数可叠加后分享：`?t=neon.css`、`?dark=1`、`?login=1`。

右上角一键复制：GitHub 链接 / githack 链接 / CSS 全文。配了 JS 的主题会多出一个金色按钮（点一下拿 `import(…)` 一行，再点一下拿 JS 全文）。

**用的是真东西，不是截图也不是仿写：** Element Plus 样式表和 ani-rss 实际引用的是同一份；ani-rss 自己那层样式从上游热链，跟着它更新；DOM 结构、类名、图标 1:1 复刻；弹窗、下拉、标签页走 Element Plus 真实过渡；番剧数据取自 [Bangumi 每日放送](https://api.bgm.tv/calendar)。

**它是能操作的**，上游 28 个弹窗全部复刻：登录页、首页、添加/修改订阅、管理、日志、下载、设置八个标签页、Bangumi 授权、播放列表、正则测试、批量操作等。「页面设置」里的控件真的生效 —— 切明暗、取色器改强调色、最大宽度改布局、四个复选框真的控制评分/星期/视频列表/更新时间的显隐。

本地跑：

```bash
git clone https://github.com/zzzwannasleep/ani-rss-themes.git
cd ani-rss-themes && python -m http.server 8080
```

所有内容为演示数据，页面不连接任何 ani-rss 实例。目录构成与许可证见 [preview/NOTICE.md](preview/NOTICE.md)。
</details>

<details>
<summary><b>附加：AutoBangumi 完整界面（再配一份 JS）</b></summary>

`themes/autobangumi.css` 单装就已经把配色、控件、订阅卡全部换成 [AutoBangumi](https://github.com/EstrellaXD/Auto_Bangumi) 的样子 —— 包括把 ani-rss 的横向卡片改成上游那种竖版海报网格（5:7 封面、hover 抬起、浮层里放操作按钮、评分做成角标）。

上游的主界面还有一块 CSS 单独做不到：左侧那条导航栏。ani-rss 的功能入口全挤在顶栏一排文字按钮里，配上 `js/autobangumi.js` 就会拆成上游的布局：

| 装法 | 布局 | 功能入口 | 页面标题 |
| --- | --- | --- | --- |
| 只填 CSS | 顶栏一条 + 列表 | 顶栏一排文字按钮 | 无 |
| CSS + JS | 顶栏 + 左侧导航 + 内容区 | 下载器 / RSS 管理 / 日志 / 设置进侧栏，添加 / 刷新留在顶栏做图标钮 | 「订阅列表」+ 渐变横杠 |

```css
/* CSS 框 */
@import url("https://raw.githack.com/zzzwannasleep/ani-rss-themes/main/themes/autobangumi.css");
```

```js
/* JS 框 */
import("https://raw.githack.com/zzzwannasleep/ani-rss-themes/main/js/autobangumi.js")
```

**只做交集。** 侧栏每一项都对应 ani-rss 真实存在的一个按钮，点它就是点原按钮（原按钮只是被收起来了，事件还是 ani-rss 自己的）；认不到对应按钮的项直接不出现。上游有、ani-rss 没有的功能（番剧日历、播放器、通知中心）一个都不造 —— 摆一个点不动的入口比没有更糟。反过来，ani-rss 独有的东西（评分、更新时间）按上游的视觉语言补：评分做成上游 `.group-badge` 那种主色角标，更新时间做成标题下的一行小字。

**不搬 DOM。** 整个布局靠 CSS Grid 的 `grid-area` 重排，网格位置和 DOM 顺序无关 —— Vue 看到的子节点顺序一个字没变，不会 patch 到错误的位置上。脚本只往容器末尾追加自己的两个节点（侧栏、页面标题），并用 MutationObserver 跟着 Vue 重绘重新绑定代理。**零依赖、零外部请求**，图标是内联 SVG。清空 JS 框刷新就还原。

**字体**：上游自托管 Inter，主题不能带资源文件，这里给的是同一条字栈。本机装了 Inter 就是 1:1；没装落到 Segoe UI / 苹方，字形略有出入，排版数值不变。

色板、圆角、阴影、缓动全部取自上游 `src/style/var.scss` 的原值；组件尺寸取自各 `.vue` 的 scoped 样式；下拉框和开关这两个走 Naive UI 的控件，尺寸是在跑起来的实例上量的计算值。
</details>

<details>
<summary><b>附加：Material 3 动效增强（再配一份 JS）</b></summary>

`themes/material.css` 单装就是完整主题。里面还留了一层动效规则，全部关在 `html.md-motion` 底下 —— 不装 JS 时一条也不匹配。装上 `js/material-motion.js` 就开了：

| 装法 | 涟漪 | 顶栏 | 卡片入场 | 配色 |
| --- | --- | --- | --- | --- |
| 只填 CSS | 从按钮正中扩散 | 一直平的 | 无 | M3 baseline 紫 |
| CSS + JS | 从指针落点扩散，长按不消 | 滚起来就染色 + 抬起 | 进视口才浮上来，错峰 40ms | 取色器给什么种子色就现算整套 |

```css
/* CSS 框 */
@import url("https://raw.githack.com/zzzwannasleep/ani-rss-themes/main/themes/material.css");
```

```js
/* JS 框 */
import("https://raw.githack.com/zzzwannasleep/ani-rss-themes/main/js/material-motion.js")
```

**动态取色**：ani-rss 的取色器把 `--el-color-primary` 以内联样式写在 `<html>` 上，主题用 `!important` 盖住后它就失效了。这份 JS 把它读回来当种子，按 M3 四条色调轨现算 26 个配色变量铺回去 —— 取色器又生效了，而且改的是整套配色不只强调色。换算用 OKLCh 近似 HCT（两者都是感知均匀空间，观感差别肉眼基本看不出，但 HCT 要带一整套 CAM16 实现，不值当）。拿 baseline 的 `#6750A4` 跑回去得到 `#634CA0` / `#1C1B21`，和官方 `#6750A4` / `#1D1B20` 基本重合。

**不联网、零依赖**，只加类名和一层内联变量，不改 DOM。清空 JS 框刷新就还原。系统开了「减弱动态效果」时只留取色，不启动画。

`themes/material-motion.css` 本身没有样式，两行 `@import` 指回 `material.css` —— 存在只是为了预览页能单独选到「配 JS 的那一版」。
</details>

<details>
<summary><b>附加：原神启动（登录页专用，CSS + JS 两件套）</b></summary>

把登录页改成《原神》启动器那一屏。两个文件可以只装一个，一起装最完整：

| 文件 | 填在哪 | 管什么 |
| --- | --- | --- |
| `themes/genshin-login.css` | 自定义 **CSS** | 登录窗口：白色圆角卡片、右上角「×」、金色点缀、通栏「点击登录」 |
| `js/genshin-login.js` | 自定义 **JS** | 卡片后面那片天：渐变天空、云海、极光、星尘、悬空桥柱，相机往前推 |

```css
@import url("https://raw.githack.com/zzzwannasleep/ani-rss-themes/main/themes/genshin-login.css");
```

```js
import("https://raw.githack.com/zzzwannasleep/ani-rss-themes/main/js/genshin-login.js")
```

- **只管登录页**，列表页一行不碰 —— 可以和上面任意主题叠着用。也因此不跟随明暗，启动器那个弹窗本来就只有白色。
- **单装 CSS 也成立**：背后是一层按真实渲染取色的渐变兜底；装了 JS 就被真的天空盖住。
- **要流量**：首次进登录页拉 three.js 约 600 KB + Draco 约 200 KB + 模型贴图约 3 MB，之后走缓存。移动网络上不便宜，介意就只装 CSS。
- **要 WebGL2**；系统开了「减弱动态效果」时不建三维场景，CSS 兜底天空接管。
- 卡片宽度、金色、按钮底色在文件开头的 `--gs-*` 里。
- 「忘记密码」只装 CSS 时是个伪元素（样子在但点不了，CSS 造不出链接），装了 JS 才变成真链接。
- **资产只引用不转存**，本仓库不放米哈游任何文件。移植来源与声明见 [js/NOTICE.md](js/NOTICE.md)。
</details>

<details>
<summary><b>已知点 / 排障</b></summary>

- **流量**：必应两款默认拉 UHD 真 4K，一张 3~5MB。把 `size=UHD` 改成 `size=1920x1080` 降到 300KB 左右。
- **主题色会被接管**：取色器是内联写在 `<html>` 上的，所以主题里必须用 `!important` 才盖得住。想用自己的颜色改那行。
- **毛玻璃卡顿**：`--ani-panel-blur` 调 `0`。
- **动画**：花瓣、极光、CRT 闪烁都包了 `prefers-reduced-motion`，系统开了「减少动态效果」自动静止。
- **字体**：全走系统字体栈，零 CDN，断网照常。本机装了 JetBrains Mono / 思源宋体这类会自动命中。
- **`!important` 别删**：订阅卡片、封面、评分是 Vue scoped 样式（带 `[data-v-]`），权重比普通 class 高。
- **壁纸不换**：随机度取决于接口侧，浏览器缓存住同一张是正常的，Ctrl+F5 强刷会换。
- **接口挂了**：表现是没有背景图（配色照常成立），换上面表里另一个源即可。
- **组件跑色**：ani-rss 大版本更新后多半是 `--el-*` 变量名变了，对着 Element Plus 改一下即可。当前按 Vue 3 + Element Plus 2.x 写。
</details>

## 免责声明

- 本仓库是**第三方个人项目**，与 ani-rss 官方、Element Plus、米哈游、Bangumi 及各壁纸接口的提供方**均无隶属或背书关系**。ani-rss 是 [wushuo894](https://github.com/wushuo894/ani-rss) 的作品，本仓库只提供外观样式。
- 主题**只改外观**，不修改 ani-rss 程序、不读写你的订阅数据、不上传任何信息。出问题清空自定义 CSS/JS 框并刷新即可完全还原。
- 壁纸主题会向**第三方公共接口**发起图片请求（地址见上），这些接口的可用性、内容与隐私政策**不由本仓库控制**。介意就用纯 CSS 那 9 款。
- 「原神启动」是**非商业同人移植**，《原神》相关名称、商标、美术资产的权利归米哈游所有；本仓库不转存任何官方文件，仅热链引用。权利方如认为不妥，提 issue 即撤。
- 本仓库按**现状（AS IS）**提供，不作任何明示或默示担保。ani-rss 版本更新可能导致样式失效。使用风险自负。

## License

MIT
