/**
 * 预览页交互层
 *
 * 目标是把 ani-rss 的界面与交互静态复刻出来：弹窗、下拉、标签页、折叠面板都走
 * Element Plus 真实的类名与过渡动画（dialog-fade / el-zoom-in-top / el-collapse-transition），
 * 设置里的开关也真的作用于列表 —— 这样主题在各种状态下的样子都能看到。
 *
 * 数据来自 preview/data.js（Bangumi 每日放送快照 + 演示用的虚构字段）。
 */
(function () {
    'use strict'

    /* ==================== Element Plus 图标（@element-plus/icons-vue，MIT） ==================== */
    const P = d => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">' + d + '</svg>'
    const ICON = {
        search: P('<path fill="currentColor" d="m795.904 750.72 124.992 124.928a32 32 0 0 1-45.248 45.248L750.656 795.904a416 416 0 1 1 45.248-45.248zM480 832a352 352 0 1 0 0-704 352 352 0 0 0 0 704"/>'),
        caret2: P('<path fill="currentColor" d="M831.872 340.864 512 652.672 192.128 340.864a30.59 30.59 0 0 0-42.752 0 29.12 29.12 0 0 0 0 41.6L489.664 714.24a32 32 0 0 0 44.672 0l340.288-331.712a29.12 29.12 0 0 0 0-41.728 30.59 30.59 0 0 0-42.752 0z"/>'),
        caret: P('<path fill="currentColor" d="m192 384 320 384 320-384z"/>'),
        plus: P('<path fill="currentColor" d="M480 480V128a32 32 0 0 1 64 0v352h352a32 32 0 1 1 0 64H544v352a32 32 0 1 1-64 0V544H128a32 32 0 0 1 0-64z"/>'),
        minus: P('<path fill="currentColor" d="M128 544h768a32 32 0 1 0 0-64H128a32 32 0 0 0 0 64"/>'),
        download: P('<path fill="currentColor" d="M160 832h704a32 32 0 1 1 0 64H160a32 32 0 1 1 0-64m384-253.696 236.288-236.352 45.248 45.248L508.8 704 192 387.2l45.248-45.248L480 584.704V128h64z"/>'),
        refresh: P('<path fill="currentColor" d="M771.776 794.88A384 384 0 0 1 128 512h64a320 320 0 0 0 555.712 216.448H654.72a32 32 0 1 1 0-64h149.056a32 32 0 0 1 32 32v148.928a32 32 0 1 1-64 0v-50.56zM276.288 295.616h92.992a32 32 0 0 1 0 64H220.16a32 32 0 0 1-32-32V178.56a32 32 0 0 1 64 0v50.56A384 384 0 0 1 896.128 512h-64a320 320 0 0 0-555.776-216.384z"/>'),
        fold: P('<path fill="currentColor" d="M896 192H128v128h768zm0 256H384v128h512zm0 256H128v128h768zM320 384 128 512l192 128z"/>'),
        setting: P('<path fill="currentColor" d="M600.704 64a32 32 0 0 1 30.464 22.208l35.2 109.376c14.784 7.232 28.928 15.36 42.432 24.512l112.384-24.192a32 32 0 0 1 34.432 15.36L944.32 364.8a32 32 0 0 1-4.032 37.504l-77.12 85.12a357 357 0 0 1 0 49.024l77.12 85.248a32 32 0 0 1 4.032 37.504l-88.704 153.6a32 32 0 0 1-34.432 15.296L708.8 803.904c-13.44 9.088-27.648 17.28-42.368 24.512l-35.264 109.376A32 32 0 0 1 600.704 960H423.296a32 32 0 0 1-30.464-22.208L357.696 828.48a352 352 0 0 1-42.56-24.64l-112.32 24.256a32 32 0 0 1-34.432-15.36L79.68 659.2a32 32 0 0 1 4.032-37.504l77.12-85.248a357 357 0 0 1 0-48.896l-77.12-85.248A32 32 0 0 1 79.68 364.8l88.704-153.6a32 32 0 0 1 34.432-15.296l112.32 24.256c13.568-9.152 27.776-17.408 42.56-24.64l35.2-109.312A32 32 0 0 1 423.232 64H600.64zM512 320a192 192 0 1 1 0 384 192 192 0 0 1 0-384m0 64a128 128 0 1 0 0 256 128 128 0 0 0 0-256"/>'),
        tickets: P('<path fill="currentColor" d="M192 128v768h640V128zm-32-64h704a32 32 0 0 1 32 32v832a32 32 0 0 1-32 32H160a32 32 0 0 1-32-32V96a32 32 0 0 1 32-32m160 448h384v64H320zm0-192h192v64H320zm0 384h384v64H320z"/>'),
        files: P('<path fill="currentColor" d="M128 384v448h768V384zm-32-64h832a32 32 0 0 1 32 32v512a32 32 0 0 1-32 32H96a32 32 0 0 1-32-32V352a32 32 0 0 1 32-32m64-128h704v64H160zm96-128h512v64H256z"/>'),
        edit: P('<path fill="currentColor" d="M832 512a32 32 0 1 1 64 0v352a32 32 0 0 1-32 32H160a32 32 0 0 1-32-32V160a32 32 0 0 1 32-32h352a32 32 0 0 1 0 64H192v640h640z"/><path fill="currentColor" d="m469.952 554.24 52.8-7.552L847.104 222.4a32 32 0 1 0-45.248-45.248L477.44 501.44l-7.552 52.8zm422.4-422.4a96 96 0 0 1 0 135.808l-331.84 331.84a32 32 0 0 1-18.112 9.088L436.8 623.68a32 32 0 0 1-36.224-36.224l15.104-105.6a32 32 0 0 1 9.024-18.112l331.904-331.84a96 96 0 0 1 135.744 0z"/>'),
        del: P('<path fill="currentColor" d="M160 256H96a32 32 0 0 1 0-64h256V95.936a32 32 0 0 1 32-32h256a32 32 0 0 1 32 32V192h256a32 32 0 1 1 0 64h-64v672a32 32 0 0 1-32 32H192a32 32 0 0 1-32-32zm448-64v-64H416v64zM224 896h576V256H224zm192-128a32 32 0 0 1-32-32V416a32 32 0 0 1 64 0v320a32 32 0 0 1-32 32m192 0a32 32 0 0 1-32-32V416a32 32 0 0 1 64 0v320a32 32 0 0 1-32 32"/>'),
        close: P('<path fill="currentColor" d="M764.288 214.592 512 466.88 259.712 214.592a31.936 31.936 0 0 0-45.12 45.12L466.752 512 214.592 764.288a31.936 31.936 0 1 0 45.12 45.12L512 557.248l252.288 252.16a31.936 31.936 0 0 0 45.12-45.12L557.248 512l252.16-252.288a31.936 31.936 0 1 0-45.12-45.12z"/>'),
        arrow: P('<path fill="currentColor" d="M340.864 149.312a30.59 30.59 0 0 0 0 42.752L652.736 512 340.864 831.872a30.59 30.59 0 0 0 0 42.752 29.12 29.12 0 0 0 41.6 0L714.24 534.336a32 32 0 0 0 0-44.672L382.464 149.312a29.12 29.12 0 0 0-41.6 0z"/>'),
        check: P('<path fill="currentColor" d="M406.656 706.944 195.84 496.256a32 32 0 1 0-45.248 45.248l256 256 512-512a32 32 0 0 0-45.248-45.248z"/>'),
        auto: P('<path fill="currentColor" d="M512 64a448 448 0 1 1 0 896 448 448 0 0 1 0-896m0 64v768a384 384 0 0 0 0-768"/>'),
        gear: P('<path fill="currentColor" d="M512 288a224 224 0 1 0 0 448 224 224 0 0 0 0-448m0 64a160 160 0 1 1 0 320 160 160 0 0 1 0-320M480 96h64v96h-64zm0 736h64v96h-64zM96 480h96v64H96zm736 0h96v64h-96zM196.9 241.5l45.3-45.3 67.9 67.9-45.3 45.3zm516.9 516.9 45.3-45.3 67.9 67.9-45.3 45.3zM264.1 713.1l45.3 45.3-67.9 67.9-45.3-45.3zm516.9-516.9 45.3 45.3-67.9 67.9-45.3-45.3z"/>'),
        moon: P('<path fill="currentColor" d="M240.448 240.448a384 384 0 1 0 559.424 525.696 448 448 0 0 1-542.016-542.08 390 390 0 0 0-17.408 16.384m181.056 362.048a384 384 0 0 0 525.632 16.384A448 448 0 1 1 405.056 76.8a384 384 0 0 0 16.448 525.696"/>'),
    }

    const $ = s => document.querySelector(s)
    const $$ = s => [].slice.call(document.querySelectorAll(s))
    const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]))
    const fillIcons = root => (root || document).querySelectorAll('[data-icon]').forEach(el => {
        if (!el.firstChild) el.innerHTML = ICON[el.dataset.icon] || ''
    })

    /* ==================== 顶部工具栏 ==================== */
    const TOOLS = [
        ['plus', '添加', 'el-button--primary', 'add'],
        ['download', '下载', '', 'dlg-download'],
        ['refresh', '刷新', '', 'refresh'],
        ['fold', '管理', '', 'dlg-manage'],
        ['setting', '设置', '', 'dlg-settings'],
        ['tickets', '日志', '', 'dlg-logs'],
    ]

    $('#toolbar').innerHTML = TOOLS.map(([ic, text, type, act], i) =>
        '<div style="margin:' + (i === TOOLS.length - 1 ? '0 0 0 4px' : '0 4px') + '">' +
        '<button type="button" class="el-button ' + type + ' is-text is-has-bg" data-act="' + act + '">' +
        '<span class=""><i class="el-icon el-icon--left" data-icon="' + ic + '"></i> ' + text + ' </span></button></div>'
    ).join('')

    /* ==================== 订阅列表 ==================== */
    const DATA = window.ANI_DATA || []
    const list = $('#list')

    const card = a =>
        '<div><div class="el-card is-never-shadow"><div class="el-card__body">' +
        '<div class="list-card-content">' +
        '<div class="list-card-image-container"><img src="' + esc(a.cover) + '" alt="' + esc(a.t) + '" class="list-card-image" loading="lazy" referrerpolicy="no-referrer"></div>' +
        '<div class="list-card-info"><div class="list-card-info-inner">' +
        '<div class="flex"><span class="el-text is-truncated is-line-clamp list-card-title" style="-webkit-line-clamp:1" title="' + esc(a.t) + '">' + esc(a.t) + '</span></div>' +
        '<div class="list-card-score-container"><h4 class="list-card-score">' + esc(a.score) + '</h4></div>' +
        '<span class="el-text el-text--small list-card-url">https://mikanani.me/RSS/Bangumi?bangumiId=' + (3000 + a.t.length * 7) + '</span>' +
        '<div class="list-card-tags gtc3">' +
        tag('primary', ' 第 ' + a.s + ' 季 ') +
        (a.on ? tag('success', ' 已启用 ') : tag('info', ' 未启用 ')) +
        tag('info', '<span class="el-text el-text--small is-line-clamp list-card-subgroup" style="-webkit-line-clamp:1" title="' + esc(a.sub) + '">' + esc(a.sub) + '</span>') +
        tag('warning', esc(a.ep)) +
        tag('danger', a.ova ? ' ova ' : ' tv ') +
        (a.sb ? tag('primary', ' 备用RSS ') : '') +
        '</div>' +
        '<span class="el-text el-text--info el-text--small list-card-time">' + esc(a.ago) + '</span>' +
        '</div>' +
        '<div class="list-card-actions">' +
        '<button type="button" class="el-button is-text is-has-bg list-card-playlist"><span class=""><i class="el-icon" data-icon="files"></i></span></button>' +
        '<div class="list-card-spacer list-card-playlist"></div>' +
        '<button type="button" class="el-button is-text is-has-bg"><span class=""><i class="el-icon" data-icon="edit"></i></span></button>' +
        '<div class="list-card-spacer"></div>' +
        '<button type="button" class="el-button el-button--danger is-text is-has-bg"><span class=""><i class="el-icon" data-icon="del"></i></span></button>' +
        '</div></div></div></div></div></div>'

    function tag(type, inner) {
        return '<span class="el-tag el-tag--' + type + ' el-tag--light"><span class="el-tag__content">' + inner + '</span></span>'
    }

    let filterText = ''
    let filterEnable = '已启用'

    function renderList() {
        const items = DATA.filter(a =>
            (!filterText || a.t.toLowerCase().indexOf(filterText.toLowerCase()) >= 0) &&
            (filterEnable === '全部' || (filterEnable === '已启用') === !!a.on)
        )
        const weeks = []
        items.forEach(a => { if (weeks.indexOf(a.w) < 0) weeks.push(a.w) })
        list.innerHTML = weeks.length
            ? weeks.map(w =>
                '<div><h2 class="list-week-title">' + esc(w) + '</h2>' +
                '<div class="grid-container">' + items.filter(a => a.w === w).map(card).join('') + '</div></div>'
            ).join('')
            : '<div class="el-empty" style="padding:60px 0"><div class="el-empty__description"><p>暂无数据</p></div></div>'
        fillIcons(list)
    }

    renderList()

    $('#search').addEventListener('input', e => {
        filterText = e.target.value.trim()
        renderList()
    })

    /* 卡片列数：跟着可用宽度走，和真实应用一样 */
    function autoColumns() {
        const w = $('#app').offsetWidth
        const n = Math.max(1, Math.min(4, Math.floor(w / 400)))
        document.documentElement.style.setProperty('--ani-grid-columns', n)
    }

    autoColumns()
    window.addEventListener('resize', autoColumns)

    /* ==================== 弹窗：走 Element Plus 真实过渡 ==================== */
    function openDialog(id) {
        const ov = document.getElementById(id)
        if (!ov) return
        ov.style.display = ''
        ov.classList.add('dialog-fade-enter-active')
        setTimeout(() => ov.classList.remove('dialog-fade-enter-active'), 300)
        // 标签页高亮条要等弹窗完成布局后才量得到，动画结束再补一次
        if (id === 'dlg-settings') {
            requestAnimationFrame(positionBar)
            setTimeout(positionBar, 320)
        }
    }

    function closeDialog(ov) {
        ov.classList.add('dialog-fade-leave-active')
        setTimeout(() => {
            ov.classList.remove('dialog-fade-leave-active')
            ov.style.display = 'none'
        }, 300)
    }

    document.addEventListener('click', e => {
        const btn = e.target.closest('[data-act]')
        if (btn) {
            const act = btn.dataset.act
            if (act === 'add') return toggleDropdown(btn)
            if (act === 'refresh') return toast('已开始刷新全部订阅')
            return openDialog(act)
        }
        const close = e.target.closest('[data-close]')
        if (close) return closeDialog(close.closest('.el-overlay'))
        // 点遮罩空白处关闭，和真实应用一致
        if (e.target.classList && e.target.classList.contains('el-overlay-dialog')) {
            closeDialog(e.target.closest('.el-overlay'))
        }
    })

    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return
        $$('.el-overlay').forEach(ov => { if (ov.style.display !== 'none') closeDialog(ov) })
        killPopper()
    })

    /* ==================== 浮层：下拉菜单 / 选择器 ==================== */
    let popper = null

    function killPopper() {
        if (!popper) return
        const p = popper
        popper = null
        p.classList.add('el-zoom-in-top-leave-active')
        setTimeout(() => p.remove(), 200)
    }

    function makePopper(anchor, cls, html) {
        killPopper()
        const r = anchor.getBoundingClientRect()
        const p = document.createElement('div')
        p.className = 'pv-popper el-popper is-light is-pure ' + cls + ' el-zoom-in-top-enter-from'
        p.innerHTML = html
        document.body.appendChild(p)
        p.style.left = Math.min(r.left, window.innerWidth - p.offsetWidth - 8) + 'px'
        p.style.top = (r.bottom + 6) + 'px'
        p.style.minWidth = r.width + 'px'
        requestAnimationFrame(() => {
            p.classList.remove('el-zoom-in-top-enter-from')
            p.classList.add('el-zoom-in-top-enter-active')
        })
        popper = p
        return p
    }

    function toggleDropdown(btn) {
        if (popper && popper.dataset.owner === 'add') return killPopper()
        const p = makePopper(btn, 'el-dropdown__popper',
            '<div class="el-dropdown-menu">' +
            '<li class="el-dropdown-menu__item">添加订阅</li>' +
            '<li class="el-dropdown-menu__item">添加合集</li>' +
            '</div>')
        p.dataset.owner = 'add'
    }

    const SELECTS = {
        month: ['2026-07', '2026-04', '2026-01', '2025-10'],
        enable: ['全部', '已启用', '未启用'],
        order: ['评分', '标题', '更新时间', '添加时间'],
    }

    document.addEventListener('click', e => {
        // 「添加」按钮自己会开下拉，别在这里把它关掉
        if (e.target.closest('[data-act]')) return
        const sel = e.target.closest('.el-select[data-select]')
        if (!sel) {
            if (!e.target.closest('.pv-popper')) killPopper()
            return
        }
        const key = sel.dataset.select
        if (popper && popper.dataset.owner === key) return killPopper()
        const cur = sel.querySelector('[data-value]').textContent.trim()
        const p = makePopper(sel, 'el-select__popper',
            '<div class="el-select-dropdown"><div class="el-select-dropdown__list">' +
            SELECTS[key].map(v =>
                '<li class="el-select-dropdown__item' + (v === cur ? ' selected is-selected' : '') + '">' + esc(v) + '</li>'
            ).join('') + '</div></div>')
        p.dataset.owner = key
        p.querySelectorAll('.el-select-dropdown__item').forEach(li => li.addEventListener('click', () => {
            const label = sel.querySelector('[data-value]')
            label.textContent = li.textContent
            label.parentElement.classList.remove('is-transparent')
            if (key === 'enable') { filterEnable = li.textContent; renderList() }
            killPopper()
        }))
    })

    /* ==================== 设置：标签页 ==================== */
    const tabnav = $('#tabnav')
    const bar = $('#activebar')

    function positionBar() {
        const act = tabnav.querySelector('.el-tabs__item.is-active')
        if (!act || !act.offsetWidth) return
        bar.style.width = act.offsetWidth + 'px'
        bar.style.transform = 'translateX(' + act.offsetLeft + 'px)'
    }

    tabnav.addEventListener('click', e => {
        const it = e.target.closest('.el-tabs__item')
        if (!it) return
        tabnav.querySelectorAll('.el-tabs__item').forEach(x => x.classList.remove('is-active'))
        it.classList.add('is-active')
        positionBar()
        $$('.el-tab-pane').forEach(p => p.style.display = p.dataset.pane === it.dataset.tab ? '' : 'none')
    })

    /* ==================== 设置：折叠面板 ==================== */
    $('#basicCollapse').addEventListener('click', e => {
        const head = e.target.closest('.el-collapse-item__header')
        if (!head) return
        const item = head.parentElement
        const wrap = item.querySelector('.el-collapse-item__wrap')
        if (!wrap) return
        const open = item.classList.toggle('is-active')
        head.classList.toggle('is-active', open)
        const arrow = head.querySelector('.el-collapse-item__arrow')
        if (arrow) arrow.classList.toggle('is-active', open)
        wrap.classList.add('el-collapse-transition-enter-active')
        wrap.style.maxHeight = open ? wrap.scrollHeight + 'px' : '0px'
    })

    /* ==================== 设置：页面设置里的开关真的生效 ==================== */
    $('#appearance').addEventListener('click', e => {
        const b = e.target.closest('.el-radio-button')
        if (!b) return
        $$('#appearance .el-radio-button').forEach(x => x.classList.remove('is-active'))
        b.classList.add('is-active')
        const m = b.dataset.mode
        setMode(m === 'dark' || (m === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches))
    })

    $('#accent').addEventListener('input', e => {
        document.documentElement.style.setProperty('--el-color-primary', e.target.value)
        const applied = getComputedStyle(document.documentElement).getPropertyValue('--el-color-primary').trim()
        $('#accentNote').textContent =
            applied.toLowerCase() === e.target.value.toLowerCase() ? '' : '当前主题固定了主题色，此处不生效'
    })

    let width = 1600
    const setWidth = v => {
        width = Math.max(1200, Math.min(2400, v))
        $('#widthVal').value = width
        $('#app').style.maxWidth = width + 'px'
        autoColumns()
    }
    $('#widthDec').addEventListener('click', () => setWidth(width - 100))
    $('#widthInc').addEventListener('click', () => setWidth(width + 100))

    $('#toggles').addEventListener('click', e => {
        const label = e.target.closest('.el-checkbox')
        if (!label) return
        e.preventDefault()
        const on = !label.classList.contains('is-checked')
        label.classList.toggle('is-checked', on)
        label.querySelector('.el-checkbox__input').classList.toggle('is-checked', on)
        document.body.classList.toggle(label.dataset.toggle, !on)
    })

    /* 其余开关/复选框做成可点，纯视觉 */
    document.addEventListener('click', e => {
        const sw = e.target.closest('.el-switch')
        if (sw) sw.classList.toggle('is-checked')
        const cb = e.target.closest('.el-checkbox')
        if (cb && !cb.closest('#toggles')) {
            e.preventDefault()
            const on = !cb.classList.contains('is-checked')
            cb.classList.toggle('is-checked', on)
            cb.querySelector('.el-checkbox__input').classList.toggle('is-checked', on)
            updateManageCount()
        }
        const rb = e.target.closest('.el-radio-button')
        if (rb && !rb.closest('#appearance')) {
            const g = rb.closest('.el-radio-group')
            g.querySelectorAll('.el-radio-button').forEach(x => x.classList.remove('is-active'))
            rb.classList.add('is-active')
        }
    })

    /* ==================== 下载弹窗 ==================== */
    const DOWNLOADS = DATA.slice(0, 6).map((a, i) => ({
        n: '[' + a.sub + '] ' + a.t.replace(/\s*\(\d{4}\)/, '') + ' S0' + a.s + 'E' + String((i + 3) * 2).padStart(2, '0') + ' [1080p]',
        p: [100, 64, 100, 12, 88, 100][i],
        tags: ['ani-rss', 'MOVIEPILOT', 'RENAME', i % 2 ? '下载中' : '下载完成', a.sub].concat(i % 2 ? [] : ['已整理']),
        size: [512.4, 318.77, 462.74, 186.02, 733.51, 288.9][i].toFixed(2) + ' MiB',
        st: [100, 64, 100, 12, 88, 100][i] === 100 ? 'uploading' : 'downloading',
    }))

    $('#downloads').innerHTML = DOWNLOADS.map(d =>
        '<div class="el-card is-never-shadow pv-dl-item"><div class="el-card__body">' +
        '<div class="el-text" style="display:block">' + esc(d.n) + '</div>' +
        '<div class="el-progress el-progress--line" style="margin:8px 0">' +
        '<div class="el-progress-bar"><div class="el-progress-bar__outer" style="height:6px">' +
        '<div class="el-progress-bar__inner" style="width:' + d.p + '%"></div></div></div>' +
        '<div class="el-progress__text" style="min-width:46px">' + d.p + '%</div></div>' +
        '<div class="flex" style="flex-wrap:wrap;gap:10px;align-items:center">' +
        d.tags.map(t => '<span class="el-text el-text--info el-text--small">' + esc(t) + '</span>').join('') +
        '<span style="flex:1"></span>' +
        '<span class="el-text el-text--success el-text--small">' + esc(d.size) + '</span>' +
        '<span class="el-text el-text--primary el-text--small">' + esc(d.st) + '</span>' +
        '</div></div></div>'
    ).join('')

    /* ==================== 管理弹窗 ==================== */
    $('#manageList').innerHTML = DATA.slice(0, 10).map(a =>
        '<div class="el-card is-never-shadow" style="margin-bottom:6px"><div class="el-card__body" style="padding:10px 14px">' +
        '<div class="flex" style="align-items:center;gap:12px">' +
        '<label class="el-checkbox"><span class="el-checkbox__input"><span class="el-checkbox__inner"></span></span></label>' +
        '<span class="el-text" style="flex:1;min-width:0">' + esc(a.t) + '</span>' +
        '<span class="el-tag el-tag--info el-tag--light"><span class="el-tag__content">' + esc(a.sub) + '</span></span>' +
        '<span class="el-text el-text--info el-text--small">' + esc(a.ep) + '</span>' +
        '</div></div></div>'
    ).join('')

    function updateManageCount() {
        const n = $$('#manageList .el-checkbox.is-checked').length
        const el = $('#manageCount')
        if (el) el.textContent = '已选择 ' + n + ' 项'
    }

    /* ==================== 日志弹窗 ==================== */
    $('#logs').textContent = [
        '2026-08-02 21:04:11  INFO   开始刷新全部订阅 (共 ' + DATA.length + ' 项)',
        '2026-08-02 21:04:13  INFO   ' + (DATA[0] ? DATA[0].t : '') + ' 发现新集数',
        '2026-08-02 21:04:13  INFO   已推送到下载器: qBittorrent',
        '2026-08-02 21:04:15  WARN   ' + (DATA[1] ? DATA[1].t : '') + ' RSS 超时，切换到备用 RSS',
        '2026-08-02 21:04:16  INFO   刮削完成，已写入 nfo',
        '2026-08-02 21:04:17  INFO   重命名: S02E07.mkv',
        '2026-08-02 21:04:18  INFO   刷新结束，新增 1 项，耗时 7.2s',
    ].join('\n')

    /* ==================== 轻量提示（模拟 ElMessage） ==================== */
    function toast(text) {
        const el = document.createElement('div')
        el.className = 'el-message el-message--success'
        el.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);z-index:6000'
        el.innerHTML = '<i class="el-icon el-message__icon">' + ICON.check + '</i><p class="el-message__content">' + esc(text) + '</p>'
        document.body.appendChild(el)
        setTimeout(() => {
            el.style.transition = 'opacity .3s, transform .3s'
            el.style.opacity = '0'
            el.style.transform = 'translateX(-50%) translateY(-14px)'
            setTimeout(() => el.remove(), 320)
        }, 2200)
    }

    /* ==================== 主题切换栏 ==================== */
    const THEMES = [
        ['paper.css', '纸感极简 · Paper', 'auto'],
        ['neon.css', '午夜霓虹 · Neon', 'dark'],
        ['sakura.css', '樱花物语 · Sakura', 'auto'],
        ['glass.css', '云海玻璃 · Glass', 'auto'],
        ['terminal.css', '绿光终端 · Terminal', 'dark'],
        ['acg-wallpaper.css', '二次元 · 随机壁纸', 'auto'],
        ['acg-starry.css', '二次元 · 星空夜', 'dark'],
        ['acg-peach.css', '二次元 · 蜜桃樱', 'light'],
        ['acg-cyber.css', '二次元 · 电子霓虹', 'dark'],
        ['acg-glass.css', '二次元 · 玻璃', 'auto'],
        ['bing-mist.css', '必应4K · 晨雾', 'light'],
        ['bing-night.css', '必应4K · 夜航', 'dark'],
    ]

    const pick = $('#pick')
    const modeBtn = $('#mode')
    const modeNote = $('#modeNote')

    THEMES.forEach(([file, name]) => {
        const o = document.createElement('option')
        o.value = file
        o.textContent = name
        pick.appendChild(o)
    })

    const current = THEMES.some(t => t[0] === window.__theme) ? window.__theme : 'paper.css'
    const meta = THEMES.find(t => t[0] === current)
    const base = location.href.replace(/index\.html.*$/, '').replace(/[?#].*$/, '')

    pick.value = current
    $('#snippet').textContent = '@import url("' + base + 'themes/' + current + '");'
    localStorage.setItem('ani-preview-theme', current)

    function setMode(dark) {
        document.documentElement.classList.toggle('dark', dark)
        modeBtn.textContent = dark ? '切换浅色' : '切换深色'
        localStorage.setItem('ani-preview-dark', dark ? '1' : '0')
    }

    const fixed = meta[2] !== 'auto'
    modeBtn.disabled = fixed
    modeBtn.style.opacity = fixed ? '.4' : '1'
    modeNote.textContent = fixed ? (meta[2] === 'dark' ? '该主题强制深色' : '该主题强制浅色') : ''
    setMode(fixed ? meta[2] === 'dark' : localStorage.getItem('ani-preview-dark') === '1')

    pick.addEventListener('change', () => {
        localStorage.setItem('ani-preview-theme', pick.value)
        location.search = '?t=' + pick.value
    })
    modeBtn.addEventListener('click', () => setMode(!document.documentElement.classList.contains('dark')))

    fillIcons()
    // 首开的折叠项给个足够的高度，避免动画从 0 开始
    const openWrap = document.querySelector('.el-collapse-item.is-active .el-collapse-item__wrap')
    if (openWrap) openWrap.style.maxHeight = '1200px'
})()
