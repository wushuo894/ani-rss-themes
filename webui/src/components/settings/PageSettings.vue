<script setup lang="ts">
import {computed} from 'vue'
import type {Config} from '@shared/types'
import {THEMES, THEME_MAP} from '@shared/themes/registry'
import {usePrefsStore} from '@/stores/prefs'
import SettingField from './SettingField.vue'
import type {FieldDef} from './schema'

defineProps<{config: Config}>()
const prefs = usePrefsStore()

const themeItems = computed(() => [
  {value: '', title: '不启用（Vuetify 原生）', desc: '只用上面的明暗与主题色', remote: false},
  ...THEMES.map(t => ({value: t.id, title: t.name, desc: t.desc, remote: !!t.remote})),
])

const currentTheme = computed(() => (prefs.themeId ? THEME_MAP.get(prefs.themeId) : undefined))

/**
 * 这一页分两半：
 *  - 外观、显示项存在浏览器本地（键与 ani-rss 自带界面共用，切过来设置还在）
 *  - 排序方式、自定义 CSS/JS 存在服务端配置里
 * 混在一个面板里是因为用户不关心谁存在哪，只关心「页面长什么样」。
 */
const serverFields: FieldDef[] = [
  {
    key: 'sortType', label: '排序方式', type: 'select', items: [
      {title: '评分', value: 'SCORE'},
      {title: '拼音', value: 'PINYIN'},
      {title: '下载时间', value: 'DOWNLOAD_TIME'},
    ],
  },
  {
    key: 'customCss', label: '自定义 CSS', type: 'textarea',
    hint: '与 ani-rss 自带界面共用同一份，现有主题可直接沿用',
  },
  {key: 'customJs', label: '自定义 JS', type: 'textarea'},
]
</script>

<template>
  <div>
    <div class="text-caption text-medium-emphasis mb-3">外观与显示项存在本机浏览器，不随配置备份。</div>

    <v-btn-toggle v-model="prefs.mode" class="mb-4" density="comfortable" mandatory variant="outlined">
      <v-btn prepend-icon="mdi-weather-sunny" value="light">浅色</v-btn>
      <v-btn prepend-icon="mdi-weather-night" value="dark">深色</v-btn>
      <v-btn prepend-icon="mdi-theme-light-dark" value="system">跟随系统</v-btn>
    </v-btn-toggle>

    <div class="d-flex align-center mb-4 ga-3">
      <div class="text-body-2">主题色</div>
      <input v-model="prefs.accent" class="color-input" type="color"/>
      <span class="text-caption text-medium-emphasis">{{ prefs.accent }}</span>
    </div>

    <!-- ── 主题皮肤 ── -->
    <div class="text-body-2 mb-2">主题</div>
    <v-select
        v-model="prefs.themeId"
        :items="themeItems"
        class="mb-2"
        item-title="title"
        item-value="value"
    >
      <template #item="{props: itemProps, item}">
        <v-list-item v-bind="itemProps" :subtitle="item.raw.desc">
          <template v-if="item.raw.remote" #append>
            <v-chip size="x-small" variant="tonal">联网</v-chip>
          </template>
        </v-list-item>
      </template>
    </v-select>

    <div v-if="currentTheme" class="text-caption text-medium-emphasis mb-2">
      {{ currentTheme.desc }}
      <template v-if="currentTheme.base !== 'auto'">
        · 该主题只在{{ currentTheme.base === 'dark' ? '深色' : '浅色' }}下成立，会忽略上面的明暗选择
      </template>
    </div>
    <v-alert v-if="currentTheme?.remote" class="mb-4" density="compact" type="info" variant="tonal">
      这款主题的壁纸来自第三方公共接口，会产生外部网络请求。介意就换用不带壁纸的那几款。
    </v-alert>
    <div v-else class="mb-4"></div>

    <div class="d-flex align-center py-1">
      <div class="flex-grow-1 pr-4 text-body-2">显示评分</div>
      <v-switch v-model="prefs.showScore" color="primary" density="compact" hide-details/>
    </div>
    <div class="d-flex align-center py-1">
      <div class="flex-grow-1 pr-4">
        <div class="text-body-2">按星期分组</div>
        <div class="text-caption text-medium-emphasis">搜索时自动不分组</div>
      </div>
      <v-switch v-model="prefs.showWeek" color="primary" density="compact" hide-details/>
    </div>
    <div class="d-flex align-center py-1">
      <div class="flex-grow-1 pr-4 text-body-2">显示视频列表入口</div>
      <v-switch v-model="prefs.showPlaylist" color="primary" density="compact" hide-details/>
    </div>
    <div class="d-flex align-center py-1 mb-4">
      <div class="flex-grow-1 pr-4 text-body-2">显示更新时间</div>
      <v-switch v-model="prefs.showLastDownloadTime" color="primary" density="compact" hide-details/>
    </div>

    <div class="d-flex align-center py-1 mb-4">
      <div class="flex-grow-1 pr-4">
        <div class="text-body-2">加载自定义 CSS / JS</div>
        <div class="text-caption text-medium-emphasis">
          读取下方「自定义 CSS / JS」框里的内容。为 ani-rss 自带界面写的样式在这里不生效（类名体系不同）。
          关闭后已执行过的 JS 需刷新页面才失效。
        </div>
      </div>
      <v-switch v-model="prefs.loadCustomAssets" color="primary" density="compact" hide-details/>
    </div>

    <v-divider class="mb-4"/>

    <SettingField v-for="f in serverFields" :key="f.key" :config="config" :def="f"/>
  </div>
</template>

<style scoped>
.color-input {
    width: 44px;
    height: 30px;
    border: none;
    background: none;
    cursor: pointer;
    padding: 0;
}
</style>
