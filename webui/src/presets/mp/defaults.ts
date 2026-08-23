import type {ThemeDefinition} from 'vuetify'

/**
 * 色值来自 MoviePilot-Frontend 的 src/plugins/vuetify/theme.ts。
 *
 * 深色这套取的是它的 **purple**（那是 defaultTheme，不是它那个叫 dark 的皮肤）——
 * 紫底 #28243D + 紫面 #312D4B 才是打开 MoviePilot 看到的样子；
 * 它的 dark 皮肤是近黑的 #0E1116，拿那个当默认，一眼认不出是 MP。
 *
 * on-primary 显式钉成白色：#8D51F9 上白字是 4.5:1、黑字 4.7:1，Vuetify 会挑黑的，
 * 而 MP 自己四套皮肤全都写死了 'on-primary': '#FFFFFF'。这一处按原版走。
 */
export const light: ThemeDefinition = {
    dark: false,
    colors: {
        background: '#f4f5fa', surface: '#ffffff', 'surface-variant': '#f0f2f8',
        primary: '#8d51f9', secondary: '#8a8d93', success: '#56ca00',
        warning: '#ffb400', error: '#ff4c51', info: '#16b1ff',
        'on-background': '#3a3541', 'on-surface': '#3a3541',
        'on-primary': '#ffffff', 'on-secondary': '#ffffff',
        'on-success': '#ffffff', 'on-warning': '#ffffff',
    },
}

export const dark: ThemeDefinition = {
    dark: true,
    colors: {
        background: '#28243d', surface: '#312d4b', 'surface-variant': '#3d3759',
        primary: '#8d51f9', secondary: '#8a8d93', success: '#56ca00',
        warning: '#ffb400', error: '#ff4c51', info: '#16b1ff',
        'on-background': '#e7e3fc', 'on-surface': '#e7e3fc',
        'on-primary': '#ffffff', 'on-secondary': '#ffffff',
        'on-success': '#ffffff', 'on-warning': '#ffffff',
    },
}

export const defaults = {
    /* Materio 的输入框是 outlined + 12px 圆角，密度紧凑 */
    VTextField: {variant: 'outlined' as const, density: 'compact' as const, hideDetails: 'auto' as const, color: 'primary'},
    VCombobox: {variant: 'outlined' as const, density: 'compact' as const, hideDetails: 'auto' as const, color: 'primary'},
    VFileInput: {variant: 'outlined' as const, density: 'compact' as const, hideDetails: 'auto' as const, color: 'primary'},
    VSelect: {variant: 'outlined' as const, density: 'compact' as const, hideDetails: 'auto' as const, color: 'primary'},
    VTextarea: {variant: 'outlined' as const, density: 'compact' as const, hideDetails: 'auto' as const, color: 'primary'},
    VNumberInput: {variant: 'outlined' as const, density: 'compact' as const, hideDetails: 'auto' as const},
    /*
     * 按钮默认就是主色 —— MP 的 defaults.ts 里写的就是 color: 'primary'、elevation: 0。
     * 于是没指定颜色的 text / tonal 按钮（各弹窗的「取消」都是 text）跟着染成紫色，
     * 这正是 MP 那种「整屏只有一个强调色」的观感；要红要绿的地方本来就显式写了 color。
     */
    VBtn: {color: 'primary', elevation: 0},
    VCard: {elevation: 0},
    VList: {color: 'primary'},
}
