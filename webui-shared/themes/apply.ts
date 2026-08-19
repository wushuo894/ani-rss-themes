import type {ThemeDef} from './types'

/**
 * 把一款主题落到页面上。
 *
 * 分三处生效：
 *  1. colors 交给调用方推给 Vuetify（这里不 import vuetify，保持 shared 层不依赖 UI 框架）
 *  2. vars 写成 :root 上的 CSS 变量
 *  3. css 装饰层注入一个 <style>，并用 html[data-ani-theme] 收窄作用域，切换时不会互相污染
 */

const STYLE_ID = 'ani-theme-style'
const VARS_ID = 'ani-theme-vars'

/** vars 的键 → CSS 变量名 */
const VAR_MAP: Record<string, string> = {
    font: '--ani-font',
    fontTitle: '--ani-font-title',
    fontMono: '--ani-font-mono',
    radius: '--ani-radius',
    radiusPill: '--ani-radius-pill',
    radiusInput: '--ani-radius-input',
    shadow: '--ani-shadow',
    letterSpacing: '--ani-letter-spacing',
    panelBlur: '--ani-panel-blur',
    surfaceAlpha: '--ani-surface-alpha',
}

function upsert(id: string): HTMLStyleElement {
    let el = document.getElementById(id) as HTMLStyleElement | null
    if (!el) {
        el = document.createElement('style')
        el.id = id
        document.head.appendChild(el)
    }
    return el
}

export function applyTheme(theme: ThemeDef | null): void {
    const root = document.documentElement

    if (!theme) {
        root.removeAttribute('data-ani-theme')
        upsert(VARS_ID).textContent = ''
        upsert(STYLE_ID).textContent = ''
        return
    }

    root.setAttribute('data-ani-theme', theme.id)

    // ── 变量层 ──
    const decls = Object.entries(theme.vars || {})
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => `  ${VAR_MAP[k] || `--ani-${k}`}: ${v};`)
        .join('\n')
    upsert(VARS_ID).textContent = decls ? `:root {\n${decls}\n}` : ''

    // ── 装饰层 ──
    // 用属性选择器把整段收窄，避免切主题后上一款的规则还挂着
    upsert(STYLE_ID).textContent = theme.css
        ? `html[data-ani-theme="${theme.id}"] {}\n${scope(theme.css, theme.id)}`
        : ''
}

/**
 * 给装饰层 CSS 加作用域前缀。
 *
 * 只处理顶层规则：@keyframes / @font-face 这类不能加前缀（加了就失效），
 * @media 需要递归进去处理内部规则。
 */
export function scope(css: string, id: string): string {
    const prefix = `html[data-ani-theme="${id}"]`
    const out: string[] = []
    let i = 0

    while (i < css.length) {
        // 跳过空白与注释
        const ws = css.slice(i).match(/^(\s|\/\*[\s\S]*?\*\/)+/)
        if (ws) {
            out.push(ws[0])
            i += ws[0].length
            continue
        }
        if (i >= css.length) break

        const braceAt = css.indexOf('{', i)
        if (braceAt < 0) {
            out.push(css.slice(i))
            break
        }

        const selector = css.slice(i, braceAt).trim()
        const end = matchBrace(css, braceAt)
        const body = css.slice(braceAt + 1, end)

        if (/^@(keyframes|font-face|import|charset|property)/.test(selector)) {
            // 原样保留：这些加了前缀就不再生效
            out.push(`${selector}{${body}}`)
        } else if (/^@(media|supports|container|layer)/.test(selector)) {
            out.push(`${selector}{${scope(body, id)}}`)
        } else {
            const scoped = selector
                .split(',')
                .map(s => s.trim())
                .filter(Boolean)
                .map(s => {
                    // html / :root 开头的选择器要把前缀合并进去，不能再嵌一层
                    if (/^(html|:root)\b/.test(s)) return s.replace(/^(html|:root)/, prefix)
                    if (s.startsWith('body')) return `${prefix} ${s}`
                    return `${prefix} ${s}`
                })
                .join(', ')
            out.push(`${scoped}{${body}}`)
        }

        i = end + 1
    }

    return out.join('')
}

/** 从 open（必须是 '{'）出发找配对的 '}' */
function matchBrace(s: string, open: number): number {
    let depth = 0
    for (let i = open; i < s.length; i++) {
        if (s[i] === '{') depth++
        else if (s[i] === '}' && --depth === 0) return i
    }
    return s.length - 1
}
