/**
 * 把可以直接丢进 {configDir}/webui/ 的目录组装出来。
 *
 *   node webui/shared/tools/pack.mjs vue
 *   node webui/shared/tools/pack.mjs acg --player ../webplayer/dist
 *   node webui/shared/tools/pack.mjs github --player ../webplayer/dist --out D:/ani-rss/config/webui
 *
 * 干的事只有两件：把选中那款界面的 dist 铺进 --out，再把 webplayer 的 dist
 * 铺进 --out/player/。手工做这两步容易漏第二步，漏了表现是点播放白屏。
 */
import {cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync} from 'node:fs'
import {resolve} from 'node:path'

const argv = process.argv.slice(2)
const which = argv[0]
const flag = name => {
    const i = argv.indexOf(`--${name}`)
    return i >= 0 ? argv[i + 1] : null
}

/*
 * 款式清单从 ids.ts 读，不在这儿抄第二份 —— 抄了就会漏，
 * 漏在这一处的表现最阴：那款界面构建出来了，但打包时被判成「未知预设」，
 * 压缩包里没有它。用正则而不是 import：这脚本是当 .mjs 直接跑的，
 * import 一个 .ts 得带上 --experimental-strip-types。
 */
const IDS_TS = readFileSync(resolve(import.meta.dirname, '../../src/presets/ids.ts'), 'utf8')
const IDS = [...IDS_TS.match(/PRESET_IDS\s*=\s*\[([^\]]*)]/)[1].matchAll(/'([^']+)'/g)].map(m => m[1])

if (!IDS.includes(which)) {
    console.error(`用法: node webui/shared/tools/pack.mjs <${IDS.join('|')}> [--player <webplayer/dist>] [--out <目录>]`)
    process.exit(1)
}

// shared/tools/ -> shared/ -> webui/
const app = resolve(import.meta.dirname, '../..')
const root = resolve(app, '..')
const appDist = resolve(app, `dist/${which}`)
const out = resolve(flag('out') || resolve(root, `dist-webui/${which}`))
const player = flag('player') ? resolve(flag('player')) : null

if (!existsSync(appDist)) {
    console.error(`没有找到 ${appDist}
先在 webui/ 里跑 VITE_PRESET=${which} pnpm run build`)
    process.exit(1)
}

// 清空重铺，避免上一次的旧资源留下来（文件名带哈希，不清会越堆越多）
rmSync(out, {recursive: true, force: true})
mkdirSync(out, {recursive: true})
cpSync(appDist, out, {recursive: true})

if (player) {
    const entry = resolve(player, 'play.html')
    if (!existsSync(entry)) {
        console.error(`${player} 里没有 play.html —— 那不是 webplayer 的 dist。\n先在 webplayer 仓库里跑 npm run build`)
        process.exit(1)
    }
    cpSync(player, resolve(out, 'player'), {recursive: true})
}

/** 目录总大小，给个直观数字 */
function size(dir) {
    let n = 0
    for (const e of readdirSync(dir, {withFileTypes: true})) {
        const p = resolve(dir, e.name)
        n += e.isDirectory() ? size(p) : statSync(p).size
    }
    return n
}

const mb = (size(out) / 1024 / 1024).toFixed(1)
console.log(`✓ 已组装 -> ${out}  (${mb} MB)`)
console.log(player ? '  含 webplayer，在线播放可用' : '  未包含 webplayer（--player 没给），点播放会提示如何补上')
console.log(`\n把 ${out} 里的内容复制到 ani-rss 配置目录下的 webui/ 即可。`)
