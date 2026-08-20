/**
 * 交给本机播放器打开：把地址拼成各家的 URL scheme。
 *
 * 网页播放走 webplayer（本地拆容器 → fMP4 → MSE），mkv 与 ASS 特效字幕都能放，
 * 所以这里不再是唯一出路，而是三种情况下的备选：
 *   1. 没部署 webplayer（webui/player/ 不存在）
 *   2. 想用本机播放器的硬件解码 —— 大码率 4K 在浏览器里解会吃力
 *   3. 手机上想丢给已经装好的播放器接着看
 *
 * ── 地址怎么拼，是这里唯一容易错的地方 ──
 *
 * 我们的视频地址长这样：`http://主机/api/file?filename=<base64>&s=<令牌>`，
 * 自带查询串，base64 里还有 `+ / =`。这两点决定了两类 scheme 必须区别对待：
 *
 *  A. 参数类 —— `scheme://x-callback-url/play?url=<地址>`：地址是某个参数的**值**，
 *     必须整串 encodeURIComponent。原来直接拼裸地址，`&s=<令牌>` 会被解析成
 *     scheme 自己的第二个参数，App 拿到的地址在第一个 & 处就断了 —— Infuse、
 *     SenPlayer 打不开就是这个原因，不是 App 的问题。Firecore 的文档里写得很直白：
 *     querystring 的值要么本身 url-safe，要么就得编码。
 *
 *  B. 路径类 —— `scheme://<地址>`：scheme 后面整串就是地址，`&` 不会截断，
 *     用 encodeURI（保留 `: / ? & =` 的结构，只转空格这类非法字符）。
 *     这一类后面**不能再拼自己的参数** —— 拼上去就成了视频地址查询串的一部分，
 *     发给我们自己的服务端，播放器根本读不到。MPV 那条原来就多挂了个
 *     `&mpv_force-media-title=`，标题没设上，还白白污染了地址。
 *
 * 参数名以各家文档 / bpking1/embyExternalUrl 里能跑通的那份为准，不自己发明。
 */
export interface ExternalPlayer {
    label: string
    icon: string
    url: string
}

/** A 类：整串当参数值 */
const q = (s: string) => encodeURIComponent(s)
/** B 类：整串当地址，保留结构字符 */
const path = (s: string) => encodeURI(s)

export function externalPlayers(src: string, name = '', sub = ''): ExternalPlayer[] {
    const url = src
    return [
        // B 类。PotPlayer 的附加参数用空格分隔，不是 &，所以可以安全地跟在后面
        {
            label: 'PotPlayer', icon: 'mdi-play-circle-outline',
            url: `potplayer://${path(url)}${sub ? ` /sub=${path(sub)}` : ''}${name ? ` /title="${name}"` : ''}`,
        },
        // VLC：vlc:// 只收地址不收字幕；有字幕时走它的 x-callback 入口，那个能带 sub
        {
            label: 'VLC', icon: 'mdi-cone',
            url: sub
                ? `vlc-x-callback://x-callback-url/stream?url=${q(url)}&sub=${q(sub)}`
                : `vlc://${path(url)}`,
        },
        // A 类
        {label: 'IINA', icon: 'mdi-apple', url: `iina://weblink?url=${q(url)}&new_window=1`},
        // B 类。标题参数塞不进去（见上），别再拼
        {label: 'MPV', icon: 'mdi-movie-open-outline', url: `mpvplay://${path(url)}`},
        {
            label: 'Infuse', icon: 'mdi-television-classic',
            url: `infuse://x-callback-url/play?url=${q(url)}`
                + (sub ? `&sub=${q(sub)}` : '')
                + (name ? `&filename=${q(name)}` : ''),
        },
        // 弹弹 Play 用 `|` 分隔附加字段，地址部分自己编码
        {
            label: '弹弹 Play', icon: 'mdi-comment-multiple-outline',
            url: `ddplay:${q(url)}${name ? `|filePath=${q(name)}` : ''}`,
        },
        {label: 'AnimacX', icon: 'mdi-animation-play-outline', url: `anix://openVideo/${q(url)}`},
        // SenPlayer 能跑通的形态只有 url 一个参数，多挂参数反而解析不出来
        {label: 'SenPlayer', icon: 'mdi-play-box-outline', url: `SenPlayer://x-callback-url/play?url=${q(url)}`},
    ]
}
