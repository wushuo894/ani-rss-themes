<script setup lang="ts">
import {computed, onMounted, ref} from 'vue'
import {useDisplay} from 'vuetify'
import type {Ani} from '@shared/types'
import {formatEpisodes, fromNow} from '@shared/format'
import {toApiFile} from '@shared/http'
import {useAniStore} from '@/stores/ani'
import {usePrefsStore} from '@/stores/prefs'
import AniEditDialog from '@/components/ani/AniEditDialog.vue'
import AniAddDialog from '@/components/ani/AniAddDialog.vue'
import AniDeleteDialog from '@/components/ani/AniDeleteDialog.vue'
import PlayListDialog from '@/components/ani/PlayListDialog.vue'
import CoverDialog from '@/components/ani/CoverDialog.vue'
import RateDialog from '@/components/ani/RateDialog.vue'
import PreviewDialog from '@/components/ani/PreviewDialog.vue'
import ImportAniDialog from '@/components/ani/ImportAniDialog.vue'
import CollectionDialog from '@/components/ani/CollectionDialog.vue'

const ani = useAniStore()
const prefs = usePrefsStore()
const {mobile} = useDisplay()

const editing = ref<Ani | null>(null)
const adding = ref(false)
const deleting = ref<Ani[] | null>(null)
const playlistOf = ref<Ani | null>(null)
const coverOf = ref<Ani | null>(null)
const ratingOf = ref<Ani | null>(null)
const previewOf = ref<Ani | null>(null)
const importing = ref(false)
const collecting = ref(false)

/** 表格自带多选，不像 vt 版那样单独有个「多选模式」 */
const selected = ref<string[]>([])
/** 只看已启用 / 只看停用 */
const filter = ref<'all' | 'on' | 'off'>('all')

onMounted(() => {
  if (!ani.all.length) void ani.reload()
})

const rows = computed(() => ani.filtered.filter(a =>
    filter.value === 'all' || (filter.value === 'on' ? a.enable : !a.enable),
))

const selectedAnis = computed(() => ani.all.filter(a => a.id && selected.value.includes(a.id)))

const headers = [
  {title: '', key: 'cover', sortable: false, width: 44},
  {title: '标题', key: 'title', minWidth: '240'},
  {title: '字幕组', key: 'subgroup', width: 150},
  {title: '季', key: 'season', width: 60},
  {title: '进度', key: 'episodes', sortable: false, width: 96},
  {title: '评分', key: 'score', width: 76},
  {title: '状态', key: 'enable', width: 84},
  {title: '最后更新', key: 'lastDownloadTime', width: 128},
  {title: '', key: 'actions', sortable: false, align: 'end' as const, width: 132},
]

async function batch(fn: () => Promise<unknown>) {
  await fn()
  selected.value = []
}
</script>

