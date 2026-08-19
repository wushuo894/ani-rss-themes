import {watch} from 'vue'
import {useTheme} from 'vuetify'
import {applyTheme} from '@shared/themes/apply'
import {THEME_MAP} from '@shared/themes/registry'
import {usePrefsStore} from '@/stores/prefs'

/**
 * 主题总管：把「选了哪款主题」+「当前明暗」翻译成 Vuetify 的主题名和一层装饰 CSS。
 *
 * 分两条路是有原因的：配色必须交给 Vuetify（它要据此推算 on-surface 这类前景色），
 * 而字体、圆角、背景 Vuetify 管不到，只能走 CSS 变量和注入样式。
 */
export function useThemeManager() {
    const theme = useTheme()
    const prefs = usePrefsStore()

    function sync() {
        const def = prefs.themeId ? THEME_MAP.get(prefs.themeId) : undefined

        if (!def) {
            // 没选主题：回到内置的 light / dark
            applyTheme(null)
            document.documentElement.removeAttribute('data-ani-wallpaper')
            theme.change(prefs.resolved)
            return
        }

        /*
         * 有些主题只在一个方向成立（透明度是按一个方向调的，反过来会糊），
         * 这时忽略用户的明暗选择，强制用它成立的那一套 —— 上游那 17 款里有 7 款是这样。
         */
        const mode = def.base === 'auto' ? prefs.resolved : def.base
        const colors = mode === 'dark' ? def.dark : def.light
        const name = `ani-${def.id}-${mode}`

        if (colors) {
            /*
             * 在内置主题之上合并，而不是新造一份：
             * Vuetify 的 Colors 有十几个必填键（on-surface、surface-bright 等大多是它自己算的），
             * 主题只声明关心的那几个，其余原样继承，缺键不会导致组件取到 undefined。
             */
            const inherited = theme.themes.value[mode]
            theme.themes.value[name] = {
                ...inherited,
                dark: mode === 'dark',
                colors: {...inherited.colors, ...colors},
            }
            theme.change(name)
        } else {
            theme.change(mode)
        }

        applyTheme(def)
        // 带壁纸的主题要让 Vuetify 的应用底色让位，否则背景被整块盖住
        if (def.remote) document.documentElement.setAttribute('data-ani-wallpaper', '')
        else document.documentElement.removeAttribute('data-ani-wallpaper')
    }

    watch(() => [prefs.themeId, prefs.resolved], sync, {immediate: true})
}
