<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref} from 'vue'
import {useRouter} from 'vue-router'
import {useShell} from '@/composables/useShell'
import './preset.css'

/**
 * 经典 Macintosh 外壳：一片 50% 网点的桌面上摆一扇方窗，屏幕最顶上钉一条菜单栏。
 *
 * 和 win98 那款的形状很像（都是「整个应用是一扇窗」），但两者是两套语言：
 *  · Win98 的菜单栏长在窗户里，每扇窗各有一份；Mac 的菜单栏长在**屏幕**顶上，
 *    永远只有一条，内容跟着当前程序换 —— 这是麦金塔最根本的一条界面法则。
 *  · Win98 的立体感来自四色斜角（有厚度）；这一款只有黑和白，
 *    层级靠 1px 黑边和一块硬投影，没有任何中间灰。
 *  · Win98 底下有任务栏；Mac 没有 —— 那个年代切换程序走右上角的菜单，桌面下方是空的。
 *
 * 导航做成标题栏下面一排纸片标签，不是左侧窗格：左窗格是资源管理器的做法，
 * 已经在 win98 那款里了；而 System 7 的控制面板恰好就是这种一排标签的形状。
 */
const s = useShell()
const router = useRouter()

/** 关掉 = 退出登录；「缩小」= 把窗收成只剩标题栏，这是 Mac 的 windowshade，不是最小化 */
const shaded = ref(false)

/** 菜单栏右上角的钟。分钟级就够，30 秒一跳保证跨分钟时不会慢半拍 */
const clock = ref('')
let timer = 0
const tick = () => {
  const d = new Date()
  clock.value = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}
onMounted(() => {
  tick()
  timer = window.setInterval(tick, 30000)
  document.documentElement.classList.add('mac-root')
})
onBeforeUnmount(() => {
  clearInterval(timer)
  document.documentElement.classList.remove('mac-root')
})

const caption = computed(() => `${s.title.value} — ani-rss`)

const MODE_LABEL = {light: '浅色', dark: '深色', system: '跟随系统'}

/*
 * 菜单项是 <li> 不是 <button> —— 那个年代的菜单项没有边框、没有内边距的按钮外观，
 * 用 button 得把浏览器给的那一套全撤掉。代价是键盘够不着，所以自己补两样：
 * 每项 tabindex="0" 进 Tab 序列，回车转成一次 click，动作还是 @click 那一份，不写两遍。
 */
const enterClick = (e: KeyboardEvent) => (e.target as HTMLElement | null)?.click()

function go(to: string) {
  shaded.value = false
  if (s.route.path !== to) void router.push(to)
}
</script>

<template>
  <div class="mac-screen">
    <!-- ══ 屏幕菜单栏 ══ 永远在最顶上，不属于任何一扇窗 -->
    <div class="mac-menubar">
      <v-menu :transition="false" location="bottom start" offset="1">
        <template #activator="{props: p, isActive}">
          <button v-bind="p" :class="{on: isActive}" aria-label="苹果菜单" class="mac-menu mac-apple" type="button">
            <v-icon icon="mdi-apple" size="15"/>
          </button>
        </template>
        <ul class="mac-dropdown" role="menu" @keydown.enter.prevent="enterClick">
          <li role="menuitem" tabindex="0" @click="go('/settings/about')">
            <v-icon icon="mdi-information-outline" size="14"/>
            关于 ani-rss…
          </li>
          <li class="sep"/>
          <li role="menuitem" tabindex="0" @click="s.cycleTheme()">
            <v-icon :icon="s.themeIcon.value" size="14"/>
            外观：{{ MODE_LABEL[s.prefs.mode] }}
          </li>
        </ul>
      </v-menu>

      <v-menu :transition="false" location="bottom start" offset="1">
        <template #activator="{props: p, isActive}">
          <button v-bind="p" :class="{on: isActive}" class="mac-menu" type="button">文件</button>
        </template>
        <ul class="mac-dropdown" role="menu" @keydown.enter.prevent="enterClick">
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
            退出
          </li>
        </ul>
      </v-menu>

      <v-menu :transition="false" location="bottom start" offset="1">
        <template #activator="{props: p, isActive}">
          <button v-bind="p" :class="{on: isActive}" class="mac-menu" type="button">显示</button>
        </template>
        <ul class="mac-dropdown" role="menu" @keydown.enter.prevent="enterClick">
          <li v-for="n in s.nav.value" :key="n.to" :class="{checked: s.isActive(n.to)}" role="menuitem"
              tabindex="0" @click="go(n.to)">
            <v-icon :icon="n.icon" size="14"/>
            {{ n.label }}
          </li>
        </ul>
      </v-menu>

      <v-spacer/>
      <span class="mac-clock">{{ clock }}</span>
    </div>

    <!-- ══ 窗户 ══ -->
    <div :class="{shaded}" class="mac-window">
      <!-- ── 条纹标题栏 ── 关闭方块在左，windowshade 方块在右，这是 System 7 的排法 -->
      <div class="mac-titlebar">
        <button class="mac-box" title="退出登录" type="button" @click="s.logout">
          <span class="mac-box-mark"/>
        </button>
        <span class="mac-caption">{{ caption }}</span>
        <button :title="shaded ? '展开窗口' : '收起窗口'" class="mac-box" type="button" @click="shaded = !shaded">
          <span class="mac-box-mark mac-box-shade"/>
        </button>
      </div>

      <!-- 收起时只剩标题栏。用 v-show 而不是 v-if：滚动位置和列表状态都留着 -->
      <div v-show="!shaded" class="mac-body">
        <!-- ── 一排纸片标签当导航 ── 窄屏装不下就横着滚，外面有容器兜着 -->
        <nav class="mac-tabs">
          <button v-for="n in s.nav.value" :key="n.to" :class="{on: s.isActive(n.to)}" class="mac-tab"
                  type="button" @click="go(n.to)">
            <v-icon :icon="n.icon" size="14"/>
            <span>{{ n.label }}</span>
            <span v-if="n.badge()" class="mac-num">{{ n.badge() }}</span>
          </button>
        </nav>

        <div class="mac-pane">
          <!-- 查找栏：订阅页才有意义，摆在内容区顶上当一条工具条 -->
          <div v-if="s.showSearch.value" class="mac-find">
            <span class="mac-find-label">查找：</span>
            <input v-model="s.ani.keyword" class="mac-input" placeholder="标题 / 字幕组 / 拼音 / 首字母"
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
    </div>
  </div>
