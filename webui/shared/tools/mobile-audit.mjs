/**
 * 手机宽度下的版式体检。
 *
 *   pnpm run build:all -- --demo          # 先出演示产物，体检的是真产物不是源码
 *   node webui/shared/tools/mobile-audit.mjs                 # 十一款 × 360/390/414
 *   node webui/shared/tools/mobile-audit.mjs material 390    # 只测一款一个宽度
 *
 * 为什么要有这么一个东西：手机上的毛病肉眼看截图很难发现 ——
 * 「按钮被顶出屏幕 11px」和「排版有点挤」长得一模一样，
 * 而 vue-tsc 和单元测试对 CSS 一无所知。这里把问题量化成几类可判定的事实：
 *
 *   横向滚动  文档比视口宽 —— 整页能左右拽，最容易被当成「网站坏了」
 *   溢出      元素伸到视口外，外面又没有可横滚的容器兜着
 *   小目标    可点元素不足 36px，手指够不着
 *   折行      按钮、标签上的短词被挤成两行 —— 换台宽一点的手机看又是好的
 *   叠压      两个固定/粘性元素互相盖住
 *   贴在一起  相邻两颗按钮之间不足 4px —— 分不出是两颗还是一条
 *
 * 用无头浏览器而不是 jsdom：这几样全要真实布局，jsdom 不排版。
 * 开的是 mobile 模拟档（hover:none / pointer:coarse），
 * 跟真手机一致 —— 用桌面档跑的话，只在触屏上常驻的那排按钮会以悬停态入镜，报一堆假阳性。
 *
 * 没装 Chrome/Edge 就跳过并退出 0：这是辅助工具，不该卡住别人的构建。
 */

import {createServer} from 'node:http'
import {readFile} from 'node:fs/promises'
import {existsSync} from 'node:fs'
import {join, extname, normalize, dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawn} from 'node:child_process'

const HERE = dirname(fileURLToPath(import.meta.url))
const DIST = resolve(HERE, '../../dist')
/*
 * 调试端口刻意不用 9222。
 *
 * 9222 是 DevTools 的默认端口，本机随便一个开了远程调试的浏览器都在上面 ——
 * Claude 的浏览器扩展就是。抢不到端口时 Chrome 不报错，只是不监听，
 * 而 /json/list 照样连得上 —— 连上的是别人那台：体检于是跑去驱动用户正开着的浏览器，
 * 拿到的目标是某个扩展设置页，navigate 过去也等不到我们的页面，就这么挂住不动。
 * 换一个没人用的端口，并在连之前确认对面确实是无头的那台。
 */
const PORT = 4173, CDP_PORT = 9273
/*
 * 款式清单从 ids.ts 读，不在这儿再抄一遍 —— 抄了就会漏，
 * 表现是新加的那款静悄悄没被体检过。
 * 用正则而不是 import：这个脚本是当 .mjs 直接跑的，import 一个 .ts 得带上
 * --experimental-strip-types，多一个前提就多一处能坏的地方。
 */
const IDS_TS = await readFile(resolve(HERE, '../../src/presets/ids.ts'), 'utf8')
const PRESETS = [...IDS_TS.match(/PRESET_IDS\s*=\s*\[([^\]]*)]/)[1].matchAll(/'([^']+)'/g)].map(m => m[1])
const WIDTHS = [360, 390, 414]
const ROUTES = [
    ['总览', '/dashboard'], ['订阅', '/subscriptions'], ['下载', '/downloads'], ['日志', '/logs'],
    ['设置·下载', '/settings/download'], ['设置·基本', '/settings/basic'],
    ['设置·排除', '/settings/exclude'], ['设置·代理', '/settings/proxy'],
    ['设置·登录', '/settings/login'], ['设置·通知', '/settings/notification'],
    ['设置·捐赠', '/settings/afdian'], ['设置·关于', '/settings/about'], ['登录', '/login'],
]

const CANDIDATES = [
    process.env.CHROME_PATH,
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean)

const browser = CANDIDATES.find(p => existsSync(p))
if (!browser) {
    console.log('没找到 Chrome / Edge，跳过版式体检（设 CHROME_PATH 可指定）')
    process.exit(0)
}

const only = process.argv[2]
const onlyWidth = process.argv[3] ? [+process.argv[3]] : WIDTHS
const presets = only ? [only] : PRESETS
if (!existsSync(join(DIST, presets[0]))) {
    console.error(`dist/${presets[0]} 不存在，先跑 pnpm run build:all -- --demo`)
    process.exit(1)
}

