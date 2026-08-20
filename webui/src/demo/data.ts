import type {About, Ani, Config, Log, TorrentsInfo} from '@shared/types'

/**
 * 演示用假数据。只给 GitHub Pages 的预览构建用（VITE_DEMO=1），
 * 正式产物里这个文件不会被打包 —— main.ts 里的引用在 __DEMO__ 为 false 时被摇掉。
 *
 * 番剧名用的是公有领域或纯虚构的名字，不蹭具体作品。
 */

const WEEK = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

const SUBGROUPS = ['喵萌奶茶屋', '桜都字幕组', 'LoliHouse', 'Lilith-Raws', 'ANi', '北宇治字幕组']

const TITLES = [
    '春日的十七个夏天', '机械之心与铁皮猫', '深海邮差', '拾荒者与月亮', '雨季观测记录',
    '第七号温室', '午夜快递员', '山与海的通信', '灯塔守夜人', '纸飞机计划',
    '橘子色的黄昏', '暴风雨后的图书馆', '空转的旋转木马', '第二次告别',
    '云上的邮局', '冬眠的收音机', '会走路的房子', '两个人的天文台', '铁轨尽头的花店',
    '第九次搬家', '不打烊的修理铺', '荒原上的信号塔',
]

/* 每天几部：真实的追番表本来就不均匀，平均分到七天的话海报墙看着像个日历 */
const PER_DAY = [4, 2, 3, 5, 3, 3, 2]

let seq = 0
const nextId = () => `demo-${++seq}`

/** 用 id 派生一个稳定的伪随机数，免得每次刷新数据都在跳 */
function rnd(seed: string, max: number): number {
    let h = 0
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffff
    return h % max
}

