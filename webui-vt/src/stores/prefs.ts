import {defineStore} from 'pinia'
import {ref, watch} from 'vue'

/**
 * 外观与页面偏好。
 *
 * localStorage 的键**特意沿用上游那几个**（show-score / show-week / max-content-width …）：
 * 同源共享，在自带界面上调好的显示偏好切过来就还在，不用重设一遍。
 * 只有主题模式是本 WebUI 新增的键，上游用的是 vueuse 的 useColorMode，语义对不上。
 */
function persisted<T>(key: string, def: T) {
    const raw = localStorage.getItem(key)
    let init = def
    if (raw !== null) {
        try {
            init = JSON.parse(raw) as T
        } catch {
            init = raw as unknown as T   // 上游有些键存的是裸字符串，不是 JSON
        }
    }
    const r = ref<T>(init)
    watch(r, v => localStorage.setItem(key, typeof v === 'string' ? v : JSON.stringify(v)), {deep: true})
    return r
}

export const usePrefsStore = defineStore('prefs', () => {
    /* ── 主题 ── */
    const mode = persisted<'light' | 'dark' | 'system'>('ani-webui-theme', 'system')
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const resolved = ref<'light' | 'dark'>('dark')

    const recompute = () => {
        resolved.value = mode.value === 'system' ? (mq.matches ? 'dark' : 'light') : mode.value
    }
    // 系统偏好变化只在「跟随系统」时生效，用户手动选过就不该被系统覆盖
    mq.addEventListener('change', () => mode.value === 'system' && recompute())
    watch(mode, recompute, {immediate: true})

    /* ── 强调色（与上游同键，上游把它内联写在 <html> 上）── */
    const accent = persisted<string>('--el-color-primary', '#409eff')

    /* ── 页面显示项，对应上游「基本设置 → 页面设置」那几个复选框 ── */
    const showScore = persisted<boolean>('show-score', true)
    const showWeek = persisted<boolean>('show-week', true)
    const showPlaylist = persisted<boolean>('show-playlist', true)
    const showLastDownloadTime = persisted<boolean>('show-last-download-time', true)
    /** 上游强制不小于 1200，跟着来，否则从自带界面切过来会突然变窄 */
    const maxContentWidth = persisted<number>('max-content-width', 1600)

    /** 选中的主题 id，空串表示不启用主题（Vuetify 原生观感） */
    const themeId = persisted<string>('ani-webui-theme-id', '')

    /**
     * 是否加载 ani-rss「自定义 CSS/JS」框里的内容（api/custom.css、api/custom.js）。
     * 默认关：那里通常存的是针对 Element Plus 写的主题，在本 WebUI 里选择器一条都匹配不上，
     * 默认加载只会白白多两个请求。想为新界面写样式的人可以打开，入口还是同一个。
     */
    const loadCustomAssets = persisted<boolean>('ani-webui-load-custom', false)

    /* ── 本 WebUI 新增 ── */
    const cardSize = persisted<'small' | 'medium' | 'large'>('ani-webui-card-size', 'medium')
    const viewMode = persisted<'grid' | 'list'>('ani-webui-view-mode', 'grid')

    return {
        mode, resolved, accent, themeId, loadCustomAssets,
        showScore, showWeek, showPlaylist, showLastDownloadTime, maxContentWidth,
        cardSize, viewMode,
    }
})
