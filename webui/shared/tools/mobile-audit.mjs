/**
 * 手机宽度下的版式体检。
 *
 *   npm run build:all -- --demo          # 先出演示产物，体检的是真产物不是源码
 *   node webui/shared/tools/mobile-audit.mjs                 # 六款 × 360/390/414
 *   node webui/shared/tools/mobile-audit.mjs material 390    # 只测一款一个宽度
 *
 * 为什么要有这么一个东西：手机上的毛病肉眼看截图很难发现 ——
 * 「按钮被顶出屏幕 11px」和「排版有点挤」长得一模一样，
 * 而 vue-tsc 和单元测试对 CSS 一无所知。这里把问题量化成四类可判定的事实：
 *
 *   横向滚动  文档比视口宽 —— 整页能左右拽，最容易被当成「网站坏了」
 *   溢出      元素伸到视口外，外面又没有可横滚的容器兜着
 *   小目标    可点元素不足 36px，手指够不着
 *   叠压      两个固定/粘性元素互相盖住
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
const PORT = 4173, CDP_PORT = 9222
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
    ['总览', '/'], ['订阅', '/subscriptions'], ['下载', '/downloads'], ['日志', '/logs'],
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
    console.error(`dist/${presets[0]} 不存在，先跑 npm run build:all -- --demo`)
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

const proc = spawn(browser, [
    '--headless=new', `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${join(process.env.TEMP || '/tmp', 'ani-rss-mobile-audit')}`,
    '--no-first-run', '--disable-gpu', '--hide-scrollbars', 'about:blank',
], {stdio: 'ignore'})

let target
for (let i = 0; i < 80; i++) {
    try {
        const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
        target = list.find(t => t.type === 'page')
        if (target) break
    } catch { /* 还没起来 */ }
    await sleep(250)
}
if (!target) { console.error('无头浏览器没起来'); server.close(); proc.kill(); process.exit(1) }

const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise(r => ws.addEventListener('open', r, {once: true}))
let seq = 0
const pending = new Map()
ws.addEventListener('message', e => {
    const m = JSON.parse(e.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
})
const send = (method, params = {}) => new Promise((res, rej) => {
    const id = ++seq
    pending.set(id, m => m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result))
    ws.send(JSON.stringify({id, method, params}))
})
const run = async expression => {
    const r = await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true})
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || '执行失败')
    return r.result.value
}
await send('Page.enable')
await send('Runtime.enable')

const PROBE = await readFile(join(HERE, 'mobile-audit-probe.js'), 'utf8')

let bad = 0
for (const preset of presets) {
    root = join(DIST, preset)
    for (const w of onlyWidth) {
        await send('Emulation.setDeviceMetricsOverride',
            {width: w, height: 844, deviceScaleFactor: 2, mobile: true, screenWidth: w, screenHeight: 844})
        await send('Emulation.setTouchEmulationEnabled', {enabled: true, maxTouchPoints: 5})
        await send('Page.navigate', {url: `http://127.0.0.1:${PORT}/#/`})
        await sleep(1600)
        for (const [name, hash] of ROUTES) {
            await run('location.hash=' + JSON.stringify(hash))
            await sleep(800)
            const r = await run(PROBE)
            const hits = [
                r.doc > r.vw + 1 && `横向滚动：文档 ${r.doc} > 视口 ${r.vw}`,
                ...r.overflow.map(x => `溢出 ${x.l}..${x.rr}：${x.el}`),
                ...r.tap.map(x => `小目标 ${x.w}×${x.h}：${x.el}`),
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
