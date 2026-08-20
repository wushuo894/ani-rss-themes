import type {About, Ani, Config, Log, TorrentsInfo} from '@shared/types'
import BANGUMI from './bangumi.json'

/**
 * 演示数据。只给 GitHub Pages 的预览构建用（VITE_DEMO=1），
 * 正式产物里这个文件不会被打包 —— main.ts 里的引用在 __DEMO__ 为 false 时被摇掉。
 *
 * 番剧本身是真的：bangumi.json 是 tools/fetch-demo-data.mjs 从 Bangumi 的公开日历
 * 抓下来的当季番，真标题、真封面、真评分、真的按星期分布。
 * 原来这里是一批编出来的名字加现画的渐变海报 —— 一眼假，而且试不出真用起来是什么样：
 * 真实番剧名有长有短、有中日混排、有一串括号后缀，卡片会被撑成什么样，编的名字试不出来。
 *
 * 订阅状态那部分仍然是编的（字幕组、进度、上次下载时间、RSS 地址）——
 * 那些属于每个人自己的 ani-rss，公开日历里没有，也不该去碰用户的实例。
 * 编的部分一律由番剧 id 派生，刷新页面不会跳。
 */

const WEEK = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

const SUBGROUPS = ['喵萌奶茶屋', '桜都字幕组', 'LoliHouse', 'Lilith-Raws', 'ANi', '北宇治字幕组']

/** 用种子派生一个稳定的伪随机数，免得每次刷新数据都在跳 */
function rnd(seed: string, max: number): number {
    let h = 0
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffff
    return h % max
}

/* 每 8 部里挑一部当「很久没更新」的：总览上的「疑似停更」是真会出现的状态，
   演示数据要是全都在 3 天内下过，那张卡永远是「字幕组都很勤快」，看不出长什么样。
   停更判定要求「没下完」，所以这几部的进度也一并压到总集数以下。 */
const STALE = (i: number) => i % 8 === 3

function makeAni(b: typeof BANGUMI[number], i: number): Ani {
    const id = String(b.id)
    // 公开日历不给总集数（全是 0），按常见的季番长度派生一个
    const total = b.eps || [12, 13, 24][rnd(id + 'a', 3)]
    const cur = STALE(i) ? Math.max(1, total - 4) : rnd(id + 'b', total + 1)
    const idleDays = STALE(i) ? 18 + rnd(id + 'e', 26) : rnd(id + 'e', 3)
    return {
        id,
        title: b.title,
        jpTitle: b.jp,
        subgroup: SUBGROUPS[rnd(id + 'g', SUBGROUPS.length)],
        season: 1,
        currentEpisodeNumber: cur,
        totalEpisodeNumber: total,
        enable: i % 7 !== 3,
        ova: i % 17 === 5,
        // 评分是真的；日历里偶尔为 0（新番还没人打分），那就不显示
        score: b.score || 0,
        // 封面是 bgm 的公开图床，直接给完整地址：toApiFile 会原样返回带协议的地址
        cover: b.cover,
        image: b.cover,
        pinyin: '', pinyinInitials: '',
        themoviedbName: b.title,
        bgmUrl: `https://bgm.tv/subject/${b.id}`,
        // 摸鱼检测的开关，默认开 —— 它不是「已停更」，别拿它当状态用
        procrastinating: true,
        lastDownloadTime: Date.now() - idleDays * 864e5 - rnd(id + 'f', 20) * 3600_000,
        standbyRssList: i % 5 === 0 ? [{label: '备用源', url: 'https://example.invalid/rss', offset: 0}] : [],
    } as unknown as Ani
}

export const ANI_LIST: Ani[] = BANGUMI.map(makeAni)

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

/** 第 i 部排在周几（0=周一）。用日历里真实的播出日，不再自己摊平 —— 真实分布本来就不均匀 */
const dayOf = (i: number) => (BANGUMI[i]?.weekday ?? 1) - 1

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

