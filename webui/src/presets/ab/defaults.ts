import type {ThemeDefinition} from 'vuetify'

/**
 * 照 Auto_Bangumi 自己那套 CSS 变量搬过来（webui/src/style/var.scss）。
 *
 * 它管这套叫 Soft Ink：控件平时是**填充无边框**的，只有聚焦时才长出主色描边 ——
 * 所以下面输入类一律 solo-filled + flat，不是 outlined。写成 outlined 的话
 * 一屏全是灰框，AB 那种「安静到只剩底色」的观感立刻就没了。
 */
export const light: ThemeDefinition = {
    dark: false,
    colors: {
        background: '#fafafa', surface: '#ffffff', 'surface-variant': '#f1f4f8',
        primary: '#6c4ab6', secondary: '#64748b', success: '#22c55e',
        warning: '#f59e0b', error: '#ef4444', info: '#64748b',
    },
}

export const dark: ThemeDefinition = {
    dark: true,
    colors: {
        background: '#0f172a', surface: '#1e293b', 'surface-variant': '#26334a',
        primary: '#8b6cc7', secondary: '#94a3b8', success: '#4ade80',
        warning: '#fbbf24', error: '#f87171', info: '#94a3b8',
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
