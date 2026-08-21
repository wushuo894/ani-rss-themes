import {createRouter, createWebHashHistory, type RouteRecordRaw} from 'vue-router'
import {getToken} from '@shared/http'
import meta from '@preset/meta'

/**
 * 订阅页与总览页的挂法随预设变：
 * 带总览的界面，根路径是总览、订阅在 /subscriptions；
 * 不带总览的（github 那款走的是「打开就干活」的路子），根路径直接就是订阅列表。
 * 总览页本身也是每款自己一份 —— 它是四款界面的落地页，共用一份的话
 * 「六款不同界面」有一半时间看的是同一个屏幕。
 * 两种情况下订阅页的 name 都是 subscriptions —— 外壳靠这个名字判断要不要显示搜索框。
 */
const subs = () => import('@preset/SubsView.vue')
const dash = () => import('@preset/DashboardView.vue')

const children: RouteRecordRaw[] = meta.dashboard
    ? [
        {path: '', name: 'dashboard', component: dash},
        {path: 'subscriptions', name: 'subscriptions', component: subs},
    ]
    : [{path: '', name: 'subscriptions', component: subs}]

/**
 * 离开某一页时记下它滚到哪儿了。
 *
 * 页面组件本身在 keep-alive 里，切回来 DOM 是原样的，但滚动条属于窗口不属于组件 ——
 * 不记的话回到订阅页会从头开始，翻了半天的位置白翻。按路由名存，
 * 设置页换标签（路径变、名字不变）不会被当成两页。
 */
const scrollTops = new Map<string, number>()

/**
 * 必须是 hash 路由。
 *
 * 上游 WebMvcConfig 把 webui 目录挂成静态资源目录，registry.addResourceHandler("/**")
 * 只按路径找真实文件，没有 SPA fallback —— 直接访问 /settings 或在该路径刷新一律 404。
 * 换成 #/settings 就永远只请求 index.html，服务端不需要任何配合。
 */
const router = createRouter({
    history: createWebHashHistory(),

    scrollBehavior(to, _from, savedPosition) {
        return savedPosition ?? {top: scrollTops.get(String(to.name)) ?? 0}
    },

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
            // 播放页整屏铺开，不套 MainLayout —— webplayer 自带完整界面，
            // 外面再包一层抽屉和顶栏只会挤掉它的空间
            path: '/play',
            name: 'play',
            component: () => import('@/views/PlayerView.vue'),
        },
        {
            path: '/',
            component: () => import('@preset/Shell.vue'),
            children: [
                ...children,
                {path: 'downloads', name: 'downloads', component: () => import('@/views/DownloadsView.vue')},
                {path: 'logs', name: 'logs', component: () => import('@/views/LogsView.vue')},
                {path: 'settings/:tab?', name: 'settings', component: () => import('@/views/SettingsView.vue')},
            ],
        },
        // 没有兜底就会白屏
        {path: '/:pathMatch(.*)*', redirect: '/'},
    ],
})

router.beforeEach((to, from) => {
    scrollTops.set(String(from.name), window.scrollY)
    if (to.meta.public) return true
    if (getToken()) return true
    // 记住原本要去哪，登录后送回去
    return {name: 'login', query: to.fullPath === '/' ? {} : {redirect: to.fullPath}}
})

export default router
