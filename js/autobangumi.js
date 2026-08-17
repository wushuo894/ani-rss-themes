/**
 * AutoBangumi · Soft Ink —— 外壳层
 *
 * themes/autobangumi.css 的伴生脚本。CSS 已经把配色、控件、订阅卡改成了
 * AutoBangumi 的样子；剩下这一件 CSS 干不了：AutoBangumi 的主界面是
 * 「顶栏一条 + 左侧导航 + 右侧内容」的三块布局，而 ani-rss 的功能入口
 * 全挤在顶栏那一排文字按钮里。这个脚本把那排按钮拆成上游的侧边导航。
 *
 *   ani-rss                                AutoBangumi
 *   ┌────────────────────────────┐        ┌────────────────────────────┐
 *   │ 搜索 筛选  添加 下载 刷新 管理 │        │ logo  搜索 筛选      ⊕  ↻  │
 *   │           设置 日志          │        ├──────┬─────────────────────┤
 *   ├────────────────────────────┤   →    │ 主页  │ 订阅列表 ————        │
 *   │                            │        │ 下载器 │                     │
 *   │           列表              │        │ RSS   │        列表          │
 *   │                            │        │ 日志  │                     │
 *   └────────────────────────────┘        │ 设置  │                     │
 *                                         └──────┴─────────────────────┘
 *
 * ── 只做交集 ──────────────────────────────────────────────────────────────
 * 侧栏里的每一项都对应 ani-rss 真实存在的一个按钮，点它就是点原按钮
 * （原按钮只是被 CSS 收起来了，事件处理器还是 ani-rss 自己的）。
 * 上游有、ani-rss 没有的功能（番剧日历、播放器、通知中心）一律不造 ——
 * 摆一个点不动的入口比没有更糟。
 *
 * ── 三条硬约束 ────────────────────────────────────────────────────────────
 * 1. 不搬 ani-rss 的任何 DOM。整个布局靠 CSS Grid 的 grid-area 重排，
 *    网格位置和 DOM 顺序无关 —— Vue 那边看到的子节点顺序一个字没变，
 *    不会因为父节点被换掉而 patch 到错误的位置上。脚本只往 .content 末尾
 *    追加两个自己的节点（侧栏、页面标题）。
 * 2. 零依赖、零外部请求。图标是内联 SVG，不拉任何 CDN。
 * 3. 清空「自定义 JS」框刷新即全部还原，不写任何持久状态到 ani-rss 里
 *    （侧栏展开/收起记在 localStorage 的一个键上，删掉即恢复默认）。
 *
 * 单独装这份 JS 而不装 themes/autobangumi.css 是没有意义的：那份 CSS 里
 * 没有 html.ab-ui 那一段，节点建出来也没有样式。
 *
 * ── 装法 ──────────────────────────────────────────────────────────────────
 * ani-rss → 设置 → 基础设置 → 页面设置 → 自定义 → JS，填一行：
 *
 *   import("https://zzzwannasleep.github.io/ani-rss-themes/js/autobangumi.js")
 *
 * 或者把本文件全文粘进去。
 *
 * MIT，本文件为原创实现，不含第三方代码。
 */
