import type {ThemeDefinition} from 'vuetify'

/**
 * Win98 的控件默认值：一律方角、紧凑、不带阴影。
 *
 * 输入框用 filled 而不是 outlined —— outlined 的浮动标签是骑在边框缺口上的，
 * 而这一款的输入框要画成「下沉的白盒子」，边框一去掉，标签就悬在盒子上沿半截，
 * 看着像没对齐。filled 把标签收进盒子里，怎么改边框都不会打架。
 */
export const light: ThemeDefinition = {
    dark: false,
    colors: {
        /* 银灰是 Win98 的底色，不是背景色 —— 桌面那片青绿由预设自己画（见 Shell.vue），
           这里给银灰，别的预设选了这款皮肤也能得到一整片「对话框脸」而不是刺眼的青绿 */
        background: '#c0c0c0', surface: '#c0c0c0', 'surface-variant': '#dfdfdf',
        primary: '#000080', secondary: '#808080', success: '#008000',
        warning: '#808000', error: '#800000', info: '#000080',
        'on-background': '#000000', 'on-surface': '#000000',
    },
}

/**
 * Win98 没有深色模式。但预设和皮肤是两层：有人用这套外壳配别的皮肤，
 * 或者干脆不选皮肤，那时候 Vuetify 还是要一套深色值。
 * 照「高对比度黑」那套配色给，至少还是同一个年代的东西。
 */
export const dark: ThemeDefinition = {
    dark: true,
    colors: {
        background: '#3a3a3a', surface: '#3a3a3a', 'surface-variant': '#4a4a4a',
        primary: '#a0a0ff', secondary: '#a0a0a0', success: '#40c040',
        warning: '#d0c040', error: '#ff8080', info: '#a0a0ff',
    },
}

export const defaults = {
    global: {density: 'compact' as const},
    VTextField: {variant: 'filled' as const, density: 'compact' as const, hideDetails: 'auto' as const},
    VSelect: {variant: 'filled' as const, density: 'compact' as const, hideDetails: 'auto' as const},
    VTextarea: {variant: 'filled' as const, density: 'compact' as const, hideDetails: 'auto' as const},
    VNumberInput: {variant: 'filled' as const, density: 'compact' as const, hideDetails: 'auto' as const},
    VBtn: {variant: 'flat' as const, rounded: '0'},
    VCard: {rounded: '0', flat: true},
    VChip: {rounded: '0', size: 'small' as const},
    VList: {density: 'compact' as const},
    VDialog: {transition: false},
}
