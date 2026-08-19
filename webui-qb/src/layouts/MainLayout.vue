<script setup lang="ts">
import {computed, ref} from 'vue'
import {useDisplay} from 'vuetify'
import {useRoute, useRouter} from 'vue-router'
import {useAuthStore} from '@/stores/auth'
import {useAniStore} from '@/stores/ani'
import {useTorrentsStore} from '@/stores/torrents'
import {usePrefsStore} from '@/stores/prefs'

const {lgAndUp, xs} = useDisplay()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const ani = useAniStore()
const torrents = useTorrentsStore()
const prefs = usePrefsStore()

/**
 * 抽屉行为照 qb-web：大屏（lg 及以上）常驻，中小屏收起、点开是覆盖式。
 * 注意断点比 vt 版更靠后 —— qb 的表格需要更多横向空间，平板尺寸就该把抽屉收掉。
 */
const drawer = ref(lgAndUp.value)

const nav = [
  {to: '/', icon: 'mdi-format-list-bulleted', label: '订阅', badge: () => ani.total},
  {to: '/downloads', icon: 'mdi-download', label: '下载器', badge: () => torrents.items.length},
  {to: '/logs', icon: 'mdi-text-box-outline', label: '日志', badge: () => 0},
  {to: '/settings', icon: 'mdi-cog', label: '设置', badge: () => 0},
]

const title = computed(() => nav.find(n => n.to === route.path)?.label
    ?? (route.path.startsWith('/settings') ? '设置' : 'ani-rss'))

const showSearch = computed(() => route.path === '/')

function cycleTheme() {
  prefs.mode = ({system: 'light', light: 'dark', dark: 'system'} as const)[prefs.mode]
}

function logout() {
  auth.logout()
  void router.replace('/login')
}
</script>

<template>
  <!-- app-bar 在抽屉之上通栏（qb-web 的 clipped 布局），标题栏始终占满整行 -->
  <v-app-bar :elevation="2" color="primary" density="compact">
    <v-app-bar-nav-icon @click="drawer = !drawer"/>
    <v-app-bar-title class="flex-grow-0 mr-4">{{ title }}</v-app-bar-title>

    <v-text-field
        v-if="showSearch && !xs"
        v-model="ani.keyword"
        bg-color="rgba(255,255,255,.12)"
        class="search"
        clearable
        density="compact"
        hide-details
        placeholder="搜索标题 / 字幕组 / 拼音"
        prepend-inner-icon="mdi-magnify"
        variant="solo-filled"
        flat
    />

    <v-spacer/>

    <v-btn :icon="prefs.resolved === 'dark' ? 'mdi-weather-night' : 'mdi-weather-sunny'"
           :title="`主题：${prefs.mode}`" @click="cycleTheme"/>
    <v-btn icon="mdi-logout" title="退出登录" @click="logout"/>
  </v-app-bar>

  <v-navigation-drawer v-model="drawer" :permanent="lgAndUp" :temporary="!lgAndUp">
    <v-list nav>
      <v-list-item
          v-for="n in nav"
          :key="n.to"
          :active="route.path === n.to || (n.to !== '/' && route.path.startsWith(n.to))"
          :prepend-icon="n.icon"
          :title="n.label"
          :to="n.to"
      >
        <template v-if="n.badge()" #append>
          <v-chip size="x-small" variant="tonal">{{ n.badge() }}</v-chip>
        </template>
      </v-list-item>
    </v-list>

    <template #append>
      <v-divider/>
      <div class="pa-3 text-caption text-medium-emphasis">
        <div>订阅 {{ ani.enabledCount }} / {{ ani.total }} 启用</div>
        <div v-if="torrents.items.length">任务 {{ torrents.downloading.length }} 下载中</div>
      </div>
    </template>
  </v-navigation-drawer>

  <v-main>
    <!-- 窄屏时搜索框从标题栏挪到内容区顶部，标题栏塞不下 -->
    <div v-if="showSearch && xs" class="pa-2 pb-0">
      <v-text-field v-model="ani.keyword" clearable density="compact" hide-details
                    placeholder="搜索订阅" prepend-inner-icon="mdi-magnify"/>
    </div>
    <router-view/>
  </v-main>
</template>

<style scoped>
.search {
    max-width: 360px;
}
</style>
