import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import {createVuetify} from 'vuetify'
import {dark, defaults, light} from '@preset/defaults'

/**
 * Vuetify 实例。
 *
 * 这里只定义 Vuetify 认识的那部分（颜色 + 组件默认值）。字体、圆角、背景图这些
 * Vuetify 管不了的，由主题（shared/themes）用 CSS 变量补——两层加起来才是完整外观。
 * 之所以拆两层：颜色要参与 Vuetify 的对比度计算（on-surface 之类是算出来的），
 * 必须交给它；其余的交给它反而会被编译进产物，改一次要重新构建。
 *
 * light / dark / defaults 三样都来自当前预设 —— 五款界面的控件密度和形状不一样，
 * 这一处换掉，整个 app 就换了一种气质，不必逐个组件调。
 */
export default createVuetify({
    theme: {
        // 初值随便给一个，真正的取值在 stores/prefs.ts 里按 localStorage + 系统偏好定
        defaultTheme: 'dark',
        themes: {light, dark},
    },
    defaults,
})
