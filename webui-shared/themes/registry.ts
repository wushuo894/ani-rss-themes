import type {ThemeDef} from './types'

/**
 * 17 款主题。
 *
 * 全部由仓库里同名的 Element Plus 主题迁移而来：带过来的是设计决策本身
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
/** 必应 4K 壁纸源 */
const BING_PC = 'https://bing.ee123.net/img/?date=random&size=UHD'
const BING_MP = 'https://bing.ee123.net/img/?date=random&size=1080x1920'

/** 壁纸主题共用的背景规则：横竖屏各取一个源 */
const wallpaper = (pc: string, mp: string, scrim: string) => `
:root {
    --ani-bg-image: url("${pc}");
    --ani-bg-scrim: ${scrim};
    --ani-bg-blur: 0px;
    --ani-bg-scale: 1.04;
    --ani-bg-bright: 1;
}
@media (orientation: portrait) {
    :root { --ani-bg-image: url("${mp}"); }
}
`

export const THEMES: ThemeDef[] = [
    /* ══════════════ 纯 CSS 九款 ══════════════ */
    {
        id: 'paper',
        name: '纸感极简',
        desc: '宋体标题，方角线框，稿纸横纹',
        base: 'auto',
        light: {
            background: '#f7f6f3', surface: '#fffefb', 'surface-variant': '#eeece6',
            primary: '#3e6b8f', success: '#4e7a4e', warning: '#9a7b3f', error: '#a44b45', info: '#6b7280',
        },
        dark: {
            background: '#1a1a18', surface: '#232320', 'surface-variant': '#2d2d29',
            primary: '#7fa8c4', success: '#7fa87f', warning: '#c4a86b', error: '#c47f7a', info: '#9ca3af',
        },
        vars: {
            font: `"DengXian", ${CN}, sans-serif`,
            fontTitle: `"Songti SC", "Noto Serif SC", "Source Han Serif SC", SimSun, serif`,
            fontMono: MONO,
            radius: '2px', radiusPill: '2px', radiusInput: '2px',
        },
        css: `
/* 稿纸：颗粒 + 横纹。压得很淡，只在大面积留白处能看出来 */
body::before {
    background-image:
        radial-gradient(rgba(0,0,0,.05) .5px, transparent .5px),
        repeating-linear-gradient(180deg, transparent 0 27px, rgba(0,0,0,.045) 27px 28px);
    background-size: 3px 3px, 100% 28px;
    filter: none; transform: none;
}
/* 线框感：卡片用细边而不是阴影 */
.v-card { border: 1px solid rgba(0,0,0,.12); box-shadow: none !important; }
.v-theme--dark .v-card { border-color: rgba(255,255,255,.12); }
`,
    },

    {
        id: 'neon',
        name: '午夜霓虹',
        desc: '窄体全大写，切角扫光，透视网格',
        base: 'dark',
        dark: {
            background: '#05070c', surface: '#0b1020', 'surface-variant': '#131a2e',
            primary: '#00e5ff', secondary: '#ff2bd1', success: '#3dffb0', warning: '#ffcc4d',
            error: '#ff4d6d', info: '#7aa2ff',
        },
        vars: {
            font: `Bahnschrift, "DIN Alternate", "DIN Condensed", "HarmonyOS Sans SC", ${CN}, sans-serif`,
            fontMono: MONO,
            radius: '0', radiusPill: '0', radiusInput: '0',
            letterSpacing: '.04em',
        },
        css: `
/* 透视网格：两组线做出纵深，慢速推进 */
body::before {
    background-image:
        linear-gradient(rgba(0,229,255,.16) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,229,255,.16) 1px, transparent 1px);
    background-size: 44px 44px;
    filter: none; transform: perspective(280px) rotateX(58deg) scale(2.4);
    transform-origin: 50% 100%;
    animation: ani-grid-run 9s linear infinite;
    opacity: .5;
}
@keyframes ani-grid-run { to { background-position: 0 44px, 0 0; } }

/* 切角：右上角削一刀，是这套视觉的招牌 */
.v-btn, .v-card { clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%); }
.v-btn--icon { clip-path: none; }
.v-app-bar-title, .v-btn { text-transform: uppercase; }
.v-card { border: 1px solid rgba(0,229,255,.28); }
`,
    },

    {
        id: 'sakura',
        name: '樱花物语',
        desc: '圆体，药丸按钮，飘落花瓣',
        base: 'auto',
        light: {
            background: '#fff6f8', surface: '#fffdfd', 'surface-variant': '#ffe9ef',
            primary: '#f2799c', success: '#7bc47b', warning: '#f0b45e', error: '#ef6d6d', info: '#a8a5c9',
        },
        dark: {
            background: '#1c1418', surface: '#261a20', 'surface-variant': '#33232b',
            primary: '#ff9ebb', success: '#8ecf8e', warning: '#f2c27a', error: '#f28b8b', info: '#b8b5d8',
        },
        vars: {
            font: `"Yuanti SC", "YouYuan", "幼圆", Quicksand, Nunito, ${CN}, sans-serif`,
            radius: '20px', radiusPill: '999px', radiusInput: '14px',
            shadow: '0 6px 20px rgba(242,121,156,.16)',
        },
        css: `
/* 飘落的花瓣：两组椭圆错峰下落，不用图片 */
body::after {
    background-image:
        radial-gradient(ellipse 7px 4px at 12% 0, rgba(255,183,203,.85), transparent 72%),
        radial-gradient(ellipse 6px 3px at 68% 0, rgba(255,209,220,.7), transparent 72%);
    background-repeat: repeat-y;
    background-size: 30% 42vh, 44% 58vh;
    animation: ani-sakura-fall 16s linear infinite;
}
@keyframes ani-sakura-fall { to { background-position: -60px 100vh, 80px 100vh; } }
`,
    },

    {
        id: 'glass',
        name: '云海玻璃',
        desc: '细体大字距，毛玻璃，流动极光',
        base: 'auto',
        light: {
            background: '#eaf0fb', surface: '#ffffff', 'surface-variant': '#dfe7f6',
            primary: '#5b8def', success: '#5cc08a', warning: '#e8b25c', error: '#ec6a6a', info: '#8fa6c8',
        },
        dark: {
            background: '#0d1420', surface: '#151d2c', 'surface-variant': '#1e293b',
            primary: '#7fa9ff', success: '#6fd39c', warning: '#f0c274', error: '#f28585', info: '#9db4d6',
        },
        vars: {
            font: `Optima, "Segoe UI Variable Display", "Segoe UI", ${CN}, sans-serif`,
            radius: '14px', radiusPill: '10px', radiusInput: '10px',
            letterSpacing: '.02em',
            panelBlur: '18px', surfaceAlpha: '.72',
        },
        css: `
/* 极光：三团色晕缓慢漂移 */
body::before {
    background-image:
        radial-gradient(45% 45% at 18% 20%, rgba(120,170,255,.55), transparent 65%),
        radial-gradient(40% 40% at 82% 30%, rgba(190,140,255,.45), transparent 65%),
        radial-gradient(50% 50% at 50% 85%, rgba(120,230,220,.4), transparent 65%);
    filter: none; transform: none;
    animation: ani-aurora 24s ease-in-out infinite alternate;
}
@keyframes ani-aurora {
    to { background-position: 6% -4%, -8% 6%, 4% 8%; }
}
.v-card { border: 1px solid rgba(255,255,255,.22); }
`,
    },

    {
        id: 'liquid-glass',
        name: '液态玻璃',
        desc: '复刻 Apple WWDC25，胶囊控件按下回弹',
        base: 'auto',
        light: {
            background: '#eceaf6', surface: '#ffffff', 'surface-variant': '#e3e0f2',
            primary: '#5e5ce6', success: '#34c759', warning: '#ff9f0a', error: '#ff3b30', info: '#64d2ff',
        },
        dark: {
            background: '#0d0d14', surface: '#17171f', 'surface-variant': '#22222e',
            primary: '#7d7aff', success: '#32d74b', warning: '#ffd60a', error: '#ff453a', info: '#64d2ff',
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

/* 边缘折射带：上下亮、左右暗 */
.v-card {
    border: 1px solid rgba(255,255,255,.3);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.45), inset 0 -1px 0 rgba(255,255,255,.14);
}
/* 按下回弹 */
.v-btn { transition: transform .18s cubic-bezier(.34,1.56,.64,1); }
.v-btn:active { transform: scale(.95); }
`,
    },

    {
        id: 'terminal',
        name: '绿光终端',
        desc: '等宽全大写，方括号按钮，CRT 扫描线',
        base: 'dark',
        dark: {
            background: '#04120a', surface: '#071a0f', 'surface-variant': '#0c2416',
            primary: '#38e07b', secondary: '#2bb35f', success: '#38e07b', warning: '#e0d038',
            error: '#e05038', info: '#38c0e0',
            'on-background': '#9dffc4', 'on-surface': '#9dffc4',
        },
        vars: {
            font: MONO,
            fontMono: MONO,
            radius: '0', radiusPill: '0', radiusInput: '0',
        },
        css: `
/* CRT 扫描线 + 轻微闪烁 */
body::after {
    background: repeating-linear-gradient(180deg, rgba(0,0,0,.28) 0 1px, transparent 1px 3px);
    animation: ani-crt-flicker 3.4s steps(2) infinite;
}
@keyframes ani-crt-flicker { 50% { opacity: .82; } }

.v-card { border: 1px solid rgba(56,224,123,.35); box-shadow: none !important; }
.v-btn { text-transform: uppercase; }
/* 方括号按钮：终端里按钮就长这样 */
.v-btn:not(.v-btn--icon) .v-btn__content::before { content: '['; margin-right: .35em; opacity: .7; }
.v-btn:not(.v-btn--icon) .v-btn__content::after { content: ']'; margin-left: .35em; opacity: .7; }
`,
    },

    {
        id: 'github',
        name: '代码仓库',
        desc: 'Primer 字栈，贡献热力图格子',
        base: 'auto',
        light: {
            background: '#f6f8fa', surface: '#ffffff', 'surface-variant': '#eaeef2',
            primary: '#0969da', success: '#1a7f37', warning: '#9a6700', error: '#cf222e', info: '#57606a',
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
`,
    },

    {
        id: 'calendar',
        name: '挂历',
        desc: '楷体标题 + DIN 数字，月历方格',
        base: 'auto',
        light: {
            background: '#faf7f2', surface: '#fffdf8', 'surface-variant': '#f0e9dd',
            primary: '#c4342c', success: '#4e7a4e', warning: '#b8862b', error: '#c4342c', info: '#7a6a58',
        },
        dark: {
            background: '#1a1613', surface: '#231d19', 'surface-variant': '#2e2620',
            primary: '#e2665e', success: '#7fa87f', warning: '#d4a85c', error: '#e2665e', info: '#a89880',
        },
        vars: {
            font: `${CN}, "DengXian", sans-serif`,
            fontTitle: `"Kaiti SC", "STKaiti", KaiTi, "楷体", serif`,
            fontMono: `Bahnschrift, "DIN Alternate", ${MONO}`,
            radius: '3px', radiusPill: '3px', radiusInput: '2px',
        },
        css: `
/* 月历方格 + 纸面颗粒 */
body::before {
    background-image:
        radial-gradient(rgba(0,0,0,.045) .5px, transparent .5px),
        repeating-linear-gradient(90deg, rgba(0,0,0,.06) 0 1px, transparent 1px 76px),
        repeating-linear-gradient(0deg, rgba(0,0,0,.06) 0 1px, transparent 1px 76px);
    background-size: 3px 3px, auto, auto;
    filter: none; transform: none;
}
.v-card { border: 1px solid rgba(0,0,0,.14); box-shadow: none !important; }
.v-theme--dark .v-card { border-color: rgba(255,255,255,.12); }
/* 数字用 DIN，日期和集数一眼就对齐 */
.v-chip { font-family: var(--ani-font-mono); font-variant-numeric: tabular-nums; }
`,
    },

    {
        id: 'material',
        name: '质感设计 M3',
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
        id: 'autobangumi',
        name: 'AutoBangumi',
        desc: 'Inter 字栈，填充式控件，点阵背景',
        base: 'auto',
        light: {
            background: '#f6f5fa', surface: '#ffffff', 'surface-variant': '#ece9f5',
            primary: '#6c4ab6', success: '#3aa76d', warning: '#d99b2b', error: '#d9534f', info: '#6b7280',
        },
        dark: {
            background: '#14131a', surface: '#1c1a24', 'surface-variant': '#272433',
            primary: '#8b6cc7', success: '#4fbe84', warning: '#e0ac47', error: '#e06b67', info: '#9ca3af',
        },
        vars: {
            font: `Inter, "Inter Variable", ${CN}, sans-serif`,
            fontMono: MONO,
            radius: '14px', radiusPill: '8px', radiusInput: '8px',
            shadow: '0 2px 12px rgba(108,74,182,.10)',
        },
        css: `
/* 点阵底 + 右上角一团主色晕，取自上游 var.scss 的原值 */
body::before {
    background-image:
        radial-gradient(rgba(128,120,160,.18) 1px, transparent 1px),
        radial-gradient(circle 300px at calc(100% - 100px) 200px, rgba(108,74,182,.18), transparent);
    background-size: 22px 22px, auto;
    filter: none; transform: none;
}
`,
    },

    /* ══════════════ 壁纸七款：需要联网拉图 ══════════════ */
    {
        id: 'acg-wallpaper',
        name: '二次元 · 随机壁纸',
        desc: '玻璃药丸，hover 光晕，每次刷新换图',
        base: 'auto', remote: true,
        light: {
            background: '#e9eefb', surface: '#ffffff', 'surface-variant': '#dde5f6',
            primary: '#4a7fe8', success: '#4fae7a', warning: '#dda12f', error: '#e06666', info: '#7d8ba5',
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
        css: wallpaper(ACG_PC, ACG_MP, 'linear-gradient(rgba(8,12,22,.42), rgba(8,12,22,.62))') + `
.v-card { border: 1px solid rgba(255,255,255,.2); }
.v-btn:hover { box-shadow: 0 0 16px rgba(127,169,255,.5); }
`,
    },

    {
        id: 'acg-starry',
        name: '二次元 · 星空夜',
        desc: '细线框，星芒外发光',
        base: 'dark', remote: true,
        dark: {
            background: '#0a0a16', surface: '#12122a', 'surface-variant': '#1b1b3a',
            primary: '#9b8cff', success: '#6fd39c', warning: '#e8c96b', error: '#ef7f9c', info: '#8fa0d6',
        },
        vars: {
            font: `${CN}, sans-serif`,
            fontTitle: `"Kaiti SC", "STKaiti", KaiTi, "Noto Serif SC", serif`,
            radius: '12px', radiusPill: '999px', radiusInput: '12px',
            panelBlur: '16px', surfaceAlpha: '.62',
        },
        css: wallpaper(ACG_PC, ACG_MP, 'linear-gradient(rgba(6,6,20,.6), rgba(6,6,20,.78))') + `
.v-card { border: 1px solid rgba(155,140,255,.3); box-shadow: 0 0 22px rgba(155,140,255,.18); }
.v-btn--variant-flat { box-shadow: 0 0 14px rgba(155,140,255,.45); }
`,
    },

    {
        id: 'acg-peach',
        name: '二次元 · 蜜桃樱',
        desc: '圆体，蜜桃渐变',
        base: 'light', remote: true,
        light: {
            background: '#fff0f3', surface: '#fffdfd', 'surface-variant': '#ffe3ea',
            primary: '#f2698f', success: '#6fbf8a', warning: '#f0b45e', error: '#ef6d6d', info: '#b09aa5',
        },
        vars: {
            font: `"Yuanti SC", "YouYuan", "幼圆", Quicksand, ${CN}, sans-serif`,
            radius: '18px', radiusPill: '999px', radiusInput: '14px',
            panelBlur: '16px', surfaceAlpha: '.78',
        },
        css: wallpaper(ACG_PC, ACG_MP, 'linear-gradient(rgba(255,240,243,.55), rgba(255,225,235,.72))') + `
.v-btn--variant-flat { background-image: linear-gradient(135deg, #ff9ebb, #f2698f); }
`,
    },

    {
        id: 'acg-cyber',
        name: '二次元 · 电子霓虹',
        desc: '双层描边，hover 抖动',
        base: 'dark', remote: true,
        dark: {
            background: '#08040f', surface: '#12081f', 'surface-variant': '#1c0f2e',
            primary: '#ff3dd8', secondary: '#3df0ff', success: '#3dffb0', warning: '#ffd83d',
            error: '#ff3d5e', info: '#3df0ff',
        },
        vars: {
            font: `"Sarasa Mono SC", "Cascadia Mono", "JetBrains Mono", Consolas, ${CN}, monospace`,
            fontMono: MONO,
            radius: '6px', radiusPill: '2px', radiusInput: '2px',
            panelBlur: '14px', surfaceAlpha: '.66',
        },
        css: wallpaper(ACG_PC, ACG_MP, 'linear-gradient(rgba(8,4,15,.62), rgba(8,4,15,.8))') + `
/* 双层描边：品红在下、青在上，错开 1px */
.v-card { border: 1px solid rgba(255,61,216,.55); box-shadow: 1px 1px 0 rgba(61,240,255,.5); }
.v-btn:hover { animation: ani-glitch .28s steps(2) 2; }
@keyframes ani-glitch { 25% { transform: translate(-1px,1px); } 75% { transform: translate(1px,-1px); } }
`,
    },

    {
        id: 'acg-glass',
        name: '二次元 · 玻璃',
        desc: '玻璃质感，透明度可调',
        base: 'auto', remote: true,
        light: {
            background: '#eef1f8', surface: '#ffffff', 'surface-variant': '#e2e8f5',
            primary: '#6a8fd8', success: '#5cb389', warning: '#dcae5a', error: '#e07a7a', info: '#8b98ad',
        },
        dark: {
            background: '#101420', surface: '#19202e', 'surface-variant': '#242d3e',
            primary: '#8fb0ef', success: '#6fc99b', warning: '#e6c069', error: '#ef8f8f', info: '#a2b0c6',
        },
        vars: {
            font: `${CN}, sans-serif`,
            radius: '16px', radiusPill: '999px', radiusInput: '12px',
            panelBlur: '20px', surfaceAlpha: '.55',
        },
        css: wallpaper(ACG_PC, ACG_MP, 'linear-gradient(rgba(10,14,24,.34), rgba(10,14,24,.52))') + `
.v-card { border: 1px solid rgba(255,255,255,.24); }
`,
    },

    {
        id: 'bing-mist',
        name: '必应4K · 晨雾',
        desc: '衬线标题，摄影画册排法',
        base: 'light', remote: true,
        light: {
            background: '#eef1f4', surface: '#ffffff', 'surface-variant': '#e0e6ec',
            primary: '#2e7fc2', success: '#3f8f5f', warning: '#c08a30', error: '#c9504b', info: '#6d7c8a',
        },
        vars: {
            font: `"Source Han Sans SC", ${CN}, sans-serif`,
            fontTitle: `Georgia, "Songti SC", "Noto Serif SC", "Source Han Serif SC", SimSun, serif`,
            radius: '12px', radiusPill: '10px', radiusInput: '10px',
            panelBlur: '14px', surfaceAlpha: '.8',
        },
        css: wallpaper(BING_PC, BING_MP, 'linear-gradient(rgba(255,255,255,.5), rgba(240,244,248,.7))'),
    },

    {
        id: 'bing-night',
        name: '必应4K · 夜航',
        desc: 'DIN 冷峻，实心暗块',
        base: 'dark', remote: true,
        dark: {
            background: '#080c12', surface: '#101821', 'surface-variant': '#18222e',
            primary: '#5fd3e8', success: '#57c99a', warning: '#e0bb5f', error: '#e87f7f', info: '#8fa4b5',
        },
        vars: {
            font: `Bahnschrift, "DIN Alternate", "HarmonyOS Sans SC", ${CN}, sans-serif`,
            radius: '12px', radiusPill: '10px', radiusInput: '10px',
            panelBlur: '10px', surfaceAlpha: '.86',
            letterSpacing: '.01em',
        },
        css: wallpaper(BING_PC, BING_MP, 'linear-gradient(rgba(4,8,14,.62), rgba(4,8,14,.8))'),
    },
]

export const THEME_MAP = new Map(THEMES.map(t => [t.id, t]))
