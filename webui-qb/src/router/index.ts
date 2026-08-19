import {createRouter, createWebHashHistory} from 'vue-router'
import {getToken} from '@shared/http'

/**
 * 必须是 hash 路由。
 *
 * 上游 WebMvcConfig 把 webui 目录挂成静态资源目录，registry.addResourceHandler("/**")
 * 只按路径找真实文件，没有 SPA fallback —— 直接访问 /settings 或在该路径刷新一律 404。
 * 换成 #/settings 就永远只请求 index.html，服务端不需要任何配合。
 *
 * 与 vt 版的差别：qb 版没有总览页，进来直接是订阅列表 —— qb-web 就是这个路子，
 * 打开就干活，不先看一屏统计。
 */
const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        {
            path: '/login',
            name: 'login',
            component: () => import('@/views/LoginView.vue'),
            meta: {public: true},
        },
        {
            path: '/bgm-callback',
            name: 'bgm-callback',
            component: () => import('@/views/BgmCallbackView.vue'),
            meta: {public: true},
        },
        {
            // 播放页整屏铺开，不套 MainLayout —— webplayer 自带完整界面，
            // 外面再包一层抽屉和顶栏只会挤掉它的空间
            path: '/play',
            name: 'play',
            component: () => import('@/views/PlayerView.vue'),
        },
        {
            path: '/',
            component: () => import('@/layouts/MainLayout.vue'),
            children: [
                {path: '', name: 'subscriptions', component: () => import('@/views/SubscriptionsView.vue')},
                {path: 'downloads', name: 'downloads', component: () => import('@/views/DownloadsView.vue')},
                {path: 'logs', name: 'logs', component: () => import('@/views/LogsView.vue')},
                {path: 'settings/:tab?', name: 'settings', component: () => import('@/views/SettingsView.vue')},
            ],
        },
        {path: '/:pathMatch(.*)*', redirect: '/'},
    ],
})

router.beforeEach(to => {
    if (to.meta.public) return true
    if (getToken()) return true
    return {name: 'login', query: to.fullPath === '/' ? {} : {redirect: to.fullPath}}
})

export default router
