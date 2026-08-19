<script setup lang="ts">
import type {Ani} from '@shared/types'
import {toApiFile} from '@shared/http'
import {formatEpisodes, fromNow} from '@shared/format'
import {useAniScreen} from '@/composables/useAniScreen'
import AniDialogs from '@/components/ani/AniDialogs.vue'
import AniBatchBar from '@/components/ani/AniBatchBar.vue'

/**
 * 横躺的大卡：左边一张海报，右边信息和操作。
 *
 * 不做海报墙是因为这套视觉的重点在「玻璃的边缘折射」——
 * 卡片越小边缘占比越高，一屏几十张小卡会糊成一片高光。宽卡少而大，才看得出材质。
 */
const s = useAniScreen()

const cover = (a: Ani) => (a.cover ? toApiFile(a.cover) : '')
</script>

<template>
  <div class="pa-4 pa-md-6">
    <div class="d-flex align-center flex-wrap ga-2 mb-4">
      <v-btn color="primary" prepend-icon="mdi-plus" @click="s.adding.value = true">添加订阅</v-btn>
      <v-btn :loading="s.ani.loading" prepend-icon="mdi-refresh" variant="tonal" @click="s.ani.refreshAll()">
        刷新全部
      </v-btn>
      <v-btn prepend-icon="mdi-package-variant-closed" variant="tonal" @click="s.collecting.value = true">合集</v-btn>
      <v-btn prepend-icon="mdi-file-import-outline" variant="tonal" @click="s.importing.value = true">导入</v-btn>
      <v-spacer/>
      <v-btn :active="s.selectMode.value"
             :prepend-icon="s.selectMode.value ? 'mdi-close' : 'mdi-checkbox-multiple-marked-outline'"
             variant="tonal" @click="s.toggleSelectMode()">
        {{ s.selectMode.value ? '退出多选' : '多选' }}
      </v-btn>
    </div>

    <AniBatchBar :s="s" rounded="xl"/>

    <v-progress-linear v-if="s.ani.loading" class="mb-2" indeterminate rounded/>

    <v-empty-state
        v-if="!s.ani.loading && !s.ani.filtered.length"
        :text="s.ani.keyword ? '换个关键词试试，支持拼音和首字母' : '还没有订阅'"
        :title="s.ani.keyword ? '没有匹配的订阅' : '空空如也'"
        icon="mdi-television-off"
    />

    <template v-else>
      <template v-for="w in (s.grouped.value ? s.ani.byWeek : [{label: '', items: s.ani.filtered}])"
                :key="w.label">
        <div v-if="w.label" class="d-flex align-center ga-2 mb-3 mt-6">
          <h3 class="text-subtitle-1 font-weight-medium">{{ w.label }}</h3>
          <v-chip size="x-small" variant="tonal">{{ w.items.length }}</v-chip>
        </div>

        <div class="card-column">
          <v-card v-for="a in w.items" :key="a.id"
                  :class="{'is-selected': !!a.id && s.ani.selected.has(a.id), 'is-off': !a.enable}"
                  class="wide-card"
                  @click="s.selectMode.value && s.on.toggle(a)">
            <div class="d-flex">
              <!-- 必须给 aspect-ratio：v-img 在 flex 行里没有固有高度，只给 width 会塌成 0 高
                   （表现是海报那一栏整块空白，不报错） -->
              <v-img :src="cover(a)" aspect-ratio="0.7" class="poster" cover width="96">
                <template #placeholder>
                  <div class="d-flex align-center justify-center fill-height bg-surface-variant">
                    <v-icon icon="mdi-image-outline"/>
                  </div>
                </template>
              </v-img>

              <div class="pa-4 grow">
                <div class="d-flex align-start ga-2">
                  <div class="grow">
                    <div class="title">{{ a.title }}</div>
                    <div class="text-caption text-medium-emphasis">
                      {{ a.subgroup || '未知字幕组' }}
                      <template v-if="s.prefs.showLastDownloadTime && a.lastDownloadTime">
                        · {{ fromNow(a.lastDownloadTime) }}
                      </template>
                    </div>
                  </div>
                  <v-chip v-if="s.prefs.showScore && a.score" color="primary" size="small" variant="flat"
                          @click.stop="s.on.rate(a)">
                    {{ a.score.toFixed(1) }}
                  </v-chip>
                  <v-checkbox v-if="s.selectMode.value" :model-value="!!a.id && s.ani.selected.has(a.id)"
                              density="compact" hide-details @click.stop="s.on.toggle(a)"/>
                </div>

                <div class="d-flex flex-wrap ga-1 mt-3">
                  <v-chip size="x-small" variant="tonal">第 {{ a.season ?? 1 }} 季</v-chip>
                  <v-chip color="warning" size="x-small" variant="tonal">
                    {{ formatEpisodes(a.currentEpisodeNumber, a.totalEpisodeNumber) }}
                  </v-chip>
                  <v-chip :color="a.ova ? 'error' : undefined" size="x-small" variant="tonal">
                    {{ a.ova ? 'OVA' : 'TV' }}
                  </v-chip>
                  <v-chip v-if="!a.enable" size="x-small" variant="tonal">未启用</v-chip>
                </div>

                <div class="d-flex ga-1 mt-3">
                  <v-btn v-if="s.prefs.showPlaylist" icon="mdi-file-video-outline" size="small" title="视频列表"
                         variant="text" @click.stop="s.on.playlist(a)"/>
                  <v-btn icon="mdi-image-edit-outline" size="small" title="更换封面" variant="text"
                         @click.stop="s.on.cover(a)"/>
                  <v-btn icon="mdi-eye-outline" size="small" title="预览匹配" variant="text"
                         @click.stop="s.on.preview(a)"/>
                  <v-spacer/>
                  <v-btn icon="mdi-pencil" size="small" title="编辑" variant="text" @click.stop="s.on.edit(a)"/>
                  <v-btn color="error" icon="mdi-delete-outline" size="small" title="删除" variant="text"
                         @click.stop="s.on.del(a)"/>
                </div>
              </div>
            </div>
          </v-card>
        </div>
      </template>
    </template>

    <AniDialogs :s="s"/>
  </div>
</template>

<style scoped>
.grow {
    flex: 1 1 auto;
    min-width: 0;
}

/* 宽屏两列就够了：再多列卡片就变窄，玻璃的边缘折射看不出来 */
.card-column {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
}

@media (min-width: 1100px) {
    .card-column {
        grid-template-columns: repeat(2, 1fr);
    }
}

.wide-card {
    overflow: hidden;
    transition: transform .2s cubic-bezier(.34, 1.56, .64, 1);
}

.wide-card:active {
    transform: scale(.99);
}

.is-selected {
    outline: 2px solid rgb(var(--v-theme-primary));
    outline-offset: -2px;
}

.is-off {
    opacity: .62;
}

.poster {
    flex: 0 0 96px;
    min-height: 136px;
}

.title {
    font-weight: 600;
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
</style>
