<script setup lang="ts">
import {usePrefsStore} from '@/stores/prefs'

/**
 * 侧栏顶上那一行：收起时只有一颗收缩/展开按钮，展开时按钮左边多出图标和产品名。
 *
 * 整行都是按钮 —— 收起状态下只有一颗小图标，热区就那么大，
 * 展开之后名字那一片却是最容易被点的地方（人是奔着字去点的）。
 * 所以点名字也收，和点按钮一个效果。
 *
 * 状态存在 prefs 里而不是各款外壳自己 ref：有侧栏的几款共用同一个开关，
 * 换一款界面不用重新收一次；刷新也还在。
 */
const prefs = usePrefsStore()
</script>

<template>
  <button
      :aria-expanded="!prefs.sidebarCollapsed"
      :class="{collapsed: prefs.sidebarCollapsed}"
      :title="prefs.sidebarCollapsed ? '展开侧栏' : '收起侧栏'"
      class="sb-brand"
      type="button"
      @click="prefs.sidebarCollapsed = !prefs.sidebarCollapsed"
  >
    <!-- 图标和名字只在展开时存在。用 v-if 而不是 CSS 隐藏：
         留在 DOM 里的话，收起状态下这一行仍然按「图标 + 六个字」的宽度撑着，
         窄条里放不下就溢出去了 -->
    <template v-if="!prefs.sidebarCollapsed">
      <v-icon color="primary" icon="mdi-rss-box" size="22"/>
      <span class="sb-name">Ani-RSS</span>
    </template>
    <v-icon :icon="prefs.sidebarCollapsed ? 'mdi-chevron-right' : 'mdi-chevron-left'" size="20"/>
  </button>
</template>

<style scoped>
.sb-brand {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    /* 44px：手指够得着的最小高度，和 touch.css 那条同一个数 */
    min-height: 44px;
    padding: 6px 10px;
    border: 0;
    border-radius: var(--ani-radius, 8px);
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: background-color var(--m-dur) var(--m-ease);
}

.sb-brand:hover {
    background: rgba(var(--v-theme-on-surface), .06);
}

/* 收起时只剩一颗图标，居中；不居中的话它贴着左边，窄条看着是歪的 */
.sb-brand.collapsed {
    justify-content: center;
    padding-inline: 0;
}

.sb-name {
    flex: 1 1 auto;
    min-width: 0;
    font-size: .95rem;
    font-weight: 600;
    letter-spacing: .01em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>
