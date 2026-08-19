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
    const error = ref('')
    let timer: number | null = null

    async function reload() {
        loading.value = true
        try {
            items.value = await api.torrentsInfos()
            error.value = ''
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

    return {items, loading, error, reload, startPolling, stopPolling, remove, downloading, seeding, totalSize}
})
