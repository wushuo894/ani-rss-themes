import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import {createVuetify, type ThemeDefinition} from 'vuetify'

/**
 * 主题。
 *
 * 这里只定义 Vuetify 认识的那部分（颜色）。字体、圆角、背景图这些 Vuetify 管不了的，
 * 由 themes/<name>.css 用 CSS 变量补——两层加起来才是一款完整主题。
 * 之所以拆两层：颜色要参与 Vuetify 的对比度计算（on-surface 之类是算出来的），
 * 必须交给它；其余的交给它反而会被编译进产物，改一次要重新构建。
 */
const light: ThemeDefinition = {
    dark: false,
    colors: {
        background: '#f5f6f8',
        surface: '#ffffff',
        'surface-variant': '#e9ecf1',
        primary: '#409eff',   // 跟 Element Plus 默认主色对齐，从旧界面切过来不突兀
        secondary: '#66b1ff',
        success: '#67c23a',
        warning: '#e6a23c',
        error: '#f56c6c',
        info: '#909399',
    },
}

const dark: ThemeDefinition = {
    dark: true,
    colors: {
        background: '#14161a',
        surface: '#1c1f26',
        'surface-variant': '#262a33',
        primary: '#409eff',
        secondary: '#66b1ff',
        success: '#67c23a',
        warning: '#e6a23c',
        error: '#f56c6c',
        info: '#909399',
    },
}

export default createVuetify({
    theme: {
        // 初值随便给一个，真正的取值在 stores/prefs.ts 里按 localStorage + 系统偏好定
        defaultTheme: 'dark',
        themes: {light, dark},
    },
    defaults: {
        VTextField: {variant: 'outlined', density: 'comfortable', hideDetails: 'auto'},
        VSelect: {variant: 'outlined', density: 'comfortable', hideDetails: 'auto'},
        VTextarea: {variant: 'outlined', density: 'comfortable', hideDetails: 'auto'},
        VNumberInput: {variant: 'outlined', density: 'comfortable', hideDetails: 'auto'},
        VBtn: {variant: 'flat'},
        VCard: {rounded: 'lg'},
    },
})
