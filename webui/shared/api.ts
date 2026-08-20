/**
 * ani-rss 接口封装。
 *
 * 一个端点一个函数，命名与上游 ani-rss-ui/src/js/http.js 保持一致，方便两边对照排查。
 * 与上游的差异只有一处但很重要：**查询参数一律走 URLSearchParams 转义**。
 * 上游是裸模板串拼接（`api/searchBgm?name=${name}`），番剧名里有 & 就会截断，
 * getSubtitles 传 base64 时里面的 '+' 还会被服务端解成空格。
 *
 * 端点清单来源：从 test 分支源码实抽并自校验，共 66 个（见 scratchpad/spec-api.md）。
 */
import {md5} from 'js-md5'
import {http, toApiUrl, getToken, base64Encode} from './http'
import type {
    About, Ani, AniBT, AniBTGroup, AniBTQueryDTO, AnimeGardenGroup, AnimeGardenWeek,
    BgmInfo, BgmMe, CollectionInfo, Config, EmbyViews, ImportAniDataDTO, Item, ListAni,
    Log, Login, Mikan, MikanGroup, MikanSeason, NotificationConfig, PlayItem,
    PlayItemSubtitles, ProxyTest, RssToAniDTO, ThemoviedbVO, TorrentsInfo,
} from './types'

/** 把查询参数拼到路径上，值一律转义 */
function q(path: string, params: Record<string, unknown>): string {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) sp.append(k, String(v))
    }
    const s = sp.toString()
    return s ? `${path}?${s}` : path
}

/* ==================== 配置 ==================== */

export const getConfig = () => http.post<Config>('api/config')

/**
 * 保存配置。
 * login.password 必须是 MD5；留空表示不修改密码，这时不能把空串也 MD5 一遍
 * （空串的 MD5 是个有效摘要，会把密码真的改成空密码）。
 */
export function setConfig(config: Config) {
    const c: Config = JSON.parse(JSON.stringify(config))
    if (c.login) {
        c.login.username = c.login.username?.trim()
        const pwd = c.login.password?.trim()
        c.login.password = pwd ? md5(pwd) : ''
    }
    return http.post<void>('api/setConfig', c)
}

export const clearCache = () => http.post<void>('api/clearCache')
export const ping = () => http.get<unknown>('api/ping')
export const testProxy = (url: string, config: Config) => http.post<ProxyTest>(q('api/testProxy', {url}), config)
export const trackersUpdate = (config: Config) => http.post<string>('api/trackersUpdate', config)
export const downloadLoginTest = (config: Config) => http.post<void>('api/downloadLoginTest', config)
export const testIpWhitelist = () => http.post<void>('api/testIpWhitelist')

/* ==================== 登录 ==================== */

/** 登录。密码传 MD5 摘要，不是明文（后端 Login.password 注解写明「密码 (MD5摘要)」） */
export const login = (user: Login) =>
    http.post<string>('api/login', {...user, password: md5(user.password || '')})

/* ==================== 订阅 ==================== */

export const listAni = () => http.post<ListAni>('api/listAni')
export const addAni = (ani: Ani) => http.post<void>('api/addAni', ani)
/** move=true 时后端会把已下载的文件一并移动到新路径 */
export const setAni = (move: boolean, ani: Ani) => http.post<void>(q('api/setAni', {move}), ani)
export const deleteAni = (deleteFiles: boolean, ids: string[]) =>
    http.post<void>(q('api/deleteAni', {deleteFiles}), ids)
export const refreshAll = () => http.post<void>('api/refreshAll')
export const refreshAni = (ani: Ani) => http.post<void>('api/refreshAni', ani)
export const refreshCover = (ani: Ani) => http.post<string>('api/refreshCover', ani)
/** 预览订阅：返回下载位置、匹配到的资源项、以及推断出的遗漏集数 */
export const previewAni = (ani: Ani) =>
    http.post<{downloadPath: string; items: Item[]; omitList: number[]}>('api/previewAni', ani)
export const rssToAni = (dto: RssToAniDTO) => http.post<Ani>('api/rssToAni', dto)
export const downloadPath = (ani: Ani) => http.post<{downloadPath: string}>('api/downloadPath', ani)
export const importAni = (dto: ImportAniDataDTO) => http.post<void>('api/importAni', dto)

