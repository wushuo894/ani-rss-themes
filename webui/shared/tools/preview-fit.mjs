/**
 * 预览站首页的「一屏体检」。
 *
 *   node webui/shared/tools/preview-fit.mjs
 *
 * 量四件事，都是眼睛看不住、悄悄烂掉的：
 *
 *   1. 所有卡片全部落在第一屏内 —— 最后一张卡的底边不超过视口，而且要留一点余量，
 *      正好压在最下沿不算数（看着像被裁掉一截）。
 *      这条最容易烂：加第十款就是第四行，多出来的 200px 不会有人发现，
 *      因为写页面的人屏幕大。1366×768 那档就是给这种情况留的下限。
 *
 *      量的是卡不是整页：1366×768 的视口只有 630px，要连安装说明和页脚一起塞进去，
 *      每张卡只剩 100px —— 缩略图缩到那个份上就没有存在的意义了。
 *      「一屏看完每款长什么样」是这一屏的正事，装法往下滚一点本来就正常。
 *   2. 宽屏上确实是三列（3×3）。改 CSS 时把 min-width 断点碰歪了，
 *      退回两列照样"能看"，只是要滚两屏 —— 不量就不知道。
 *   3. 每张卡的 ⤓ zip 指向 releases/latest/download/ani-rss-webui-<id>.zip，
 *      而且 <id> 和这张卡自己的预览地址是同一个。抄错一处就是
 *      「点群晖那张卡下下来一个 Win98」，而页面上一点看不出来。
 *   4. 缩略图的 iframe 有没有被建出来 —— 也就是「页面脚本还活着吗」。
 *      这一页的脚本挂了没有任何外在迹象：卡片停在骨架图上，看着像还在加载。
 *      写这个工具时就正好撞见一次（两个 IIFE 之间少一个分号），
 *      而那个 bug 已经在线上挂了不知道多久。
 *
 * 不用先 build 演示产物：所有预览地址一律回 404，iframe 建得出来但加载不成，
 * 而卡片高度由 CSS 定，缩略图起没起来都不影响版式 —— 第 1、2 条照样量得准，
 * 第 4 条量的本来也只是「建没建出来」。
 *
 * 没装 Chrome / Edge 就跳过并退出 0 —— 这是辅助工具，不该卡住别人的构建。
 */
import {createServer} from 'node:http'
import {readFile} from 'node:fs/promises'
import {existsSync} from 'node:fs'
import {spawn} from 'node:child_process'
import {dirname, resolve, join} from 'node:path'
import {fileURLToPath} from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const PAGE = resolve(HERE, '../../preview-index.html')
const IDS_TS = await readFile(resolve(HERE, '../../src/presets/ids.ts'), 'utf8')
const PRESETS = [...IDS_TS.match(/PRESET_IDS\s*=\s*\[([^\]]*)]/)[1].matchAll(/'([^']+)'/g)].map(m => m[1])

/* 端口和 mobile-audit 各用各的：两个体检可能同时在跑，撞一起会互相驱动对方的浏览器 */
const PORT = 4174, CDP_PORT = 9274

/* 量哪些屏。1366×768 是下限档 —— 还在用的笔记本一大把，它过了别的都过。
   高度是**视口**高度，不是屏幕高度：浏览器自己的地址栏和标签栏另外吃掉 100px 上下，
   所以这里填的已经是减过的数。 */
