<script setup lang="ts">
import {computed, onActivated, onDeactivated, ref} from 'vue'
import {useDisplay} from 'vuetify'
import type {TorrentsInfo} from '@shared/types'
import {formatPercent, formatSize} from '@shared/format'
import {useTorrentsStore} from '@/stores/torrents'
import AniSkeleton from '@/components/ani/AniSkeleton.vue'

const t = useTorrentsStore()
const {mobile} = useDisplay()
const removing = ref<TorrentsInfo | null>(null)

/*
 * 只在本页可见时轮询，离开立刻停。
 * 用 activated/deactivated 而不是 mounted/unmounted：这一页在 keep-alive 里，
 * 切走时组件不销毁，onBeforeUnmount 根本不会触发，轮询会一直空转到关标签页。
 */
onActivated(() => t.startPolling(3000))
onDeactivated(() => t.stopPolling())

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

/*
 * 窄屏排序。
 *
 * 宽屏是表格，点表头就能排；窄屏退化成卡片，表头没了，排序也跟着没了 ——
 * 任务一多就只能从头翻。上游那个下载弹窗本来就是卡片列表，所以它一直有排序，
 * 我们把它补在窄屏这一侧。再点一次同一项切正反序，和上游一致。
 */
const SORTS = [
  {key: 'name', label: '名称', get: (x: TorrentsInfo) => x.name ?? ''},
  {key: 'progress', label: '进度', get: (x: TorrentsInfo) => x.progress ?? 0},
  {key: 'size', label: '大小', get: (x: TorrentsInfo) => x.size ?? 0},
  {key: 'state', label: '状态', get: (x: TorrentsInfo) => x.state ?? ''},
] as const

const sortKey = ref<string>('name')
const sortAsc = ref(true)

function changeSort(k: string) {
  if (sortKey.value === k) sortAsc.value = !sortAsc.value
  else {
    sortKey.value = k
    sortAsc.value = true
  }
}

const sorted = computed(() => {
  const s = SORTS.find(x => x.key === sortKey.value)
  if (!s) return t.items
  const dir = sortAsc.value ? 1 : -1
  return [...t.items].sort((a, b) => {
    const x = s.get(a), y = s.get(b)
    return dir * (typeof x === 'string' ? x.localeCompare(y as string) : (x as number) - (y as number))
  })
})

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

    <!-- 首屏骨架。轮询刷新时不铺骨架，否则每 3 秒整页闪一次 -->
    <v-card v-else-if="t.loading && !t.items.length" variant="flat">
      <div class="pa-4">
        <AniSkeleton :count="6" shape="row"/>
      </div>
    </v-card>

    <v-empty-state v-else-if="!t.items.length" icon="mdi-download-off"
                   text="下载器里当前没有任务" title="没有任务"/>

    <!-- 宽屏用表格，窄屏换卡片：表格在手机上只能横向滚动，很难用 -->
    <v-card v-else-if="!mobile" variant="flat">
      <!-- 保存路径可以很长，横滚必须发生在卡片里，不能让整页跟着变宽 -->
      <div class="table-scroll">
      <v-data-table :headers="headers" :items="t.items" :items-per-page="25" density="comfortable" item-value="hash">
        <template #item.name="{item}">
          <div class="py-1 name-cell">
            <div class="text-body-2 ellipsis" :title="item.name">{{ item.name }}</div>
            <div class="text-caption text-medium-emphasis ellipsis" :title="item.savePath">{{ item.savePath }}</div>
            <!-- 下载器里的标签：ani-rss 会给自己管的种子打标，混着手动加的种子时靠这个分辨 -->
            <div v-if="item.tagList?.length" class="d-flex flex-wrap ga-1 mt-1">
              <v-chip v-for="tag in item.tagList" :key="tag" size="x-small" variant="tonal">{{ tag }}</v-chip>
            </div>
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
      </div>
    </v-card>

    <div v-else>
      <div class="d-flex align-center flex-wrap ga-2 mb-3">
        <span class="text-caption text-medium-emphasis">排序</span>
        <v-chip v-for="o in SORTS" :key="o.key" :append-icon="sortKey === o.key
                  ? (sortAsc ? 'mdi-arrow-up' : 'mdi-arrow-down') : undefined"
                :color="sortKey === o.key ? 'primary' : undefined" size="small" variant="tonal"
                @click="changeSort(o.key)">
          {{ o.label }}
        </v-chip>
      </div>

      <v-card v-for="(item, i) in sorted" :key="item.hash" :style="{'--i': i}" class="mb-2 ani-in"
              variant="tonal">
        <v-card-text class="pb-2">
          <div class="text-body-2 mb-1 ellipsis" :title="item.name">{{ item.name }}</div>
          <div class="d-flex align-center ga-2 mb-1">
            <v-progress-linear :color="stateColor(item.state)" :model-value="(item.progress ?? 0) * 100"
                               height="6" rounded/>
            <span class="text-caption">{{ formatPercent(item.progress) }}</span>
          </div>
          <div class="d-flex align-center ga-2">
            <v-chip :color="stateColor(item.state)" size="x-small" variant="tonal">{{ item.state }}</v-chip>
            <span class="text-caption text-medium-emphasis">{{ item.formatSize || formatSize(item.size) }}</span>
            <v-chip v-for="tag in item.tagList || []" :key="tag" size="x-small" variant="tonal">{{ tag }}</v-chip>
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
          确定从下载器删除 <strong class="d-block ellipsis">{{ removing?.name }}</strong>？
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

<style scoped>
.table-scroll {
    overflow-x: auto;
}

/* 名称列封顶，否则一条长发布名能把「进度」「状态」两列推到视口外 */
.name-cell {
    max-width: 46ch;
}

.ellipsis {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>
