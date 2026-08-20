/**
 * 抓一份真实的当季番剧表，生成 src/demo/bangumi.json。
 *
 * 演示站原来用的是一批编出来的番剧名和现画的渐变海报 —— 一眼假，看不出真用起来
 * 是什么样：真实的番剧名有长有短、有中日混排、有带书名号的，排版会被撑成什么样，
 * 编出来的名字试不出来。
 *
 * 数据源是 Bangumi 的公开日历接口，不需要令牌，也不碰用户自己的 ani-rss。
 * 抓下来的结果提交进仓库 —— 构建时不联网，CI 断网也能出包。
 * 想换成新一季： node tools/fetch-demo-data.mjs
 *
 * 只取展示需要的几样：条目 id、中日文标题、封面、评分、总集数、星期。
 * 封面地址改写成 https —— 接口给的是 http，混合内容会被 Pages 直接拦掉。
 */
import {writeFile} from 'node:fs/promises'

const UA = 'ani-rss-themes/demo (+https://github.com/zzzwannasleep/ani-rss-themes)'

const res = await fetch('https://api.bgm.tv/calendar', {headers: {'User-Agent': UA}})
if (!res.ok) throw new Error(`拉取失败：HTTP ${res.status}`)

const days = await res.json()

const items = days.flatMap(d => (d.items ?? []).map(it => ({
    id: it.id,
    // name_cn 常常是空串，退回原名
    title: it.name_cn || it.name,
    jp: it.name_cn ? it.name : '',
    /* 取 common（150px，约 11KB）。
       量过四档：grid 1.2KB / small 3.4KB / common 11KB / medium 5.7KB（比 common 还小）/
       large 938KB —— large 是原图，113 张就是 100MB 出头，演示站不能这么干。
       common 放到 206px 宽会略软，但这是这几档里唯一能看的。 */
    cover: String(it.images?.common || it.images?.medium || '').replace(/^http:/, 'https:'),
    score: Number(it.rating?.score ?? 0) || 0,
    eps: Number(it.eps ?? 0) || 0,
    /** 1 = 周一，与接口一致 */
    weekday: d.weekday?.id ?? 0,
})).filter(x => x.title && x.cover))

items.sort((a, b) => a.weekday - b.weekday || a.id - b.id)

await writeFile(
    new URL('../src/demo/bangumi.json', import.meta.url),
    JSON.stringify(items, null, 0) + '\n',
)

const perDay = [1, 2, 3, 4, 5, 6, 7].map(w => items.filter(x => x.weekday === w).length)
console.log(`✓ ${items.length} 部，按周一到周日分别是 ${perDay.join(' / ')}`)
