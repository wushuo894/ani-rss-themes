import {defineStore} from 'pinia'
import {computed, ref} from 'vue'
import * as api from '@shared/api'
import type {TorrentsInfo} from '@shared/types'
import {useUiStore} from './ui'

/**
 * 下载器任务。
 * 上游是手动刷新，这里改成页面可见时轮询——下载列表不自动动，看着就是死的。
 * 标签页切到后台时停掉，别在别人不看的时候空耗请求。
 */
export const useTorrentsStore = defineStore('torrents', () => {
    const items = ref<TorrentsInfo[]>([])
    const loading = ref(false)
    /** 至少成功拉到过一次。骨架屏只认它，不认 loading —— 见 reload 的注释 */
    const loaded = ref(false)
    const error = ref('')
    let timer: number | null = null

    /**
     * 把新一轮的结果合并进现有数组，而不是整个换掉。
     *
     * 每 3 秒换一次数组的后果是：数组里每一个对象都是新的，
     * v-data-table 内部按对象身份缓存的行、卡片列表里的入场动画、进度条的过渡，
     * 全都当成「这是一批新东西」重来一遍 —— 表现就是列表每 3 秒闪一下。
     * 按 hash 认人、就地覆盖字段，Vue 那边看到的是「同一批对象改了几个数」，
     * 只有进度条的数字在动，别的一律不重画。
     */
    function merge(next: TorrentsInfo[]) {
        const old = new Map(items.value.map(t => [t.hash ?? t.name ?? '', t]))
        items.value = next.map(n => {
            const cur = old.get(n.hash ?? n.name ?? '')
            if (!cur) return n
            Object.assign(cur, n)
            return cur
        })
    }

    async function reload() {
        loading.value = true
        try {
            /* ?? []：后端偶尔会回 data: null（下载器正忙 / 刚重连那一下）。
               直接赋给 items 的话模板里 items.length 当场抛，整页白屏 ——
               而轮询每 3 秒来一次，看到的就是「闪一下、没了、又闪一下」。 */
            merge((await api.torrentsInfos()) ?? [])
            error.value = ''
            loaded.value = true
        } catch (e) {
            // 下载器没配或连不上时这里会一直报错，不弹提示刷屏，只在界面上显示一次
            error.value = e instanceof Error ? e.message : String(e)
        } finally {
            loading.value = false
        }
    }

    function startPolling(ms = 3000) {
        stopPolling()
        void reload()
        timer = window.setInterval(() => {
            if (document.visibilityState === 'visible') void reload()
        }, ms)
    }

    function stopPolling() {
        if (timer !== null) {
            clearInterval(timer)
            timer = null
        }
    }

    async function remove(id: string, hash: string) {
        await api.deleteTorrent(id, hash)
        useUiStore().success('已删除任务')
        await reload()
    }

    // 注意：后端 TorrentsInfo 只有 progress / size / completed / state，**没有上下行速率**。
    // 不造「速度」这类看着专业但恒为 0 的指标。
    const downloading = computed(() => items.value.filter(t => (t.progress ?? 0) < 1))
    const seeding = computed(() => items.value.filter(t => (t.progress ?? 0) >= 1))
    const totalSize = computed(() => items.value.reduce((s, t) => s + (t.size ?? 0), 0))

    return {items, loading, loaded, error, reload, startPolling, stopPolling, remove, downloading, seeding, totalSize}
})
