/**
 * 接入 LinWeb（zzzwannasleep/webplayer）。
 *
 * 为什么用它而不是 ArtPlayer 之流：那些播放器底下都是原生 <video>，容器交给浏览器，
 * 而浏览器不认 Matroska —— 番剧绝大多数是 mkv，1080p 的普通 H.264 也一样放不了。
 * LinWeb 在本地把容器拆开、重新封装成 fragmented MP4 交给 MSE，编码码流原封不动，
 * 顺带用 jassub（libass 的 wasm 移植）渲染 ASS 特效字幕、libpgs 渲染 PGS 图形字幕。
 *
 * 它是一个独立的静态站，我们不把它打进 Vite 产物（那要连 wasm 一起 vendor，
 * 而且会丢掉它自己的播放界面），而是并排放在 webui/player/ 下，用 iframe 引它的 play.html。
 * 同源，所以没有混合内容和 CORS 的问题 —— 它 README 里对 Emby 场景强调的那两道墙，
 * 在这里天然不存在。
 */
import {getBaseUrl} from './http'

/** 播放器所在目录，相对于 WebUI 自身。装在别处就改这里 */
export const PLAYER_DIR = 'player'

export interface PlayParams {
    /** 视频地址（绝对地址，含令牌） */
    url: string
    /** 标题，显示在播放页上；形如 "番名 S01E02" 时它能自动认出剧集用于弹幕 */
    title?: string
    /** 外挂字幕地址。mkv 内封字幕由播放器自己从容器里取，不用传 */
    suburl?: string
    sublabel?: string
    /** 起播位置（秒） */
    t?: number
    /** 文件字节数。给了就省掉一次探测请求 */
    size?: number
}

/** play.html 的完整地址 */
export function playerEntryUrl(): string {
    return new URL(`${PLAYER_DIR}/play.html`, getBaseUrl()).toString()
}

/** 拼出带参数的播放地址 */
export function buildPlayUrl(p: PlayParams): string {
    const u = new URL(playerEntryUrl())
    u.searchParams.set('url', p.url)
    if (p.title) u.searchParams.set('title', p.title)
    if (p.suburl) {
        u.searchParams.set('suburl', p.suburl)
        u.searchParams.set('sublabel', p.sublabel || '字幕')
    }
    if (p.t) u.searchParams.set('t', String(p.t))
    if (p.size) u.searchParams.set('size', String(p.size))
    return u.toString()
}

/**
 * 播放器有没有被部署上。
 *
 * iframe 指向一个 404 时不会触发 onerror，只会白屏，用户无从判断是没装还是坏了，
 * 所以先探一下。结果缓存起来，切集时不重复探。
 */
let deployed: boolean | null = null

export async function isPlayerDeployed(): Promise<boolean> {
    if (deployed !== null) return deployed
    try {
        const r = await fetch(playerEntryUrl(), {method: 'HEAD'})
        deployed = r.ok
    } catch {
        deployed = false
    }
    return deployed
}