const sleep = ms => new Promise(r => setTimeout(r, ms))
const TYPES = {
    '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
    '.woff2': 'font/woff2', '.ico': 'image/x-icon',
}

let root = join(DIST, presets[0])
const server = createServer(async (req, res) => {
    const p = decodeURIComponent(req.url.split('?')[0])
    /*
     * 不给 Service Worker。
     *
     * 十一款是轮流从同一个 127.0.0.1:4173 上发出去的，装上 SW 之后它会横插进每一个请求，
     * 量到的就不是「这套界面本身排得怎么样」了，而且每换一款都要重新装一遍，慢得离谱。
     * 直接 404，注册会失败 —— main.ts 里那句 catch 就是为这种场合留的，页面照常。
     */
    if (p === '/sw.js') { res.writeHead(404); return res.end('no sw here') }
    try {
        const buf = await readFile(join(root, normalize(p)))
        res.writeHead(200, {'content-type': TYPES[extname(p)] || 'application/octet-stream'})
        res.end(buf)
    } catch {
        try {
            res.writeHead(200, {'content-type': 'text/html'})
            res.end(await readFile(join(root, 'index.html')))
        } catch { res.writeHead(404); res.end('x') }
    }
})
await new Promise(r => server.listen(PORT, '127.0.0.1', r))

/*
 * 关掉扩展和代理。
 *
 * 体检量的是「这套界面在 390px 上排得对不对」，不该受本机装了什么影响 ——
 * 广告拦截插件会改 DOM，代理插件会把 127.0.0.1 也绕出去，两样都能让结论变成假的。
 * 顺手也快很多。
 */
const proc = spawn(browser, [
    '--headless=new', `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${join(process.env.TEMP || '/tmp', 'ani-rss-mobile-audit')}`,
    '--no-first-run', '--disable-gpu', '--hide-scrollbars',
    '--disable-extensions', '--no-proxy-server', '--disable-background-networking',
    '--disable-sync', '--disable-features=Translate,MediaRouter',
    'about:blank',
], {stdio: 'ignore'})

let target
for (let i = 0; i < 80; i++) {
    try {
        /* 先认人：不是无头的那台就不碰 —— 宁可报错，也不要去动用户自己开着的浏览器 */
        const ver = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json()
        if (!/Headless/i.test(ver['User-Agent'] || '')) {
            console.error(`127.0.0.1:${CDP_PORT} 上是另一台浏览器（${ver.Browser}），不是体检自己起的那台。`)
            console.error('把占着这个端口的浏览器关掉，或者改 CDP_PORT 再来。')
            server.close(); proc.kill(); process.exit(1)
        }
        const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
        target = list.find(t => t.type === 'page')
        if (target) break
    } catch { /* 还没起来 */ }
    await sleep(250)
}
if (!target) { console.error('无头浏览器没起来'); server.close(); proc.kill(); process.exit(1) }

/*
 * 连不上就退，别死等。
 *
 * 上一次跑剩下的浏览器还占着 9222 时，/json/list 拿回来的是它的目标，
 * 而那条 WebSocket 地址早就失效 —— open 事件永远不来。
 * 表现是进程挂着不动、一个字都不输出（stdout 重定向时是块缓冲，退出才刷），
 * 看上去像体检特别慢，实际是永远等下去，端口也一直不放。
 */
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('连不上无头浏览器的调试端口 —— 多半是上一次跑剩的进程还占着，杀掉再来')), 15000)
    ws.addEventListener('open', () => { clearTimeout(t); res() }, {once: true})
    ws.addEventListener('error', () => { clearTimeout(t); rej(new Error('调试端口连接出错')) }, {once: true})
}).catch(e => { console.error(e.message); server.close(); proc.kill(); process.exit(1) })
let seq = 0
const pending = new Map()
ws.addEventListener('message', e => {
    const m = JSON.parse(e.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
})
/*
 * 每条命令都带超时。
 *
 * 动作那一项要在页面里点开菜单再等一会儿，用的是 awaitPromise ——
 * 页面里的 promise 万一不落地（弹层挡住点击、定时器被节流），
 * 这边就是无限等：进程不退、端口不放，下一次跑直接 EADDRINUSE，
 * 而且看不出是哪一步卡的。宁可报错也不要挂着。
 */
const send = (method, params = {}, ms = 20000) => new Promise((res, rej) => {
    const id = ++seq
    const timer = setTimeout(() => {
        pending.delete(id)
        rej(new Error(`${method} 超时 ${ms}ms`))
    }, ms)
    pending.set(id, m => {
        clearTimeout(timer)
        m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result)
    })
    ws.send(JSON.stringify({id, method, params}))
})
const run = async expression => {
    const r = await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true})
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || '执行失败')
    return r.result.value
}
await send('Page.enable')
await send('Runtime.enable')
/* 十一款轮流从同一个地址发出去，文件名带哈希不会撞，但 index.html 会 ——
   关掉缓存，免得第二款拿到第一款的那份 */
