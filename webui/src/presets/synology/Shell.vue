<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref} from 'vue'
import {useRouter} from 'vue-router'
import {useDisplay} from 'vuetify'
import {useShell} from '@/composables/useShell'
import './preset.css'

/**
 * 群晖 DSM 外壳：壁纸桌面 + 顶上一条深色任务栏 + 一扇带左侧栏的窗。
 *
 * 三款「桌面」外壳里的第三种形状，三者刻意不重样：
 *  · win98  —— 任务栏在**底**，导航在窗内的左侧树，开始菜单是主入口
 *  · Mac    —— 菜单栏在**屏幕**顶上，导航是窗内的一排纸片标签，没有任务栏
 *  · DSM    —— 任务栏在**顶**，主菜单是九宫格，导航在窗内的左侧栏
 *
 * 窗口按钮在**右**边（Win 的排法），不是左边（Mac 的排法）—— DSM 就是这么放的。
 * 三颗都是真的：最小化把窗收进任务栏、最大化在「贴边」和「留一圈桌面」之间切、
 * 关闭是退出登录。画三颗按上去却点不动，比不画还糟。
 */
const {mobile} = useDisplay()
const s = useShell()
const router = useRouter()

/** 窗口状态。都不持久化：刷新回到最大化，和真在 DSM 里重开一个套件一样 */
const minimized = ref(false)
const maximized = ref(true)
/** 窄屏的侧栏是抽屉，由主菜单那颗按钮开 */
const drawer = ref(false)

const clock = ref('')
let timer = 0
const tick = () => {
  const d = new Date()
  clock.value = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}
onMounted(() => {
  tick()
  timer = window.setInterval(tick, 30000)
  document.documentElement.classList.add('dsm-root')
})
onBeforeUnmount(() => {
  clearInterval(timer)
  document.documentElement.classList.remove('dsm-root')
})

const caption = computed(() => s.title.value)

function go(to: string) {
  minimized.value = false
  drawer.value = false
  if (s.route.path !== to) void router.push(to)
}
</script>

<template>
  <div :class="{restored: !maximized}" class="dsm-desktop">
    <!-- ══ 任务栏 ══ 顶上那条深色玻璃 -->
    <div class="dsm-taskbar">
      <!-- 主菜单：DSM 的九宫格。窄屏时它同时是侧栏抽屉的开关 -->
      <v-menu v-if="!mobile" location="bottom start" offset="4">
        <template #activator="{props: p, isActive}">
          <button v-bind="p" :class="{on: isActive}" class="dsm-tb-btn" title="主菜单" type="button">
            <v-icon icon="mdi-view-grid" size="20"/>
          </button>
        </template>
        <div class="dsm-launcher">
          <button v-for="n in s.nav.value" :key="n.to" class="dsm-app" type="button" @click="go(n.to)">
            <v-icon :icon="n.icon" size="26"/>
            <span>{{ n.label }}</span>
          </button>
        </div>
      </v-menu>
      <button v-else class="dsm-tb-btn" title="主菜单" type="button" @click="drawer = true">
        <v-icon icon="mdi-view-grid" size="20"/>
      </button>

      <!-- 打开的「套件」按钮。这个程序只有一扇窗，所以只有一颗 -->
      <button :class="{on: !minimized}" class="dsm-task" type="button" @click="minimized = !minimized">
        <v-icon icon="mdi-rss" size="16"/>
        <span class="dsm-task-label">ani-rss</span>
      </button>

      <v-spacer/>

      <button class="dsm-tb-btn" title="下载任务" type="button" @click="go('/downloads')">
        <v-icon icon="mdi-download-outline" size="18"/>
        <span v-if="s.torrents.items.length" class="dsm-dot">{{ s.torrents.items.length }}</span>
      </button>
      <button :title="`主题：${s.prefs.mode}`" class="dsm-tb-btn" type="button" @click="s.cycleTheme">
        <v-icon :icon="s.themeIcon.value" size="18"/>
      </button>
      <span class="dsm-clock">{{ clock }}</span>
    </div>

    <!-- ══ 窗口 ══ 最小化时只是藏起来（v-show），滚动位置和列表状态都留着 -->
    <div v-show="!minimized" class="dsm-window">
      <!-- 宽屏的左侧栏。窄屏走抽屉那一份，两处的项来自同一个 s.nav -->
      <nav v-if="!mobile" class="dsm-side">
        <div class="dsm-side-head">
          <v-icon icon="mdi-rss-box" size="20"/>
          <span>ani-rss</span>
        </div>
        <button v-for="n in s.nav.value" :key="n.to" :class="{on: s.isActive(n.to)}" class="dsm-side-item"
                type="button" @click="go(n.to)">
          <v-icon :icon="n.icon" size="18"/>
          <span class="dsm-side-label">{{ n.label }}</span>
          <span v-if="n.badge()" class="dsm-side-num">{{ n.badge() }}</span>
        </button>
      </nav>

      <div class="dsm-main">
        <!-- ── 窗口标题栏 ── 标题在左，三颗窗口按钮在右 -->
        <div class="dsm-titlebar">
          <span class="dsm-caption">{{ caption }}</span>

          <v-text-field
              v-if="s.showSearch.value && !mobile"
              v-model="s.ani.keyword"
              class="dsm-search"
              clearable
              density="compact"
              hide-details
              :placeholder="s.searchHint.value"
              prepend-inner-icon="mdi-magnify"
          />

          <div class="dsm-win-btns">
            <button class="dsm-win-btn" title="最小化" type="button" @click="minimized = true">
              <v-icon icon="mdi-window-minimize" size="16"/>
            </button>
            <button :title="maximized ? '向下还原' : '最大化'" class="dsm-win-btn" type="button"
                    @click="maximized = !maximized">
              <v-icon :icon="maximized ? 'mdi-window-restore' : 'mdi-window-maximize'" size="16"/>
            </button>
            <button class="dsm-win-btn dsm-win-close" title="退出登录" type="button" @click="s.logout">
              <v-icon icon="mdi-window-close" size="16"/>
            </button>
          </div>
        </div>

        <div class="dsm-content">
          <!-- 窄屏的搜索框落到内容顶上：标题栏塞不下一个能用的输入框 -->
          <div v-if="s.showSearch.value && mobile" class="pa-3 pb-0">
            <v-text-field v-model="s.ani.keyword" clearable density="compact" hide-details
                          placeholder="搜索订阅" prepend-inner-icon="mdi-magnify"/>
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
        </div>
      </div>
    </div>

    <!-- 窄屏的侧栏抽屉 -->
    <v-navigation-drawer v-model="drawer" :width="248" temporary>
      <div class="dsm-side-head">
        <v-icon icon="mdi-rss-box" size="20"/>
        <span>ani-rss</span>
      </div>
      <v-list nav>
        <v-list-item v-for="n in s.nav.value" :key="n.to" :active="s.isActive(n.to)" :prepend-icon="n.icon"
                     :title="n.label" @click="go(n.to)">
          <template v-if="n.badge()" #append>
            <span class="dsm-side-num">{{ n.badge() }}</span>
          </template>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
  </div>