/* 日志里的番剧名跟着真实数据走 —— 写死的名字和列表里对不上，一眼就露馅 */
export const LOGS: Log[] = [
    {level: 'INFO', loggerName: 'ani.rss.Demo', threadName: 'main', message: '演示模式：这些日志是内置的假数据'},
    {level: 'INFO', loggerName: 'ani.rss.task.RssTask', threadName: 'rss-1', message: '订阅刷新完成，新增 2 条待下载'},
    {
        level: 'WARN', loggerName: 'ani.rss.task.RssTask', threadName: 'rss-1',
        message: `「${ANI_LIST[2]?.title ?? '演示番剧'}」本周没有匹配到新剧集`,
    },
    {
        level: 'INFO', loggerName: 'ani.rss.download.Qbittorrent', threadName: 'dl-2',
        message: `下载完成：${ANI_LIST[3]?.title ?? '演示番剧'} - 07`,
    },
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


/* ────────── 番剧浏览器（Mikan / AniBT / AnimeGarden）的假数据 ────────── */

/* 三家的返回结构不一样，但演示要的东西一样：按星期分的番剧 + 每部番的字幕组。
   番剧浏览器里也用真数据 —— 那一屏就是「这一季有什么」，摆一堆编的名字等于没做 */
const byWeekday = (w: number) => BANGUMI.filter(b => b.weekday === w + 1)

export function mikanList() {
    const y = new Date().getFullYear()
    return {
        seasons: [
            {year: y, season: '春', seasonLabel: `${y} 春`, select: true},
            {year: y, season: '冬', seasonLabel: `${y} 冬`, select: false},
            {year: y - 1, season: '秋', seasonLabel: `${y - 1} 秋`, select: false},
        ],
        weeks: WEEK.map((w, i) => ({
            weekLabel: w,
            items: byWeekday(i).map(b => ({
                bgmId: String(b.id),
                cover: b.cover,
                url: `https://mikanani.me/Home/Bangumi/${b.id}`,
                // 已经在订阅列表里的标成「已订阅」，和真实行为一致
                exists: b.id % 5 === 0,
                score: b.score,
                title: b.title,
                bgmUrl: `https://bgm.tv/subject/${b.id}`,
            })),
        })),
        totalItem: BANGUMI.length,
    }
}

export function aniBTList() {
    const y = new Date().getFullYear()
    return {
        currentSeason: `${y} 春`,
        requestedSeason: `${y} 春`,
        availableSeasons: [`${y} 春`, `${y} 冬`, `${y - 1} 秋`],
        byWeekday: WEEK.map((w, i) => ({
            weekday: i + 1,
            weekdayLabel: w,
            animes: byWeekday(i).map(b => ({
                animeId: String(b.id),
                bgmId: String(b.id),
                cover: b.cover,
                rating: b.score,
                title: {chinese: b.title, primary: b.jp || b.title, romaji: '', english: ''},
                exists: b.id % 6 === 0,
                rssReleaseCount: 3 + rnd(String(b.id), 20),
            })),
        })),
    }
}

export function animeGardenList() {
    return WEEK.map((w, i) => ({
        weekLabel: w,
        subjects: byWeekday(i).map(b => ({
            id: String(b.id),
            name: b.title,
            cover: b.cover,
            score: b.score,
            exists: b.id % 7 === 0,
            weekLabel: w,
        })),
    }))
}

/** 字幕组列表。三家字段名不同，一次全给上，组件那边按名字取，多余的忽略 */
export function sourceGroups(key: string) {
    const versions = [
        [{label: '简体', regex: 'CHS|简'}, {label: '1080P', regex: '1080'}],
        [{label: '繁体', regex: 'CHT|繁'}, {label: '1080P', regex: '1080'}],
        [{label: '简繁内封', regex: '简繁'}],
    ]
    return SUBGROUPS.slice(0, 3 + rnd(key, 3)).map((name, i) => ({
        subgroupId: `sg-${i}`,
        groupId: `sg-${i}`,
        label: name,
        name,
        rss: `https://example.invalid/rss/${encodeURIComponent(key)}/${i}`,
        bgmUrl: `https://bgm.tv/subject/${100000 + i}`,
        bgmId: `${100000 + i}`,
        updateDay: WEEK[i % 7],
        status: '连载中',
        lastUpdatedAt: Date.now() - i * 86400_000,
        /* 字幕组下面那张「最近发了什么」的列表要有东西，
           不然演示站上那个展开按钮根本不出现 */
        items: Array.from({length: 4}, (_, k) => ({
            title: `[${name}] ${BANGUMI[(i * 7 + k) % BANGUMI.length].title} - ${String(12 - k).padStart(2, '0')} [1080p][简繁内封].mkv`,
            magnet: `magnet:?xt=urn:btih:${'0'.repeat(32)}${i}${k}`,
            torrent: '',
            size: 1_100_000_000 + k * 40_000_000,
            formatSize: `${(1.1 + k * 0.04).toFixed(2)} GB`,
            createdAt: new Date(Date.now() - (k * 7 + i) * 86400_000).toISOString(),
        })),
        groupRegex: {
            tags: ['1080P', i % 2 ? '简体' : '繁体'],
            regexList: versions.slice(0, 2 + (i % 2)),
        },
    }))
}
