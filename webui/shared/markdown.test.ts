/**
 * renderMarkdown 的回归测试。
 *
 * 这段代码的输出是要进 v-html 的，而输入是 GitHub Release 的正文 —— 别人写的、跨网来的。
 * 所以这里第一优先级不是「渲染得好不好看」，是**输入里的标签一个都不许活着出去**。
 * 转义漏一个尖括号，界面上什么都看不出来，但任何能改那个仓库 Release 的人
 * 就能在别人的 ani-rss 页面上执行脚本。
 *
 *   node --experimental-strip-types shared/markdown.test.ts
 */
import assert from 'node:assert/strict'
import {renderMarkdown} from './markdown.ts'

/* ── 一、注入：这一组挂了就是安全事故，不是渲染瑕疵 ── */
{
    const evil = [
        '<script>alert(1)</script>',
        '<img src=x onerror=alert(1)>',
        '<iframe src="javascript:alert(1)"></iframe>',
        '<div onclick="alert(1)">点我</div>',
        '`<script>alert(1)</script>`',
        '**<script>alert(1)</script>**',
        '> <script>alert(1)</script>',
        '- <img src=x onerror=alert(1)>',
        '# <script>alert(1)</script>',
        '| <script>alert(1)</script> | b |\n|---|---|\n| <b>x</b> | y |',
        '```\n<script>alert(1)</script>\n```',
    ]
    /*
     * 判据不是「有没有出现 script 这几个字」——「onerror=alert(1)」被转义成纯文字
     * 照样会出现在输出里，那是对的。真正的判据是**输出里的每一个标签都得是我们自己写的**：
     * 白名单之外的标签名一个都不许有，属性也只准是我们生成的那几个。
     */
    const TAGS = /<\/?([a-z][a-z0-9]*)((?:\s+[^<>]*)?)>/gi
    const ALLOWED_TAGS = new Set(['p', 'br', 'strong', 'em', 'del', 'code', 'pre', 'a', 'hr',
        'ul', 'ol', 'li', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
    const ALLOWED_ATTRS = /^(\s+(href="[^"]*"|target="_blank"|rel="noopener noreferrer"|class="lang-[^"]*"))*$/

    for (const src of evil) {
        const html = renderMarkdown(src)
        for (const m of html.matchAll(TAGS)) {
            assert.ok(ALLOWED_TAGS.has(m[1].toLowerCase()), `漏出了标签 <${m[1]}>：${src} → ${html}`)
            assert.match(m[2], ALLOWED_ATTRS, `漏出了属性「${m[2]}」：${src} → ${html}`)
        }
    }

    // 链接的协议白名单：不认识的协议连 href 都不给，直接退回纯文字
    for (const bad of ['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'vbscript:x']) {
        const html = renderMarkdown(`[点我](${bad})`)
        assert.ok(!/href=/i.test(html), `不该给出 href：${bad} → ${html}`)
    }
    assert.match(renderMarkdown('[文档](https://docs.example.com)'), /<a href="https:\/\/docs\.example\.com"/)
    // 正常链接要带 noopener：target=_blank 不带它，新页面能反过来改开它的那一页
    assert.match(renderMarkdown('[x](https://a.b)'), /rel="noopener noreferrer"/)
}

/* ── 二、占位符不能被正文里的数字撞上 ── */
{
    // 曾经占位符是「空格+编号+空格」，于是正文里的「 60 」会被当成槽位编号换成 undefined
    const html = renderMarkdown('日志从 5 条加到 60 条，见 `LOG_SEED`')
    assert.ok(!html.includes('undefined'), html)
    assert.ok(html.includes('60 条'), html)
    assert.ok(html.includes('<code>LOG_SEED</code>'), html)
}

/* ── 三、Release 正文里真会出现的块 ── */
{
    assert.equal(renderMarkdown('## 更新内容'), '<h2>更新内容</h2>')
    assert.equal(renderMarkdown('- 甲\n- 乙'), '<ul><li>甲</li><li>乙</li></ul>')
    assert.equal(renderMarkdown('1. 甲\n2. 乙'), '<ol><li>甲</li><li>乙</li></ol>')
    assert.equal(renderMarkdown('---'), '<hr>')
    assert.match(renderMarkdown('**粗** 和 *斜* 和 ~~删~~'), /<strong>粗<\/strong>.*<em>斜<\/em>.*<del>删<\/del>/)

    // 围栏代码块里的一切都不解析
    const code = renderMarkdown('```bash\ncurl -fsSL https://x/y | bash\n```')
    assert.match(code, /<pre><code class="lang-bash">/)
    assert.ok(!code.includes('<a href'), '代码块里的地址不该变成链接：' + code)

    // 表格 —— 我们自己的发布说明里就有一张
    const table = renderMarkdown('| 压缩包 | 长什么样 |\n|---|---|\n| `a.zip` | 甲 |')
    assert.match(table, /<table><thead><tr><th>压缩包<\/th><th>长什么样<\/th><\/tr><\/thead>/)
    assert.match(table, /<td><code>a\.zip<\/code><\/td><td>甲<\/td>/)

    assert.match(renderMarkdown('> 注意事项'), /<blockquote><p>注意事项<\/p><\/blockquote>/)

    // 裸链接后面跟着句号：句号是句子的，不是地址的
    assert.match(renderMarkdown('见 https://a.b/c。'), /<a href="https:\/\/a\.b\/c"[^>]*>https:\/\/a\.b\/c<\/a>。/)
    // snake_case 不是斜体
    assert.ok(!renderMarkdown('改了 some_var_name 这个').includes('<em>'))
}

/* ── 四、空输入不许炸：老后端的 markdownBody 可能压根没有 ── */
assert.equal(renderMarkdown(''), '')
assert.equal(renderMarkdown(undefined as unknown as string), '')

console.log('✓ renderMarkdown 断言通过（含 15 条注入用例）')
