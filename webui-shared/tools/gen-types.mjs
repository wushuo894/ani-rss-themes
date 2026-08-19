/**
 * 从 ani-rss 的 Java 实体生成 TypeScript 类型。
 *
 * 手抄 121 个 Config 字段 + 55 个 Ani 字段一定会抄错，所以让它从源码长出来。
 * 上游改字段时重跑一次即可，diff 就是本次接口变更。
 *
 * 用法：node gen-types.mjs [输出路径]
 *
 * 类边界靠**括号配对**确定，不靠缩进猜 —— 早先版本用 /\n {4}\}/ 找闭合括号，
 * 嵌套两层的内部类（Aria2TorrentsInfo.Bittorrent.Info）直接解析错。
 */
import {readFileSync, readdirSync, writeFileSync, existsSync} from 'node:fs'

// 上游源码位置。默认找同级的 upstream/，也可以用第一个参数指定：
//   git clone --depth 1 -b test https://github.com/wushuo894/ani-rss upstream
const UPSTREAM = process.argv[2] || 'upstream'
const ROOT = `${UPSTREAM}/ani-rss-application/src/main/java/ani/rss`
const DIRS = ['entity', 'entity/dto', 'entity/vo', 'entity/torrent', 'enums']

/** Java 标量 → TS */
const SCALAR = {
    String: 'string', Character: 'string', char: 'string',
    Integer: 'number', int: 'number', Long: 'number', long: 'number',
    Double: 'number', double: 'number', Float: 'number', float: 'number',
    Short: 'number', short: 'number', BigDecimal: 'number',
    Boolean: 'boolean', boolean: 'boolean',
    Date: 'string',      // DateAdapter 序列化成 yyyy-MM-dd
    Object: 'unknown',
    Void: 'void', void: 'void',
}

const unknownTypes = new Set()

/** 从 src[open]（必须是 '{'）出发，返回配对的 '}' 下标 */
function matchBrace(src, open) {
    let depth = 0
    for (let i = open; i < src.length; i++) {
        const c = src[i]
        if (c === '"') {                       // 跳过字符串字面量
            for (i++; i < src.length && src[i] !== '"'; i++) if (src[i] === '\\') i++
            continue
        }
        if (c === '/' && src[i + 1] === '/') {  // 行注释
            while (i < src.length && src[i] !== '\n') i++
            continue
        }
        if (c === '/' && src[i + 1] === '*') {  // 块注释
            i = src.indexOf('*/', i + 2)
            if (i < 0) return src.length
            i++
            continue
        }
        if (c === '{') depth++
        else if (c === '}' && --depth === 0) return i
    }
    return src.length
}

