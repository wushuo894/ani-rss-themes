<script setup lang="ts">
import {computed, ref} from 'vue'
import {useDisplay} from 'vuetify'
import {useRoute, useRouter} from 'vue-router'
import {useAuthStore} from '@/stores/auth'
import {useAniStore} from '@/stores/ani'
import {usePrefsStore} from '@/stores/prefs'

const {mobile} = useDisplay()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const ani = useAniStore()
const prefs = usePrefsStore()

/**
 * 抽屉状态。
 * 桌面端常驻展开，移动端默认收起、点开是覆盖式——和 qb-web / VueTorrent 一个路子，
 * 不做两套 UI，只让同一个抽屉在窄屏换个行为。
 */
const drawer = ref(!mobile.value)
/** 桌面端可收成图标条，省出正文宽度；窄屏无意义 */
const rail = ref(false)

const nav = [
  {to: '/', icon: 'mdi-view-dashboard-outline', label: '总览'},
  {to: '/subscriptions', icon: 'mdi-television-play', label: '订阅'},
  {to: '/downloads', icon: 'mdi-download-outline', label: '下载器'},
  {to: '/logs', icon: 'mdi-text-box-outline', label: '日志'},
  {to: '/settings', icon: 'mdi-cog-outline', label: '设置'},
]

/** 搜索框只在订阅页有意义 */
const showSearch = computed(() => route.name === 'subscriptions')

const themeIcon = computed(() => ({
  light: 'mdi-weather-sunny',
  dark: 'mdi-weather-night',
  system: 'mdi-theme-light-dark',
}[prefs.mode]))

function cycleTheme() {
  prefs.mode = ({system: 'light', light: 'dark', dark: 'system'} as const)[prefs.mode]
}

function logout() {
  auth.logout()
  void router.replace('/login')
}
</script>

<template>
  <v-navigation-drawer
      v-model="drawer"
      :permanent="!mobile"
      :rail="rail && !mobile"
      :temporary="mobile"
  >
    <v-list-item
        :subtitle="rail && !mobile ? undefined : `${ani.enabledCount} / ${ani.total} 启用`"
        class="py-3"
        nav
        prepend-icon="mdi-rss"
        title="ANI-RSS"
    />

    <v-divider/>

    <v-list density="comfortable" nav>
      <v-list-item
          v-for="n in nav"
          :key="n.to"
          :active="route.path === n.to || (n.to !== '/' && route.path.startsWith(n.to))"
          :prepend-icon="n.icon"
          :title="n.label"
          :to="n.to"
      />
    </v-list>

    <template #append>
      <v-list density="compact" nav>
        <!-- 收起按钮只在桌面端出现：窄屏抽屉本来就是覆盖式的，收成图标条没有意义 -->
        <v-list-item
            v-if="!mobile"
            :prepend-icon="rail ? 'mdi-chevron-right' : 'mdi-chevron-left'"
            :title="rail ? undefined : '收起'"
            @click="rail = !rail"
        />
        <v-list-item prepend-icon="mdi-logout" title="退出登录" @click="logout"/>
      </v-list>
    </template>
  </v-navigation-drawer>

  <v-app-bar :elevation="1" density="comfortable">
    <v-app-bar-nav-icon v-if="mobile" @click="drawer = !drawer"/>

    <v-app-bar-title class="flex-grow-0 mr-4">
      {{ nav.find(n => n.to === route.path)?.label ?? 'ANI-RSS' }}
    </v-app-bar-title>

    <v-text-field
        v-if="showSearch"
        v-model="ani.keyword"
        class="search-field"
        clearable
        density="compact"
        hide-details
        placeholder="搜索标题 / 字幕组 / 拼音首字母"
        prepend-inner-icon="mdi-magnify"
        variant="solo-filled"
        flat
    />

    <v-spacer/>

    <v-btn :icon="themeIcon" :title="`主题：${prefs.mode}`" @click="cycleTheme"/>
  </v-app-bar>

  <v-main>
    <router-view/>
  </v-main>
</template>

<style scoped>
/* 搜索框在宽屏给足宽度，窄屏交给 flex 自己压缩 */
.search-field {
    max-width: 420px;
}
</style>