</template>

<style scoped>
/*
 * ── 尺寸全部走 preset.css 里的变量 ──
 *
 * 一份给 flex 布局本身，一份给 --ani-page-*（设置页和日志页要按它算自己的高度，
 * 那两页是「整页不滚、中间那段滚」的结构）。两边算出来必须分毫不差 ——
 * 差一点点的表现是保存条被顶出可视区、或者底下多一条缝，
 * 所以干脆让它们引用同一组变量，不各写各的数。
 */
.dsm-desktop {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    /* 背景是皮肤画的那张壁纸（body::before），这里必须透明，不能自己再涂一层 */
    background: transparent;
}

/* 「向下还原」：留一圈桌面出来，让人看见底下确实是个桌面 */
.dsm-desktop.restored {
    --dsm-pad: 54px;
}

@media (max-width: 599.98px), (pointer: coarse) {
    .dsm-desktop.restored {
        --dsm-pad: 10px;
    }
}

/* ── 任务栏 ── */
.dsm-taskbar {
    display: flex;
    align-items: center;
    gap: 2px;
    flex: 0 0 var(--dsm-taskh);
    padding-inline: 6px;
    background: var(--dsm-task-bg);
    color: var(--dsm-task-ink);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
}

.dsm-tb-btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 6px;
    background: none;
    color: inherit;
    cursor: pointer;
}

.dsm-tb-btn:hover,
.dsm-tb-btn.on {
    background: rgba(255, 255, 255, .16);
}

/* 任务按钮：按下 = 窗开着。DSM 用底下一条亮杠表示「这个套件正开着」 */
.dsm-task {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    flex: 0 1 auto;
    min-width: 0;
    height: 36px;
    margin-left: 6px;
    padding: 0 12px;
    border: none;
    border-radius: 6px;
    background: rgba(255, 255, 255, .08);
    color: inherit;
    cursor: pointer;
}

.dsm-task.on {
    background: rgba(255, 255, 255, .2);
    box-shadow: inset 0 -2px 0 rgb(var(--v-theme-primary));
}

.dsm-task-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: .84rem;
}

