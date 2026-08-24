# 站点图标

文件在 `webui/public/`，这份说明单独放在外面 —— `public/` 是原样拷进产物的，
放进去就会跟着每一款界面发出去。

**图形是上游 ani-rss 的，不是自己画的。** 标签页图标、书签、装到主屏之后的应用图标，
认的都是这几张 —— 和自带界面对不上的话，同一个后端会在浏览器里显示成两个不同的应用。

原图取自 [`ani-rss-ui/public/icon-512.png`](https://github.com/wushuo894/ani-rss/blob/master/ani-rss-ui/public/icon-512.png)（512×512，带透明底）。

| 文件 | 尺寸 | 底 | 谁在用 |
| --- | --- | --- | --- |
| `favicon.ico` | 16 / 32 / 48 | 透明 | 老浏览器；上游 `index.html` 只声明这一条 |
| `favicon-32.png` | 32 | 透明 | 标签页 |
| `icon-192.png` | 192 | 透明 | manifest、Service Worker 预缓存、快捷方式 |
| `icon-512.png` | 512 | 透明 | manifest（开屏图） |
| `icon-maskable-512.png` | 512 | 纯白铺满 | Android 自适应图标 —— 系统按自己的形状裁，底色必须铺满，图形缩到 62% 让开安全区 |
| `apple-touch-icon.png` | 180 | 纯白 | iOS 主屏。它不读 manifest 的 icons，也不认透明（透明会被合成成黑底），所以单独一张 |

## 怎么重做

上游换了图再跑一次就行（要 Python 和 Pillow）：

```python
from PIL import Image
src = Image.open('icon-512.png').convert('RGBA')          # 上游那张

def transparent(size):
    return src.resize((size, size), Image.LANCZOS).quantize(colors=256, method=Image.FASTOCTREE)

def on_white(size, scale):                                 # scale < 1 就是缩进安全区
    canvas = Image.new('RGB', (size, size), (255, 255, 255))
    n = round(size * scale)
    art = src.resize((n, n), Image.LANCZOS)
    canvas.paste(art, ((size - n) // 2,) * 2, art)
    q = canvas.quantize(colors=256, method=Image.FASTOCTREE)
    # 量化会把纯白挪成 (254,254,254)，和 manifest 的 background_color 差一档，
    # 开屏时能看出一道边 —— 把角落那个色位钉回纯白
    pal = bytearray(q.getpalette())
    i = q.getpixel((1, 1))
    pal[i * 3:i * 3 + 3] = b'\xff\xff\xff'
    q.putpalette(bytes(pal))
    return q

transparent(512).save('icon-512.png', optimize=True)
transparent(192).save('icon-192.png', optimize=True)
transparent(32).save('favicon-32.png', optimize=True)
on_white(180, 1.0).save('apple-touch-icon.png', optimize=True)
on_white(512, 0.62).save('icon-maskable-512.png', optimize=True)
src.resize((48, 48), Image.LANCZOS).save('favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
```

**256 色调色板这一步不能省。** 上游那张 512 是没优化过的真彩色导出，128KB；
一款界面的整包才 1.2MB，十一款一起就是多出 1.4MB。量化后 12KB，
放到 512 上和原图肉眼分不出（薯条本来就是几块平涂加一点渐变）。

原来这里的图是 `shared/tools/gen-icons.mjs` 画出来的 —— 一个绿色圆角方块加一个 RSS 标记，
「规则比图省事」。换成上游的图形之后那条理由就不成立了：图形不再是一组能改的数，
而是上游的一份资产，要换只能回上游拿。所以生成器删掉，图直接入库，
换图的做法写在上面这段里。
