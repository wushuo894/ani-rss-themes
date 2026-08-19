<script setup lang="ts">
import {useDisplay} from 'vuetify'
import {useShell} from '@/composables/useShell'

/**
 * 悬浮岛外壳：导航不是贴边的抽屉，而是一枚浮在内容之上的玻璃胶囊
 * （宽屏竖在左侧，窄屏横躺在底部）。
 *
 * 刻意不用 v-navigation-drawer —— 它会真的占掉一列宽度，胶囊就不「浮」了。
 * 代价是 v-main 的让位要自己写，下面两条 padding 就是干这个的。
 */
const {mobile} = useDisplay()
const s = useShell()
</script>

<template>
  <!-- 顶部：一条浮起来的搜索/状态胶囊 -->
  <div class="top-island" :class="{'is-mobile': mobile}">
    <span class="brand">{{ s.title.value }}</span>

    <v-text-field
        v-if="s.showSearch.value"
        v-model="s.ani.keyword"
        class="search"
        clearable
        density="compact"
        hide-details
        placeholder="搜索标题 / 字幕组 / 拼音"
        prepend-inner-icon="mdi-magnify"
    />

    <v-spacer/>
    <v-btn :icon="s.themeIcon.value" size="small" variant="text" @click="s.cycleTheme"/>
    <v-btn icon="mdi-logout" size="small" variant="text" @click="s.logout"/>
  </div>

  <!-- 导航岛 -->
  <div class="nav-island" :class="mobile ? 'nav-bottom' : 'nav-left'">
    <v-btn
        v-for="n in s.nav.value"
        :key="n.to"
        :active="s.isActive(n.to)"
        :icon="n.icon"
        :title="n.label"
        :to="n.to"
        class="nav-btn"
        variant="text"
    />
  </div>

  <v-main>
    <!-- 内边距写在内层：v-main 的 padding 是布局系统按内联样式算的，类选择器盖不过它 -->
    <div :class="mobile ? 'pad-bottom' : 'pad-left'">
      <router-view/>
    </div>
  </v-main>
</template>

<style scoped>
.top-island {
    position: fixed;
    top: 12px;
    left: 92px;
    right: 12px;
    z-index: 1006;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 16px;
    border-radius: 999px;
    background: rgba(var(--v-theme-surface), var(--ani-surface-alpha, .8));
    backdrop-filter: blur(var(--ani-panel-blur, 12px)) saturate(1.3);
    border: 1px solid rgba(255, 255, 255, .28);
    box-shadow: 0 8px 30px rgba(0, 0, 0, .18);
}

.top-island.is-mobile {
    left: 12px;
}

.brand {
    font-weight: 600;
    white-space: nowrap;
}

.search {
    max-width: 380px;
}

.nav-island {
    position: fixed;
    z-index: 1007;
    display: flex;
    gap: 4px;
    padding: 8px;
    border-radius: 999px;
    background: rgba(var(--v-theme-surface), var(--ani-surface-alpha, .8));
    backdrop-filter: blur(var(--ani-panel-blur, 12px)) saturate(1.3);
    border: 1px solid rgba(255, 255, 255, .28);
    box-shadow: 0 8px 30px rgba(0, 0, 0, .18);
}

.nav-left {
    top: 50%;
    left: 12px;
    flex-direction: column;
    transform: translateY(-50%);
}

.nav-bottom {
    left: 50%;
    bottom: 14px;
    transform: translateX(-50%);
}

/* 按下回弹，和主题里的 .v-btn:active 是一套动作语言 */
.nav-btn {
    transition: transform .18s cubic-bezier(.34, 1.56, .64, 1);
}

.nav-btn:active {
    transform: scale(.9);
}

/* 岛是浮的，不占布局，正文的让位只能手写 */
.pad-left {
    padding-left: 92px;
    padding-top: 74px;
}

.pad-bottom {
    padding-top: 74px;
    padding-bottom: 88px;
}
</style>
