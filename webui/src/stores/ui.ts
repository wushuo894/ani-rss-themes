import {defineStore} from 'pinia'
import {ref} from 'vue'

export interface Toast {
    id: number
    text: string
    color: 'success' | 'error' | 'warning' | 'info'
}

/** 全局提示条。接口层出错时也往这里丢，所以不能依赖任何组件先挂载 */
export const useUiStore = defineStore('ui', () => {
    const toasts = ref<Toast[]>([])
    let seq = 0

    function push(text: string, color: Toast['color'] = 'info') {
        const id = ++seq
        toasts.value.push({id, text, color})
        // 同一条消息短时间内重复出现时不叠加，否则批量操作会刷满整屏
        if (toasts.value.length > 3) toasts.value.shift()
        setTimeout(() => dismiss(id), color === 'error' ? 6000 : 3000)
    }

    const dismiss = (id: number) => {
        toasts.value = toasts.value.filter(t => t.id !== id)
    }

    return {
        toasts,
        dismiss,
        success: (t: string) => push(t, 'success'),
        error: (t: string) => push(t, 'error'),
        warn: (t: string) => push(t, 'warning'),
        info: (t: string) => push(t, 'info'),
    }
})
