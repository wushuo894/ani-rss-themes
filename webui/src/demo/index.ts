import {
    ABOUT, aniBTList, animeGardenList, CONFIG, EMBY_VIEWS, listAni, LOGS, mikanList,
    playList, previewAni, sourceGroups, TG_CHATS, TORRENTS,
} from './data'

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
            /* 关于页那块界面更新：不给它就会走到 default，
               回一句字符串当成 UpdateInfo，演示站上「已是最新」的判断就成了瞎猜 */
            case 'api/webui/getUpdate':
                return ok({latest: __VERSION__, update: false, autoUpdate: false})
            case 'api/ping':
                return ok(true)
            case 'api/playList':
                return ok(playList(JSON.parse(String(init?.body ?? '{}'))))
            /* 这两个是「拉一下 → 出候选 → 点了填进去」的按钮，
               不给假数据的话演示站上点了永远是「没拉到」 */
            case 'api/getTgUpdates':
                return ok(TG_CHATS)
            case 'api/getEmbyViews':
                return ok(EMBY_VIEWS)
            case 'api/testNotification':
                return ok(null)
            case 'api/newNotification':
                return ok({
                    notificationType: 'TELEGRAM', name: '新通知', enable: true,
                    retry: 3, sort: 9, statusList: [],
                })
            case 'api/previewAni':
                // 预览要拿请求体里的那条订阅来编数据，才有集数、字幕组和下载位置可看
                return ok(previewAni(JSON.parse(String(init?.body ?? '{}'))))
            /* 番剧浏览器：三个源各一个列表接口 + 一个字幕组接口。
               不给假数据的话，演示站里这个新做的按星期浏览面板永远是空的 */
            case 'api/mikan':
                return ok(mikanList())
            case 'api/aniBT':
                return ok(aniBTList())
            case 'api/animeGardenList':
                return ok(animeGardenList())
            case 'api/mikanGroup':
            case 'api/aniBTGroup':
            case 'api/animeGardenGroup':
                return ok(sourceGroups(url))
            case 'api/getThemoviedbGroup':
                // 剧集组挑错了整季集数会错位，演示里给三种典型分法看得出区别
                return ok([
                    {id: 'g1', name: 'Original Air Date', typeName: '播出顺序', groupCount: 1, episodeCount: 24},
                    {id: 'g2', name: 'DVD Order', typeName: 'DVD 顺序', groupCount: 2, episodeCount: 24},
                    {id: 'g3', name: 'Seasons (TMDB)', typeName: '剧集组', groupCount: 3, episodeCount: 36},
                ])
            /* 封面上传：真后端回的是 config/files 下的相对路径，取图时再走 api/file。
               演示这边取图那一跳是 <img src>，拦不住，所以直接回一个内联的图。 */
            case 'api/upload':
                return ok('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
                    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="428">'
                    + '<rect width="300" height="428" fill="#7c5cd6"/>'
                    + '<text x="150" y="220" fill="#fff" font-family="sans-serif" font-size="20"'
                    + ' text-anchor="middle">已上传</text></svg>'))
            // 回空串表示「路径没变」，组件会保留原封面
            case 'api/refreshCover':
                return ok('')
            case 'api/downloadPath':
                // 「填入默认位置」要有东西可填，不然点了跟没反应一样
                return ok({downloadPath: '/downloads/anime/${title}/Season ${season}'})
            case 'api/getThemoviedbName':
                return ok({themoviedbName: '演示番剧 (2026)', tmdb: {id: '123456'}})
            case 'api/rssToAni': {
                /*
                 * 这一步是「拿一条 RSS 地址反查出一条**还没入库**的订阅」，
                 * 所以回的东西必须没有 id，url 必须就是刚递进来的那条。
                 *
                 * 原来直接回了列表里的第一条 —— 它带着 id，也带着别人的地址。
                 * 于是演示站里「新建」和「编辑」分不出来：只在新建时才该藏起来的东西
                 * （预览面板里的「删除种子」要拿订阅 id 去下载器里找任务）永远测不到，
                 * 确认框里显示的地址也不是刚挑的那条。
                 */
                const dto = JSON.parse(String(init?.body ?? '{}'))
                const base = {...listAni().weekList[0].items[0]}
                delete base.id
                return ok({
                    ...base,
                    url: dto.url,
                    bgmUrl: dto.bgmUrl || base.bgmUrl,
                    subgroup: dto.subgroup || base.subgroup,
                })
            }
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
