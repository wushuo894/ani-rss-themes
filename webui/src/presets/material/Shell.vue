<script setup lang="ts">
import {useDisplay} from 'vuetify'
import {useShell} from '@/composables/useShell'

/**
 * M3 外壳：宽屏是左侧「导航栏杆」（navigation rail，只有图标和短标签），
 * 窄屏是底部导航条。这是 Material 3 明确规定的响应式导航模式 ——
 * 不是同一个抽屉换个宽度，两者的交互重心完全不同。
 */
const {mobile} = useDisplay()
const s = useShell()
</script>

<template>
  <v-app-bar :elevation="0" color="surface" density="comfortable">
    <v-app-bar-title class="title-lg">{{ s.title.value }}</v-app-bar-title>

    <v-text-field
        v-if="s.showSearch.value && !mobile"
        v-model="s.ani.keyword"
        class="search"
        clearable
        density="compact"
        hide-details
        placeholder="搜索标题 / 字幕组 / 拼音"
        prepend-inner-icon="mdi-magnify"
        rounded="pill"
        variant="solo-filled"
        flat
    />

    <v-spacer/>

    <v-btn :icon="s.themeIcon.value" :title="`主题：${s.prefs.mode}`" variant="text" @click="s.cycleTheme"/>
    <v-btn icon="mdi-logout" title="退出登录" variant="text" @click="s.logout"/>
  </v-app-bar>

  <!-- 宽屏：导航栏杆常驻，不可收起 —— M3 的 rail 本身就是收起态 -->
  <v-navigation-drawer v-if="!mobile" :width="88" permanent rail rail-width="88">
    <v-list class="pt-4" nav>
      <v-list-item
          v-for="n in s.nav.value"
          :key="n.to"
          :active="s.isActive(n.to)"
          :to="n.to"
          class="rail-item text-center"
      >
        <v-badge :content="n.badge()" :model-value="!!n.badge()" color="error">
          <v-icon :icon="n.icon" size="24"/>
        </v-badge>
        <div class="rail-label">{{ n.label }}</div>
      </v-list-item>
    </v-list>
  </v-navigation-drawer>

  <v-main>
    <div v-if="s.showSearch.value && mobile" class="pa-3 pb-0">
      <v-text-field v-model="s.ani.keyword" clearable density="compact" hide-details
                    placeholder="搜索订阅" prepend-inner-icon="mdi-magnify" rounded="pill"
                    variant="solo-filled" flat/>
    </div>
    <router-view/>
    <!-- 底部导航挡住内容尾巴，给一段安全垫 -->
    <div v-if="mobile" style="height: 72px"/>
  </v-main>

  <v-bottom-navigation v-if="mobile" :elevation="2" grow>
    <v-btn v-for="n in s.nav.value" :key="n.to" :active="s.isActive(n.to)" :to="n.to" rounded="0">
      <v-badge :content="n.badge()" :model-value="!!n.badge()" color="error">
        <v-icon :icon="n.icon"/>
      </v-badge>
      <span class="text-caption mt-1">{{ n.label }}</span>
    </v-btn>
  </v-bottom-navigation>
</template>

<style scoped>
.title-lg {
    font-size: 1.35rem;
    font-weight: 500;
}

.search {
    max-width: 420px;
}

.rail-item {
    border-radius: 16px !important;
    padding: 10px 4px !important;
    margin-bottom: 6px;
}

.rail-label {
    font-size: .7rem;
    margin-top: 4px;
    line-height: 1.1;
}
</style>
