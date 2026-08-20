/**
 * 外部播放器地址拼装的断言。
 *
 * 为什么值得单独测：这些 URL 拼错了界面上一点异常都没有 —— 菜单照样弹，
 * 点下去要么打不开、要么打开了放不出来，只有装了对应 App 的人真点一次才知道。
 * Infuse 和 SenPlayer 就是这么坏了一整段时间：我们的地址自带 `?filename=…&s=<令牌>`，
 * 原样塞进 `url=` 参数后，`&s=` 被当成 scheme 自己的参数，地址在第一个 & 处截断。
 */
import assert from 'node:assert/strict'
import {externalPlayers} from './externalPlayers.ts'

/** 真实形态：带查询串，base64 里有 + / =，还有中文文件名 */
const SRC = 'http://box.lan/api/file?filename=L2Rvd25sb2Fkcy9hK2IvMS5ta3Y=&s=tok+en'
const SUB = 'http://box.lan/api/file?filename=L3N1Yi8xLmFzcw==&s=tok+en'
const NAME = '[字幕组] 番名 - 01 [1080p].mkv'

const of = (label: string, ...args: [string, string?, string?]) =>
    externalPlayers(...args).find(p => p.label === label)!.url

/* ── 参数类：地址必须是完整的、编码过的一个值 ── */
for (const label of ['Infuse', 'SenPlayer']) {
    const u = of(label, SRC, NAME, SUB)
    const value = new URL(u.replace(/^[A-Za-z-]+:\/\//, 'https://')).searchParams.get('url')
    assert.equal(value, SRC, `${label} 的 url 参数应当解回原地址`)
    assert.ok(!u.includes('?filename='), `${label} 不该出现未编码的 ? —— 那说明地址是裸拼的`)
    assert.ok(u.includes('%26s%3D'), `${label} 地址里的 &s= 必须被编码，否则会截断`)
}

// Infuse 支持字幕；没有字幕时不该留一个空的 sub=
assert.ok(of('Infuse', SRC, NAME, SUB).includes('&sub='))
assert.ok(!of('Infuse', SRC, NAME).includes('sub='))

// SenPlayer 只认 url 一个参数
assert.equal(of('SenPlayer', SRC, NAME, SUB).split('&').length, 1, 'SenPlayer 不该带别的参数')

/* ── 路径类：整串是地址，后面不能再挂自己的查询参数 ── */
for (const label of ['MPV', 'PotPlayer']) {
    const u = of(label, SRC, NAME, SUB)
    const after = u.slice(u.indexOf('://') + 3)
    assert.ok(after.startsWith('http'), `${label} 的 scheme 后面应当直接是地址`)
}
// MPV 后面一个参数都不许挂：挂上去会变成视频地址查询串的一部分
assert.equal(of('MPV', SRC, NAME, SUB), `mpvplay://${encodeURI(SRC)}`)
// PotPlayer 的附加参数用空格分隔，不会污染地址
assert.ok(of('PotPlayer', SRC, NAME, SUB).includes(' /sub='))

/* ── VLC：有字幕才换到能带 sub 的那个入口 ── */
assert.ok(of('VLC', SRC, NAME).startsWith('vlc://'))
assert.ok(of('VLC', SRC, NAME, SUB).startsWith('vlc-x-callback://'))

/* ── 所有播放器都不许把地址弄丢 ── */
for (const p of externalPlayers(SRC, NAME, SUB)) {
    assert.ok(
        p.url.includes(SRC) || p.url.includes(encodeURIComponent(SRC)) || p.url.includes(encodeURI(SRC)),
        `${p.label} 的地址不完整：${p.url}`,
    )
}

console.log('✓ 外部播放器地址全部断言通过')
