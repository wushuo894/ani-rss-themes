import {defineStore} from 'pinia'
import {computed, ref} from 'vue'
import * as api from '@shared/api'
import {getToken, setToken} from '@shared/http'

/**
 * 「记住密码」沿用上游的 localStorage 键与语义（明文存密码）。
 * 这是上游既有行为，改掉会让两边界面表现不一致；只在用户勾选时才存。
 */
const REMEMBER_KEY = 'rememberThePassword'

interface Remember {
    remember: boolean
    username: string
    password: string
}

function loadRemember(): Remember {
    try {
        return {remember: false, username: '', password: '', ...JSON.parse(localStorage.getItem(REMEMBER_KEY) || '{}')}
    } catch {
        return {remember: false, username: '', password: ''}
    }
}

export const useAuthStore = defineStore('auth', () => {
    const token = ref(getToken())
    const remember = ref<Remember>(loadRemember())
    const loading = ref(false)

    const isLoggedIn = computed(() => !!token.value)

    async function login(username: string, password: string, keep: boolean) {
        loading.value = true
        try {
            // api.login 内部做 MD5，这里必须传明文
            const t = await api.login({username, password})
            token.value = t
            setToken(t)
            remember.value = keep
                ? {remember: true, username, password}
                : {remember: false, username: '', password: ''}
            localStorage.setItem(REMEMBER_KEY, JSON.stringify(remember.value))
            return true
        } finally {
            loading.value = false
        }
    }

    function logout() {
        token.value = ''
        setToken('')
    }

    return {token, remember, loading, isLoggedIn, login, logout}
})
