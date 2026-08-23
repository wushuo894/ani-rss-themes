# 生成器

前两个脚本都从 ani-rss 的**源码**直接抽，不手抄、不靠猜。

先把上游拉下来（浅克隆即可）：

```bash
git clone --depth 1 -b test https://github.com/wushuo894/ani-rss upstream
```

## gen-types.mjs

从 Java 实体生成 `webui/shared/types.ts`。

```bash
node webui/shared/tools/gen-types.mjs upstream            # 默认写回 webui/shared/types.ts
node webui/shared/tools/gen-types.mjs upstream out.ts     # 指定输出
```

**带自校验**：生成的字段数必须等于源码里的 `private` 字段数，对不上直接退出非 0。
这道校验不是形式主义 —— 开发过程中它揪出过 4 个静默丢字段的解析 bug：

- 注解里的嵌套括号（`@Schema(description = "密码 (MD5摘要)")`）会吞掉整个字段
- 类注释的捕获跨过类声明，吞掉每个类的第一个字段
- 靠缩进猜类边界，两层嵌套的内部类解析错
- 跨文件的内部类引用（`List<Mikan.Group>`）没解析成扁平名

全都不报错，只是少东西。上游改字段后重跑一次，diff 就是本次接口变更。

## extract-api.mjs

从 controller 抽出全部端点，生成 `spec-api.md`。

```bash
node webui/shared/tools/extract-api.mjs upstream
```

同样带自校验：抽出的端点必须覆盖源码里声明的每一条 mapping 路径。
当前结果为 66 个端点 / 22 个 controller。

## mobile-audit.mjs

手机宽度下的版式体检，跑的是构建产物不是源码。

```bash
npm run build:all -- --demo                          # 先出产物
node webui/shared/tools/mobile-audit.mjs             # 九款 × 360/390/414 × 13 条路由
node webui/shared/tools/mobile-audit.mjs material 390 # 只测一款一个宽度
```

报四类事实：整页横向滚动、元素伸出视口、可点元素不足 36px、固定元素压住按钮。
一律排除掉本来就该那样的情况 —— 外层有横滚容器的、收起来的抽屉里的、
评分那排当刻度用的星星。开的是 mobile 模拟档（`hover: none` / `pointer: coarse`），
跟真手机一致；用桌面档跑会把只在触屏常驻的按钮以悬停态算进来，报一堆假阳性。

没装 Chrome/Edge 就跳过并退出 0。`CHROME_PATH` 可指定浏览器。

## dialog-check.mjs

「添加订阅」那条链路的行为体检，跑的也是构建产物。

```bash
npm run build:all -- --demo                             # 先出演示产物
npm run test:dialogs                                    # 九款轮流跑
node webui/shared/tools/dialog-check.mjs synology       # 只跑一款
```

它不看像素，只把 `window.fetch` 包一层记流水，然后核对发出去的东西。

前两条的判据是**换了番剧来源之后，请求里不能带上一家的东西** ——
已经栽过两次，都是同一个形状：三家番剧源共用同一个弹窗实例，
上一家的列表 / 字幕组缓存 / 挑回来的 Bgm 条目留在原地。

- 拿 Mikan 的番剧页地址当 AniBT 的番剧 id 发出去，后端转给对面，回 400
- 在 Mikan 挑好一个字幕组，切到 AniBT 手填地址再解析，
  A 番的 Bgm 条目和匹配规则会一起递过去 —— 建出来的订阅指着 B 的 RSS，名字却是 A 的

第三条查的是新建订阅那一步的「预览」在不在。它一度被和「其他」一起藏了，
理由写的是「新建的还没入库」—— 那句话对「其他」（刷新、刮削）成立，对预览不成立：
`api/previewAni` 是把整条订阅放在请求体里发的，入没入库不相干。

三样在界面上都看不出来，vue-tsc 和版式体检也都看不见。

九款轮流跑：三条路走的是同一批共用组件，但入口按钮是各款自己画的（「添加订阅」/
「新增」/「新建订阅…」），只测一款的话别的款入口断了不会有人知道。
款式清单从 `src/presets/ids.ts` 读，不在这儿抄第二份。

没装 Chrome/Edge 就跳过并退出 0。`CHROME_PATH` 可指定浏览器。

## dialog-layout.mjs

版式体检：把每一个弹窗真的打开、每一页真的翻到，量里面有没有东西被容器裁掉。

