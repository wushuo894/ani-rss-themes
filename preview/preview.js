/**
 * 预览页交互层
 *
 * 把 ani-rss 的界面 1:1 静态复刻出来：登录页、首页、以及添加订阅 / 修改订阅 /
 * 管理 / 日志 / 下载 / 设置六个弹窗。结构、类名、图标照上游组件写，弹窗、下拉、
 * 标签页、折叠面板走 Element Plus 真实的过渡动画，设置里的开关真的作用于界面，
 * 这样每个主题在各种状态下的样子都能直接看到。
 *
 * 表单字段对照 ani-rss 上游各 .vue 组件（GPL-2.0，https://github.com/wushuo894/ani-rss）。
 * 番剧数据见 preview/data.js（Bangumi 每日放送快照 + 演示用虚构字段）。
 */
(function () {
    'use strict'

    /* ==================== 图标（@element-plus/icons-vue，MIT） ==================== */
    const P = d => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">' + d + '</svg>'
    const ICON = {
        search: P('<path fill="currentColor" d="m795.904 750.72 124.992 124.928a32 32 0 0 1-45.248 45.248L750.656 795.904a416 416 0 1 1 45.248-45.248zM480 832a352 352 0 1 0 0-704 352 352 0 0 0 0 704"/>'),
        caret2: P('<path fill="currentColor" d="M831.872 340.864 512 652.672 192.128 340.864a30.59 30.59 0 0 0-42.752 0 29.12 29.12 0 0 0 0 41.6L489.664 714.24a32 32 0 0 0 44.672 0l340.288-331.712a29.12 29.12 0 0 0 0-41.728 30.59 30.59 0 0 0-42.752 0z"/>'),
        caret: P('<path fill="currentColor" d="m192 384 320 384 320-384z"/>'),
        plus: P('<path fill="currentColor" d="M480 480V128a32 32 0 0 1 64 0v352h352a32 32 0 1 1 0 64H544v352a32 32 0 1 1-64 0V544H128a32 32 0 0 1 0-64z"/>'),
        minus: P('<path fill="currentColor" d="M128 544h768a32 32 0 1 0 0-64H128a32 32 0 0 0 0 64"/>'),
        download: P('<path fill="currentColor" d="M160 832h704a32 32 0 1 1 0 64H160a32 32 0 1 1 0-64m384-253.696 236.288-236.352 45.248 45.248L508.8 704 192 387.2l45.248-45.248L480 584.704V128h64z"/>'),
        upload: P('<path fill="currentColor" d="M160 832h704a32 32 0 1 1 0 64H160a32 32 0 1 1 0-64m384-253.696V928h-64V578.304L243.712 814.656l-45.248-45.248L512 455.872l313.536 313.536-45.248 45.248z"/>'),
        refresh: P('<path fill="currentColor" d="M771.776 794.88A384 384 0 0 1 128 512h64a320 320 0 0 0 555.712 216.448H654.72a32 32 0 1 1 0-64h149.056a32 32 0 0 1 32 32v148.928a32 32 0 1 1-64 0v-50.56zM276.288 295.616h92.992a32 32 0 0 1 0 64H220.16a32 32 0 0 1-32-32V178.56a32 32 0 0 1 64 0v50.56A384 384 0 0 1 896.128 512h-64a320 320 0 0 0-555.776-216.384z"/>'),
        refreshRight: P('<path fill="currentColor" d="M784.512 230.272v-50.56a32 32 0 1 1 64 0v149.056a32 32 0 0 1-32 32H667.52a32 32 0 1 1 0-64h92.992A320 320 0 1 0 524.8 833.152a320 320 0 0 0 320-320h64a384 384 0 0 1-384 384 384 384 0 0 1-384-384 384 384 0 0 1 643.712-282.88"/>'),
        fold: P('<path fill="currentColor" d="M896 192H128v128h768zm0 256H384v128h512zm0 256H128v128h768zM320 384 128 512l192 128z"/>'),
        setting: P('<path fill="currentColor" d="M600.704 64a32 32 0 0 1 30.464 22.208l35.2 109.376c14.784 7.232 28.928 15.36 42.432 24.512l112.384-24.192a32 32 0 0 1 34.432 15.36L944.32 364.8a32 32 0 0 1-4.032 37.504l-77.12 85.12a357 357 0 0 1 0 49.024l77.12 85.248a32 32 0 0 1 4.032 37.504l-88.704 153.6a32 32 0 0 1-34.432 15.296L708.8 803.904c-13.44 9.088-27.648 17.28-42.368 24.512l-35.264 109.376A32 32 0 0 1 600.704 960H423.296a32 32 0 0 1-30.464-22.208L357.696 828.48a352 352 0 0 1-42.56-24.64l-112.32 24.256a32 32 0 0 1-34.432-15.36L79.68 659.2a32 32 0 0 1 4.032-37.504l77.12-85.248a357 357 0 0 1 0-48.896l-77.12-85.248A32 32 0 0 1 79.68 364.8l88.704-153.6a32 32 0 0 1 34.432-15.296l112.32 24.256c13.568-9.152 27.776-17.408 42.56-24.64l35.2-109.312A32 32 0 0 1 423.232 64H600.64zM512 320a192 192 0 1 1 0 384 192 192 0 0 1 0-384m0 64a128 128 0 1 0 0 256 128 128 0 0 0 0-256"/>'),
        tickets: P('<path fill="currentColor" d="M192 128v768h640V128zm-32-64h704a32 32 0 0 1 32 32v832a32 32 0 0 1-32 32H160a32 32 0 0 1-32-32V96a32 32 0 0 1 32-32m160 448h384v64H320zm0-192h192v64H320zm0 384h384v64H320z"/>'),
        files: P('<path fill="currentColor" d="M128 384v448h768V384zm-32-64h832a32 32 0 0 1 32 32v512a32 32 0 0 1-32 32H96a32 32 0 0 1-32-32V352a32 32 0 0 1 32-32m64-128h704v64H160zm96-128h512v64H256z"/>'),
        edit: P('<path fill="currentColor" d="M832 512a32 32 0 1 1 64 0v352a32 32 0 0 1-32 32H160a32 32 0 0 1-32-32V160a32 32 0 0 1 32-32h352a32 32 0 0 1 0 64H192v640h640z"/><path fill="currentColor" d="m469.952 554.24 52.8-7.552L847.104 222.4a32 32 0 1 0-45.248-45.248L477.44 501.44l-7.552 52.8zm422.4-422.4a96 96 0 0 1 0 135.808l-331.84 331.84a32 32 0 0 1-18.112 9.088L436.8 623.68a32 32 0 0 1-36.224-36.224l15.104-105.6a32 32 0 0 1 9.024-18.112l331.904-331.84a96 96 0 0 1 135.744 0z"/>'),
        del: P('<path fill="currentColor" d="M160 256H96a32 32 0 0 1 0-64h256V95.936a32 32 0 0 1 32-32h256a32 32 0 0 1 32 32V192h256a32 32 0 1 1 0 64h-64v672a32 32 0 0 1-32 32H192a32 32 0 0 1-32-32zm448-64v-64H416v64zM224 896h576V256H224zm192-128a32 32 0 0 1-32-32V416a32 32 0 0 1 64 0v320a32 32 0 0 1-32 32m192 0a32 32 0 0 1-32-32V416a32 32 0 0 1 64 0v320a32 32 0 0 1-32 32"/>'),
        close: P('<path fill="currentColor" d="M764.288 214.592 512 466.88 259.712 214.592a31.936 31.936 0 0 0-45.12 45.12L466.752 512 214.592 764.288a31.936 31.936 0 1 0 45.12 45.12L512 557.248l252.288 252.16a31.936 31.936 0 0 0 45.12-45.12L557.248 512l252.16-252.288a31.936 31.936 0 1 0-45.12-45.12z"/>'),
        arrow: P('<path fill="currentColor" d="M340.864 149.312a30.59 30.59 0 0 0 0 42.752L652.736 512 340.864 831.872a30.59 30.59 0 0 0 0 42.752 29.12 29.12 0 0 0 41.6 0L714.24 534.336a32 32 0 0 0 0-44.672L382.464 149.312a29.12 29.12 0 0 0-41.6 0z"/>'),
        right: P('<path fill="currentColor" d="M754.752 480H160a32 32 0 1 0 0 64h594.752L521.344 777.344a32 32 0 0 0 45.312 45.312l288-288a32 32 0 0 0 0-45.312l-288-288a32 32 0 1 0-45.312 45.312z"/>'),
        check: P('<path fill="currentColor" d="M406.656 706.944 195.84 496.256a32 32 0 1 0-45.248 45.248l256 256 512-512a32 32 0 0 0-45.248-45.248z"/>'),
        circleCheck: P('<path fill="currentColor" d="M512 64a448 448 0 1 1 0 896 448 448 0 0 1 0-896m0 64a384 384 0 1 0 0 768 384 384 0 0 0 0-768"/><path fill="currentColor" d="M745.344 361.344a32 32 0 0 1 45.312 45.312l-288 288a32 32 0 0 1-45.312 0l-160-160a32 32 0 1 1 45.312-45.312L480 626.752z"/>'),
        circleClose: P('<path fill="currentColor" d="M512 64a448 448 0 1 1 0 896 448 448 0 0 1 0-896m0 64a384 384 0 1 0 0 768 384 384 0 0 0 0-768"/><path fill="currentColor" d="m512 466.944 144.32-144.32a32 32 0 0 1 45.312 45.312L557.248 512l144.32 144.32a32 32 0 1 1-45.312 45.312L512 557.248l-144.32 144.32a32 32 0 1 1-45.312-45.312L466.752 512l-144.32-144.32a32 32 0 0 1 45.312-45.312z"/>'),
        auto: P('<path fill="currentColor" d="M512 64a448 448 0 1 1 0 896 448 448 0 0 1 0-896m0 64v768a384 384 0 0 0 0-768"/>'),
        gear: P('<path fill="currentColor" d="M512 288a224 224 0 1 0 0 448 224 224 0 0 0 0-448m0 64a160 160 0 1 1 0 320 160 160 0 0 1 0-320M480 96h64v96h-64zm0 736h64v96h-64zM96 480h96v64H96zm736 0h96v64h-96zM196.9 241.5l45.3-45.3 67.9 67.9-45.3 45.3zm516.9 516.9 45.3-45.3 67.9 67.9-45.3 45.3zM264.1 713.1l45.3 45.3-67.9 67.9-45.3-45.3zm516.9-516.9 45.3 45.3-67.9 67.9-45.3-45.3z"/>'),
        moon: P('<path fill="currentColor" d="M240.448 240.448a384 384 0 1 0 559.424 525.696 448 448 0 0 1-542.016-542.08 390 390 0 0 0-17.408 16.384m181.056 362.048a384 384 0 0 0 525.632 16.384A448 448 0 1 1 405.056 76.8a384 384 0 0 0 16.448 525.696"/>'),
        user: P('<path fill="currentColor" d="M512 512a192 192 0 1 0 0-384 192 192 0 0 0 0 384m0 64a256 256 0 1 1 0-512 256 256 0 0 1 0 512m320 320v-96a96 96 0 0 0-96-96H288a96 96 0 0 0-96 96v96a32 32 0 1 1-64 0v-96a160 160 0 0 1 160-160h448a160 160 0 0 1 160 160v96a32 32 0 1 1-64 0"/>'),
        key: P('<path fill="currentColor" d="M448 456.064V96a32 32 0 0 1 32-32h192a32 32 0 0 1 0 64H512v128h128a32 32 0 1 1 0 64H512v135.744a239.6 239.6 0 0 1 64-8.64c132.288 0 240 108.16 240 241.92S708.288 928 576 928a239.7 239.7 0 0 1-64-8.64A239.7 239.7 0 0 1 448 928c-132.288 0-240-108.16-240-241.92 0-104.32 65.472-193.28 157.44-227.2zM576 864a176 176 0 1 0 0-352 176 176 0 0 0 0 352"/>'),
        view: P('<path fill="currentColor" d="M512 160c320 0 512 352 512 352S832 864 512 864 0 512 0 512s192-352 512-352m0 64c-225.28 0-384.128 208.064-436.8 288 52.608 79.872 211.456 288 436.8 288 225.28 0 384.128-208.064 436.8-288-52.608-79.872-211.456-288-436.8-288m0 64a224 224 0 1 1 0 448 224 224 0 0 1 0-448m0 64a160.192 160.192 0 0 0-160 160c0 88.192 71.744 160 160 160s160-71.808 160-160-71.744-160-160-160"/>'),
    }

    const $ = s => document.querySelector(s)
    const $$ = s => [].slice.call(document.querySelectorAll(s))
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]))
    const icon = n => '<i class="el-icon" data-icon="' + n + '"></i>'
    const fillIcons = root => (root || document).querySelectorAll('[data-icon]').forEach(el => {
        if (!el.firstChild) el.innerHTML = ICON[el.dataset.icon] || ''
    })

    /* ==================== 组件工厂：照 Element Plus 的真实 DOM 拼 ==================== */
    const SELECTS = {}
    let selId = 0

    const inp = (v, ph, o) => {
        o = o || {}
        return '<div class="el-input' + (o.prefix ? ' el-input--prefix' : '') + (o.suffix ? ' el-input--suffix' : '') +
            (o.full ? ' full-width' : '') + '" style="' + (o.style || '') + '"><div class="el-input__wrapper">' +
            (o.prefix ? '<span class="el-input__prefix"><span class="el-input__prefix-inner">' + icon(o.prefix) + '</span></span>' : '') +
            '<input class="el-input__inner" type="' + (o.type || 'text') + '" value="' + esc(v) + '" placeholder="' + esc(ph) + '"/>' +
            (o.suffix ? '<span class="el-input__suffix"><span class="el-input__suffix-inner">' + icon(o.suffix) + '</span></span>' : '') +
            '</div></div>'
    }

    const area = (v, ph, rows) =>
        '<div class="el-textarea"><textarea class="el-textarea__inner" rows="' + (rows || 3) + '" placeholder="' + esc(ph) + '">' + esc(v) + '</textarea></div>'

    const num = (v, w) =>
        '<div class="el-input-number" style="width:' + (w || 140) + 'px">' +
        '<span role="button" class="el-input-number__decrease" data-step="-1">' + icon('minus') + '</span>' +
        '<span role="button" class="el-input-number__increase" data-step="1">' + icon('plus') + '</span>' +
        '<div class="el-input"><div class="el-input__wrapper"><input class="el-input__inner" value="' + esc(v) + '"/></div></div></div>'

    const sw = on => '<div class="el-switch' + (on ? ' is-checked' : '') + '"><span class="el-switch__core"><div class="el-switch__action"></div></span></div>'

    const sel = (value, options, w) => {
        const k = 's' + (++selId)
        SELECTS[k] = options
        return '<div class="el-select" data-select="' + k + '" style="width:' + (w || 160) + 'px">' +
            '<div class="el-select__wrapper"><div class="el-select__selection">' +
            '<div class="el-select__selected-item el-select__placeholder' + (value ? '' : ' is-transparent') + '"><span data-value>' + esc(value || '请选择') + '</span></div>' +
            '</div><div class="el-select__suffix">' + '<i class="el-icon el-select__caret el-select__icon" data-icon="caret2"></i>' + '</div></div></div>'
    }

    const radios = (items, active) =>
        '<div class="el-radio-group">' + items.map((t, i) =>
            '<label class="el-radio-button' + (i === active ? ' is-active' : '') + '"><span class="el-radio-button__inner">' + t + '</span></label>'
        ).join('') + '</div>'

    const checks = items =>
        items.map(it => {
            const on = Array.isArray(it) ? it[1] : false
            const t = Array.isArray(it) ? it[0] : it
            return '<label class="el-checkbox' + (on ? ' is-checked' : '') + '"><span class="el-checkbox__input' + (on ? ' is-checked' : '') +
                '"><span class="el-checkbox__inner"></span></span><span class="el-checkbox__label">' + esc(t) + '</span></label>'
        }).join('')

    const tagList = (tags, type) =>
        tags.map(t => '<span class="el-tag el-tag--' + (type || 'primary') + ' el-tag--light"><span class="el-tag__content">' + esc(t) + '</span></span>').join('')

    const tagInput = tags =>
        '<div class="el-input-tag" style="max-width:420px;display:flex;flex-wrap:wrap;gap:4px;padding:4px 8px">' + tagList(tags, 'info') + '</div>'

    const alertBox = (text, type) =>
        '<div class="el-alert el-alert--' + (type || 'warning') + ' is-light"><div class="el-alert__content"><span class="el-alert__title">' + esc(text) + '</span></div></div>'

    const btn = (text, o) => {
        o = o || {}
        return '<button type="button" class="el-button' + (o.type ? ' el-button--' + o.type : '') +
            (o.text ? ' is-text' : '') + (o.bg ? ' is-has-bg' : '') + '"' + (o.act ? ' data-act="' + o.act + '"' : '') + '>' +
            '<span>' + (o.icon ? '<i class="el-icon el-icon--left" data-icon="' + o.icon + '"></i> ' : '') + esc(text) + '</span></button>'
    }

    const item = (label, content, lw) =>
        '<div class="el-form-item el-form-item--label-right">' +
        '<label class="el-form-item__label" style="width:' + (lw || 110) + 'px">' + esc(label) + '</label>' +
        '<div class="el-form-item__content">' + content + '</div></div>'

    const form = (rows, lw) =>
        '<form class="el-form el-form--default el-form--label-right full-width" onsubmit="return false">' +
        rows.map(r => Array.isArray(r) ? item(r[0], r[1], lw) : r).join('') + '</form>'

    const collapse = items =>
        '<div class="el-collapse el-collapse-icon-position-right">' + items.map((it, i) =>
            '<div class="el-collapse-item' + (it.open ? ' is-active' : '') + '">' +
            '<div class="el-collapse-item__header' + (it.open ? ' is-active' : '') + '" role="button">' +
            '<span class="el-collapse-item__title">' + esc(it.title) + '</span>' +
            '<i class="el-icon el-collapse-item__arrow' + (it.open ? ' is-active' : '') + '" data-icon="arrow"></i></div>' +
            '<div class="el-collapse-item__wrap"' + (it.open ? '' : ' style="max-height:0"') + '>' +
            '<div class="el-collapse-item__content">' + it.content + '</div></div></div>'
        ).join('') + '</div>'

    let tabsId = 0
    const tabs = (items, o) => {
        o = o || {}
        const id = 'tabs' + (++tabsId)
        const dir = o.vertical ? 'left' : 'top'
        return '<div class="el-tabs el-tabs--' + dir + '" data-tabs="' + id + '">' +
            '<div class="el-tabs__header' + (o.vertical ? ' el-tabs__header-vertical' : '') + ' is-' + dir + '">' +
            '<div class="el-tabs__nav-wrap is-' + dir + '"><div class="el-tabs__nav-scroll"><div class="el-tabs__nav is-' + dir + '">' +
            '<div class="el-tabs__active-bar is-' + dir + '"></div>' +
            items.map((t, i) => '<div class="el-tabs__item is-' + dir + (i === 0 ? ' is-active' : '') + '" data-tab="' + i + '">' + esc(t.title) + '</div>').join('') +
            '</div></div></div></div>' +
            '<div class="el-tabs__content">' +
            items.map((t, i) => '<div class="el-tab-pane" data-pane="' + i + '"' + (i === 0 ? '' : ' style="display:none"') + '>' + t.pane + '</div>').join('') +
            '</div></div>'
    }

    const dialog = (id, title, body, footer, width) =>
        '<div class="el-overlay" id="' + id + '" style="display:none"><div class="el-overlay-dialog">' +
        '<div class="el-dialog is-align-center el-dialog--center" style="width:' + width + ';max-width:calc(100vw - 24px)">' +
        '<header class="el-dialog__header show-close"><span role="heading" class="el-dialog__title">' + esc(title) + '</span>' +
        '<button type="button" class="el-dialog__headerbtn" data-close><i class="el-icon el-dialog__close" data-icon="close"></i></button></header>' +
        '<div class="el-dialog__body">' + body + '</div>' +
        (footer ? '<footer class="el-dialog__footer">' + footer + '</footer>' : '') +
        '</div></div></div>'

    const okCancel = btn('确定', {type: 'success', text: true, icon: 'check', act: null}).replace('<button', '<button data-close') +
        btn('取消', {text: true, icon: 'close'}).replace('<button', '<button data-close')

    /* ==================== 首页：工具栏与列表 ==================== */
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

    const DATA = window.ANI_DATA || []
    const tag = (type, inner) => '<span class="el-tag el-tag--' + type + ' el-tag--light"><span class="el-tag__content">' + inner + '</span></span>'

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
        '<button type="button" class="el-button is-text is-has-bg" data-act="dlg-edit"><span class=""><i class="el-icon" data-icon="edit"></i></span></button>' +
        '<div class="list-card-spacer"></div>' +
        '<button type="button" class="el-button el-button--danger is-text is-has-bg"><span class=""><i class="el-icon" data-icon="del"></i></span></button>' +
        '</div></div></div></div></div></div>'

    let filterText = '', filterEnable = '已启用'

    function renderList() {
        const items = DATA.filter(a =>
            (!filterText || a.t.toLowerCase().indexOf(filterText.toLowerCase()) >= 0) &&
            (filterEnable === '全部' || (filterEnable === '已启用') === !!a.on))
        const weeks = []
        items.forEach(a => { if (weeks.indexOf(a.w) < 0) weeks.push(a.w) })
        $('#list').innerHTML = weeks.length
            ? weeks.map(w => '<div><h2 class="list-week-title">' + esc(w) + '</h2>' +
                '<div class="grid-container">' + items.filter(a => a.w === w).map(card).join('') + '</div></div>').join('')
            : '<div class="el-empty" style="padding:60px 0"><div class="el-empty__description"><p>暂无数据</p></div></div>'
        fillIcons($('#list'))
    }

    renderList()
    $('#search').addEventListener('input', e => { filterText = e.target.value.trim(); renderList() })

    function autoColumns() {
        const w = $('#app').offsetWidth
        document.documentElement.style.setProperty('--ani-grid-columns', Math.max(1, Math.min(4, Math.floor(w / 400))))
    }

    autoColumns()
    window.addEventListener('resize', autoColumns)

    /* ==================== 弹窗内容 ==================== */
    const DL = DATA.slice(0, 6).map((a, i) => ({
        n: '[' + a.sub + '] ' + a.t.replace(/\s*\(\d{4}\)/, '') + ' S0' + a.s + 'E' + String((i + 3) * 2).padStart(2, '0') + ' [1080p]',
        p: [100, 64, 100, 12, 88, 100][i],
        tags: ['ani-rss', 'MOVIEPILOT', 'RENAME', i % 2 ? '下载中' : '下载完成', a.sub].concat(i % 2 ? [] : ['已整理']),
        size: [512.40, 318.77, 462.74, 186.02, 733.51, 288.90][i].toFixed(2) + ' MiB',
    }))

    const downloadBody =
        '<div class="flex-center" style="margin-bottom:12px">' + radios(['按名称排序 ↑', '按进度排序'], 0) + '</div>' +
        DL.map(d =>
            '<div class="el-card is-never-shadow" style="margin-bottom:8px"><div class="el-card__body">' +
            '<div class="el-text" style="display:block">' + esc(d.n) + '</div>' +
            '<div class="el-progress el-progress--line" style="margin:8px 0"><div class="el-progress-bar">' +
            '<div class="el-progress-bar__outer" style="height:6px"><div class="el-progress-bar__inner" style="width:' + d.p + '%"></div></div></div>' +
            '<div class="el-progress__text" style="min-width:46px">' + d.p + '%</div></div>' +
            '<div class="flex" style="flex-wrap:wrap;gap:10px;align-items:center">' +
            d.tags.map(t => '<span class="el-text el-text--info el-text--small">' + esc(t) + '</span>').join('') +
            '<span style="flex:1"></span>' +
            '<span class="el-text el-text--success el-text--small">' + esc(d.size) + '</span>' +
            '<span class="el-text el-text--primary el-text--small">' + (d.p === 100 ? 'uploading' : 'downloading') + '</span>' +
            '</div></div></div>').join('')

    const manageBody =
        '<div class="flex" style="gap:8px;align-items:center;margin-bottom:12px;flex-wrap:wrap">' +
        inp('', '搜索', {prefix: 'search', style: 'width:210px'}) +
        sel('全部', ['全部', '已启用', '未启用'], 130) +
        sel('全部季度', ['全部季度', '第 1 季', '第 2 季', '第 3 季'], 130) +
        '<span style="flex:1"></span>' +
        btn('批量操作', {type: 'primary', text: true, bg: true, icon: 'fold', act: 'batch'}) +
        '</div>' +
        '<div id="manageList"></div>'

    const LOGS = [
        ['INFO', '开始刷新全部订阅 (共 ' + DATA.length + ' 项)'],
        ['INFO', (DATA[0] || {}).t + ' 发现新集数 E07'],
        ['INFO', '已推送到下载器: qBittorrent'],
        ['DEBUG', 'torrent hash = 8f2a1c9e04b7… size = 512.40 MiB'],
        ['WARN', (DATA[1] || {}).t + ' RSS 超时，切换到备用 RSS'],
        ['INFO', '刮削完成，已写入 tvshow.nfo / episode.nfo'],
        ['INFO', '重命名: [桜都字幕组] S02E07.mkv -> S02E07.mkv'],
        ['ERROR', 'TMDB 请求失败: 429 Too Many Requests，30s 后重试'],
        ['INFO', '刷新结束，新增 1 项，耗时 7.2s'],
    ]

    const logsBody =
        '<div class="header flex" style="align-items:center;gap:12px;flex-wrap:wrap">' +
        '<div class="el-checkbox-group">' + checks([['INFO', true], ['WARN', true], ['ERROR', true], ['DEBUG', true]]) + '</div>' +
        '<span style="flex:1"></span>' +
        sel('全部类名', ['全部类名', 'RssUtil', 'TorrentUtil', 'RenameUtil', 'ScrapeUtil'], 150) +
        btn('自动滚动', {text: true, bg: true}) + btn('复制', {text: true, bg: true}) + btn('清空', {type: 'danger', text: true, bg: true}) +
        '</div>' +
        '<div class="content" style="margin-top:8px;max-height:52vh;overflow:auto">' +
        LOGS.map((l, i) => '<span class="pv-logline pv-log-' + l[0] + '"><i>2026-08-02 21:04:' + String(11 + i).padStart(2, '0') + '</i>  ' +
            l[0].padEnd(5) + '  ' + esc(l[1]) + '</span>').join('') +
        '</div>'

    const addBody = tabs([
        {
            title: 'Mikan', pane: form([
                ['RSS 地址', area('', 'https://mikanani.me/RSS/Bangumi?bangumiId=xxx&subgroupid=xxx', 3)],
                ['', '<a class="el-link el-link--warning" href="https://mikanani.me" target="_blank"><span class="el-link__inner">🍊 Mikan</span></a>'],
                ['', '<span class="el-text el-text--info el-text--small">不支持聚合订阅，原因是如果一次过更新会出现遗漏</span>'],
                ['', '<span class="el-text el-text--info el-text--small">不必在 mikan 网站添加订阅，可以通过上方 [Mikan] 按钮浏览字幕组订阅</span>'],
            ], 80)
        },
        {title: 'AniBT', pane: form([['RSS 地址', area('', 'https://anibt.example/rss', 3)]], 80)},
        {title: 'AG', pane: form([['RSS 地址', area('', 'https://animes.garden/feed.xml', 3)]], 80)},
        {title: 'Other', pane: form([['RSS 地址', area('', 'https://xxx.xxx/rss', 3)], ['字幕组', inp('', '可留空', {style: 'max-width:300px'})]], 80)},
    ], {vertical: true})

    const editBody = tabs([
        {
            title: '基本', pane: '<div class="pv-pane-scroll">' + form([
                ['标题', '<div class="flex" style="gap:6px">' + inp(DATA[0] ? DATA[0].t : '', '', {style: 'flex:1;max-width:420px'}) +
                btn('搜索', {text: true, bg: true}) + btn('BGM', {text: true, bg: true}) + '</div>'],
                ['TMDB', '<div class="flex" style="gap:8px;align-items:center"><a class="el-link el-link--primary" href="#"><span class="el-link__inner">themoviedb.org/tv/209867</span></a>' +
                btn('搜索', {text: true, bg: true}) + btn('清除', {text: true, bg: true}) + '</div>'],
                ['剧集组', '<div class="flex" style="gap:6px">' + inp('', '留空不使用剧集组', {style: 'max-width:320px'}) + btn('选择', {text: true, bg: true}) + '</div>'],
                ['BgmUrl', inp('https://bgm.tv/subject/425998', 'https://xxx.xxx', {style: 'max-width:420px'})],
                ['主 RSS', '<div class="flex" style="gap:6px;flex-wrap:wrap">' + inp('桜都字幕组', '字幕组', {style: 'width:150px'}) +
                inp('https://mikanani.me/RSS/Bangumi?bangumiId=3141', 'https://xxx.xxx', {style: 'flex:1;min-width:260px'}) + '</div>'],
                ['备用 RSS', btn('添加备用 RSS', {text: true, bg: true, icon: 'plus'})],
                ['日期', inp('2026-07-04', '', {style: 'width:170px'})],
                ['季', num(2, 130)],
                ['集数偏移', num(0, 130)],
                ['总集数', num(24, 130)],
                ['匹配', tagInput(['1080p', '简体'])],
                ['排除', tagInput(['720p', '繁体', 'CHT'])],
                ['全局排除', sw(true)],
                ['剧场版', sw(false)],
                ['启用', sw(true)],
            ], 100) + '</div>'
        },
        {
            title: '自定义', pane: '<div class="pv-pane-scroll">' + form([
                ['自定义集数规则', '<div class="flex" style="gap:8px;align-items:center;flex-wrap:wrap">' + sw(false) + inp('', '正则表达式', {style: 'flex:1;min-width:220px'}) + num(1, 110) + '</div>'],
                ['自定义路径', '<div class="flex" style="gap:8px;align-items:center;flex-wrap:wrap">' + sw(true) + inp('/downloads/anime/${title}', '', {style: 'flex:1;min-width:260px'}) + btn('预览', {text: true, bg: true}) + '</div>'],
                ['自定义上传', '<div class="flex" style="gap:8px;align-items:center">' + sw(false) + inp('', '上传路径', {style: 'flex:1;max-width:320px'}) + '</div>'],
                ['自定义完结迁移', '<div class="flex" style="gap:8px;align-items:center">' + sw(false) + inp('', '迁移路径', {style: 'flex:1;max-width:320px'}) + '</div>'],
                ['重命名模版', '<div class="flex" style="gap:8px;align-items:center;flex-wrap:wrap">' + sw(true) +
                inp('${title} S${seasonFormat}E${episodeFormat}', '', {style: 'flex:1;min-width:280px'}) +
                '<a class="el-link el-link--primary" href="#"><span class="el-link__inner">变量说明</span></a></div>'],
                ['自定义标签', '<div class="flex" style="gap:8px;align-items:center">' + sw(false) + tagInput(['追番']) + '</div>'],
            ], 120) + '</div>'
        },
    ])

    /* ---------- 设置：八个标签页 ---------- */
    const pageSettings = form([
        ['外观', '<div class="el-radio-group" id="appearance">' +
        ['auto', 'light', 'dark'].map((m, i) => '<label class="el-radio-button' + (i === 0 ? ' is-active' : '') + '" data-mode="' + m + '">' +
            '<span class="el-radio-button__inner">' + icon(['auto', 'gear', 'moon'][i]) + '</span></label>').join('') + '</div>'],
        ['主题色', '<div class="el-color-picker" style="position:relative"><div class="el-color-picker__trigger">' +
        '<span class="el-color-picker__color"><span class="el-color-picker__color-inner" style="background-color:var(--el-color-primary)">' +
        '<i class="el-icon el-color-picker__icon" data-icon="caret"></i></span></span></div>' +
        '<input type="color" id="accent" value="#409eff" style="position:absolute;inset:0;opacity:0;cursor:pointer"/></div>' +
        '<span class="el-text el-text--info el-text--small" style="margin-left:10px" id="accentNote"></span>'],
        ['排序', sel('评分', ['评分', '标题', '更新时间', '添加时间'], 150)],
        ['最大内容宽度', '<div id="widthBox">' + num(1600, 150) + '</div><span class="el-text el-text--small" style="margin-left:8px">px</span>'],
        ['其他', '<span id="toggles">' + checks([['显示评分', true], ['按星期展示', true], ['显示视频列表', true], ['显示更新时间', true]]) + '</span>'],
        ['自定义', btn('JavaScript', {icon: 'tickets'}) + ' ' + btn('CSS', {icon: 'files'})],
    ], 100)

    const settingsBody = tabs([
        {
            title: '下载设置', pane: form([
                ['下载工具', sel('qBittorrent', ['qBittorrent', 'Transmission', 'Aria2', 'Alist'], 180)],
                ['地址', inp('http://qbittorrent:8080', 'http://x.x.x.x:8080', {style: 'max-width:360px'})],
                ['用户名', inp('', 'username', {prefix: 'user', style: 'max-width:360px'})],
                ['密码', inp('', 'password', {prefix: 'key', type: 'password', style: 'max-width:360px'})],
                ['下载位置', inp('/downloads/anime', '', {style: 'max-width:360px'})],
                ['自动删种', sw(true)],
                ['删除文件', sw(false)],
                ['做种时间', num(0, 150) + '<span class="el-text el-text--small" style="margin-left:8px">分钟</span>'],
                ['连接测试', btn('测试连接', {type: 'primary'})],
            ], 110)
        },
        {
            title: '基本设置', pane: collapse([
                {title: '页面设置', open: true, content: pageSettings},
                {
                    title: '添加订阅', content: form([
                        ['只下载最新集', sw(false)], ['标题添加年份', sw(true)], ['自动剧集偏移', sw(true)],
                        ['BGM日语标题', sw(false)], ['TMDB ID', sw(true)], ['TMDB标题', sw(true)],
                        ['TMDB语言', sel('中文', ['中文', '日语', 'English'], 150)],
                        ['开启全局排除', sw(true)], ['封面质量', sel('原图', ['原图', '高', '中'], 150)],
                    ], 120)
                },
                {
                    title: '重命名设置', content: form([
                        ['自动重命名', sw(true)],
                        ['重命名间隔', num(30, 150) + '<span class="el-text el-text--small" style="margin-left:8px">分钟</span>'],
                        ['最大文件名长度', num(255, 150)],
                        ['重命名模版', inp('${title} S${seasonFormat}E${episodeFormat}', '', {style: 'max-width:420px'})],
                        ['剔除年份', sw(false)], ['剔除TMDB ID', sw(true)], ['字幕独立文件夹', sw(false)],
                        ['', alertBox('模版变更后，已入库的剧集不会自动重命名')],
                    ], 120)
                },
                {
                    title: '刮削设置', content: form([
                        ['自动刮削', sw(true)],
                        ['追更天数', num(7, 150)],
                        ['TmdbApi', inp('https://api.themoviedb.org', '', {style: 'max-width:360px'})],
                        ['TmdbApiKey', inp('', 'xxxxxxxx', {prefix: 'key', type: 'password', style: 'max-width:360px'})],
                        ['TmdbImage', inp('https://image.tmdb.org', '', {style: 'max-width:360px'})],
                    ], 120)
                },
                {
                    title: 'RSS设置', content: form([
                        ['RSS开关', sw(true)],
                        ['RSS间隔', num(15, 150) + '<span class="el-text el-text--small" style="margin-left:8px">分钟</span>'],
                        ['RSS超时', num(30, 150) + '<span class="el-text el-text--small" style="margin-left:8px">秒</span>'],
                        ['自动跳过', sw(true)], ['自动禁用订阅', sw(true)], ['自动更新总集数', sw(true)],
                        ['自动跳过X.5集', sw(false)], ['遗漏检测', sw(true)], ['摸鱼检测', sw(false)], ['备用RSS', sw(true)],
                    ], 120)
                },
                {title: 'Trackers', content: form([['更新地址', inp('https://cf.trackerslist.com/best.txt', '', {style: 'max-width:420px'})], ['', btn('立即更新', {type: 'primary'})]], 120)},
                {
                    title: 'Bangumi', content: form([
                        ['BgmApi', inp('https://api.bgm.tv', '', {style: 'max-width:360px'})],
                        ['获取方式', radios(['Token', 'OAuth'], 0)],
                        ['Token', inp('', 'bgm token', {prefix: 'key', type: 'password', style: 'max-width:360px'})],
                    ], 120)
                },
                {
                    title: '其他', content: form([
                        ['Api', inp('', 'api key', {prefix: 'key', type: 'password', style: 'max-width:360px'})],
                        ['最大日志条数', num(1000, 150)],
                        ['自动更新', sw(false)], ['DEBUG', sw(false)], ['缓存', sw(true)],
                        ['自动备份配置', sw(true)], ['开机自启', sw(false)],
                    ], 120)
                },
                {title: '备份', content: '<div class="flex" style="gap:10px">' + btn('导出配置', {type: 'primary', icon: 'download'}) + btn('导入配置', {icon: 'upload'}) + '</div>'},
            ])
        },
        {
            title: '全局排除', pane:
                '<div class="flex" style="gap:8px;margin-bottom:10px">' + inp('', '输入要排除的关键字，回车添加', {style: 'flex:1'}) + btn('添加', {type: 'primary'}) + '</div>' +
                form([
                    ['字幕组', '<div class="flex" style="flex-wrap:wrap;gap:6px">' + tagList(['桜都字幕组', 'Nekomoe kissaten']) + '</div>'],
                    ['正则', '<div class="flex" style="flex-wrap:wrap;gap:6px">' + tagList(['720p', '繁体', 'CHT', 'MKV', '合集', 'DVD', '\\d+-\\d+']) + '</div>'],
                ], 80)
        },
        {
            title: '代理设置', pane: form([
                ['启用', sw(true)],
                ['类型', radios(['HTTP', 'SOCKS5'], 0)],
                ['IP', inp('proxy.local', '', {style: 'max-width:300px'})],
                ['端口', num(7890, 150)],
                ['用户名', inp('', 'username', {prefix: 'user', style: 'max-width:300px'})],
                ['密码', inp('', 'password', {prefix: 'key', type: 'password', style: 'max-width:300px'})],
                ['代理列表', sel('全部走代理', ['全部走代理', '仅 TMDB', '仅 Bangumi', '自定义'], 180)],
            ], 110)
        },
        {
            title: '登录设置', pane: form([
                ['用户名', inp('', '用户名', {prefix: 'user', style: 'max-width:300px'})],
                ['密码', inp('', '••••••', {prefix: 'key', type: 'password', style: 'max-width:300px'})],
                ['登录有效', num(7, 150) + '<span class="el-text el-text--small" style="margin-left:8px">天</span>'],
                ['其他', checks([['登录验证', true], ['IP白名单', true], ['反代信任', false], ['Api Key', true], ['限制登录失败次数', true], ['记住密码', false]])],
                ['IP白名单', tagInput(['127.0.0.1', '局域网'])],
                ['Api Key', inp('', 'ani-rss-xxxxxxxx', {prefix: 'key', type: 'password', style: 'max-width:360px'})],
            ], 110)
        },
        {
            title: '通知', pane: '<div class="grid-container" style="--ani-grid-columns:3;grid-gap:8px">' +
                [['Telegram', 1], ['Bark', 0], ['Webhook', 1], ['邮件', 0], ['Server 酱', 0], ['系统通知', 1], ['Gotify', 0], ['企业微信', 0], ['Shell', 1]].map(([n, on]) =>
                    '<div class="el-card is-never-shadow"><div class="el-card__body" style="padding:12px 14px">' +
                    '<div class="flex" style="justify-content:space-between;align-items:center;gap:10px">' +
                    '<span class="el-text">' + esc(n) + '</span>' + sw(!!on) + '</div></div></div>').join('') + '</div>'
        },
        {
            title: '捐赠', pane: '<div class="flex-center" style="flex-direction:column;gap:14px;padding:34px 0">' +
                '<span class="el-text">如果这个项目帮到了你，可以请作者喝杯咖啡</span>' +
                '<div class="flex" style="gap:10px">' + btn('爱发电', {type: 'primary'}) + btn('查看赞助者', {text: true, bg: true}) + '</div></div>'
        },
        {
            title: '关于', pane: '<div class="flex-center" style="flex-direction:column;gap:6px;padding:16px 0">' +
                '<svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="opacity:.9">' +
                '<circle cx="6" cy="18" r="2.2" fill="currentColor"/>' +
                '<path d="M4 11.5a8.5 8.5 0 0 1 8.5 8.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>' +
                '<path d="M4 5a15 15 0 0 1 15 15" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>' +
                '<h2 style="margin:6px 0 0">ANI-RSS</h2>' +
                '<span class="el-text el-text--info el-text--small">v3.1.77</span>' +
                '<div class="flex" style="gap:18px;margin-top:12px">' +
                '<a class="el-link el-link--default" href="https://github.com/wushuo894/ani-rss" target="_blank"><span class="el-link__inner">GitHub</span></a>' +
                '<a class="el-link el-link--default" href="https://docs.wushuo.top" target="_blank"><span class="el-link__inner">使用文档</span></a></div>' +
                '<div class="flex" style="gap:10px;margin-top:16px">' +
                btn('退出', {type: 'danger', text: true}) + btn('重启', {type: 'warning', text: true}) +
                btn('关闭', {type: 'danger', text: true}) + btn('更新', {type: 'success', text: true}) + '</div>' +
                '<div style="max-width:520px;margin-top:16px">' + alertBox('已是最新版本', 'success') + '</div></div>'
        },
    ])

    $('#dialogs').innerHTML =
        dialog('dlg-download', '下载', downloadBody, '', '900px') +
        dialog('dlg-manage', '管理', manageBody, '', '900px') +
        dialog('dlg-logs', '日志', logsBody, '', '1000px') +
        dialog('dlg-add', '添加订阅', addBody, btn('确定', {type: 'success', text: true, icon: 'check'}).replace('<button', '<button data-close'), '800px') +
        dialog('dlg-edit', '修改订阅', editBody,
            btn('删除', {type: 'danger', text: true, icon: 'del'}) + btn('保存', {type: 'success', text: true, icon: 'check'}).replace('<button', '<button data-close'), '800px') +
        dialog('dlg-settings', '设置', settingsBody, okCancel, '860px')

    $('#manageList').innerHTML = DATA.slice(0, 12).map(a =>
        '<div class="el-card is-never-shadow" style="margin-bottom:6px"><div class="el-card__body" style="padding:10px 14px">' +
        '<div class="flex" style="align-items:center;gap:12px">' +
        '<label class="el-checkbox"><span class="el-checkbox__input"><span class="el-checkbox__inner"></span></span></label>' +
        '<img src="' + esc(a.cover) + '" style="width:26px;height:37px;object-fit:cover;border-radius:3px" loading="lazy" referrerpolicy="no-referrer"/>' +
        '<span class="el-text" style="flex:1;min-width:0">' + esc(a.t) + '</span>' +
        '<span class="el-tag el-tag--info el-tag--light"><span class="el-tag__content">' + esc(a.sub) + '</span></span>' +
        '<span class="el-text el-text--info el-text--small">' + esc(a.ep) + '</span>' +
        '</div></div></div>').join('')

    fillIcons()

    /* ==================== 弹窗开关：走真实过渡 ==================== */
    function openDialog(id) {
        const ov = document.getElementById(id)
        if (!ov) return
        ov.style.display = ''
        ov.classList.add('dialog-fade-enter-active')
        setTimeout(() => ov.classList.remove('dialog-fade-enter-active'), 300)
        requestAnimationFrame(() => positionBars(ov))
        setTimeout(() => positionBars(ov), 320)
    }

    function closeDialog(ov) {
        ov.classList.add('dialog-fade-leave-active')
        setTimeout(() => {
            ov.classList.remove('dialog-fade-leave-active')
            ov.style.display = 'none'
        }, 300)
    }

    document.addEventListener('click', e => {
        const b = e.target.closest('[data-act]')
        if (b) {
            const act = b.dataset.act
            if (act === 'add') return toggleDropdown(b, [['添加订阅', 'dlg-add'], ['添加合集', null]])
            if (act === 'batch') return toggleDropdown(b, [['刷新选中', null], ['启用选中', null], ['禁用选中', null], ['导出选中', null], ['删除选中', null]])
            if (act === 'refresh') return toast('已开始刷新全部订阅')
            if (act === 'login') return toast('演示页面，不会真的登录')
            if (act && act.indexOf('dlg-') === 0) return openDialog(act)
            return
        }
        const c = e.target.closest('[data-close]')
        if (c) return closeDialog(c.closest('.el-overlay'))
        if (e.target.classList && e.target.classList.contains('el-overlay-dialog')) closeDialog(e.target.closest('.el-overlay'))
    })

    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return
        killPopper()
        const open = $$('.el-overlay').filter(o => o.style.display !== 'none')
        if (open.length) closeDialog(open[open.length - 1])
    })

    /* ==================== 浮层 ==================== */
    let popper = null

    function killPopper() {
        if (!popper) return
        const p = popper
        popper = null
        p.classList.add('el-zoom-in-top-leave-active')
        setTimeout(() => p.remove(), 200)
    }

    function makePopper(anchor, cls, html, owner) {
        killPopper()
        const r = anchor.getBoundingClientRect()
        const p = document.createElement('div')
        p.className = 'pv-popper el-popper is-light is-pure ' + cls + ' el-zoom-in-top-enter-from'
        p.dataset.owner = owner
        p.innerHTML = html
        document.body.appendChild(p)
        p.style.left = Math.max(8, Math.min(r.left, window.innerWidth - p.offsetWidth - 8)) + 'px'
        p.style.top = (r.bottom + 6) + 'px'
        p.style.minWidth = r.width + 'px'
        requestAnimationFrame(() => {
            p.classList.remove('el-zoom-in-top-enter-from')
            p.classList.add('el-zoom-in-top-enter-active')
        })
        popper = p
        return p
    }

    function toggleDropdown(btnEl, items) {
        const owner = btnEl.dataset.act
        if (popper && popper.dataset.owner === owner) return killPopper()
        const p = makePopper(btnEl, 'el-dropdown__popper',
            '<div class="el-dropdown-menu">' + items.map(([t]) => '<li class="el-dropdown-menu__item">' + esc(t) + '</li>').join('') + '</div>', owner)
        p.querySelectorAll('.el-dropdown-menu__item').forEach((li, i) => li.addEventListener('click', () => {
            killPopper()
            if (items[i][1]) openDialog(items[i][1])
        }))
    }

    document.addEventListener('click', e => {
        if (e.target.closest('[data-act]')) return
        const s = e.target.closest('.el-select[data-select]')
        if (!s) {
            if (!e.target.closest('.pv-popper')) killPopper()
            return
        }
        const key = s.dataset.select
        if (popper && popper.dataset.owner === key) return killPopper()
        const cur = s.querySelector('[data-value]').textContent.trim()
        const p = makePopper(s, 'el-select__popper',
            '<div class="el-select-dropdown"><div class="el-select-dropdown__list">' +
            (SELECTS[key] || []).map(v => '<li class="el-select-dropdown__item' + (v === cur ? ' selected is-selected' : '') + '">' + esc(v) + '</li>').join('') +
            '</div></div>', key)
        p.querySelectorAll('.el-select-dropdown__item').forEach(li => li.addEventListener('click', () => {
            const label = s.querySelector('[data-value]')
            label.textContent = li.textContent
            label.parentElement.classList.remove('is-transparent')
            if (SELECTS[key] && SELECTS[key][0] === '全部' && s.closest('#header')) { filterEnable = li.textContent; renderList() }
            killPopper()
        }))
    })

    /* 首页那两个选择器单独注册（结构写在 HTML 里） */
    SELECTS['month'] = ['2026-07', '2026-04', '2026-01', '2025-10']
    SELECTS['enable'] = ['全部', '已启用', '未启用']
    $$('.el-select[data-select="enable"]').forEach(s => s.addEventListener('click', () => setTimeout(() => {
        const p = popper
        if (!p) return
        p.querySelectorAll('.el-select-dropdown__item').forEach(li => li.addEventListener('click', () => {
            filterEnable = li.textContent.trim()
            renderList()
        }))
    }, 0)))

    /* ==================== 标签页 ==================== */
    function positionBars(root) {
        ;(root || document).querySelectorAll('.el-tabs').forEach(t => {
            const bar = t.querySelector('.el-tabs__active-bar')
            const act = t.querySelector('.el-tabs__item.is-active')
            if (!bar || !act) return
            if (t.classList.contains('el-tabs--left')) {
                if (!act.offsetHeight) return
                bar.style.height = act.offsetHeight + 'px'
                bar.style.transform = 'translateY(' + act.offsetTop + 'px)'
            } else {
                if (!act.offsetWidth) return
                bar.style.width = act.offsetWidth + 'px'
                bar.style.transform = 'translateX(' + act.offsetLeft + 'px)'
            }
        })
    }

    document.addEventListener('click', e => {
        const it = e.target.closest('.el-tabs__item')
        if (!it) return
        const wrap = it.closest('.el-tabs')
        wrap.querySelectorAll(':scope > .el-tabs__header .el-tabs__item').forEach(x => x.classList.remove('is-active'))
        it.classList.add('is-active')
        wrap.querySelectorAll(':scope > .el-tabs__content > .el-tab-pane').forEach(p => {
            p.style.display = p.dataset.pane === it.dataset.tab ? '' : 'none'
        })
        positionBars(wrap.closest('.el-overlay') || document)
    })

    window.addEventListener('resize', () => positionBars())

    /* ==================== 折叠面板 ==================== */
    document.addEventListener('click', e => {
        const head = e.target.closest('.el-collapse-item__header')
        if (!head) return
        const cItem = head.parentElement
        const wrap = cItem.querySelector('.el-collapse-item__wrap')
        if (!wrap) return
        const open = cItem.classList.toggle('is-active')
        head.classList.toggle('is-active', open)
        const arrow = head.querySelector('.el-collapse-item__arrow')
        if (arrow) arrow.classList.toggle('is-active', open)
        wrap.classList.add('el-collapse-transition-enter-active')
        wrap.style.maxHeight = open ? wrap.scrollHeight + 'px' : '0px'
    })

    /* ==================== 通用控件：点了要有反应 ==================== */
    document.addEventListener('click', e => {
        const s = e.target.closest('.el-switch')
        if (s) s.classList.toggle('is-checked')

        const cb = e.target.closest('.el-checkbox')
        if (cb) {
            e.preventDefault()
            const on = !cb.classList.contains('is-checked')
            cb.classList.toggle('is-checked', on)
            cb.querySelector('.el-checkbox__input').classList.toggle('is-checked', on)
            if (cb.closest('#toggles')) document.body.classList.toggle(TOGGLE_MAP[cb.textContent.trim()], !on)
        }

        const rb = e.target.closest('.el-radio-button')
        if (rb) {
            const g = rb.closest('.el-radio-group')
            g.querySelectorAll('.el-radio-button').forEach(x => x.classList.remove('is-active'))
            rb.classList.add('is-active')
            if (g.id === 'appearance') {
                const m = rb.dataset.mode
                setMode(m === 'dark' || (m === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches))
            }
        }

        const step = e.target.closest('[data-step]')
        if (step) {
            const input = step.parentElement.querySelector('.el-input__inner')
            const isWidth = step.closest('#widthBox')
            const d = (isWidth ? 100 : 1) * (+step.dataset.step)
            const v = (parseInt(input.value, 10) || 0) + d
            input.value = isWidth ? Math.max(1200, Math.min(2400, v)) : Math.max(0, v)
            if (isWidth) { $('#app').style.maxWidth = input.value + 'px'; autoColumns() }
        }
    })

    const TOGGLE_MAP = {'显示评分': 'no-score', '按星期展示': 'no-week', '显示视频列表': 'no-playlist', '显示更新时间': 'no-time'}

    $('#accent').addEventListener('input', e => {
        document.documentElement.style.setProperty('--el-color-primary', e.target.value)
        const applied = getComputedStyle(document.documentElement).getPropertyValue('--el-color-primary').trim()
        $('#accentNote').textContent = applied.toLowerCase() === e.target.value.toLowerCase() ? '' : '当前主题固定了主题色，此处不生效'
    })

    /* ==================== 提示（模拟 ElMessage） ==================== */
    function toast(text) {
        const el = document.createElement('div')
        el.className = 'el-message el-message--success'
        el.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);z-index:6000'
        el.innerHTML = '<i class="el-icon el-message__icon">' + ICON.circleCheck + '</i><p class="el-message__content">' + esc(text) + '</p>'
        document.body.appendChild(el)
        setTimeout(() => {
            el.style.transition = 'opacity .3s, transform .3s'
            el.style.opacity = '0'
            el.style.transform = 'translateX(-50%) translateY(-14px)'
            setTimeout(() => el.remove(), 320)
        }, 2200)
    }

    /* ==================== 主题栏 ==================== */
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

    const pick = $('#pick'), modeBtn = $('#mode'), modeNote = $('#modeNote')
    THEMES.forEach(([f, n]) => {
        const o = document.createElement('option')
        o.value = f
        o.textContent = n
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

    const fixedMode = meta[2] !== 'auto'
    modeBtn.disabled = fixedMode
    modeBtn.style.opacity = fixedMode ? '.4' : '1'
    modeNote.textContent = fixedMode ? (meta[2] === 'dark' ? '该主题强制深色' : '该主题强制浅色') : ''
    setMode(fixedMode ? meta[2] === 'dark' : localStorage.getItem('ani-preview-dark') === '1')

    pick.addEventListener('change', () => {
        localStorage.setItem('ani-preview-theme', pick.value)
        location.search = '?t=' + pick.value
    })
    modeBtn.addEventListener('click', () => setMode(!document.documentElement.classList.contains('dark')))

    const loginBtn = $('#loginToggle')
    loginBtn.addEventListener('click', () => {
        const on = $('#login-view').style.display === 'none'
        $('#login-view').style.display = on ? 'flex' : 'none'
        $('#home-view').style.display = on ? 'none' : 'flex'
        loginBtn.textContent = on ? '看首页' : '看登录页'
        loginBtn.classList.toggle('on', on)
    })

    positionBars()
    const openWrap = document.querySelector('.el-collapse-item.is-active .el-collapse-item__wrap')
    if (openWrap) openWrap.style.maxHeight = '1400px'
})()
