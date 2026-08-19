import type {ThemeDefinition} from 'vuetify'

/** Primer：小圆角、细边、几乎不用阴影，按钮是「有边框的浅底」而不是实心块 */
export const light: ThemeDefinition = {
    dark: false,
    colors: {
        background: '#f6f8fa', surface: '#ffffff', 'surface-variant': '#eaeef2',
        primary: '#0969da', secondary: '#57606a', success: '#1a7f37',
        warning: '#9a6700', error: '#cf222e', info: '#57606a',
    },
}

export const dark: ThemeDefinition = {
    dark: true,
    colors: {
        background: '#0d1117', surface: '#161b22', 'surface-variant': '#21262d',
        primary: '#4493f8', secondary: '#8b949e', success: '#3fb950',
        warning: '#d29922', error: '#f85149', info: '#8b949e',
    },
}

export const defaults = {
    global: {density: 'comfortable' as const},
    VTextField: {variant: 'outlined' as const, density: 'compact' as const, hideDetails: 'auto' as const},
    VSelect: {variant: 'outlined' as const, density: 'compact' as const, hideDetails: 'auto' as const},
    VTextarea: {variant: 'outlined' as const, density: 'compact' as const, hideDetails: 'auto' as const},
    VNumberInput: {variant: 'outlined' as const, density: 'compact' as const, hideDetails: 'auto' as const},
    VBtn: {variant: 'outlined' as const, rounded: 'md'},
    VCard: {rounded: 'md', flat: true, border: true},
    VChip: {rounded: 'pill', size: 'small' as const},
    VList: {density: 'compact' as const},
}
