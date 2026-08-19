import type {ThemeDefinition} from 'vuetify'

/** M3 基线配色（Material Theme Builder 的默认种子 #6750A4） */
export const light: ThemeDefinition = {
    dark: false,
    colors: {
        background: '#fef7ff', surface: '#fffbfe', 'surface-variant': '#e7e0ec',
        primary: '#6750a4', secondary: '#625b71', success: '#386a20',
        warning: '#7d5260', error: '#b3261e', info: '#49454f',
    },
}

export const dark: ThemeDefinition = {
    dark: true,
    colors: {
        background: '#1c1b1f', surface: '#211f26', 'surface-variant': '#49454f',
        primary: '#d0bcff', secondary: '#ccc2dc', success: '#b7f397',
        warning: '#efb8c8', error: '#f2b8b5', info: '#cac4d0',
    },
}

export const defaults = {
    /* M3 的输入框就是 filled，圆角只在上面两个角 —— Vuetify 的 filled 正好是这个形 */
    VTextField: {variant: 'filled' as const, density: 'comfortable' as const, hideDetails: 'auto' as const},
    VSelect: {variant: 'filled' as const, density: 'comfortable' as const, hideDetails: 'auto' as const},
    VTextarea: {variant: 'filled' as const, density: 'comfortable' as const, hideDetails: 'auto' as const},
    VNumberInput: {variant: 'filled' as const, density: 'comfortable' as const, hideDetails: 'auto' as const},
    VBtn: {variant: 'flat' as const, rounded: 'pill'},
    VCard: {rounded: 'xl', flat: true},
    VChip: {rounded: 'md'},
}
