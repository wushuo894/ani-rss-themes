<script setup lang="ts">
import {computed, onMounted, ref} from 'vue'
import {useDisplay} from 'vuetify'
import type {Ani, Item} from '@shared/types'
import * as api from '@shared/api'
import {useAniStore} from '@/stores/ani'
import {useUiStore} from '@/stores/ui'

const props = defineProps<{item: Ani}>()
const emit = defineEmits<{close: []}>()

const store = useAniStore()
const ui = useUiStore()
const {mobile} = useDisplay()
const dialog = ref(true)
const loading = ref(false)
const busy = ref('')
const downloadPath = ref('')
const items = ref<Item[]>([])
const omitList = ref<number[]>([])

/** 选中的行号 —— 用下标而不是集数：同一集可能有多个字幕组的版本 */
const picked = ref<number[]>([])

/* notDownload 是「这几集不要下」的集数清单，存在订阅上。
   上游的预览面板就是靠它做「禁止下载 / 允许下载」的，而我们这边这个字段
   在整个界面里一次都没被引用过 —— 也就是说这个能力根本没做出来。 */
const blocked = computed(() => new Set(props.item.notDownload ?? []))

const chosen = computed(() => picked.value.map(i => items.value[i]).filter(Boolean))
const chosenEpisodes = computed(() =>
    [...new Set(chosen.value.map(it => it.episode).filter((e): e is number => typeof e === 'number'))])
const chosenHashes = computed(() =>
    chosen.value.filter(it => it.hasDownloaded && it.infoHash).map(it => it.infoHash as string))

const allPicked = computed(() => items.value.length > 0 && picked.value.length === items.value.length)

function toggleAll() {
  picked.value = allPicked.value ? [] : items.value.map((_, i) => i)
}

async function load() {
  loading.value = true
  try {
    const r = await api.previewAni(props.item)
    downloadPath.value = r.downloadPath
    items.value = r.items || []
    omitList.value = r.omitList || []
  } finally {
    loading.value = false
  }
}

onMounted(load)

/**
 * 改「不下载」清单并存盘。
 *
 * 上游是在订阅编辑表单里改 ani.notDownload，靠用户点「保存」才落盘；
 * 我们这个对话框是从卡片直接打开的，没有外层的保存按钮 ——
 * 改完不存等于白改，所以这里直接存。
 */
async function setBlocked(block: boolean) {
  const eps = chosenEpisodes.value
  if (!eps.length) return ui.error('先选中要操作的剧集')
  const next = new Set(props.item.notDownload ?? [])
  for (const e of eps) block ? next.add(e) : next.delete(e)

  const list = [...next].sort((a, b) => a - b)
  busy.value = block ? 'block' : 'allow'
  try {
    await store.update({...props.item, notDownload: list}, false,
        block ? `已禁止下载 ${eps.length} 集` : `已允许下载 ${eps.length} 集`)
    props.item.notDownload = list
  } finally {
    busy.value = ''
  }
}

async function removeTorrents() {
  const hashes = chosenHashes.value
  if (!hashes.length) return ui.error('选中的项里没有已下载的种子')
  busy.value = 'torrent'
  try {
    await api.deleteTorrent(props.item.id ?? '', hashes.join(','))
    ui.success(`已删除 ${hashes.length} 个种子缓存`)
    picked.value = []
    await load()
  } finally {
    busy.value = ''
  }
}
</script>

<template>
  <v-dialog v-model="dialog" :fullscreen="mobile" max-width="960" scrollable @after-leave="emit('close')">
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

        <div class="d-flex align-center flex-wrap ga-2 mb-2">
          <div class="text-caption text-medium-emphasis">匹配到的资源</div>
          <v-chip size="x-small" variant="tonal">{{ items.length }}</v-chip>
          <v-chip v-if="blocked.size" color="error" size="x-small" variant="tonal">
            {{ blocked.size }} 集不下载
          </v-chip>
        </div>

        <v-empty-state v-if="!loading && !items.length" icon="mdi-magnify-close"
                       text="当前 RSS 与匹配规则下没有命中任何资源" title="没有匹配项"/>

        <template v-else>
          <!-- 选中后才出现的操作条：没选东西时摆一排灰按钮只会让人以为坏了 -->
          <v-slide-y-transition>
            <div v-if="picked.length" class="picked-bar mb-2">
              <span class="text-body-2">已选 {{ picked.length }} 项</span>
              <v-spacer/>
              <v-btn :loading="busy === 'allow'" prepend-icon="mdi-check" size="small" variant="text"
                     @click="setBlocked(false)">
                允许下载
              </v-btn>
              <v-btn :loading="busy === 'block'" prepend-icon="mdi-cancel" size="small" variant="text"
                     @click="setBlocked(true)">
                禁止下载
              </v-btn>
              <v-btn :disabled="!chosenHashes.length" :loading="busy === 'torrent'" color="error"
                     prepend-icon="mdi-delete-outline" size="small" variant="text" @click="removeTorrents">
                删除种子（{{ chosenHashes.length }}）
              </v-btn>
            </div>
          </v-slide-y-transition>

          <v-table density="compact">
            <thead>
            <tr>
              <th style="width: 48px">
                <v-checkbox-btn :indeterminate="picked.length > 0 && !allPicked" :model-value="allPicked"
                                density="compact" @update:model-value="toggleAll"/>
              </th>
              <th style="width: 56px">集</th>
              <th>标题 / 重命名后</th>
              <th style="width: 84px">RSS</th>
              <th style="width: 96px">大小</th>
              <th style="width: 104px">状态</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="(it, i) in items" :key="i" :class="{blocked: typeof it.episode === 'number' && blocked.has(it.episode)}">
              <td>
                <v-checkbox-btn v-model="picked" :value="i" density="compact"/>
              </td>
              <td>{{ it.episode ?? '—' }}</td>
              <td>
                <div class="text-body-2">{{ it.title }}</div>
                <div v-if="it.reName" class="text-caption text-medium-emphasis">→ {{ it.reName }}</div>
              </td>
              <td>
                <!-- 主 / 备用 RSS：上游预览表里有这一列，命中的是哪条源直接影响排查 -->
                <v-chip v-if="it.master" size="x-small" variant="tonal">主</v-chip>
                <v-chip v-else color="warning" size="x-small" variant="tonal">备用</v-chip>
              </td>
              <td class="text-caption">{{ it.formatSize || '—' }}</td>
              <td>
                <v-chip v-if="typeof it.episode === 'number' && blocked.has(it.episode)"
                        color="error" size="x-small" variant="tonal">不下载
                </v-chip>
                <v-chip v-else :color="it.hasDownloaded ? 'success' : undefined" size="x-small" variant="tonal">
                  {{ it.hasDownloaded ? '已下载' : '未下载' }}
                </v-chip>
              </td>
            </tr>
            </tbody>
          </v-table>
        </template>
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

.picked-bar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
    padding: 6px 8px 6px 14px;
    border-radius: 10px;
    background: rgba(var(--v-theme-primary), .1);
}

/* 标成不下载的整行压暗，一眼看出来哪几集被排除了 */
.blocked > td {
    opacity: .72;
}
</style>
