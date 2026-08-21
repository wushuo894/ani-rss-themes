/**
 * 生成 PWA 用的图标：node webui/shared/tools/gen-icons.mjs
 *
 * 为什么自己画而不是丢几个 png 进仓库：这几张图是「一个圆角方块 + 一个 RSS 标记」，
 * 规则比图省事得多 —— 想换配色或者改安全区，改两个数重跑，不用找当初用什么工具导出的。
 * 只依赖 node:zlib，没有图形库。
 */
import {deflateSync} from 'node:zlib'
import {writeFileSync, mkdirSync} from 'node:fs'
import {resolve, join} from 'node:path'

const OUT = resolve(import.meta.dirname, '../../public')
mkdirSync(OUT, {recursive: true})

/** 底色取 vue 那款的 primary —— 九款里最中性的一个绿 */
const BG = [0x2b, 0x73, 0x52]
const FG = [0xff, 0xff, 0xff]

/* ── PNG 封装 ── */
const CRC = (() => {
    const t = new Int32Array(256)
    for (let n = 0; n < 256; n++) {
        let c = n
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
        t[n] = c
    }
    return buf => {
        let c = -1
        for (const b of buf) c = t[(c ^ b) & 0xff] ^ (c >>> 8)
        return (c ^ -1) >>> 0
    }
})()

const chunk = (type, data) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type, 'latin1'), data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(CRC(body))
    return Buffer.concat([len, body, crc])
}

function png(size, rgba) {
    const ihdr = Buffer.alloc(13)
    ihdr.writeUInt32BE(size, 0)
    ihdr.writeUInt32BE(size, 4)
    ihdr[8] = 8      // bit depth
    ihdr[9] = 6      // RGBA
    // 每行前面加一个 0：过滤器类型 None。不加这一字节解码器读出来是错位的花屏
    const raw = Buffer.alloc((size * 4 + 1) * size)
    for (let y = 0; y < size; y++) {
        raw[y * (size * 4 + 1)] = 0
        rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
    }
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, {level: 9})), chunk('IEND', Buffer.alloc(0)),
    ])
}

/* ── 画 ── 4×4 超采样，边缘才不是锯齿 */
const SS = 4

/**
 * @param size    像素边长
 * @param inset   图形离边多远（0~0.5），maskable 要留 40% 安全区
 * @param radius  圆角占边长的比例；给 0.5 就是圆
 * @param bleed   底色是否铺满整张（maskable 必须铺满，系统会自己裁形状）
 */
function icon(size, {inset = 0, radius = 0.22, bleed = false} = {}) {
    const px = Buffer.alloc(size * size * 4)
    const S = size
    const g = inset * S               // 图形边距
    const w = S - g * 2               // 图形边长
    const r = radius * w
    /* RSS 标记：左下一个点，右上两道同心弧，都以那个点为圆心 */
    const cx = g + w * 0.30, cy = g + w * 0.70
    const dot = w * 0.085
    const arcs = [[w * 0.26, w * 0.36], [w * 0.50, w * 0.60]]

    const inRounded = (x, y) => {
        const qx = Math.max(g + r - x, 0, x - (g + w - r))
        const qy = Math.max(g + r - y, 0, y - (g + w - r))
        if (x < g || y < g || x > g + w || y > g + w) return false
        return qx * qx + qy * qy <= r * r
    }
    const inGlyph = (x, y) => {
        const dx = x - cx, dy = y - cy
        const d = Math.hypot(dx, dy)
        if (d <= dot) return true
        // 只画右上那一象限：dx >= 0 且 dy <= 0
        if (dx < 0 || dy > 0) return false
        return arcs.some(([a, b]) => d >= a && d <= b)
    }

    for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
            let bg = 0, fg = 0
            for (let sy = 0; sy < SS; sy++) {
                for (let sx = 0; sx < SS; sx++) {
                    const px_ = x + (sx + 0.5) / SS, py_ = y + (sy + 0.5) / SS
                    const b = bleed ? true : inRounded(px_, py_)
                    if (!b) continue
                    bg++
                    if (inGlyph(px_, py_)) fg++
                }
            }
            const n = SS * SS
            const i = (y * S + x) * 4
            const a = bg / n
            if (a === 0) continue
            const f = fg / n / (a || 1)
            px[i] = BG[0] + (FG[0] - BG[0]) * f
            px[i + 1] = BG[1] + (FG[1] - BG[1]) * f
            px[i + 2] = BG[2] + (FG[2] - BG[2]) * f
            px[i + 3] = Math.round(a * 255)
        }
    }
    return png(S, px)
}

const files = [
    ['icon-192.png', icon(192)],
    ['icon-512.png', icon(512)],
    // maskable：系统会按自己的形状裁，底色必须铺满，图形缩进安全区
    ['icon-maskable-512.png', icon(512, {inset: 0.18, bleed: true})],
    // iOS 不读 manifest 的图标，只认这一个，而且不给圆角要自己画满
    ['apple-touch-icon.png', icon(180, {radius: 0.22})],
    ['favicon-32.png', icon(32, {radius: 0.2})],
]
for (const [name, buf] of files) {
    writeFileSync(join(OUT, name), buf)
    console.log(`${name}  ${buf.length} B`)
}
