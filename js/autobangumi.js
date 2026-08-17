/**
 * AutoBangumi · Soft Ink —— 界面层
 *
 * themes/autobangumi.css 管配色和控件；这个脚本管「界面本身」。
 *
 * ── 它不是在改 ani-rss 的界面，是把 AutoBangumi 的界面渲染出来 ──────────────
 *
 * 早先的做法是拿 CSS 去掰 ani-rss 的 DOM（把顶栏掰成 topbar、用 display:contents
 * 把列表摊平、!important 盖掉 #app 的 max-width……）。那是在赌 ani-rss 的内部结构，
 * 换个版本、换个设置就散架，而且掰到最后也只是「像 AB」，不是 AB。
 *
 * 现在的做法：照 AutoBangumi 的源码把它的 DOM 原样建出来
 * （.layout-container / .topbar / .sidebar / .page-title / .bangumi-grid / .card…
 *  类名、层级、尺寸全部取自上游 webui 的 .vue），ani-rss 自己的顶栏和列表整个
 * 收起来 —— 它继续跑、继续持有全部状态和事件，只是不再负责显示。
 *
 * 卡片是镜像：从 ani-rss 的每张卡里取海报、标题、标签，用 AB 的
 * .card / .card-poster / .card-overlay 结构重画一遍；点上去就是点原来那颗按钮
 * （原按钮只是被收起来了，事件处理器还是 ani-rss 自己的）。
 * 弹窗一律不接管 —— 那些是 ani-rss 的真业务，CSS 已经把它们做成 AB 的 ab-modal 样子。
 *
 * ── 只做交集 ──────────────────────────────────────────────────────────────
 * 侧栏每一项都对应 ani-rss 真实存在的一个按钮，认不到就不出现。
 * 上游有、ani-rss 没有的（番剧日历、播放器、通知中心、多语言）一个都不造 ——
 * 摆一个点不动的入口比没有更糟。
 *
 * ── 硬约束 ────────────────────────────────────────────────────────────────
 * 1. 不搬、不删 ani-rss 的任何 DOM。只往 #app 末尾追加自己的一棵树，
 *    并给 <html> 加 ab-ui（CSS 里那一层界面样式只在这个类下生效）。
 * 2. 零依赖、零外部请求。图标是内联 SVG。
 * 3. 清空「自定义 JS」框刷新即全部还原；主题 CSS 单装时这一层一条也不生效，
 *    退回「只换配色和控件」的保守形态，不动 ani-rss 的布局。
 *
 * MIT，本文件为原创实现，不含第三方代码。
 */
