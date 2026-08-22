/*
 * 在页面里跑的那一段：量当前打开的弹窗，看有没有东西被容器裁掉、或者左右留白不对称。
 * 用 ES5 写法 —— 它是被塞进 Runtime.evaluate 的，没有构建这一步。
 *
 * 和 mobile-audit-probe.js 的分工：那一份拿**视口**当尺子，量的是「有没有被顶出屏幕」；
 * 这一份拿**最近一个会裁剪的祖先**当尺子。弹窗里的毛病全是后一种 ——
 * 卡片自己 overflow: hidden，被切掉的按钮从来不会跑到视口外面去，
 * 所以视口那把尺子一次都没响过，而人眼看到的就是「按钮只剩半截」。
 */
(function () {
    function cls(el) {
        var c = el.className
        if (c && c.baseVal !== undefined) c = c.baseVal
        return String(c || '')
    }

    /* 纯装饰的内层节点：涟漪、遮罩、下划线。它们越界不代表布局有问题 */
    var DECOR = /v-btn__overlay|v-btn__underlay|v-ripple|__sizer|v-field__overlay|v-field__outline|v-card__overlay|v-card__underlay|v-overlay__scrim|v-progress-linear__|v-tabs-slider|v-field__loader|v-selection-control__input|v-input__control/

    /* 天生就该横着滚的容器：标签栏、星期条自带左右箭头，宽表格本来就要拖 */
    var SCROLLER = '.v-slide-group, .v-tabs, .v-table__wrapper, .v-window__container'

    function desc(el) {
        var c = cls(el).trim().split(/\s+/).filter(Boolean).slice(0, 3).join('.')
        var t = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24)
        return el.tagName.toLowerCase() + (c ? '.' + c : '') + (t ? ' 「' + t + '」' : '')
    }

    function visible(el) {
        var s = getComputedStyle(el)
        if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false
        var r = el.getBoundingClientRect()
        return r.width > 0 && r.height > 0
    }

    function clipperX(el) {
        for (var p = el.parentElement; p; p = p.parentElement) {
            if (getComputedStyle(p).overflowX !== 'visible') return p
        }
        return null
    }

    var out = []
    var roots = document.querySelectorAll('.v-overlay--active .v-overlay__content')

    for (var i = 0; i < roots.length; i++) {
        var all = roots[i].querySelectorAll('*')
        for (var j = 0; j < all.length; j++) {
            var el = all[j]
            if (DECOR.test(cls(el)) || !visible(el)) continue
            var s = getComputedStyle(el)
            if (s.position === 'fixed') continue
            /* 摸不着又没有字的装饰层不算 */
            if (s.pointerEvents === 'none' && !(el.textContent || '').trim()) continue

            var p = clipperX(el)
            if (!p || p.closest(SCROLLER)) continue

            var po = getComputedStyle(p).overflowX
            var scrolls = (po === 'auto' || po === 'scroll') && p.scrollWidth > p.clientWidth + 1
            var pr = p.getBoundingClientRect()
            var boxLeft = pr.left + p.clientLeft
            var boxRight = boxLeft + p.clientWidth
            var r = el.getBoundingClientRect()
            var over = Math.round(r.right - boxRight)
            var under = Math.round(boxLeft - r.left)

            /*
             * 左边那一截是滚也滚不出来的：LTR 下 scrollWidth 只算内容原点右边的部分，
             * 伸到原点左边的东西永远看不见。所以它比「右边溢出」更严重，单独一类。
             */
            var kind = null
            if (under > 1) kind = '左边被切掉（滚也滚不出来）'
            else if (over > 1) kind = scrolls ? '要横滚才看得全' : '右边被切掉'
            if (!kind) continue

            out.push({k: kind, px: Math.max(over, under), el: desc(el), box: desc(p)})
        }
    }

    /*
     * ── 内容啃进了容器的留白里 ──
     *
     * 「就好像只有左边距，没有右边距」这句话量出来是这样的：卡片自己写着 padding: 24px，
     * 里面某颗按钮的右边却离容器边只剩 12px —— 它啃掉了本该留着的那一半，
     * 再多一点就顶到卡片外面去。
     *
     * 尺子必须是容器**自己声明的 padding**，不能拿「左边最近的 vs 右边最近的」去比：
     * 按钮条本来就是右对齐的，标题栏的关闭按钮本来就在最右边 ——
     * 那样比出来的「不对称」全是设计如此，一条真的都没有。
     */
    for (var b = 0; b < roots.length; b++) {
        var boxes = roots[b].querySelectorAll('.v-card-text, .v-card-actions, .v-card-title')
        for (var c2 = 0; c2 < boxes.length; c2++) {
            var box = boxes[c2]
            if (!visible(box)) continue
            var bs = getComputedStyle(box)
            /* 自己就没留白的容器（pa-0 的列表壳）不在这条的管辖范围 */
            var padL = parseFloat(bs.paddingLeft) || 0
            var padR = parseFloat(bs.paddingRight) || 0
            if (padL < 4 && padR < 4) continue
            var br = box.getBoundingClientRect()
            var kids = box.querySelectorAll('.v-btn, .v-field, .v-chip, .v-selection-control, .v-alert')
            for (var k = 0; k < kids.length; k++) {
                var kid = kids[k]
                if (!visible(kid) || DECOR.test(cls(kid))) continue
                /* 嵌在别的控件里的（输入框 append 槽里的小按钮）由外层那个代表 */
                if (kid.parentElement && kid.parentElement.closest('.v-field, .v-btn')) continue
                /* 装在横滚容器里的（宽表格最右边那一列）本来就要拖着看，不是留白被啃了 */
                if (kid.closest(SCROLLER)) continue
                var kr = kid.getBoundingClientRect()
                var gapR = br.right - kr.right, gapL = kr.left - br.left
                if (padR >= 4 && gapR < padR - 2) {
                    out.push({
                        k: '啃进了右边的留白', px: Math.round(padR - gapR),
                        el: desc(kid) + '（右边只剩 ' + Math.round(gapR) + '，容器写的是 ' + Math.round(padR) + '）',
                        box: desc(box),
                    })
                }
                if (padL >= 4 && gapL < padL - 2) {
                    out.push({
                        k: '啃进了左边的留白', px: Math.round(padL - gapL),
                        el: desc(kid) + '（左边只剩 ' + Math.round(gapL) + '，容器写的是 ' + Math.round(padL) + '）',
                        box: desc(box),
                    })
                }
            }
        }
    }

    var seen = {}, res = []
    for (var d = 0; d < out.length; d++) {
        var key = JSON.stringify(out[d])
        if (!seen[key]) { seen[key] = 1; res.push(out[d]) }
    }
    return res.slice(0, 12)
})()
