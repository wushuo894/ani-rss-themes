import {computed} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {useDisplay} from 'vuetify'
import meta from '@preset/meta'
import {useAuthStore} from '@/stores/auth'
import {useAniStore} from '@/stores/ani'
import {useTorrentsStore} from '@/stores/torrents'
import {usePrefsStore} from '@/stores/prefs'

export interface NavItem {
    to: string
    icon: string
    label: string
    /** 分组名，文档式侧栏用得上；不分组的外壳直接忽略 */
    group: '追番' | '系统'
    /** 侧栏右侧的计数，0 表示不显示 */
    badge: () => number
}

/**
 * 九个外壳共用的那点逻辑：导航表、当前页标题、明暗切换、退出登录。
 *
 * 导航表按 meta.dashboard 变形 —— 不带总览页的界面，根路径就是订阅列表，
 * 否则会出现「点订阅跳到 /subscriptions，但首页也是订阅」这种两个入口一个页面。
 */
export function useShell() {
    const route = useRoute()
    const router = useRouter()
    const auth = useAuthStore()
    const ani = useAniStore()
    const torrents = useTorrentsStore()
    const prefs = usePrefsStore()

    const nav = computed<NavItem[]>(() => [
        ...(meta.dashboard
            ? [{to: '/', icon: 'mdi-view-dashboard-outline', label: '总览', group: '追番' as const, badge: () => 0}]
            : []),
        {
            to: meta.dashboard ? '/subscriptions' : '/',
            icon: 'mdi-television-play', label: '订阅', group: '追番', badge: () => ani.total,
        },
        {to: '/downloads', icon: 'mdi-download-outline', label: '下载', group: '追番', badge: () => torrents.items.length},
        {to: '/logs', icon: 'mdi-text-box-outline', label: '日志', group: '系统', badge: () => 0},
        {to: '/settings', icon: 'mdi-cog-outline', label: '设置', group: '系统', badge: () => 0},
    ])

    const isActive = (to: string) => route.path === to || (to !== '/' && route.path.startsWith(to))

    const title = computed(() =>
        nav.value.find(n => n.to === route.path)?.label
        ?? (route.path.startsWith('/settings') ? '设置' : meta.name))

    /** 搜索框只在订阅页有意义 */
    const showSearch = computed(() => route.name === 'subscriptions')

    /*
     * 搜索框的占位文字，窄屏换短的。
     *
     * 「搜索标题 / 字幕组 / 拼音首字母」要 225px，而 390px 的顶栏只匀得出 86px ——
     * 截出来是「搜索标题 /」，比什么都不写还费解，看着就像控件坏了。
     * 放在这儿而不是各款自己判断：九款抄九遍，短的那句迟早只有一两款有。
     */
    const {xs} = useDisplay()
    const searchHint = computed(() => (xs.value ? '搜索订阅' : '搜索标题 / 字幕组 / 拼音首字母'))

    const themeIcon = computed(() => ({
        light: 'mdi-weather-sunny',
        dark: 'mdi-weather-night',
        system: 'mdi-theme-light-dark',
    }[prefs.mode]))

    function cycleTheme() {
        prefs.mode = ({system: 'light', light: 'dark', dark: 'system'} as const)[prefs.mode]
    }

    function logout() {
        auth.logout()
        void router.replace('/login')
    }

    return {meta, route, nav, isActive, title, showSearch, searchHint, themeIcon, cycleTheme, logout, ani, torrents, prefs}
}
