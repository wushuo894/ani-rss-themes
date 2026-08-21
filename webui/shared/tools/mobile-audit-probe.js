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

    /*
     * 文字放不下：量真实文字宽度，跟它能占的宽度比。
     *
     * 这一类光看 scrollWidth 是量不出来的 —— placeholder 画在原生 input 上，
     * 放不下时直接截掉，scrollWidth 一点不涨；chip 里的文字则是漫到圆角框外面，
     * 两种都长得像「控件坏了」。所以拿 canvas 按元素自己的字体量一遍。
     * 只查控件里的短文本，不查正文：番剧名过长省略号截断是设计，不是毛病。
     */
    var ctx = document.createElement('canvas').getContext('2d')
    function textWidth(el, text) {
        var s = getComputedStyle(el)
        ctx.font = s.fontStyle + ' ' + s.fontWeight + ' ' + s.fontSize + '/' + s.lineHeight + ' ' + s.fontFamily
        var w = ctx.measureText(text).width
        var ls = parseFloat(s.letterSpacing)
        return w + (isNaN(ls) ? 0 : ls * text.length)
    }

    var out = {vw: VW, doc: document.documentElement.scrollWidth, overflow: [], tap: [], overlap: [], clipped: []}
    var all = document.querySelectorAll('body *')

    for (var i = 0; i < all.length; i++) {
        var el = all[i]
        if (DECOR.test(cls(el)) || !visible(el)) continue
        var r = el.getBoundingClientRect(), s = getComputedStyle(el)

        /*
         * 摸不着又没有字的装饰层不算越界。
         *
         * 玻璃那款的 hero-bg 就是这样：inset: -12% 的一张模糊底图，故意比容器大一圈，
         * pointer-events: none，外面又有 overflow: hidden 兜着 —— 谁都点不到它，
         * 也不会让页面能横拽。真正要报的是被顶出去的按钮和文字，那些摸得着。
         */
        var decorative = s.pointerEvents === 'none' && !(el.textContent || '').trim()

        if ((r.right > VW + 1 || r.left < -1) && s.position !== 'fixed' && !decorative
            && !scrollableX(el) && !insideFixed(el))
            out.overflow.push({el: desc(el), l: Math.round(r.left), rr: Math.round(r.right)})

        var clickable = el.matches('button,a[href],[role=button],[role=tab],[role=switch],'
            + '.v-btn,.v-chip--clickable,input:not([type=hidden]),select,textarea')
        // 评分那排星星是一条刻度不是十个独立目标，单颗小是有意为之
        if (clickable && !el.closest('.v-rating') && !el.querySelector('button,a[href],.v-btn')
            && (r.width < 36 || r.height < 36) && fieldHeight(el) < 36)
            out.tap.push({el: desc(el), w: Math.round(r.width), h: Math.round(r.height)})
    }

    // ① 空输入框的占位文字
    var inputs = document.querySelectorAll('input[placeholder], textarea[placeholder]')
    for (var p1 = 0; p1 < inputs.length; p1++) {
        var inp = inputs[p1]
        if (inp.value || !visible(inp)) continue
        var room = inp.clientWidth - 2
        var need = textWidth(inp, inp.placeholder)
        if (room > 0 && need > room + 2)
            out.clipped.push({el: desc(inp), text: inp.placeholder, need: Math.round(need), room: Math.round(room)})
    }

    // ② chip / 按钮 / 标签这类「本来就该整句显示」的短文本
    var labels = document.querySelectorAll('.v-chip__content, .v-btn__content, .v-tab, .v-expansion-panel-title__overlay + *')
    for (var p2 = 0; p2 < labels.length; p2++) {
        var lb = labels[p2]
        if (!visible(lb) || lb.querySelector('input, textarea')) continue
        var txt = (lb.textContent || '').trim().replace(/\s+/g, ' ')
        if (!txt || txt.length > 24) continue
        var own = lb.getBoundingClientRect()
        var host = lb.closest('.v-chip, .v-btn, .v-tab') || lb
        var hr = host.getBoundingClientRect()
        // 内容比外壳还宽 = 漫出圆角框；这是横向的挤压，不是省略号
        if (own.width > hr.width + 2)
            out.clipped.push({el: desc(host), text: txt, need: Math.round(own.width), room: Math.round(hr.width)})
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
    out.clipped = dedup(out.clipped).slice(0, 8)
    return out
})()
