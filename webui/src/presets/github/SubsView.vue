<script setup lang="ts">
import type {Ani} from '@shared/types'
import {formatEpisodes, fromNow} from '@shared/format'
import {useAniScreen} from '@/composables/useAniScreen'
import AniDialogs from '@/components/ani/AniDialogs.vue'
import AniBatchBar from '@/components/ani/AniBatchBar.vue'

/**
 * 仓库清单的排法：一张带边框的容器，顶部一条筛选栏，里面全是等高的行。
 * 没有封面图 —— GitHub 的清单靠文字密度取胜，塞海报就变味了。
 */
const s = useAniScreen()

/** 状态点的颜色，对应 GitHub 的语言色点 */
const dot = (a: Ani) => (!a.enable ? '#6e7681' : a.ova ? '#a371f7' : '#3fb950')
</script>

<template>
  <div class="pa-4">
    <div class="d-flex align-center flex-wrap ga-2 mb-4">
      <v-btn color="success" prepend-icon="mdi-plus" variant="flat" @click="s.adding.value = true">添加订阅</v-btn>
      <v-btn :loading="s.ani.loading" prepend-icon="mdi-refresh" @click="s.ani.refreshAll()">刷新全部</v-btn>
      <v-btn prepend-icon="mdi-package-variant-closed" @click="s.collecting.value = true">合集</v-btn>
      <v-btn prepend-icon="mdi-file-import-outline" @click="s.importing.value = true">导入</v-btn>
      <v-spacer/>
      <v-btn :active="s.selectMode.value"
             :prepend-icon="s.selectMode.value ? 'mdi-close' : 'mdi-checkbox-multiple-marked-outline'"
             @click="s.toggleSelectMode()">
        {{ s.selectMode.value ? '退出多选' : '多选' }}
      </v-btn>
    </div>

    <AniBatchBar :s="s" rounded="md" variant="outlined"/>

    <v-card>
      <!-- 清单头：GitHub 那条灰底的 filter bar -->
      <div class="list-head">
        <span class="text-body-2">
          <strong>{{ s.ani.filtered.length }}</strong> 条订阅 ·
          {{ s.ani.enabledCount }} 启用
        </span>
        <v-spacer/>
        <v-btn-toggle v-model="s.prefs.showWeek" class="flex-grow-0" density="compact" mandatory variant="text">
          <v-btn :value="true" size="small">按星期</v-btn>
          <v-btn :value="false" size="small">平铺</v-btn>
        </v-btn-toggle>
      </div>

      <v-progress-linear v-if="s.ani.loading" indeterminate/>

      <v-empty-state
          v-if="!s.ani.loading && !s.ani.filtered.length"
          :text="s.ani.keyword ? '换个关键词试试，支持拼音和首字母' : '还没有订阅'"
          :title="s.ani.keyword ? '没有匹配的订阅' : '空空如也'"
          icon="mdi-television-off"
      />

      <template v-else>
        <template v-for="w in (s.grouped.value ? s.ani.byWeek : [{label: '', items: s.ani.filtered}])"
                  :key="w.label">
          <div v-if="w.label" class="week-head">{{ w.label }}</div>
          <div v-for="a in w.items" :key="a.id" class="gh-row"
               @click="s.selectMode.value && s.on.toggle(a)">
            <v-checkbox v-if="s.selectMode.value" :model-value="!!a.id && s.ani.selected.has(a.id)"
                        class="flex-grow-0 mr-2" density="compact" hide-details @click.stop="s.on.toggle(a)"/>

            <div class="grow">
              <div class="d-flex align-center ga-2">
                <a class="repo-title" @click.stop="s.on.edit(a)">{{ a.title }}</a>
                <v-chip v-if="!a.enable" size="x-small" variant="outlined">停用</v-chip>
                <v-chip v-if="a.standbyRssList?.length" color="info" size="x-small" variant="outlined">
                  备用 RSS
                </v-chip>
              </div>

              <div class="desc">{{ a.themoviedbName || a.jpTitle || '—' }}</div>

              <div class="sub">
                <span class="d-inline-flex align-center">
                  <span :style="{background: dot(a)}" class="dot"/>
                  {{ a.ova ? 'OVA' : 'TV' }} · 第 {{ a.season ?? 1 }} 季
                </span>
                <span>{{ a.subgroup || '未知字幕组' }}</span>
                <span>{{ formatEpisodes(a.currentEpisodeNumber, a.totalEpisodeNumber) }}</span>
                <span v-if="s.prefs.showScore && a.score" class="d-inline-flex align-center">
                  <v-icon icon="mdi-star" size="12"/>&nbsp;{{ a.score.toFixed(1) }}
                </span>
                <span v-if="s.prefs.showLastDownloadTime && a.lastDownloadTime">
                  更新于 {{ fromNow(a.lastDownloadTime) }}
                </span>
              </div>
            </div>

            <div class="d-flex flex-grow-0 ga-1">
              <v-btn v-if="s.prefs.showPlaylist" prepend-icon="mdi-file-video-outline" size="small"
                     @click.stop="s.on.playlist(a)">视频
              </v-btn>
              <v-btn prepend-icon="mdi-eye-outline" size="small" @click.stop="s.on.preview(a)">预览</v-btn>
              <v-menu>
                <template #activator="{props}">
                  <v-btn v-bind="props" icon="mdi-dots-horizontal" size="small" @click.stop/>
                </template>
                <v-list density="compact">
                  <v-list-item prepend-icon="mdi-pencil" title="编辑" @click="s.on.edit(a)"/>
                  <v-list-item prepend-icon="mdi-image-edit-outline" title="更换封面" @click="s.on.cover(a)"/>
                  <v-list-item prepend-icon="mdi-star-outline" title="评分" @click="s.on.rate(a)"/>
                  <v-list-item prepend-icon="mdi-refresh" title="刷新这一条" @click="s.ani.refreshOne(a)"/>
                  <v-divider/>
                  <v-list-item base-color="error" prepend-icon="mdi-delete-outline" title="删除"
                               @click="s.on.del(a)"/>
                </v-list>
              </v-menu>
            </div>
          </div>
        </template>
      </template>
    </v-card>

    <AniDialogs :s="s"/>
  </div>
</template>

<style scoped>
.grow {
    flex: 1 1 auto;
    min-width: 0;
}

.list-head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: rgb(var(--v-theme-surface-variant));
    border-bottom: 1px solid rgba(128, 128, 128, .28);
}

.week-head {
    padding: 6px 16px;
    font-size: .75rem;
    font-weight: 600;
    letter-spacing: .04em;
    opacity: .65;
    background: rgba(128, 128, 128, .06);
    border-bottom: 1px solid rgba(128, 128, 128, .18);
}

.gh-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(128, 128, 128, .18);
}

.gh-row:last-child {
    border-bottom: none;
}

.gh-row:hover {
    background: rgba(128, 128, 128, .06);
}

.repo-title {
    font-size: 1rem;
    font-weight: 600;
    color: rgb(var(--v-theme-primary));
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.repo-title:hover {
    text-decoration: underline;
}

.desc, .sub {
    font-size: .8rem;
    opacity: .7;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.desc {
    margin-top: 2px;
}

.sub {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 6px;
}

.dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-right: 5px;
    display: inline-block;
}
</style>
