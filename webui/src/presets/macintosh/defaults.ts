import type {ThemeDefinition} from 'vuetify'

/**
 * 经典 Macintosh 的控件默认值：白底、1px 黑边、方角、紧凑。
 *
 * 输入框用 filled 而不是 outlined —— outlined 的浮动标签骑在边框缺口上，
 * 而这一款的边框是用 box-shadow 画的（不占布局），缺口做不出来，
 * 标签会悬在框上沿半截。filled 把标签收进框里，怎么改边框都不会打架。
 * 这条和 win98 一样，不是抄：两款的边框都不是真 border，毛病也就是同一个。
 */
export const light: ThemeDefinition = {
    dark: false,
    colors: {
        background: '#dddddd', surface: '#ffffff', 'surface-variant': '#eeeeee',
        primary: '#000000', secondary: '#666666', success: '#005522',
        warning: '#7a5c00', error: '#990000', info: '#000066',
        'on-background': '#000000', 'on-surface': '#000000',
    },
}

/**
 * 那个年代没有深色模式。但预设和皮肤是两层：有人拿这套外壳配别的皮肤，
 * 或者干脆不选皮肤，那时候 Vuetify 还是要一套深色值 —— 给一套反相的黑白，
 * 至少还是同一种语言（1 位色，只有前景和背景）。
 */
export const dark: ThemeDefinition = {
    dark: true,
    colors: {
        background: '#222222', surface: '#111111', 'surface-variant': '#333333',
        primary: '#ffffff', secondary: '#aaaaaa', success: '#7fdca0',
        warning: '#e0c46a', error: '#ff9a9a', info: '#9ab6ff',
    },
}

export const defaults = {
    global: {density: 'compact' as const},
    VTextField: {variant: 'filled' as const, density: 'compact' as const, hideDetails: 'auto' as const},
    /* VCombobox / VFileInput 跟着 VTextField 走。
       不写的话它们用的是 Vuetify 的出厂默认 variant: 'filled' —— 于是「匹配」「排除」
       这几栏在任何一款界面里都是同一副填充底 + 悬停变色的样子，
       跟旁边所有输入框都不一样，还平白多出一层 hover 底色。 */
    VCombobox: {variant: 'filled' as const, density: 'compact' as const, hideDetails: 'auto' as const},
    VFileInput: {variant: 'filled' as const, density: 'compact' as const, hideDetails: 'auto' as const},
    VSelect: {variant: 'filled' as const, density: 'compact' as const, hideDetails: 'auto' as const},
    VTextarea: {variant: 'filled' as const, density: 'compact' as const, hideDetails: 'auto' as const},
    VNumberInput: {variant: 'filled' as const, density: 'compact' as const, hideDetails: 'auto' as const},
    VBtn: {variant: 'flat' as const},
    VCard: {rounded: '0', flat: true},
    VChip: {rounded: '0', size: 'small' as const},
    VList: {density: 'compact' as const},
    /* 弹窗不做过场：这一款一帧动画都没有 —— 那个年代的窗要么在，要么不在 */
    VDialog: {transition: false},
}
