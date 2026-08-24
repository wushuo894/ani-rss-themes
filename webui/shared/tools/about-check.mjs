/**
 * 关于页那两段「更新内容」的体检。
 *
 *   pnpm run build:all -- --demo                        # 先出演示产物，测的是真产物
 *   pnpm run test:about                                 # 十一款轮流跑
 *   node webui/shared/tools/about-check.mjs synology   # 只跑一款
 *
 * 为什么单独有这么一条：这一页上有两段更新说明，一段是 ani-rss 那个程序的，
 * 一段是这套界面自己的。界面那一段曾经挂在 `webui.update === true` 上 ——
 * 而版本号长期不涨（见 workflow 里跟着 run_number 走的那段），`update` 永远是 false，
 * 于是那张卡**一次都没露过面**。页面上唯一看得见的「更新内容」是 ani-rss 那一段，
 * 用起来就是「界面在拿别人的更新充数」。
 *
 * 这类毛病的形状是「**该在的东西没在**」，而不是「在的东西长歪了」——
 * vue-tsc 看不见（`v-if` 写什么都合法），版式体检也看不见（不存在的元素量不出问题），
 * 「扫到 0 个」和「扫过了没问题」长得一模一样。只能正面点名要它。
 *
 * 顺带量三件事：
 *  · 两张卡的标题分得出谁是谁（都叫「更新内容」的话，这一页就是白改）
 *  · 正文真的渲染成了 Markdown，不是一坨 `##` 和 `|---|`
 *  · 宽表格和长命令自己横滚，没把卡片撑爆、也没让整页出现横向滚动条
 *
 * 演示数据里必须有 markdownBody，否则这一页在演示产物上根本不渲染，
 * 也就永远体检不到 —— 见 src/demo/data.ts 里的 DEMO_NOTES。
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
/* 端口错开另外三个体检（4173/4174/4175），四个工具可以同时跑 */
const PORT = 4176, CDP_PORT = 9276

const IDS_TS = await readFile(resolve(HERE, '../../src/presets/ids.ts'), 'utf8')
const ALL = [...IDS_TS.match(/PRESET_IDS\s*=\s*\[([^\]]*)]/)[1].matchAll(/'([^']+)'/g)].map(m => m[1])
const PRESETS = process.argv[2] ? [process.argv[2]] : ALL

const browser = [
    process.env.CHROME_PATH,
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean).find(p => existsSync(p))
if (!browser) {
    console.log('没找到 Chrome / Edge，跳过关于页体检（设 CHROME_PATH 可指定）')
    process.exit(0)
}
if (!existsSync(join(DIST, PRESETS[0], 'index.html'))) {
    console.error(`dist/${PRESETS[0]} 不存在，先跑 pnpm run build:all -- --demo`)
    process.exit(1)
}

const sleep = ms => new Promise(r => setTimeout(r, ms))
const TYPES = {
    '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
    '.woff2': 'font/woff2', '.ico': 'image/x-icon',
}

let root = join(DIST, PRESETS[0])
const server = createServer(async (req, res) => {
    const p = decodeURIComponent(req.url.split('?')[0])
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

const proc = spawn(browser, [
    '--headless=new', `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${join(process.env.TEMP || '/tmp', 'ani-rss-about-check')}`,
    '--no-first-run', '--disable-gpu', '--hide-scrollbars',
    '--disable-extensions', '--no-proxy-server', '--disable-background-networking',
    '--disable-sync', '--disable-features=Translate,MediaRouter',
    'about:blank',
], {stdio: 'ignore'})

const die = msg => { console.error(msg); server.close(); proc.kill(); process.exit(1) }

let target
for (let i = 0; i < 80; i++) {
    try {
        /* 先认人：不是无头的那台就不碰 —— 宁可报错，也不要去动用户自己开着的浏览器 */
        const ver = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json()
        if (!/Headless/i.test(ver['User-Agent'] || '')) {
            die(`127.0.0.1:${CDP_PORT} 上是另一台浏览器（${ver.Browser}），不是体检自己起的那台。`)
        }
        target = (await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()).find(t => t.type === 'page')
        if (target) break
    } catch { /* 还没起来 */ }
    await sleep(250)
}
if (!target) die('无头浏览器没起来')

const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('连不上调试端口')), 10000)
    ws.addEventListener('open', () => { clearTimeout(t); res() }, {once: true})
}).catch(e => die(e.message))

