# preview/ 目录说明

这个目录只服务于 [预览页](../index.html)，和主题本身无关。装主题不需要它。

## element-plus.css

Element Plus 2.x 的构建产物，**MIT License**，版权归 Element Plus 作者所有。

- 上游：https://github.com/element-plus/element-plus
- 许可证：https://github.com/element-plus/element-plus/blob/dev/LICENSE

放在这里是为了让预览页离线可用、且不依赖任何 CDN —— 预览的意义就是「看到什么样，装上去就是什么样」，所以组件样式必须和 ani-rss 实际用的那份一致。文件是自包含的（内部只有 data URI，没有外部字体或图片请求）。

## app.css

预览页用的布局层，对齐 ani-rss 各组件的 scoped 样式（`.list-card-*`、`.grid-container` 等）的尺寸与排布。

ani-rss 本体是 **GPL-2.0**，所以这里没有复制它的代码，只是按同样的布局数值重写了一份，让预览的排版和真实界面对得上。真实实现以上游为准：

- https://github.com/wushuo894/ani-rss

## preview.js

预览页的交互层：弹窗、下拉、标签页、折叠面板都用 Element Plus 真实的类名与过渡动画
（`dialog-fade` / `el-zoom-in-top` / `el-collapse-transition`），设置里的开关真的作用于列表。
内嵌的 SVG 图标取自 [@element-plus/icons-vue](https://github.com/element-plus/element-plus-icons)（MIT）。

## data.js

番剧数据取自 [Bangumi 每日放送接口](https://api.bgm.tv/calendar)，构建时打的快照。

- 标题、评分、封面地址为 Bangumi 真实数据
- 季度、字幕组、集数、启用状态、更新时间是演示用的虚构字段
- 封面**直链** `lain.bgm.tv`，不落地到本仓库，也就不涉及转载他人作品的封面

要换一批番剧，重新拉一次接口覆盖这个文件即可。

## ani-rss 自己的那层样式

预览页从 jsDelivr 直接热链上游仓库里的 `ani-rss-ui/src/style.css`：

```
https://cdn.jsdelivr.net/gh/wushuo894/ani-rss@master/ani-rss-ui/src/style.css
```

不落地到本仓库，一是避免把 GPL-2.0 的代码混进 MIT 仓库，二是 ani-rss 更新圆角、字体栈之类的东西时预览会自动跟上。

这一条挂了预览也不会崩，只是圆角和字体栈回到 Element Plus 默认值。
