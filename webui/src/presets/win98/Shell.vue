<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref} from 'vue'
import {useRouter} from 'vue-router'
import {useDisplay} from 'vuetify'
import {useShell} from '@/composables/useShell'
import './preset.css'

/**
 * Win98 外壳：整个应用装在一扇窗户里。
 *
 * 别的四款是「网页」的形状 —— 顶栏 + 内容，导航要么在侧边要么在顶部。
 * 这一款是「桌面应用」的形状：一片青绿桌面上摆一扇最大化的窗，窗有标题栏、
 * 菜单栏、左边一列资源管理器窗格、底下一条状态栏；桌面最下面钉一条任务栏，
 * 「开始」菜单是主导航。这不是给 Win98 配色，是把 Win98 的窗口模型搬过来 ——
 * 只换颜色的话，看着仍然是一个刷成灰色的网页。
 *
 * 三个标题栏按钮都是真的：最小化把窗收进任务栏（点任务栏按钮回来）、
 * 最大化在「贴边」和「留一圈桌面」之间切、关闭是退出登录。
 * 画三颗按上去却点不动，比不画还糟。
 */
const {mobile} = useDisplay()
const s = useShell()
const router = useRouter()

/** 窗口状态。都不持久化：刷新回到最大化，和真系统里重开一个程序一样 */
const minimized = ref(false)
const maximized = ref(true)

/** 任务栏右下角的钟。分钟级就够，30 秒一跳保证跨分钟时不会慢半拍 */
const clock = ref('')
let timer = 0
const tick = () => {
  const d = new Date()
  clock.value = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}
onMounted(() => {
  tick()
  timer = window.setInterval(tick, 30000)
  document.documentElement.classList.add('w98-root')
})
onBeforeUnmount(() => {
  clearInterval(timer)
  document.documentElement.classList.remove('w98-root')
})

/** 标题栏文案照 Win98 的规矩来：「文档 - 程序」 */
const caption = computed(() => `${s.title.value} - ani-rss`)

const MODE_LABEL = {light: '浅色', dark: '深色', system: '跟随系统'}

/*
 * 菜单项是 <li> 不是 <button> —— Win98 的菜单项没有边框、没有内边距的按钮外观，
 * 用 button 得把浏览器给的那一套全撤掉。代价是键盘够不着，所以自己补两样：
 * 每项 tabindex="0" 进 Tab 序列，回车转成一次 click，动作还是 @click 那一份，不写两遍。
 * 宽屏还有左边的资源管理器窗格能走导航，手机上开始菜单是唯一入口，缺了它键盘用户过不去。
 */
const enterClick = (e: KeyboardEvent) => (e.target as HTMLElement | null)?.click()

function go(to: string) {
  minimized.value = false
  if (s.route.path !== to) void router.push(to)
}
</script>