let seq = 0
const pending = new Map()
ws.addEventListener('message', e => {
    const m = JSON.parse(e.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
})
const send = (method, params = {}) => new Promise((res, rej) => {
    const n = ++seq
    const t = setTimeout(() => rej(new Error('超时 ' + method)), 25000)
    pending.set(n, m => { clearTimeout(t); m.error ? rej(new Error(m.error.message)) : res(m.result) })
    ws.send(JSON.stringify({id: n, method, params}))
})
const ev = async (expression, wait = 300) => {
    const r = await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true})
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description?.split('\n')[0] || '脚本执行失败')
    await sleep(wait)
    return r.result.value
}

await send('Page.enable')
await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', {width: 1400, height: 950, deviceScaleFactor: 1, mobile: false})

const PROBE = String.raw`(() => {
  const cards = [...document.querySelectorAll('.v-card')].filter(c => c.querySelector('.md'))
  const titles = cards.map(c => (c.querySelector('.v-card-title') || {}).textContent?.replace(/\s+/g, ' ').trim())
  return {
    titles,
    sum: [...document.querySelectorAll('.md')].map(m => ({
      h: m.querySelectorAll('h1,h2,h3,h4,h5,h6').length,
      li: m.querySelectorAll('li').length,
      pre: m.querySelectorAll('pre').length,
      table: m.querySelectorAll('table').length,
      a: m.querySelectorAll('a').length,
      code: m.querySelectorAll('code').length,
      quote: m.querySelectorAll('blockquote').length,
      /* 没渲染掉的记号漏在正文里 = 渲染器没接上 */
      raw: /(^|\n)\s*(#{1,6} |\|---)|\*\*/.test(m.innerText),
      /* 卡片被撑爆：宽表格 / 长命令没能自己横滚 */
      wide: m.scrollWidth > m.clientWidth + 1,
    })),
    bodyScroll: document.documentElement.scrollWidth > window.innerWidth + 1,
  }
})()`

let broken = 0
for (const id of PRESETS) {
    root = join(DIST, id)
    const bad = []
    try {
        /* 先去 about:blank 再回来：只有片段不同的地址是同文档跳转，换款靠的是换静态目录 */
        await send('Page.navigate', {url: 'about:blank'})
        await sleep(200)
        await send('Page.navigate', {url: `http://127.0.0.1:${PORT}/index.html#/`})
        await sleep(2400)
        await ev('location.hash = "/settings/about"', 2400)

        const r = await ev(PROBE, 0)
        if (r.sum.length !== 2) bad.push(`更新内容只有 ${r.sum.length} 段 —— 该有 ani-rss 和界面各一段`)
        if (!r.titles.some(t => /^ani-rss 更新内容/.test(t || ''))) bad.push('没有「ani-rss 更新内容」这张卡')
        if (!r.titles.some(t => /WebUI 更新内容/.test(t || ''))) bad.push('没有「〈款名〉WebUI 更新内容」这张卡')
        r.sum.forEach((m, i) => {
            const miss = Object.entries({标题: m.h, 列表: m.li, 代码块: m.pre, 表格: m.table, 链接: m.a, 行内代码: m.code, 引用: m.quote})
                .filter(([, v]) => !v).map(([k]) => k)
            if (miss.length) bad.push(`第 ${i + 1} 段没渲染出：${miss.join('、')}`)
            if (m.raw) bad.push(`第 ${i + 1} 段正文里还留着没渲染的 markdown 记号`)
            if (m.wide) bad.push(`第 ${i + 1} 段撑破了容器 —— 宽表格 / 长命令没自己横滚`)
        })
        if (r.bodyScroll) bad.push('整页出现了横向滚动条')
    } catch (e) {
        bad.push('脚本没走通：' + e.message)
    }

    if (bad.length) {
        broken++
        console.log(`✗ ${id}`)
        bad.forEach(b => console.error(`    ✗ ${b}`))
    } else {
        console.log(`✓ ${id}`)
    }
}

console.log('')
if (broken) console.error(`关于页体检不通过：${broken} / ${PRESETS.length} 款有问题`)
else console.log(`✓ ${PRESETS.length} 款关于页都对：两段更新内容各归各的，Markdown 渲染齐全，宽内容自己横滚`)

ws.close(); proc.kill(); server.close()
process.exit(broken ? 1 : 0)
