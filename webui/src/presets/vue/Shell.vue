<script setup lang="ts">
import {ref} from 'vue'
import {useDisplay} from 'vuetify'
import {useShell} from '@/composables/useShell'

/**
 * 文档站外壳：顶部一条细导航栏 + 左侧分组侧栏 + 居中正文。
 * 与另外四款的分别在于「分组」——导航按「追番 / 系统」分节，像文档的目录，
 * 而不是一串平铺的图标。
 */
const {mobile} = useDisplay()
const s = useShell()
const drawer = ref(!mobile.value)
const groups = ['追番', '系统'] as const
</script>

<template>
  <v-app-bar :elevation="0" class="doc-bar" density="comfortable">
    <v-app-bar-nav-icon v-if="mobile" @click="drawer = !drawer"/>

    <v-app-bar-title class="title-fit mr-6">
      <span class="brand">ANI<span class="text-primary">-RSS</span></span>
    </v-app-bar-title>

    <v-text-field
        v-if="s.showSearch.value"
        v-model="s.ani.keyword"
        class="search"
        clearable
        density="compact"
        hide-details
        placeholder="搜索标题 / 字幕组 / 拼音首字母"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
    />

    <v-spacer/>

    <v-btn :icon="s.themeIcon.value" :title="`主题：${s.prefs.mode}`" variant="text" @click="s.cycleTheme"/>
    <v-btn icon="mdi-logout" title="退出登录" variant="text" @click="s.logout"/>
  </v-app-bar>

  <v-navigation-drawer v-model="drawer" :permanent="!mobile" :temporary="mobile" width="240">
    <div class="pa-4 pb-2">
      <div class="text-caption text-medium-emphasis">
        {{ s.ani.enabledCount }} / {{ s.ani.total }} 启用
      </div>
    </div>

    <template v-for="g in groups" :key="g">
      <div class="group-title">{{ g }}</div>
      <v-list class="pt-0" density="comfortable" nav>
        <v-list-item
            v-for="n in s.nav.value.filter(i => i.group === g)"
            :key="n.to"
            :active="s.isActive(n.to)"
            :title="n.label"
            :to="n.to"
            class="doc-item"
        >
          <template v-if="n.badge()" #append>
            <span class="text-caption text-medium-emphasis">{{ n.badge() }}</span>
          </template>
        </v-list-item>
      </v-list>
    </template>
  </v-navigation-drawer>

  <v-main>
    <!-- 文档站正文都有最大宽度：满屏铺开的长行读起来很累 -->
    <div class="doc-content mx-auto">
      <router-view/>
    </div>
  </v-main>
</template>

<style scoped>
/*
 * Vuetify 的 .v-toolbar-title 是 flex: 1 1（basis 为 0）且 overflow:hidden，
 * 单加 flex-grow-0 会让它宽度直接塌成 0，标题整块消失 —— 必须把 basis 也改成 auto。
 */
.title-fit {
    flex: 0 0 auto;
}

.brand {
    font-weight: 700;
    letter-spacing: -.02em;
}

.doc-bar {
    border-bottom: 1px solid rgba(128, 128, 128, .22);
}

.search {
    max-width: 380px;
}

.group-title {
    padding: 12px 20px 4px;
    font-size: .75rem;
    font-weight: 600;
    letter-spacing: .04em;
    opacity: .55;
}

/* 文档式导航：不用药丸，用左侧一道竖线标当前项 */
.doc-item {
    border-radius: 0 !important;
    border-left: 2px solid transparent;
}

.doc-item.v-list-item--active {
    border-left-color: rgb(var(--v-theme-primary));
}

.doc-content {
    max-width: 1152px;
}
</style>
