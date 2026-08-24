import type {ThemeDefinition} from 'vuetify'

/**
 * 照 Auto_Bangumi 自己那套 CSS 变量搬过来（webui/src/style/var.scss）。
 *
 * 它管这套叫 Soft Ink：控件平时是**填充无边框**的，只有聚焦时才长出主色描边 ——
 * 所以下面输入类一律 solo-filled + flat，不是 outlined。写成 outlined 的话
 * 一屏全是灰框，AB 那种「安静到只剩底色」的观感立刻就没了。
 */
/*
 * 文字色必须显式给。
 *
 * 不给的话 Vuetify 按底色自动挑黑或白 —— 亮色下就是纯黑 #000，暗色下是纯白 #fff。
 * AB 用的是石板灰 #1E293B / #F1F5F9，差的不只是那一点色相：
 * 次要文字、分割线、hover 底色、图标的弱化态全都是 `rgba(on-surface, x)` 算出来的，
 * 挑错一次，整屏的灰阶跟着一起偏 —— 表现就是「对比度过头，看着比原版硬」。
 */
export const light: ThemeDefinition = {
    dark: false,
    colors: {
        background: '#fafafa', surface: '#ffffff', 'surface-variant': '#f1f4f8',
        primary: '#6c4ab6', secondary: '#64748b', success: '#22c55e',
        warning: '#f59e0b', error: '#ef4444', info: '#64748b',
        'on-background': '#1e293b', 'on-surface': '#1e293b', 'on-surface-variant': '#1e293b',
        'on-primary': '#ffffff', 'on-secondary': '#ffffff', 'on-error': '#ffffff',
    },
}

export const dark: ThemeDefinition = {
    dark: true,
    colors: {
        background: '#0f172a', surface: '#1e293b', 'surface-variant': '#26334a',
        primary: '#8b6cc7', secondary: '#94a3b8', success: '#4ade80',
        warning: '#fbbf24', error: '#f87171', info: '#94a3b8',
        'on-background': '#f1f5f9', 'on-surface': '#f1f5f9', 'on-surface-variant': '#f1f5f9',
        'on-primary': '#ffffff', 'on-secondary': '#0f172a', 'on-error': '#0f172a',
    },
}

export const defaults = {
    /* AB 的输入框：#f1f4f8 填充、没有描边、聚焦才出主色框（那条框在 preset.css 里接）。
       density 用 compact —— 原版桌面端输入框只有 30~36px 高，comfortable 会高出一截 */
    VTextField: {variant: 'solo-filled' as const, density: 'compact' as const, hideDetails: 'auto' as const, flat: true},
    VCombobox: {variant: 'solo-filled' as const, density: 'compact' as const, hideDetails: 'auto' as const, flat: true},
    VFileInput: {variant: 'solo-filled' as const, density: 'compact' as const, hideDetails: 'auto' as const, flat: true},
    VSelect: {variant: 'solo-filled' as const, density: 'compact' as const, hideDetails: 'auto' as const, flat: true},
    VTextarea: {variant: 'solo-filled' as const, density: 'compact' as const, hideDetails: 'auto' as const, flat: true},
    VNumberInput: {variant: 'solo-filled' as const, density: 'compact' as const, hideDetails: 'auto' as const},
    /* 按钮不投影：AB 的层级来自 1px 描边 + 填充色，不来自抬起 */
    VBtn: {variant: 'flat' as const, elevation: 0},
    VCard: {elevation: 0},
    VChip: {variant: 'outlined' as const},
}
