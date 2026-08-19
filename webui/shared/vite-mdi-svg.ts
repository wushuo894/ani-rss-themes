import {readFileSync, readdirSync, statSync} from 'node:fs'
import {join} from 'node:path'
import type {Plugin} from 'vite'

/**
 * 只打包真正用到的图标。
 *
 * @mdi/font 的做法是「一份 CSS 声明 7448 条 .mdi-xxx::before + 一个含 7448 个字形的字体」，
 * 加起来 700KB —— 而这套界面统共用到 85 个图标。CSS 还是渲染阻塞的，
 * 首屏必须等它下完才出画面，慢的就是这一下。
 *
 * 换成 @mdi/js：图标是一条 SVG path 字符串，用哪个打哪个。
 * 名字仍然写成 'mdi-plus'（模板里几百处，不改），由这个插件在构建期扫源码，
 * 把出现过的名字翻成 @mdi/js 的导出名，生成一张 名字 → path 的表。
 * 手工维护这张表迟早会漏，扫源码不会。
 */
const VIRTUAL = 'virtual:mdi-paths'
const RESOLVED = '\0' + VIRTUAL

/** mdi-account-off → mdiAccountOff */
const toExport = (name: string) =>
    name.split('-').map((p, i) => (i ? p.charAt(0).toUpperCase() + p.slice(1) : p)).join('')

function walk(path: string, out: string[] = []): string[] {
    const st = statSync(path, {throwIfNoEntry: false})
    if (!st) return out
    if (st.isFile()) {
        if (/\.(vue|ts|js|mjs)$/.test(path)) out.push(path)
        return out
    }
    for (const e of readdirSync(path)) walk(join(path, e), out)
    return out
}

export function mdiUsedIcons(roots: string[]): Plugin {
    return {
        name: 'mdi-used-icons',

        resolveId: id => (id === VIRTUAL ? RESOLVED : null),

        async load(id) {
            if (id !== RESOLVED) return null

            const names = new Set<string>()
            for (const root of roots) {
                for (const file of walk(root)) {
                    for (const m of readFileSync(file, 'utf8').matchAll(/\bmdi-[a-z0-9]+(?:-[a-z0-9]+)*/g)) {
                        names.add(m[0])
                    }
                }
            }

            /* 源码里出现的 mdi-xxx 不一定真是图标（这个插件自己的名字就会被扫到），
               对不上 @mdi/js 导出的一律丢掉，别让一个假名字把构建搞崩 */
            const mdi = await import('@mdi/js')
            const used = [...names]
                .map(n => [n, toExport(n)] as const)
                .filter(([, e]) => e in mdi)
                .sort()

            const imports = used.map(([, e]) => e).join(', ')
            const entries = used.map(([n, e]) => `  ${JSON.stringify(n)}: ${e},`).join('\n')
            return `import {${imports}} from '@mdi/js'\nexport default {\n${entries}\n}\n`
        },

        /* 开发时新写一个图标名要能立刻生效，否则得重启 dev server 才看得见 */
        handleHotUpdate({file, server}) {
            if (!/\.(vue|ts)$/.test(file)) return
            const mod = server.moduleGraph.getModuleById(RESOLVED)
            if (mod) void server.reloadModule(mod)
        },
    }
}
