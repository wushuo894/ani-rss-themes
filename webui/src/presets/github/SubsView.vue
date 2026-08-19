<script setup lang="ts">
import type {Ani} from '@shared/types'
import {useDisplay} from 'vuetify'
import {formatEpisodes, fromNow} from '@shared/format'
import {useAniScreen} from '@/composables/useAniScreen'
import AniSkeleton from '@/components/ani/AniSkeleton.vue'
import AniDialogs from '@/components/ani/AniDialogs.vue'
import AniBatchBar from '@/components/ani/AniBatchBar.vue'

/**
 * 仓库清单的排法：一张带边框的容器，顶部一条筛选栏，里面全是等高的行。
 * 没有封面图 —— GitHub 的清单靠文字密度取胜，塞海报就变味了。
 *
 * 也几乎没有动效：Primer 的层级来自 1px 边框和底色，不来自位移和阴影。
 * 这一款是五款里唯一「安静」的，切过来应该能立刻感觉到区别。
 */
const s = useAniScreen()
const {mobile} = useDisplay()

/** 状态点的颜色，对应 GitHub 的语言色点 */
const dot = (a: Ani) => (!a.enable ? '#6e7681' : a.ova ? '#a371f7' : '#3fb950')

/**
 * 副标题。刮削名和日文名经常就等于标题本身，原样显示会一行重复两遍，
 * 看着像渲染坏了 —— 只在真的不一样时才给这一行。
 */
const desc = (a: Ani) => [a.themoviedbName, a.jpTitle].find(v => v && v !== a.title) || ''

</script>

<template>
  <div class="pa-4">
    <div class="d-flex align-center flex-wrap ga-2 mb-4">
      <v-btn color="success" prepend-icon="mdi-plus" variant="flat" @click="s.adding.value = true">添加订阅</v-btn>
      <v-btn :loading="s.ani.loading" :icon="mobile ? 'mdi-refresh' : undefined"
             :prepend-icon="mobile ? undefined : 'mdi-refresh'" title="刷新全部" variant="outlined"
             @click="s.ani.refreshAll()">
        <template v-if="!mobile">刷新全部</template>
      </v-btn>
      <v-btn :icon="mobile ? 'mdi-package-variant-closed' : undefined"
             :prepend-icon="mobile ? undefined : 'mdi-package-variant-closed'" title="合集下载"
             variant="outlined" @click="s.collecting.value = true">
        <template v-if="!mobile">合集</template>
      </v-btn>
      <v-btn :icon="mobile ? 'mdi-file-import-outline' : undefined"
             :prepend-icon="mobile ? undefined : 'mdi-file-import-outline'" title="导入订阅"
             variant="outlined" @click="s.importing.value = true">
        <template v-if="!mobile">导入</template>
      </v-btn>
      <v-spacer/>
      <v-btn :active="s.selectMode.value"
             :icon="mobile ? (s.selectMode.value ? 'mdi-close' : 'mdi-checkbox-multiple-marked-outline') : undefined"
             :prepend-icon="mobile ? undefined : (s.selectMode.value ? 'mdi-close' : 'mdi-checkbox-multiple-marked-outline')"
             title="多选" variant="outlined" @click="s.toggleSelectMode()">
        <template v-if="!mobile">{{ s.selectMode.value ? '退出多选' : '多选' }}</template>
      </v-btn>
    </div>

    <AniBatchBar :s="s" rounded="md" variant="outlined"/>

    <v-card>
      <!-- 清单头：GitHub 那条灰底的 filter bar -->
      <div class="list-head">
        <span class="text-body-2 min0 ellipsis">
          <strong>{{ s.ani.filtered.length }}</strong> 条订阅 ·
          {{ s.ani.enabledCount }} 启用
        </span>
        <v-spacer/>
        <v-btn-toggle v-model="s.prefs.showWeek" class="flex-grow-0" density="compact" mandatory variant="text">
          <v-btn :value="true" size="small">按星期</v-btn>
          <v-btn :value="false" size="small">平铺</v-btn>
        </v-btn-toggle>
      </div>

      <div v-if="s.ani.loading && !s.ani.all.length" class="px-4">
        <AniSkeleton :count="8" shape="row"/>
      </div>

      <template v-else>
        <v-progress-linear v-if="s.ani.loading" indeterminate/>

        <v-empty-state
            v-if="!s.ani.filtered.length"
            :text="s.ani.keyword ? '换个关键词试试，支持拼音和首字母' : '还没有订阅'"
            :title="s.ani.keyword ? '没有匹配的订阅' : '空空如也'"
            icon="mdi-television-off"
        />

        <template v-for="w in (s.grouped.value ? s.ani.byWeek : [{label: '', items: s.ani.filtered}])"
                  v-else :key="w.label">
          <div v-if="w.label" class="week-head">{{ w.label }}</div>
          <div v-for="a in w.items" :key="a.id" class="gh-row"
               @click="s.selectMode.value && s.on.toggle(a)">
            <v-checkbox v-if="s.selectMode.value" :model-value="!!a.id && s.ani.selected.has(a.id)"
                        class="flex-grow-0 mr-2" density="compact" hide-details @click.stop="s.on.toggle(a)"/>

            <div class="min0">
              <!-- 这一层也要 min-width:0：flex 子项的默认 min-width 是 auto，
                   不改的话内层再怎么写 ellipsis 都不会生效，长标题直接把整行撑宽 -->
              <div class="d-flex align-center ga-2 min0">
                <a class="repo-title" @click.stop="s.on.edit(a)">{{ a.title }}</a>
                <span v-if="!a.enable" class="pill">停用</span>
                <span v-if="a.standbyRssList?.length" class="pill pill-info">备用 RSS</span>
              </div>

              <div v-if="desc(a)" class="desc">{{ desc(a) }}</div>

              <!-- 这一行是要换行的：五段信息在窄屏排不下一行，
                   硬写 nowrap 会把后面几段推出可视区（看不见也没有横滚条） -->
              <div class="sub">
                <span class="d-inline-flex align-center">
                  <span :style="{background: dot(a)}" class="dot"/>
                  {{ a.ova ? 'OVA' : 'TV' }} · 第 {{ a.season ?? 1 }} 季
                </span>
                <span class="ellipsis">{{ a.subgroup || '未知字幕组' }}</span>
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
              <v-btn v-if="s.prefs.showPlaylist && !mobile" prepend-icon="mdi-file-video-outline" size="small"
                     variant="outlined" @click.stop="s.on.playlist(a)">视频
              </v-btn>
              <v-btn v-if="!mobile" prepend-icon="mdi-eye-outline" size="small" variant="outlined"
                     @click.stop="s.on.preview(a)">预览
              </v-btn>
              <v-menu>
                <template #activator="{props}">
                  <v-btn v-bind="props" icon="mdi-dots-horizontal" size="small" variant="outlined" @click.stop/>
                </template>
                <v-list density="compact">
                  <v-list-item v-if="mobile && s.prefs.showPlaylist" prepend-icon="mdi-file-video-outline"
                               title="视频列表" @click="s.on.playlist(a)"/>
                  <v-list-item v-if="mobile" prepend-icon="mdi-eye-outline" title="预览匹配"
                               @click="s.on.preview(a)"/>
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
/* flex 子项的默认 min-width 是 auto，不清零的话内部的 ellipsis 一律失效 */
.min0 {
    flex: 1 1 auto;
    min-width: 0;
}