/** 现画一张海报当封面：不联网、不打包图片，颜色由序号派生所以每张都不一样 */
function poster(i: number): string {
    const hue = (i * 47) % 360
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="428">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="hsl(${hue} 70% 62%)"/>
<stop offset="1" stop-color="hsl(${(hue + 60) % 360} 65% 42%)"/></linearGradient></defs>
<rect width="300" height="428" fill="url(#g)"/>
<circle cx="150" cy="168" r="54" fill="rgba(255,255,255,.28)"/>
<rect x="60" y="300" width="180" height="10" rx="5" fill="rgba(255,255,255,.42)"/>
<rect x="90" y="326" width="120" height="10" rx="5" fill="rgba(255,255,255,.28)"/></svg>`
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function makeAni(title: string, i: number): Ani {
    const id = nextId()
    const total = 12 + rnd(id + 'a', 3)
    const cur = rnd(id + 'b', total + 1)
    return {
        id,
        title,
        jpTitle: '',
        subgroup: SUBGROUPS[i % SUBGROUPS.length],
        season: 1 + rnd(id + 'c', 2),
        currentEpisodeNumber: cur,
        totalEpisodeNumber: total,
        enable: i % 7 !== 3,
        ova: i % 9 === 5,
        score: Number((6.5 + rnd(id + 'd', 30) / 10).toFixed(1)),
        cover: poster(i),
        pinyin: '', pinyinInitials: '',
        themoviedbName: title,
        bgmUrl: '',
        lastDownloadTime: Date.now() - rnd(id + 'e', 72) * 3600_000,
        standbyRssList: i % 5 === 0 ? ['https://example.invalid/rss'] : [],
    } as unknown as Ani
}

export const ANI_LIST = TITLES.map(makeAni)

/**
 * previewAni 的返回。
 *
 * 接口约定是 {downloadPath, items, omitList}，原来演示这边直接回了一个 Ani 数组，
 * 形状对不上，预览面板在演示站里永远是空的 —— 而这个面板恰恰是操作最多的一个。
 */
export function previewAni(ani: {title?: string; subgroup?: string; currentEpisodeNumber?: number}) {
    const total = ani.currentEpisodeNumber ?? 8
    const groups = ['桜都字幕组', 'LoliHouse', 'ANi', '喵萌奶茶屋']
    return {
        downloadPath: `/downloads/anime/${ani.title ?? '演示番剧'}/Season 1`,
        items: Array.from({length: total}, (_, i) => {
            const ep = i + 1
            const g = groups[i % groups.length]
            return {
                title: `[${g}] ${ani.title ?? '演示番剧'} - ${String(ep).padStart(2, '0')} [1080p][简繁内封].mkv`,
                reName: `${ani.title ?? '演示番剧'} S01E${String(ep).padStart(2, '0')}.mkv`,
                infoHash: `demo-hash-${ep}`,
                episode: ep,
                formatSize: `${(0.9 + (i % 4) * 0.25).toFixed(2)} GB`,
                length: Math.round((0.9 + (i % 4) * 0.25) * 1024 ** 3),
                hasDownloaded: ep <= total - 2,
                master: i % 5 !== 3,          // 偶尔命中备用 RSS，那一列才有东西可看
                subgroup: g,
                pubDate: '',
            }
        }),
        omitList: total > 5 ? [3] : [],
    }
}

/** 第 i 部排在周几（0=周一）。按 PER_DAY 依次铺满 */
const dayOf = (() => {
    const map: number[] = []
    PER_DAY.forEach((n, d) => {
        for (let k = 0; k < n; k++) map.push(d)
    })
    return (i: number) => map[i % map.length]
})()

/** listAni 的返回：按星期分组，今天排在最前 —— 与后端行为一致 */
export function listAni() {
    const today = new Date().getDay()          // 0 = 周日
    const order = Array.from({length: 7}, (_, i) => (today === 0 ? 6 : today - 1 + i) % 7)
    return {
        total: ANI_LIST.length,
        weekList: order.map((w, idx) => ({
            weekLabel: WEEK[w] + (idx === 0 ? '（今天）' : ''),
            items: ANI_LIST.filter((_, i) => dayOf(i) === w),
        })).filter(g => g.items.length),
    }
}

export const TORRENTS: TorrentsInfo[] = ANI_LIST.slice(0, 5).map((a, i) => ({
    name: `[${a.subgroup}] ${a.title} - ${String(a.currentEpisodeNumber).padStart(2, '0')} [1080p].mkv`,
    hash: `hash-${i}`,
    progress: [1, 0.62, 0.31, 1, 0.08][i],
    size: 1_200_000_000 + i * 300_000_000,
    state: (i === 0 || i === 3 ? 'uploading' : 'downloading') as TorrentsInfo['state'],
} as unknown as TorrentsInfo))

export const LOGS: Log[] = [
    {level: 'INFO', loggerName: 'ani.rss.Demo', threadName: 'main', message: '演示模式：这些日志是内置的假数据'},
    {level: 'INFO', loggerName: 'ani.rss.task.RssTask', threadName: 'rss-1', message: '订阅刷新完成，新增 2 条待下载'},
    {level: 'WARN', loggerName: 'ani.rss.task.RssTask', threadName: 'rss-1', message: '「深海邮差」本周没有匹配到新剧集'},
    {level: 'INFO', loggerName: 'ani.rss.download.Qbittorrent', threadName: 'dl-2', message: '下载完成：拾荒者与月亮 - 07'},
    {level: 'ERROR', loggerName: 'ani.rss.Demo', threadName: 'main', message: '演示模式下所有写操作都不会真的执行'},
]

/** 设置页要的完整配置。字段太多，只给会被显示的那些，其余交给控件的默认值 */
export const CONFIG = {
    downloadPath: '/downloads/anime',
    host: '', port: 0,
    sortType: 'SCORE',
    rename: true, delete: false,
    notificationConfigList: [],
    customTags: [],
    /* 捐赠那一页得有个像样的状态才看得出组件长什么样。给「试用中」——
       它把徽章、解锁清单、状态条、订单号输入全都渲染出来，覆盖面最广。
       注意 verifyExpirationTime 为 true 是「还在有效期内」，不是「已过期」 */
    tryOut: true, verifyExpirationTime: true, expirationTime: Date.now() + 14 * 864e5,
} as unknown as Config

export const ABOUT: About = {
    version: '演示版',
    latest: '演示版',
    update: false,
    autoUpdate: false,
}