/* 批量操作 */
export const batchEnable = (value: boolean, ids: string[]) => http.post<void>(q('api/batchEnable', {value}), ids)
export const batchScrape = (force: boolean, ids: string[]) => http.post<void>(q('api/batchScrape', {force}), ids)
export const updateTotalEpisodeNumber = (force: boolean, ids: string[]) =>
    http.post<void>(q('api/updateTotalEpisodeNumber', {force}), ids)

/* ==================== 评分 / 刮削 ==================== */

/** 取当前用户在 Bangumi 上给这部番的个人评分（1~10 整数），与列表里的公开评分不是一回事 */
export const rate = (ani: Ani) => http.post<number | null>('api/rate', ani)
/** 提交个人评分。传 ani.score，返回服务端确认后的分值 */
export const setRate = (ani: Ani) => http.post<number | null>('api/setRate', ani)
export const scrape = (force: boolean, ani: Ani) => http.post<void>(q('api/scrape', {force}), ani)

/* ==================== 番剧源 ==================== */

/* 三个源都返回「按星期分组的番剧列表」，字段名各叫各的：
   Mikan 是 {seasons, weeks[].items}，AniBT 是 {availableSeasons, byWeekday[].animes}，
   AnimeGarden 直接就是 Week[]。SourceBrowserDialog 把它们归一成同一个形状。 */

/** MikanController#mikan 返回的是 Mikan（seasons / weeks / totalItem），不是单个番剧 */
export const mikan = (text: string, season?: MikanSeason | null) =>
    http.post<Mikan>(q('api/mikan', {text}), season ?? {})
export const mikanGroup = (url: string) => http.post<MikanGroup[]>(q('api/mikanGroup', {url}))
/** AniBTController#aniBT 收的是整个 DTO（season / bgmUrl / title），不是查询参数 */
export const aniBT = (dto: AniBTQueryDTO) => http.post<AniBT>('api/aniBT', dto)
export const aniBTGroup = (bgmId: string) => http.post<AniBTGroup[]>(q('api/aniBTGroup', {bgmId}))
export const animeGardenList = (bgmUrl?: string) =>
    http.post<AnimeGardenWeek[]>(q('api/animeGardenList', {bgmUrl}))
export const animeGardenGroup = (bgmId: string) => http.post<AnimeGardenGroup[]>(q('api/animeGardenGroup', {bgmId}))

/* ==================== Bangumi ==================== */

export const getBgmTitle = (ani: Ani) => http.post<string>('api/getBgmTitle', ani)
export const searchBgm = (name: string) => http.post<BgmInfo[]>(q('api/searchBgm', {name}))
export const meBgm = (ani: Ani) => http.post<BgmMe>('api/meBgm', ani)
export const getAniBySubjectId = (id: string) => http.post<Ani>(q('api/getAniBySubjectId', {id}))

/* ==================== 合集 ==================== */

export const startCollection = (info: CollectionInfo) => http.post<void>('api/startCollection', info)
export const previewCollection = (info: CollectionInfo) => http.post<Item[]>('api/previewCollection', info)
export const getCollectionSubgroup = (info: CollectionInfo) => http.post<string>('api/getCollectionSubgroup', info)

/* ==================== TMDB ==================== */

export const getThemoviedbName = (ani: Ani) => http.post<ThemoviedbVO>('api/getThemoviedbName', ani)
export const getThemoviedbGroup = (ani: Ani) => http.post<unknown>('api/getThemoviedbGroup', ani)

/* ==================== 下载器 ==================== */

export const torrentsInfos = () => http.post<TorrentsInfo[]>('api/torrentsInfos')
export const deleteTorrent = (id: string, hash: string) => http.post<void>(q('api/deleteTorrent', {id, hash}))

/* ==================== 日志 ==================== */

export const logs = () => http.post<Log[]>('api/logs')
export const clearLogs = () => http.post<void>('api/clearLogs')

/* ==================== 通知 ==================== */

export const testNotification = (c: NotificationConfig) => http.post<void>('api/testNotification', c)
export const newNotification = () => http.post<NotificationConfig>('api/newNotification')
export const getTgUpdates = (c: NotificationConfig) => http.post<unknown[]>('api/getTgUpdates', c)

