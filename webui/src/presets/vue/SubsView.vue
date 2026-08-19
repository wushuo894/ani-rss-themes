<script setup lang="ts">
import type {Ani} from '@shared/types'
import {toApiFile} from '@shared/http'
import {formatEpisodes, fromNow} from '@shared/format'
import {useAniScreen} from '@/composables/useAniScreen'
import AniDialogs from '@/components/ani/AniDialogs.vue'
import AniBatchBar from '@/components/ani/AniBatchBar.vue'

/**
 * 文档式列表：一行一条，靠细线分栏，不用卡片也不用阴影。
 * 星期分组做成文档的小节标题（## 周一），信息密度介于表格和海报墙之间。
 */
const s = useAniScreen()

const cover = (a: Ani) => (a.cover ? toApiFile(a.cover) : '')

/** 点标题跳 Bangumi，与卡片视图一致 */
function openBgm(a: Ani) {
  if (a.bgmUrl) return window.open(a.bgmUrl, '_blank', 'noopener')
  if (a.title) {
    const t = a.title.replace(/ ?\((19|20)\d{2}\)/g, '').replace(/ ?\[tmdbid=(\d+)]/g, '').trim()
    window.open(`https://bgm.tv/subject_search/${encodeURIComponent(t)}?cat=2`, '_blank', 'noopener')
  }
}
</script>

