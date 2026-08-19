<script setup lang="ts">
import {useDisplay} from 'vuetify'
import {useShell} from '@/composables/useShell'
import './preset.css'

/**
 * 壁纸外壳：顶栏透明浮在图上，宽屏左侧一条半透明图标栏，窄屏底部导航。
 *
 * 为什么不用普通抽屉：壁纸是这款界面的主角，任何不透明的大色块都会把它切掉一半。
 * 所有面板走 color="transparent"，磨砂由主题的 --ani-panel-blur 统一给。
 */
const {mobile} = useDisplay()
const s = useShell()
</script>

<template>
  <v-app-bar :elevation="0" class="glass-bar" color="transparent" density="comfortable">
    <v-app-bar-title class="title-fit mr-4">
      <span class="brand">✨ {{ s.title.value }}</span>
    </v-app-bar-title>

    <v-text-field
        v-if="s.showSearch.value && !mobile"
        v-model="s.ani.keyword"
        class="search"
        clearable
        density="compact"
        hide-details
        placeholder="搜索标题 / 字幕组 / 拼音首字母"
        prepend-inner-icon="mdi-magnify"
    />

    <v-spacer/>

    <v-chip class="mr-2" size="small" variant="flat">{{ s.ani.enabledCount }} / {{ s.ani.total }}</v-chip>
    <v-btn :icon="s.themeIcon.value" :title="`主题：${s.prefs.mode}`" variant="text" @click="s.cycleTheme"/>
    <v-btn icon="mdi-logout" title="退出登录" variant="text" @click="s.logout"/>
  </v-app-bar>

  <v-navigation-drawer v-if="!mobile" class="glass-rail" color="transparent" permanent rail>
    <v-list class="pt-4" nav>
      <v-list-item
          v-for="n in s.nav.value"
          :key="n.to"
          :active="s.isActive(n.to)"
          :prepend-icon="n.icon"
          :title="n.label"
          :to="n.to"
      />
    </v-list>
  </v-navigation-drawer>

  <v-main>
    <div v-if="s.showSearch.value && mobile" class="pa-3 pb-0">
      <v-text-field v-model="s.ani.keyword" clearable density="compact" hide-details
                    placeholder="搜索订阅" prepend-inner-icon="mdi-magnify"/>
    </div>
    <router-view v-slot="{Component}">
      <transition mode="out-in" name="page-rise">
        <component :is="Component"/>
      </transition>
    </router-view>
    <div v-if="mobile" style="height: 76px"/>
  </v-main>

  <v-bottom-navigation v-if="mobile" :elevation="0" class="glass-bottom" color="primary" grow>
    <v-btn v-for="n in s.nav.value" :key="n.to" :active="s.isActive(n.to)" :to="n.to">
      <v-icon :icon="n.icon"/>
      <span class="text-caption mt-1">{{ n.label }}</span>
    </v-btn>
  </v-bottom-navigation>
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

.brand {
    font-weight: 600;
    letter-spacing: .02em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* 能长能短：不给 flex 基准的话，窄屏下输入框会被压到只剩放大镜图标 */
.search {
    flex: 1 1 200px;
    min-width: 0;
    max-width: 420px;
}

/*
 * 磨砂只在这里开一次。主题给的 --ani-panel-blur 若为 0（用户换成非玻璃皮肤），
 * 这几条等于没写，外壳自然退回不透明 —— 不需要为换皮肤再写一套外壳。
 */
.glass-bar, .glass-rail, .glass-bottom {
    backdrop-filter: blur(var(--ani-panel-blur, 0px)) saturate(1.2);
    background: rgba(var(--v-theme-surface), var(--ani-surface-alpha, 1)) !important;
}

.glass-rail {
    border-right: 1px solid rgba(255, 255, 255, .14);
}

.glass-bottom {
    border-top: 1px solid rgba(255, 255, 255, .14);
}
</style>
