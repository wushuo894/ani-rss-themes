import {ABOUT, CONFIG, LOGS, listAni, previewAni, TORRENTS} from './data'

/**
 * 演示模式：把 fetch 换成一个只认识 api/ 的假服务端。
 *
 * 为什么拦 fetch 而不是在接口层加分支：接口层是照着后端约定写的，
 * 掺进「如果是演示就返回假数据」的判断，正式产物里也会带着这坨死代码，
 * 而且以后每加一个接口都要记得同步改。拦在最外层，接口层一个字都不用动，
 * 封面图那种走 <img src> 不经过接口层的请求也一起被兜住。
 *
 * 只有 VITE_DEMO=1 的构建会调用它（GitHub Pages 预览），
 * 正式产物里 __DEMO__ 为 false，整个 demo/ 目录会被摇掉。
 */

/** 后端的统一信封 */
const ok = (data: unknown) =>
    new Response(JSON.stringify({code: 200, message: '', data, t: Date.now()}), {
        headers: {'Content-Type': 'application/json'},
    })

/** 现画一张海报占位图：不联网、不打包图片资源，颜色由文件名派生所以每张都不一样 */
function cover(name: string): Response {
    let h = 0
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff
    const hue = h % 360
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="428" viewBox="0 0 300 428">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="hsl(${hue} 70% 62%)"/><stop offset="1" stop-color="hsl(${(hue + 60) % 360} 65% 42%)"/>
</linearGradient></defs>
<rect width="300" height="428" fill="url(#g)"/>
<circle cx="150" cy="170" r="52" fill="rgba(255,255,255,.28)"/>
<text x="150" y="330" fill="rgba(255,255,255,.85)" font-family="sans-serif" font-size="22"
 text-anchor="middle">演示封面</text></svg>`
    return new Response(svg, {headers: {'Content-Type': 'image/svg+xml'}})
}

/** 写操作统一这么回：演示站是只读的，但不能让界面报错 —— 报错看着像坏了 */
const NOOP_HINT = '演示模式：改动不会保存'

export function installDemo(): void {
    const real = globalThis.fetch.bind(globalThis)

    globalThis.fetch = async (input, init) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
        const path = url.split('?')[0].replace(/^.*\/(api\/)/, '$1')

        if (!path.startsWith('api/')) return real(input, init)

        switch (path) {
            case 'api/file':
            case 'api/proxyImage':
                return cover(url)
            case 'api/login':
                return ok('demo-token')
            case 'api/listAni':
                return ok(listAni())
            case 'api/config':
                return ok(CONFIG)
            case 'api/torrentsInfos':
                return ok(TORRENTS)
            case 'api/logs':
                return ok(LOGS)
            case 'api/about':
                return ok(ABOUT)
            case 'api/ping':
                return ok(true)
            case 'api/playList':
                return ok([])
            case 'api/previewAni':
                // 预览要拿请求体里的那条订阅来编数据，才有集数、字幕组和下载位置可看
                return ok(previewAni(JSON.parse(String(init?.body ?? '{}'))))
            case 'api/custom.css':
            case 'api/custom.js':
                return new Response('', {headers: {'Content-Type': 'text/plain'}})
            default:
                // 其余接口（保存、删除、测试连接……）一律「成功但什么也没做」
                return ok(NOOP_HINT)
        }
    }

    // 演示站不该卡在登录页
    localStorage.setItem('authorization', 'demo-token')
}