(function () {
    'use strict'

    const FLAG = '__aniAutoBangumiUI'
    if (window[FLAG]) return
    window[FLAG] = true

    /* ==================== ani-rss 侧的锚点 ====================
     * 全部按结构找，不依赖预览页专有的 id —— 这些类名在 ani-rss 本体里同样存在。
     */
    const SEL = {
        app: '#app',
        content: '#app > .content',
        header: '#header',
        toolbar: '#header .add-button',
        search: '#header input.el-input__inner',
        selects: '#header .el-select',
        listWrap: '.list-container',
        listRoot: '.list-content',
        card: '.list-card-content',
        cardImg: '.list-card-image',
        cardTitle: '.list-card-title',
        cardTags: '.list-card-tags .el-tag',
        cardActions: '.list-card-actions button',
        cardTime: '.list-card-time',
        cardScore: '.list-card-score',
    }

    const COLLAPSE_KEY = 'ani-ab-sidebar-collapsed'

    /**
     * 侧栏导航。match 是在 ani-rss 顶栏里认按钮用的文字，认不到该项就不出现。
     * label 用上游侧栏的叫法 —— 这份主题的目的就是长得像上游。
     */
    const NAV = [
        {key: 'home', label: '主页', icon: 'home', home: true},
        {key: 'rss', label: 'RSS 管理', icon: 'rss', match: ['管理', 'Manage']},
        {key: 'download', label: '下载器', icon: 'download', match: ['下载', 'Download']},
        {key: 'log', label: '日志', icon: 'log', match: ['日志', 'Log', 'Logs']},
        {key: 'config', label: '设置', icon: 'setting', match: ['设置', 'Setting', 'Settings']},
    ]

    /** 留在顶栏右侧的图标钮（上游 .topbar-right 那一排） */
    const TOPBAR_ACTIONS = [
        {key: 'add', icon: 'plus', label: '添加', match: ['添加', 'Add'], solid: true},
        {key: 'refresh', icon: 'refresh', label: '刷新', match: ['刷新', 'Refresh']},
    ]

    /* ==================== 图标：照上游那套描线图标画 ==================== */
    const ICONS = {
        logo: '<circle cx="6" cy="18" r="2.2" fill="currentColor" stroke="none"/>' +
            '<path d="M4 11.5a8.5 8.5 0 0 1 8.5 8.5"/><path d="M4 5a15 15 0 0 1 15 15"/>',
        home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/><path d="M9.5 20v-5.5h5V20"/>',
        rss: '<circle cx="6" cy="18" r="1.6" fill="currentColor" stroke="none"/><path d="M4 11.5A8.5 8.5 0 0 1 12.5 20"/><path d="M4 5a15 15 0 0 1 15 15"/>',
        download: '<path d="M12 3v11"/><path d="m7.5 10 4.5 4.5L16.5 10"/><path d="M4 19h16"/>',
        log: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
        setting: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>',
        menu: '<path d="M4 7h16M4 12h11M4 17h16"/><path d="m17 9 3 3-3 3"/>',
        search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
        plus: '<path d="M12 5v14M5 12h14"/>',
        refresh: '<path d="M20 11a8 8 0 1 0-.6 4"/><path d="M20 5v6h-6"/>',
        edit: '<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z"/><path d="M14.5 6.5 17.5 9.5"/>',
        del: '<path d="M4 7h16"/><path d="M9 7V5h6v2"/><path d="M6 7l1 13h10l1-13"/>',
        files: '<rect x="4" y="6" width="12" height="14" rx="2"/><path d="M8 3h10a2 2 0 0 1 2 2v12"/>',
    }

    const svg = (name, size) =>
        '<svg viewBox="0 0 24 24" width="' + (size || 20) + '" height="' + (size || 20) + '" fill="none" ' +
        'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ' +
        'aria-hidden="true">' + (ICONS[name] || '') + '</svg>'

    /* ==================== 小工具 ==================== */
    const $ = (s, r) => (r || document).querySelector(s)
    const $$ = (s, r) => [...(r || document).querySelectorAll(s)]
    const txt = el => (el && el.textContent || '').replace(/\s+/g, ' ').trim()
    const el = (tag, cls, html) => {
        const n = document.createElement(tag)
        if (cls) n.className = cls
        if (html != null) n.innerHTML = html
        return n
    }

    /** 在 ani-rss 顶栏里按文字找按钮 */
    function findTool(names) {
        const root = $(SEL.toolbar) || $(SEL.header)
        if (!root) return null
        for (const n of names) {
            for (const b of $$('button', root)) if (txt(b) === n) return b
        }
        return null
    }

    /** 点原按钮 —— 它只是被收起来了，事件处理器还是 ani-rss 自己的 */
    function proxy(names) {
        const b = findTool(names)
        if (b) b.click()
    }

    /* ==================== 外壳 ==================== */

    let root = null      // .layout-container
    let grid = null      // .bangumi-grid
    let searchInput = null
    let pill = null

    function buildShell() {
        const c = el('div', 'layout-container')

        /* ---------- 顶栏：上游 .topbar ---------- */
        const topbar = el('div', 'topbar')

        const brand = el('div', 'topbar-brand')
        brand.innerHTML = '<span class="topbar-logo">' + svg('logo', 24) + '</span>' +
            '<span class="topbar-wordmark">ani-rss</span>'
        topbar.appendChild(brand)

        /* 上游的搜索是一颗 .search-trigger 按钮（点开搜索弹窗）。ani-rss 的搜索是
           就地过滤的输入框 —— 保留输入框的行为，外观按 .search-trigger 做，
           右边那颗 provider 药丸对应 ani-rss 的「启用状态」筛选。 */
        const searchBox = el('div', 'topbar-search')
        const trigger = el('div', 'search-trigger')
        trigger.innerHTML = '<span class="search-icon">' + svg('search', 18) + '</span>'
        searchInput = el('input', 'search-placeholder')
        searchInput.type = 'text'
        searchInput.placeholder = '输入关键字搜索'
        trigger.appendChild(searchInput)
        pill = el('button', 'search-provider')
        pill.type = 'button'
        pill.textContent = '筛选'
        trigger.appendChild(pill)
        searchBox.appendChild(trigger)
        topbar.appendChild(searchBox)

        /* 上游 .topbar-right：一排 32×32 的图标钮 */
        const right = el('div', 'topbar-right')
        topbar.appendChild(right)

        c.appendChild(topbar)

        /* ---------- 主体：侧栏 + 内容 ---------- */
        const main = el('div', 'layout-main')

        const side = el('div', 'sidebar')
        const inner = el('div', 'sidebar-inner')
        const head = el('button', 'sidebar-header')
        head.type = 'button'
        head.innerHTML = '<div class="sidebar-title">菜单</div>' +
            '<span class="sidebar-toggle-icon">' + svg('menu', 20) + '</span>'
        head.addEventListener('click', () => {
            const collapsed = side.classList.toggle('sidebar--collapsed')
            side.classList.toggle('sidebar--expanded', !collapsed)
            try {
                localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
            } catch (e) { /* 隐私模式下写不了，收起状态不记就是了 */
            }
        })
        inner.appendChild(head)
        inner.appendChild(el('nav', 'sidebar-nav'))
        side.appendChild(inner)

        let collapsed = false
        try {
            collapsed = localStorage.getItem(COLLAPSE_KEY) === '1'
        } catch (e) { /* 同上 */
        }
        side.classList.add(collapsed ? 'sidebar--collapsed' : 'sidebar--expanded')

        const content = el('div', 'layout-content')
        const title = el('div', 'page-title')
        title.innerHTML = '<h1 class="page-title-text">Bangumi List</h1><div class="page-title-accent"></div>'
        content.appendChild(title)

        const page = el('div', 'page-bangumi')
        grid = el('div', 'bangumi-grid')
        page.appendChild(grid)
        content.appendChild(page)

        main.appendChild(side)
        main.appendChild(content)
        c.appendChild(main)
        return c
    }

    /* ==================== 顶栏右侧 / 侧栏：绑到 ani-rss 的按钮 ==================== */

    function syncTopbarActions() {
        const right = $('.topbar-right', root)
        if (!right) return
        const want = TOPBAR_ACTIONS.filter(a => findTool(a.match))
        const sig = want.map(a => a.key).join(',')
        if (right.dataset.sig === sig) return
        right.dataset.sig = sig
        right.textContent = ''
        for (const a of want) {
            const b = el('button', 'ab-icon-btn ab-icon-btn--md' + (a.solid ? ' ab-icon-btn--solid' : ''), svg(a.icon, 18))
            b.type = 'button'
            b.title = a.label
            b.setAttribute('aria-label', a.label)
            b.addEventListener('click', () => proxy(a.match))
            right.appendChild(b)
        }
    }

    function syncNav() {
        const nav = $('.sidebar-nav', root)
        if (!nav) return
        const want = NAV.filter(i => i.home || findTool(i.match))
        const sig = want.map(i => i.key).join(',')
        if (nav.dataset.sig === sig) return
        nav.dataset.sig = sig
        nav.textContent = ''
        for (const i of want) {
            const a = el('button', 'sidebar-item' + (i.home ? ' sidebar-item--active' : ''))
            a.type = 'button'
            a.title = i.label
            a.innerHTML = svg(i.icon, 20) + '<div class="sidebar-item-label">' + i.label + '</div>'
            a.addEventListener('click', () => {
                if (i.home) {
                    const p = $('.page-bangumi', root)
                    if (p) p.scrollTo({top: 0, behavior: 'smooth'})
                    return
                }
                proxy(i.match)
            })
            nav.appendChild(a)
        }
    }

    /* ==================== 搜索 / 筛选：转发给 ani-rss 的原生控件 ==================== */

    let searchBound = false

    function bindSearch() {
        if (searchBound || !searchInput) return
        searchInput.addEventListener('input', () => {
            const real = $(SEL.search)
            if (!real) return
            real.value = searchInput.value
            /* Vue 的 v-model 监听原生 input 事件，这样赋值它才收得到 */
            real.dispatchEvent(new Event('input', {bubbles: true}))
        })
        searchBound = true
    }

    /* 药丸：点一下把 ani-rss 那个「启用状态」下拉打开（下拉本身是 teleport 到 body 的，
       原控件虽然被收起来了，弹出的面板照样能用） */
    let pillBound = false

    function bindPill() {
        if (pillBound || !pill) return
        pill.addEventListener('click', () => {
            const sels = $$(SEL.selects)
            const s = sels[sels.length - 1]
            if (s) (s.querySelector('.el-select__wrapper') || s).click()
        })
        pillBound = true
    }

    function syncPill() {
        if (!pill) return
        const sels = $$(SEL.selects)
        const s = sels[sels.length - 1]
        const v = s && txt(s.querySelector('.el-select__selected-item'))
        const next = v || '筛选'
        /* ⚠ 只在真的变了才写。textContent 即使赋同样的值也会换掉文本节点，
           那是一次 childList 变更 —— 观察器收到又触发一次挂载，挂载又写一次，
           死循环，渲染进程直接卡住。 */
        if (pill.textContent !== next) pill.textContent = next
    }

    /* ==================== 卡片：按上游 .card 的结构重画 ==================== */

    const TAG_TYPE = ['primary', 'success', 'warning', 'danger', 'info']

    function readCard(src) {
        const img = $(SEL.cardImg, src)
        const tags = $$(SEL.cardTags, src).map(t => {
            const cls = t.className
            const type = TAG_TYPE.find(x => cls.indexOf('el-tag--' + x) >= 0) || 'info'
            return {type, text: txt(t)}
        }).filter(t => t.text)
        return {
            poster: img ? img.getAttribute('src') : '',
            title: txt($(SEL.cardTitle, src)) || '',
            score: txt($(SEL.cardScore, src)) || '',
            time: txt($(SEL.cardTime, src)) || '',
            tags,
            actions: $$(SEL.cardActions, src),
            src,
        }
    }

    function tagHtml(t) {
        return '<span class="ab-tag ab-tag--' + t.type + '"><span class="ab-tag-text">' +
            t.text.replace(/[<>&]/g, ch => ({'<': '&lt;', '>': '&gt;', '&': '&amp;'}[ch])) +
            '</span></span>'
    }

    /** 认一下这颗原按钮是干什么的，好决定浮层里用哪个图标、要不要红 */
    function actionKind(btn) {
        if (btn.className.indexOf('el-button--danger') >= 0) return 'del'
        if (btn.className.indexOf('list-card-playlist') >= 0) return 'files'
        return 'edit'
    }

    function buildCard(d) {
        const card = el('div', 'card')
        card.setAttribute('role', 'button')
        card.tabIndex = 0

        const poster = el('div', 'card-poster')
        if (d.poster) {
            const im = el('img', 'card-img')
            im.src = d.poster
            im.alt = d.title
            im.loading = 'lazy'
            im.referrerPolicy = 'no-referrer'
            poster.appendChild(im)
        } else {
            poster.appendChild(el('div', 'card-placeholder', svg('files', 24)))
        }

        /* 上游浮层：底部两枚信息 chip + 中间的操作按钮 */
        const overlay = el('div', 'card-overlay')
        if (d.tags.length) {
            overlay.appendChild(el('div', 'card-overlay-tags',
                d.tags.slice(0, 2).map(tagHtml).join('')))
        }
        const acts = el('div', 'card-actions')
        for (const btn of d.actions) {
            const kind = actionKind(btn)
            const b = el('button', 'card-edit-btn' + (kind === 'del' ? ' card-edit-btn--danger' : ''), svg(kind, 18))
            b.type = 'button'
            b.title = btn.title || ''
            b.addEventListener('click', e => {
                e.stopPropagation()
                if (btn.isConnected) btn.click()
            })
            acts.appendChild(b)
        }
        overlay.appendChild(acts)
        poster.appendChild(overlay)

        card.appendChild(poster)

        /* ani-rss 独有的评分：按上游 .group-badge 的样子蹲在海报角上。
           ⚠ 必须挂在 .card 上 —— .card-poster 是 overflow:hidden 的（要裁圆角和封面），
           挂进去角标探出的那 8px 会被整齐切掉。 */
        if (d.score) {
            card.appendChild(el('div', 'group-badge', '<span class="badge-count">' + d.score + '</span>'))
        }

        const info = el('div', 'card-info')
        info.appendChild(el('div', 'card-title', ''))
        info.lastChild.textContent = d.title
        info.lastChild.title = d.title
        if (d.time) {
            const t = el('div', 'card-time')
            t.textContent = d.time
            info.appendChild(t)
        }
        card.appendChild(info)

        /* 点卡片 = 上游的「编辑规则」，对应 ani-rss 卡上那颗编辑按钮 */
        const edit = d.actions.find(b => actionKind(b) === 'edit')
        const open = () => {
            if (edit && edit.isConnected) edit.click()
        }
        card.addEventListener('click', open)
        card.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                open()
            }
        })
        return card
    }

    /** 卡片指纹：只有内容真的变了才重画，避免 Vue 每次重绘都闪一下 */
    function fingerprint(list) {
        return list.map(d => d.poster + '|' + d.title + '|' + d.score + '|' + d.time + '|' +
            d.tags.map(t => t.type + t.text).join('')).join('~')
    }

    function syncCards() {
        if (!grid) return
        const srcs = $$(SEL.card)
        const data = srcs.map(readCard)
        const fp = fingerprint(data)
        if (grid.dataset.fp === fp) {
            /* 内容没变但 Vue 可能换过节点，重新把代理指到新按钮上 */
            return
        }
        grid.dataset.fp = fp
        grid.textContent = ''
        if (!data.length) {
            const empty = el('div', 'bangumi-empty')
            empty.innerHTML = '<div class="empty-guide-title">暂无订阅</div>' +
                '<div class="empty-guide-subtitle">添加你的第一个 RSS 订阅开始使用</div>'
            grid.appendChild(empty)
            return
        }
        const frag = document.createDocumentFragment()
        for (const d of data) frag.appendChild(buildCard(d))
        grid.appendChild(frag)
    }

    /* ==================== 挂载 / 同步 ==================== */

    function mount() {
        const app = $(SEL.app)
        const content = $(SEL.content)
        if (!app || !content || !$(SEL.header)) return false

        /* ⚠ 必须挂进 .content 内部，不能当它的兄弟。
           CSS 那层收起来的是 .content 的子节点，.content 自己还占着一整屏高度 ——
           挂成兄弟的话新界面会被顶到视口外面去（实测 y=908，屏高 900，整页看着全白）。 */
        if (!root || !root.isConnected) {
            root = buildShell()
            content.appendChild(root)
            searchBound = pillBound = false
        }
        bindSearch()
        bindPill()
        syncTopbarActions()
        syncNav()
        syncPill()
        syncCards()
        return true
    }

    document.documentElement.classList.add('ab-ui')

    let raf = 0

    function schedule() {
        if (raf) return
        raf = requestAnimationFrame(() => {
            raf = 0
            /* 自己造的节点也会触发观察回调 —— 先断开再重连，免得递归 */
            mo.disconnect()
            try {
                mount()
            } finally {
                observe()
            }
        })
    }

    const mo = new MutationObserver(schedule)

    function observe() {
        /* 不观察 characterData：ani-rss 每次重绘都会改一堆文本，
           而我们关心的只是「卡片有没有增删」，childList 足够了 */
        if (document.body) mo.observe(document.body, {childList: true, subtree: true})
    }

    function start() {
        mount()
        observe()
        /* 兜底：登录页没有 #header，等 ani-rss 挂上来 */
        setInterval(() => {
            if (!root || !root.isConnected) schedule()
        }, 1000)
    }

    if (document.body) start()
    else document.addEventListener('DOMContentLoaded', start, {once: true})
})()
