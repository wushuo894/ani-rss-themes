import type {ThemeDefinition} from 'vuetify'

/** 全胶囊：按钮、输入框、chip 一律 999 圆角，卡片 22px —— WWDC25 那套形状语言 */
export const light: ThemeDefinition = {
    dark: false,
    colors: {
        background: '#eceaf6', surface: '#ffffff', 'surface-variant': '#e3e0f2',
        primary: '#5e5ce6', secondary: '#64d2ff', success: '#34c759',
        warning: '#ff9f0a', error: '#ff3b30', info: '#64d2ff',
    },
}

export const dark: ThemeDefinition = {
    dark: true,
    colors: {
        background: '#0d0d14', surface: '#17171f', 'surface-variant': '#22222e',
        primary: '#7d7aff', secondary: '#64d2ff', success: '#32d74b',
        warning: '#ffd60a', error: '#ff453a', info: '#64d2ff',
    },
}

export const defaults = {
    VTextField: {variant: 'solo-filled' as const, density: 'comfortable' as const, hideDetails: 'auto' as const, flat: true, rounded: 'pill'},
    VSelect: {variant: 'solo-filled' as const, density: 'comfortable' as const, hideDetails: 'auto' as const, flat: true, rounded: 'pill'},
    VTextarea: {variant: 'solo-filled' as const, density: 'comfortable' as const, hideDetails: 'auto' as const, flat: true},
    VNumberInput: {variant: 'solo-filled' as const, density: 'comfortable' as const, hideDetails: 'auto' as const},
    VBtn: {variant: 'flat' as const, rounded: 'pill'},
    VCard: {rounded: 'xl', flat: true},
    VChip: {rounded: 'pill'},
}