/* [名字, 宽, 视口高, 该有几列, 要不要求所有卡一屏装下] */
const VIEWPORTS = [
    ['1920×1080', 1920, 940, 4, true],
    ['1600×900', 1600, 760, 4, true],
    ['1366×768', 1366, 630, 4, true],
    /* 两列那一档不要求一屏 —— 平板上滚一下是正常的，这一行只是盯着断点别歪：
       四列的规则要是漏了 min-width，这里会变成 1 或 4 */
    ['900（两列）', 900, 800, 2, false],
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
    console.log('没找到 Chrome / Edge，跳过预览站一屏体检（设 CHROME_PATH 可指定）')
    process.exit(0)
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

/* 只发这一个页面。各款的预览地址一律回 404，iframe 起不来就留骨架图 —— 版式不受影响 */
const server = createServer(async (req, res) => {
    if (req.url.split('?')[0] === '/') {
        res.writeHead(200, {'content-type': 'text/html'})
        return res.end(await readFile(PAGE))
    }
    res.writeHead(404)
    res.end('x')
})
await new Promise(r => server.listen(PORT, '127.0.0.1', r))

const proc = spawn(browser, [
    '--headless=new', `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${join(process.env.TEMP || '/tmp', 'ani-rss-preview-fit')}`,
    '--no-first-run', '--disable-gpu', '--hide-scrollbars',
    '--disable-extensions', '--no-proxy-server', '--disable-background-networking',
    '--disable-sync', '--disable-features=Translate,MediaRouter',
    'about:blank',
], {stdio: 'ignore'})

const bail = (msg) => {
    console.error(msg)
    server.close()
    proc.kill()
    process.exit(1)
}

let target
for (let i = 0; i < 80; i++) {
    try {
        /* 先认人：不是自己起的那台无头浏览器就不碰，别去驱动用户正开着的窗口 */
        const ver = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json()
        if (!/Headless/i.test(ver['User-Agent'] || '')) {
            bail(`127.0.0.1:${CDP_PORT} 上是另一台浏览器（${ver.Browser}），不是体检自己起的那台。`)
        }
        const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
        target = list.find(t => t.type === 'page')
        if (target) break
    } catch { /* 还没起来 */ }
    await sleep(250)
}
if (!target) bail('无头浏览器没起来')

const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((ok, no) => {
    ws.addEventListener('open', ok, {once: true})
    ws.addEventListener('error', no, {once: true})
    setTimeout(() => no(new Error('CDP 连不上')), 10000)
}).catch(e => bail(e.message))

let seq = 0
const pending = new Map()
ws.addEventListener('message', e => {
    const msg = JSON.parse(e.data)
    const p = pending.get(msg.id)
    if (!p) return
    pending.delete(msg.id)
    msg.error ? p.no(new Error(msg.error.message)) : p.ok(msg.result)
})
const send = (method, params = {}) => new Promise((ok, no) => {
    const id = ++seq
    pending.set(id, {ok, no})
    ws.send(JSON.stringify({id, method, params}))
    setTimeout(() => pending.has(id) && (pending.delete(id), no(new Error(method + ' 超时'))), 20000)
})

const evaluate = async expr => {
    const r = await send('Runtime.evaluate', {expression: expr, returnByValue: true, awaitPromise: true})
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text)
    return r.result.value
}

let bad = 0

