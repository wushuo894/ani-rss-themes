/**
 * 备胎更新检查的断言。
 *
 *   node --experimental-strip-types shared/github.test.ts
 *
 * 两件事最容易错，而且错了都不报错、只是「永远不提示新版本」：
 * 版本号按字符串比（1.0.9 > 1.0.56），和资产挑成了列表里的第一个
 * （十一款界面一次发十一个包，挑错就是更新一次被换成另一款界面）。
 */
import assert from 'node:assert/strict'

const {compareVersions, fetchLatest, readWebuiMeta} = await import('./github.ts')

/* ── 版本号比大小 ── */
assert.equal(compareVersions('1.0.56', '1.0.9'), 1, '两位数必须比一位数大，按字符串比就反了')
assert.equal(compareVersions('1.0.9', '1.0.56'), -1)
assert.equal(compareVersions('1.0.56', '1.0.56'), 0)
assert.equal(compareVersions('1.1.0', '1.0.99'), 1)
assert.equal(compareVersions('v1.0.57', '1.0.56'), 1, 'tag 上的 v 要摘掉')
assert.equal(compareVersions('1.0', '1.0.0'), 0, '段数不同，短的补 0')
assert.equal(compareVersions('1.0.1', '1.0'), 1)

/* ── 挑资产：认包名，不认顺序 ── */
{
    const meta = {owner: 'o', repo: 'r', version: '1.0.56', filename: 'ani-rss-webui-vue.zip'}
    globalThis.fetch = (async () => new Response(JSON.stringify({
        tag_name: '1.0.57',
        body: '## 更新内容',
        published_at: '2026-08-23T00:00:00Z',
        assets: [
            {name: 'ani-rss-webui-acg.zip', size: 1, browser_download_url: 'https://x/acg.zip'},
            {name: 'ani-rss-webui-vue.zip', size: 222, browser_download_url: 'https://x/vue.zip'},
        ],
    }), {headers: {'Content-Type': 'application/json'}})) as typeof fetch

    const got = await fetchLatest(meta)
    assert.equal(got?.latest, '1.0.57')
    assert.equal(got?.update, true)
    assert.equal(got?.downloadUrl, 'https://x/vue.zip', '挑的必须是自己这一款的包')
    assert.equal(got?.size, 222)
}

/* ── 同版本不算有更新；没有同名资产时不给下载地址 ── */
{
    const meta = {owner: 'o', repo: 'r', version: '1.0.57', filename: 'ani-rss-webui-vue.zip'}
    globalThis.fetch = (async () => new Response(JSON.stringify({
        tag_name: '1.0.57', assets: [{name: '别的.zip', size: 1, browser_download_url: 'https://x/别的.zip'}],
    }), {headers: {'Content-Type': 'application/json'}})) as typeof fetch

    const got = await fetchLatest(meta)
    assert.equal(got?.update, false)
    assert.equal(got?.downloadUrl, '', '没有自己那个包就别给个别人的下载地址')
}

/* ── 查不动就回 null，不许往上抛 ── */
{
    globalThis.fetch = (async () => {
        throw new Error('被墙了')
    }) as typeof fetch
    assert.equal(await fetchLatest({owner: 'o', repo: 'r', version: '1', filename: 'a.zip'}), null)
    assert.equal(await readWebuiMeta('http://x/'), null)

    globalThis.fetch = (async () => new Response('Not Found', {status: 404})) as typeof fetch
    assert.equal(await readWebuiMeta('http://x/'), null)
}

/* ── webui.json 缺字段就当没有：少一个 filename 就挑不出包 ── */
{
    globalThis.fetch = (async () => new Response(JSON.stringify({owner: 'o', repo: 'r', version: '1.0.0'}),
        {headers: {'Content-Type': 'application/json'}})) as typeof fetch
    assert.equal(await readWebuiMeta('http://x/'), null)
}

console.log('✓ 备胎更新检查断言通过')
