import type {ThemeDefinition} from 'vuetify'

/**
 * VitePress 的观感：几乎没有阴影，全靠 1px 细线和留白分层，正文有最大宽度。
 */
export const light: ThemeDefinition = {
    dark: false,
    colors: {
        background: '#ffffff', surface: '#ffffff', 'surface-variant': '#f6f6f7',
        primary: '#2b7352', secondary: '#35495e', success: '#2a7453',
        warning: '#9b5505', error: '#c12a1d', info: '#3451b2',
    },
}

export const dark: ThemeDefinition = {
    dark: true,
    colors: {
        background: '#1b1b1f', surface: '#202127', 'surface-variant': '#2e2e32',
        primary: '#42d392', secondary: '#647eff', success: '#42d392',
        warning: '#f0b429', error: '#f66f81', info: '#a8b1ff',
    },
}

export const defaults = {
    VTextField: {variant: 'outlined' as const, density: 'comfortable' as const, hideDetails: 'auto' as const},
    VSelect: {variant: 'outlined' as const, density: 'comfortable' as const, hideDetails: 'auto' as const},
    VTextarea: {variant: 'outlined' as const, density: 'comfortable' as const, hideDetails: 'auto' as const},
    VNumberInput: {variant: 'outlined' as const, density: 'comfortable' as const, hideDetails: 'auto' as const},
    VBtn: {variant: 'flat' as const, rounded: 'lg'},
    VCard: {rounded: 'lg', flat: true, border: true},
    VChip: {rounded: 'lg'},
}