for (const [label, w, h, wantCols, mustFit] of VIEWPORTS) {
    await send('Emulation.setDeviceMetricsOverride', {
        width: w, height: h, deviceScaleFactor: 1, mobile: false,
    })
    await send('Page.navigate', {url: `http://127.0.0.1:${PORT}/`})
    /* 等排版稳下来。没有 iframe 要等，两帧足够 */
    await sleep(700)

    const m = await evaluate(`(() => {
        const cards = [...document.querySelectorAll('.grid > .card')]
        const cols = new Set(cards.map(c => Math.round(c.getBoundingClientRect().left)))
        return {
            scrollH: document.documentElement.scrollHeight,
            viewH: innerHeight,
            cards: cards.length,
            cols: cols.size,
            /* 最后一张卡的底边到视口顶的距离 —— 这就是「一屏看完」的判据 */
            lastCardBottom: cards.length ? Math.round(cards.at(-1).getBoundingClientRect().bottom) : 0,
            /* 缩略图剩多高。放得下不等于放得好：压到几十像素就只剩一团色，
               所以这个数一起打出来，让人一眼看见代价 */
            shotH: Math.round(document.querySelector('.shot')?.getBoundingClientRect().height || 0),
            /* 缩略图的 iframe 建出来没有。这一条盯的是「页面脚本还活着吗」：
               这一页的脚本挂了是**没有任何外在迹象**的 —— 卡片停在骨架图上，
               看着就像「缩略图还在加载」，复制按钮点了没反应也容易当成手滑。
               真出过一次：两个 IIFE 之间少一个分号，被自动分号补全粘成了一次调用，
               从那一行往下全都不执行。 */
            iframes: document.querySelectorAll('.shot iframe').length,
        }
    })()`)

    /* 留 8px 余量：底边正好等于视口高度不算「看完」，那是紧贴着屏幕下沿 */
    const over = m.lastCardBottom - (m.viewH - 8)
    const fits = !mustFit || over <= 0
    console.log(`${fits ? '✓' : '✗'} ${label}  末卡底边 ${m.lastCardBottom}px / 视口 ${m.viewH}px`
        + `  ${m.cols} 列  缩略图 ${m.shotH}px  整页 ${m.scrollH}px`)
    if (!m.iframes) {
        console.log('    ✗ 一个缩略图 iframe 都没建出来 —— 页面脚本挂了（多半是哪儿少个分号）')
        bad++
    }
    if (!fits) {
        console.log(`    ✗ 最后一张卡有 ${over}px 掉在屏幕外 —— 加了款式？还是哪块留白又写死了？`)
        /* 超了就把各块的高度摊开。只说「超了 1500px」的话，下一个人还得自己去开 DevTools 找 */
        const parts = await evaluate(`(() => {
            const name = el => el.tagName.toLowerCase()
                + (el.className ? '.' + String(el.className).split(' ')[0] : '')
            const line = (el, indent) => {
                const r = el.getBoundingClientRect()
                const cs = getComputedStyle(el)
                return indent + name(el) + ' ' + Math.round(r.height) + 'px'
                    + ' (上下外边距 ' + parseInt(cs.marginTop) + '/' + parseInt(cs.marginBottom) + ')'
            }
            const out = []
            for (const el of document.querySelector('.wrap').children) {
                out.push(line(el, ''))
                if (el.classList.contains('screen')) {
                    for (const kid of el.children) out.push(line(kid, '  '))
                }
            }
            // 一张卡自己的三块：卡片放不下的时候，得知道是缩略图被压没了还是文字太占
            const card = document.querySelector('.grid > .card')
            if (card) {
                out.push(line(card, '  '))
                for (const kid of card.children) if (kid.className !== 'go') out.push(line(kid, '    '))
            }
            return out
        })()`)
        parts.forEach(p => console.log('      ' + p))
        bad++
    }
    if (m.cols !== wantCols) {
        console.log(`    ✗ 这一档排成了 ${m.cols} 列，该是 ${wantCols} 列`)
        bad++
    }
    if (m.cards !== PRESETS.length) {
        console.log(`    ✗ 页面上 ${m.cards} 张卡，ids.ts 里有 ${PRESETS.length} 款 —— 少写了一张？`)
        bad++
    }
}

/* 下载按钮：地址里的 id 必须和这张卡自己的预览地址一致 */
const links = await evaluate(`[...document.querySelectorAll('.grid > .card')].map(c => ({
    go: c.querySelector('.go')?.getAttribute('href') || '',
    dl: c.querySelector('.dl')?.getAttribute('href') || '',
}))`)

for (const {go, dl} of links) {
    const id = go.replace(/\/$/, '')
    const want = `https://github.com/zzzwannasleep/ani-rss-themes/releases/latest/download/ani-rss-webui-${id}.zip`
    if (dl !== want) {
        console.log(`    ✗ ${id || '(没有预览地址)'} 那张卡的下载地址不对`)
        console.log(`      是  ${dl || '(没有)'}`)
        console.log(`      该是 ${want}`)
        bad++
    }
}
if (links.length && links.every(l => l.dl)) {
    console.log(`✓ ${links.length} 颗 ⤓ zip 各指各的包，和卡片一一对上`)
}

ws.close()
server.close()
proc.kill()

if (bad) {
    console.log(`\n预览站一屏体检不通过：${bad} 处`)
    process.exit(1)
}
console.log('\n✓ 预览站一屏看完：三档分辨率都不用滚，卡片一次排完，下载按钮各指各的包')
