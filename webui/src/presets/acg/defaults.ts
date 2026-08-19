import type {ThemeDefinition} from 'vuetify'

/**
 * 壁纸打底的界面，所有面板都得半透明 —— 不透的话壁纸只剩四条边，白铺了。
 * 透明度本身由主题的 --ani-surface-alpha 控制，这里只管形状和密度。
 */
export const light: ThemeDefinition = {
    dark: false,
    colors: {
        background: '#e9eefb', surface: '#ffffff', 'surface-variant': '#dde5f6',
        primary: '#2657bf', secondary: '#525e77', success: '#2f6849',
        warning: '#795714', error: '#b12424', info: '#525e77',
    },
}

export const dark: ThemeDefinition = {
    dark: true,
    colors: {
        background: '#0f1420', surface: '#18202e', 'surface-variant': '#232c3d',
        primary: '#7fa9ff', secondary: '#9aa8bf', success: '#66c894',
        warning: '#e8b955', error: '#ef8181', info: '#9aa8bf',
    },
}

export const defaults = {
    VTextField: {variant: 'solo-filled' as const, density: 'comfortable' as const, hideDetails: 'auto' as const, flat: true, rounded: 'pill'},
    VSelect: {variant: 'solo-filled' as const, density: 'comfortable' as const, hideDetails: 'auto' as const, flat: true, rounded: 'pill'},
    VTextarea: {variant: 'solo-filled' as const, density: 'comfortable' as const, hideDetails: 'auto' as const, flat: true},
    VNumberInput: {variant: 'solo-filled' as const, density: 'comfortable' as const, hideDetails: 'auto' as const},
    VBtn: {variant: 'flat' as const, rounded: 'pill'},
    VCard: {rounded: 'lg'},
    VChip: {rounded: 'pill'},
}
