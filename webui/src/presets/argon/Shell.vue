<script setup lang="ts">
import {ref} from 'vue'
import {useDisplay} from 'vuetify'
import {useShell} from '@/composables/useShell'
import './preset.css'

/**
 * Argon 外壳：一条毛玻璃顶栏 + 一栏居中的正文。
 *
 * 这是「博客」的形状，不是「后台」的形状 —— 没有常驻侧栏，导航是顶栏上一排胶囊，
 * 内容永远居中在一栏里、两边留白。别款是把可用宽度全用满（表格、海报墙都吃宽度），
 * 这一款刻意不用满：Argon 的正文栏最宽 1120px，再宽的屏幕就是两边空着，
 * 因为「一行字太长就不好读」这件事比「屏幕别浪费」重要。
 *
 * 窄屏换成汉堡 + 临时抽屉。不做成底部导航：底部导航是应用的语言，
 * 而这一款从头到尾在装成一个网站，网站的移动端导航就是从左边划出来的那一层。
 */
const {mobile} = useDisplay()
const s = useShell()

const drawer = ref(false)
</script>

<template>
  <!--
    顶栏是「贴在内容上方的一层玻璃」，所以底色必须半透明 + 模糊，
    color 给 transparent 让皮肤的 --ani-panel-blur 那一层生效（见 base.css）。
    scroll-behavior 不开：Argon 的顶栏是常驻的，滚动时只是背景变实一点，不会收起来。
  -->
  <v-app-bar :elevation="0" :height="mobile ? 56 : 64" class="ag-bar" color="transparent" flat>
    <v-app-bar-nav-icon v-if="mobile" aria-label="打开导航" @click="drawer = !drawer"/>

    <router-link class="brand" to="/">
      <v-icon icon="mdi-rss-box" size="26"/>
      <span class="brand-name">ani-rss</span>
    </router-link>

    <!-- 宽屏：导航是一排胶囊，当前项填主色。Argon 的顶栏导航就是这个样子 -->
    <nav v-if="!mobile" class="ag-nav">
      <router-link v-for="n in s.nav.value" :key="n.to" :class="{on: s.isActive(n.to)}" :to="n.to" class="ag-link">
        <v-icon :icon="n.icon" size="18"/>
        <span>{{ n.label }}</span>
        <span v-if="n.badge()" class="ag-num">{{ n.badge() }}</span>
      </router-link>
    </nav>

    <v-spacer/>

    <v-text-field
        v-if="s.showSearch.value && !mobile"
        v-model="s.ani.keyword"
        class="ag-search"
        clearable
        density="compact"
        hide-details
        :placeholder="s.searchHint.value"
        prepend-inner-icon="mdi-magnify"
        rounded="pill"
        variant="solo-filled"
        flat
    />

    <v-btn :icon="s.themeIcon.value" :title="`主题：${s.prefs.mode}`" variant="text" @click="s.cycleTheme"/>
    <v-btn icon="mdi-logout" title="退出登录" variant="text" @click="s.logout"/>
  </v-app-bar>

  <!-- 窄屏抽屉。temporary：划出来盖在内容上，关掉就没了，不占布局 -->
  <v-navigation-drawer v-model="drawer" :width="252" temporary>
    <div class="dr-head">
      <v-icon icon="mdi-rss-box" size="24"/>
      <span class="brand-name">ani-rss</span>
    </div>
    <v-list nav>
      <v-list-item v-for="n in s.nav.value" :key="n.to" :active="s.isActive(n.to)" :prepend-icon="n.icon"
                   :title="n.label" :to="n.to" @click="drawer = false">
        <template v-if="n.badge()" #append>
          <span class="ag-num">{{ n.badge() }}</span>
        </template>
      </v-list-item>
    </v-list>
  </v-navigation-drawer>

  <v-main>
    <!-- 窄屏的搜索框落到内容顶上：顶栏只有 56px，塞不下一个能用的输入框 -->
    <div v-if="s.showSearch.value && mobile" class="ag-wrap pt-3">
      <v-text-field v-model="s.ani.keyword" clearable density="compact" hide-details
                    placeholder="搜索订阅" prepend-inner-icon="mdi-magnify" rounded="pill"
                    variant="solo-filled" flat/>
    </div>

    <!-- keep-alive：切走再切回来不重新挂载 —— 列表不重新渲染、滚动位置还在，
         日志和下载器也不必重新拉一遍。4 个刚好装下总览/订阅/下载器/日志。

         没有套 <transition>：它和 keep-alive 一起用会死锁 —— 离场的组件被
         移进 keep-alive 的隐藏容器，leave 过渡永远收不到结束事件，
         out-in 就一直等在那儿，整个路由卡死在上一页。 -->
    <router-view v-slot="{Component}">
      <keep-alive :max="4">
        <component :is="Component"/>
      </keep-alive>
    </router-view>
  </v-main>
