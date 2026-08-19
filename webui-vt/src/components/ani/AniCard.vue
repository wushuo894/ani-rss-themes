<script setup lang="ts">
import {computed} from 'vue'
import type {Ani} from '@shared/types'
import {toApiFile} from '@shared/http'
import {formatEpisodes, fromNow} from '@shared/format'
import {usePrefsStore} from '@/stores/prefs'

const props = defineProps<{
  item: Ani
  selected?: boolean
  selectMode?: boolean
}>()

const emit = defineEmits<{
  edit: [Ani]
  playlist: [Ani]
  cover: [Ani]
  del: [Ani]
  rate: [Ani]
  preview: [Ani]
  toggle: [Ani]
}>()

const prefs = usePrefsStore()

/**
 * 封面是 ani-rss 下载到本地的文件，走 api/file 取（令牌在查询串里）。
 * 不是外链，所以不用 proxyImage —— 那个是给未落地的远程图用的。
 */
const coverUrl = computed(() => (props.item.cover ? toApiFile(props.item.cover) : ''))

/** 点标题跳 Bangumi；没有 bgmUrl 就退化成按标题搜索，与上游行为一致 */
function openBgm() {
  const it = props.item
  if (it.bgmUrl) {
    window.open(it.bgmUrl, '_blank', 'noopener')
    return
  }
  if (it.title) {
    const t = it.title.replace(/ ?\((19|20)\d{2}\)/g, '').replace(/ ?\[tmdbid=(\d+)]/g, '').trim()
    window.open(`https://bgm.tv/subject_search/${encodeURIComponent(t)}?cat=2`, '_blank', 'noopener')
  }
}

function onCardClick() {
  if (props.selectMode) emit('toggle', props.item)
}
</script>

<template>
  <v-card
      :class="{'ani-card--selected': selected}"
      class="ani-card"
      :ripple="selectMode"
      @click="onCardClick"
  >
    <div class="poster-wrap">
      <v-img :src="coverUrl" :alt="item.title" aspect-ratio="0.7" cover class="poster">
        <template #placeholder>
          <div class="d-flex align-center justify-center fill-height bg-surface-variant">
            <v-icon size="32" class="text-medium-emphasis">mdi-image-outline</v-icon>
          </div>
        </template>
        <template #error>
          <div class="d-flex align-center justify-center fill-height bg-surface-variant">
            <v-icon size="32" class="text-medium-emphasis">mdi-image-broken-variant</v-icon>
          </div>
        </template>
      </v-img>

      <!-- 评分角标。挂在 poster-wrap 而不是 v-img 内部：v-img 有 overflow:hidden，
           挂里面会被裁掉一角（这个坑在 CSS 主题那边踩过一次） -->
      <div v-if="prefs.showScore && item.score" class="score-badge">
        <v-chip color="primary" size="small" variant="flat" @click.stop="emit('rate', item)">
          {{ item.score.toFixed(1) }}
        </v-chip>
      </div>

      <div v-if="!item.enable" class="disabled-veil">
        <v-chip size="small" variant="flat">未启用</v-chip>
      </div>

      <v-checkbox
          v-if="selectMode"
          :model-value="selected"
          class="select-box"
          density="compact"
          hide-details
          @click.stop="emit('toggle', item)"
      />
    </div>

    <v-card-text class="pb-1 pt-2 px-3">
      <div class="title-line" :title="item.title" @click.stop="openBgm">{{ item.title }}</div>

      <div class="d-flex flex-wrap ga-1 mt-2">
        <v-chip size="x-small" variant="tonal">第 {{ item.season ?? 1 }} 季</v-chip>
        <v-chip size="x-small" variant="tonal" color="warning">
          {{ formatEpisodes(item.currentEpisodeNumber, item.totalEpisodeNumber) }}
        </v-chip>
        <v-chip size="x-small" variant="tonal" :color="item.ova ? 'error' : undefined">
          {{ item.ova ? 'OVA' : 'TV' }}
        </v-chip>
        <v-chip v-if="item.standbyRssList?.length" size="x-small" variant="tonal" color="info">备用RSS</v-chip>
      </div>

      <div class="subgroup mt-1" :title="item.subgroup">{{ item.subgroup || '未知字幕组' }}</div>

      <div v-if="prefs.showLastDownloadTime && item.lastDownloadTime" class="time-line">
        {{ fromNow(item.lastDownloadTime) }}
      </div>
    </v-card-text>

    <v-card-actions class="pt-0 px-2">
      <v-btn
          v-if="prefs.showPlaylist"
          icon="mdi-file-video-outline"
          size="small"
          title="视频列表"
          variant="text"
          @click.stop="emit('playlist', item)"
      />
      <v-btn icon="mdi-image-edit-outline" size="small" title="更换封面" variant="text" @click.stop="emit('cover', item)"/>
      <v-btn icon="mdi-eye-outline" size="small" title="预览匹配结果" variant="text" @click.stop="emit('preview', item)"/>
      <v-spacer/>
      <v-btn icon="mdi-pencil" size="small" title="编辑" variant="text" @click.stop="emit('edit', item)"/>
      <v-btn color="error" icon="mdi-delete-outline" size="small" title="删除" variant="text" @click.stop="emit('del', item)"/>
    </v-card-actions>
  </v-card>
</template>

<style scoped>
.ani-card {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.ani-card--selected {
    outline: 2px solid rgb(var(--v-theme-primary));
    outline-offset: -2px;
}

.poster-wrap {
    position: relative;
}

.score-badge {
    position: absolute;
    top: 6px;
    right: 6px;
}

.select-box {
    position: absolute;
    top: 2px;
    left: 6px;
}

/* 未启用的整张压暗，一眼能从网格里区分出来 */
.disabled-veil {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding-bottom: 8px;
    background: rgba(0, 0, 0, .45);
}

.title-line {
    font-size: .875rem;
    line-height: 1.35;
    font-weight: 500;
    cursor: pointer;
    /* 固定两行高度，否则长短标题会让网格每行错位 */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    min-height: 2.7em;
}

.title-line:hover {
    color: rgb(var(--v-theme-primary));
}

.subgroup, .time-line {
    font-size: .75rem;
    opacity: .7;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
</style>
