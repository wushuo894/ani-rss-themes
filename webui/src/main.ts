import {createApp} from 'vue'
import {createPinia} from 'pinia'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import '@shared/themes/base.css'
import './styles/motion.css'
import './styles/spacing.css'
import './styles/touch.css'

/*
 * 演示构建（GitHub Pages 预览）在挂载前把 fetch 换成假服务端。
 * 用动态 import：__DEMO__ 是构建期常量，正式产物里这个分支和整个 demo/ 目录一起被摇掉。
 */
if (__DEMO__) {
    const {installDemo} = await import('./demo')
    installDemo()
}

createApp(App).use(createPinia()).use(router).use(vuetify).mount('#app')

/*
 * 首屏画完之后趁空把其余几页的代码块拉下来。
 *
 * 路由是按页切块的，不预热的话点「设置」那一下才现下 45KB —— 本地看不出来，
 * 走反代或者外网就是明显一顿。浏览器缓存里已经有了，路由再 import 时直接命中。
 * requestIdleCallback 保证这件事排在首屏渲染和首批接口请求后面，不跟它们抢。
 */
const warmRoutes = () => {
    void import('@preset/SubsView.vue')
    void import('@/views/SettingsView.vue')
    void import('@/views/DownloadsView.vue')
    void import('@/views/LogsView.vue')

    /*
     * 顺带把 Service Worker 装上：装到主屏之后，后端没起来或者网不好时还能把界面打开。
     *
     * 挂在这儿而不是自己监听 window 的 load —— 演示构建里这个模块带顶层 await
     * （要先换掉 fetch 再挂载），异步模块的执行时机可能已经在 load 之后，
     * 那时候再 addEventListener('load') 是永远等不到的。
     * 空闲回调没有这个先后问题，而且预缓存那几个文件也该排在首屏后面。
     *
     * 只在正式产物里装：dev server 下 SW 会把模块缓存住，改一行要清一次缓存。
     * 失败一律吞掉 —— 局域网 IP 直连是明文 http，SW 在那儿根本不可用，
     * 网页本身是好的，不该在控制台里刷红字。
     */
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
        void navigator.serviceWorker.register('./sw.js').catch(() => {})
    }
}
if ('requestIdleCallback' in window) requestIdleCallback(warmRoutes, {timeout: 4000})
else setTimeout(warmRoutes, 2000)
