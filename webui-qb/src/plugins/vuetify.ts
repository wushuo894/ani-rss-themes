import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import {createVuetify, type ThemeDefinition} from 'vuetify'

/**
 * qb 版的视觉基调。
 *
 * 与 vt 版共用同一套状态层和弹窗，差别全在这里和布局上：
 * qb-web 的路子是「工程化优先」——密度更高、控件更朴素、表格是主角，
 * 所以这里把全局默认密度压到 compact、输入框从 outlined 换成 filled，
 * 一处改动就让整个 app 换一种气质，不必逐个组件调。
 */
const light: ThemeDefinition = {
    dark: false,
    colors: {
        background: '#eef0f2',   // 比 vt 更冷一点的灰，衬托白色表格
        surface: '#ffffff',
        'surface-variant': '#e2e6ea',
        primary: '#1976d2',      // qb-web 用的是 Vuetify 2 的经典蓝
        secondary: '#424242',
        success: '#4caf50',
        warning: '#fb8c00',
        error: '#ff5252',
        info: '#2196f3',
    },
}

const dark: ThemeDefinition = {
    dark: true,
    colors: {
        background: '#121212',
        surface: '#1e1e1e',
        'surface-variant': '#2a2a2a',
        primary: '#2196f3',
        secondary: '#a0a0a0',
        success: '#4caf50',
        warning: '#fb8c00',
        error: '#ff5252',
        info: '#2196f3',
    },
}

export default createVuetify({
    theme: {
        defaultTheme: 'dark',
        themes: {light, dark},
    },
    defaults: {
        global: {density: 'compact'},
        VTextField: {variant: 'filled', density: 'compact', hideDetails: 'auto'},
        VSelect: {variant: 'filled', density: 'compact', hideDetails: 'auto'},
        VTextarea: {variant: 'filled', density: 'compact', hideDetails: 'auto'},
        VCombobox: {variant: 'filled', density: 'compact', hideDetails: 'auto'},
        VFileInput: {variant: 'filled', density: 'compact'},
        VBtn: {variant: 'text'},
        VCard: {rounded: 'sm'},
        VDataTable: {density: 'compact'},
        VList: {density: 'compact'},
    },
})
