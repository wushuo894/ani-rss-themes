/**
 * toApiUrl 的回归测试。
 *
 * 存在的理由很具体：曾经 `url.pathname += path` 把 path 里自带的问号转义成 %3F
 * 塞进了路径，紧接着 `url.search = ...` 又把查询串清空 —— 18 个走 q() 的接口
 * （删订阅、批量启停、批量刮削、改订阅、搜番、删种、停止/重启……）参数全部送不到后端，
 * 而界面上什么都看不出来，按钮照点、请求照发，就是不生效。
 *
 * 这类错误不会有编译错误也不会抛异常，只能靠断言拦。
 *
 *   node --experimental-strip-types shared/http.test.ts
 */
import assert from 'node:assert/strict'

/** toApiUrl 读 location，Node 里先造一个 */
function at(href: string) {
    const u = new URL(href)
    ;(globalThis as {location?: unknown}).location = {
        protocol: u.protocol, host: u.host, pathname: u.pathname,
    }
}

// getBaseUrl() 每次调用都现读 location，所以换「当前页面」只要改这个对象，不用重新 import
at('http://ani.local:7789/index.html')
const {toApiUrl, http, setErrorHandler} = await import('./http.ts')

/* ── path 里自带查询串 ── */
assert.equal(toApiUrl('api/stop?status=0'), 'http://ani.local:7789/api/stop?status=0')
assert.equal(toApiUrl('api/deleteAni?deleteFiles=true'), 'http://ani.local:7789/api/deleteAni?deleteFiles=true')
assert.equal(toApiUrl('api/setAni?move=false'), 'http://ani.local:7789/api/setAni?move=false')

/* 问号绝不能出现在路径里 —— 这是当初那个 bug 的直接特征 */
for (const p of ['api/stop?status=0', 'api/batchEnable?value=true', 'api/scrape?force=1']) {
    const {pathname, search} = new URL(toApiUrl(p))
    assert.ok(!pathname.includes('%3F'), `${p}: 问号被转义进了路径 → ${pathname}`)
    assert.ok(search.length > 1, `${p}: 查询串丢了`)
}

/* ── 参数走 params 形参 ── */
assert.equal(toApiUrl('api/file', {filename: 'a+b/c=', s: 'tok'}),
    'http://ani.local:7789/api/file?filename=a%2Bb%2Fc%3D&s=tok')

/* ── 两种来源同时存在：显式 params 覆盖 path 里的同名值 ── */
assert.equal(toApiUrl('api/x?a=1&b=2', {b: '9'}), 'http://ani.local:7789/api/x?a=1&b=9')

/* ── 反代到子路径下仍要对 ── */
at('http://nas.local/ani-rss/index.html')
assert.equal(toApiUrl('api/stop?status=1'), 'http://nas.local/ani-rss/api/stop?status=1')

/* ── 中文和 & 必须转义，不能截断（上游裸拼模板串就栽在这） ── */
at('http://ani.local:7789/')
{
    const url = new URL(toApiUrl('api/searchBgm?name=' + encodeURIComponent('芙莉莲 & 你')))
    assert.equal(url.searchParams.get('name'), '芙莉莲 & 你')
}

/* ── postQuiet：老后端上探测 /api/webui/* 不能弹全局提示 ──
   ani-rss 没有这个端点时回的是 Spring 的 404 包（既没有 code 也没有 message），
   走普通 post 的话每次打开关于页都会弹一句「undefined」。 */
{
    // request() 一进来就读令牌，Node 里没有 localStorage，不补一个的话整段是白跑的
    ;(globalThis as {localStorage?: unknown}).localStorage = {getItem: () => null, setItem: () => {}, removeItem: () => {}}

    const errors: string[] = []
    setErrorHandler(m => void errors.push(m))
    globalThis.fetch = (async () => new Response(
        JSON.stringify({timestamp: 0, status: 404, error: 'Not Found', path: '/api/webui/getUpdate'}),
        {headers: {'Content-Type': 'application/json'}},
    )) as typeof fetch

    await assert.rejects(() => http.postQuiet('api/webui/getUpdate'), (e: Error) => e.name === 'ApiError')
    assert.deepEqual(errors, [], `postQuiet 不该弹提示，却弹了：${errors}`)

    await assert.rejects(() => http.post('api/webui/getUpdate'))
    assert.equal(errors.length, 1, '普通 post 仍然要弹提示')
}

console.log('✓ toApiUrl 全部断言通过')
console.log('✓ postQuiet 静默行为断言通过')
