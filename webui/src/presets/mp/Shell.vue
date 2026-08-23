<script setup lang="ts">
import {computed, onMounted, onUnmounted, ref} from 'vue'
import {useDisplay} from 'vuetify'
import {useShell} from '@/composables/useShell'
import './preset.css'

/**
 * MoviePilot 的外壳：260px 竖侧栏 + 64px 顶栏，内容封在 1440px 里。
 *
 * 这一款最认得出来的是**选中的那一条**：高 42px，只有右半边是 50px 的大圆角
 * （左边是直的，像从侧栏边上长出来的一片舌头），底色是 270° 的紫色渐变，
 * 还压着一层 elevation 3 的阴影。数值全部来自 Materio 的 _vertical-nav.scss /
 * _nav.scss，不是照着截图描的。
 *
 * 顶栏平时是透明的，一滚起来才糊上毛玻璃和一层极淡的阴影 —— 原版
 * VerticalNavLayout 里那段 `.layout-navbar-sticky` 的行为。
 */
const s = useShell()
/*
 * 换挡点用 smAndDown（<960）而不是 Vuetify 默认的 mobile（<1280）：960 是 MP 自己的
 * md 断点，侧栏从常驻变浮层就在那个宽度上。
 */
const {smAndDown: narrow} = useDisplay()

/* 初值必须按当前宽度给。permanent 只在「从 false 变 true」时才把抽屉打开，
   一上来就是 true 的话那个 watch 不会触发，宽屏进来侧栏是收着的 */
const drawer = ref(!narrow.value)
const rail = ref(false)
const scrolled = ref(false)

const groups = computed(() => {
    const seen: string[] = []
    for (const n of s.nav.value) if (!seen.includes(n.group)) seen.push(n.group)
    return seen.map(g => ({label: g, items: s.nav.value.filter(n => n.group === g)}))
})

/* 阈值 5px 照原版：0 的话滚动条抖一下顶栏就闪一次毛玻璃 */
const onScroll = () => (scrolled.value = window.scrollY > 5)
onMounted(() => window.addEventListener('scroll', onScroll, {passive: true}))
onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <v-navigation-drawer
      v-model="drawer"
      :permanent="!narrow"
      :rail="!narrow && rail"
      :temporary="narrow"
      :width="260"
      class="mp-side"
      rail-width="80"
  >
    <div class="side-head">
      <v-icon class="mark" icon="mdi-rss" size="26"/>
      <span v-if="!rail || narrow" class="brand">ani-rss</span>
      <v-spacer/>
      <v-btn v-if="!narrow" :icon="rail ? 'mdi-circle-outline' : 'mdi-record-circle-outline'"
             :title="rail ? '固定展开' : '收起侧栏'" color="default" size="small" variant="text"
             @click="rail = !rail"/>
    </div>

    <template v-for="g in groups" :key="g.label">
      <!-- 分节标题：收起态换成一条短横线，原版就是这么处理的 -->
      <div v-if="!rail || narrow" class="sec">{{ g.label }}</div>
      <div v-else class="sec-line"/>
      <v-list class="mp-nav" density="compact" nav>
        <v-list-item v-for="n in g.items" :key="n.to" :prepend-icon="n.icon" :title="n.label" :to="n.to">
          <template v-if="(!rail || narrow) && n.badge()" #append>
            <span class="count">{{ n.badge() }}</span>
          </template>
        </v-list-item>
      </v-list>
    </template>
  </v-navigation-drawer>

  <v-app-bar :class="{stuck: scrolled}" :elevation="0" class="mp-bar" height="64">
    <v-app-bar-nav-icon v-if="narrow" @click="drawer = !drawer"/>

    <v-text-field
        v-if="!narrow"
        v-model="s.ani.keyword"
        class="bar-search"
        clearable
        density="compact"
        hide-details
        :placeholder="s.searchHint.value"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
    />

    <v-spacer/>

    <v-btn :icon="s.themeIcon.value" :title="`主题：${s.prefs.mode}`" color="default" variant="text"
           @click="s.cycleTheme"/>
    <v-menu>
      <template #activator="{props}">
        <v-btn v-bind="props" color="default" icon="mdi-account-circle-outline" variant="text"/>
      </template>
      <v-list density="compact">
        <v-list-item :subtitle="`${s.ani.enabledCount} / ${s.ani.total} 启用`" title="ani-rss"/>
        <v-divider/>
        <v-list-item prepend-icon="mdi-logout" title="退出登录" @click="s.logout"/>
      </v-list>
    </v-menu>
  </v-app-bar>

  <v-main>
    <div class="mp-content mx-auto">
      <div v-if="narrow && s.showSearch.value" class="pb-0 px-4 pt-4">
        <v-text-field v-model="s.ani.keyword" clearable density="compact" hide-details
                      placeholder="搜索订阅" prepend-inner-icon="mdi-magnify" variant="outlined"/>
      </div>
      <!-- keep-alive：切走再切回来不重新挂载。没有套 <transition> ——
           两者一起用时 out-in 收不到离场结束事件，路由会卡在上一页 -->
      <router-view v-slot="{Component}">
        <keep-alive :max="4">
          <component :is="Component"/>
        </keep-alive>
      </router-view>
    </div>
  </v-main>
