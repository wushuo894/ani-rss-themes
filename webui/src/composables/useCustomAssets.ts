import {watch} from 'vue'
import {customCssUrl, customJsUrl} from '@shared/api'
import {usePrefsStore} from '@/stores/prefs'

const CSS_ID = 'ani-custom-css'

/**
 * 按需加载 ani-rss「自定义 CSS/JS」框里的内容。
 *
 * CSS 可以随开关来回切；JS 只加载一次且**不可撤销** —— 脚本一旦执行过，
 * 它注册的事件、定时器、全局变量不会因为移除 <script> 标签而消失，
 * 所以关掉开关只是不再加载，已经跑过的那次要刷新页面才干净。这一点在设置里说明了。
 */
export function useCustomAssets() {
    const prefs = usePrefsStore()
    let jsLoaded = false

    watch(() => prefs.loadCustomAssets, on => {
        const existing = document.getElementById(CSS_ID)
        if (!on) {
            existing?.remove()
            return
        }

        if (!existing) {
            const link = document.createElement('link')
            link.id = CSS_ID
            link.rel = 'stylesheet'
            link.href = customCssUrl()
            document.head.appendChild(link)
        }

        if (!jsLoaded) {
            jsLoaded = true
            const s = document.createElement('script')
            s.type = 'module'
            s.src = customJsUrl()
            document.head.appendChild(s)
        }
    }, {immediate: true})
}