```bash
npm run build:all -- --demo                            # 先出演示产物
npm run test:layout                                    # 九款 × 1400/390 × 全部场景
node webui/shared/tools/dialog-layout.mjs vue 1400     # 只跑一款一个宽度
node webui/shared/tools/dialog-layout.mjs vue 1400 页面 # 再筛场景名（逗号分隔）
```

一次只能跑一个：脚本占着固定的 4175 / 9275 两个端口，
并排开两个第二个直接 `EADDRINUSE` 挂掉。

和 `mobile-audit.mjs` 的分工在**尺子不一样**：那一份拿视口量，
这一份拿「最近一个会裁剪的祖先」量。容器自己是 `overflow: hidden` 的，
被切掉的按钮永远跑不到视口外面去 —— 视口那把尺子一次都没响过，
而人眼看到的是「按钮只剩半截、右边没有留白」。

**弹窗和页面一起量。** 原来只扫 `.v-overlay--active` 里的东西，于是
「登录设置页右边的开关被切掉 4px」这种页面上的裁剪，十八轮体检一次都没量过 ——
不是量过了没响，是压根没进过取景框，而它和「量过了没问题」长得一模一样。
页面场景只取 `.v-main`：外壳自己的顶栏/侧栏/任务栏是 fixed 或者本来就要裁的，
扫进来全是噪声。设置页八个标签逐个翻 —— 每个都是独立的 `v-tabs-window-item`，
不翻过去就不知道里面的控件贴着哪条边。

报三类事实：

- **左边被切掉** 元素伸到裁剪容器的内容原点左边。LTR 下 `scrollWidth` 不算这一段，
  所以它滚也滚不出来，比右边溢出更严重
- **右边被切掉** 元素伸出右边，而容器**不能横滚** —— 滚不到就是看不见。
  能横滚的整片不报：星期条、麦金塔那排标签、宽表格都是设计如此，
  滚得到就等于看得见（试过拿「溢出多少」当筛子分辨意外和故意，分不开：
  麦金塔那排在 390px 上正好只溢出 23px）
- **啃进了留白** 元素离容器边比容器自己写的 `padding` 还近 —— 「只有左边距没有右边距」
  这句话量出来就是这一条。尺子必须是容器自己声明的 padding，
  不能拿「左边最近的 vs 右边最近的」去比：按钮条本来就右对齐，那样比出来全是假阳性
- **贴着裁剪边** 控件静止时就严丝合缝地顶着裁剪边，`hover` 抬一下、`focus` 亮个圈
  就会被削掉。前三条量的都是「已经被切掉了多少」，这一条量的是「还剩几个像素的活动余量」——
  「浏览番剧列表那颗按钮悬停动画被挡住」只有这条量得到：它静止时一个像素都没被切，
  上方余量正好是 0

天生该横滚的容器（标签栏、星期条、宽表格）整片排除。
第四条另外还排两种「看着像、其实不是」的：**藏起来的**（海报卡右下角那排操作键静止时
是 `opacity: 0` 且被 translate 到贴边，鼠标移上去才归位到 `bottom: 8px`）——
所以看不看得见要连着祖先一起判，只看元素自己会把九款海报流全报一遍；
以及**容器只比控件大一点点的**（分段按钮为了圆角要 `overflow: hidden`，
里面的按钮本来就该填满它），那种容器是控件自己的外框，不是裁剪边。

改完这条规则一定要反过来验一次「它还抓不抓得到」：把 spacing.css 里
`.v-tabs-window` 那圈留白在运行时按掉，登录设置和添加订阅两处必须重新报出来。
只看「全绿」是分不出「修好了」和「规则写废了」的。

第一次跑就逮到 `AniEditDialog`：`<v-row>` 直接摆在 `<v-tabs-window-item>` 里，
而 v-row 自带 `margin: -12px`（本该由父级的 padding 抵消），v-window 又是裁剪容器 ——
左边 12px 被切掉、右边 12px 变成一条挂在表单底下的横向滚动条，一拖整排字段就错位。
第二个是 `RateDialog` 的十颗星：手机上最后一颗顶进右边的留白里。

入口按钮是各款自己画的，「合集下载」「导入订阅」在窄的那几款收在标题栏的「⋯」里，
找不到就把每个菜单依次召开再找一遍 —— 不这么做这两个弹窗永远显示「入口没走通」，
看着像跳过，实际是从来没量过。

没装 Chrome/Edge 就跳过并退出 0。`CHROME_PATH` 可指定浏览器。
