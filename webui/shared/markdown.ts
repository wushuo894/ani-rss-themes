/**
 * 一个够用就好的 Markdown 渲染器 —— 专门给「更新内容」用。
 *
 * 为什么不上 marked / markdown-it：
 * 输入是 GitHub Release 的正文，**别人写的、跨网来的**，直接塞进 v-html 就是 XSS。
 * 那两个库都得再配一个 DOMPurify 才敢用，两个依赖 ~50KB，还要乘以九款界面。
 * 这里反过来做：**先把整段转义成纯文本，再往里加我们自己生成的标签** ——
 * 输入里的 `<script>` 在第一步就已经是 `&lt;script&gt;` 了，之后无论怎么拼都是死的。
 * 不存在「漏过滤了某个标签」这种事，因为压根没有「过滤」这一步。
 *
 * 支持的就是 Release 正文里真会出现的那些：标题、有序/无序列表、围栏代码块、
 * 行内代码、引用、分割线、表格、粗体斜体删除线、链接和裸链接。
 * 不支持嵌套列表，也不支持内联 HTML —— 后者是故意的。
 */

const ESC: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
}

export function escapeHtml(s: string): string {
    return s.replace(/[&<>"]/g, c => ESC[c])
}

/** 只放行看得懂的协议：`javascript:` / `data:` 一律当普通文字，不给它变成可点的东西 */
function safeUrl(raw: string): string | null {
    const u = raw.trim()
    return /^(https?:\/\/|mailto:|#|\/)/i.test(u) ? u : null
}

/**
 * 行内规则。
 *
 * 生成好的片段先寄存在 slots 里、原地留一个 `<%3%>` 这样的占位符，最后一次性换回去 ——
 * 否则前一条规则吐出来的 `<a href="http://…">` 会被后一条「裸链接」规则再吃一遍，
 * 把 href 里的地址又包一层 a。
 *
 * 占位符敢用尖括号，正是因为**转义是第一步**：这一步之后，串里出现的每一个 `<`
 * 都只可能是我们自己写的，输入里的那个早变成 `&lt;` 了。
 */
function inline(src: string): string {
    const slots: string[] = []
    const hold = (html: string) => '<%' + (slots.push(html) - 1) + '%>'

    let s = escapeHtml(src)

    // 行内代码先摘走：反引号里的 `**` 就该原样显示，不是加粗
    s = s.replace(/`([^`\n]+)`/g, (_, code: string) => hold('<code>' + code + '</code>'))

    const link = (label: string, url: string) => {
        const safe = safeUrl(url)
        return safe === null
            ? label
            : hold(`<a href="${escapeHtml(safe)}" target="_blank" rel="noopener noreferrer">${label}</a>`)
    }

    // [文字](地址)
    s = s.replace(/\[([^\]\n]*)]\(([^)\s]+)(?:\s+&quot;[^)]*&quot;)?\)/g,
        (_, label: string, url: string) => link(label, url))
    // <https://…>：`<` 已经被转义了，所以这里匹配的是 &lt; &gt;
    s = s.replace(/&lt;(https?:\/\/[^\s&]+)&gt;/g, (_, url: string) => link(url, url))
    // 裸链接。末尾的标点不算地址的一部分：「见 https://a.b/c。」那个句号是句子的
    s = s.replace(/(^|[\s(])(https?:\/\/[^\s<]+)/g, (_, pre: string, url: string) => {
        const tail = /[.,;:。，、）)]+$/.exec(url)?.[0] ?? ''
        const clean = url.slice(0, url.length - tail.length)
        return pre + link(clean, clean) + tail
    })

    s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    s = s.replace(/~~([^~\n]+)~~/g, '<del>$1</del>')
    // 斜体：`*x*` 和 `_x_`。`_` 只认两边挨着词边界的，snake_case_name 不该变斜体
    s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
    s = s.replace(/(^|[\s(])_([^_\n]+)_(?=$|[\s.,;:)])/g, '$1<em>$2</em>')

    return s.replace(/<%(\d+)%>/g, (_, i: string) => slots[Number(i)])
}

const cells = (row: string) => row.replace(/^\||\|$/g, '').split('|').map(c => c.trim())

export function renderMarkdown(src: string): string {
    const lines = (src ?? '').replace(/\r\n?/g, '\n').split('\n')
    const out: string[] = []
    const bullet = /^\s*([-*+]|\d+[.)])\s+/
    let i = 0

    while (i < lines.length) {
        const line = lines[i]

        // 围栏代码块：里面一个字都不解析，原样转义
        const fence = /^\s*```+\s*(\S*)/.exec(line)
        if (fence) {
            const body: string[] = []
            for (i++; i < lines.length && !/^\s*```+\s*$/.test(lines[i]); i++) body.push(lines[i])
            i++ // 吃掉收尾那行
            const lang = fence[1] ? ` class="lang-${escapeHtml(fence[1])}"` : ''
            out.push(`<pre><code${lang}>${escapeHtml(body.join('\n'))}</code></pre>`)
            continue
        }

        if (!line.trim()) {
            i++
            continue
        }

        if (/^\s*([-*_])\s*\1\s*\1[\s\-*_]*$/.test(line)) {
            out.push('<hr>')
            i++
            continue
        }

        const head = /^(#{1,6})\s+(.*)$/.exec(line)
        if (head) {
            const n = head[1].length
            out.push(`<h${n}>${inline(head[2].trim())}</h${n}>`)
            i++
            continue
        }

        // 表格：一行表头 + 一行 |---|---| 才算，少了分隔线就只是普通段落
        if (line.includes('|') && i + 1 < lines.length && lines[i + 1].includes('-')
            && /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(lines[i + 1])) {
            const th = cells(line.trim())
            i += 2
            const rows: string[][] = []
            for (; i < lines.length && lines[i].trim() && lines[i].includes('|'); i++) {
                rows.push(cells(lines[i].trim()))
            }
            out.push('<table><thead><tr>' + th.map(c => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>'
                + rows.map(r => '<tr>' + r.map(c => `<td>${inline(c)}</td>`).join('') + '</tr>').join('')
                + '</tbody></table>')
            continue
        }

        if (/^\s*>/.test(line)) {
            const body: string[] = []
            for (; i < lines.length && /^\s*>/.test(lines[i]); i++) body.push(lines[i].replace(/^\s*>\s?/, ''))
            out.push(`<blockquote>${renderMarkdown(body.join('\n'))}</blockquote>`)
            continue
        }

        if (bullet.test(line)) {
            const tag = /^\s*\d/.test(line) ? 'ol' : 'ul'
            const items: string[] = []
            for (; i < lines.length && bullet.test(lines[i]); i++) items.push(lines[i].replace(bullet, ''))
            out.push(`<${tag}>` + items.map(t => `<li>${inline(t)}</li>`).join('') + `</${tag}>`)
            continue
        }

        // 段落：连着的非空行算一段，段内换行渲染成 <br>（Release 正文都是这么写的）
        const para: string[] = []
        for (; i < lines.length && lines[i].trim() && !/^\s*(#{1,6}\s|```|>)/.test(lines[i])
             && !bullet.test(lines[i]); i++) para.push(lines[i].trim())
        out.push(`<p>${para.map(inline).join('<br>')}</p>`)
    }

    return out.join('\n')
}