/** 找出文件里所有 class/enum/interface，带上各自的 body 区间（含嵌套） */
function findTypes(src) {
    const out = []
    const re = /(?:(?:public|private|protected|static|final|abstract)\s+)*(class|enum|interface)\s+(\w+)([^{;]*)\{/g
    let m
    while ((m = re.exec(src))) {
        const open = m.index + m[0].length - 1
        const close = matchBrace(src, open)
        out.push({kind: m[1], name: m[2], header: m[3], start: m.index, open, close, body: src.slice(open + 1, close)})
    }
    return out
}

/** 清洗 Javadoc 成一行。必须先掐掉 '*​/'，漏一个就会提前闭合生成的块注释、截断整个 .ts */
function cleanDoc(s) {
    if (!s) return ''
    return s.split('*/')[0].replace(/^\s*\/\*\*/, '').replace(/^\s*\*/gm, '')
        .replace(/\s+/g, ' ').trim().slice(0, 120)
}

// 注解参数允许一层嵌套括号：@Schema(description = "密码 (MD5摘要)") 这种。
// 只写 \([^)]*\) 会在内层 ')' 提前收尾，回溯后整个字段被跳过——静默少字段，不报错。
const ANNO = String.raw`(?:@[\w.]+(?:\((?:[^()]|\([^()]*\))*\))?\s*)*`
// doc 内容不许出现 ; { }：否则匹配不到 private 时这个组会一路撑到下一个 */，
// 把中间夹着的整个字段吞掉（表现为每个类的第一个字段凭空消失）。
const DOC = String.raw`(?:/\*\*((?:[^*;{}]|\*(?!/))*)\*/\s*)?`
const FIELD_RE = String.raw`${DOC}${ANNO}private\s+(?!static\b)((?:final\s+)?[\w.]+(?:<[^;={}]*>)?(?:\[\])?)\s+(\w+)\s*(?:=\s*([^;]+))?;`

/** 抽字段（Lombok @Data，字段一律 private） */
function fields(body) {
    const out = []
    const re = new RegExp(FIELD_RE, 'g')
    let m
    while ((m = re.exec(body))) {
        const [, doc, type, name, def] = m
        // 注释和 private 之间夹着 '{' 说明隔着类声明，那是类注释不是字段注释
        const pre = m[0].slice(0, m[0].indexOf('private'))
        out.push({type: type.trim(), name, def: def?.trim(), doc: pre.includes('{') ? '' : cleanDoc(doc)})
    }
    return out
}

/** 枚举值：逐行取标识符，跳过注解/注释；带构造参数或方法体的枚举在第一个 ';' 处截止 */
function enumValues(body) {
    const head = body.split(/;\s*$/m)[0]
    const vals = []
    for (let line of head.split('\n')) {
        line = line.replace(/\/\/.*$/, '').trim()
        if (!line || line.startsWith('@') || line.startsWith('*') || line.startsWith('/')) continue
        const m = line.match(/^(\w+)\s*(?:\(|,|;|$)/)
        // 排除混进来的字段/方法声明
        if (m && !/^(public|private|protected|static|final|return|import|package)$/.test(m[1])) vals.push(m[1])
    }
    return vals
}

// ── 读取全部源文件 ──
const files = []
for (const d of DIRS) {
    const p = `${ROOT}/${d}`
    if (!existsSync(p)) continue
    for (const f of readdirSync(p).filter(f => f.endsWith('.java'))) {
        files.push({dir: d, name: f.replace('.java', ''), src: readFileSync(`${p}/${f}`, 'utf8')})
    }
}

// 建立「扁平类型名」全集，供交叉引用判定
const flatNames = new Set()
const qualified = new Map()      // 'Mikan.Group' → 'MikanGroup'，跨文件引用要用
const bareIndex = new Map()      // 'Group' → Set('MikanGroup', ...)，唯一时可直接定位
const perFile = new Map()
for (const f of files) {
    const types = findTypes(f.src)
    const flatOf = new Map()
    for (const t of types) {
        // 祖先 = 区间包住自己的那些类型，按开括号位置排序即为由外到内
        const parents = types.filter(p => p !== t && p.open < t.start && t.close < p.close)
            .sort((a, b) => a.open - b.open)
        const flat = parents.map(p => p.name).join('') + t.name
        flatOf.set(t, flat)
        flatNames.add(flat)
        flatNames.add(t.name)
        if (parents.length) qualified.set(`${parents[parents.length - 1].name}.${t.name}`, flat)
        if (!bareIndex.has(t.name)) bareIndex.set(t.name, new Set())
        bareIndex.get(t.name).add(flat)
    }
    perFile.set(f, {types, flatOf})
}

/** Java 类型串 → TS 类型串 */
function toTs(java, localBare) {
    let t = java.trim().replace(/^final\s+/, '')

    let m = t.match(/^(List|Set|Collection|ArrayList|HashSet)<(.+)>$/)
    if (m) return `${toTs(m[2], localBare)}[]`

    m = t.match(/^(Map|HashMap|LinkedHashMap|TreeMap)<\s*([^,]+)\s*,\s*(.+)>$/)
    if (m) {
        const k = toTs(m[2], localBare)
        return `Record<${k === 'number' ? 'number' : 'string'}, ${toTs(m[3], localBare)}>`
    }

    if (t.endsWith('[]')) return `${toTs(t.slice(0, -2), localBare)}[]`

    const bare = t.replace(/<.*>$/, '')
    if (SCALAR[bare]) return SCALAR[bare]

    const last = bare.split('.').pop()
    // 1) 本文件的内部类：字段里写裸名 Images，实际类型叫 BgmInfoImages
    if (localBare.has(last)) return localBare.get(last)
    // 2) 跨文件的限定引用：List<Mikan.Group> → MikanGroup
    if (qualified.has(bare)) return qualified.get(bare)
    // 3) 裸名在全局唯一，直接用那个扁平名
    const cands = bareIndex.get(last)
    if (cands?.size === 1) return [...cands][0]
    if (flatNames.has(last)) return last

    unknownTypes.add(bare)
    return 'unknown'
}

let ts = `/**
 * ani-rss 数据模型（TypeScript）
 *
 * 自动生成，请勿手改 —— 由 scratchpad/gen-types.mjs 从上游 test 分支的 Java 实体抽出。
 * 上游加字段时重跑生成器，diff 即本次接口变更。
 *
 * 说明：
 *  - 所有字段都标成可选。后端是 Gson 序列化 Lombok @Data，null 字段直接不出现在 JSON 里，
 *    标必填会让调用处到处 ! 断言，反而掩盖真实的空值。
 *  - Date 经 DateAdapter 序列化为 'yyyy-MM-dd' 字符串。
 *  - 内部类展平成「外层+内层」，如 BgmInfo.Images → BgmInfoImages。
 */

`

const emitted = new Map()   // 文件名 → 已生成字段数，供末尾自校验

for (const f of files) {
    const {types, flatOf} = perFile.get(f)
    // 本文件内「裸名 → 扁平名」，用于解析字段里的内部类引用
    const localBare = new Map([...flatOf].map(([t, flat]) => [t.name, flat]))

    for (const t of types) {
        const flat = flatOf.get(t)

        if (t.kind === 'enum') {
            const vals = enumValues(t.body)
            if (vals.length) ts += `/** ${flat} */\nexport type ${flat} = ${vals.map(v => `'${v}'`).join(' | ')}\n\n`
            continue
        }

        // 自身字段 = body 挖掉所有嵌套类型的 body 之后再抽
        let own = t.body
        for (const c of types) {
            if (c !== t && c.open > t.open && c.close < t.close) own = own.replace(t.body.slice(c.open - t.open - 1, c.close - t.open), '')
        }
        const fs_ = fields(own)
        if (!fs_.length) continue
        emitted.set(f.name, (emitted.get(f.name) || 0) + fs_.length)

        // Java 的 extends 要带过来，否则继承下来的字段在 TS 这边凭空消失
        const base = (t.header.match(/extends\s+([\w.]+)/) || [])[1]
        const baseFlat = base && localBare.get(base.split('.').pop())
        const ext = baseFlat || (base && flatNames.has(base.split('.').pop()) ? base.split('.').pop() : '')

        const docM = f.src.slice(0, t.start).match(/\/\*\*((?:[^*]|\*(?!\/))*)\*\/(?:\s*@[\w.]+(?:\((?:[^()]|\([^()]*\))*\))?)*\s*$/)
        const doc = cleanDoc(docM ? docM[1] : '')

        ts += `/** ${flat}${doc ? ' —— ' + doc : ''} */\nexport interface ${flat}${ext ? ` extends ${ext}` : ''} {\n`
        for (const fl of fs_) {
            ts += `${fl.doc ? `    /** ${fl.doc} */\n` : ''}    ${fl.name}?: ${toTs(fl.type, localBare)}\n`
        }
        ts += `}\n\n`
    }
}

// ── 自校验：生成的字段数必须等于源码里的 private 字段数 ──
// 静默吞字段是这类脚本最容易犯又最难发现的错（注解里一个嵌套括号就能吞掉一个字段），
// 宁可生成失败，也不要生出一份「看着挺像」的类型。
const problems = []
for (const f of files) {
    if (f.dir === 'enums') continue
    // 枚举体先挖掉：枚举内部的 `private final int code` 是实现细节，不参与 JSON 序列化，
    // 留着会让基准比生成结果多一个，把校验变成误报。
    let base = f.src
    for (const t of perFile.get(f).types.filter(t => t.kind === 'enum')) {
        base = base.replace(t.body, '')
    }
    // 基准必须以 ';' 收尾，否则会把 `private XxxEnum getXxx() {` 这种私有方法算成字段
    const inSrc = (base.match(/^\s+private\s+(?!static\b)[\w.<>,\[\]\s]+?\s+\w+\s*(?:=[^;]*)?;/gm) || []).length
    const got = emitted.get(f.name) || 0
    if (inSrc !== got) problems.push(`  ${f.name}: 源码 ${inSrc} 个 private 字段，生成了 ${got} 个`)
}
if (problems.length) {
    console.error('！字段数对不上，生成中止：')
    problems.forEach(p => console.error(p))
    process.exit(1)
}

const OUT = process.argv[3] || 'D:/xiaochajian/anirsscss/webui-shared/types.ts'
writeFileSync(OUT, ts)
const n = (ts.match(/^export interface/gm) || []).length
const e = (ts.match(/^export type/gm) || []).length
console.log(`✓ 自校验通过：${n} 个 interface / ${e} 个枚举，共 ${ts.split('\n').length} 行 → ${OUT}`)
if (unknownTypes.size) console.log('  映射成 unknown（外部库类型，预期内）：', [...unknownTypes].join(', '))