</template>

<style scoped>
/*
 * ── 尺寸都写成变量，两个地方要用同一份 ──
 *
 * 一份给 flex 布局本身，一份给 --ani-page-*（设置页和日志页要按它算自己的高度，
 * 那两页是「整页不滚、中间那段滚」的结构）。两边算出来必须分毫不差 ——
 * 差一点点的表现是保存条被顶出可视区、或者底下多一条缝。
 */
.mac-screen {
    --mac-menuh: 22px;
    --mac-titleh: 20px;
    --mac-tabh: 26px;
    --mac-pad: 14px;

    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    background: var(--mac-desk);
    color: var(--mac-ink);
    font-size: 12px;
}

/*
 * 手机：桌面那圈留白收窄（390px 上一圈 14px 就是白扔 28px 内容宽度），
 * 菜单栏、标题栏、标签全部加高到能放下 36px 的触摸目标 ——
 * 20px 的标题栏在鼠标下刚好，手指下点不着；而标题栏左边那颗是「退出登录」。
 *
 * 断点两条并列：窄屏保证手机命中，pointer: coarse 覆盖平板
 * （Vuetify 的 mobile 断点是 lg 1280，平板拿到的也是这套外壳）。
 */
@media (max-width: 599.98px), (pointer: coarse) {
    .mac-screen {
        --mac-menuh: 40px;
        --mac-titleh: 40px;
        --mac-tabh: 40px;
        --mac-pad: 4px;
    }
}

/* ── 屏幕菜单栏 ── */
.mac-menubar {
    display: flex;
    align-items: center;
    flex: 0 0 var(--mac-menuh);
    padding-inline: 6px;
    background: var(--mac-paper);
    box-shadow: inset 0 -1px 0 var(--mac-ink);
}

.mac-menu {
    display: inline-flex;
    align-items: center;
    height: 100%;
    min-width: 36px;
    padding: 0 10px;
    background: none;
    border: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
}

/* 菜单打开时整项反白 —— Mac 的菜单标题就是这么亮起来的 */
.mac-menu.on {
    background: var(--mac-ink);
    color: var(--mac-paper);
}

.mac-apple {
    padding-inline: 8px;
}

.mac-clock {
    padding-inline: 10px;
    font-variant-numeric: tabular-nums;
}

/* ── 下拉菜单 ── 白纸 + 黑边 + 硬投影 */
.mac-dropdown {
    min-width: 172px;
    margin: 0;
    padding: 3px 0;
    list-style: none;
    background: var(--mac-paper);
    box-shadow: var(--mac-edge), var(--mac-drop);
}

.mac-dropdown li {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 24px;
    padding: 3px 16px 3px 12px;
    cursor: pointer;
}

@media (max-width: 599.98px), (pointer: coarse) {
    .mac-dropdown li {
        min-height: 40px;
    }
}

.mac-dropdown li:hover,
.mac-dropdown li:focus-visible {
    background: var(--mac-ink);
    color: var(--mac-paper);
    outline: none;
}

/* 当前页前面打个勾，这是 Mac 菜单表达「就是它」的方式 */
.mac-dropdown li.checked::after {
    content: '✓';
    margin-left: auto;
}

.mac-dropdown li.sep {
    min-height: 0;
    height: 1px;
    margin: 3px 0;
    padding: 0;
    background: var(--mac-shade);
    pointer-events: none;
}

/* ── 窗户 ── */
.mac-window {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    margin: var(--mac-pad);
    background: var(--mac-face);
    box-shadow: var(--mac-edge), var(--mac-drop);
}

/* 收起（windowshade）：只剩标题栏那一条 */
.mac-window.shaded {
    flex: 0 0 auto;
}

