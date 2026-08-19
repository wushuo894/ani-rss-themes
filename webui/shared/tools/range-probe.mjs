/**
 * 检查一个地址的 HTTP Range 实现是否合规。
 *
 *   node webui/shared/tools/range-probe.mjs "http://<ani-rss>/api/file?filename=<base64>&s=<token>"
 *
 * 为什么需要这个：webplayer 要在本地拆容器，靠的是按字节范围精确取流。
 * 服务端只要在范围长度上差一个字节，连接、探测、总长都正常，只有解复用会崩 ——
 * 报错看起来像播放器的问题，实际在服务端。这个脚本把责任分清楚。
 *
 * 已知：ani-rss 的 FileController 就少一个字节（`long length = end - start;`
 * 应为 `end - start + 1`）。
 */

const url = process.argv[2]
if (!url) {
    console.error('用法: node webui/shared/tools/range-probe.mjs <视频文件的完整地址>')
    process.exit(1)
}

/** 分两级：blocker 会导致放不了，nit 只是不合规范但不影响 */
const blockers = []
const nits = []
const ok = m => console.log(`  ✓ ${m}`)
const blocker = m => {
    console.log(`  ✗ ${m}`)
    blockers.push(m)
}
const nit = m => {
    console.log(`  ! ${m}`)
    nits.push(m)
}

console.log(`探测 ${url.replace(/([?&]s=)[^&]+/, '$1<token>')}\n`)

/** 连不上就说人话，别甩一串 undici 的栈 */
async function get(init) {
    try {
        return await fetch(url, init)
    } catch (e) {
        console.error(`\n请求失败：${e instanceof Error ? e.message : e}`)
        console.error('检查地址是否可达、令牌是否有效（?s=... 会过期）。')
        process.exitCode = 2
        return null
    }
}

// ── 1. 不带 Range 的普通 GET ──
console.log('普通 GET（不带 Range）')
const plain = await get()
if (!plain) process.exit(2)

if (plain.status === 200) ok('返回 200')
// 播放器只从这个响应里取最终 URL 和 Content-Length，206 不影响它工作，所以只算瑕疵
else if (plain.status === 206) nit(`返回 206 —— 没请求分段却回了 206，不合规范（不影响播放）`)
else blocker(`返回 ${plain.status}`)

const acceptRanges = plain.headers.get('accept-ranges')
acceptRanges === 'bytes' ? ok('Accept-Ranges: bytes') : blocker(`Accept-Ranges: ${acceptRanges || '（缺失）'}`)
await plain.body?.cancel().catch(() => {})

// ── 2. 分段请求：核心检查，长度不对就是致命的 ──
console.log('\n分段 GET')
const CASES = [[0, 1], [0, 4095], [1000, 1063]]
let total = 0

for (const [start, end] of CASES) {
    const want = end - start + 1        // RFC 7233：闭区间
    const r = await get({headers: {Range: `bytes=${start}-${end}`}})
    if (!r) process.exit(2)

    const got = (await r.arrayBuffer()).byteLength
    const cr = r.headers.get('content-range') || ''
    if (!total) total = Number(cr.split('/')[1]) || 0

    const tag = `bytes=${start}-${end}`
    if (r.status !== 206) blocker(`${tag} → HTTP ${r.status}（应为 206）`)
    else if (got === want) ok(`${tag} → ${got} 字节`)
    else blocker(`${tag} → 实得 ${got} 字节，应为 ${want}（差 ${want - got}）`)
}

if (total > 0) ok(`Content-Range 暴露了总长: ${total}`)
else blocker('Content-Range 没有给出总长，播放器无法确定文件大小')

// ── 结论 ──
console.log('')
if (!blockers.length) {
    console.log(nits.length
        ? '结论：可以正常拆容器。有几处不影响播放的规范瑕疵（上面标 ! 的）。'
        : '结论：Range 实现合规，webplayer 可以正常拆容器。')
    process.exitCode = 0
} else {
    console.log('结论：Range 实现有问题，webplayer 大概率放不了 —— 表现为能连上、能读到总长，但画面出不来。')
    if (blockers.some(m => m.includes('差 1'))) {
        console.log(`
少一个字节是 ani-rss 已知的问题，在 FileController.doFile()：

    long length = end - start;        // 现在
    long length = end - start + 1;    // 应该

Range: bytes=0-1023 的语义是闭区间共 1024 字节，Content-Range 也是这么声明的，
只有实际写出的字节数少一个。文件的最后一个字节因此永远取不到。`)
    }
    process.exitCode = 1
}
