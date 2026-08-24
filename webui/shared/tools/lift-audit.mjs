/**
 * 悬停抬起的体检：抬起的那道阴影，画在没有圆角的元素上了吗？
 *
 *   pnpm run build:all -- --demo     # 先出演示产物，体检的是真产物不是源码
 *   pnpm run test:lift               # 十一款 × 四条主路由
 *   node webui/shared/tools/lift-audit.mjs acg   # 只跑一款
 *
 * 为什么值得单开一份：`.ani-lift:hover` 的 box-shadow 是画在**挂着这个类的那个元素**
 * 身上的，而阴影按该元素自己的 border-radius 铺。一旦这个类被挂到外面那层
 * 排版用的格子上（它没有圆角），里面的卡片是圆的、阴影却是方的 ——
 * 圆角卡片四周就各露出一块方角。acg 总览的海报轨道就这么错过：
 * `ani-lift` 挂在 `.rail-item` 上，圆角在里面的 `.tile` 上，
 * 静止时一切正常、只有悬停才露出来，连着三轮用户反馈才定位到。
 *
 * 这一份不需要真的去悬停：阴影跟不跟圆角，看的是 computed border-radius，
 * 静态就能判定 —— 也就绕开了「无头默认 prefers-reduced-motion: reduce
 * 会把悬停整段关掉」这个坑。
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
/* 端口避开 9222（DevTools 默认）以及另外几份体检占的 9273 / 9274 / 9275 */
const PORT = 4176, CDP_PORT = 9276

/* 款式清单从 ids.ts 读，不在这儿再抄一遍 —— 抄了就会漏 */
const IDS_TS = await readFile(resolve(HERE, '../../src/presets/ids.ts'), 'utf8')
const ALL = [...IDS_TS.match(/PRESET_IDS\s*=\s*\[([^\]]*)]/)[1].matchAll(/'([^']+)'/g)].map(m => m[1])
const only = process.argv[2]
const PRESETS = only ? [only] : ALL
const ROUTES = ['/dashboard', '/subscriptions', '/downloads', '/logs']

const CANDIDATES = [
    process.env.CHROME_PATH,
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean)

const browser = CANDIDATES.find(p => existsSync(p))
if (!browser) {
    console.log('没找到 Chrome / Edge，跳过悬停体检（设 CHROME_PATH 可指定）')
    process.exit(0)
}

const TYPES = {
    '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
    '.woff2': 'font/woff2', '.ico': 'image/x-icon',
}

let preset = PRESETS[0]
const server = createServer(async (req, res) => {
    const p = decodeURIComponent(req.url.split('?')[0])
    // 演示产物里带 service worker，体检不要它插手
    if (p === '/sw.js') { res.writeHead(404); return res.end('no sw') }
    const root = join(DIST, preset)
    try {
        const buf = await readFile(join(root, normalize(p)))
        res.writeHead(200, {'content-type': TYPES[extname(p)] || 'application/octet-stream'})
        res.end(buf)
    } catch {
        if (res.headersSent) return res.end()
        try {
            res.writeHead(200, {'content-type': 'text/html'})
            res.end(await readFile(join(root, 'index.html')))
        } catch { if (!res.headersSent) res.writeHead(404); res.end('x') }
    }
})
await new Promise(r => server.listen(PORT, '127.0.0.1', r))

const proc = spawn(browser, [
    '--headless=new', `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${join(process.env.TEMP || '/tmp', 'ani-rss-lift-audit')}`,
    '--no-first-run', '--disable-gpu', '--hide-scrollbars', '--disable-extensions',
    '--no-proxy-server', '--disable-background-networking', '--disable-sync',
    '--disable-features=Translate,MediaRouter', 'about:blank',
], {stdio: 'ignore'})

const sleep = ms => new Promise(r => setTimeout(r, ms))

