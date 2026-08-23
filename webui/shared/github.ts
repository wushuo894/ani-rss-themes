/**
 * 自己去 GitHub 看一眼有没有新版界面。
 *
 * 正常这件事该后端做（POST /api/webui/getUpdate）：它认代理、认 githubToken，
 * 下载和解压也都在服务器上跑，浏览器不用碰 15MB 的压缩包。这份是**那条路坏了时的备胎**。
 *
 * 什么时候用得上：后端找不到 {configDir}/webui/webui.json 的时候。它会回「无 WebUI 更新」——
 * 不是真没有更新，是它没找到那份版本信息。关于页照着这个结果显示，就成了
 * 「当前 ani-rss 不支持在线更新界面」，而这时换界面那两个端点往往好使着。
 *
 * 见过两种：
 *  - 有过一版 3.2.17 的构建把路径写成了 new File(webuiDir, "webui/webui.json")，
 *    而 webuiDir 本身就是 {configDir}/webui —— 多了一级。上游 81f43b5 已经改回来，
 *    同一个版本号重新推的，镜像重新拉一次就好；拉之前就靠这份备胎顶着。
 *  - config/webui/ 是自己攒的，压根没放 webui.json。
 *
 * 这份备胎只查版本，**不下载**：GitHub 的发布资产最终落在
 * release-assets.githubusercontent.com 上，那个响应不带 Access-Control-Allow-Origin
 * （实测 302 之后的 206 响应里没有这个头），浏览器 fetch 拿不到，
 * 所以下载只能交给用户点一下链接（<a> 导航不受同源策略管）。
 * api.github.com 本身是带 `Access-Control-Allow-Origin: *` 的，查得动。
 */
import type {WebUI} from './types'

/*
 * 发布包根目录下的 webui.json —— 后端认的也是这一份。
 *
 * 字段不手抄：上游 e497071 起有个 WebUI 实体就是它（owner/repo/version/filename），
 * types.ts 从那个类生成。生成的字段全是可选（Gson 的 null 字段不出现在 JSON 里），
 * 而这里四个缺一个都查不了，所以在 readWebuiMeta 里挨个验过之后收成 Required。
 */
export type WebuiMeta = Required<WebUI>

export interface WebuiLatest {
    /** 最新一版的版本号（tag 去掉开头的 v） */
    latest: string
    /** 比装着的这版新 */
    update: boolean
    /** 对应资产的下载地址，没有同名资产时是空串 */
    downloadUrl: string
    /** 字节数，没有同名资产时是 0 */
    size: number
    /** Release 正文，Markdown */
    markdownBody: string
    /** 发布时间，ISO 串 */
    date: string
}

/**
 * 版本号比大小。
 *
 * 后端用的是 hutool 的 VersionComparator，这里只要覆盖我们自己发的形状（1.0.56）就够：
 * 按非数字切段，逐段按**数值**比 —— 按字符串比的话 '1.0.9' > '1.0.56'，
 * 到了两位数就再也提示不出新版本了。段数不同的短的一方补 0（1.0 == 1.0.0）。
 */
export function compareVersions(a: string, b: string): number {
    const seg = (v: string) => v.replace(/^[Vv]/, '').split(/[^0-9]+/).filter(s => s !== '').map(Number)
    const x = seg(a)
    const y = seg(b)
    for (let i = 0; i < Math.max(x.length, y.length); i++) {
        const d = (x[i] ?? 0) - (y[i] ?? 0)
        if (d) return d > 0 ? 1 : -1
    }
    return 0
}

/**
 * 读装在 {configDir}/webui/ 根下的那份 webui.json。
 *
 * 走的是自己这个源上的静态文件，不是接口 —— 不带令牌、不套 Result 信封。
 * 手动装（解压一个压缩包）和在线更新装出来的都有这份文件；
 * 自己攒的目录里没有的话回 null，调用方当「查不了」处理。
 */
export async function readWebuiMeta(baseUrl: string): Promise<WebuiMeta | null> {
    try {
        const res = await fetch(baseUrl + 'webui.json', {cache: 'no-store'})
        if (!res.ok) return null
        const meta = await res.json() as WebUI
        if (!meta?.owner || !meta.repo || !meta.version || !meta.filename) return null
        return meta as WebuiMeta
    } catch {
        return null
    }
}

/** GitHub releases/latest 里我们用得上的那几个字段 */
interface Release {
    tag_name?: string
    body?: string
    published_at?: string
    assets?: { name: string, size: number, browser_download_url: string }[]
}

/**
 * 问 GitHub 要 releases/latest，跟本地版本比一下。
 *
 * 不带令牌：匿名调用是按 IP 每小时 60 次，而这个请求只在「后端那条路坏了」时、
 * 每次打开关于页发一次。撞上限（403）就回 null，界面退回「查不了」而不是报错。
 */
export async function fetchLatest(meta: WebuiMeta): Promise<WebuiLatest | null> {
    try {
        const url = `https://api.github.com/repos/${encodeURIComponent(meta.owner)}/${encodeURIComponent(meta.repo)}/releases/latest`
        const res = await fetch(url, {headers: {Accept: 'application/vnd.github+json'}})
        if (!res.ok) return null

        const release = await res.json() as Release
        const latest = (release.tag_name ?? '').replace(/^[Vv]/, '')
        if (!latest) return null

        // 认包名，不认「第一个资产」：一次 Release 里九款界面各一个包，
        // 挑错了就是更新一次被换成另一款界面
        const asset = (release.assets ?? []).find(a => a.name === meta.filename)

        return {
            latest,
            update: compareVersions(latest, meta.version) > 0,
            downloadUrl: asset?.browser_download_url ?? '',
            size: asset?.size ?? 0,
            markdownBody: release.body ?? '',
            date: release.published_at ?? '',
        }
    } catch {
        // 断网、被墙、DNS 污染都走这里 —— 备胎查不到就是查不到，不该在关于页上弹错
        return null
    }
}