(function () {
    'use strict'

    /* ==================== 重复注入防护 ==================== */

    // ani-rss 的自定义 JS 框在某些路径下会被执行两次；第二次直接退出，
    // 否则会建出两个侧栏。
    const FLAG = '__aniAutoBangumiUI'
    if (window[FLAG]) return
    window[FLAG] = true

    /* ==================== 配置 ==================== */

    const HEADER_SEL = '#header'      // ani-rss 的顶栏，见 Header.vue
    const TOOLBAR_SEL = '#toolbar'    // 顶栏右侧那排功能按钮
    const CONTENT_SEL = '#app > .content'

    const COLLAPSE_KEY = 'ani-ab-sidebar-collapsed'

    const PAGE_TITLE = '订阅列表'

    /**
     * 侧栏导航表。
     *
     * match 是用来在 ani-rss 顶栏里认按钮的文字，按顺序试，认到就绑。
     * 认不到的项不进侧栏（比如上游有下载器、ani-rss 那一版没有「下载」按钮），
     * 对应的原按钮也就继续留在顶栏，不会被藏掉。
     *
     * label 用的是 AutoBangumi 侧栏里的叫法，不是 ani-rss 的按钮名 ——
     * 这份主题的目的就是长得像上游。
     */
    const NAV = [
        {key: 'home', label: '主页', icon: 'home', home: true},
        {key: 'download', label: '下载器', icon: 'download', match: ['下载', 'Download']},
        {key: 'manage', label: 'RSS 管理', icon: 'rss', match: ['管理', 'Manage']},
        {key: 'log', label: '日志', icon: 'log', match: ['日志', 'Log', 'Logs']},
        {key: 'setting', label: '设置', icon: 'setting', match: ['设置', 'Setting', 'Settings']},
    ]

    // 留在顶栏、并且改成图标钮的按钮。第二个字段写进 data-ab-icon，
    // CSS 靠它决定是实心主色还是透明底。
    const KEEP = [
        {match: ['添加', 'Add'], style: 'primary'},
        {match: ['刷新', 'Refresh'], style: 'ghost'},
    ]

    /* ==================== 图标：照上游侧栏那几枚描线图标画 ==================== */

    const ICONS = {
        home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/><path d="M9.5 20v-5.5h5V20"/>',
        download: '<path d="M12 3v11"/><path d="m7.5 10 4.5 4.5L16.5 10"/><path d="M4 19h16"/>',
        rss: '<circle cx="6" cy="18" r="1.6" fill="currentColor" stroke="none"/><path d="M4 11.5A8.5 8.5 0 0 1 12.5 20"/><path d="M4 5a15 15 0 0 1 15 15"/>',
        log: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
        setting: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>',
        menu: '<path d="M4 7h16M4 12h11M4 17h16"/><path d="m17 9 3 3-3 3"/>',
    }

    const svg = name =>
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + '</svg>'

    /* ==================== 工具 ==================== */

    const $ = (sel, root) => (root || document).querySelector(sel)

    const text = el => (el.textContent || '').replace(/\s+/g, '').trim()

    /** 在顶栏里按文字找按钮。ani-rss 的按钮结构是 <button><i/><span>文字</span></button> */
    function findTool(names) {
        const toolbar = $(TOOLBAR_SEL) || $(HEADER_SEL)
        if (!toolbar) return null
        const btns = toolbar.querySelectorAll('button.el-button')
        for (const n of names) {
            for (const b of btns) {
                if (text(b) === n) return b
            }
        }
        return null
    }

    /* ==================== 建外壳 ==================== */

    let sidebar = null
    let pageTitle = null

    function buildSidebar() {
        const aside = document.createElement('aside')
        aside.className = 'ab-sidebar'
        aside.setAttribute('aria-label', PAGE_TITLE)

        const header = document.createElement('button')
        header.type = 'button'
        header.className = 'ab-sidebar-header'
        header.innerHTML =
            '<span class="ab-sidebar-toggle">' + svg('menu') + '</span>' +
            '<span class="ab-sidebar-title">菜单</span>'
        header.addEventListener('click', () => {
            const on = aside.classList.toggle('ab-sidebar--collapsed')
            try {
                localStorage.setItem(COLLAPSE_KEY, on ? '1' : '0')
            } catch (e) { /* 隐私模式下 localStorage 会抛，收起状态不记就是了 */
            }
        })

        const nav = document.createElement('nav')
        nav.className = 'ab-sidebar-nav'

        aside.appendChild(header)
        aside.appendChild(nav)

        try {
            if (localStorage.getItem(COLLAPSE_KEY) === '1') {
                aside.classList.add('ab-sidebar--collapsed')
            }
        } catch (e) { /* 同上 */
        }

        return aside
    }

    /**
     * 按 NAV 表填侧栏，并给原按钮打标记。
     * 每次 ani-rss 重绘顶栏都要重跑一遍 —— 原按钮换了新节点，代理得重新指过去。
     */
    function syncNav() {
        const nav = $('.ab-sidebar-nav')
        if (!nav) return

        const items = []
        for (const item of NAV) {
            let target = null
            if (!item.home) {
                target = findTool(item.match)
                if (!target) continue      // ani-rss 没有这个功能，就不摆这个入口
                target.setAttribute('data-ab-moved', item.key)
            }
            items.push({item, target})
        }

        // 内容没变就不重建，免得每次 Vue 重绘都闪一下
        const sig = items.map(x => x.item.key).join(',')
        if (nav.dataset.abSig === sig && nav.childElementCount === items.length) {
            // 目标节点可能被换过，重新绑一次即可
            items.forEach(({target}, i) => {
                nav.children[i].__abTarget = target
            })
            return
        }
        nav.dataset.abSig = sig
        nav.textContent = ''

        for (const {item, target} of items) {
            const btn = document.createElement('button')
            btn.type = 'button'
            btn.className = 'ab-nav-item' + (item.home ? ' is-active' : '')
            btn.innerHTML =
                '<span class="ab-nav-icon">' + svg(item.icon) + '</span>' +
                '<span class="ab-nav-label">' + item.label + '</span>'
            btn.__abTarget = target
            btn.addEventListener('click', () => {
                if (item.home) {
                    // ani-rss 只有这一个视图，「主页」就是回到列表顶部
                    const wrap = $('.list-container .el-scrollbar__wrap')
                    if (wrap) wrap.scrollTo({top: 0, behavior: 'smooth'})
                    return
                }
                // 点的是被收起来的原按钮，事件处理器是 ani-rss 自己的
                if (btn.__abTarget && btn.__abTarget.isConnected) btn.__abTarget.click()
                else {
                    const again = findTool(item.match)
                    if (again) again.click()
                }
            })
            nav.appendChild(btn)
        }
    }

    /** 留在顶栏的那两个按钮改成图标钮 */
    function syncKeep() {
        for (const k of KEEP) {
            const b = findTool(k.match)
            if (b) b.setAttribute('data-ab-icon', k.style)
        }
    }

    function buildPageTitle() {
        const div = document.createElement('div')
        div.className = 'ab-page-title'
        div.innerHTML = '<h1>' + PAGE_TITLE + '</h1>'
        return div
    }

    /** 把外壳挂上去。挂不上（还没渲染出来）就返回 false，等下一次观察回调再试。 */
    function mount() {
        const content = $(CONTENT_SEL)
        if (!content || !$(HEADER_SEL)) return false

        if (!sidebar || !sidebar.isConnected) {
            sidebar = buildSidebar()
            content.appendChild(sidebar)
        }
        if (!pageTitle || !pageTitle.isConnected) {
            pageTitle = buildPageTitle()
            content.appendChild(pageTitle)
        }

        syncNav()
        syncKeep()
        return true
    }

    /* ==================== 启动 ====================
     *
     * ani-rss 是 Vue 应用，脚本注入时列表页多半还没挂载；登录页更是压根没有
     * #header。用一个 MutationObserver 盯着 body，挂上去之后也继续盯 ——
     * 顶栏按钮会随 Vue 重绘换节点，代理要跟着重新指。
     */

    document.documentElement.classList.add('ab-ui')

    let raf = 0

    function schedule() {
        if (raf) return
        raf = requestAnimationFrame(() => {
            raf = 0
            mount()
        })
    }

    const mo = new MutationObserver(schedule)

    function start() {
        mount()
        mo.observe(document.body, {childList: true, subtree: true})
    }

    if (document.body) start()
    else document.addEventListener('DOMContentLoaded', start, {once: true})
})()
