import {createRouter, createWebHashHistory} from 'vue-router'
import {getToken} from '@shared/http'

/**
 * 必须是 hash 路由。
 *
 * 上游 WebMvcConfig 把 webui 目录挂成静态资源目录，registry.addResourceHandler("/**")
 * 只按路径找真实文件，没有 SPA fallback —— 直接访问 /settings 或在该路径刷新一律 404。
 * 换成 #/settings 就永远只请求 index.html，服务端不需要任何配合。
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
            // Bangumi 授权回调：上游是独立页面，这里做成免登录路由
            path: '/bgm-callback',
            name: 'bgm-callback',
            component: () => import('@/views/BgmCallbackView.vue'),
            meta: {public: true},
        },
        {
            path: '/',
            component: () => import('@/layouts/MainLayout.vue'),
            children: [
                {path: '', name: 'dashboard', component: () => import('@/views/DashboardView.vue')},
                {path: 'subscriptions', name: 'subscriptions', component: () => import('@/views/SubscriptionsView.vue')},
                {path: 'downloads', name: 'downloads', component: () => import('@/views/DownloadsView.vue')},
                {path: 'logs', name: 'logs', component: () => import('@/views/LogsView.vue')},
                {path: 'settings/:tab?', name: 'settings', component: () => import('@/views/SettingsView.vue')},
            ],
        },
        // 没有兜底就会白屏
        {path: '/:pathMatch(.*)*', redirect: '/'},
    ],
})

router.beforeEach(to => {
    if (to.meta.public) return true
    if (getToken()) return true
    // 记住原本要去哪，登录后送回去
    return {name: 'login', query: to.fullPath === '/' ? {} : {redirect: to.fullPath}}
})

export default router
