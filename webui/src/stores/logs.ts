import {defineStore} from 'pinia'
import {computed, ref} from 'vue'
import * as api from '@shared/api'
import type {Log} from '@shared/types'
import {useUiStore} from './ui'

export const useLogsStore = defineStore('logs', () => {
    const items = ref<Log[]>([])
    const loading = ref(false)
    const keyword = ref('')
    const level = ref<string>('')
    let timer: number | null = null

    async function reload() {
        loading.value = true
        try {
            items.value = await api.logs()
        } finally {
            loading.value = false
        }
    }

    function startPolling(ms = 5000) {
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

    async function clear() {
        await api.clearLogs()
        useUiStore().success('日志已清空')
        await reload()
    }

    const levels = computed(() => [...new Set(items.value.map(l => l.level).filter(Boolean))] as string[])

    const filtered = computed(() => {
        const k = keyword.value.trim().toLowerCase()
        return items.value.filter(l =>
            (!level.value || l.level === level.value) &&
            (!k || (l.message || '').toLowerCase().includes(k)),
        )
    })

    return {items, loading, keyword, level, levels, filtered, reload, startPolling, stopPolling, clear}
})
