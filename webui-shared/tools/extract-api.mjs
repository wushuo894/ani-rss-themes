import {readFileSync, readdirSync, writeFileSync} from 'node:fs'

// 上游源码位置，可用第一个参数指定
const UPSTREAM = process.argv[2] || 'upstream'
const dir = `${UPSTREAM}/ani-rss-application/src/main/java/ani/rss/controller`
const files = readdirSync(dir).filter(f => f.endsWith('.java'))

const out = []
const declared = new Set()   // 源码里出现过的全部 mapping 路径，用来自校验

for (const f of files) {
    const src = readFileSync(`${dir}/${f}`, 'utf8')

    // 类级 @RequestMapping 前缀
    const cls = src.match(/@RequestMapping\("([^"]*)"\)[\s\S]{0,200}?public class/)
    const prefix = cls ? cls[1] : ''

    // 先把源码里所有 mapping 路径记下来（自校验基准）
    for (const m of src.matchAll(/@(?:Get|Post|Put|Delete|Patch|Request)Mapping\("([^"]*)"/g)) {
        declared.add('/api' + prefix + m[1])
    }

    // 注解块 + 方法签名。返回类型允许点号（Result<List<AniBT.Group>> 这种嵌套内部类）
    const re = /((?:@\w+(?:\([^)]*\))?\s*)+)(?:public|protected)\s+([\w<>,.\s\[\]?]+?)\s+(\w+)\s*\(([^)]*)\)/g
    let m
    while ((m = re.exec(src))) {
        const [, annos, ret, name, args] = m
        const map = annos.match(/@(Get|Post|Put|Delete|Patch|Request)Mapping\(\s*(?:value\s*=\s*)?"([^"]*)"/)
        if (!map) continue
        out.push({
            controller: f.replace('.java', ''),
            method: map[1] === 'Request' ? 'ANY' : map[1].toUpperCase(),
            path: '/api' + prefix + map[2],
            auth: /@Auth\b/.test(annos),
            ret: ret.replace(/\s+/g, ' ').trim(),
            fn: name,
            args: args.replace(/\s+/g, ' ').trim(),
            summary: (annos.match(/@Operation\(summary\s*=\s*"([^"]*)"/) || [, ''])[1],
        })
    }
}

// ── 自校验：抽出来的必须覆盖源码里声明的全部路径 ──
const got = new Set(out.map(o => o.path))
const missed = [...declared].filter(p => !got.has(p)).sort()
if (missed.length) {
    console.error('！以下端点在源码中声明但没抽到，正则还有洞：')
    missed.forEach(p => console.error('  ' + p))
    process.exit(1)
}

out.sort((a, b) => a.controller.localeCompare(b.controller) || a.path.localeCompare(b.path))

let md = '# ani-rss REST 接口清单（test 分支，从源码实抽 + 自校验）\n\n'
md += '- 全局前缀 `/api`：WebMvcConfig 用 addPathPrefix 给所有 @RestController 统一加上\n'
md += '- 响应恒为 `Result<T> = {code, message, data, t}`，code 是业务码（非 HTTP 状态码），200~299 成功\n'
md += '- 「鉴权」列 ✓ = 方法上有 @Auth，需要 `Authorization: <token>` 头（无 Bearer 前缀）\n'
md += `- 共 **${out.length}** 个端点 / ${new Set(out.map(o => o.controller)).size} 个 controller\n`
md += `- 免鉴权：${out.filter(o => !o.auth).map(o => '`' + o.path + '`').join('、')}\n\n`

let cur = ''
for (const o of out) {
    if (o.controller !== cur) {
        cur = o.controller
        md += `\n## ${cur}\n\n| 方法 | 路径 | 鉴权 | 返回 | 入参 | 说明 |\n|---|---|---|---|---|---|\n`
    }
    const args = o.args ? o.args.replace(/\|/g, '\\|') : '无'
    md += `| ${o.method} | \`${o.path}\` | ${o.auth ? '✓' : '—'} | \`${o.ret}\` | \`${args}\` | ${o.summary} |\n`
}

writeFileSync('spec-api.md', md)
console.log(`✓ 自校验通过：${out.length} 个端点 / ${new Set(out.map(o => o.controller)).size} 个 controller，覆盖源码声明的全部 ${declared.size} 条路径`)