/* ==================== Emby ==================== */

export const getEmbyViews = (config: Config) => http.post<EmbyViews>('api/getEmbyViews', config)

/* ==================== 播放 ==================== */

export const playList = (ani: Ani) => http.post<PlayItem[]>('api/playList', ani)
/** 文件路径要 base64；上游用裸拼接，base64 里的 '+' 会被解成空格，这里走 URLSearchParams */
export const getSubtitles = (filename: string) =>
    http.post<PlayItemSubtitles[]>(q('api/getSubtitles', {filename: base64Encode(filename)}))

/* ==================== 关于 / 维护 ==================== */

export const about = () => http.post<About>('api/about')
export const update = () => http.post<void>('api/update')
export const stop = (status: number) => http.post<void>(q('api/stop', {status}))
/**
 * 校验爱发电订单号。
 *
 * 后端 AfdianController#verifyNo 收 Config 但**只读 outTradeNo 一个字段**，校验通过后自己把
 * outTradeNo / expirationTime / tryOut 写进服务端配置。所以这里只发订单号 ——
 * 原来整个 config 发过去，会把用户刚在「登录」页敲进去、还没保存的明文密码一起带上。
 *
 * 返回 Result<Void>，data 是空的。上游 UI 那句 `config.expirationTime = res.data` 是错的，
 * 别照抄 —— 真正的到期时间要等下次拉配置。
 */
export const verifyNo = (outTradeNo: string) => http.post<void>('api/verifyNo', {outTradeNo})

/* ==================== 需要浏览器直接发起的请求 ==================== */
/* 这几个不走 fetch：要么是让浏览器自己下载文件，要么是给外部系统抄的地址。
   设不了请求头，所以令牌只能进查询串 —— 上游同样如此。 */

/** 导出配置的下载地址（<a href> 用） */
export const exportConfigUrl = () => toApiUrl('api/exportConfig', {s: getToken()})

/** 下载日志的地址 */
export const downloadLogsUrl = () => toApiUrl('api/downloadLogs', {s: getToken()})

/** ICS 日历订阅地址。用的是配置里的 apiKey，不是登录令牌 —— 这地址要贴给日历软件长期使用 */
export const calendarIcsUrl = (apiKey: string) => toApiUrl('api/calendar.ics', {'api-key': apiKey})

/** Emby Webhook 回调地址，同样用 apiKey */
export const embyWebHookUrl = (apiKey: string) => toApiUrl('api/embyWebHook', {'api-key': apiKey})

/** 导入配置：multipart 上传，不能用 JSON 那套 */
export async function importConfig(file: File): Promise<void> {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(toApiUrl('api/importConfig'), {
        method: 'POST',
        body: fd,
        headers: getToken() ? {Authorization: getToken()} : {},
    })
    const json = await res.json()
    if (json.code < 200 || json.code >= 300) throw new Error(json.message)
}

/* ==================== 补充端点 ==================== */

/** Bangumi 授权回调：把 OAuth 返回的 code 交给后端换 token */
export const bgmOauthCallback = (code: string) => http.post<void>(q('api/bgm/oauth/callback', {code}))

/**
 * 上传文件。
 * type='getBase64' 时后端只回 base64 不落盘；否则存进 {configDir}/files/ 并返回相对路径。
 * 自定义封面走的就是这个。
 */
export async function upload(file: File, type?: 'getBase64'): Promise<string> {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(toApiUrl('api/upload', type ? {type} : {}), {
        method: 'POST',
        body: fd,
        headers: getToken() ? {Authorization: getToken()} : {},
    })
    const json = await res.json()
    if (json.code < 200 || json.code >= 300) throw new Error(json.message)
    return json.data as string
}

/**
 * 用户在「页面设置」里填的自定义 CSS / JS 的地址（免鉴权）。
 *
 * 这两个端点是 ani-rss 既有的换肤通道 —— 现有那 17 款主题就是通过它注入的。
 * 我们的 WebUI 也从这里读，用户填过的东西不用再填一遍。
 */
export const customCssUrl = () => toApiUrl('api/custom.css')
export const customJsUrl = () => toApiUrl('api/custom.js')
