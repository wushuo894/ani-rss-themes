import type {ThemeDefinition} from 'vuetify'

/** 全胶囊：按钮、输入框、chip 一律 999 圆角，卡片 22px —— WWDC25 那套形状语言 */
export const light: ThemeDefinition = {
    dark: false,
    colors: {
        background: '#eceaf6', surface: '#ffffff', 'surface-variant': '#e3e0f2',
        primary: '#4442e2', secondary: '#00618a', success: '#1c692f',
        warning: '#845000', error: '#b50a00', info: '#00618a',
    },
}

export const dark: ThemeDefinition = {
    dark: true,
    colors: {
        background: '#0d0d14', surface: '#17171f', 'surface-variant': '#22222e',
        primary: '#8d8aff', secondary: '#64d2ff', success: '#32d74b',
        warning: '#ffd60a', error: '#ff453a', info: '#64d2ff',
    },
}

export const defaults = {
    VTextField: {variant: 'solo-filled' as const, density: 'comfortable' as const, hideDetails: 'auto' as const, flat: true, rounded: 'pill'},
    /* VCombobox / VFileInput 跟着 VTextField 走。
       不写的话它们用的是 Vuetify 的出厂默认 variant: 'filled' —— 于是「匹配」「排除」
       这几栏在任何一款界面里都是同一副填充底 + 悬停变色的样子，
       跟旁边所有输入框都不一样，还平白多出一层 hover 底色。 */
    VCombobox: {variant: 'solo-filled' as const, density: 'comfortable' as const, hideDetails: 'auto' as const, flat: true, rounded: 'pill'},
    VFileInput: {variant: 'solo-filled' as const, density: 'comfortable' as const, hideDetails: 'auto' as const, flat: true, rounded: 'pill'},
    VSelect: {variant: 'solo-filled' as const, density: 'comfortable' as const, hideDetails: 'auto' as const, flat: true, rounded: 'pill'},
    VTextarea: {variant: 'solo-filled' as const, density: 'comfortable' as const, hideDetails: 'auto' as const, flat: true},
    VNumberInput: {variant: 'solo-filled' as const, density: 'comfortable' as const, hideDetails: 'auto' as const},
    VBtn: {variant: 'flat' as const, rounded: 'pill'},
    VCard: {rounded: 'xl', flat: true},
    VChip: {rounded: 'pill'},
}
