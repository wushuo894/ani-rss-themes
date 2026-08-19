<script setup lang="ts">
import {onBeforeUnmount, onMounted, ref} from 'vue'
import {useDisplay} from 'vuetify'
import type {TorrentsInfo} from '@shared/types'
import {formatPercent, formatSize} from '@shared/format'
import {useTorrentsStore} from '@/stores/torrents'

const t = useTorrentsStore()
const {mobile} = useDisplay()
const removing = ref<TorrentsInfo | null>(null)

// 只在本页可见时轮询，离开立刻停
onMounted(() => t.startPolling(3000))
onBeforeUnmount(() => t.stopPolling())

/** 状态 → 配色。后端 TorrentsStateEnum 的取值沿用 qBittorrent 那一套命名 */
function stateColor(s?: string) {
  if (!s) return undefined
  if (/^(downloading|forcedDL|metaDL|forcedMetaDL)$/.test(s)) return 'primary'
  if (/^(uploading|forcedUP|stalledUP)$/.test(s)) return 'success'
  if (/error|missingFiles/i.test(s)) return 'error'
  if (/checking|moving|allocating/i.test(s)) return 'warning'
  if (/paused|stopped/i.test(s)) return undefined
  return 'info'
}

const headers = [
  {title: '名称', key: 'name'},
  {title: '大小', key: 'size', width: 110},
  {title: '进度', key: 'progress', width: 190},
  {title: '状态', key: 'state', width: 130},
  {title: '', key: 'actions', sortable: false, align: 'end' as const, width: 60},
]

async function confirmRemove() {
  const x = removing.value
  if (!x) return
  await t.remove(x.id || '', x.hash || '')
  removing.value = null
}
</script>

<template>
  <div class="pa-4">
    <div class="d-flex align-center flex-wrap ga-2 mb-4">
      <v-chip variant="tonal">共 {{ t.items.length }} 个任务</v-chip>
      <v-chip color="primary" variant="tonal">下载中 {{ t.downloading.length }}</v-chip>
      <v-chip color="success" variant="tonal">做种 {{ t.seeding.length }}</v-chip>
      <v-chip variant="tonal">{{ formatSize(t.totalSize) }}</v-chip>
      <v-spacer/>
      <v-btn :loading="t.loading" prepend-icon="mdi-refresh" variant="tonal" @click="t.reload()">刷新</v-btn>
    </div>

    <v-alert v-if="t.error" class="mb-4" density="compact" type="error" variant="tonal">
      读取下载器失败：{{ t.error }}
      <div class="text-caption mt-1">检查「设置 → 下载设置」里的地址与账号。</div>
    </v-alert>

    <v-empty-state v-else-if="!t.loading && !t.items.length" icon="mdi-download-off"
                   text="下载器里当前没有任务" title="没有任务"/>

    <!-- 宽屏用表格，窄屏换卡片：表格在手机上只能横向滚动，很难用 -->
    <v-card v-else-if="!mobile" variant="flat">
      <v-data-table :headers="headers" :items="t.items" :items-per-page="25" density="comfortable" item-value="hash">
        <template #item.name="{item}">
          <div class="py-1">
            <div class="text-body-2">{{ item.name }}</div>
            <div class="text-caption text-medium-emphasis">{{ item.savePath }}</div>
          </div>
        </template>
        <template #item.size="{item}">{{ item.formatSize || formatSize(item.size) }}</template>
        <template #item.progress="{item}">
          <div class="d-flex align-center ga-2">
            <v-progress-linear :color="stateColor(item.state)" :model-value="(item.progress ?? 0) * 100"
                               height="6" rounded/>
            <span class="text-caption" style="min-width: 44px">{{ formatPercent(item.progress) }}</span>
          </div>
        </template>
        <template #item.state="{item}">
          <v-chip :color="stateColor(item.state)" size="x-small" variant="tonal">{{ item.state }}</v-chip>
        </template>
        <template #item.actions="{item}">
          <v-btn color="error" icon="mdi-delete-outline" size="small" variant="text" @click="removing = item"/>
        </template>
      </v-data-table>
    </v-card>

    <div v-else>
      <v-card v-for="item in t.items" :key="item.hash" class="mb-2" variant="tonal">
        <v-card-text class="pb-2">
          <div class="text-body-2 mb-1">{{ item.name }}</div>
          <div class="d-flex align-center ga-2 mb-1">
            <v-progress-linear :color="stateColor(item.state)" :model-value="(item.progress ?? 0) * 100"
                               height="6" rounded/>
            <span class="text-caption">{{ formatPercent(item.progress) }}</span>
          </div>
          <div class="d-flex align-center ga-2">
            <v-chip :color="stateColor(item.state)" size="x-small" variant="tonal">{{ item.state }}</v-chip>
            <span class="text-caption text-medium-emphasis">{{ item.formatSize || formatSize(item.size) }}</span>
            <v-spacer/>
            <v-btn color="error" icon="mdi-delete-outline" size="small" variant="text" @click="removing = item"/>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <v-dialog :model-value="!!removing" max-width="420" @update:model-value="removing = null">
      <v-card>
        <v-card-title>删除任务</v-card-title>
        <v-card-text>
          确定从下载器删除 <strong>{{ removing?.name }}</strong>？
          <div class="text-caption text-medium-emphasis mt-2">只作用于下载器，订阅本身不受影响。</div>
        </v-card-text>
        <v-card-actions>
          <v-spacer/>
          <v-btn variant="text" @click="removing = null">取消</v-btn>
          <v-btn color="error" variant="flat" @click="confirmRemove">删除</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
