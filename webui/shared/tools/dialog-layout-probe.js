/*
 * 在页面里跑的那一段：量有没有东西被容器裁掉、或者啃进了容器的留白。
 * 用 ES5 写法 —— 它是被塞进 Runtime.evaluate 的，没有构建这一步。
 *
 * 和 mobile-audit-probe.js 的分工：那一份拿**视口**当尺子，量的是「有没有被顶出屏幕」；
 * 这一份拿**最近一个会裁剪的祖先**当尺子。这类毛病全是后一种 ——
 * 容器自己 overflow: hidden，被切掉的按钮从来不会跑到视口外面去，
 * 所以视口那把尺子一次都没响过，而人眼看到的就是「按钮只剩半截」。
 *
 * ── 为什么不只量弹窗 ──
 *
 * 原来这份只扫 .v-overlay--active 里的东西。于是「登录设置页右边的开关被切掉 4px」
 * 这种**页面上**的裁剪，十八轮体检一次都没量过 —— 不是量过了没响，是压根没进过取景框。
 * 现在弹窗和页面（.v-main）一起扫：同一把尺子，量到哪算哪。
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

    /*
     * 看不看得见，要连着祖先一起看。
     *
     * 只看元素自己的话，装在 opacity: 0 的容器里的按钮会被当成「看得见」——
     * 海报卡右下角那排操作键就是这样：静止时整条 .acts 是
     * `opacity: 0; transform: translateY(8px)`，被推到贴着卡片下沿；
     * 鼠标移上去才淡入并归位到 bottom: 8px，真正露面时离边有 8px。
     * 拿它静止时那个「藏起来的位置」去量，量出来全是「贴着裁剪边」——
     * 九款海报流一起报，一条真的都没有。
     */
    function visible(el) {
        for (var n = el; n && n.nodeType === 1; n = n.parentElement) {
            var s = getComputedStyle(n)
            if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false
        }
        var r = el.getBoundingClientRect()
        return r.width > 0 && r.height > 0
    }

    /*
     * 最近一个会裁剪的祖先。
     *
     * 走到 html / body 就算没有 —— 那两个是**视口**，不是「容器」。
     * 这一份的立身之本就是「拿容器当尺子，不拿视口当尺子」（视口那把在 mobile-audit
     * 手里）。不停在这儿的话，收起来的侧边抽屉（translate 到屏幕外 248px）、
     * 钉在顶上的任务栏按钮，全会被算成「被 html 切掉了」—— 群晖那款一翻一大片，
     * 一条真的都没有。
     */
    function stopAtViewport(p) {
        return p && p !== document.documentElement && p !== document.body ? p : null
    }

    function clipperX(el) {
        for (var p = el.parentElement; p; p = p.parentElement) {
            if (p === document.documentElement || p === document.body) return null
            if (getComputedStyle(p).overflowX !== 'visible') return p
        }
        return null
    }

    var out = []
    /*
     * 取景框 = 所有开着的弹窗 + 页面正文。
     *
     * 页面正文优先取 .v-main。但**有三款根本没有 .v-main**：群晖、win98、麦金塔
     * 自己画窗框（任务栏 / 菜单栏 / 带侧栏的窗），页面直接挂在自己的容器里。
     * 只认 .v-main 的话这三款一个元素都扫不到 —— 而「扫到 0 个」和「扫过了没问题」
     * 长得一模一样，正是上一版把整页漏掉的那种假绿。
     * 所以退回 body：反正顶栏/侧栏那些 fixed 的元素第一条规则就跳过了。
     */
    var roots = [].slice.call(document.querySelectorAll('.v-overlay--active .v-overlay__content'))
    roots.push(document.querySelector('.v-main') || document.body)

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
            /*
             * 会横滚的容器不报。
             *
             * 自己声明了 overflow-x: auto 的容器是在说「我这儿的内容本来就要横着拖」——
             * 星期条、麦金塔那排标签（注释里写着「五个标签在 360px 上排不下，横着滚」）、
             * 宽表格，九款里有十来处，全是设计如此。滚得到 = 看得见 = 不是被挡住。
             *
             * 原来这儿还有一类「要横滚才看得全」。它在只扫弹窗的时候一直是绿的 ——
             * 弹窗里没有横滑条。改成连页面一起扫之后，它把上面那十来处designed 的
             * 横滑条全报了一遍。试过拿「溢出多少」当筛子（意外多出来的只有十来像素，
             * 设计如此的动辄上百），可麦金塔那排在 390px 上正好只溢出 23px ——
             * 分不开。索性去掉：它本来也没有独立的价值，
             * 当初逮住 v-row 那个 bug 的是下面「左边被切掉」那一条 ——
             * 伸到内容原点左边的那一截是**滚也滚不出来**的，那才是真的看不见。
             */
            var kind = null
            if (under > 1) kind = '左边被切掉（滚也滚不出来）'
            else if (over > 1 && !scrolls) kind = '右边被切掉'
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

    /*
     * ── 贴着裁剪边的控件 ──
     *
     * 上面两条量的是「已经被切掉了多少」。但有一整类毛病它们量不到：
     * 控件**静止时**严丝合缝地贴着裁剪边，只在 hover / focus 的那一下才越出去。
     *
     *   · 添加订阅那颗「浏览 XX 番剧列表」，hover 抬 1px —— 静止时上方余量正好 0，
     *     抬起来的那一下被削掉，人看到的是「动效坏了」；而探针量的是静止态，全绿。
     *   · 登录设置里靠右的开关，静止时右边余量也是 0，涟漪一亮就缺一块。
     *
     * 所以尺子换成「控件离裁剪边还有几个像素」：贴着（≤2px）就算一条引线，
     * 迟早会在某个状态下被切。修法不是挪那颗控件，是给容器补一圈 padding
     * （见 spacing.css 里 .v-tabs-window 那条）。
     *
     * 只认摸得着的控件，不认排版容器：卡片为了圆角本来就要 overflow: hidden，
     * 里面铺满的封面图贴边是设计如此，不是毛病。
     * 会滚的那条边也不算：滚动容器的内容本来就该顶到边上去。
     */
    var LIVE = '.v-btn, .v-field, .v-selection-control, .v-switch, button, a[href], [role="button"]'
    for (var t = 0; t < roots.length; t++) {
        var lives = roots[t].querySelectorAll(LIVE)
        for (var t2 = 0; t2 < lives.length; t2++) {
            var lv = lives[t2]
            if (!visible(lv) || DECOR.test(cls(lv))) continue
            var ls = getComputedStyle(lv)
            if (ls.position === 'fixed') continue
            /* 嵌在别的控件里的（输入框 append 槽里的小按钮）由外层那个代表 */
            if (lv.parentElement && lv.parentElement.closest('.v-field, .v-btn')) continue

            /* 最近一个会裁剪的祖先 */
            var box2 = null
            for (var q = lv.parentElement; q; q = q.parentElement) {
                if (!stopAtViewport(q)) break
                var qs = getComputedStyle(q)
                if (qs.overflowX !== 'visible' || qs.overflowY !== 'visible') { box2 = q; break }
            }
            if (!box2 || box2.closest(SCROLLER)) continue

            var b2s = getComputedStyle(box2)
            var b2r = box2.getBoundingClientRect()
            var lr = lv.getBoundingClientRect()
            var scrollX = b2s.overflowX === 'auto' || b2s.overflowX === 'scroll'
            var scrollY = b2s.overflowY === 'auto' || b2s.overflowY === 'scroll'
            var bl = b2r.left + box2.clientLeft, bt = b2r.top + box2.clientTop

            /*
             * 容器只比控件大一点点的，那它就是这颗控件自己的外框，不是「裁剪边」。
             *
             * 分段按钮（v-btn-group）为了两头的圆角要 overflow: hidden，里面的按钮
             * 本来就该填满它；输入框的 v-field、图标按钮的外壳也都是这个形状。
             * 不排掉的话，每一颗分段按钮、每一个输入框都会报一条 —— 全是设计如此。
             * 留 8px 的判据：真正的裁剪容器（v-tabs-window、卡片正文）总比里面的
             * 单个控件宽出一大截。
             */
            var roomX = box2.clientWidth - lr.width, roomY = box2.clientHeight - lr.height
            var sides = []
            if (!scrollX && roomX > 8 && Math.round(lr.left - bl) <= 2) sides.push('左')
            if (!scrollX && roomX > 8 && Math.round(bl + box2.clientWidth - lr.right) <= 2) sides.push('右')
            if (!scrollY && roomY > 8 && Math.round(lr.top - bt) <= 2) sides.push('上')
            if (!scrollY && roomY > 8 && Math.round(bt + box2.clientHeight - lr.bottom) <= 2) sides.push('下')
            if (!sides.length) continue

            /*
             * 自己什么都不画的控件不算。
             *
             * 番剧浏览器里那颗 .tile-head 是铺满整张卡片的点击区：背景 none、没有边框，
             * 卡片自己的圆角 + overflow: hidden 就是它的外框 —— 设计如此。
             * 它被切掉的只有浏览器默认的焦点圈，不是「按钮缺了一块」。
             * 而真要拦的那颗（.browse）自己有底色也有边框：那是一个看得见的盒子，
             * 被削掉一角是肉眼可见的。以「它自己画不画东西」分界，
             * 比往下面记一张类名清单可靠 —— 清单会跟着改名漂掉。
             */
            var paints = ls.backgroundColor !== 'rgba(0, 0, 0, 0)' && ls.backgroundColor !== 'transparent'
            if (!paints && parseFloat(ls.borderTopWidth) < 0.5 && ls.boxShadow === 'none') continue

            out.push({
                k: '贴着裁剪边（' + sides.join('') + '），hover/focus 一动就被切',
                px: 0,
                el: desc(lv),
                box: desc(box2) + '（padding=' + Math.round(parseFloat(b2s.paddingTop) || 0) + ' '
                    + Math.round(parseFloat(b2s.paddingRight) || 0) + ' '
                    + Math.round(parseFloat(b2s.paddingBottom) || 0) + ' '
                    + Math.round(parseFloat(b2s.paddingLeft) || 0) + '，overflow=' + b2s.overflow + '）',
            })
        }
    }

    /*
     * ── 两颗按钮挨在一起，中间没有缝 ──
     *
     * 上面三条量的都是「控件和容器」的关系。还有一类是「控件和控件」的：
     * 一排按钮之间只留 4px，按钮自己又是 text / tonal 这种没有边框的样式，
     * 涟漪和 hover 底色是铺满整个按钮盒子的 —— 两颗一挨，底色连成一片，
     * 看上去就是一根长条，人说的「按钮没有边距」就是这个。
     *
     * 判据 8px：M3 的最小档，也是 v-card-actions 自带的那个 gap。
     * 拼在一起才是设计的（分段按钮、分页器、输入框里的附属按钮）整组排掉 ——
     * 那些有边框或分隔线，本来就该无缝。
     */
    var JOINED = '.v-btn-group, .v-btn-toggle, .v-pagination, .v-slide-group, .v-field, .v-tabs'
    for (var g1 = 0; g1 < roots.length; g1++) {
        var all = roots[g1].querySelectorAll('.v-btn')
        var row = []
        for (var g2 = 0; g2 < all.length; g2++) {
            var bt = all[g2]
            if (!visible(bt) || DECOR.test(cls(bt))) continue
            if (bt.closest(JOINED)) continue
            row.push({el: bt, r: bt.getBoundingClientRect()})
        }
        for (var g3 = 0; g3 < row.length; g3++) {
            var A = row[g3], near = null, gap = 1e9
            for (var g4 = 0; g4 < row.length; g4++) {
                if (g4 === g3) continue
                var B = row[g4]
                /* 同一个父级、同一行、B 在 A 右边 —— 三条都要，否则比的是不相干的两颗 */
                if (A.el.parentElement !== B.el.parentElement) continue
                if (B.r.left < A.r.right - 1) continue
                var ov = Math.min(A.r.bottom, B.r.bottom) - Math.max(A.r.top, B.r.top)
                if (ov < Math.min(A.r.height, B.r.height) * 0.5) continue
                var d = B.r.left - A.r.right
                if (d < gap) { gap = d; near = B }
            }
            if (!near || gap >= 8) continue
            out.push({
                k: '两颗按钮之间只有 ' + Math.round(gap) + 'px（至少要 8）',
                px: Math.round(8 - gap),
                el: desc(A.el) + ' ↔ ' + desc(near.el),
                box: desc(A.el.parentElement),
            })
        }
    }

    var seen = {}, res = []
    for (var d = 0; d < out.length; d++) {
        var key = JSON.stringify(out[d])
        if (!seen[key]) { seen[key] = 1; res.push(out[d]) }
    }
    return res.slice(0, 12)
})()
