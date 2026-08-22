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

    /*
     * ⑤ 点阵字那两款：字号必须落在 12 的整数倍上。
     *
     * win98 和 macintosh 用的是 12px 一格的点阵字（见 src/fonts/README.md）。
     * 字号只要不在格上，浏览器就得把 1px 宽的笔画拉成 1.08px —— 拉出来是两条灰边，
     * 整屏字发虚。这毛病看截图分辨不出来（「有点糊」和「字体没生效」长得一样），
     * 但量出来是确定的：computed 的 font-size 除以 12 不是整数，就是漏了一处。
     *
     * 只查直接含文字节点的元素：容器的 font-size 会被子元素覆盖，报出来全是噪音。
     * v-icon 排除 —— 图标的大小就是靠 font-size 传的，它本来就不该在这个网格上。
     */
    out.offgrid = []
    if (/^(win98|macintosh)$/.test(document.documentElement.getAttribute('data-ani-theme') || '')) {
        for (var g = 0; g < all.length; g++) {
            var ge = all[g]
            if (!visible(ge) || ge.closest('.v-icon')) continue
            var own = false
            for (var ch = ge.firstChild; ch; ch = ch.nextSibling) {
                if (ch.nodeType === 3 && ch.nodeValue.trim()) own = true
            }
            if (!own) continue
            var fs = parseFloat(getComputedStyle(ge).fontSize)
            if (Math.abs(fs / 12 - Math.round(fs / 12)) > 0.01) out.offgrid.push({el: desc(ge), fs: fs})
        }
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
                /*
                 * 挡在上面的那个若是 pointer-events: none，就不算「压住」——
                 * 点击会穿过去，按钮照样能按。这一条是为演示角标写的：
                 * 它 position: fixed 钉在左下角，而外壳（w98-desktop / dsm-desktop / mac-screen）
                 * 本身也是 fixed 且包着全部按钮，于是页面高度只要变一点点，
                 * 底下那一排按钮里总会有一颗滑进角标那 82×18 的方框里 —— 报的是坐标巧合，
                 * 不是可用性问题。而且那枚角标只存在于演示产物，正式包里根本没有这个元素。
                 * 真正要拦的是不透明的粘性条（保存条、底部导航）压住按钮，那些都是能点的。
                 */
                if (getComputedStyle(other).pointerEvents === 'none') continue
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

    /*
     * ── 按钮贴在一起 ──
     *
     * 相邻两颗按钮之间不留缝，鼠标从一颗滑到另一颗中间没有任何间隙，看着也分不出
     * 是两颗还是一条。这类量分散在九款各自的样式里，改一处只治一处 ——
     * 应用栏右上角那两颗（主题 / 退出登录）就是九款一起 0px，因为九款用的是同一个
     * v-app-bar，而 Vuetify 的 v-toolbar__content 是个没有 gap 的 flex。
     *
     * 天生该贴着的不算：分段按钮、分页、标签栏、底部导航、各款自画的菜单栏和任务栏 ——
     * 那几种「连成一条」正是它们的形状。
     */
    var GLUED = '.v-btn-toggle, .v-pagination, .v-tabs, .v-item-group, .v-slide-group,'
        + ' .v-btn-group, .v-field, .v-input, .v-window, .v-bottom-navigation,'
        + ' nav, [role="navigation"], .nav-island, .w98-menubar, .mac-menubar, .dsm-taskbar'
    out.glued = []
    var gb = []
    var allBtn = document.querySelectorAll('.v-btn')
    for (var bi = 0; bi < allBtn.length; bi++)
        if (visible(allBtn[bi]) && !allBtn[bi].closest(GLUED)) gb.push(allBtn[bi])
    for (var g1 = 0; g1 < gb.length; g1++) {
        for (var g2 = g1 + 1; g2 < gb.length; g2++) {
            /*
             * 只比同一个父容器里的兄弟。
             * 不限定的话，悬浮的那颗 FAB 只要正好飘到某张卡片的图标旁边 0.4px，
             * 就会被报成「贴在一起」—— 它们根本不在同一行，中间隔着一整个图层。
             * 真正需要留缝的「两颗按钮」永远是并排的兄弟。
             */
            if (gb[g1].parentElement !== gb[g2].parentElement) continue
            var ra = gb[g1].getBoundingClientRect(), rb = gb[g2].getBoundingClientRect()
            var oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top)
            var ox2 = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left)
            var gap = null
            if (oy > Math.min(ra.height, rb.height) * 0.5) gap = Math.max(ra.left, rb.left) - Math.min(ra.right, rb.right)
            else if (ox2 > Math.min(ra.width, rb.width) * 0.5) gap = Math.max(ra.top, rb.top) - Math.min(ra.bottom, rb.bottom)
            // 负数是叠在一起，那是 overlap 那条在管，这里只看「挨着但不留缝」。
            // 3.5 而不是 4：写着 gap: 4px 的容器实测常是 3.98，卡在整数上会每次都报
            if (gap === null || gap < 0 || gap >= 3.5) continue
            out.glued.push({a: desc(gb[g1]), b: desc(gb[g2]), gap: Math.round(gap * 10) / 10})
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
    out.offgrid = dedup(out.offgrid).slice(0, 8)
    out.glued = dedup(out.glued).slice(0, 6)
    return out
})()
