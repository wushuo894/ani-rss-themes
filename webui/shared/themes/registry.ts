import type {ThemeDef} from './types'

/**
 * 6 款主题。
 *
 * 由仓库里的 Element Plus 主题迁移而来：带过来的是设计决策本身
 * （字体栈、主色、圆角尺度、背景与装饰），不是原来的选择器 —— 类名体系已经换成 Vuetify。
 *
 * 迁移后每款从 12~60KB 缩到几十行：原来要逐个覆盖 Element Plus 的上百个组件，
 * 现在 DOM 是自己的，接线统一由 base.css 完成，主题只需给出「长什么样」。
 */

/* 常用字体栈，多款主题共用 */
const CN = '"PingFang SC", "Noto Sans SC", "Source Han Sans SC", "Microsoft YaHei"'
const MONO = 'ui-monospace, "JetBrains Mono", "Cascadia Mono", "Sarasa Mono SC", Consolas, monospace'

/** 二次元壁纸源（横屏 / 竖屏） */
const ACG_PC = 'https://www.loliapi.com/acg/pc/'
const ACG_MP = 'https://www.loliapi.com/acg/pe/'

export const THEMES: ThemeDef[] = [
    {
        id: 'acg',
        name: '二次元',
        desc: '随机壁纸，玻璃药丸，hover 光晕，每次刷新换图（只在深色下成立）',
        /*
         * base 是 dark 不是 auto：底图是随机的照片，压暗层、玻璃面板、白色细边、
         * 压在图上的白字 —— 整套视觉语言都是按深色设计的。跟着用户切到浅色，
         * 正文会变成深色的字压在一张亮度完全不可控的照片上，
         * 「疑似停更」这类直接落在背景上的小标题就读不出来了。
         * 随机照片托不住深色文字，这一款干脆只提供深色。
         */
        base: 'dark', remote: true,
        light: {
            background: '#e9eefb', surface: '#ffffff', 'surface-variant': '#dde5f6',
            primary: '#2657bf', success: '#2f6849', warning: '#795714', error: '#b12424', info: '#525e77',
        },
        dark: {
            background: '#0f1420', surface: '#18202e', 'surface-variant': '#232c3d',
            primary: '#7fa9ff', success: '#66c894', warning: '#e8b955', error: '#ef8181', info: '#9aa8bf',
        },
        vars: {
            font: `"HarmonyOS Sans SC", ${CN}, sans-serif`,
            radius: '14px', radiusPill: '999px', radiusInput: '10px',
            panelBlur: '18px', surfaceAlpha: '.7',
        },
        css: `
/* 壁纸：横竖屏各取一个源，竖屏用竖版图，免得整张被裁掉 */
:root {
    --ani-bg-image: url("${ACG_PC}");
    /* 压暗层要够重：壁纸是随机的，遇到亮色图时正文和小标题会整段读不出来 */
    --ani-bg-scrim: linear-gradient(rgba(8,12,22,.58), rgba(8,12,22,.76));
}
@media (orientation: portrait) {
    :root { --ani-bg-image: url("${ACG_MP}"); }
}
.v-card { border: 1px solid rgba(255,255,255,.34); }
.v-btn:hover { box-shadow: 0 0 16px rgba(127,169,255,.5); }
`,
    },

    {
        id: 'liquid-glass',
        name: '液态玻璃',
        desc: '复刻 Apple WWDC25，胶囊控件按下回弹',
        base: 'auto',
        light: {
            background: '#eceaf6', surface: '#ffffff', 'surface-variant': '#e3e0f2',
            primary: '#4442e2', success: '#1c692f', warning: '#845000', error: '#b50a00', info: '#00618a',
        },
        dark: {
            background: '#0d0d14', surface: '#17171f', 'surface-variant': '#22222e',
            primary: '#8d8aff', success: '#32d74b', warning: '#ffd60a', error: '#ff453a', info: '#64d2ff',
        },
        vars: {
            font: `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI Variable Text", ${CN}, sans-serif`,
            radius: '22px', radiusPill: '999px', radiusInput: '999px',
            panelBlur: '22px', surfaceAlpha: '.66',
        },
        css: `
/* 高饱和网格渐变：玻璃是靠「把背后的细节抹掉」被认出来的，
   背后只有平滑渐变的话，模糊前后长得一模一样 */
body::before {
    background-image:
        radial-gradient(46% 52% at 10% 12%, rgba(120,90,255,.55), transparent 70%),
        radial-gradient(44% 48% at 88% 18%, rgba(255,110,180,.5), transparent 70%),
        radial-gradient(50% 50% at 50% 92%, rgba(80,200,255,.5), transparent 70%),
        repeating-linear-gradient(0deg, rgba(255,255,255,.05) 0 1px, transparent 1px 22px),
        repeating-linear-gradient(90deg, rgba(255,255,255,.05) 0 1px, transparent 1px 22px);
    filter: none; transform: none;
    animation: lg-drift-a 30s ease-in-out infinite alternate;
}
@keyframes lg-drift-a { to { background-position: 3% 2%, -3% 3%, 2% -3%, 0 0, 0 0; } }

/* 边缘折射带 + 外阴影。
   只写内阴影的话卡片看着是「陷进背景里」的，和「玻璃浮在渐变上」正好相反 ——
   浮起来这件事只能靠外阴影表达。上边框比下边框亮，是光从上方来的意思。 */
.v-card {
    border: 1px solid rgba(255,255,255,.3);
    border-top-color: rgba(255,255,255,.5);
    box-shadow: 0 14px 40px rgba(0,0,0,.2),
                inset 0 1px 0 rgba(255,255,255,.45),
                inset 0 -1px 0 rgba(255,255,255,.14);
}
/* 按下回弹；悬停先把高光边提亮，桌面端才有「这块能点」的预告 */
.v-btn { transition: transform .18s cubic-bezier(.34,1.56,.64,1), box-shadow .28s cubic-bezier(.32,.72,0,1); }
.v-btn:hover { box-shadow: inset 0 0 0 1px rgba(255,255,255,.45); }
.v-btn:active { transform: scale(.95); }
`,
    },

    {
        id: 'vue',
        name: 'Vue 文档',
        desc: 'VitePress 配色，绿松石主色，顶部霓虹晕染',
        base: 'auto',
        light: {
            background: '#ffffff', surface: '#ffffff', 'surface-variant': '#f6f6f7',
            primary: '#2b7352', secondary: '#35495e', success: '#2a7453', warning: '#9b5505',
            error: '#c12a1d', info: '#3451b2',
            'on-background': '#3c3c43', 'on-surface': '#3c3c43',
        },
        dark: {
            background: '#1b1b1f', surface: '#202127', 'surface-variant': '#2e2e32',
            primary: '#42d392', secondary: '#647eff', success: '#42d392', warning: '#f0b429',
            error: '#f66f81', info: '#a8b1ff',
            'on-background': '#dfdfd6', 'on-surface': '#dfdfd6',
        },
        vars: {
            font: `Inter, "Inter Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", ${CN}, sans-serif`,
            fontMono: `"Fira Code", ${MONO}`,
            radius: '8px', radiusPill: '20px', radiusInput: '8px',
            shadow: '0 1px 2px rgba(0,0,0,.04), 0 2px 8px rgba(0,0,0,.06)',
        },
        css: `
/* VitePress 首屏那团绿紫渐变：只压在顶部，往下很快化开。
   刻意不用 filter: blur() —— 那是铺满视口的固定层，每次滚动都要整屏重新栅格化，
   没有 GPU 的机器上会卡住主线程。渐变本身给足过渡段，观感是一样的。 */
body::before {
    background-image: radial-gradient(72% 48% at 50% -6%,
        rgba(66,211,146,.34) 0%, rgba(66,211,146,.22) 22%,
        rgba(100,126,255,.2) 48%, rgba(100,126,255,.08) 66%, transparent 82%);
    filter: none; transform: none;
}
/* 文档站的分隔感来自细线，不来自阴影 */
.v-card { border: 1px solid rgba(128,128,128,.22); }
.v-app-bar { border-bottom: 1px solid rgba(128,128,128,.22); }
/* 侧栏当前项做成 Vue 文档里那种淡底高亮 */
.v-list-item--active { background: color-mix(in srgb, currentColor 10%, transparent); }
`,
    },

    {
        id: 'github',
        name: 'GitHub',
        desc: 'Primer 配色与字栈，贡献热力图格子',
        base: 'auto',
        light: {
            background: '#f6f8fa', surface: '#ffffff', 'surface-variant': '#eaeef2',
            primary: '#085fc6', success: '#187131', warning: '#865900', error: '#bd1f2a', info: '#57606a',
        },
        dark: {
            background: '#0d1117', surface: '#161b22', 'surface-variant': '#21262d',
            primary: '#4493f8', success: '#3fb950', warning: '#d29922', error: '#f85149', info: '#8b949e',
        },
        vars: {
            font: `-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", ${CN}, sans-serif`,
            fontMono: `ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace`,
            radius: '6px', radiusPill: '6px', radiusInput: '6px',
        },
        css: `
/* 贡献热力图格子：只在底层铺一层，很淡 */
body::before {
    background-image:
        repeating-linear-gradient(90deg, rgba(64,196,99,.10) 0 10px, transparent 10px 13px),
        repeating-linear-gradient(0deg, rgba(64,196,99,.10) 0 10px, transparent 10px 13px);
    filter: none; transform: none; opacity: .5;
}
.v-card { border: 1px solid rgba(128,128,128,.28); box-shadow: none !important; }
/* Primer 的圆角是 6px 且到处都是 6px，没有大圆角容器 */
.v-list-item--active { border-radius: 6px; }
`,
    },

    {
        id: 'material',
        name: 'Material Design 3',
        desc: 'Roboto，全圆角胶囊，按下起涟漪',
        base: 'auto',
        light: {
            background: '#fef7ff', surface: '#fffbfe', 'surface-variant': '#e7e0ec',
            primary: '#6750a4', secondary: '#625b71', success: '#386a20', warning: '#7d5260',
            error: '#b3261e', info: '#49454f',
        },
        dark: {
            background: '#1c1b1f', surface: '#211f26', 'surface-variant': '#49454f',
            primary: '#d0bcff', secondary: '#ccc2dc', success: '#b7f397', warning: '#efb8c8',
            error: '#f2b8b5', info: '#cac4d0',
        },
        vars: {
            font: `Roboto, "Roboto Flex", ${CN}, sans-serif`,
            radius: '16px', radiusPill: '999px', radiusInput: '4px',
            shadow: '0 1px 3px rgba(0,0,0,.3), 0 4px 8px rgba(0,0,0,.15)',
        },
        css: `
/* M3 的 state layer：hover 时叠一层主色 */
.v-btn::before { background: currentColor; }
.v-list-item--active { border-radius: 999px; }
/* 大圆角容器，M3 的招牌 */
.v-navigation-drawer { border-radius: 0 16px 16px 0; }
`,
    },

    {
        id: 'win98',
        name: 'Windows 98',
        desc: '银灰双层斜角，靛蓝标题栏，方角滚动条，一格一格的进度条',
        /*
         * 只有浅色。1998 年没有深色模式，整套立体感是「光从左上来」这一个假设推出来的：
         * 高光白、阴影灰、暗边黑，四个值一翻面，凸起和凹陷就同时不成立了。
         * 与其给一套自己编的深色 Win98，不如老实说这一款只在浅色下成立。
         */
        base: 'light',
        light: {
            /* 银灰是底色不是背景色。青绿桌面只属于 win98 那款外壳（它自己画），
               别的外壳选了这款皮肤，得到的是一整片「对话框脸」而不是刺眼的青绿 */
            background: '#c0c0c0', surface: '#c0c0c0', 'surface-variant': '#dfdfdf',
            primary: '#000080', secondary: '#808080', success: '#008000',
            warning: '#808000', error: '#800000', info: '#000080',
            'on-background': '#000000', 'on-surface': '#000000',
        },
        vars: {
            /* MS Sans Serif 现在的机器上多半没有，Tahoma 是它的直系后继（Win98 自带）。
               中文回落到宋体：那才是当年简体中文版界面上的字 */
            font: `"MS Sans Serif", Tahoma, Verdana, "Microsoft YaHei", SimSun, sans-serif`,
            fontMono: `"Lucida Console", "Courier New", ${MONO}`,
            radius: '0px', radiusPill: '0px', radiusInput: '0px',
            shadow: 'none',
        },
        css: `
/*
 * 界面字号：Win98 用的是 8pt ≈ 11px。Vuetify 的字号全是 rem，
 * 把根字号压到 14px，正文正好落在 12px 上下，接近原版的密度。
 * 不敢再往下压 —— 13px 会让 text-caption 掉到 10px，手机上读不动。
 */
:root {
    font-size: 14px;

    --w98-face: #c0c0c0;
    --w98-hi: #ffffff;
    --w98-light: #dfdfdf;
    --w98-shade: #808080;
    --w98-dark: #0a0a0a;

    /* 凸起 / 按下 / 下沉的白井 / 窗口外框，四种斜角 */
    --w98-out: inset -1px -1px #0a0a0a, inset 1px 1px #ffffff, inset -2px -2px #808080, inset 2px 2px #dfdfdf;
    --w98-in: inset -1px -1px #ffffff, inset 1px 1px #0a0a0a, inset -2px -2px #dfdfdf, inset 2px 2px #808080;
    --w98-well: inset -1px -1px #ffffff, inset 1px 1px #808080, inset -2px -2px #dfdfdf, inset 2px 2px #0a0a0a;
    --w98-win: inset -1px -1px #0a0a0a, inset 1px 1px #dfdfdf, inset -2px -2px #808080, inset 2px 2px #ffffff;
}

/* 选中就是靛蓝铺满，没有半透明 */
::selection { background: #000080; color: #ffffff; }

/*
 * ── 立体感 ──
 * 用 inset box-shadow 而不是 border：border 会占布局宽度，
 * 每个控件都得为它重算一遍内边距；box-shadow 画在内容盒里，不动布局。
 */
.v-card,
.v-sheet.v-sheet--rounded,
.v-toolbar,
.v-navigation-drawer,
.v-expansion-panel {
    background: #c0c0c0 !important;
    box-shadow: var(--w98-win) !important;
}

/* ── 按钮 ── */
.v-btn {
    background: #c0c0c0 !important;
    color: #000000 !important;
    box-shadow: var(--w98-out) !important;
    border-radius: 0 !important;
    text-transform: none;
    letter-spacing: 0;
    font-weight: 400;
}
/* 图标按钮也是方的 —— base.css 给所有主题的图标按钮兜了 50%，这一款不要 */
.v-btn--icon { border-radius: 0 !important; }
/* Win98 没有 hover 态，也没有涟漪：反馈只有「按下去翻个面」这一种 */
.v-btn__overlay, .v-btn__underlay, .v-ripple__container { display: none !important; }
.v-btn:active { box-shadow: var(--w98-in) !important; }
/* 按下时内容跟着挪一像素，这一下才是「按进去了」的来源 */
.v-btn:active .v-btn__content { transform: translate(1px, 1px); }
/* 破坏性动作仍然要认得出来。底色不能变（银灰是这一款的全部），改字色 */
.v-btn.bg-error, .v-btn.text-error { color: #800000 !important; }
/* 默认按钮：Win98 给它多一圈黑边，回车落在哪儿一眼看得见 */
.v-btn.bg-primary { outline: 1px solid #0a0a0a; outline-offset: -3px; }
/* 对话框按钮条上的按钮宽度 75px 起 —— 当年的标准尺寸。
   只管对话框：列表里那些图标按钮给下限会把整行撑爆 */
.v-card-actions > .v-btn { min-width: 75px; }
.v-btn--disabled { text-shadow: 1px 1px 0 #ffffff; }

/* ── 输入框：下沉的白井 ── */
.v-field {
    background: #ffffff !important;
    border-radius: 0 !important;
    box-shadow: var(--w98-well) !important;
}
/* filled 变体自带的底色层和下划线都去掉，井壁由上面那圈斜角负责 */
.v-field__overlay { display: none; }
.v-field__outline::before, .v-field__outline::after { display: none; }

/* ── 开关做成勾选框的形状：Win98 没有开关，只有勾选框 ── */
.v-switch .v-switch__track {
    border-radius: 0;
    opacity: 1;
    background: #ffffff !important;
    box-shadow: var(--w98-well);
}
.v-switch .v-switch__thumb {
    border-radius: 0;
    background: #c0c0c0 !important;
    box-shadow: var(--w98-out);
}

/* ── 列表与菜单：高亮是反白 ── */
.v-list { background: #c0c0c0 !important; border-radius: 0; }
.v-overlay__content > .v-list { box-shadow: var(--w98-out); padding: 2px; }
.v-list-item { border-radius: 0 !important; }
.v-list-item__overlay { display: none; }
.v-list-item--active, .v-list-item:hover { background: #000080; color: #ffffff; }

/* ── 标签页：当年的 tab 是一排凸起的纸片 ── */
.v-tab.v-tab {
    background: #c0c0c0;
    box-shadow: inset 1px 1px #ffffff, inset 2px 0 #dfdfdf, inset -1px -1px #0a0a0a;
    border-radius: 0;
    margin-right: 2px;
    text-transform: none;
    letter-spacing: 0;
    min-width: 0;
}
.v-tab .v-tab__slider { display: none; }
/* 选中的那片纸在最前面：脸更亮，底边那道黑线去掉 —— 它是「和下面的面板连成一体」的意思 */
.v-tab--selected {
    background: #dfdfdf;
    box-shadow: inset 1px 1px #ffffff, inset 2px 0 #dfdfdf, inset -1px 0 #0a0a0a;
    font-weight: 700;
}

/*
 * ── 进度条：一格一格的方块，不是一条连续的杠 ──
 *
 * 用遮罩挖出格子之间的缝，而不是自己画一层 currentColor 的条纹：
 * Vuetify 给进度条上色是加一个 .bg-success 之类的类，那个类同时把 color 设成
 * on-success（白色）—— 拿 currentColor 画，画出来的是一排白方块压在浅色底上，
 * 等于没有进度条。遮罩不碰颜色，它上什么色就是什么色。
 */
.v-progress-linear { border-radius: 0 !important; }
.v-progress-linear__determinate {
    -webkit-mask-image: repeating-linear-gradient(90deg, #000 0 6px, rgba(0,0,0,0) 6px 8px);
    mask-image: repeating-linear-gradient(90deg, #000 0 6px, rgba(0,0,0,0) 6px 8px);
}

/* ── 对话框 = 一扇窗：外框加厚，标题条染成靛蓝 ── */
.v-dialog > .v-overlay__content > .v-card {
    padding: 3px;
    background: #c0c0c0 !important;
    box-shadow: var(--w98-win) !important;
}
.v-dialog > .v-overlay__content > .v-card > .v-card-title {
    padding: 3px 6px !important;
    background: linear-gradient(90deg, #000080, #1084d0);
    color: #ffffff;
    font-size: 12px;
    font-weight: 700;
}

/* 提示气泡是那种淡黄底黑边的便条 */
.v-tooltip > .v-overlay__content {
    background: #ffffe1 !important;
    color: #000000 !important;
    border: 1px solid #0a0a0a;
    border-radius: 0;
}

/*
 * ── 滚动条 ──
 * 16px 宽、两头带箭头按钮、滑道是 50% 网点 —— 认出 Win98 的第二眼就在这儿。
 * Firefox 不认这套伪元素，给它一对配色兜底，至少不是默认的圆角细条。
 */
* { scrollbar-color: #c0c0c0 #dfdfdf; }
::-webkit-scrollbar { width: 16px; height: 16px; }
::-webkit-scrollbar-track {
    background-color: #c0c0c0;
    background-image: repeating-conic-gradient(#ffffff 0% 25%, #c0c0c0 0% 50%);
    background-size: 2px 2px;
}
::-webkit-scrollbar-thumb { background: #c0c0c0; box-shadow: var(--w98-out); }
::-webkit-scrollbar-corner { background: #c0c0c0; }
::-webkit-scrollbar-button:single-button {
    width: 16px; height: 16px;
    background-color: #c0c0c0;
    box-shadow: var(--w98-out);
    background-repeat: no-repeat;
    background-position: center;
    background-size: 8px 8px;
}
::-webkit-scrollbar-button:single-button:vertical:decrement {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath d='M4 2 L7 6 L1 6 Z'/%3E%3C/svg%3E");
}
::-webkit-scrollbar-button:single-button:vertical:increment {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath d='M1 2 L7 2 L4 6 Z'/%3E%3C/svg%3E");
}
::-webkit-scrollbar-button:single-button:horizontal:decrement {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath d='M2 4 L6 1 L6 7 Z'/%3E%3C/svg%3E");
}
::-webkit-scrollbar-button:single-button:horizontal:increment {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath d='M6 4 L2 1 L2 7 Z'/%3E%3C/svg%3E");
}
`,
    },
]

export const THEME_MAP = new Map(THEMES.map(t => [t.id, t]))
