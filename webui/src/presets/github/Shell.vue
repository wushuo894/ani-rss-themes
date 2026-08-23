<script setup lang="ts">
import {ref} from 'vue'
import {useDisplay} from 'vuetify'
import {useShell} from '@/composables/useShell'
import './preset.css'

/**
 * Primer 外壳：深色顶栏 + 一排下划线 tab，没有侧栏。
 *
 * GitHub 把导航放在顶部而不是侧边，是因为清单本身需要整幅宽度；
 * 窄屏时 tab 横向滚动（v-tabs 自带），不退化成汉堡菜单 —— 那会多一次点击。
 */
const {mobile} = useDisplay()
const s = useShell()
const menu = ref(false)
</script>

<template>
  <v-app-bar :elevation="0" class="gh-header" color="#161b22" density="comfortable">
    <v-app-bar-title class="title-fit mr-4">
      <span class="brand"><v-icon class="mr-2" icon="mdi-rss"/>ani-rss</span>
    </v-app-bar-title>

    <v-text-field
        v-if="!mobile"
        v-model="s.ani.keyword"
        class="gh-search"
        clearable
        density="compact"
        hide-details
        :placeholder="s.searchHint.value"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
    />

    <v-spacer/>

    <v-btn :icon="s.themeIcon.value" :title="`主题：${s.prefs.mode}`" variant="text" @click="s.cycleTheme"/>
    <v-menu v-model="menu">
      <template #activator="{props}">
        <v-btn v-bind="props" icon="mdi-account-circle-outline" variant="text"/>
      </template>
      <v-list density="compact">
        <v-list-item :subtitle="`${s.ani.enabledCount} / ${s.ani.total} 启用`" title="ani-rss"/>
        <v-divider/>
        <v-list-item prepend-icon="mdi-logout" title="退出登录" @click="s.logout"/>
      </v-list>
    </v-menu>
  </v-app-bar>

  <!-- 第二行：下划线 tab。extension 槽保证它跟着顶栏一起吸顶 -->
  <v-app-bar :elevation="0" class="gh-tabs" density="compact">
    <v-tabs :model-value="s.nav.value.find(n => s.isActive(n.to))?.to" density="compact" show-arrows>
      <v-tab v-for="n in s.nav.value" :key="n.to" :prepend-icon="n.icon" :to="n.to" :value="n.to">
        {{ n.label }}
        <v-chip v-if="n.badge()" class="ml-2" size="x-small" variant="tonal">{{ n.badge() }}</v-chip>
      </v-tab>
    </v-tabs>
  </v-app-bar>

  <v-main>
    <div v-if="mobile && s.showSearch.value" class="pa-3 pb-0">
      <v-text-field v-model="s.ani.keyword" clearable density="compact" hide-details
                    placeholder="搜索订阅" prepend-inner-icon="mdi-magnify" variant="outlined"/>
    </div>
    <div class="gh-content mx-auto">
      <!-- keep-alive：切走再切回来不重新挂载 —— 列表不重新渲染、滚动位置还在、
           日志和下载器也不必重新拉一遍。4 个刚好装下总览/订阅/下载器/日志。

           没有套 <transition>：它和 keep-alive 一起用会死锁 —— 离场的组件被
           移进 keep-alive 的隐藏容器，leave 过渡永远收不到结束事件，
           out-in 就一直等在那儿，整个路由卡死在上一页。页面自己的入场动效还在。 -->
      <router-view v-slot="{Component}">
        <keep-alive :max="4">
          <component :is="Component"/>
        </keep-alive>
      </router-view>
    </div>
  </v-main>
</template>

<style scoped>
/*
 * Vuetify 的 .v-toolbar-title 是 flex: 1 1（basis 为 0）且 overflow:hidden，
 * 单加 flex-grow-0 会让它宽度直接塌成 0，标题整块消失 —— 必须把 basis 也改成 auto。
 */
.title-fit {
    /* 0 1 而不是 0 0：不跟着抢宽度，但窄屏必须能让 —— 不让的话品牌名会把搜索框顶出顶栏 */
    flex: 0 1 auto;
    min-width: 0;
}

/*
 * 顶栏在明暗两种主题下都是深色 —— github.com 就是这样，顶栏不跟着主题翻。
 *
 * 但 base.css 为了让带壁纸的主题能透出背景，给 .v-toolbar 的底色加了 !important，
 * 把 <v-app-bar color="#161b22"> 盖掉了：浅色主题下顶栏变成白底，
 * 而品牌名、图标按钮、搜索框里的字都是照着深色底写死的 #f0f6fc ——
 * 白底白字，整条顶栏（品牌、搜索、主题切换、账号）全部消失。这里把底色抢回来。
 */
.gh-header.v-toolbar {
    background: #161b22 !important;
}

.brand {
    color: #f0f6fc;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.gh-header :deep(.v-btn) {
    color: #f0f6fc;
}

.gh-search {
    flex: 1 1 180px;
    min-width: 0;
    max-width: 340px;
}

.gh-header :deep(.v-field) {
    background: rgba(255, 255, 255, .06);
}

.gh-header :deep(.v-field__input),
.gh-header :deep(.v-field__prepend-inner .v-icon) {
    color: #c9d1d9;
}

.gh-tabs {
    border-bottom: 1px solid rgba(128, 128, 128, .28);
}

.gh-content {
    max-width: 1280px;
}
</style>
