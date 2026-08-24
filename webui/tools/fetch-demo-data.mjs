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
 * 封面地址改写成 https —— 接口给的是 http，混合内容会被 Pages 直接拦掉；
 * 尺寸见下面 cover 那一段。
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
    /* 走 lain 的按宽缩放：/r/<宽>/ 垫在 large 那条路径前面，服务端现缩一张给你。
       接口给的五档全都不合用：grid 48px / small 78px / medium 100px / common 150px /
       large 是原图（1200×1696，300KB 上下）。海报框在宽屏上有 200 多 CSS px，
       2 倍屏就要 400 物理像素 —— common 那 150px 拉上去糊得一眼看得出来，
       而 large 一张 300KB、113 张 30MB，演示站不该这么发。
       /r/400/ 量下来 400×565、49KB：够 2 倍屏，体积只有原图的六分之一。
       只有 large 那条路径支持 /r/，拿 common 拼会直接 400。 */
    cover: String(it.images?.large || '')
        .replace(/^http:/, 'https:')
        .replace('//lain.bgm.tv/pic/', '//lain.bgm.tv/r/400/pic/'),
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
