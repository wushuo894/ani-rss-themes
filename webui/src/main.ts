import {createApp} from 'vue'
import {createPinia} from 'pinia'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import '@shared/themes/base.css'
import './styles/motion.css'

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
}
if ('requestIdleCallback' in window) requestIdleCallback(warmRoutes, {timeout: 4000})
else setTimeout(warmRoutes, 2000)
