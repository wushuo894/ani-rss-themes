import {computed, onBeforeUnmount, onMounted} from 'vue'
import type {Ani} from '@shared/types'
import {useAniStore} from '@/stores/ani'
import {useTorrentsStore} from '@/stores/torrents'
import {useConfigStore} from '@/stores/config'

/**
 * 总览页的数据层。
 *
 * 五款界面的总览长得完全不一样（海报条 / 玻璃面板 / 文档首页 / M3 卡），
 * 但要看的东西是同一批：多少订阅、今天更新了什么、谁在下、谁停更了。
 * 数据放这儿，每款只写「怎么摆」—— 加一个指标，五款一起有。
 */

export function useDashboard() {
    const ani = useAniStore()
    const torrents = useTorrentsStore()
    const config = useConfigStore()

    onMounted(() => {
        if (!ani.all.length) void ani.reload()
        void config.load()
        // 总览的下载卡片不需要 3 秒级实时性，慢一点省几十次请求
        torrents.startPolling(8000)
    })
    onBeforeUnmount(() => torrents.stopPolling())

    /** 首屏还没拿到订阅时为 true —— 骨架屏看这个，不是看 loading（刷新时不该整页变灰） */
    const firstLoad = computed(() => ani.loading && !ani.all.length)

    /*
     * 「今天更新」直接取 byWeek 的第一组：后端返回 weekList 时已经把今天排在最前，
     * 自己按 Date().getDay() 再算一遍反而会和列表页对不上（时区、以及后端对
     * 「今天还没到更新点」的处理，都在服务端那一份逻辑里）。
     */
    const todayGroup = computed(() => ani.byWeek[0] ?? {label: '', items: [] as Ani[]})
    const todayLabel = computed(() => todayGroup.value.label)
    const today = computed(() => todayGroup.value.items)

    /** 最近下载过的，倒序；从未下载的不参与 */
    const recent = computed(() =>
        [...ani.all]
            .filter(a => a.lastDownloadTime)
            .sort((a, b) => (b.lastDownloadTime ?? 0) - (a.lastDownloadTime ?? 0)))

    /** 后端标了 procrastinating：字幕组很久没动静，这是真正需要人介入的一类 */
    const stalled = computed(() => ani.all.filter(a => a.procrastinating && a.enable))

    const stats = computed(() => [
        {key: 'total', label: '订阅总数', value: ani.total, icon: 'mdi-television-play', to: '/subscriptions'},
        {key: 'enabled', label: '已启用', value: ani.enabledCount, icon: 'mdi-check-circle-outline', to: '/subscriptions'},
        {key: 'downloading', label: '下载中', value: torrents.downloading.length, icon: 'mdi-download', to: '/downloads'},
        {key: 'seeding', label: '做种中', value: torrents.seeding.length, icon: 'mdi-upload', to: '/downloads'},
    ])

    /** 下载器没连上时 torrents.error 有值，几款界面都要据此换文案 */
    const downloadsHint = computed(() => (torrents.error ? '下载器未连接' : '当前没有下载任务'))

    return {ani, torrents, config, firstLoad, todayLabel, today, recent, stalled, stats, downloadsHint}
}

export type Dashboard = ReturnType<typeof useDashboard>
export type {Ani}
