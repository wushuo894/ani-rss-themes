<script setup lang="ts">
import {useDisplay} from 'vuetify'
import {formatEpisodes, fromNow} from '@shared/format'
import {useAniScreen} from '@/composables/useAniScreen'
import AniCard from '@/components/ani/AniCard.vue'
import AniDialogs from '@/components/ani/AniDialogs.vue'
import AniBatchBar from '@/components/ani/AniBatchBar.vue'

/**
 * M3 的清单：分段按钮切换密度，卡片是大圆角填充卡，主操作是右下角的扩展 FAB。
 * FAB 而不是工具条上的按钮 —— M3 里「本页唯一最重要的动作」就该长这样。
 */
const s = useAniScreen()
const {mobile} = useDisplay()

const headers = [
  {title: '标题', key: 'title'},
  {title: '字幕组', key: 'subgroup'},
  {title: '进度', key: 'episodes', sortable: false, width: 110},
  {title: '状态', key: 'enable', width: 96},
  {title: '更新', key: 'lastDownloadTime', width: 140},
  {title: '', key: 'actions', sortable: false, align: 'end' as const, width: 130},
]
</script>

<template>
  <div class="pa-4">
    <div class="d-flex align-center flex-wrap ga-2 mb-4">
      <v-btn-toggle v-model="s.prefs.viewMode" density="comfortable" mandatory rounded="pill" variant="outlined">
        <v-btn prepend-icon="mdi-view-grid-outline" value="grid">网格</v-btn>
        <v-btn prepend-icon="mdi-view-list-outline" value="list">列表</v-btn>
      </v-btn-toggle>

      <v-spacer/>

      <v-btn :loading="s.ani.loading" icon="mdi-refresh" title="刷新全部" variant="text"
             @click="s.ani.refreshAll()"/>
      <v-btn icon="mdi-package-variant-closed" title="合集下载" variant="text" @click="s.collecting.value = true"/>
      <v-btn icon="mdi-file-import-outline" title="导入订阅" variant="text" @click="s.importing.value = true"/>
      <v-btn :active="s.selectMode.value"
             :icon="s.selectMode.value ? 'mdi-close' : 'mdi-checkbox-multiple-marked-outline'"
             title="多选" variant="text" @click="s.toggleSelectMode()"/>
    </div>

    <AniBatchBar :s="s" rounded="xl"/>

    <v-progress-linear v-if="s.ani.loading" class="mb-2" indeterminate rounded/>

    <v-empty-state
        v-if="!s.ani.loading && !s.ani.filtered.length"
        :text="s.ani.keyword ? '换个关键词试试，支持拼音和首字母' : '还没有订阅，点右下角添加一个'"
        :title="s.ani.keyword ? '没有匹配的订阅' : '空空如也'"
        icon="mdi-television-off"
    />

    <template v-else-if="s.prefs.viewMode === 'grid'">
      <template v-if="s.grouped.value">
        <div v-for="w in s.ani.byWeek" :key="w.label" class="mb-6">
          <div class="d-flex align-center ga-2 mb-3">
            <h3 class="text-subtitle-1 font-weight-medium">{{ w.label }}</h3>
            <v-chip size="x-small" variant="tonal">{{ w.items.length }}</v-chip>
          </div>
          <div class="m3-grid">
            <AniCard v-for="a in w.items" :key="a.id" :item="a"
                     :select-mode="s.selectMode.value" :selected="!!a.id && s.ani.selected.has(a.id)"
                     @cover="s.on.cover" @del="s.on.del" @edit="s.on.edit" @playlist="s.on.playlist"
                     @preview="s.on.preview" @rate="s.on.rate" @toggle="s.on.toggle"/>
          </div>
        </div>
      </template>
      <div v-else class="m3-grid">
        <AniCard v-for="a in s.ani.filtered" :key="a.id" :item="a"
                 :select-mode="s.selectMode.value" :selected="!!a.id && s.ani.selected.has(a.id)"
                 @cover="s.on.cover" @del="s.on.del" @edit="s.on.edit" @playlist="s.on.playlist"
                 @preview="s.on.preview" @rate="s.on.rate" @toggle="s.on.toggle"/>
      </div>
    </template>

    <!-- 列表态：窄屏放不下表格，退回网格 -->
    <v-card v-else-if="!mobile">
      <v-data-table :headers="headers" :items="s.ani.filtered" :items-per-page="50" item-value="id">
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
          <v-btn icon="mdi-eye-outline" size="small" variant="text" @click="s.on.preview(item)"/>
          <v-btn icon="mdi-file-video-outline" size="small" variant="text" @click="s.on.playlist(item)"/>
          <v-btn icon="mdi-pencil" size="small" variant="text" @click="s.on.edit(item)"/>
          <v-btn color="error" icon="mdi-delete-outline" size="small" variant="text" @click="s.on.del(item)"/>
        </template>
      </v-data-table>
    </v-card>

    <div v-else class="m3-grid">
      <AniCard v-for="a in s.ani.filtered" :key="a.id" :item="a"
               :select-mode="s.selectMode.value" :selected="!!a.id && s.ani.selected.has(a.id)"
               @cover="s.on.cover" @del="s.on.del" @edit="s.on.edit" @playlist="s.on.playlist"
               @preview="s.on.preview" @rate="s.on.rate" @toggle="s.on.toggle"/>
    </div>

    <!-- 扩展 FAB：M3 里页面主动作的标准位置 -->
    <v-btn class="fab" color="primary" prepend-icon="mdi-plus" rounded="lg" size="large"
           @click="s.adding.value = true">
      添加订阅
    </v-btn>

    <AniDialogs :s="s"/>
  </div>
</template>

<style scoped>
.m3-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 14px;
}

@media (min-width: 960px) {
    .m3-grid {
        grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
        gap: 18px;
    }
}

.fab {
    position: fixed;
    right: 24px;
    bottom: 24px;
    z-index: 5;
}

/* 窄屏底部有导航条，FAB 往上让一让 */
@media (max-width: 959px) {
    .fab {
        bottom: 84px;
        right: 16px;
    }
}
</style>