<template>
  <div :class="{'is-restored': !maximized}" class="w98-desktop">
    <!-- ══ 窗口 ══ 最小化时只是藏起来（v-show），滚动位置和列表状态都留着 -->
    <div v-show="!minimized" class="w98-window">
      <!-- ── 标题栏 ── -->
      <div class="w98-titlebar">
        <v-icon class="w98-titleicon" icon="mdi-rss" size="14"/>
        <span class="w98-caption">{{ caption }}</span>
        <div class="w98-tb-btns">
          <button class="w98-tb w98-tb-min" title="最小化" type="button" @click="minimized = true"/>
          <button :title="maximized ? '向下还原' : '最大化'" class="w98-tb w98-tb-max" type="button"
                  @click="maximized = !maximized"/>
          <button class="w98-tb w98-tb-close" title="退出登录" type="button" @click="s.logout"/>
        </div>
      </div>

      <!-- ── 菜单栏 ── 带下划线的访问键是 Win98 的招牌，这里只做样子，不抢浏览器的 Alt -->
      <div class="w98-menubar">
        <v-menu :transition="false" location="bottom start" offset="1">
          <template #activator="{props: p, isActive}">
            <button v-bind="p" :class="{on: isActive}" class="w98-menu" type="button">
              <u>文</u>件
            </button>
          </template>
          <ul class="w98-dropdown" role="menu" @keydown.enter.prevent="enterClick">
            <li role="menuitem" tabindex="0" @click="s.ani.refreshAll()">
              <v-icon icon="mdi-refresh" size="14"/>
              全部刷新
            </li>
            <li role="menuitem" tabindex="0" @click="go('/downloads')">
              <v-icon icon="mdi-download-outline" size="14"/>
              下载器
            </li>
            <li class="sep"/>
            <li role="menuitem" tabindex="0" @click="s.logout()">
              <v-icon icon="mdi-logout" size="14"/>
              退出登录
            </li>
          </ul>
        </v-menu>

        <v-menu :transition="false" location="bottom start" offset="1">
          <template #activator="{props: p, isActive}">
            <button v-bind="p" :class="{on: isActive}" class="w98-menu" type="button">
              <u>查</u>看
            </button>
          </template>
          <ul class="w98-dropdown" role="menu" @keydown.enter.prevent="enterClick">
            <li v-for="n in s.nav.value" :key="n.to" :class="{checked: s.isActive(n.to)}" role="menuitem"
                tabindex="0" @click="go(n.to)">
              <v-icon :icon="n.icon" size="14"/>
              {{ n.label }}
            </li>
            <li class="sep"/>
            <li role="menuitem" tabindex="0" @click="s.cycleTheme()">
              <v-icon :icon="s.themeIcon.value" size="14"/>
              明暗：{{ MODE_LABEL[s.prefs.mode] }}
            </li>
          </ul>
        </v-menu>

        <v-menu :transition="false" location="bottom start" offset="1">
          <template #activator="{props: p, isActive}">
            <button v-bind="p" :class="{on: isActive}" class="w98-menu" type="button">
              <u>帮</u>助
            </button>
          </template>
          <ul class="w98-dropdown" role="menu" @keydown.enter.prevent="enterClick">
            <li role="menuitem" tabindex="0" @click="go('/settings/about')">
              <v-icon icon="mdi-information-outline" size="14"/>
              关于 ani-rss
            </li>
          </ul>
        </v-menu>
      </div>

      <!-- ── 窗体：左边资源管理器窗格，右边内容 ── -->
      <div class="w98-body">
        <nav v-if="!mobile" class="w98-tree">
          <div class="w98-tree-root">
            <v-icon icon="mdi-monitor" size="14"/>
            ani-rss
          </div>
          <button v-for="n in s.nav.value" :key="n.to" :class="{on: s.isActive(n.to)}" class="w98-tree-item"
                  type="button" @click="go(n.to)">
            <v-icon :icon="s.isActive(n.to) ? 'mdi-folder-open' : 'mdi-folder'" size="14"/>
            <span class="w98-tree-label">{{ n.label }}</span>
            <span v-if="n.badge()" class="w98-tree-num">{{ n.badge() }}</span>
          </button>
        </nav>

        <div class="w98-content">
          <!-- 查找栏：订阅页才有意义，摆在内容区顶上当一条工具栏 -->
          <div v-if="s.showSearch.value" class="w98-findbar">
            <span class="w98-findlabel">查找：</span>
            <input v-model="s.ani.keyword" class="w98-input" placeholder="标题 / 字幕组 / 拼音 / 首字母"
                   type="search"/>
          </div>

          <!-- keep-alive：切走再切回来不重新挂载 —— 列表不重新渲染、滚动位置还在，
               日志和下载器也不必重新拉一遍。4 个刚好装下总览/订阅/下载器/日志。

               没有套 <transition>：它和 keep-alive 一起用会死锁 —— 离场的组件被
               移进 keep-alive 的隐藏容器，leave 过渡永远收不到结束事件，
               out-in 就一直等在那儿，整个路由卡死在上一页。这一款本来也没有过场动画。 -->
          <router-view v-slot="{Component}">
            <keep-alive :max="4">
              <component :is="Component"/>
            </keep-alive>
          </router-view>
        </div>
      </div>

      <!-- ── 状态栏 ── -->
      <div class="w98-status">
        <span class="w98-cell w98-cell-grow">{{ s.ani.total }} 个对象</span>
        <span class="w98-cell">{{ s.ani.enabledCount }} 个已启用</span>
        <span class="w98-cell">{{ s.torrents.items.length }} 个下载任务</span>
      </div>
    </div>

    <!-- ══ 任务栏 ══ -->
    <div class="w98-taskbar">
      <v-menu :transition="false" location="top start" offset="2">
        <template #activator="{props: p, isActive}">
          <button v-bind="p" :class="{on: isActive}" class="w98-start" type="button">
            <v-icon icon="mdi-microsoft-windows" size="16"/>
            <span>开始</span>
          </button>
        </template>
        <div class="w98-startmenu">
          <div class="w98-startbrand"><span>ani<b>98</b></span></div>
          <ul class="w98-dropdown w98-startlist" role="menu" @keydown.enter.prevent="enterClick">
            <li v-for="n in s.nav.value" :key="n.to" :class="{checked: s.isActive(n.to)}" role="menuitem"
                tabindex="0" @click="go(n.to)">
              <v-icon :icon="n.icon" size="20"/>
              {{ n.label }}
              <span v-if="n.badge()" class="w98-start-num">{{ n.badge() }}</span>
            </li>
            <li class="sep"/>
            <li role="menuitem" tabindex="0" @click="s.cycleTheme()">
              <v-icon :icon="s.themeIcon.value" size="20"/>
              显示属性
            </li>
            <li role="menuitem" tabindex="0" @click="s.logout()">
              <v-icon icon="mdi-logout" size="20"/>
              关闭系统…
            </li>
          </ul>
        </div>
      </v-menu>

      <!-- 任务按钮：这个程序只有一扇窗，所以只有一颗。按下 = 窗开着 -->
      <button :class="{on: !minimized}" class="w98-task" type="button" @click="minimized = !minimized">
        <v-icon icon="mdi-rss" size="14"/>
        <span class="w98-task-label">{{ caption }}</span>
      </button>

      <!-- 托盘：当年这里放的就是音量、输入法和钟 -->
      <div class="w98-tray">
        <button :title="`主题：${s.prefs.mode}`" class="w98-trayicon" type="button" @click="s.cycleTheme">
          <v-icon :icon="s.themeIcon.value" size="14"/>
        </button>
        <span class="w98-clock">{{ clock }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * ── 尺寸都写成变量，两个地方要用同一份 ──
 *
 * 一份给 flex 布局本身，一份给 --ani-page-*（设置页和日志页要按它算自己的高度，
 * 那两页是「整页不滚、中间那段滚」的结构）。两边算出来必须分毫不差 ——
 * 差一点点的表现是保存条被顶出可视区、或者底下多一条缝，
 * 所以干脆让它们引用同一组变量，不各写各的数。
 */
.w98-desktop {
    --w98-pad: 6px;
    --w98-frame: 3px;
    --w98-titleh: 22px;
    --w98-menuh: 21px;
    --w98-statush: 22px;
    --w98-taskh: 30px;

    --w98-chrome-top: calc(var(--w98-pad) + var(--w98-frame) + var(--w98-titleh) + var(--w98-menuh) + 2px);
    --w98-chrome-bottom: calc(var(--w98-statush) + 2px + var(--w98-frame) + var(--w98-pad) + var(--w98-taskh));

    position: fixed;
    inset: 0;
    padding: var(--w98-pad) var(--w98-pad) calc(var(--w98-taskh) + var(--w98-pad));
    background: var(--w98-desk);
    color: var(--w98-ink);
    font-size: 12px;
}

/*
 * 手机：桌面那圈留白取消（390px 上一圈 6px 就是白扔 12px 内容宽度），
 * 其余每一处都得加高 —— 22px 的标题栏在鼠标下刚好，手指下点不着。
 * 断点两条并列：窄屏保证手机命中，pointer: coarse 覆盖平板
 * （Vuetify 的 mobile 断点是 lg 1280，平板拿到的也是这套外壳）。
 */
@media (max-width: 599.98px), (pointer: coarse) {
    .w98-desktop {
        --w98-pad: 0px;
        /*
         * 标题栏和菜单栏都要装得下 36px 的按钮 —— 那是这个项目的触摸下限。
         * 1998 年的 22px 标题栏在鼠标下刚好，手指下三颗按钮挨在一起，
         * 想点「最大化」十次有三次点成「关闭」（而关闭是退出登录）。
         */
        --w98-titleh: 40px;
        --w98-menuh: 40px;
        --w98-taskh: 44px;
    }
}

/* 「向下还原」：留一圈桌面出来，让人看见底下确实是个桌面 */
.w98-desktop.is-restored {
    --w98-pad: 24px;
}

@media (max-width: 599.98px), (pointer: coarse) {
    .w98-desktop.is-restored {
        --w98-pad: 8px;
    }
}

.w98-window {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: var(--w98-frame);
    background: var(--w98-face);
    box-shadow: var(--w98-win);
}

/* ── 标题栏 ── */
.w98-titlebar {
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 0 0 var(--w98-titleh);
    padding: 0 2px 0 3px;
    background: linear-gradient(90deg, var(--w98-title-a), var(--w98-title-b));
    color: #fff;
}

.w98-titleicon {
    flex: 0 0 auto;
}

.w98-caption {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    font-weight: 700;
}

.w98-tb-btns {
    display: flex;
    flex: 0 0 auto;
    gap: 2px;
}

/*
 * 三颗标题栏按钮。原版是 16×14，鼠标下够用，手指下完全点不着 ——
 * 触屏上放大到 26×22，形状不变。
 */
.w98-tb {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    width: 16px;
    height: 14px;
    padding-bottom: 2px;
    background: var(--w98-face);
    color: var(--w98-ink);
    box-shadow: var(--w98-out);
}

.w98-tb:active {
    box-shadow: var(--w98-in);
}

.w98-tb-min::before {
    content: '';
    width: 7px;
    height: 2px;
    background: currentColor;
}

.w98-tb-max::before {
    content: '';
    width: 9px;
    height: 8px;
    margin-bottom: 1px;
    border: 1px solid currentColor;
    border-top-width: 2px;
}

.w98-tb-close {
    align-items: center;
    padding-bottom: 0;
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
}

.w98-tb-close::before {
    content: '✕';
}

@media (max-width: 599.98px), (pointer: coarse) {
    .w98-tb {
        width: 38px;
        height: 36px;
    }

    .w98-tb-close {
        font-size: 13px;
    }
}

/* ── 菜单栏 ── */
.w98-menubar {
    display: flex;
    align-items: stretch;
    flex: 0 0 var(--w98-menuh);
    padding-top: 2px;
}

.w98-menu {
    padding: 0 8px;
    background: transparent;
    color: var(--w98-ink);
    font-size: 12px;
}

/* Win98 的菜单项高亮是「反白」，不是把底色调深一点 */
.w98-menu:hover,
.w98-menu.on {
    background: var(--w98-title-a);
    color: #fff;
}

.w98-menu u {
    text-underline-offset: 2px;
}

@media (max-width: 599.98px), (pointer: coarse) {
    .w98-menu {
        padding: 0 14px;
        font-size: 14px;
    }
}

/* ── 下拉菜单（菜单栏和开始菜单共用）── */
.w98-dropdown {
    min-width: 168px;
    margin: 0;
    padding: 2px;
    background: var(--w98-face);
    box-shadow: var(--w98-out);
    color: var(--w98-ink);
    font-size: 12px;
    list-style: none;
}

.w98-dropdown li {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 20px;
    padding: 2px 18px 2px 6px;
    cursor: default;
}

.w98-dropdown li:hover {
    background: var(--w98-title-a);
    color: #fff;
}

/* 当前所在的那一项打勾 —— Win98 的「查看」菜单就是这么标当前视图的 */
.w98-dropdown li.checked::after {
    content: '✓';
    margin-left: auto;
    font-weight: 700;
}

.w98-dropdown li.sep {
    height: 0;
    min-height: 0;
    margin: 3px 2px;
    padding: 0;
    border-top: 1px solid var(--w98-shade);
    border-bottom: 1px solid var(--w98-hi);
    pointer-events: none;
}

@media (max-width: 599.98px), (pointer: coarse) {
    .w98-dropdown {
        font-size: 14px;
    }

    .w98-dropdown li {
        min-height: 36px;
        padding: 6px 18px 6px 10px;
    }
}

/* ── 窗体 ── */
.w98-body {
    display: flex;
    flex: 1 1 auto;
    min-height: 0;
    gap: 3px;
    padding-top: 2px;
}

/* 左边的资源管理器窗格，只有宽屏有；手机上导航走开始菜单 */
.w98-tree {
    flex: 0 0 150px;
    overflow: auto;
    padding: 2px;
    background: #fff;
    box-shadow: var(--w98-well);
}

.w98-tree-root {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 2px 4px;
    font-weight: 700;
}

.w98-tree-item {
    display: flex;
    align-items: center;
    gap: 5px;
    width: 100%;
    /* 树形的缩进：资源管理器里子项比父项缩一级 */
    padding: 3px 4px 3px 18px;
    background: transparent;
    color: var(--w98-ink);
    font-size: 12px;
    text-align: left;
}

.w98-tree-item.on {
    background: var(--w98-title-a);
    color: #fff;
}

.w98-tree-label {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.w98-tree-num {
    flex: 0 0 auto;
    font-size: 11px;
    opacity: .75;
}

/*
 * 内容区：唯一会滚的那一块。
 *
 * 高度写死成「视口减去上下窗框」而不是 flex: 1 —— 设置页和日志页自己也要按
 * 同一个公式算高度（它们减的是 --ani-page-*），两边引用同一组变量才不会差一像素。
 * dvh 而不是 vh：手机地址栏收起时 vh 不跟着变，用 vh 会把状态栏顶到屏幕外面。
 */
.w98-content {
    --ani-page-top: var(--w98-chrome-top);
    --ani-page-bottom: var(--w98-chrome-bottom);
    flex: 1 1 auto;
    min-width: 0;
    height: calc(100vh - var(--w98-chrome-top) - var(--w98-chrome-bottom));
    height: calc(100dvh - var(--w98-chrome-top) - var(--w98-chrome-bottom));
    overflow: auto;
    background: var(--w98-face);
    box-shadow: var(--w98-well);
}

/* ── 查找栏 ── */
.w98-findbar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 6px;
    border-bottom: 1px solid var(--w98-shade);
    background: var(--w98-face);
}

.w98-findlabel {
    flex: 0 0 auto;
}

.w98-input {
    flex: 1 1 auto;
    min-width: 0;
    height: 21px;
    padding: 0 4px;
    background: #fff;
    box-shadow: var(--w98-well);
    color: var(--w98-ink);
    font: inherit;
}

@media (max-width: 599.98px), (pointer: coarse) {
    .w98-input {
        height: 36px;
        font-size: 14px;
    }
}

/* ── 状态栏 ── */
.w98-status {
    display: flex;
    align-items: stretch;
    flex: 0 0 var(--w98-statush);
    gap: 2px;
    padding-top: 2px;
}

.w98-cell {
    display: flex;
    align-items: center;
    padding: 0 6px;
    /* 状态栏格子是「刻进去」的一圈细线，不是两层斜角 */
    border: 1px solid;
    border-color: var(--w98-shade) var(--w98-hi) var(--w98-hi) var(--w98-shade);
    white-space: nowrap;
}

.w98-cell-grow {
    flex: 1 1 auto;
    min-width: 0;
}

/* ── 任务栏 ── */
.w98-taskbar {
    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    gap: 4px;
    height: var(--w98-taskh);
    padding: 2px 3px;
    background: var(--w98-face);
    /* 任务栏只有上沿是亮的：它贴着屏幕底边，另外三边没有立体可言 */
    box-shadow: inset 0 1px 0 var(--w98-hi), inset 0 2px 0 var(--w98-light);
}

.w98-start,
.w98-task,
.w98-trayicon {
    display: flex;
    align-items: center;
    gap: 4px;
    height: calc(var(--w98-taskh) - 8px);
    padding: 0 6px;
    background: var(--w98-face);
    box-shadow: var(--w98-out);
    color: var(--w98-ink);
    font-size: 12px;
}

.w98-start {
    flex: 0 0 auto;
    font-weight: 700;
}

.w98-start.on,
.w98-task.on,
.w98-trayicon:active {
    box-shadow: var(--w98-in);
}

/* 按下的任务按钮：Win98 里它的底是一层网点，不是纯色 */
.w98-task.on {
    background-image: repeating-conic-gradient(var(--w98-hi) 0% 25%, var(--w98-face) 0% 50%);
    background-size: 2px 2px;
}

.w98-task {
    flex: 0 1 200px;
    min-width: 0;
    text-align: left;
}

.w98-task-label {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.w98-tray {
    display: flex;
    align-items: center;
    height: calc(var(--w98-taskh) - 8px);
    margin-left: auto;
    gap: 4px;
    padding: 0 6px 0 4px;
    /* 托盘是「凹」进去的一格 */
    border: 1px solid;
    border-color: var(--w98-shade) var(--w98-hi) var(--w98-hi) var(--w98-shade);
}

.w98-trayicon {
    height: auto;
    padding: 0 2px;
    box-shadow: none;
}

.w98-clock {
    font-variant-numeric: tabular-nums;
}

@media (max-width: 599.98px), (pointer: coarse) {
    .w98-start,
    .w98-task,
    .w98-trayicon {
        min-width: 36px;
        min-height: 36px;
        padding: 0 10px;
        font-size: 13px;
    }

    /* 托盘那颗只有一个 14px 的图标，撑不满 36 —— 图标居中，热区兜住 */
    .w98-trayicon {
        justify-content: center;
    }

    /* 手机上任务按钮是最宽的那颗：开始按钮和托盘占掉的宽度之外全给它 */
    .w98-task {
        flex: 1 1 auto;
    }
}

/* ── 开始菜单 ── */
.w98-startmenu {
    display: flex;
    background: var(--w98-face);
    box-shadow: var(--w98-out);
}

/*
 * 左边那条竖着写字的深色装饰带 —— 开始菜单一眼能被认出来，一半功劳在它身上。
 * 竖排用 writing-mode 而不是 rotate：rotate 之后元素仍然按横向占位，
 * 父容器会被撑出一大片空白。
 */
.w98-startbrand {
    flex: 0 0 22px;
    background: linear-gradient(0deg, var(--w98-title-b), var(--w98-title-a));
    color: #fff;
}

.w98-startbrand span {
    display: block;
    padding: 8px 3px;
    writing-mode: vertical-rl;
    transform: rotate(180deg);
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 1px;
}

.w98-startbrand b {
    font-weight: 400;
    opacity: .85;
}

.w98-startlist {
    flex: 1 1 auto;
    min-width: 160px;
    padding: 2px 2px 4px;
    box-shadow: none;
}

.w98-startlist li {
    gap: 10px;
    min-height: 26px;
    padding: 3px 20px 3px 6px;
}

.w98-start-num {
    margin-left: auto;
    opacity: .75;
}

@media (max-width: 599.98px), (pointer: coarse) {
    .w98-startlist li {
        min-height: 42px;
    }
}
</style>