.ellipsis {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.list-head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: rgba(var(--v-theme-on-surface), .05);
    border-bottom: 1px solid rgba(128, 128, 128, .28);
}

/* 和 list-head 用同一种灰：两条横条挨着却是两个色，看着像没对齐 */
.week-head {
    padding: 6px 16px;
    font-size: .75rem;
    font-weight: 600;
    letter-spacing: .04em;
    opacity: .7;
    background: rgba(var(--v-theme-on-surface), .05);
    border-bottom: 1px solid rgba(128, 128, 128, .18);
}

.gh-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(128, 128, 128, .18);
    /* Primer 的反馈只有底色，没有位移也没有阴影 */
    transition: background-color var(--m-dur) var(--m-ease);
}

.gh-row:last-child {
    border-bottom: none;
}

.gh-row:hover {
    background: rgba(var(--v-theme-on-surface), .04);
}

.repo-title {
    flex: 0 1 auto;
    min-width: 0;
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

/* Primer 的小标签：方角、细边、不填色 */
.pill {
    flex: 0 0 auto;
    padding: 0 7px;
    border-radius: 999px;
    font-size: .69rem;
    line-height: 1.7;
    border: 1px solid rgba(128, 128, 128, .4);
    opacity: .8;
}

.pill-info {
    color: rgb(var(--v-theme-info));
    border-color: rgba(var(--v-theme-info), .5);
    opacity: 1;
}

.desc {
    font-size: .8rem;
    opacity: .68;
    margin-top: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.sub {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    font-size: .78rem;
    opacity: .68;
    margin-top: 6px;
    min-width: 0;
}

.sub > span {
    max-width: 100%;
}

.dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-right: 5px;
    display: inline-block;
}
</style>
