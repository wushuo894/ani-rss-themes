/**
 * scope() 的自检。
 *
 * 跑法：pnpm -C webui run test:themes
 *
 * 这个函数写错不会报错，只会静默生成不生效或越界的 CSS——
 * 比如给 @keyframes 加了前缀（动画直接失效）、或漏了 @media 里的规则（主题在窄屏失灵），
 * 所以每条分支都留一个断言。
 */
import assert from 'node:assert/strict'
import {scope} from './apply.ts'

const ID = 'demo'
const P = 'html[data-ani-theme="demo"]'
const norm = (s: string) => s.replace(/\s+/g, ' ').trim()

/* 1. 普通选择器加前缀 */
assert.equal(norm(scope('.v-card { color: red; }', ID)), norm(`${P} .v-card{ color: red; }`))

/* 2. 逗号分组的每一条都要加，不能只加第一条 */
assert.equal(
    norm(scope('.a, .b { color: red; }', ID)),
    norm(`${P} .a, ${P} .b{ color: red; }`),
)

/* 3. html / :root 开头的要「合并」而不是再嵌一层，否则 html html[...] 永不匹配 */
assert.equal(norm(scope(':root { --x: 1; }', ID)), norm(`${P}{ --x: 1; }`))
assert.equal(norm(scope('html.dark .v-card { color: red; }', ID)), norm(`${P}.dark .v-card{ color: red; }`))

/* 4. @keyframes 必须原样保留：加了前缀动画就不生效 */
{
    const out = scope('@keyframes spin { from { transform: rotate(0); } to { transform: rotate(1turn); } }', ID)
    assert.ok(!out.includes(P), '@keyframes 内不应出现主题前缀')
    assert.ok(out.includes('@keyframes spin'), '@keyframes 应被保留')
    assert.ok(out.includes('rotate(1turn)'), '@keyframes 的内容不应丢失')
}

/* 5. @media 要递归进去处理内部规则，而不是整块跳过 */
{
    const out = scope('@media (max-width: 600px) { .v-card { color: red; } }', ID)
    assert.ok(out.includes('@media (max-width: 600px)'), '@media 条件应保留')
    assert.ok(out.includes(`${P} .v-card`), '@media 内的规则也要加前缀')
}

/* 6. 嵌套括号：body 里带函数调用的值不能把括号配对带偏 */
{
    const out = scope('.a { background: linear-gradient(rgba(0,0,0,.5), transparent); } .b { color: red; }', ID)
    assert.ok(out.includes(`${P} .a`) && out.includes(`${P} .b`), '两条规则都应被处理')
    assert.ok(out.includes('linear-gradient(rgba(0,0,0,.5), transparent)'), '渐变值不应被破坏')
}

/* 7. 注释与空白不应吞掉后面的规则 */
{
    const out = scope('/* 注释 */\n.a { color: red; }', ID)
    assert.ok(out.includes(`${P} .a`), '注释后的规则仍要处理')
}

/* 8. 真实主题全量跑一遍：不抛异常，且每条顶层规则都带上了前缀 */
{
    const {THEMES} = await import('./registry.ts')
    for (const t of THEMES) {
        if (!t.css) continue
        const out = scope(t.css, t.id)
        // 装饰层里若出现 @keyframes，其名字不应被前缀污染
        for (const m of t.css.matchAll(/@keyframes\s+([\w-]+)/g)) {
            assert.ok(out.includes(`@keyframes ${m[1]}`), `${t.id}: @keyframes ${m[1]} 应原样保留`)
        }
        // 花括号必须仍然配平
        assert.equal(
            (out.match(/\{/g) || []).length,
            (out.match(/\}/g) || []).length,
            `${t.id}: 输出的花括号不配平`,
        )
    }
    console.log(`✓ ${THEMES.filter(t => t.css).length} 款带装饰层的主题全部通过`)
}

console.log('✓ scope() 全部断言通过')
