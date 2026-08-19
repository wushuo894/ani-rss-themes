import {defineStore} from 'pinia'
import {computed, ref} from 'vue'
import * as api from '@shared/api'
import type {Ani, ListAni} from '@shared/types'
import {useUiStore} from './ui'

/**
 * 一条订阅是否命中关键词。
 * 后端给了 pinyin / pinyinInitials 两个字段，所以中文番剧名可以用拼音或首字母搜
 * （「无职转生」→ wuzhizhuansheng / wzzs）——上游就是这么用的，别只比对标题。
 */
function matches(a: Ani, k: string): boolean {
    return [a.title, a.jpTitle, a.subgroup, a.themoviedbName, a.bgmUrl, a.pinyin, a.pinyinInitials]
        .some(v => v?.toLowerCase().includes(k))
}

/** 订阅列表。全站唯一数据源，各弹窗改完调 reload() */
export const useAniStore = defineStore('ani', () => {
    const raw = ref<ListAni>({})
    const loading = ref(false)
    const keyword = ref('')
    /** 选中的订阅 id，批量操作用 */
    const selected = ref<Set<string>>(new Set())

    async function reload() {
        loading.value = true
        try {
            raw.value = await api.listAni()
        } finally {
            loading.value = false
        }
    }

    /** 拍平成一维，网格/列表视图用 */
    const all = computed<Ani[]>(() => (raw.value.weekList || []).flatMap(w => w.items || []))

    const filtered = computed<Ani[]>(() => {
        const k = keyword.value.trim().toLowerCase()
        if (!k) return all.value
        return all.value.filter(a => matches(a, k))
    })

    /** 按星期分组，保留后端给的顺序（后端已按今天排在最前处理过） */
    const byWeek = computed(() => {
        const k = keyword.value.trim().toLowerCase()
        return (raw.value.weekList || [])
            .map(w => ({
                label: w.weekLabel || '',
                items: (w.items || []).filter(a => !k || matches(a, k)),
            }))
            .filter(w => w.items.length)
    })

    const total = computed(() => raw.value.total ?? all.value.length)
    const enabledCount = computed(() => all.value.filter(a => a.enable).length)

    /* ── 选择 ── */
    const toggleSelect = (id: string) => {
        const s = new Set(selected.value)
        s.has(id) ? s.delete(id) : s.add(id)
        selected.value = s
    }
    const clearSelection = () => (selected.value = new Set())
    const selectAll = () => (selected.value = new Set(filtered.value.map(a => a.id!).filter(Boolean)))

    /* ── 写操作，全部走完自动 reload ── */
    async function withReload<T>(fn: () => Promise<T>, okMsg?: string): Promise<T> {
        const r = await fn()
        if (okMsg) useUiStore().success(okMsg)
        await reload()
        return r
    }

    const add = (ani: Ani) => withReload(() => api.addAni(ani), '添加成功')
    const update = (ani: Ani, move = false) => withReload(() => api.setAni(move, ani), '已保存')
    const remove = (ids: string[], deleteFiles: boolean) =>
        withReload(() => api.deleteAni(deleteFiles, ids), `已删除 ${ids.length} 项`)
    const refreshOne = (ani: Ani) => withReload(() => api.refreshAni(ani), '已刷新')
    const refreshAll = () => withReload(() => api.refreshAll(), '已触发全部刷新')
    const setEnabled = (ids: string[], value: boolean) =>
        withReload(() => api.batchEnable(value, ids), value ? '已启用' : '已禁用')
    const batchScrape = (ids: string[], force: boolean) =>
        withReload(() => api.batchScrape(force, ids), '已触发刮削')
    const updateEpisodes = (ids: string[], force: boolean) =>
        withReload(() => api.updateTotalEpisodeNumber(force, ids), '已更新总集数')

    return {
        raw, loading, keyword, selected,
        all, filtered, byWeek, total, enabledCount,
        reload, toggleSelect, clearSelection, selectAll,
        add, update, remove, refreshOne, refreshAll, setEnabled, batchScrape, updateEpisodes,
    }
})
