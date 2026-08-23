/** 两个 WebUI 共用的格式化工具。纯函数，不依赖任何 UI 框架。 */

/** 字节数 → 人类可读。后端有的地方给了 formatSize 字符串，没给的地方用这个 */
export function formatSize(bytes?: number): string {
    if (bytes === undefined || bytes === null || Number.isNaN(bytes)) return '-'
    if (bytes < 1024) return `${bytes} B`
    const units = ['KiB', 'MiB', 'GiB', 'TiB', 'PiB']
    let v = bytes / 1024
    let i = 0
    while (v >= 1024 && i < units.length - 1) {
        v /= 1024
        i++
    }
    return `${v.toFixed(v >= 100 ? 0 : v >= 10 ? 1 : 2)} ${units[i]}`
}

/**
 * 时间戳 → 相对时间，口径与上游 js/format-time.js 完全一致：
 * 3 天以内说「N 天前」，再久就直接给绝对日期 —— 隔了两个月的更新说「2个月前」没有信息量。
 * 后端 lastDownloadTime 是毫秒时间戳；0 或空表示从未下载过，显示 '-'。
 */
export function fromNow(ts?: number): string {
    if (!ts) return '-'
    const diff = Date.now() - ts
    if (diff < 0) return '刚刚'

    const min = Math.floor(diff / 60000)
    if (min < 1) return '刚刚'
    if (min < 60) return `${min}分钟前`

    const hour = Math.floor(diff / 3600000)
    if (hour < 24) return `${hour}小时前`

    const day = Math.floor(diff / 86400000)
    if (day >= 1 && day <= 3) return `${day}天前`

    const d = new Date(ts)
    const p = (n: number) => String(n).padStart(2, '0')
    const md = `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
    return d.getFullYear() === new Date().getFullYear() ? md : `${d.getFullYear()}-${md}`
}

/** 毫秒时间戳 → 本地日期时间 */
export function formatTime(ts?: number): string {
    if (!ts) return '-'
    const d = new Date(ts)
    const p = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** 进度 0~1 → 百分比字符串 */
export function formatPercent(v?: number): string {
    if (v === undefined || v === null) return '-'
    return `${v.toFixed(v >= 1 ? 0 : 1)}%`
}

/** 集数显示：已更新 / 总数，总数未知时用 * —— 与上游一致 */
export function formatEpisodes(current?: number, total?: number): string {
    const c = current ?? 0
    return `${String(c).padStart(2, '0')} / ${total ? String(total).padStart(2, '0') : '*'}`
}