<template>
  <div class="pa-4 pa-md-6">
    <div class="d-flex align-center flex-wrap ga-2 mb-5">
      <h1 class="text-h5 font-weight-bold mr-2">订阅</h1>
      <v-chip size="small" variant="tonal">{{ s.ani.filtered.length }}</v-chip>
      <v-spacer/>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="s.adding.value = true">添加订阅</v-btn>
      <v-btn :loading="s.ani.loading" prepend-icon="mdi-refresh" variant="outlined"
             @click="s.ani.refreshAll()">刷新全部
      </v-btn>
      <v-menu>
        <template #activator="{props}">
          <v-btn v-bind="props" icon="mdi-dots-horizontal" variant="text"/>
        </template>
        <v-list density="compact">
          <v-list-item prepend-icon="mdi-package-variant-closed" title="合集下载"
                       @click="s.collecting.value = true"/>
          <v-list-item prepend-icon="mdi-file-import-outline" title="导入订阅"
                       @click="s.importing.value = true"/>
          <v-list-item :prepend-icon="s.selectMode.value ? 'mdi-close' : 'mdi-checkbox-multiple-marked-outline'"
                       :title="s.selectMode.value ? '退出多选' : '多选'"
                       @click="s.toggleSelectMode()"/>
        </v-list>
      </v-menu>
    </div>

    <AniBatchBar :s="s" rounded="lg" variant="outlined"/>

    <v-progress-linear v-if="s.ani.loading" class="mb-2" indeterminate/>

    <v-empty-state
        v-if="!s.ani.loading && !s.ani.filtered.length"
        :text="s.ani.keyword ? '换个关键词试试，支持拼音和首字母' : '还没有订阅，点右上角添加一个'"
        :title="s.ani.keyword ? '没有匹配的订阅' : '空空如也'"
        icon="mdi-television-off"
    />

    <template v-else>
      <template v-if="s.grouped.value">
        <section v-for="w in s.ani.byWeek" :key="w.label" class="mb-8">
          <h2 class="section-title">
            {{ w.label }}
            <span class="text-medium-emphasis font-weight-regular">{{ w.items.length }}</span>
          </h2>
          <div class="rows">
            <div v-for="a in w.items" :key="a.id" class="row" @click="s.selectMode.value && s.on.toggle(a)">
              <v-checkbox v-if="s.selectMode.value" :model-value="!!a.id && s.ani.selected.has(a.id)"
                          class="flex-grow-0" density="compact" hide-details @click.stop="s.on.toggle(a)"/>
              <v-img :src="cover(a)" class="thumb" cover height="56" width="40"/>
              <div class="grow">
                <div class="title" @click.stop="openBgm(a)">{{ a.title }}</div>
                <div class="meta">
                  <span>{{ a.subgroup || '未知字幕组' }}</span>
                  <span>·</span>
                  <span>第 {{ a.season ?? 1 }} 季</span>
                  <span>·</span>
                  <span>{{ formatEpisodes(a.currentEpisodeNumber, a.totalEpisodeNumber) }}</span>
                  <template v-if="s.prefs.showLastDownloadTime && a.lastDownloadTime">
                    <span>·</span>
                    <span>{{ fromNow(a.lastDownloadTime) }}</span>
                  </template>
                </div>
              </div>
              <v-chip v-if="s.prefs.showScore && a.score" class="flex-grow-0" size="small" variant="tonal"
                      @click.stop="s.on.rate(a)">
                {{ a.score.toFixed(1) }}
              </v-chip>
              <v-chip v-if="!a.enable" class="flex-grow-0" color="warning" size="small" variant="tonal">停用</v-chip>
              <div class="actions">
                <v-btn v-if="s.prefs.showPlaylist" icon="mdi-file-video-outline" size="small" title="视频列表"
                       variant="text" @click.stop="s.on.playlist(a)"/>
                <v-btn icon="mdi-eye-outline" size="small" title="预览匹配" variant="text"
                       @click.stop="s.on.preview(a)"/>
                <v-btn icon="mdi-pencil" size="small" title="编辑" variant="text" @click.stop="s.on.edit(a)"/>
                <v-btn color="error" icon="mdi-delete-outline" size="small" title="删除" variant="text"
                       @click.stop="s.on.del(a)"/>
              </div>
            </div>
          </div>
        </section>
      </template>

      <!-- 搜索时不分组：结果再按星期切碎反而难找 -->
      <div v-else class="rows">
        <div v-for="a in s.ani.filtered" :key="a.id" class="row" @click="s.selectMode.value && s.on.toggle(a)">
          <v-checkbox v-if="s.selectMode.value" :model-value="!!a.id && s.ani.selected.has(a.id)"
                      class="flex-grow-0" density="compact" hide-details @click.stop="s.on.toggle(a)"/>
          <v-img :src="cover(a)" class="thumb" cover height="56" width="40"/>
          <div class="grow">
            <div class="title" @click.stop="openBgm(a)">{{ a.title }}</div>
            <div class="meta">
              <span>{{ a.subgroup || '未知字幕组' }}</span>
              <span>·</span>
              <span>{{ formatEpisodes(a.currentEpisodeNumber, a.totalEpisodeNumber) }}</span>
            </div>
          </div>
          <div class="actions">
            <v-btn icon="mdi-pencil" size="small" variant="text" @click.stop="s.on.edit(a)"/>
            <v-btn color="error" icon="mdi-delete-outline" size="small" variant="text" @click.stop="s.on.del(a)"/>
          </div>
        </div>
      </div>
    </template>

    <AniDialogs :s="s"/>
  </div>
</template>

<style scoped>
.section-title {
    font-size: 1.05rem;
    font-weight: 600;
    padding-bottom: 8px;
    margin-bottom: 4px;
    border-bottom: 1px solid rgba(128, 128, 128, .22);
}

.grow {
    flex: 1 1 auto;
    min-width: 0;
}

.rows {
    display: flex;
    flex-direction: column;
}

.row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 8px;
    border-bottom: 1px solid rgba(128, 128, 128, .14);
}

.row:hover {
    background: rgba(128, 128, 128, .07);
}

.thumb {
    flex: 0 0 40px;
    border-radius: 4px;
}

.title {
    font-weight: 500;
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.title:hover {
    color: rgb(var(--v-theme-primary));
}

.meta {
    display: flex;
    gap: 6px;
    font-size: .78rem;
    opacity: .65;
    overflow: hidden;
    white-space: nowrap;
}

.actions {
    display: flex;
    flex: 0 0 auto;
    opacity: 0;
    transition: opacity .15s;
}

.row:hover .actions {
    opacity: 1;
}

/* 触屏没有 hover，操作按钮必须一直显示 */
@media (hover: none) {
    .actions {
        opacity: 1;
    }

    .meta {
        font-size: .72rem;
    }
}
</style>