/* 任务栏上的计数是个小圆点，压在图标右上角 */
.dsm-dot {
    position: absolute;
    top: 2px;
    right: 0;
    min-width: 16px;
    padding: 0 4px;
    border-radius: 999px;
    background: rgb(var(--v-theme-primary));
    color: #fff;
    font-size: .62rem;
    line-height: 16px;
    font-variant-numeric: tabular-nums;
}

.dsm-clock {
    padding-inline: 10px;
    font-size: .82rem;
    font-variant-numeric: tabular-nums;
}

/* ── 主菜单（九宫格） ── */
.dsm-launcher {
    display: grid;
    grid-template-columns: repeat(3, 84px);
    gap: 4px;
    padding: 10px;
    border-radius: 10px;
    background: rgba(var(--v-theme-surface), .96);
    box-shadow: var(--ani-shadow, 0 8px 24px rgba(0, 0, 0, .2));
}

.dsm-app {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    min-height: 76px;
    padding: 10px 4px;
    border: none;
    border-radius: 8px;
    background: none;
    color: inherit;
    font-size: .76rem;
    cursor: pointer;
}

.dsm-app:hover {
    background: rgba(var(--v-theme-on-surface), .08);
}

/* ── 窗口 ── */
.dsm-window {
    display: flex;
    flex: 1 1 auto;
    min-height: 0;
    margin: var(--dsm-pad);
    margin-top: 0;
    border-radius: var(--dsm-radius);
    overflow: hidden;
    background: rgb(var(--v-theme-surface));
    box-shadow: 0 10px 40px rgba(0, 0, 0, .34);
}

@media (min-width: 600px) {
    .dsm-window {
        margin-top: var(--dsm-pad);
    }
}

/* ── 左侧栏 ── */
.dsm-side {
    display: flex;
    flex-direction: column;
    flex: 0 0 var(--dsm-side);
    padding: 8px;
    background: rgb(var(--v-theme-surface-variant));
    border-right: 1px solid rgba(128, 128, 128, .22);
    overflow-y: auto;
}

.dsm-side-head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 10px 14px;
    font-weight: 600;
}

.dsm-side-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 38px;
    padding: 0 10px;
    margin-bottom: 2px;
    border: none;
    border-radius: 6px;
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
}

.dsm-side-item:hover {
    background: rgba(var(--v-theme-on-surface), .07);
}

/* 当前项：淡蓝底 + 左边一条蓝杠，DSM 侧栏最好认的一处 */
.dsm-side-item.on {
    background: rgba(var(--v-theme-primary), .13);
    color: rgb(var(--v-theme-primary));
    box-shadow: inset 3px 0 0 rgb(var(--v-theme-primary));
}

.dsm-side-label {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: .88rem;
}

.dsm-side-num {
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

/* ── 窗体右半 ── */
.dsm-main {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-width: 0;
    min-height: 0;
}

.dsm-titlebar {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 0 0 var(--dsm-titleh);
    padding-inline: 14px 8px;
    border-bottom: 1px solid rgba(128, 128, 128, .22);
}

.dsm-caption {
    flex: 0 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 1rem;
    font-weight: 600;
}

.dsm-search {
    flex: 1 1 180px;
    min-width: 0;
    max-width: 330px;
    margin-left: auto;
}

.dsm-win-btns {
    display: flex;
    flex: 0 0 auto;
    gap: 2px;
    margin-left: auto;
}

.dsm-win-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 6px;
    background: none;
    color: inherit;
    opacity: .75;
    cursor: pointer;
}

.dsm-win-btn:hover {
    opacity: 1;
    background: rgba(var(--v-theme-on-surface), .09);
}

/* 关闭那颗是退出登录，悬停时给红底 —— 和 DSM 一样，也和 Windows 一样 */
.dsm-win-close:hover {
    background: rgb(var(--v-theme-error));
    color: #fff;
}

.dsm-content {
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
}
</style>

<style>
/*
 * 内容区高度：设置页和日志页是「整页不滚、中间那段滚」的结构，它们用
 * --ani-page-* 减掉外壳占掉的部分。写在非 scoped 块里是因为要落到共用页面上，
 * 那些页面不在这个组件的模板里。
 *
 * 数值引用的是 preset.css 里那组变量，和上面 flex 布局用的是同一份 ——
 * 各写各的迟早差一像素，表现是保存条被顶出可视区，或者底下多一条缝。
 */
.dsm-content {
    /* 任务栏 + 窗户上外边距 + 窗口标题栏。窄屏时 --dsm-pad 是 0，公式照样成立 */
    --ani-page-top: calc(var(--dsm-taskh) + var(--dsm-pad) + var(--dsm-titleh));
    --ani-page-bottom: var(--dsm-pad);
}
</style>
