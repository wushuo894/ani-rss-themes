import {defineStore} from 'pinia'
import {ref} from 'vue'
import * as api from '@shared/api'
import type {Config} from '@shared/types'
import {useUiStore} from './ui'

/** 全局配置。设置页的 10 个标签页共用这一份，保存是整体提交（后端只有 setConfig 一个写接口） */
export const useConfigStore = defineStore('config', () => {
    const config = ref<Config>({})
    const loaded = ref(false)
    const loading = ref(false)
    const saving = ref(false)

    async function load(force = false) {
        if (loaded.value && !force) return config.value
        loading.value = true
        try {
            config.value = await api.getConfig()
            loaded.value = true
            return config.value
        } finally {
            loading.value = false
        }
    }

    async function save() {
        saving.value = true
        try {
            await api.setConfig(config.value)
            useUiStore().success('设置已保存')
            // 密码字段提交后后端返回的是摘要，重新拉一次避免界面上残留明文
            await load(true)
        } finally {
            saving.value = false
        }
    }

    return {config, loaded, loading, saving, load, save}
})