</template>

<style scoped>
.mp-side.v-navigation-drawer {
    border: none;
}

.side-head {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 64px;
    padding: 0 12px 0 18px;
}

.mark {
    flex: 0 0 auto;
    color: rgb(var(--v-theme-primary));
}

.brand {
    font-size: 1.25rem;
    font-weight: 600;
    letter-spacing: .01em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.sec {
    padding: 0 18px;
    margin-top: 10px;
    font-size: .75rem;
    line-height: 24px;
    opacity: .5;
}

.sec-line {
    width: 22px;
    height: 1px;
    margin: 14px auto 8px;
    background: rgba(var(--v-theme-on-surface), .3);
}

.mp-nav {
    padding: 0;
}

/*
 * 一条导航项：高 42px（2.625rem）、左右各让出 18px（1.125rem）、
 * 内边距 16px，条与条之间 6px —— 那 6px 是留给选中态阴影的，
 * 挨太紧的话 elevation 3 会被下一条切掉一半。
 */
.mp-nav :deep(.v-list-item) {
    min-height: 42px;
    margin: 0 18px 6px;
    padding-inline: 16px !important;
    border-radius: 0 50px 50px 0;
}

/* 收起态没有「右半边药丸」可言，原版这一档换成 12px 的圆角方块 */
.v-navigation-drawer--rail .mp-nav :deep(.v-list-item) {
    margin-inline: 12px;
    border-radius: 12px;
}

/*
 * 选中态：紫色渐变 + elevation 3 + 白字。
 * 渐变的第二个端点在 300% 处，所以实际看到的是「左深右浅」的一段，
 * 而不是整条从紫到白 —— 照抄原版 %nav-link-active。
 */
.mp-nav :deep(.v-list-item--active) {
    background: linear-gradient(270deg, rgb(var(--v-theme-primary)) 0%, #fff 300%);
    color: rgb(var(--v-theme-on-primary));
    box-shadow: var(--mp-elev-3);
}

/* Vuetify 自己会再叠一层 activated 底色，叠上去渐变就浑了 */
.mp-nav :deep(.v-list-item--active .v-list-item__overlay) {
    opacity: 0;
}

/*
 * 标题和图标要单独钉一次白色。
 * v-list 上挂着 color="primary"（MP 的 defaults 就是这么写的），选中项因此拿到一个
 * text-primary 的类 —— 紫字压在紫渐变上，实测「总览」两个字几乎看不见。
 * 父元素上的 color 继承不过去，因为那个类是直接写在标题元素上的。
 */
.mp-nav :deep(.v-list-item--active .v-list-item-title),
.mp-nav :deep(.v-list-item--active .v-icon) {
    color: rgb(var(--v-theme-on-primary));
}

.count {
    font-size: .72rem;
    opacity: .8;
    font-variant-numeric: tabular-nums;
}

/*
 * 顶栏：平时完全透明，滚动后才糊毛玻璃。
 * base.css 给 .v-toolbar 的底色带 !important，这里必须同样带，否则一换主题就被盖回去。
 */
.mp-bar.v-toolbar {
    background: transparent !important;
    backdrop-filter: none;
    transition: background-color var(--m-dur) var(--m-ease), box-shadow var(--m-dur) var(--m-ease);
}

.mp-bar.stuck.v-toolbar {
    background: rgba(var(--v-theme-surface), .88) !important;
    backdrop-filter: blur(12px) saturate(1.2);
    -webkit-backdrop-filter: blur(12px) saturate(1.2);
    box-shadow: 0 1px 3px rgba(0, 0, 0, .04), 0 1px 2px rgba(0, 0, 0, .02);
}

.bar-search {
    flex: 1 1 220px;
    min-width: 0;
    max-width: 420px;
}

.mp-content {
    width: 100%;
    max-width: var(--mp-content-max);
}
</style>