await send('Network.enable')
await send('Network.setCacheDisabled', {cacheDisabled: true})

const PROBE = await readFile(join(HERE, 'mobile-audit-probe.js'), 'utf8')
const ACTIONS = await readFile(join(HERE, 'mobile-audit-actions.js'), 'utf8')

let bad = 0
for (const preset of presets) {
    root = join(DIST, preset)
    for (const w of onlyWidth) {
        await send('Emulation.setDeviceMetricsOverride',
            {width: w, height: 844, deviceScaleFactor: 2, mobile: true, screenWidth: w, screenHeight: 844})
        await send('Emulation.setTouchEmulationEnabled', {enabled: true, maxTouchPoints: 5})
        /* 报一下进度：十一款 × 三个宽度 × 十三条路由要跑二十几分钟，
           不出声的话看起来跟卡死了一样，人就会去按 Ctrl-C */
        console.log(`· ${preset} @${w}px …`)
        /*
         * 先回 about:blank 再进去 —— 这一步不能省。
         *
         * Page.navigate 到一个只有**片段**不同的地址（上一轮停在 #/login，这里要去 #/），
         * 浏览器当成同文档跳转：不重新加载，只改 hash。而每一款是靠 `root` 换目录发出去的，
         * 文档不重载 = 换的那一款根本没被打开 —— 一次跑十一款，量的是同一款十一遍，
         * 而且十一次全绿。这种「假绿」比报错危险得多：它看着像做过了。
         *
         * 先跳去 about:blank，地址就不再是「只有片段不同」，下一跳必然是真加载。
         * （一款一款分开跑时碰不到这个坑，所以它藏了很久。）
         */
        await send('Page.navigate', {url: 'about:blank'})
        await sleep(120)
        await send('Page.navigate', {url: `http://127.0.0.1:${PORT}/#/`})
        await sleep(1600)
        for (const [name, hash] of ROUTES) {
            await run('location.hash=' + JSON.stringify(hash))
            await sleep(800)
            const r = await run(PROBE)
            /* 订阅页额外查一遍「八个动作一个都没丢」，见 mobile-audit-actions.js */
            /* 这一项要真点一下菜单，卡住了就当成一条问题记下来，别把整轮拖死 */
            let acts = null
            if (hash === '/subscriptions') {
                try { acts = await run(ACTIONS) } catch (e) { acts = {missing: [], hadMenu: true, err: e.message} }
            }
            const hits = [
                ...(acts?.missing ?? []).map(t => `动作丢了：「${t}」既不在图标行上，也不在「更多」菜单里`),
                acts && !acts.hadMenu && '这一款订阅页上找不到「更多」菜单（title 得是 更多/操作/展开操作）',
                acts?.err && `动作检查没跑成：${acts.err}`,
                r.doc > r.vw + 1 && `横向滚动：文档 ${r.doc} > 视口 ${r.vw}`,
                ...r.overflow.map(x => `溢出 ${x.l}..${x.rr}：${x.el}`),
                ...r.tap.map(x => `小目标 ${x.w}×${x.h}：${x.el}`),
                ...r.clipped.map(x => `文字放不下：「${x.text}」要 ${x.need}px，只有 ${x.room}px —— ${x.el}`),
                ...(r.wrapped ?? []).map(x => `标签折成了两行：「${x.text}」—— ${x.el}`),
                ...(r.offgrid ?? []).map(x => `字号不在点阵网格上：${x.fs}px（必须是 12 的整数倍）—— ${x.el}`),
                ...(r.glued ?? []).map(x => `按钮贴在一起：只隔 ${x.gap}px —— ${x.a} × ${x.b}`),
                ...r.overlap.map(x => `叠压 ${x.ox}×${x.oy}：${x.a} × ${x.b}`),
            ].filter(Boolean)
            if (!hits.length) continue
            bad += hits.length
            console.log(`✗ ${preset} @${w}px ${name}`)
            for (const h of hits) console.log(`    ${h}`)
        }
    }
}

console.log(bad ? `\n共 ${bad} 处` : `✓ ${presets.length} 款 × ${onlyWidth.length} 个宽度 × ${ROUTES.length} 条路由，版式没有问题`)
ws.close(); proc.kill(); server.close()
process.exit(bad ? 1 : 0)
