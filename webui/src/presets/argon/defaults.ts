import type {ThemeDefinition} from 'vuetify'

/**
 * Argon 的控件默认值：大圆角、药丸按钮、填充式输入框、不给硬边框。
 *
 * 输入框用 solo-filled 而不是 outlined：这一款的分隔靠「一块浅灰底 + 大圆角」，
 * 全站找不到第二根 1px 的线；outlined 一上来就是一圈描边，和卡片的柔和边缘打架。
 * 按钮一律 pill —— Argon 里从「阅读全文」到标签云全是胶囊，方角按钮会立刻显得不是这一款。
 */
export const light: ThemeDefinition = {
    dark: false,
    colors: {
        background: '#f5f6f7', surface: '#ffffff', 'surface-variant': '#eef0f3',
        primary: '#0084ff', secondary: '#5a6a7a', success: '#00a06b',
        warning: '#b06f00', error: '#d64545', info: '#3f7fd0',
    },
}

/**
 * 深色不是把浅色反过来，用的是 One Dark 那组灰蓝 —— Argon 的暗色模式就是照它来的，
 * 纯黑底会让大圆角卡片的边缘整个消失（卡和背景都是黑的，只剩阴影，而阴影在黑底上看不见）。
 */
export const dark: ThemeDefinition = {
    dark: true,
    colors: {
        background: '#21252b', surface: '#282c34', 'surface-variant': '#31363f',
        primary: '#4da3ff', secondary: '#9aa6b2', success: '#4fd396',
        warning: '#e5c07b', error: '#e06c75', info: '#61afef',
    },
}

export const defaults = {
    global: {density: 'comfortable' as const},
    VTextField: {variant: 'solo-filled' as const, flat: true, rounded: 'lg' as const, hideDetails: 'auto' as const},
    /* VCombobox / VFileInput 跟着 VTextField 走。
       不写的话它们用的是 Vuetify 的出厂默认 variant: 'filled' —— 于是「匹配」「排除」
       这几栏在任何一款界面里都是同一副填充底 + 悬停变色的样子，
       跟旁边所有输入框都不一样，还平白多出一层 hover 底色。 */
    VCombobox: {variant: 'solo-filled' as const, flat: true, rounded: 'lg' as const, hideDetails: 'auto' as const},
    VFileInput: {variant: 'solo-filled' as const, flat: true, rounded: 'lg' as const, hideDetails: 'auto' as const},
    VSelect: {variant: 'solo-filled' as const, flat: true, rounded: 'lg' as const, hideDetails: 'auto' as const},
    VTextarea: {variant: 'solo-filled' as const, flat: true, rounded: 'lg' as const, hideDetails: 'auto' as const},
    VNumberInput: {variant: 'solo-filled' as const, flat: true, rounded: 'lg' as const, hideDetails: 'auto' as const},
    VBtn: {variant: 'flat' as const, rounded: 'pill' as const},
    /* 卡片不写 rounded：Vuetify 的 xl 是 24px，而 Argon 的卡是 15px 上下。
       不给这个属性，圆角就落回皮肤的 --ani-radius（16px），换皮肤时也跟着走 */
    VCard: {flat: true},
    VChip: {rounded: 'pill' as const, size: 'small' as const},
    VList: {rounded: 'lg' as const},
    VDialog: {transition: 'dialog-bottom-transition'},
}
