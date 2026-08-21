# 随产物一起发的字体

三份，都是 SIL Open Font License 1.1，许可全文各自放在同目录：

| 文件 | 是什么 | 大小 | 谁在用 | 许可 |
| --- | --- | --- | --- | --- |
| `ark-pixel-12px-zh_cn.woff2` | [方舟像素字体](https://github.com/TakWolf/ark-pixel-font) 12px 比例版，中西文点阵 | 537 KB | `win98` / `macintosh` | `OFL-ark-pixel.txt` |
| `inter-latin-wght.woff2` | [Inter](https://github.com/rsms/inter) 可变字重，只有拉丁 | 48 KB | `vue` | `OFL-inter.txt` |
| `roboto-latin-wght.woff2` | [Roboto](https://github.com/googlefonts/roboto) 可变字重，只有拉丁 | 43 KB | `material` | `OFL-roboto.txt` |

## 为什么要自带

三款界面的身份都系在一款具体的字上，而那三款字**在用户机器上基本都不存在**：

- `vue` 的字体栈第一位写着 Inter —— 装了 Inter 的人少之又少
- `material` 写着 Roboto —— 只有安卓自带，Windows / macOS / iOS 一个都没有
- `win98` 原本写的是 `"MS Sans Serif", Tahoma, Verdana` —— 手机上一个都没有

也就是说：不带字体的话，这三款最标志性的那件东西在多数机器上根本没生效，
落到的是系统默认的 UI 字体。「看着不像」的第一原因往往就是这个，跟配色和圆角都没关系。

拉丁那两份只带拉丁：中文那份要 5MB 以上，而 VitePress 和 M3 的中文版本来也是
把汉字交给系统字体的 —— 字体栈里 Inter / Roboto 后面接的 PingFang、思源黑体就是干这个的。
字体文件里没有汉字，浏览器会自动往后找，不需要写 `unicode-range`。

## 点阵字为什么不是 MS Sans Serif

中文版 Windows 98 的界面字**不是** MS Sans Serif —— 那是英文版的。
简体中文版整套界面（菜单、按钮、标题栏）用的是 12px 的宋体点阵，
连里面的英文和数字也是宋体自带的那套点阵拉丁字形。
所以复刻中文界面要的是「一套 12px 点阵中西文」，不是「英文点阵 + 中文回落到黑体」。

试过后者：98.css 那份 Pixelated MS Sans Serif 只有 6KB，很香，但它是按 **11px** 设计的
（unitsPerEm 2048，每个字宽都是 2048/11 的整数倍），而中文点阵字普遍是 12px 一格。
两者拼在一起，必然有一边不在整数像素上 —— 点阵字的笔画只有 1px 宽，
放大 1.09 倍就糊成一团灰，比直接用系统黑体还难看。

方舟像素 12px：`unitsPerEm = 1200`，所有字宽都是 100 的整数倍 —— **一格正好一个像素**。
所以字号只能取 12 的整数倍（12 / 24），中西文同一套网格，一个字都不糊。
上升 1300 + 下降 300 = 1600，即 12px 字对应 16px 行高，这也是排版时该用的数。

`macintosh` 也用这一份：Chicago 是苹果的字不能带，也没有带中文的 Chicago 替代品；
那个年代的屏幕字本来就都是点阵，区别在字重和排版，不在「是不是点阵」。
它靠皮肤里那条「错开一像素再描一遍」把标题栏和按钮加粗到 Chicago 的厚度 ——
那正是当年点阵字加粗的做法，描出来仍然是实心像素，一点不糊。

## 挂在哪一层

`@font-face` 写在**预设**的 `preset.css` 里（`src/presets/<id>/preset.css`），
不写在皮肤里。两个原因：

1. 皮肤（`shared/themes/registry.ts`）是一段运行时注入的字符串，拿不到构建期的资源路径；
2. 皮肤是九款共享的，写在那里等于把三份字体塞进全部九个发布包 —— 而每份字只有一款在用。

皮肤只负责在字体栈里点名（`"Ark Pixel 12px"` / `Inter` / `Roboto`），
两边靠字体族名对上。**代价**：拿 win98 皮肤配别款外壳时点阵字不在产物里，
会回落到后面的系统字体栈 —— 这是有意的，一份 537KB 没道理跟着另外八款一起发。