</template>

<style scoped>
/*
 * 顶栏的玻璃感：底色半透明 + 一条极淡的下边线。
 * 模糊由皮肤的 --ani-panel-blur 给（base.css 已经把 .v-toolbar 接上了），
 * 这里只管颜色和边线 —— 换别的皮肤时模糊强度跟着那款走，不会被写死。
 */
.ag-bar {
    background: rgba(var(--v-theme-surface), .78) !important;
    border-bottom: 1px solid rgba(var(--v-theme-on-surface), .07);
}

.brand {
    display: flex;
    align-items: center;
    gap: 8px;
    /* 高度给到 40px：它是个链接（点了回首页），文字本身只有 26px 高，手指够不着。
       撑的是热区，字号和排版一点没变 —— 顶栏本来就有 56px */
    min-height: 40px;
    padding-inline: 12px;
    color: inherit;
    text-decoration: none;
    flex: 0 0 auto;
}

.brand-name {
    font-size: 1.06rem;
    font-weight: 700;
    letter-spacing: .01em;
}

.ag-nav {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: 14px;
    min-width: 0;
}

/*
 * 导航胶囊。高度给到 38px 而不是让它随字撑开：一排链接高矮不齐时，
 * 当前项那颗填了色的胶囊会比别的高出两三像素，看着像没对齐。
 */
.ag-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 38px;
    padding: 0 14px;
    border-radius: 999px;
    color: inherit;
    text-decoration: none;
    font-size: .9rem;
    white-space: nowrap;
    opacity: .78;
    transition: background-color var(--m-dur) var(--m-ease), opacity var(--m-dur) var(--m-ease);
}

.ag-link:hover {
    opacity: 1;
    background: rgba(var(--v-theme-on-surface), .06);
}

.ag-link.on {
    opacity: 1;
    color: rgb(var(--v-theme-primary));
    background: rgba(var(--v-theme-primary), .12);
    font-weight: 600;
}

/* 计数是个小药丸，跟在标签后面。不用 v-badge：那是绝对定位的，会骑在文字上 */
.ag-num {
    flex: 0 0 auto;
    min-width: 20px;
    padding: 0 6px;
    border-radius: 999px;
    background: rgba(var(--v-theme-on-surface), .1);
    font-size: .68rem;
    line-height: 18px;
    text-align: center;
    font-variant-numeric: tabular-nums;
}

.ag-search {
    flex: 1 1 200px;
    min-width: 0;
    max-width: 340px;
    margin-inline: 8px;
}

.dr-head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 18px 20px 10px;
}
</style>

<style>
/*
 * 内容栏：居中、限宽、两边留白。不是 scoped —— 三个页面（总览、订阅，以及
 * 下载器/日志/设置那几个共用页）都要用同一个容器类，写成 scoped 就只有外壳自己能用。
 *
 * 类名带 ag- 前缀，作用域靠前缀而不是靠 scoped 属性：这个 CSS 只在 argon 那一款的
 * 产物里出现（preset.css 和 Shell.vue 都只被它 import），不存在污染别款的可能。
 */
.ag-wrap {
    width: 100%;
    max-width: var(--ag-max);
    margin-inline: auto;
    padding-inline: var(--ag-gap);
}

/*
 * 宽屏的两栏：正文在左，小挂件在右。
 * 1280 以下并成一栏 —— 挂件栏最少要 300px 才装得下一行「番剧名 + 时间」，
 * 正文栏再少于 600px 卡片里的字就要折成三行，两个都保不住的时候先保正文。
 */
.ag-cols {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--ag-gap);
    align-items: start;
}

@media (min-width: 1280px) {
    .ag-cols {
        grid-template-columns: minmax(0, 1fr) 320px;
    }
}
</style>
