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
        odometer: P('<path fill="currentColor" d="M512 896a384 384 0 1 0 0-768 384 384 0 0 0 0 768m0 64a448 448 0 1 1 0-896 448 448 0 0 1 0 896"/><path fill="currentColor" d="M192 512a320 320 0 1 1 640 0 32 32 0 1 1-64 0 256 256 0 1 0-512 0 32 32 0 0 1-64 0"/><path fill="currentColor" d="M570.432 627.84A96 96 0 1 1 509.568 608l60.992-187.776A32 32 0 1 1 631.424 440l-60.992 187.776zM502.08 734.464a32 32 0 1 0 19.84-60.928 32 32 0 0 0-19.84 60.928"/>'),
        copy: P('<path fill="currentColor" d="M128 320v576h576V320zm-32-64h640a32 32 0 0 1 32 32v640a32 32 0 0 1-32 32H96a32 32 0 0 1-32-32V288a32 32 0 0 1 32-32M960 96v704a32 32 0 0 1-32 32h-96v-64h64V128H384v64h-64V96a32 32 0 0 1 32-32h576a32 32 0 0 1 32 32M256 672h320v64H256zm0-192h320v64H256z"/>'),
        more: P('<path fill="currentColor" d="M176 416a112 112 0 1 1 0 224 112 112 0 0 1 0-224m336 0a112 112 0 1 1 0 224 112 112 0 0 1 0-224m336 0a112 112 0 1 1 0 224 112 112 0 0 1 0-224"/>'),
        folderAdd: P('<path fill="currentColor" d="M128 192v640h768V320H485.76L357.504 192zm-32-64h287.872l128.384 128H928a32 32 0 0 1 32 32v576a32 32 0 0 1-32 32H96a32 32 0 0 1-32-32V160a32 32 0 0 1 32-32m384 416V416h64v128h128v64H544v128h-64V608H352v-64z"/>'),
        back: P('<path fill="currentColor" d="M224 480h640a32 32 0 1 1 0 64H224a32 32 0 0 1 0-64"/><path fill="currentColor" d="m237.248 512 265.408 265.344a32 32 0 0 1-45.312 45.312l-288-288a32 32 0 0 1 0-45.312l288-288a32 32 0 1 1 45.312 45.312z"/>'),
        power: P('<path fill="currentColor" d="M352 159.872V230.4a352 352 0 1 0 320 0v-70.528A416.128 416.128 0 0 1 512 960a416 416 0 0 1-160-800.128"/><path fill="currentColor" d="M512 64q32 0 32 32v320q0 32-32 32t-32-32V96q0-32 32-32"/>'),
        top: P('<path fill="currentColor" d="M572.235 205.282v600.365a30.118 30.118 0 1 1-60.235 0V205.282L292.382 438.633a28.913 28.913 0 0 1-42.646 0 33.43 33.43 0 0 1 0-45.236l271.058-288.045a28.913 28.913 0 0 1 42.647 0L834.5 393.397a33.43 33.43 0 0 1 0 45.176 28.913 28.913 0 0 1-42.647 0l-219.618-233.23z"/>'),
        /* 下面几个上游用的是 @vicons/fa，viewBox 不同，这里按同样语义画等价图形 */
        sun: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10m0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6m0-8a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0V2a1 1 0 0 1 1-1m0 18a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0v-2a1 1 0 0 1 1-1M1 12a1 1 0 0 1 1-1h2a1 1 0 1 1 0 2H2a1 1 0 0 1-1-1m19 0a1 1 0 0 1 1-1h2a1 1 0 1 1 0 2h-2a1 1 0 0 1-1-1M4.22 4.22a1 1 0 0 1 1.41 0l1.42 1.42a1 1 0 0 1-1.42 1.41L4.22 5.64a1 1 0 0 1 0-1.42m12.73 12.73a1 1 0 0 1 1.41 0l1.42 1.41a1 1 0 0 1-1.42 1.42l-1.41-1.42a1 1 0 0 1 0-1.41M19.78 4.22a1 1 0 0 1 0 1.42l-1.42 1.41a1 1 0 0 1-1.41-1.41l1.41-1.42a1 1 0 0 1 1.42 0M7.05 16.95a1 1 0 0 1 0 1.41l-1.42 1.42a1 1 0 0 1-1.41-1.42l1.41-1.41a1 1 0 0 1 1.42 0"/></svg>',
        js: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M3 3h18v18H3zm10.7 12.3c.4.7 1 1.2 2 1.2.8 0 1.4-.4 1.4-1 0-.7-.6-1-1.5-1.4l-.5-.2c-1.5-.6-2.5-1.4-2.5-3 0-1.5 1.2-2.6 3-2.6 1.3 0 2.2.4 2.8 1.6l-1.5 1c-.3-.6-.7-.8-1.3-.8s-1 .4-1 .8c0 .6.4.9 1.2 1.2l.5.2c1.7.8 2.7 1.5 2.7 3.2 0 1.8-1.4 2.8-3.3 2.8-1.9 0-3.1-.9-3.7-2zM7.5 15.5c.3.6.6 1 1.3 1 .6 0 1-.3 1-1.3V8.7h1.9v6.6c0 2-1.2 2.9-2.9 2.9-1.6 0-2.5-.8-3-1.8z"/></svg>',
        css: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M3 2h18l-1.6 18L12 22l-7.4-2zm13.9 4H7.1l.2 2.4h9.4l-.6 6.9-4.1 1.1-4.1-1.1-.3-3h2l.1 1.5 2.3.6 2.3-.6.2-2.6H7.6L7 6.9z"/></svg>',
        github: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M12 .5a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.2.8-.5v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.1.1 1.7 1.2 1.7 1.2 1 1.8 2.7 1.3 3.4 1 .1-.7.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.8 0-1.3.5-2.3 1.2-3.2-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.9 1.2 1.9 1.2 3.2 0 4.5-2.7 5.5-5.3 5.8.4.4.8 1.1.8 2.2v3.3c0 .3.2.6.8.5A11.5 11.5 0 0 0 12 .5"/></svg>',
        book: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M4 2h13a3 3 0 0 1 3 3v16a1 1 0 0 1-1 1H6a2 2 0 0 1 0-4h13v-2H6a4 4 0 0 0-2 .5V2m2 2v11.1c.3-.1.7-.1 1-.1h11V5a1 1 0 0 0-1-1z"/></svg>',
        telegram: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="m21.7 3.3-19 7.3c-.9.3-.9 1.5 0 1.8l4.7 1.6 1.8 5.6c.2.7 1.1.9 1.6.3l2.5-2.6 4.7 3.4c.6.4 1.4.1 1.6-.6l3.2-15.6c.2-.9-.7-1.6-1.5-1.2zM8.9 14.2l-.6 3.4-1.2-3.8 9.6-6.1z"/></svg>',
        mug: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M3 4h14v3h2a3 3 0 0 1 0 6h-2v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4zm14 5v2h2a1 1 0 0 0 0-2zM2 21h16v2H2z"/></svg>',
        bottom: P('<path fill="currentColor" d="M544 805.888V168a32 32 0 1 0-64 0v637.888L246.656 557.952a30.72 30.72 0 0 0-45.312 0 35.52 35.52 0 0 0 0 48.064l288 306.048a30.72 30.72 0 0 0 45.312 0l288-306.048a35.52 35.52 0 0 0 0-48 30.72 30.72 0 0 0-45.312 0L544 805.824z"/>'),
        menu: P('<path fill="currentColor" d="M160 448a32 32 0 0 1-32-32V160.064a32 32 0 0 1 32-32h256a32 32 0 0 1 32 32V416a32 32 0 0 1-32 32zm448 0a32 32 0 0 1-32-32V160.064a32 32 0 0 1 32-32h255.936a32 32 0 0 1 32 32V416a32 32 0 0 1-32 32zM160 896a32 32 0 0 1-32-32V608a32 32 0 0 1 32-32h256a32 32 0 0 1 32 32v256a32 32 0 0 1-32 32zm448 0a32 32 0 0 1-32-32V608a32 32 0 0 1 32-32h255.936a32 32 0 0 1 32 32v256a32 32 0 0 1-32 32z"/>'),
        editPen: P('<path fill="currentColor" d="m199.04 672.64 193.984 112 224-387.968-193.92-112-224 388.032zm-23.872 60.16 32.896 148.288 144.896-45.696zM455.04 229.248l193.92 112 56.704-98.112-193.984-112zM104.32 708.8l384-665.024 304.768 175.936L409.152 884.8h.064l-248.448 78.336zm384 254.272v-64h448v64z"/>'),
        documentAdd: P('<path fill="currentColor" d="M832 384H576V128H192v768h640zm-26.496-64L640 154.496V320zM160 64h480l256 256v608a32 32 0 0 1-32 32H160a32 32 0 0 1-32-32V96a32 32 0 0 1 32-32m320 512V448h64v128h128v64H544v128h-64V640H352v-64z"/>'),
        grid: P('<path fill="currentColor" d="M640 384v256H384V384zm64 0h192v256H704zm-64 512H384V704h256zm64 0V704h192v192zm-64-768v192H384V128zm64 0h192v192H704zM320 384v256H128V384zm0 512H128V704h192zm0-768v192H128V128z"/>'),
        remove: P('<path fill="currentColor" d="M352 480h320a32 32 0 1 1 0 64H352a32 32 0 0 1 0-64"/><path fill="currentColor" d="M512 896a384 384 0 1 0 0-768 384 384 0 0 0 0 768m0 64a448 448 0 1 1 0-896 448 448 0 0 1 0 896"/>'),
        warningFilled: P('<path fill="currentColor" d="M512 64a448 448 0 1 1 0 896 448 448 0 0 1 0-896m0 192a58.43 58.43 0 0 0-58.24 63.744l23.36 256.384a35.072 35.072 0 0 0 69.76 0l23.296-256.384A58.43 58.43 0 0 0 512 256m0 512a51.2 51.2 0 1 0 0-102.4 51.2 51.2 0 0 0 0 102.4"/>'),
        successFilled: P('<path fill="currentColor" d="M512 64a448 448 0 1 1 0 896 448 448 0 0 1 0-896m-55.808 536.384-99.52-99.584a38.4 38.4 0 1 0-54.336 54.336l126.72 126.72a38.27 38.27 0 0 0 54.336 0l262.4-262.464a38.4 38.4 0 1 0-54.272-54.336z"/>'),
        infoFilled: P('<path fill="currentColor" d="M512 64a448 448 0 1 1 0 896.064A448 448 0 0 1 512 64m67.2 275.072c33.28 0 60.288-23.104 60.288-57.344s-27.072-57.344-60.288-57.344c-33.28 0-60.16 23.104-60.16 57.344s26.88 57.344 60.16 57.344M590.912 699.2c0-6.848 2.368-24.64 1.024-34.752l-52.608 60.544c-10.88 11.456-24.512 19.392-30.912 17.28a12.99 12.99 0 0 1-8.256-14.72l87.68-276.992c7.168-35.136-12.544-67.2-54.336-71.296-44.096 0-108.992 44.736-148.48 101.504 0 6.784-1.28 23.68.064 33.792l52.544-60.608c10.88-11.328 23.552-19.328 29.952-17.152a12.8 12.8 0 0 1 7.808 16.128L388.48 728.576c-10.048 32.256 8.96 63.872 55.04 71.04 67.84 0 107.904-43.648 147.456-100.416z"/>'),
        calendar: P('<path fill="currentColor" d="M128 384v512h768V192H768v32a32 0 1 1-64 0v-32H320v32a32 32 0 0 1-64 0v-32H128v128h768v64zm192-256h384V96a32 32 0 1 1 64 0v32h160a32 32 0 0 1 32 32v768a32 32 0 0 1-32 32H96a32 32 0 0 1-32-32V160a32 32 0 0 1 32-32h160V96a32 32 0 0 1 64 0zm-32 384h64a32 32 0 0 1 0 64h-64a32 32 0 0 1 0-64m0 192h64a32 32 0 1 1 0 64h-64a32 32 0 1 1 0-64m192-192h64a32 32 0 0 1 0 64h-64a32 32 0 0 1 0-64m0 192h64a32 32 0 1 1 0 64h-64a32 32 0 1 1 0-64m192-192h64a32 32 0 1 1 0 64h-64a32 32 0 1 1 0-64m0 192h64a32 32 0 1 1 0 64h-64a32 32 0 1 1 0-64"/>'),
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
        /* 上游的密码框都带 show-password，右边那只眼睛不能少 */
        if (o.type === 'password' && !o.suffix) o = Object.assign({}, o, {suffix: 'view'})
        return '<div class="el-input' + (o.prefix ? ' el-input--prefix' : '') + (o.suffix ? ' el-input--suffix' : '') +
            (o.full ? ' full-width' : '') + '" style="' + (o.style || '') + '"><div class="el-input__wrapper">' +
            (o.prefix ? '<span class="el-input__prefix"><span class="el-input__prefix-inner">' + icon(o.prefix) + '</span></span>' : '') +
            '<input class="el-input__inner" type="' + (o.type || 'text') + '" value="' + esc(v) + '" placeholder="' + esc(ph) + '"/>' +
            (o.suffix ? '<span class="el-input__suffix"><span class="el-input__suffix-inner">' + icon(o.suffix) + '</span></span>' : '') +
            '</div></div>'
    }

    const area = (v, ph, rows) =>
        '<div class="el-textarea"><textarea class="el-textarea__inner" rows="' + (rows || 3) + '" placeholder="' + esc(ph) + '">' + esc(v) + '</textarea></div>'

    /* 上游好几处 el-input-number 带 #suffix 插槽（分钟 / 秒 / 天 / px / KiB/s），一并支持 */
    const num = (v, w, suffix) =>
        '<div class="el-input-number" style="width:' + (w || 140) + 'px">' +
        '<span role="button" class="el-input-number__decrease" data-step="-1">' + icon('minus') + '</span>' +
        '<span role="button" class="el-input-number__increase" data-step="1">' + icon('plus') + '</span>' +
        '<div class="el-input' + (suffix ? ' el-input--suffix' : '') + '"><div class="el-input__wrapper">' +
        '<input class="el-input__inner" value="' + esc(v) + '"/>' +
        (suffix ? '<span class="el-input__suffix"><span class="el-input__suffix-inner">' + esc(suffix) + '</span></span>' : '') +
        '</div></div></div>'

    /* el-text size="small"：上游几乎每个开关下面都挂一条说明，缺了整页观感就不对 */
    const hint = html => '<div><span class="el-text el-text--small mx-1">' + html + '</span></div>'
    const cb = (label, on, danger) =>
        '<label class="el-checkbox' + (on ? ' is-checked' : '') + (danger ? ' el-checkbox-danger' : '') +
        '"><span class="el-checkbox__input' + (on ? ' is-checked' : '') + '"><span class="el-checkbox__inner"></span></span>' +
        '<span class="el-checkbox__label">' + esc(label) + '</span></label>'
    const lnk = (text, href, type) =>
        '<a class="el-link el-link--' + (type || 'primary') + '" href="' + esc(href || '#') + '" target="_blank">' +
        '<span class="el-link__inner">' + esc(text) + '</span></a>'

    /* el-radio（圆点）——和 radios() 的 el-radio-button（分段按钮）不是一个东西 */
    const radioRow = (items, active) =>
        '<div class="el-radio-group">' + items.map((t, i) =>
            '<label class="el-radio' + (i === active ? ' is-checked' : '') + '">' +
            '<span class="el-radio__input' + (i === active ? ' is-checked' : '') + '"><span class="el-radio__inner"></span></span>' +
            '<span class="el-radio__label">' + esc(t) + '</span></label>').join('') + '</div>'

    /* public/icon.svg：登录页和「关于」用的是同一个 */
    const LOGO = n => '<svg width="' + n + '" height="' + n + '" viewBox="0 0 24 24" fill="none" style="opacity:.9">' +
        '<circle cx="6" cy="18" r="2.2" fill="currentColor"/>' +
        '<path d="M4 11.5a8.5 8.5 0 0 1 8.5 8.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>' +
        '<path d="M4 5a15 15 0 0 1 15 15" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>'

    const sw = on => '<div class="el-switch' + (on ? ' is-checked' : '') + '"><span class="el-switch__core"><div class="el-switch__action"></div></span></div>'

    const sel = (value, options, w, placeholder) => {
        const k = 's' + (++selId)
        SELECTS[k] = options
        return '<div class="el-select" data-select="' + k + '" style="width:' + (w === 'full' ? '100%' : (w || 160) + 'px') + '">' +
            '<div class="el-select__wrapper"><div class="el-select__selection">' +
            '<div class="el-select__selected-item el-select__placeholder' + (value ? '' : ' is-transparent') + '"><span data-value>' + esc(value || placeholder || '请选择') + '</span></div>' +
            '</div><div class="el-select__suffix">' + '<i class="el-icon el-select__caret el-select__icon" data-icon="caret2"></i>' + '</div></div></div>'
    }

    /* config/Exclude.vue：可关闭的标签 + 加号 + 清空，底部一行小字 */
    const excludeEditor = (tags, importable) =>
        '<div class="full-width"><div style="display:flex;flex-wrap:wrap;align-items:center">' +
        (tags.length ? tags.map(t =>
            '<span class="el-tag el-tag--primary el-tag--light" style="margin:0 4px 4px 0"><span class="el-tag__content">' +
            '<span class="el-text el-text--small" style="max-width:300px;color:var(--el-color-primary)">' + esc(t) + '</span>' +
            '</span><i class="el-tag__close el-icon" data-icon="close"></i></span>'
        ).join('') : '<span class="el-tag el-tag--info el-tag--light" style="margin:0 4px 4px 0"><span class="el-tag__content">无</span></span>') +
        btn('', {bg: true, text: true, icon: 'plus'}) +
        (tags.length ? btn('', {bg: true, text: true, type: 'danger', icon: 'del'}) : '') +
        '</div><div class="flex" style="margin-top:4px;width:100%;justify-content:space-between">' +
        (importable ? btn('导入全局排除', {bg: true, text: true, icon: 'download'}) : '<span></span>') +
        '<span class="el-text el-text--small mx-1">支持&nbsp;' +
        lnk('正则表达式', 'https://www.runoob.com/regexp/regexp-syntax.html') + '</span></div></div>'

    /* config/CustomTags.vue：可关闭的标签 + 小加号，没有底部说明 */
    const tagsEditor = tags =>
        '<div class="full-width" style="display:flex;flex-wrap:wrap;align-items:center;margin-top:4px">' +
        (tags.length ? tags : []).map(t =>
            '<span class="el-tag el-tag--primary el-tag--light" style="margin:4px"><span class="el-tag__content">' + esc(t) +
            '</span><i class="el-tag__close el-icon" data-icon="close"></i></span>').join('') +
        (tags.length ? '' : '<span class="el-tag el-tag--info el-tag--light" style="margin:4px"><span class="el-tag__content">无</span></span>') +
        btn('', {bg: true, text: true, icon: 'plus'}) + '</div>'

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

    /* 上游这些 el-alert 都带 show-icon，少了图标一眼就不对 */
    const alertBox = (text, type) => {
        type = type || 'warning'
        const ic = {warning: 'warningFilled', success: 'successFilled', info: 'infoFilled', error: 'circleClose'}[type]
        return '<div class="el-alert el-alert--' + type + ' is-light">' +
            '<i class="el-icon el-alert__icon is-big" data-icon="' + ic + '"></i>' +
            '<div class="el-alert__content"><span class="el-alert__title is-bold">' + text + '</span></div></div>'
    }

    const btn = (text, o) => {
        o = o || {}
        return '<button type="button" class="el-button' + (o.type ? ' el-button--' + o.type : '') +
            (o.text ? ' is-text' : '') + (o.bg ? ' is-has-bg' : '') + '"' + (o.act ? ' data-act="' + o.act + '"' : '') + '>' +
            '<span>' + (o.icon ? '<i class="el-icon' + (text ? ' el-icon--left' : '') + '" data-icon="' + o.icon + '"></i>' + (text ? ' ' : '') : '') +
            esc(text) + '</span></button>'
    }

    const item = (label, content, lw) =>
        '<div class="el-form-item el-form-item--label-right">' +
        '<label class="el-form-item__label" style="width:' + (lw || 110) + 'px">' + esc(label) + '</label>' +
        '<div class="el-form-item__content">' + content + '</div></div>'

    const form = (rows, lw) =>
        '<form class="el-form el-form--default el-form--label-right full-width" onsubmit="return false">' +
        rows.map(r => Array.isArray(r) ? item(r[0], r[1], lw) : r).join('') + '</form>'

    /* accordion=true 时同一时刻只展开一个（对应上游 Basic.vue 的 <el-collapse accordion>） */
    const collapse = (items, accordion) =>
        '<div class="el-collapse el-collapse-icon-position-right"' + (accordion ? ' data-accordion="1"' : '') + '>' + items.map((it, i) =>
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
        /* tabs-center 是上游 style.css 里的类，把标签栏居中（修改订阅用） */
        return '<div class="el-tabs el-tabs--' + dir + (o.center ? ' tabs-center' : '') + '" data-tabs="' + id + '"' +
            (o.margin ? ' style="margin:0 15px"' : '') + '>' +
            '<div class="el-tabs__header' + (o.vertical ? ' el-tabs__header-vertical' : '') + ' is-' + dir + '">' +
            '<div class="el-tabs__nav-wrap is-' + dir + '"><div class="el-tabs__nav-scroll"><div class="el-tabs__nav is-' + dir + '">' +
            '<div class="el-tabs__active-bar is-' + dir + '"></div>' +
            items.map((t, i) => '<div class="el-tabs__item is-' + dir + (i === 0 ? ' is-active' : '') + '" data-tab="' + i + '">' + esc(t.title) + '</div>').join('') +
            '</div></div></div></div>' +
            '<div class="el-tabs__content">' +
            items.map((t, i) => '<div class="el-tab-pane" data-pane="' + i + '"' + (i === 0 ? '' : ' style="display:none"') + '>' + t.pane + '</div>').join('') +
            '</div></div>'
    }

    const dialog = (id, title, body, footer, width, cls) =>
        '<div class="el-overlay" id="' + id + '" style="display:none"><div class="el-overlay-dialog">' +
        '<div class="el-dialog is-align-center el-dialog--center ' + (cls || '') + '" style="width:' + width + ';max-width:calc(100vw - 24px)">' +
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
        '<div class="list-card-image-container"><img src="' + esc(a.cover) + '" alt="' + esc(a.t) + '" class="list-card-image" data-act="cover" loading="lazy" referrerpolicy="no-referrer"></div>' +
        '<div class="list-card-info"><div class="list-card-info-inner">' +
        '<div class="flex"><span class="el-text is-truncated is-line-clamp list-card-title" data-act="bgm" style="-webkit-line-clamp:1" title="' + esc(a.t) + '">' + esc(a.t) + '</span></div>' +
        '<div class="list-card-score-container"><h4 class="list-card-score" data-act="rate">' + esc(a.score) + '</h4></div>' +
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
        '<button type="button" class="el-button is-text is-has-bg list-card-playlist" data-act="playlist"><span class=""><i class="el-icon" data-icon="files"></i></span></button>' +
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

    /* el-scrollbar：上游好几处用固定像素高度，这里照搬 */
    const scroll = (h, html) =>
        '<div class="el-scrollbar" style="height:' + h + 'px"><div class="el-scrollbar__wrap" style="height:' + h + 'px;overflow:auto">' +
        '<div class="el-scrollbar__view">' + html + '</div></div></div>'

    const empty = desc =>
        '<div class="el-empty" style="padding:40px 0"><div class="el-empty__description"><p>' + esc(desc) + '</p></div></div>'

    /* el-date-picker 的静态形态：带日历前缀图标的只读输入框 */
    const datePicker = (v, w) =>
        '<div class="el-input el-input--prefix el-date-editor el-date-editor--date" style="width:' + (w || 150) + 'px">' +
        '<div class="el-input__wrapper"><span class="el-input__prefix"><span class="el-input__prefix-inner">' + icon('calendar') + '</span></span>' +
        '<input class="el-input__inner" readonly value="' + esc(v) + '" placeholder="选择日期"/></div></div>'

    /* 上游 Ani.vue 的 .form-item-flex：这几个字段是右对齐的，不是贴着标签 */
    const flexEnd = html => '<div class="flex full-width" style="justify-content:end">' + html + '</div>'

    /* 下拉菜单注册表：act 名 -> 菜单项 [{t 文案, icon, type 文字颜色, dlg 打开的弹窗, divided 上分割线}] */
    const DROPDOWNS = {
        add: [{t: '添加订阅', dlg: 'dlg-add'}, {t: '添加合集'}],
        'manage-more': [
            {t: '更新总集数', icon: 'refreshRight'},
            {t: '更新总集数 [F]', icon: 'refresh', type: 'warning'},
            {t: '刮削', icon: 'refreshRight', divided: true},
            {t: '刮削 [F]', icon: 'refresh', type: 'warning'},
            {t: '启用', icon: 'circleCheck', type: 'primary', divided: true},
            {t: '禁用', icon: 'circleClose', type: 'warning'},
            {t: '导入', icon: 'download', divided: true},
            {t: '导出', icon: 'upload'},
            {t: '删除', icon: 'remove', type: 'danger', divided: true},
        ],
        'ani-more': [
            {t: '刷新', icon: 'refreshRight'},
            {t: '刮削', icon: 'refreshRight'},
            {t: '刮削 [F]', icon: 'refresh', type: 'warning'},
        ],
        'notify-more': [
            {t: '编辑', icon: 'edit', type: 'primary'},
            {t: '删除', icon: 'del', type: 'danger'},
        ],
    }

    /* ---------- 下载（home/TorrentsInfos.vue） ---------- */
    const DL = DATA.slice(0, 6).map((a, i) => ({
        n: '[' + a.sub + '] ' + a.t.replace(/\s*\(\d{4}\)/, '') + ' S0' + a.s + 'E' + String((i + 3) * 2).padStart(2, '0') + ' [1080p]',
        p: [100, 64, 100, 12, 88, 100][i],
        tags: ['ani-rss', a.sub, 'MOVIEPILOT'].concat(i % 2 ? [] : ['RENAME', '下载完成', '已整理']),
        size: [512.40, 318.77, 462.74, 186.02, 733.51, 288.90][i].toFixed(2) + ' MiB',
        state: i % 2 ? 'downloading' : 'uploading',
    }))

    /* 排序按钮里跟着一个升/降序图标，是激活项才有（上游 sortType === item.value） */
    const downloadBody =
        '<div class="flex-center" style="margin-bottom:12px"><div class="el-radio-group">' +
        [['按名称排序', 1], ['按进度排序', 0]].map(([t, on]) =>
            '<label class="el-radio-button' + (on ? ' is-active' : '') + '"><span class="el-radio-button__inner">' +
            '<span class="flex-center">' + t + (on ? '<i class="el-icon el-icon--right" data-sort-arrow data-icon="top"></i>' : '') + '</span>' +
            '</span></label>').join('') + '</div></div>' +
        scroll(430, DL.map(d =>
            '<div class="el-card is-never-shadow" style="margin-bottom:4px"><div class="el-card__body">' +
            '<p style="margin:0">' + esc(d.n) + '</p>' +
            '<div class="el-progress el-progress--line"><div class="el-progress-bar">' +
            '<div class="el-progress-bar__outer"><div class="el-progress-bar__inner" style="width:' + d.p + '%"></div></div></div>' +
            '<div class="el-progress__text"><span>' + d.p + '%</span></div></div>' +
            '</div><div class="el-card__footer">' +
            '<div class="flex" style="justify-content:space-between;align-items:center;width:100%">' +
            '<div style="display:flex;flex-wrap:wrap;gap:4px">' + tagList(d.tags, 'info') + '</div>' +
            '<div style="display:flex;gap:4px;flex:none">' + tagList([d.size], 'success') + tagList([d.state], 'primary') + '</div>' +
            '</div></div></div>').join(''))

    /* ---------- 管理（home/Manage.vue，上游是 el-table 不是卡片列表） ---------- */
    const MANAGE_COLS = [
        {label: '', w: 55, sel: true},
        {label: '标题', w: 200},
        {label: '季', w: 50},
        {label: '字幕组', w: 100},
        {label: '状态', w: 80},
        {label: '进度', w: 100},
        {label: '类型', w: 100},
        {label: 'URL', w: 300},
    ]

    const manageRow = a => [
        '<label class="el-checkbox"><span class="el-checkbox__input"><span class="el-checkbox__inner"></span></span></label>',
        '<span class="el-text el-text--small is-line-clamp" style="-webkit-line-clamp:2">' + esc(a.t) + '</span>',
        String(a.s),
        '<span class="el-text el-text--small is-truncated">' + esc(a.sub) + '</span>',
        a.on ? tag('primary', '已启用') : tag('info', '未启用'),
        tag('warning', esc(a.ep)),
        tag('danger', a.ova ? 'ova' : 'tv'),
        '<span class="el-text el-text--small is-line-clamp" style="-webkit-line-clamp:2">https://mikanani.me/RSS/Bangumi?bangumiId=' + (3000 + a.t.length * 7) + '</span>',
    ]

    const manageTable = rows =>
        '<div class="el-table el-table--fit el-table--small el-table--striped el-table--border-none" style="width:100%">' +
        '<div class="el-table__inner-wrapper">' +
        '<div class="el-table__header-wrapper" style="overflow:hidden"><table class="el-table__header" style="table-layout:fixed"><colgroup>' +
        MANAGE_COLS.map(c => '<col style="width:' + c.w + 'px">').join('') + '</colgroup><thead><tr>' +
        MANAGE_COLS.map(c => '<th class="el-table__cell is-leaf"><div class="cell">' +
            (c.sel ? '<label class="el-checkbox"><span class="el-checkbox__input"><span class="el-checkbox__inner"></span></span></label>' : esc(c.label)) +
            '</div></th>').join('') + '</tr></thead></table></div>' +
        '<div class="el-table__body-wrapper"><div class="el-scrollbar"><div class="el-scrollbar__wrap" style="height:400px;overflow:auto">' +
        '<table class="el-table__body" style="table-layout:fixed"><colgroup>' +
        MANAGE_COLS.map(c => '<col style="width:' + c.w + 'px">').join('') + '</colgroup><tbody>' +
        rows.map((cells, i) => '<tr class="el-table__row' + (i % 2 ? ' el-table__row--striped' : '') + '">' +
            cells.map(c => '<td class="el-table__cell"><div class="cell">' + c + '</div></td>').join('') + '</tr>').join('') +
        '</tbody></table></div></div></div></div></div>'

    const manageBody =
        '<div class="flex" style="justify-content:space-between;align-items:center;margin-bottom:8px;gap:8px;flex-wrap:wrap">' +
        '<div class="auto-flex" style="display:flex;align-items:center">' +
        inp('', '搜索', {prefix: 'search', style: 'width:180px'}) +
        '<div class="spacer"></div>' + sel('', ['2026-07', '2026-04', '2026-01', '2025-10'], 130) +
        '<div class="spacer"></div>' + sel('全部', ['全部', '已启用', '未启用', '已完结', '连载中'], 130) +
        '</div>' +
        '<div>' + btn('', {text: true, bg: true, icon: 'more', act: 'manage-more'}) + '</div></div>' +
        manageTable(DATA.map(manageRow)) +
        '<div><p style="text-align:right;margin:8px 4px 0;font-size:var(--el-font-size-extra-small);color:var(--el-text-color-secondary)">共 ' +
        DATA.length + ' 项</p></div>'

    /* ---------- 日志（home/Logs.vue） ---------- */
    const LOGS = [
        ['INFO', 'RssUtil', '开始刷新全部订阅 (共 ' + DATA.length + ' 项)'],
        ['INFO', 'RssUtil', (DATA[0] || {}).t + ' 发现新集数 E07'],
        ['INFO', 'TorrentUtil', '已推送到下载器: qBittorrent'],
        ['DEBUG', 'TorrentUtil', 'torrent hash = 8f2a1c9e04b7… size = 512.40 MiB'],
        ['WARN', 'RssUtil', (DATA[1] || {}).t + ' RSS 超时，切换到备用 RSS'],
        ['INFO', 'ScrapeUtil', '刮削完成，已写入 tvshow.nfo / episode.nfo'],
        ['INFO', 'RenameUtil', '重命名: [桜都字幕组] S02E07.mkv -> S02E07.mkv'],
        ['ERROR', 'ScrapeUtil', 'TMDB 请求失败: 429 Too Many Requests，30s 后重试'],
        ['INFO', 'RssUtil', '刷新结束，新增 1 项，耗时 7.2s'],
    ]

    const logsBody =
        '<div class="header auto-flex" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">' +
        '<div class="el-checkbox-group">' + checks([['DEBUG', true], ['INFO', true], ['WARN', true], ['ERROR', true]]) + '</div>' +
        '<div style="display:flex;align-items:center">' +
        sel('', ['RssUtil', 'TorrentUtil', 'RenameUtil', 'ScrapeUtil', 'ConfigUtil'], 260, '类名') +
        '<div class="spacer"></div>' + btn('', {text: true, bg: true, icon: 'download'}) +
        '<div class="spacer"></div>' + btn('', {text: true, bg: true, icon: 'refresh'}) +
        '<div class="spacer"></div>' + btn('', {text: true, bg: true, icon: 'del'}) +
        '</div></div>' +
        '<div class="content">' + scroll(450,
            '<div style="min-height:400px">' + LOGS.map((l, i) =>
                '<span class="pv-logline pv-log-' + l[0] + '"><i>2026-08-02 21:04:' + String(11 + i).padStart(2, '0') + '</i>  ' +
                l[0].padEnd(5) + '  ' + l[1].padEnd(12) + '  ' + esc(l[2]) + '</span>').join('') + '</div>') +
        '</div>'

    /* ---------- 添加订阅（home/Add.vue） ---------- */
    /* 每个源一个 tab：RSS 文本域 → 右对齐的浏览按钮 → 两行小字说明，表单固定 260px 高 */
    const addPane = (src, ph, note2) =>
        '<form class="el-form el-form--default el-form--label-right full-width" style="height:260px" onsubmit="return false">' +
        item('RSS 地址', '<div class="full-width">' +
            '<div>' + area('', ph, 2) + '</div><br>' +
            '<div class="flex full-width" style="justify-content:end">' + btn(src, {text: true, bg: true, type: 'primary'}) + '</div>' +
            '<div>' + hint('不支持聚合订阅，原因是如果一次过多更新会出现遗漏<br>不必在 ' + src +
                ' 网站添加订阅, 你可以通过上方👆 [' + src + '] 按钮浏览字幕组订阅') + '</div></div>', 80) +
        '</form>'

    const addBody = tabs([
        {title: 'Mikan', pane: addPane('Mikan', 'https://mikanani.me/RSS/Bangumi?bangumiId=xxx&subgroupid=xxx')},
        {title: 'AniBT', pane: addPane('AniBT', 'https://anibt.net/rss/anime.xml?bgmId=xxx&groupSlug=xxx')},
        {title: 'AG', pane: addPane('AnimeGarden', 'https://api.animes.garden/feed.xml?subject=xxx&fansub=xxx')},
        {
            title: 'Other', pane:
                '<form class="el-form el-form--default el-form--label-right full-width" style="height:200px" onsubmit="return false">' +
                item('番剧名称', '<div class="flex full-width">' + inp('', '请勿留空', {style: 'flex:1'}) +
                    '<div style="width:4px"></div>' + btn('', {text: true, bg: true, type: 'primary', icon: 'search'}) + '</div>', 80) +
                item('BgmUrl', inp('', 'https://bgm.tv/subject/123456', {full: true}), 80) +
                item('RSS 地址', area('', 'https://xxxx.com/a.xml', 2), 80) +
                '</form>' +
                '<span class="el-text el-text--small mx-1">dmhy等含有磁力链接的RSS不支持Aria2</span>'
        },
    ], {vertical: true})

    /* 添加订阅底部只有一个「确定」（home/Add.vue 的 div.action） */
    const addFooter = '<div class="action">' +
        btn('确定', {text: true, bg: true, icon: 'check'}).replace('<button', '<button data-close') + '</div>'

    /* ---------- 修改订阅（home/Ani.vue，与「添加订阅」下半段共用） ---------- */
    const A0 = DATA[0] || {t: '', s: 1, sub: ''}

    const editBase = scroll(500, form([
        ['标题', '<div class="full-width"><div>' + inp(A0.t, '', {full: true}) + '</div>' +
        '<div class="flex full-width" style="justify-content:end;margin-top:12px">' +
        btn('使用Bangumi', {text: true, bg: true, icon: 'documentAdd'}) +
        btn('使用TMDB', {text: true, bg: true, icon: 'documentAdd'}) + '</div></div>'],
        ['TMDB', '<div class="flex full-width" style="justify-content:space-between">' +
        '<div class="el-input is-disabled" style="flex:1"><div class="el-input__wrapper" style="justify-content:left;padding:0 11px">' +
        lnk(A0.t, 'https://www.themoviedb.org/tv/209867') + '</div></div>' +
        '<div style="width:4px"></div>' + btn('', {text: true, bg: true, icon: 'search'}) +
        '<div style="width:4px"></div>' + btn('', {text: true, bg: true, icon: 'refresh'}) + '</div>'],
        ['剧集组', '<div class="flex full-width" style="justify-content:space-between">' +
        inp('', '留空不使用剧集组', {style: 'flex:1'}) + '<div style="width:4px"></div>' +
        btn('', {text: true, bg: true, icon: 'menu'}) + '</div>'],
        ['BgmUrl', inp('https://bgm.tv/subject/425998', 'https://xxx.xxx', {full: true})],
        ['主 RSS', '<div class="full-width"><div class="flex full-width">' +
        inp(A0.sub, '字幕组', {style: 'width:140px'}) + '<div style="width:6px"></div>' +
        inp('https://mikanani.me/RSS/Bangumi?bangumiId=3141', 'https://xxx.xxx', {style: 'flex:1'}) + '</div>' +
        '<div class="flex full-width" style="justify-content:end;margin-top:4px">' +
        btn('', {text: true, bg: true, icon: 'files'}) + btn('', {text: true, bg: true, icon: 'tickets'}) +
        btn('', {text: true, bg: true, icon: 'grid'}) + '</div></div>'],
        ['备用 RSS', flexEnd(btn('管理', {text: true, bg: true, icon: 'editPen'}))],
        ['日期', flexEnd(datePicker('2026-07-04'))],
        ['季', flexEnd(num(A0.s, 200))],
        ['集数偏移', flexEnd(num(0, 200))],
        ['总集数', flexEnd(num(24, 200))],
        ['匹配', excludeEditor(['1080p', '简体'], false)],
        ['排除', excludeEditor(['720p', '繁体', 'CHT'], true)],
        ['全局排除', sw(true)],
        ['剧场版', sw(false)],
        ['启用', sw(true)],
    ]))

    const editCustom = scroll(500, form([
        ['自定义集数规则', '<div class="full-width"><div>' + sw(false) + '</div>' +
        '<div class="flex full-width" style="margin-top:4px">' + inp('', '', {style: 'flex:1'}) +
        '<div style="width:4px"></div>' + num(1, 140) + '</div></div>'],
        ['自定义路径', '<div class="full-width"><div>' + sw(true) + '</div>' +
        '<div>' + area('/downloads/anime/${title}', '', 2) + '</div>' +
        '<div style="display:flex;justify-content:space-between;margin-top:6px;align-items:center">' +
        btn('', {text: true, bg: true, icon: 'refresh'}) +
        '<span class="el-text el-text--small mx-1">最终下载位置以 <strong>预览</strong> 为准</span></div></div>'],
        ['自定义上传', '<div class="full-width"><div>' + sw(false) + '</div><div>' + area('', '', 2) + '</div></div>'],
        ['自定义完结迁移', '<div class="full-width"><div>' + sw(false) + '</div><div>' + area('', '', 2) + '</div></div>'],
        ['重命名模版', '<div class="full-width">' + sw(true) + '<br>' +
        inp('', '${title} S${seasonFormat}E${episodeFormat}', {full: true}) + '<br>' +
        '<a class="el-link el-link--primary" style="font-size:var(--el-font-size-extra-small)" target="_blank" ' +
        'href="https://docs.wushuo.top/config/basic/rename#rename-template"><span class="el-link__inner">详细说明</span></a></div>'],
        ['自定义标签', '<div>' + sw(false) + tagsEditor(['追番']) + '</div>'],
        ['优先保留', '<div class="full-width">' + sw(false) + '<br>' + excludeEditor(['BDRip', 'HEVC'], true) + '</div>'],
        ['其它', checks([['遗漏检测', true], ['自动上传', false], ['只下载最新集', false],
            ['摸鱼检测', false], ['通知', true], ['完结迁移', false]])],
    ]))

    const editBody = '<div style="padding:0 12px">' +
        tabs([{title: '基本', pane: editBase}, {title: '自定义', pane: editCustom}], {center: true}) + '</div>'

    /* 上游 Ani.vue 底部：左「其他」下拉，右「预览」「确定」 */
    const editFooter =
        '<div class="flex full-width" style="justify-content:space-between;margin-top:10px">' +
        '<div>' + btn('其他', {text: true, bg: true, icon: 'more', act: 'ani-more'}) + '</div>' +
        '<div>' + btn('预览', {text: true, bg: true, icon: 'grid'}) +
        btn('确定', {type: 'primary', text: true, bg: true, icon: 'check'}).replace('<button', '<button data-close') + '</div></div>'

    /* ---------- 设置：八个标签页（对照 home/Config.vue 的 el-tabs） ---------- */

    /* 1) 页面设置 —— config/basic/Page.vue */
    const pageSettings = form([
        ['外观', '<div class="el-radio-group" id="appearance">' +
        ['auto', 'light', 'dark'].map((m, i) => '<label class="el-radio-button' + (i === 0 ? ' is-active' : '') + '" data-mode="' + m + '">' +
            '<span class="el-radio-button__inner">' + icon(['auto', 'sun', 'moon'][i]) + '</span></label>').join('') + '</div>'],
        ['主题色', '<div class="el-color-picker" style="position:relative"><div class="el-color-picker__trigger">' +
        '<span class="el-color-picker__color"><span class="el-color-picker__color-inner" style="background-color:var(--el-color-primary)">' +
        '<i class="el-icon el-color-picker__icon" data-icon="caret"></i></span></span></div>' +
        '<input type="color" id="accent" value="#409eff" style="position:absolute;inset:0;opacity:0;cursor:pointer"/></div>' +
        '<span class="el-text el-text--info el-text--small" style="margin-left:10px" id="accentNote"></span>'],
        ['排序', sel('评分', ['评分', '拼音', '更新时间'], 150)],
        ['最大内容宽度', '<span id="widthBox">' + num(1600, 150, 'px') + '</span>'],
        ['其他', '<span id="toggles">' + checks([['显示评分', true], ['按星期展示', true], ['显示视频列表', true], ['显示更新时间', true]]) + '</span>'],
        ['自定义', btn('JavaScript', {bg: true, icon: 'js'}) + btn('CSS', {bg: true, icon: 'css'})],
    ], 100)

    /* 2) 下载设置 —— config/Download.vue（下方折叠面板为 config/download/qBittorrent.vue） */
    const downloadPane = form([
        ['下载工具', sel('qBittorrent', ['qBittorrent', 'Transmission', 'Aria2', 'OpenList'], 'full')],
        ['地址', inp('http://192.168.1.8:8080', 'http://192.168.1.x:8080', {full: true})],
        ['ApiKey', inp('', 'qbt_xxxx', {prefix: 'key', type: 'password', full: true})],
        ['', '<div class="flex" style="width:100%;justify-content:end">' + btn('测试', {text: true, bg: true, icon: 'odometer'}) + '</div>'],
        ['保存位置', inp('/downloads/${title}', '', {full: true})],
        ['剧场版保存位置', '<div class="full-width">' + inp('/downloads/剧场版', '', {full: true}) +
        '<div style="margin-top:8px">' + alertBox('你的 剧场版保存位置 并未按照模版填写, 可能会遇到下载位置错误') + '</div></div>'],
        ['自动删除', '<div>' + sw(true) +
        hint('自动删除已完成的任务<br>如果同时开启了 <strong>备用rss功能</strong> 将会自动删除对应洗版视频, 以实现 <strong>主rss</strong> 的替换') +
        '<div>' + cb('等待做种完毕', false) + '</div>' +
        '<div>' + cb('仅在主RSS更新后删除备用RSS', true) + '</div>' +
        hint('<strong>主RSS</strong> 将 <span style="color:red">不会自动删除</span>，仅在其更新后删除对应备用RSS的任务与文件') + '</div>'],
        ['失败重试次数', num(3, 150)],
        ['同时下载限制', '<div>' + num(0, 150) + '<div>设置为时 0 不做限制</div></div>'],
        ['延迟下载', num(0, 160, '分钟')],
        ['优先保留', '<div class="full-width">' + sw(false) + hint('启用多文件种子的文件优先保留过滤') + '</div>'],
        ['自定义标签', '<div class="full-width">' + tagList(['ani-rss'], 'primary') +
        btn('', {text: true, bg: true, icon: 'plus'}) + '</div>'],
        collapse([{
            title: 'qBittorrent 设置', content: form([
                ['下载速度限制', num(0, 170, 'KiB/s')],
                ['上传速度限制', num(0, 170, 'KiB/s')],
                ['分享率', '<div>' + num(-2, 150) + hint('"-1"表示禁用, "-2"使用全局设置') + '</div>'],
                ['总做种时长', '<div>' + num(-2, 160, '分钟') + hint('"-1"表示禁用, "-2"使用全局设置') + '</div>'],
                ['非活跃时长', '<div>' + num(-2, 160, '分钟') + hint('"-1"表示禁用, "-2"使用全局设置') + '</div>'],
                ['qb保存路径', '<div>' + sw(false) + hint('开启后将使用qBittorrent的临时下载位置 (最终下载位置不受影响)') + '</div>'],
            ], 120)
        }]),
    ], 110)

    /* 3) 基本设置 —— config/Basic.vue，九个折叠面板，accordion 模式 */
    const basicPane = collapse([
        {title: '页面设置', open: true, content: pageSettings},
        {
            title: '添加订阅', content: form([
                ['只下载最新集', sw(false)],
                ['标题添加年份', sw(true)],
                ['自动剧集偏移', sw(true)],
                ['BGM日语标题', sw(false)],
                ['TMDB ID', '<div>' + sw(true) + '<br>' + cb('Plex Mode', false) +
                hint('自动获取tmdbId, 如: 女仆冥土小姐。 [tmdbid=242143]') + '</div>'],
                ['TMDB标题', '<div>' + sw(true) + hint('自动使用TMDB的标题') +
                '<div>' + cb('仅获取动漫', true) + cb('使用原标题', false) + cb('优先获取罗马音', false) + '</div></div>'],
                ['TMDB语言', sel('中文 (zh-CN)', ['中文 (zh-CN)', '日本語 (ja-JP)', 'English (en-US)', '繁體中文 (zh-TW)'], 150)],
                ['开启全局排除', sw(true)],
                ['导入全局排除', sw(false)],
                ['封面质量', sel('common', ['small', 'grid', 'large', 'medium', 'common'], 150)],
                ['自定义集数规则', '<div class="full-width"><div>' + sw(false) + '</div>' +
                '<div class="flex full-width" style="gap:4px;margin-top:4px">' +
                inp('', '', {style: 'flex:1;min-width:180px'}) + num(1, 140) + '</div></div>'],
                ['自动上传', sw(false)],
                ['自动替换', '<div>' + sw(false) + hint('重名的订阅将允许被替换') + '</div>'],
            ], 120)
        },
        {
            title: '重命名设置', content: form([
                ['自动重命名', sw(true)],
                ['重命名间隔', num(30, 160, '秒')],
                ['最大文件名长度', num(255, 150)],
                ['重命名模版', '<div class="full-width">' +
                inp('${title} S${seasonFormat}E${episodeFormat}', '${title} S${seasonFormat}E${episodeFormat}', {full: true}) +
                hint(lnk('详细说明', 'https://docs.wushuo.top/config/basic/rename#rename-template')) + '</div>'],
                ['剔除年份', '<div>' + sw(false) + hint('重命名时剔除 年份, 如 (2024)') + '</div>'],
                ['剔除TMDB ID', '<div>' + sw(true) + hint('重命名时剔除 tmdbid, 如 [tmdbid=242143]') + '</div>'],
                ['字幕独立文件夹', '<div class="full-width">' + sw(false) + '<br>' +
                inp('Subs', '', {full: true}) + '<br>' + hint('仅支持 qBittorrent') + '</div>'],
            ], 120)
        },
        {
            title: '刮削设置', content: form([
                ['自动刮削', sw(true)],
                ['追更天数', '<div>' + num(7, 150, '天') + '<br>' + hint('自动强制刮削最近更新集的元数据') + '</div>'],
                ['更多', cb('bangumi.ini', false)],
                ['TmdbApi', inp('', 'https://api.themoviedb.org', {full: true})],
                ['TmdbApiKey', inp('', '请自备 API 密钥, 留空使用系统默认', {full: true})],
                ['TmdbImage', inp('', 'https://image.tmdb.org', {full: true})],
            ], 110)
        },
        {
            title: 'RSS设置', content: form([
                ['RSS开关', sw(true)],
                ['RSS间隔', num(15, 170, '分钟')],
                ['RSS超时', num(30, 160, '秒')],
                ['自动跳过', '<div class="full-width">' + sw(true) +
                hint('文件已下载自动跳过 此选项必须启用 自动重命名。确保 下载工具 与本程序 docker 映射挂载路径一致 &nbsp;' +
                    lnk('详细说明', 'https://docs.wushuo.top/config/basic/rss#auto-skip')) + '</div>'],
                ['自动禁用订阅', '<div class="full-width">' + sw(true) + '<br>' +
                hint('根据 Bangumi 获取总集数 当所有集数都已下载时自动禁用该订阅') +
                '<div>' + cb('订阅完结迁移', false) + '</div>' +
                '<div style="margin-top:4px">' + inp('/downloads/完结/${title}', '', {full: true}) + '</div></div>'],
                ['自动更新总集数', '<div class="full-width">' + sw(true) +
                '<div>' + cb('强制更新', false, true) + '</div></div>'],
                ['自动跳过X.5集', sw(false)],
                ['遗漏检测', '<div>' + sw(true) + hint('总开关 若检测到RSS中集数出现遗漏会发送通知') + '</div>'],
                ['摸鱼检测', '<div>' + sw(false) +
                '<div style="margin-top:4px">' + num(14, 160, '天') + '</div>' +
                cb('仅启用主RSS摸鱼检测', false) +
                hint('检测到主RSS更新摸鱼会发送通知<br>建议配合 <strong>自动禁用订阅</strong> 食用') + '</div>'],
                ['备用RSS', '<div class="full-width">' + sw(true) +
                '<div>' + cb('多字幕组共存模式', false) + cb('添加订阅时自动复制主rss至备用rss', true) + '</div>' +
                '<div class="flex full-width" style="justify-content:end">' +
                lnk('详细说明', 'https://docs.wushuo.top/config/basic/rss#back-rss') + '</div></div>'],
            ], 120)
        },
        {
            title: 'Trackers', content: form([
                ['更新地址', '<div class="full-width">' +
                area('https://cf.trackerslist.com/best.txt', '换行输入多个', 2) +
                '<div style="height:12px"></div>' +
                '<div class="flex" style="justify-content:space-between;align-items:center">' +
                cb('每天1:00自动更新', true) + btn('更新', {bg: true, icon: 'refresh'}) + '</div>' +
                hint('该功能暂不支持 Transmission') + '</div>'],
            ], 90)
        },
        {
            title: 'Bangumi', content: form([
                ['BgmApi', inp('', 'https://api.bgm.tv', {full: true})],
                ['获取方式', radioRow(['手动输入', '自动获取'], 0)],
                ['Token', '<div class="full-width">' + inp('', 'ABCDEFGHIJKLMNOPQRS', {full: true}) +
                hint('你可以在&nbsp;' + lnk('https://next.bgm.tv/demo/access-token', 'https://next.bgm.tv/demo/access-token') + '&nbsp;生成一个 Access Token') +
                '</div>'],
            ], 90) + '<div class="flex" style="justify-content:start">' +
                lnk('支持自动点格子', 'https://docs.wushuo.top/config/basic/other#emby-webhook') + '</div>'
        },
        {
            title: '其他', content: form([
                ['Api', btn('复制 emby 自动点格子 api', {icon: 'copy'}) + btn('复制 ics', {icon: 'copy'})],
                ['Mikan', inp('', 'https://mikanani.me', {full: true})],
                ['GithubToken', '<div class="full-width">' + inp('', '在此处输入GithubToken', {full: true}) +
                '<div class="flex" style="justify-content:end;margin-top:4px">' + btn('获取GithubToken', {bg: true, icon: 'github'}) + '</div></div>'],
                ['最大日志条数', sel('256', ['128', '256', '512'], 150)],
                ['自动更新', '<div class="full-width"><div>' + sw(false) + '</div>' + hint('每天 06:00 自动更新程序') + '</div>'],
                ['DEBUG', sw(false)],
                ['缓存', '<div class="full-width"><div>' + btn('清理', {bg: true, icon: 'del'}) + '</div>' + hint('清理现在不被使用的缓存') + '</div>'],
                ['自动备份配置', '<div>' + sw(true) + '<br>' + num(7, 150, '天') + '</div>'],
                ['开机自启', sw(false)],
            ], 120)
        },
        {
            title: '备份', content: '<div class="content flex" style="width:100%;justify-content:center;gap:10px">' +
                btn('导出设置', {bg: true, icon: 'upload'}) + btn('导入设置', {bg: true, icon: 'download'}) + '</div>'
        },
    ], true)

    /* 4) 全局排除 —— config/Exclude.vue（show-text） */
    const excludePane = '<div class="full-width">' +
        '<div class="gap-2" style="display:flex;flex-wrap:wrap;align-items:center">' +
        ['720', '简', '\\d+-\\d+', '{{桜都字幕组}}:繁', 'CHT', 'DVD', '合集'].map(t =>
            '<span class="el-tag el-tag--primary el-tag--light" style="margin:0 4px 4px 0"><span class="el-tag__content">' +
            '<span class="el-text el-text--small" style="max-width:300px;color:var(--el-color-primary)">' + esc(t) + '</span>' +
            '</span><i class="el-tag__close el-icon" data-icon="close"></i></span>').join('') +
        btn('', {bg: true, text: true, icon: 'plus'}) + btn('', {bg: true, text: true, type: 'danger', icon: 'del'}) +
        '</div>' +
        '<div class="flex" style="margin-top:4px;width:100%;justify-content:space-between">' +
        '<span></span><span class="el-text el-text--small mx-1">支持&nbsp;' +
        lnk('正则表达式', 'https://www.runoob.com/regexp/regexp-syntax.html') + '</span></div></div>'

    /* 5) 代理设置 —— config/Proxy.vue */
    const proxyPane = form([
        ['IP', inp('', '192.168.0.x', {full: true})],
        ['端口', num(7890, 150)],
        ['用户名', inp('', '可以为空', {prefix: 'user', full: true})],
        ['密码', inp('', '可以为空', {prefix: 'key', full: true})],
        ['代理列表', area('', '', 3)],
        ['启用', sw(false)],
        ['ScrapeTest', '<div class="auto-flex" style="justify-content:space-between;width:100%">' +
        '<div style="display:flex">' + sel('https://mikanani.me',
            ['https://mikanani.me', 'https://mikanime.tv', 'https://nyaa.si', 'https://acg.rip',
                'https://github.com', 'https://www.google.com', 'https://bgm.tv', 'https://www.themoviedb.org'], 240) +
        '<div style="width:4px"></div>' + btn('测试', {bg: true, text: true, icon: 'odometer'}) + '</div></div>'],
    ], 100)

    /* 6) 登录设置 —— config/LoginConfig.vue */
    const loginPane = form([
        ['用户名', inp('', '', {prefix: 'user', full: true})],
        ['密码', inp('', '', {prefix: 'key', full: true})],
        ['登录有效', num(72, 170, '小时')],
        ['其他', checks([['禁止多端登录', false], ['禁止公网访问', false], ['如果IP发生改变登录将失效', true], ['限制尝试次数', true], ['允许跨域', false]])],
        ['IP白名单', '<div class="full-width"><div>' + sw(false) + '</div>' +
        '<div class="full-width">' + area('', '127.0.0.1\n192.168.1.0/24', 2) +
        hint('对IP白名单跳过身份验证, 换行可填写多个') + '</div></div>'],
        ['信任的反代IP', '<div class="full-width">' + cb('启用', false) + '<br>' + tagInput(['172.17.0.1']) + '</div>'],
        ['Api Key', '<div class="flex full-width" style="align-items:center">' +
        inp('a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6', '', {full: true}) +
        '<div class="flex" style="margin-left:12px">' + btn('生成', {bg: true, text: true}) + btn('复制', {bg: true, text: true}) + '</div></div>'],
    ], 110)

    /* 7) 通知 —— config/Notification.vue，卡片名称取自 js/notification-type.js */
    const notifyPane =
        collapse([{
            title: '通知模板', content: area('${text}', '${text}', 2) +
                '<div class="flex" style="width:100%;justify-content:end;margin-top:4px">' +
                lnk('通知模版示例', 'https://docs.wushuo.top/config/notification') + '</div>'
        }]) +
        '<div style="margin-top:8px;padding:0 4px">' +
        '<div class="el-space el-space--horizontal" style="display:flex;flex-wrap:wrap;gap:8px">' +
        [['TG通知', '主号'], ['邮箱通知', '无备注'], ['WebHook', '推送到 Home Assistant'], ['系统通知', '无备注'],
            ['Emby媒体库刷新', '刷新动漫库'], ['执行外部程序', '硬链接脚本']].map(([n, c]) =>
            '<div class="el-card is-never-shadow" style="min-width:180px"><div class="el-card__body">' +
            '<div class="flex" style="align-items:center;justify-content:space-between">' +
            '<div><p style="width:110px;margin:0">' + esc(n) + '</p>' +
            '<span class="el-text el-text--small is-truncated" style="max-width:120px">' + esc(c) + '</span></div>' +
            '<div>' + btn('', {type: 'primary', text: true, icon: 'more', act: 'notify-more'}) + '</div>' +
            '</div></div></div>').join('') + '</div>' +
        btn('添加通知', {type: 'primary', text: true, bg: true, icon: 'folderAdd'}).replace('class="el-button', 'style="margin-top:12px" class="el-button') +
        '</div>'

    /* 8) 捐赠 —— config/Afdian.vue */
    const afdianPane =
        form([['捐赠状态', '<span class="el-tag el-tag--success el-tag--light"><span class="el-tag__content">' +
        '<span class="flex" style="align-items:center;gap:4px">' + icon('mug') + '已捐赠</span></span></span>']], 80) +
        '<div class="flex" style="align-items:center;gap:20px;flex-wrap:wrap">' +
        '<a class="el-button el-button--danger" href="https://ifdian.net/a/wushuo894" target="_blank"><span>爱发电赞助</span></a>' +
        '<div><h3 style="margin:0 0 6px">捐赠后解锁</h3>' +
        tagList(['Mikan/AnimeGarden 番剧列表显示评分'], 'primary') + '</div></div>' +
        '<div style="margin-top:16px">' +
        '<span class="el-text el-text--small mx-1">已经捐赠？在这里输入您的订单号以激活您的捐赠</span>' +
        '<div class="flex" style="gap:8px;margin-top:6px;align-items:center">' +
        inp('', '订单号', {prefix: 'key', style: 'max-width:320px'}) + btn('激活', {type: 'primary', text: true, bg: true, icon: 'check'}) +
        '</div></div>'

    /* 9) 关于 —— config/About.vue */
    const aboutPane =
        '<div class="flex-center" style="width:100%;flex-flow:column">' +
        '<div class="flex" style="margin-bottom:12px;align-items:end;gap:10px">' + LOGO(80) +
        '<div><h1 style="margin:0">ANI-RSS</h1>' +
        '<span class="el-text el-text--small mx-1" style="cursor:pointer">&nbsp;v3.1.77</span></div></div>' +
        '<div class="flex" style="margin-bottom:12px;align-items:center;gap:12px">' +
        btn('GitHub', {type: 'info', text: true, bg: true, icon: 'github'}) +
        btn('使用文档', {type: 'info', text: true, bg: true, icon: 'book'}) +
        btn('TG群', {type: 'info', text: true, bg: true, icon: 'telegram'}) + '</div>' +
        '<div class="flex" style="margin-bottom:8px;align-items:center;gap:12px">' +
        btn('退出', {type: 'danger', text: true, bg: true, icon: 'back'}) +
        btn('重启', {type: 'warning', text: true, bg: true, icon: 'refreshRight'}) +
        btn('关闭', {type: 'danger', text: true, bg: true, icon: 'power'}) +
        '<div class="el-badge">' + btn('更新', {type: 'success', text: true, bg: true, icon: 'top'}) +
        '<sup class="el-badge__content el-badge__content--danger is-fixed">new</sup></div>' +
        '</div></div>'

    /* 上游三个重内容的面板固定 500px 高 + el-scrollbar，其余自适应 */
    const tall = html => '<div class="pv-tall">' + html + '</div>'

    const settingsBody = tabs([
        {title: '下载设置', pane: tall(downloadPane)},
        {title: '基本设置', pane: tall(basicPane)},
        {title: '全局排除', pane: excludePane},
        {title: '代理设置', pane: proxyPane},
        {title: '登录设置', pane: loginPane},
        {title: '通知', pane: tall(notifyPane)},
        {title: '捐赠', pane: afdianPane},
        {title: '关于', pane: aboutPane},
    ], {margin: true})

    /* 上游这几个弹窗都没写 width，走 el-dialog 默认的 50%；按钮也都在 body 里而不是 footer */
    $('#dialogs').innerHTML =
        dialog('dlg-download', '下载', downloadBody, '', '50%') +
        dialog('dlg-manage', '管理', manageBody, '', '50%') +
        dialog('dlg-logs', '日志', logsBody, '', '50%', 'logs-dialog') +
        dialog('dlg-add', '添加订阅', addBody + addFooter, '', '50%') +
        dialog('dlg-edit', '修改订阅', editBody + editFooter, '', '50%') +
        dialog('dlg-settings', '设置', settingsBody + '<div class="action">' + okCancel + '</div>', '', '50%')

    fillIcons()

    /* el-table 的表头和表体是两个独立的滚动容器，横向滚动要手动同步，否则表头对不上列 */
    $$('.el-table__inner-wrapper').forEach(t => {
        const head = t.querySelector('.el-table__header-wrapper')
        const body = t.querySelector('.el-table__body-wrapper .el-scrollbar__wrap')
        if (head && body) body.addEventListener('scroll', () => head.scrollLeft = body.scrollLeft)
    })

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
            if (DROPDOWNS[act]) return toggleDropdown(b, DROPDOWNS[act])
            if (act === 'refresh') return toast('已开始刷新全部订阅')
            if (act === 'login') return toast('演示页面，不会真的登录')
            /* 卡片上这几处上游也是能点的：封面换图、标题跳 bgm、评分打分、图标看播放列表 */
            if (act === 'cover') return toast('更换封面（演示页面不提供）')
            if (act === 'bgm') return toast('跳转 Bangumi 条目页（演示页面不提供）')
            if (act === 'rate') return toast('给这部番打分（演示页面不提供）')
            if (act === 'playlist') return toast('视频列表（演示页面不提供）')
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

    /* 菜单项照上游写：图标 + 按语义着色的 el-text，分组之间有 divided 分割线 */
    function toggleDropdown(btnEl, items) {
        const owner = btnEl.dataset.act
        if (popper && popper.dataset.owner === owner) return killPopper()
        const p = makePopper(btnEl, 'el-dropdown__popper',
            '<ul class="el-dropdown-menu">' + items.map(it =>
                '<li class="el-dropdown-menu__item' + (it.divided ? ' el-dropdown-menu__item--divided' : '') + '">' +
                '<span class="el-text' + (it.type ? ' el-text--' + it.type : '') + '">' +
                (it.icon ? icon(it.icon) + ' ' : '') + esc(it.t) + '</span></li>').join('') + '</ul>', owner)
        fillIcons(p)
        p.querySelectorAll('.el-dropdown-menu__item').forEach((li, i) => li.addEventListener('click', () => {
            killPopper()
            if (items[i].dlg) openDialog(items[i].dlg)
            else toast('演示页面：「' + items[i].t + '」不会真的执行')
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
    function setCollapse(cItem, open) {
        const head = cItem.querySelector('.el-collapse-item__header')
        const wrap = cItem.querySelector('.el-collapse-item__wrap')
        if (!wrap) return
        cItem.classList.toggle('is-active', open)
        head.classList.toggle('is-active', open)
        const arrow = head.querySelector('.el-collapse-item__arrow')
        if (arrow) arrow.classList.toggle('is-active', open)
        wrap.classList.add('el-collapse-transition-enter-active')
        wrap.style.maxHeight = open ? wrap.scrollHeight + 'px' : '0px'
    }

    document.addEventListener('click', e => {
        const head = e.target.closest('.el-collapse-item__header')
        if (!head) return
        const cItem = head.parentElement
        const group = cItem.parentElement
        const open = !cItem.classList.contains('is-active')
        /* accordion：展开一个就收起同组其余的 */
        if (open && group.dataset.accordion) {
            group.querySelectorAll(':scope > .el-collapse-item.is-active').forEach(x => setCollapse(x, false))
        }
        setCollapse(cItem, open)
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
            /* 下载弹窗的排序：升降序箭头跟着激活项走，再点一次同一项就翻转（上游 changeSort） */
            const arrow = g.querySelector('[data-sort-arrow]')
            if (arrow) {
                const holder = rb.querySelector('.flex-center')
                if (holder && arrow.parentElement === holder) arrow.dataset.icon = arrow.dataset.icon === 'top' ? 'bottom' : 'top'
                else if (holder) holder.appendChild(arrow)
                arrow.innerHTML = ICON[arrow.dataset.icon]
            }
            if (g.id === 'appearance') {
                const m = rb.dataset.mode
                setMode(m === 'dark' || (m === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches))
            }
        }

        /* el-radio（圆点）：Bangumi 的「获取方式」用的是这个，不是分段按钮 */
        const rd = e.target.closest('.el-radio')
        if (rd && !rb) {
            rd.closest('.el-radio-group').querySelectorAll('.el-radio').forEach(x => {
                x.classList.remove('is-checked')
                x.querySelector('.el-radio__input').classList.remove('is-checked')
            })
            rd.classList.add('is-checked')
            rd.querySelector('.el-radio__input').classList.add('is-checked')
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

    /* ---------- 标签编辑器：× 真的删、+ 真的加 ---------- */
    document.addEventListener('click', e => {
        const close = e.target.closest('.el-tag__close')
        if (close) {
            e.stopPropagation()
            close.closest('.el-tag').remove()
            return
        }
        /* 标签行里那个只有加号的按钮：照 CustomTags.vue，原地长出一个 small 输入框，回车确认 */
        const plus = e.target.closest('.el-button')
        if (!plus || plus.dataset.act || plus.textContent.trim()) return
        if (!plus.querySelector('[data-icon="plus"]') || plus.dataset.editing) return
        const row = plus.parentElement
        const box = document.createElement('div')
        box.className = 'el-input el-input--small'
        box.style.cssText = 'width:110px;margin:0 4px 4px 0'
        box.innerHTML = '<div class="el-input__wrapper"><input class="el-input__inner" placeholder="回车添加"/></div>'
        row.insertBefore(box, plus)
        plus.dataset.editing = '1'
        const input = box.querySelector('input')
        const finish = ok => {
            const v = input.value.trim()
            box.remove()
            delete plus.dataset.editing
            if (!ok || !v) return
            const t = document.createElement('span')
            t.className = 'el-tag el-tag--primary el-tag--light'
            t.style.margin = '0 4px 4px 0'
            t.innerHTML = '<span class="el-tag__content">' + esc(v) + '</span><i class="el-tag__close el-icon" data-icon="close"></i>'
            row.insertBefore(t, plus)
            fillIcons(t)
        }
        input.addEventListener('keydown', ev => {
            if (ev.key === 'Enter') finish(true)
            if (ev.key === 'Escape') { ev.stopPropagation(); finish(false) }
        })
        input.addEventListener('blur', () => finish(true))
        input.focus()
    })

    /* ---------- 密码框的眼睛：真的能看 ---------- */
    document.addEventListener('click', e => {
        const eye = e.target.closest('[data-icon="view"]')
        if (!eye) return
        const input = eye.closest('.el-input__wrapper').querySelector('.el-input__inner')
        if (input) input.type = input.type === 'password' ? 'text' : 'password'
    })

    /* ---------- 表格表头的复选框 = 全选 ---------- */
    document.addEventListener('click', e => {
        const th = e.target.closest('.el-table__header .el-checkbox')
        if (!th) return
        const on = th.classList.contains('is-checked')
        th.closest('.el-table__inner-wrapper').querySelectorAll('.el-table__body .el-checkbox').forEach(c => {
            c.classList.toggle('is-checked', on)
            c.querySelector('.el-checkbox__input').classList.toggle('is-checked', on)
        })
    })

    /* ---------- 兜底：其余按钮点了也要有反馈，不能是死的 ---------- */
    const BTN_DONE = {
        '测试': '连接成功 · 12ms', '清理': '已清理 34.2 MB 缓存', '更新': 'Trackers 已更新（86 条）',
        '生成': '已生成新的 Api Key', '复制': '已复制', '导出设置': '配置已导出', '导入设置': '请选择备份文件',
        '导出配置': '配置已导出', '预览': '/downloads/anime/转学后班上的清纯可爱美少女/Season 01',
        '管理': '备用 RSS：2 条', '激活': '订单号无效（演示数据）', '添加通知': '已新建一条通知配置',
        '使用Bangumi': '已用 Bangumi 标题覆盖', '使用TMDB': '已用 TMDB 标题覆盖',
        '获取GithubToken': '演示页面，不会跳转', '复制 emby 自动点格子 api': '已复制',
        '复制 ics': '已复制', '爱发电赞助': '演示页面，不会跳转', '查看赞助者': '演示页面，不会跳转',
        '导入全局排除': '已导入 7 条全局排除',
    }

    document.addEventListener('click', e => {
        const b = e.target.closest('.el-button, .el-link')
        if (!b || b.dataset.act || b.hasAttribute('data-close')) return
        if (b.closest('.el-tag') || b.closest('[data-step]')) return
        if (b.tagName === 'A' && b.getAttribute('href') && b.getAttribute('href') !== '#') return
        const t = b.textContent.trim()
        if (BTN_DONE[t]) return toast(BTN_DONE[t])
        if (!t) {
            /* 只有图标的按钮：按图标名给一句反馈 */
            const ic = (b.querySelector('[data-icon]') || {}).dataset
            const map = {
                search: '正在搜索…', refresh: '已刷新', refreshRight: '已刷新', download: '已开始下载',
                del: '已清空', more: '', menu: '剧集组：Season 1 / Absolute Order', editPen: '备用 RSS：2 条',
                plus: '', close: '', files: '演示页面，不会跳转 Mikan', tickets: '演示页面，不会跳转 AniBT',
                grid: '演示页面，不会跳转 AnimeGarden',
            }
            const m = ic && map[ic.icon]
            if (m) toast(m)
            return
        }
        toast('演示页面：「' + t + '」不会真的执行')
    })

    /* ---------- 日期选择器：点了给一个能选的小日历 ---------- */
    document.addEventListener('click', e => {
        const d = e.target.closest('.el-date-editor')
        if (!d) return
        const input = d.querySelector('.el-input__inner')
        const cur = new Date(input.value || '2026-07-04')
        const y = cur.getFullYear(), m = cur.getMonth()
        const first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate()
        let cells = ''
        for (let i = 0; i < first; i++) cells += '<td></td>'
        for (let i = 1; i <= days; i++) {
            cells += '<td class="' + (i === cur.getDate() ? 'current' : 'available') + '" data-day="' + i +
                '"><div><span class="el-date-table-cell__text">' + i + '</span></div></td>'
            if ((first + i) % 7 === 0) cells += '</tr><tr>'
        }
        const p = makePopper(d, 'el-picker__popper',
            '<div class="el-picker-panel el-date-picker"><div class="el-picker-panel__body">' +
            '<div class="el-date-picker__header"><span class="el-date-picker__header-label">' + y + ' 年 ' + (m + 1) + ' 月</span></div>' +
            '<table class="el-date-table"><thead><tr>' + ['日', '一', '二', '三', '四', '五', '六'].map(w => '<th>' + w + '</th>').join('') +
            '</tr></thead><tbody><tr>' + cells + '</tr></tbody></table></div></div>', 'date')
        p.querySelectorAll('[data-day]').forEach(td => td.addEventListener('click', () => {
            input.value = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(td.dataset.day).padStart(2, '0')
            killPopper()
        }))
    })

    const TOGGLE_MAP = {'显示评分': 'no-score', '按星期展示': 'no-week', '显示视频列表': 'no-playlist', '显示更新时间': 'no-time'}

    $('#accent').addEventListener('input', e => {
        document.documentElement.style.setProperty('--el-color-primary', e.target.value)
        const applied = getComputedStyle(document.documentElement).getPropertyValue('--el-color-primary').trim()
        $('#accentNote').textContent = applied.toLowerCase() === e.target.value.toLowerCase() ? '' : '当前主题固定了主题色，此处不生效'
    })

    /* ==================== 提示（模拟 ElMessage） ==================== */
    function toast(text, type) {
        type = type || 'success'
        const el = document.createElement('div')
        el.className = 'el-message el-message--' + type
        el.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);z-index:6000'
        el.innerHTML = '<i class="el-icon el-message__icon">' + (type === 'error' ? ICON.circleClose : ICON.circleCheck) +
            '</i><p class="el-message__content">' + esc(text) + '</p>'
        document.body.appendChild(el)
        setTimeout(() => {
            el.style.transition = 'opacity .3s, transform .3s'
            el.style.opacity = '0'
            el.style.transform = 'translateX(-50%) translateY(-14px)'
            setTimeout(() => el.remove(), 320)
        }, 2200)
    }

    /* ==================== 主题栏 ====================
     * [文件名, 显示名, 明暗, 配套 JS（可选）]
     * 第四项只有原神那款有 —— 它的三维背景是自定义 JS 干的，不是 CSS。
     */
    const THEMES = [
        ['paper.css', '纸感极简 · Paper', 'auto'],
        ['neon.css', '午夜霓虹 · Neon', 'dark'],
        ['sakura.css', '樱花物语 · Sakura', 'auto'],
        ['glass.css', '云海玻璃 · Glass', 'auto'],
        ['liquid-glass.css', '液态玻璃 · Liquid Glass', 'auto'],
        ['terminal.css', '绿光终端 · Terminal', 'dark'],
        ['github.css', '代码仓库 · GitHub', 'auto'],
        ['calendar.css', '挂历 · Calendar', 'auto'],
        ['material.css', '质感设计 · Material 3', 'auto'],
        ['material-motion.css', '质感设计 · Material 3（动效增强）', 'auto', 'material-motion.js'],
        ['acg-wallpaper.css', '二次元 · 随机壁纸', 'auto'],
        ['acg-starry.css', '二次元 · 星空夜', 'dark'],
        ['acg-peach.css', '二次元 · 蜜桃樱', 'light'],
        ['acg-cyber.css', '二次元 · 电子霓虹', 'dark'],
        ['acg-glass.css', '二次元 · 玻璃', 'auto'],
        ['bing-mist.css', '必应4K · 晨雾', 'light'],
        ['bing-night.css', '必应4K · 夜航', 'dark'],
        ['genshin-login.css', '原神启动 · 登录窗口', 'light', 'genshin-login.js'],
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
    pick.value = current
    localStorage.setItem('ani-preview-theme', current)

    /* ==================== 右上角的复制按钮 ==================== */
    /* 写死仓库地址：本地起服务预览时也该给出可用的公网地址，而不是 localhost */
    const REPO_PAGES = 'https://zzzwannasleep.github.io/ani-rss-themes/'
    const REPO_JSDELIVR = 'https://cdn.jsdelivr.net/gh/zzzwannasleep/ani-rss-themes@main/'
    const PAGES = REPO_PAGES + 'themes/'
    const JSDELIVR = REPO_JSDELIVR + 'themes/'
    const importOf = base => '@import url("' + base + current + '");'

    /* clipboard API 只在 https / localhost 可用，file:// 打开时退回 execCommand */
    function copyText(text) {
        if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text)
        return new Promise((resolve, reject) => {
            const ta = document.createElement('textarea')
            ta.value = text
            ta.style.cssText = 'position:fixed;top:-1000px;opacity:0'
            document.body.appendChild(ta)
            ta.select()
            const ok = document.execCommand('copy')
            ta.remove()
            ok ? resolve() : reject(new Error('copy failed'))
        })
    }

    /**
     * okText 可以是函数，nextLabel 也是 —— 这两个口子是给「一个按钮两件事」用的：
     * 复制成功后由 nextLabel() 翻到下一个档位，并返回按钮恢复后要显示的文字。
     * 不传 nextLabel 就是原来的行为：1.6 秒后恢复成绑定时那个标签。
     */
    function bindCopy(id, get, okText, nextLabel) {
        const b = $(id)
        const label = b.textContent
        b.addEventListener('click', async () => {
            b.disabled = true
            let ok = false
            try {
                await copyText(await get())
                ok = true
                b.textContent = '✓ 已复制'
                b.classList.add('done')
                toast(typeof okText === 'function' ? okText() : okText)
            } catch (e) {
                b.textContent = '复制失败'
                toast('复制失败，请手动选中', 'error')
            }
            /* 失败就别翻档，用户下一次点的还是他本来想要的那个 */
            const back = (ok && nextLabel) ? nextLabel() : label
            setTimeout(() => {
                b.textContent = back
                b.classList.remove('done')
                b.disabled = false
            }, 1600)
        })
    }

    bindCopy('#copyPages', () => importOf(PAGES), '已复制 @import（GitHub Pages）')
    bindCopy('#copyJsd', () => importOf(JSDELIVR), '已复制 @import（jsDelivr）')
    bindCopy('#copyCss', () => fetch('themes/' + current).then(r => {
        if (!r.ok) throw new Error(r.status)
        return r.text()
    }), '已复制 ' + meta[1] + ' 的 CSS 全文')

    /* ---- 配套 JS 的按钮 ----
     * 「链接」和「全文」两件事，挤两个按钮太占地方（这条栏在窄屏本来就要溢出），
     * 所以合成一个轮着来的按钮：上面写的就是这一下会复制什么，复制完自动翻到另一个。
     * 没有配套 JS 的主题直接把按钮摘掉，省得点了个空。
     */
    const jsFile = meta[3]
    if (!jsFile) {
        $('#copyJs').remove()
    } else {
        const jsBtn = $('#copyJs')
        const JS_MODES = [
            {
                label: '复制 JS 链接',
                title: 'import() 一行，粘到 自定义 → JS。走 jsDelivr，跟着仓库自动更新',
                ok: '已复制 JS 链接 —— 粘到 自定义 → JS',
                get: () => 'import("' + REPO_JSDELIVR + 'js/' + jsFile + '")',
            },
            {
                label: '复制 JS 全文',
                title: '把整份 JS 复制走，粘到 自定义 → JS。不再依赖本仓库',
                ok: '已复制 ' + meta[1] + ' 的 JS 全文 —— 粘到 自定义 → JS',
                get: () => fetch('js/' + jsFile).then(r => {
                    if (!r.ok) throw new Error(r.status)
                    return r.text()
                }),
            },
        ]

        let i = 0
        const paint = () => {
            jsBtn.title = JS_MODES[i].title
            return JS_MODES[i].label
        }
        jsBtn.textContent = paint()

        bindCopy('#copyJs',
            () => JS_MODES[i].get(),
            () => JS_MODES[i].ok,
            () => { i = 1 - i; return paint() })

        $('#pasteHint').textContent = '这款要填两个框：CSS 一份、JS 一份'

        /* 预览页得真的把这份 JS 跑起来。
           只给个复制按钮、自己不加载，选到这款就永远看不到背景动画 ——
           「预览看到什么样，装上去就是什么样」对这类主题就不成立了。
           它自己会盯着登录页的显隐来挂载和销毁，这里放着不管即可。 */
        const tag = document.createElement('script')
        tag.src = 'js/' + jsFile
        tag.onerror = () => toast('配套 JS 没加载起来：js/' + jsFile, 'error')
        document.body.appendChild(tag)
    }

    function setMode(dark) {
        document.documentElement.classList.toggle('dark', dark)
        modeBtn.textContent = dark ? '切换浅色' : '切换深色'
        localStorage.setItem('ani-preview-dark', dark ? '1' : '0')
    }

    const fixedMode = meta[2] !== 'auto'
    modeBtn.disabled = fixedMode
    modeBtn.style.opacity = fixedMode ? '.4' : '1'
    modeNote.textContent = fixedMode ? (meta[2] === 'dark' ? '该主题强制深色' : '该主题强制浅色') : ''
    /* ?dark=1 / ?dark=0 直接指定明暗，和 ?t= 一样可以分享出去；不带就沿用上次 */
    const darkParam = new URLSearchParams(location.search).get('dark')
    setMode(fixedMode ? meta[2] === 'dark'
        : darkParam !== null ? darkParam === '1'
            : localStorage.getItem('ani-preview-dark') === '1')

    pick.addEventListener('change', () => {
        localStorage.setItem('ani-preview-theme', pick.value)
        location.search = '?t=' + pick.value
    })
    modeBtn.addEventListener('click', () => setMode(!document.documentElement.classList.contains('dark')))

    const loginBtn = $('#loginToggle')
    const showLogin = on => {
        $('#login-view').style.display = on ? 'flex' : 'none'
        $('#home-view').style.display = on ? 'none' : 'flex'
        loginBtn.textContent = on ? '看首页' : '看登录页'
        loginBtn.classList.toggle('on', on)
    }
    loginBtn.addEventListener('click', () => showLogin($('#login-view').style.display === 'none'))
    /* ?login=1 直接开在登录页，方便把「某主题的登录页长这样」发给别人 */
    if (new URLSearchParams(location.search).get('login') === '1') showLogin(true)

    positionBars()
    const openWrap = document.querySelector('.el-collapse-item.is-active .el-collapse-item__wrap')
    if (openWrap) openWrap.style.maxHeight = '1400px'
})()