.mac-titlebar {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 0 0 var(--mac-titleh);
    padding-inline: 4px;
    background: var(--mac-stripe);
    box-shadow: inset 0 -1px 0 var(--mac-ink);
}

/*
 * 标题文字要有块白底垫着，不然条纹会从字缝里穿过去，一个字都读不出来。
 * 这也是原版的做法 —— 标题是一块盖在条纹上的白牌子。
 */
.mac-caption {
    /*
     * 0 1 auto 而不是 1 1 auto：标题只占它自己那么宽，两边露出条纹 ——
     * 撑满的话白牌子把整条标题栏盖住，条纹只剩按钮旁边那两小截，
     * 「条纹标题栏」这件事就看不出来了。
     */
    flex: 0 1 auto;
    min-width: 0;
    margin-inline: auto;
    padding: 1px 10px;
    background: var(--mac-paper);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: center;
}

/*
 * 关闭 / 收起的方块。
 *
 * 原版那两颗只有 11px 见方，鼠标够得着、手指够不着 —— 而左边那颗是「退出登录」，
 * 点错的代价不小。所以按钮本身给到 36px 的热区，里面画一个 11px 的小方块：
 * 看着还是 1991 年的尺寸，能点的地方大了三倍。
 */
.mac-box {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    width: 22px;
    height: calc(var(--mac-titleh) - 4px);
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
}

@media (max-width: 599.98px), (pointer: coarse) {
    .mac-box {
        width: 36px;
        height: 36px;
    }
}

.mac-box-mark {
    display: block;
    width: 11px;
    height: 11px;
    background: var(--mac-face);
    box-shadow: var(--mac-edge);
}

.mac-box:active .mac-box-mark {
    background: var(--mac-ink);
}

/* 收起那颗中间多一道横线，好和关闭区分开 */
.mac-box-shade {
    background:
        linear-gradient(var(--mac-ink), var(--mac-ink)) center / 7px 1px no-repeat,
        var(--mac-face);
}

.mac-body {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    padding: 6px;
}

/* ── 纸片标签 ── */
.mac-tabs {
    display: flex;
    flex: 0 0 auto;
    gap: 3px;
    padding-inline: 4px;
    /* 五个标签在 360px 上排不下，横着滚 —— 外面有容器兜着就不算「元素伸出视口」 */
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
}

.mac-tabs::-webkit-scrollbar {
    display: none;
}

.mac-tab {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    flex: 0 0 auto;
    height: var(--mac-tabh);
    padding: 0 12px;
    background: var(--mac-face-2);
    box-shadow: var(--mac-edge);
    border-radius: 7px 7px 0 0;
    color: inherit;
    font: inherit;
    border: none;
    cursor: pointer;
}

/*
 * 当前那片纸要「和下面的内容连成一体」：底色换成纸白，再往下压 1px
 * 把自己的下边线盖在内容区的上边线上。少了这一下，选中的标签看着是浮在面板外面的。
 */
.mac-tab.on {
    background: var(--mac-paper);
    margin-bottom: -1px;
    padding-bottom: 1px;
    position: relative;
    z-index: 1;
}

.mac-num {
    min-width: 18px;
    padding: 0 4px;
    background: var(--mac-ink);
    color: var(--mac-paper);
    font-size: 12px;
    line-height: 14px;
    text-align: center;
    font-variant-numeric: tabular-nums;
}

/* ── 内容面板 ── */
.mac-pane {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
    background: var(--mac-paper);
    box-shadow: var(--mac-edge);
}

.mac-find {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 0 0 auto;
    padding: 5px 8px;
    background: var(--mac-face);
    box-shadow: inset 0 -1px 0 var(--mac-ink);
}

.mac-find-label {
    flex: 0 0 auto;
}

.mac-input {
    flex: 1 1 auto;
    min-width: 0;
    height: 20px;
    padding: 0 5px;
    background: var(--mac-paper);
    color: var(--mac-ink);
    border: none;
    box-shadow: var(--mac-edge);
    outline: none;
    font: inherit;
}

.mac-input:focus {
    box-shadow: 0 0 0 2px var(--mac-ink);
}

@media (max-width: 599.98px), (pointer: coarse) {
    .mac-input {
        height: 36px;
    }
}
</style>

<style>
/*
 * 内容区高度：设置页和日志页是「整页不滚、中间那段滚」的结构，它们用
 * --ani-page-* 减掉外壳占掉的部分。写在非 scoped 块里是因为要落到 .v-main 上，
 * 而 .v-main 不在这个组件的模板里（它在共用页面那边）。
 *
 * 数值必须和上面 flex 布局用的是同一组变量 —— 各写各的迟早差一像素，
 * 表现是保存条被顶出可视区，或者底下多一条缝。
 */
.mac-pane {
    /* 菜单栏 + 窗户外边距 + 标题栏 + 窗体内边距(6) + 标签条 —— 一项都不能少也不能多 */
    --ani-page-top: calc(var(--mac-menuh) + var(--mac-pad) + var(--mac-titleh) + 6px + var(--mac-tabh));
    --ani-page-bottom: calc(var(--mac-pad) + 6px);
}
</style>
