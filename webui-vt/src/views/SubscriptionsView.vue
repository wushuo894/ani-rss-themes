<script setup lang="ts">
import {computed, onMounted, ref} from 'vue'
import {useDisplay} from 'vuetify'
import type {Ani} from '@shared/types'
import {formatEpisodes, fromNow} from '@shared/format'
import {useAniStore} from '@/stores/ani'
import {usePrefsStore} from '@/stores/prefs'
import AniCard from '@/components/ani/AniCard.vue'
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

const selectMode = ref(false)

/* 各弹窗的目标对象。用 null 表示关闭，避免再多一个 boolean 状态 */
const editing = ref<Ani | null>(null)
const adding = ref(false)
const deleting = ref<Ani[] | null>(null)
const playlistOf = ref<Ani | null>(null)
const coverOf = ref<Ani | null>(null)
const ratingOf = ref<Ani | null>(null)
const previewOf = ref<Ani | null>(null)
const importing = ref(false)
const collecting = ref(false)

onMounted(() => {
  if (!ani.all.length) void ani.reload()
})

const selectedIds = computed(() => [...ani.selected])
const selectedAnis = computed(() => ani.all.filter(a => a.id && ani.selected.has(a.id)))

/** 按星期分组只在「显示星期」开着且没搜索时才有意义 —— 搜索结果再按星期切碎反而难找 */
const grouped = computed(() => prefs.showWeek && !ani.keyword.trim())

function exitSelect() {
  selectMode.value = false
  ani.clearSelection()
}

async function batch(fn: () => Promise<unknown>) {
  await fn()
  exitSelect()
}

const listHeaders = [
  {title: '标题', key: 'title'},
  {title: '字幕组', key: 'subgroup'},
  {title: '季', key: 'season', width: 70},
  {title: '进度', key: 'episodes', sortable: false, width: 110},
  {title: '状态', key: 'enable', width: 90},
  {title: '更新', key: 'lastDownloadTime', width: 140},
  {title: '', key: 'actions', sortable: false, align: 'end' as const, width: 130},
]
</script>

