<script setup lang="ts">
import type {AniScreen} from '@/composables/useAniScreen'

/**
 * 批量操作条。五款界面的按钮排布可以不同，但「能批量做哪些事」必须一致，
 * 所以动作集合放在这里，外观交给 variant / rounded 两个旋钮。
 */
const {s, variant = 'tonal', rounded = undefined} = defineProps<{
  s: AniScreen
  variant?: 'tonal' | 'text' | 'outlined' | 'flat'
  rounded?: string
}>()
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
      <v-btn :disabled="!s.selectedIds.value.length" :variant="variant" color="error" size="small"
             @click="s.deleting.value = s.selectedAnis.value">删除
      </v-btn>
    </v-sheet>
  </v-slide-y-transition>
</template>