let target
for (let i = 0; i < 80; i++) {
    try {
        const ver = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json()
        // 端口被别人占住时连上的是别人那台浏览器，体检就跑去驱动用户正开着的窗口了
        if (!/Headless/i.test(ver['User-Agent'] || '')) {
            console.error(`端口 ${CDP_PORT} 上不是无头浏览器，停下`)
            process.exit(1)
        }
        const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
        target = list.find(t => t.type === 'page')
        if (target) break
    } catch { /* 还没起来 */ }
    await sleep(250)
}
if (!target) { console.error('浏览器没起来'); process.exit(1) }

const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('连不上调试端口')), 15000)
    ws.addEventListener('open', () => { clearTimeout(t); res() }, {once: true})
})
let seq = 0
const pending = new Map()
ws.addEventListener('message', e => {
    const m = JSON.parse(e.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
})
const send = (method, params = {}) => new Promise((res, rej) => {
    const id = ++seq
    const t = setTimeout(() => { pending.delete(id); rej(new Error(`${method} 超时`)) }, 30000)
    pending.set(id, m => { clearTimeout(t); m.error ? rej(new Error(m.error.message)) : res(m.result) })
    ws.send(JSON.stringify({id, method, params}))
})
const run = async expression => {
    const r = await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true})
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || '执行失败')
    return r.result.value
}

await send('Page.enable')
await send('Runtime.enable')
await send('Network.enable')
await send('Network.setCacheDisabled', {cacheDisabled: true})
await send('Emulation.setDeviceMetricsOverride',
    {width: 1400, height: 900, deviceScaleFactor: 1, mobile: false})

/* 只报「自己没圆角、里面却装着一张几乎同宽的圆角卡片」——
   `.ani-lift` 挂在一个本来就是方的东西上（比如 win98 那款）是正常的，不该报。 */
const PROBE = `
(() => {
  const square = r => /^0px( 0px)*$/.test(String(r).trim())
  const out = []
  for (const el of document.querySelectorAll('.ani-lift')) {
    const box = el.getBoundingClientRect()
    if (box.width < 3 || box.height < 3) continue
    if (!square(getComputedStyle(el).borderRadius)) continue
    const kid = [...el.querySelectorAll('*')].find(k => {
      const kb = k.getBoundingClientRect()
      return !square(getComputedStyle(k).borderRadius) && kb.width > box.width * 0.8 && kb.height > box.height * 0.8
    })
    if (kid) out.push(String(el.className).slice(0, 46) + '  →  里面圆的是 .'
      + String(kid.className).split(' ')[0] + ' (' + getComputedStyle(kid).borderRadius + ')')
  }
  return [...new Set(out)]
})()`

let bad = 0
for (const p of PRESETS) {
    preset = p
    process.stdout.write(`· ${p} …`)
    let hitsForPreset = 0
    for (const route of ROUTES) {
        /* 换款之前必须先回 about:blank：只有 hash 不同的地址算同文档跳转，
           不重新加载 —— 那等于把同一款量了 N 遍，还 N 次全绿 */
        await send('Page.navigate', {url: 'about:blank'})
        await sleep(120)
        await send('Page.navigate', {url: `http://127.0.0.1:${PORT}/#${route}`})
        await sleep(1600)
        let hits = []
        try { hits = await run(PROBE) } catch (e) { console.log(`\n  ${route} 探针失败：${e.message}`); continue }
        for (const h of hits) {
            if (!hitsForPreset++) console.log('')
            bad++
            console.log(`  ✗ ${route}  ${h}`)
        }
    }
    if (!hitsForPreset) console.log(' 干净')
}

console.log(bad
    ? `\n✗ ${bad} 处：悬停抬起的阴影会按方角铺在圆角卡片四周。把 ani-lift 挪到那张真正有圆角的元素上。`
    : `\n✓ ${PRESETS.length} 款 × ${ROUTES.length} 条路由，每个 .ani-lift 的阴影都跟着自己的圆角走`)

ws.close()
server.close()
proc.kill()
process.exit(bad ? 1 : 0)
