/*
 * 在页面里跑的那一段。写成独立文件是为了不跟外层的模板字符串打架。
 * 用 ES5 写法：它要被塞进 Runtime.evaluate，没有构建这一步。
 */
(function () {
    var VW = innerWidth

    // 纯装饰的内层节点：涟漪、遮罩、进度条动画。它们越界不代表布局有问题，
    // 真出事的是它们的父按钮 —— 那个会被单独报出来
    var DECOR = /v-btn__overlay|v-btn__underlay|v-ripple|__sizer|v-progress-linear__indeterminate|v-field__overlay|v-field__outline|v-card__overlay|v-card__underlay/

    function cls(el) {
        var c = el.className
        if (c && c.baseVal !== undefined) c = c.baseVal
        return String(c || '')
    }

    function desc(el) {
        var c = cls(el).trim().split(/\s+/).filter(Boolean).slice(0, 3).join('.')
        var t = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 26)
        return el.tagName.toLowerCase() + (c ? '.' + c : '') + (t ? ' 「' + t + '」' : '')
    }

    // 外面有能横滚的容器兜着就不算越界 —— 星期条、追番轨道本来就是横着滚的
    function scrollableX(el) {
        for (var p = el.parentElement; p; p = p.parentElement) {
            var o = getComputedStyle(p).overflowX
            if (o === 'auto' || o === 'scroll') return true
        }
        return false
    }

    // 收起来的抽屉整个被挪到屏幕左边外面，里面的东西跟着"越界"，那是设计如此
    function insideFixed(el) {
        for (var p = el.parentElement; p && p !== document.body; p = p.parentElement)
            if (getComputedStyle(p).position === 'fixed') return true
        return false
    }

    function visible(el) {
        var s = getComputedStyle(el)
        if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false
        var r = el.getBoundingClientRect()
        return r.width > 0 && r.height > 0
    }

    // 输入框的热区是整个 .v-field，裸 input 本身矮是正常的
    function fieldHeight(el) {
        var f = el.closest('.v-field, .v-input, .v-selection-control, label')
        return f ? f.getBoundingClientRect().height : 0
    }

    var out = {vw: VW, doc: document.documentElement.scrollWidth, overflow: [], tap: [], overlap: []}
    var all = document.querySelectorAll('body *')

    for (var i = 0; i < all.length; i++) {
        var el = all[i]
        if (DECOR.test(cls(el)) || !visible(el)) continue
        var r = el.getBoundingClientRect(), s = getComputedStyle(el)

        if ((r.right > VW + 1 || r.left < -1) && s.position !== 'fixed'
            && !scrollableX(el) && !insideFixed(el))
            out.overflow.push({el: desc(el), l: Math.round(r.left), rr: Math.round(r.right)})

        var clickable = el.matches('button,a[href],[role=button],[role=tab],[role=switch],'
            + '.v-btn,.v-chip--clickable,input:not([type=hidden]),select,textarea')
        // 评分那排星星是一条刻度不是十个独立目标，单颗小是有意为之
        if (clickable && !el.closest('.v-rating') && !el.querySelector('button,a[href],.v-btn')
            && (r.width < 36 || r.height < 36) && fieldHeight(el) < 36)
            out.tap.push({el: desc(el), w: Math.round(r.width), h: Math.round(r.height)})
    }

    var fixed = []
    for (var k = 0; k < all.length; k++) {
        var e = all[k], pos = getComputedStyle(e).position
        if ((pos === 'fixed' || pos === 'sticky') && visible(e) && !DECOR.test(cls(e))) fixed.push(e)
    }
    for (var a = 0; a < fixed.length; a++) {
        for (var b = a + 1; b < fixed.length; b++) {
            if (fixed[a].contains(fixed[b]) || fixed[b].contains(fixed[a])) continue
            var ra = fixed[a].getBoundingClientRect(), rb = fixed[b].getBoundingClientRect()
            var ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left)
            var oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top)
            // 只报真挡住东西的：演示角标压在保存条空白处不算，压住按钮才算
            if (ox > 4 && oy > 4 && (fixed[a].querySelector('.v-btn') || fixed[b].querySelector('.v-btn'))) {
                var bar = fixed[a].querySelector('.v-btn') ? fixed[a] : fixed[b]
                var other = bar === fixed[a] ? fixed[b] : fixed[a]
                var orect = other.getBoundingClientRect(), covered = false
                var btns = bar.querySelectorAll('.v-btn')
                for (var n = 0; n < btns.length; n++) {
                    var br = btns[n].getBoundingClientRect()
                    if (Math.min(orect.right, br.right) - Math.max(orect.left, br.left) > 1
                        && Math.min(orect.bottom, br.bottom) - Math.max(orect.top, br.top) > 1) covered = true
                }
                if (covered) out.overlap.push({a: desc(fixed[a]), b: desc(fixed[b]), ox: Math.round(ox), oy: Math.round(oy)})
            }
        }
    }

    function dedup(arr) {
        var seen = {}, res = []
        for (var i = 0; i < arr.length; i++) {
            var k = JSON.stringify(arr[i])
            if (!seen[k]) { seen[k] = 1; res.push(arr[i]) }
        }
        return res
    }

    out.overflow = dedup(out.overflow).slice(0, 8)
    out.tap = dedup(out.tap).slice(0, 8)
    out.overlap = dedup(out.overlap).slice(0, 4)
    return out
})()
