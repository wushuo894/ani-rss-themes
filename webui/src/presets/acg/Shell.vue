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
        :placeholder="s.searchHint.value"
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

  <!-- 手机上底部垫了 76px 给导航条让位，整屏高度的页面（设置/日志）要把它扣掉 -->
  <v-main :style="mobile ? {'--ani-page-bottom': '76px'} : undefined">
    <div v-if="s.showSearch.value && mobile" class="pa-3 pb-0">
      <v-text-field v-model="s.ani.keyword" clearable density="compact" hide-details
                    placeholder="搜索订阅" prepend-inner-icon="mdi-magnify"/>
    </div>
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

/*
 * 侧栏和顶栏是同一块玻璃，所以侧栏不能有圆角。
 *
 * base.css 给所有主题的抽屉兜了 `border-radius: var(--ani-radius)`（这一款是 14px）。
 * 对浮在页面上的抽屉那是对的，但这一款的顶栏是通栏的、侧栏紧贴在它下面 ——
 * 圆角一拐，顶栏底边和侧栏顶边之间就空出一个 14×14 的角，壁纸从那儿透出来，
 * 看着像两块没对齐的板。四个角同理：左边两个贴着屏幕边，也是同一个缺口。
 *
 * 两条路里选的是「浑然一体」而不是「悬浮隔离」：这一款的外壳本来就是通栏的
 * —— 顶栏铺满整宽，窄屏的底部导航也铺满整宽。只把侧栏改成悬浮的话，
 * 它会是这一款里唯一一块浮起来的外壳，和自己的手机版也对不上；
 * 而「一块块浮板」是 ab 的语言、「悬浮胶囊导航」是 liquid-glass 的语言，
 * 这一款再去浮，三款就长到一起去了。这一款里浮在图上的是内容卡片，外壳是画框。
 *
 * 权重要压过 base.css 那条（0,2,1），所以带上 .v-navigation-drawer 凑到 0,3,0。
 */
.glass-rail.v-navigation-drawer {
    border-radius: 0;
}

.glass-rail {
    border-right: 1px solid rgba(255, 255, 255, .14);
}

/*
 * 侧栏里那张 v-list 不许自己上色。
 *
 * v-list 是个 v-sheet，底色拿的是不透明的 surface；而侧栏本身是
 * rgba(surface, --ani-surface-alpha)，壁纸要从它后面透出来。
 * 两者叠在一起，侧栏就成了上下两截颜色：列表罩住的那一段（图标那几行）是实色，
 * 列表下边那一大片才是半透明——中间一道横的分界线，看着像侧栏被截断了。
 * 底部导航没有这个问题，它里面装的是 v-btn，不是 v-list。
 */
.glass-rail :deep(.v-list) {
    background: transparent;
}

.glass-bottom {
    border-top: 1px solid rgba(255, 255, 255, .14);
}
</style>
