<script setup lang="ts">
import {onMounted, ref} from 'vue'
import {useDisplay} from 'vuetify'
import type {Ani, Item} from '@shared/types'
import * as api from '@shared/api'

const props = defineProps<{item: Ani}>()
const emit = defineEmits<{close: []}>()

const {mobile} = useDisplay()
const dialog = ref(true)
const loading = ref(false)
const downloadPath = ref('')
const items = ref<Item[]>([])
const omitList = ref<number[]>([])

onMounted(async () => {
  loading.value = true
  try {
    const r = await api.previewAni(props.item)
    downloadPath.value = r.downloadPath
    items.value = r.items || []
    omitList.value = r.omitList || []
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <v-dialog v-model="dialog" :fullscreen="mobile" max-width="880" scrollable @after-leave="emit('close')">
    <v-card :loading="loading">
      <v-card-title class="d-flex align-center">
        <span class="text-truncate">预览 · {{ item.title }}</span>
        <v-spacer/>
        <v-btn icon="mdi-close" size="small" variant="text" @click="dialog = false"/>
      </v-card-title>
      <v-divider/>

      <v-card-text>
        <div class="text-caption text-medium-emphasis mb-1">下载位置</div>
        <div class="text-body-2 mb-4 path">{{ downloadPath || '—' }}</div>

        <v-alert v-if="omitList.length" class="mb-4" density="compact" type="warning" variant="tonal">
          推断出遗漏集数：{{ omitList.join('、') }}
        </v-alert>

        <div class="d-flex align-center mb-2">
          <div class="text-caption text-medium-emphasis">匹配到的资源</div>
          <v-chip class="ml-2" size="x-small" variant="tonal">{{ items.length }}</v-chip>
        </div>

        <v-empty-state v-if="!loading && !items.length" icon="mdi-magnify-close"
                       text="当前 RSS 与匹配规则下没有命中任何资源" title="没有匹配项"/>

        <v-table v-else density="compact">
          <thead>
          <tr>
            <th style="width: 56px">集</th>
            <th>标题 / 重命名后</th>
            <th style="width: 96px">大小</th>
            <th style="width: 96px">状态</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="(it, i) in items" :key="i">
            <td>{{ it.episode ?? '—' }}</td>
            <td>
              <div class="text-body-2">{{ it.title }}</div>
              <div v-if="it.reName" class="text-caption text-medium-emphasis">→ {{ it.reName }}</div>
            </td>
            <td class="text-caption">{{ it.formatSize || '—' }}</td>
            <td>
              <v-chip :color="it.hasDownloaded ? 'success' : undefined" size="x-small" variant="tonal">
                {{ it.hasDownloaded ? '已下载' : '未下载' }}
              </v-chip>
            </td>
          </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* 路径可能很长，允许在任意位置断行，别把弹窗撑宽 */
.path {
    word-break: break-all;
    font-family: var(--ani-font-mono, monospace);
}
</style>
