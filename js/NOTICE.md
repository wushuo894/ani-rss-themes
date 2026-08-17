# js/ 目录说明

这里放的是主题的伴生脚本。和 `themes/` 里的纯 CSS 主题不同，它们要填在
**自定义 JS** 里，不是自定义 CSS。

| 文件 | 配套主题 | 管什么 | 许可 |
| --- | --- | --- | --- |
| `material-motion.js` | `themes/material.css` | 指针落点涟漪、顶栏升起、卡片入场、从取色器现算 M3 配色 | MIT，原创 |
| `autobangumi.js` | `themes/autobangumi.css` | 把顶栏那排按钮拆成 AutoBangumi 的左侧导航，补页面标题 | MIT，原创 |
| `genshin-login.js` | `themes/genshin-login.css` | 登录页背后那片三维天空 | MIT，移植，见下 |

前两个零依赖、零外部请求，清空 JS 框刷新就还原。下面整篇讲的是 `genshin-login.js`。

## genshin-login.js 的来源

复刻自 [alphardex/genshin-replica](https://github.com/alphardex/genshin-replica)（MIT），
那个项目本身又是 [gamemcu/www-genshin](https://github.com/gamemcu/www-genshin) 的复刻。

移植时做了这些改动：

- 框架层（`kokomi.js`）没有引入，渲染循环、全屏四边形、uniform 注入都按需重写
- 着色器里的 `#include` 手工展开（原项目靠 vite-plugin-glsl 在构建期做）
- `gsap` 换成十行的 back-out 缓动，`lil-gui` 调试面板、`howler` 音频全部去掉
- 后期只保留 ACES 色调映射这一道全屏 pass。上游的 bloom 与景深没有移植——
  bloom 只是给亮部加一圈晕，景深只服务于点击进门那段动画，而门本身不在移植范围内
- 加了生命周期：检测 `#login-page` 挂载才建场景，登录后销毁 canvas 并显式
  `forceContextLoss()`，列表页不留任何三维开销

着色器里的柏林噪声与 `random()` 取自 [lygia](https://github.com/patriciogonzalezvivo/lygia)，
`lights_fragment_begin` 与 ACES 色调映射取自 [three.js](https://github.com/mrdoob/three.js)（MIT）。

## 资产：只引用，不转存

模型（`.glb`）和贴图（`.png`）**没有**放进本仓库，脚本顶部的 `ASSET_BASE` 常量指向
上游仓库的 jsDelivr 直链：

```
https://cdn.jsdelivr.net/gh/alphardex/genshin-replica@main/public/Genshin/Login/
```

一共 16 个文件、约 3 MB（11 个模型 + 5 张贴图），再加 three.js 约 600 KB、Draco
解码器约 200 KB。全部走 CDN，浏览器会缓存，但第一次进登录页确实要等一会。

## 免责声明

本文件是学习性质的技术复刻，**非官方产品**，与米哈游 / HoYoverse 无任何关联，
不用于任何商业目的。

所引用的模型与贴图版权归米哈游所有，本仓库既不转存也不分发，只是通过 `ASSET_BASE`
指向上游的复刻仓库。若权利方认为此举不妥，把 `ASSET_BASE` 置空或删除本文件即可，
届时脚本会自行退出，不会有任何请求发出。
