<script setup lang="ts">
import {computed} from 'vue'
import type {Ani} from '@shared/types'
import {toApiFile} from '@shared/http'
import {formatEpisodes, fromNow} from '@shared/format'
import {usePrefsStore} from '@/stores/prefs'

/**
 * M3 的订阅卡：海报在上、文字区在下、操作行收底。
 *
 * 和海报卡（AniPosterCard）的分别是「文字有没有自己的地盘」——
 * 那张卡把字压在图上，一屏能塞更多；这张卡给文字留出完整一块，
 * 信息读起来不费劲。M3 的卡本来就是「容器」而不是「图块」。
 *
 * 集数进度做成一条细线：数字「12 / 24」要读，横条一眼就看完了。
 */
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

/** 总集数未知时不画进度线：画一条永远填满或永远空着的线比不画更误导 */
const progress = computed(() => {
  const cur = props.item.currentEpisodeNumber ?? 0
  const total = props.item.totalEpisodeNumber ?? 0
  return total > 0 ? Math.min(100, (cur / total) * 100) : null
})

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
      :class="{'ani-card--selected': selected, 'ani-card--off': !item.enable}"
      :ripple="selectMode"
      class="ani-card ani-lift"
      @click="onCardClick"
  >
    <div class="poster-wrap">
      <v-img :alt="item.title" :src="coverUrl" aspect-ratio="0.7" class="poster" cover>
        <template #placeholder>
          <div class="d-flex align-center justify-center fill-height bg-surface-variant">
            <v-icon class="text-medium-emphasis" size="32">mdi-image-outline</v-icon>
          </div>
        </template>
        <template #error>
          <div class="d-flex align-center justify-center fill-height bg-surface-variant">
            <v-icon class="text-medium-emphasis" size="32">mdi-image-broken-variant</v-icon>
          </div>
        </template>
      </v-img>

      <!-- 评分角标挂在 poster-wrap 而不是 v-img 内部：v-img 有 overflow:hidden，
           挂里面会被裁掉一角（这个坑在 CSS 主题那边踩过一次） -->
      <v-chip v-if="prefs.showScore && item.score" class="badge-score" color="primary" size="small"
              variant="flat" @click.stop="emit('rate', item)">
        {{ item.score.toFixed(1) }}
      </v-chip>

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

    <div class="body">
      <div :title="item.title" class="title-line" @click.stop="openBgm">{{ item.title }}</div>
      <div :title="item.subgroup" class="subgroup">{{ item.subgroup || '未知字幕组' }}</div>

      <!-- 进度：一条线 + 一组数字，比四个 chip 排一行干净得多 -->
      <div class="prog-row">
        <span class="ep">{{ formatEpisodes(item.currentEpisodeNumber, item.totalEpisodeNumber) }}</span>
        <span v-if="item.ova" class="tag">OVA</span>
        <span v-if="item.standbyRssList?.length" class="tag">备用RSS</span>
      </div>
      <div v-if="progress !== null" class="prog-track">
        <div :style="{width: `${progress}%`}" class="prog-fill"/>
      </div>

      <div v-if="prefs.showLastDownloadTime && item.lastDownloadTime" class="time-line">
        {{ fromNow(item.lastDownloadTime) }}
      </div>
    </div>

    <!--
      只留三个常用动作，其余收进菜单。
      卡片最窄只有 160px，六个图标按钮排一行会把最后一个挤出可视区 ——
      删除按钮被挤掉是看不出来的，只有想删的时候才发现点不到。
    -->
    <v-card-actions class="acts">
      <v-btn
          v-if="prefs.showPlaylist"
          density="comfortable"
          icon="mdi-play-circle-outline"
          size="small"
          title="视频列表"
          variant="text"
          @click.stop="emit('playlist', item)"
      />
      <v-btn density="comfortable" icon="mdi-pencil-outline" size="small" title="编辑" variant="text"
             @click.stop="emit('edit', item)"/>
      <v-spacer/>
      <v-menu location="bottom end">
        <template #activator="{props: menu}">
          <v-btn v-bind="menu" density="comfortable" icon="mdi-dots-vertical" size="small" title="更多"
                 variant="text" @click.stop/>
        </template>
        <v-list density="compact">
          <v-list-item prepend-icon="mdi-eye-outline" title="预览匹配结果" @click="emit('preview', item)"/>
          <v-list-item prepend-icon="mdi-image-edit-outline" title="更换封面" @click="emit('cover', item)"/>
          <v-list-item prepend-icon="mdi-star-outline" title="评分" @click="emit('rate', item)"/>
          <v-divider/>
          <v-list-item base-color="error" prepend-icon="mdi-delete-outline" title="删除"
                       @click="emit('del', item)"/>
        </v-list>
      </v-menu>
    </v-card-actions>
  </v-card>
</template>

<style scoped>
.ani-card {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
}

/* 选中用外圈而不是 inset outline：inset 会被卡片的大圆角切掉两个角 */
.ani-card--selected {
    box-shadow: 0 0 0 2px rgb(var(--v-theme-primary)) !important;
}

.ani-card--off {
    opacity: .72;
}

.poster-wrap {
    position: relative;
}

.badge-score {
    position: absolute;
    top: 10px;
    right: 10px;
}

.select-box {
    position: absolute;
    top: 2px;
    left: 4px;
    background: rgba(0, 0, 0, .4);
    border-radius: 50%;
}

.disabled-veil {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding-bottom: 10px;
    background: rgba(0, 0, 0, .42);
}

.body {
    flex: 1 1 auto;
    padding: 12px 14px 4px;
    min-width: 0;
}

.title-line {
    font-size: .9rem;
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
    opacity: .66;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.subgroup {
    margin-top: 2px;
}

.time-line {
    margin-top: 8px;
}

.prog-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 10px;
    font-size: .74rem;
    min-width: 0;
}

.ep {
    flex: 0 0 auto;
    font-variant-numeric: tabular-nums;
    opacity: .82;
}

.tag {
    flex: 0 1 auto;
    padding: 0 6px;
    border-radius: 999px;
    font-size: .66rem;
    line-height: 1.6;
    background: rgba(var(--v-theme-on-surface), .1);
    opacity: .8;
    /* 标签多起来时先截自己，不去挤集数 */
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.prog-track {
    height: 3px;
    border-radius: 999px;
    margin-top: 6px;
    background: rgba(var(--v-theme-on-surface), .12);
    overflow: hidden;
}

.prog-fill {
    height: 100%;
    border-radius: 999px;
    background: rgb(var(--v-theme-primary));
    transition: width var(--m-dur-slow) var(--m-ease);
}

.acts {
    padding: 0 6px 4px;
    min-height: 40px;
}
</style>
