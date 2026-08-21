<script setup lang="ts">
import type {AniScreen} from '@/composables/useAniScreen'

/**
 * 批量操作条。各款界面的按钮排布可以不同，但「能批量做哪些事」必须一致，
 * 所以动作集合放在这里，外观交给 variant / rounded 两个旋钮。
 *
 * 常用的四个平铺，其余收进「更多」：
 * 上游那份是九项全铺在一个下拉里，摆成一排会挤成一堵墙，
 * 而「强制刮削」这种带破坏性的项恰恰不该和「启用」一样好按。
 */
const {s, variant = 'tonal', rounded = undefined} = defineProps<{
  s: AniScreen
  variant?: 'tonal' | 'text' | 'outlined' | 'flat'
  rounded?: string
}>()

/*
 * force 的含义来自后端：不带 force 时已经刮削过 / 已经有总集数的会被跳过，
 * 所以对着一批老订阅点「刮削」是什么都不会发生的 —— 看着像按钮坏了。
 * 想重来一遍就得用带 [F] 的那两项，上游管理面板里也是分开的两项。
 */
const MORE = [
  {key: 'scrapeF', title: '强制刮削', subtitle: '已经刮削过的也重做一遍', icon: 'mdi-refresh-circle'},
  {key: 'epF', title: '强制更新总集数', subtitle: '忽略已有值，重新去 Bgm 取', icon: 'mdi-counter'},
  {key: 'export', title: '导出选中订阅', subtitle: '存成 ani.v2.json，可再导入', icon: 'mdi-tray-arrow-down'},
] as const

function run(key: typeof MORE[number]['key']) {
  const ids = s.selectedIds.value
  if (key === 'scrapeF') return s.batch(() => s.ani.batchScrape(ids, true))
  if (key === 'epF') return s.batch(() => s.ani.updateEpisodes(ids, true))
  return s.exportSelected()
}
</script>

<template>
  <v-slide-y-transition>
    <v-sheet v-if="s.selectMode.value" :rounded="rounded ?? true"
             class="d-flex align-center flex-wrap ga-2 pa-3 mb-4" color="surface-variant">
      <span class="text-body-2 mr-2">已选 {{ s.selectedIds.value.length }} 项</span>
      <v-btn size="small" variant="text" @click="s.ani.selectAll()">全选</v-btn>
      <v-btn size="small" variant="text" @click="s.ani.clearSelection()">取消选择</v-btn>
      <v-divider class="mx-1" vertical/>
      <v-btn :disabled="!s.selectedIds.value.length" :variant="variant" size="small"
             @click="s.batch(() => s.ani.setEnabled(s.selectedIds.value, true))">启用
      </v-btn>
      <v-btn :disabled="!s.selectedIds.value.length" :variant="variant" size="small"
             @click="s.batch(() => s.ani.setEnabled(s.selectedIds.value, false))">禁用
      </v-btn>
      <v-btn :disabled="!s.selectedIds.value.length" :variant="variant" size="small"
             @click="s.batch(() => s.ani.batchScrape(s.selectedIds.value, false))">刮削
      </v-btn>
      <v-btn :disabled="!s.selectedIds.value.length" :variant="variant" size="small"
             @click="s.batch(() => s.ani.updateEpisodes(s.selectedIds.value, false))">更新总集数
      </v-btn>

      <v-menu location="bottom end">
        <template #activator="{props: p}">
          <v-btn v-bind="p" :disabled="!s.selectedIds.value.length" :variant="variant"
                 append-icon="mdi-menu-down" size="small">更多
          </v-btn>
        </template>
        <v-list density="comfortable" min-width="240">
          <v-list-item v-for="m in MORE" :key="m.key" :prepend-icon="m.icon" :subtitle="m.subtitle"
                       :title="m.title" @click="run(m.key)"/>
        </v-list>
      </v-menu>

      <v-btn :disabled="!s.selectedIds.value.length" :variant="variant" color="error" size="small"
             @click="s.deleting.value = s.selectedAnis.value">删除
      </v-btn>
    </v-sheet>
  </v-slide-y-transition>
</template>