<template>
  <div class="pa-4">
    <!-- ── 工具条 ── -->
    <div class="d-flex align-center flex-wrap ga-2 mb-4">
      <v-btn color="primary" prepend-icon="mdi-plus" @click="adding = true">添加订阅</v-btn>
      <v-btn :loading="ani.loading" prepend-icon="mdi-refresh" variant="tonal" @click="ani.refreshAll()">
        刷新全部
      </v-btn>

      <v-btn prepend-icon="mdi-package-variant-closed" variant="tonal" @click="collecting = true">合集</v-btn>
      <v-btn prepend-icon="mdi-file-import-outline" variant="tonal" @click="importing = true">导入</v-btn>

      <v-spacer/>

      <v-btn-toggle v-model="prefs.viewMode" density="comfortable" mandatory variant="outlined">
        <v-btn icon="mdi-view-grid-outline" value="grid" title="网格"/>
        <v-btn icon="mdi-view-list-outline" value="list" title="列表"/>
      </v-btn-toggle>

      <v-btn
          :active="selectMode"
          :prepend-icon="selectMode ? 'mdi-close' : 'mdi-checkbox-multiple-marked-outline'"
          variant="tonal"
          @click="selectMode ? exitSelect() : (selectMode = true)"
      >
        {{ selectMode ? '退出多选' : '多选' }}
      </v-btn>
    </div>

    <!-- ── 批量操作条：有选中项才出现 ── -->
    <v-slide-y-transition>
      <v-sheet v-if="selectMode" class="d-flex align-center flex-wrap ga-2 pa-3 mb-4" color="surface-variant" rounded>
        <span class="text-body-2 mr-2">已选 {{ selectedIds.length }} 项</span>
        <v-btn size="small" variant="text" @click="ani.selectAll()">全选</v-btn>
        <v-btn size="small" variant="text" @click="ani.clearSelection()">取消选择</v-btn>
        <v-divider class="mx-1" vertical/>
        <v-btn :disabled="!selectedIds.length" size="small" variant="tonal"
               @click="batch(() => ani.setEnabled(selectedIds, true))">启用
        </v-btn>
        <v-btn :disabled="!selectedIds.length" size="small" variant="tonal"
               @click="batch(() => ani.setEnabled(selectedIds, false))">禁用
        </v-btn>
        <v-btn :disabled="!selectedIds.length" size="small" variant="tonal"
               @click="batch(() => ani.batchScrape(selectedIds, false))">刮削
        </v-btn>
        <v-btn :disabled="!selectedIds.length" size="small" variant="tonal"
               @click="batch(() => ani.updateEpisodes(selectedIds, false))">更新总集数
        </v-btn>
        <v-btn :disabled="!selectedIds.length" color="error" size="small" variant="tonal"
               @click="deleting = selectedAnis">删除
        </v-btn>
      </v-sheet>
    </v-slide-y-transition>

    <v-progress-linear v-if="ani.loading" class="mb-2" indeterminate/>

    <!-- ── 空态 ── -->
    <v-empty-state
        v-if="!ani.loading && !ani.filtered.length"
        :text="ani.keyword ? '换个关键词试试，支持拼音和首字母' : '还没有订阅，点左上角添加一个'"
        :title="ani.keyword ? '没有匹配的订阅' : '空空如也'"
        icon="mdi-television-off"
    />

    <!-- ── 网格视图 ── -->
    <template v-else-if="prefs.viewMode === 'grid'">
      <template v-if="grouped">
        <div v-for="w in ani.byWeek" :key="w.label" class="mb-6">
          <div class="d-flex align-center mb-3">
            <h3 class="text-subtitle-1 font-weight-medium">{{ w.label }}</h3>
            <v-chip class="ml-2" size="x-small" variant="tonal">{{ w.items.length }}</v-chip>
          </div>
          <div class="ani-grid">
            <AniCard
                v-for="a in w.items" :key="a.id"
                :item="a" :select-mode="selectMode" :selected="!!a.id && ani.selected.has(a.id)"
                @cover="coverOf = $event" @del="deleting = [$event]" @edit="editing = $event" @preview="previewOf = $event"
                @playlist="playlistOf = $event" @rate="ratingOf = $event" @toggle="a.id && ani.toggleSelect(a.id)"
            />
          </div>
        </div>
      </template>

      <div v-else class="ani-grid">
        <AniCard
            v-for="a in ani.filtered" :key="a.id"
            :item="a" :select-mode="selectMode" :selected="!!a.id && ani.selected.has(a.id)"
            @cover="coverOf = $event" @del="deleting = [$event]" @edit="editing = $event" @preview="previewOf = $event"
            @playlist="playlistOf = $event" @rate="ratingOf = $event" @toggle="a.id && ani.toggleSelect(a.id)"
        />
      </div>
    </template>

    <!-- ── 列表视图：窄屏用不上表格，仍退回网格 ── -->
    <v-card v-else-if="!mobile" variant="flat">
      <v-data-table
          :headers="listHeaders"
          :items="ani.filtered"
          :items-per-page="50"
          density="comfortable"
          item-value="id"
      >
        <template #item.title="{item}">
          <div class="py-1">
            <div class="font-weight-medium">{{ item.title }}</div>
            <div class="text-caption text-medium-emphasis">{{ item.themoviedbName || '—' }}</div>
          </div>
        </template>
        <template #item.episodes="{item}">
          {{ formatEpisodes(item.currentEpisodeNumber, item.totalEpisodeNumber) }}
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
          <v-btn icon="mdi-eye-outline" size="small" title="预览" variant="text" @click="previewOf = item"/>
          <v-btn icon="mdi-file-video-outline" size="small" variant="text" @click="playlistOf = item"/>
          <v-btn icon="mdi-pencil" size="small" variant="text" @click="editing = item"/>
          <v-btn color="error" icon="mdi-delete-outline" size="small" variant="text" @click="deleting = [item]"/>
        </template>
      </v-data-table>
    </v-card>

    <div v-else class="ani-grid">
      <AniCard
          v-for="a in ani.filtered" :key="a.id"
          :item="a" :select-mode="selectMode" :selected="!!a.id && ani.selected.has(a.id)"
          @cover="coverOf = $event" @del="deleting = [$event]" @edit="editing = $event" @preview="previewOf = $event"
          @playlist="playlistOf = $event" @rate="ratingOf = $event" @toggle="a.id && ani.toggleSelect(a.id)"
      />
    </div>

    <!-- ── 弹窗 ── -->
    <AniAddDialog v-model="adding"/>
    <AniEditDialog v-if="editing" :item="editing" @close="editing = null"/>
    <AniDeleteDialog v-if="deleting" :items="deleting" @close="deleting = null; exitSelect()"/>
    <PlayListDialog v-if="playlistOf" :item="playlistOf" @close="playlistOf = null"/>
    <CoverDialog v-if="coverOf" :item="coverOf" @close="coverOf = null"/>
    <RateDialog v-if="ratingOf" :item="ratingOf" @close="ratingOf = null"/>
    <PreviewDialog v-if="previewOf" :item="previewOf" @close="previewOf = null"/>
    <ImportAniDialog v-model="importing"/>
    <CollectionDialog v-model="collecting"/>
  </div>
</template>

<style scoped>
/*
 * 自适应列数：卡片最小 150px，容器有多宽就放多少列。
 * 不用 Vuetify 的 v-col 断点——那是按 12 栅格切的，窄屏上要么一列太空要么两列太挤。
 */
.ani-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
}

@media (min-width: 960px) {
    .ani-grid {
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 16px;
    }
}
</style>
