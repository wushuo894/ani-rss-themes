<script setup lang="ts">
import {watch} from 'vue'
import {useRouter} from 'vue-router'
import {setErrorHandler, setUnauthorizedHandler} from '@shared/http'
import {usePrefsStore} from '@/stores/prefs'
import {useUiStore} from '@/stores/ui'
import {useThemeManager} from '@/composables/useThemeManager'
import {useCustomAssets} from '@/composables/useCustomAssets'
import SnackbarHost from '@/components/common/SnackbarHost.vue'

const prefs = usePrefsStore()
const ui = useUiStore()
const router = useRouter()

// 主题（内置明暗 + 17 款皮肤）统一由它接管
useThemeManager()
// ani-rss 自定义 CSS/JS 框的内容，默认不加载
useCustomAssets()

// 强调色：写成 CSS 变量，改色不必重新构建
watch(() => prefs.accent, v => {
  document.documentElement.style.setProperty('--ani-accent', v)
}, {immediate: true})

/*
 * 接口层是纯 TS，不认识 Vue 的路由和提示组件，所以在这里把两个回调注册进去。
 * 403 时接口层已经清了令牌，这里只负责把人送到登录页。
 */
setErrorHandler(msg => ui.error(msg))
setUnauthorizedHandler(() => {
  const cur = router.currentRoute.value
  if (cur.name !== 'login') void router.replace({name: 'login', query: {redirect: cur.fullPath}})
})
</script>

<template>
  <v-app>
    <router-view/>
    <SnackbarHost/>
  </v-app>
</template>