<template>
  <div class="pa-2 pa-sm-4">
    <!-- ── 工具条 ── -->
    <div class="d-flex align-center flex-wrap ga-2 mb-3">
      <v-btn color="primary" prepend-icon="mdi-plus" variant="flat" @click="adding = true">添加</v-btn>
      <v-btn :loading="ani.loading" prepend-icon="mdi-refresh" variant="tonal" @click="ani.refreshAll()">
        刷新全部
      </v-btn>

      <v-btn prepend-icon="mdi-package-variant-closed" variant="tonal" @click="collecting = true">合集</v-btn>
      <v-btn prepend-icon="mdi-file-import-outline" variant="tonal" @click="importing = true">导入</v-btn>

      <v-btn-toggle v-model="filter" density="compact" mandatory variant="outlined">
        <v-btn size="small" value="all">全部</v-btn>
        <v-btn size="small" value="on">已启用</v-btn>
        <v-btn size="small" value="off">已停用</v-btn>
      </v-btn-toggle>

      <v-spacer/>
      <v-chip size="small" variant="tonal">{{ rows.length }} 项</v-chip>
    </div>

    <!-- ── 选中后出现的批量条 ── -->
    <v-slide-y-transition>
      <v-sheet v-if="selected.length" class="d-flex align-center flex-wrap ga-2 pa-2 mb-3" color="surface-variant"
               rounded>
        <span class="text-caption mx-2">已选 {{ selected.length }} 项</span>
        <v-btn size="small" variant="tonal" @click="batch(() => ani.setEnabled(selected, true))">启用</v-btn>
        <v-btn size="small" variant="tonal" @click="batch(() => ani.setEnabled(selected, false))">禁用</v-btn>
        <v-btn size="small" variant="tonal" @click="batch(() => ani.batchScrape(selected, false))">刮削</v-btn>
        <v-btn size="small" variant="tonal" @click="batch(() => ani.updateEpisodes(selected, false))">
          更新总集数
        </v-btn>
        <v-btn color="error" size="small" variant="tonal" @click="deleting = selectedAnis">删除</v-btn>
        <v-spacer/>
        <v-btn size="small" variant="text" @click="selected = []">取消</v-btn>
      </v-sheet>
    </v-slide-y-transition>

    <v-progress-linear v-if="ani.loading" class="mb-2" indeterminate/>

    <v-empty-state
        v-if="!ani.loading && !rows.length"
        :text="ani.keyword ? '换个关键词试试，支持拼音和首字母' : '还没有订阅'"
        :title="ani.keyword ? '没有匹配的订阅' : '空空如也'"
        icon="mdi-television-off"
    />

    <!-- ── 主视图：表格。qb-web 的核心就是这张表 ── -->
    <v-card v-else-if="!mobile" variant="flat">
      <v-data-table
          v-model="selected"
          :headers="headers"
          :items="rows"
          :items-per-page="100"
          density="compact"
          item-value="id"
          show-select
      >
        <template #item.cover="{item}">
          <v-avatar rounded size="28">
            <v-img :src="item.cover ? toApiFile(item.cover) : ''"/>
          </v-avatar>
        </template>

        <template #item.title="{item}">
          <div class="py-1">
            <div class="text-body-2 text-truncate">{{ item.title }}</div>
            <div v-if="item.themoviedbName" class="text-caption text-medium-emphasis text-truncate">
              {{ item.themoviedbName }}
            </div>
          </div>
        </template>

        <template #item.episodes="{item}">
          {{ formatEpisodes(item.currentEpisodeNumber, item.totalEpisodeNumber) }}
        </template>

        <template #item.score="{item}">
          <span v-if="prefs.showScore && item.score" class="cursor-pointer" @click="ratingOf = item">
            {{ item.score.toFixed(1) }}
          </span>
          <span v-else class="text-disabled">—</span>
        </template>

        <template #item.enable="{item}">
          <v-chip :color="item.enable ? 'success' : undefined" size="x-small" variant="tonal">
            {{ item.enable ? '启用' : '停用' }}
          </v-chip>
        </template>

        <template #item.lastDownloadTime="{item}">
          <span class="text-caption">{{ fromNow(item.lastDownloadTime) }}</span>
        </template>

        <template #item.actions="{item}">
          <v-btn icon="mdi-eye-outline" size="x-small" title="预览" variant="text" @click="previewOf = item"/>
          <v-btn v-if="prefs.showPlaylist" icon="mdi-file-video-outline" size="x-small" title="视频列表"
                 variant="text" @click="playlistOf = item"/>
          <v-btn icon="mdi-image-edit-outline" size="x-small" title="封面" variant="text" @click="coverOf = item"/>
          <v-btn icon="mdi-pencil" size="x-small" title="编辑" variant="text" @click="editing = item"/>
          <v-btn color="error" icon="mdi-delete-outline" size="x-small" title="删除" variant="text"
                 @click="deleting = [item]"/>
        </template>
      </v-data-table>
    </v-card>

    <!-- ── 窄屏：表格换成紧凑列表行，仍然是「一行一条」的信息密度 ── -->
    <v-card v-else variant="flat">
      <v-list class="py-0">
        <template v-for="(a, i) in rows" :key="a.id">
          <v-list-item :subtitle="`${a.subgroup || '未知字幕组'} · ${formatEpisodes(a.currentEpisodeNumber, a.totalEpisodeNumber)}`"
                       :title="a.title" @click="editing = a">
            <template #prepend>
              <v-avatar rounded size="36">
                <v-img :src="a.cover ? toApiFile(a.cover) : ''"/>
              </v-avatar>
            </template>
            <template #append>
              <div class="d-flex flex-column align-end">
                <v-chip :color="a.enable ? 'success' : undefined" size="x-small" variant="tonal">
                  {{ a.enable ? '启用' : '停用' }}
                </v-chip>
                <span class="text-caption text-medium-emphasis mt-1">{{ fromNow(a.lastDownloadTime) }}</span>
              </div>
            </template>
          </v-list-item>
          <v-divider v-if="i < rows.length - 1"/>
        </template>
      </v-list>
    </v-card>

    <AniAddDialog v-model="adding"/>
    <AniEditDialog v-if="editing" :item="editing" @close="editing = null"/>
    <AniDeleteDialog v-if="deleting" :items="deleting" @close="deleting = null; selected = []"/>
    <PlayListDialog v-if="playlistOf" :item="playlistOf" @close="playlistOf = null"/>
    <CoverDialog v-if="coverOf" :item="coverOf" @close="coverOf = null"/>
    <RateDialog v-if="ratingOf" :item="ratingOf" @close="ratingOf = null"/>
    <PreviewDialog v-if="previewOf" :item="previewOf" @close="previewOf = null"/>
    <ImportAniDialog v-model="importing"/>
    <CollectionDialog v-model="collecting"/>
  </div>
</template>

<style scoped>
.cursor-pointer {
    cursor: pointer;
}
</style>
