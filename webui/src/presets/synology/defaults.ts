import type {ThemeDefinition} from 'vuetify'

/**
 * DSM 的控件默认值：小圆角、描边输入框、实心主按钮 + 描边次按钮。
 *
 * 输入框用 outlined 而不是 filled —— DSM 是个管理后台，表单密度很高，
 * filled 那块灰底在一页十几个字段时会糊成一片；一圈 1px 灰边把每个字段划清楚，
 * 聚焦时整圈变蓝，这也是 DSM 自己的做法。
 *
 * 按钮不给 pill：DSM 从「套用」到「新增」全是 4px 圆角的矩形，
 * 胶囊按钮一出现就立刻不是它了。
 */
export const light: ThemeDefinition = {
    dark: false,
    colors: {
        background: '#e9edf1', surface: '#ffffff', 'surface-variant': '#f2f4f7',
        primary: '#0f6ecd', secondary: '#5a6673', success: '#2f9e54',
        warning: '#b57200', error: '#d0393e', info: '#3d84c6',
    },
}

export const dark: ThemeDefinition = {
    dark: true,
    colors: {
        background: '#1b1e22', surface: '#25282d', 'surface-variant': '#30343a',
        primary: '#4d9ee8', secondary: '#9aa4b0', success: '#4cbf72',
        warning: '#e0a94a', error: '#e56a6e', info: '#6fb0e8',
    },
}

export const defaults = {
    global: {density: 'comfortable' as const},
    VTextField: {variant: 'outlined' as const, density: 'compact' as const, hideDetails: 'auto' as const},
    /* VCombobox / VFileInput 跟着 VTextField 走。
       不写的话它们用的是 Vuetify 的出厂默认 variant: 'filled' —— 于是「匹配」「排除」
       这几栏在任何一款界面里都是同一副填充底 + 悬停变色的样子，
       跟旁边所有输入框都不一样，还平白多出一层 hover 底色。 */
    VCombobox: {variant: 'outlined' as const, density: 'compact' as const, hideDetails: 'auto' as const},
    VFileInput: {variant: 'outlined' as const, density: 'compact' as const, hideDetails: 'auto' as const},
    VSelect: {variant: 'outlined' as const, density: 'compact' as const, hideDetails: 'auto' as const},
    VTextarea: {variant: 'outlined' as const, density: 'compact' as const, hideDetails: 'auto' as const},
    VNumberInput: {variant: 'outlined' as const, density: 'compact' as const, hideDetails: 'auto' as const},
    VBtn: {variant: 'outlined' as const, rounded: 'sm' as const},
    VCard: {rounded: 'lg' as const, flat: true},
    VChip: {rounded: 'sm' as const, size: 'small' as const},
    VList: {density: 'compact' as const},
    VDialog: {transition: 'fade-transition'},
}
