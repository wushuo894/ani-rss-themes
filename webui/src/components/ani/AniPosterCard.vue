<script setup lang="ts">
import {computed} from 'vue'
import type {Ani} from '@shared/types'
import {toApiFile} from '@shared/http'
import {formatEpisodes} from '@shared/format'
import {usePrefsStore} from '@/stores/prefs'

/**
 * 海报卡：整张卡就是一张海报，文字压在下沿的渐变里，操作按钮悬停才浮出来。
 *
 * 和 M3 那张卡（AniCard）的分别不是配色，是信息的容身之处 ——
 * 那张卡有独立的文字区，这张没有；那张常驻四个按钮，这张平时一个都不显示。
 * 媒体库类界面（Jellyfin / Plex）都是这个路子：一屏的信息量全靠图，
 * 文字只在需要辨认时才出现。
 *
 * 触屏没有悬停，按钮改成常驻的一颗「更多」——不然操作按钮永远召不出来。
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
</script>

<template>
  <div :class="{'is-selected': selected, 'is-off': !item.enable}" class="poster-card ani-lift"
       @click="selectMode && emit('toggle', item)">
    <v-img :alt="item.title" :src="coverUrl" aspect-ratio="0.7" class="art" cover>
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

    <!-- 常驻：底部渐变里的标题与进度 -->
    <div class="veil">
      <div class="v-title" :title="item.title" @click.stop="openBgm">{{ item.title }}</div>
      <div class="v-meta">
        <span class="ep">{{ formatEpisodes(item.currentEpisodeNumber, item.totalEpisodeNumber) }}</span>
        <span class="dot">·</span>
        <span class="grp">{{ item.subgroup || '未知字幕组' }}</span>
      </div>
    </div>

    <!-- 角标 -->
    <v-chip v-if="prefs.showScore && item.score" class="badge-score" color="primary" size="small"
            variant="flat" @click.stop="emit('rate', item)">
      {{ item.score.toFixed(1) }}
    </v-chip>

    <v-chip v-if="!item.enable" class="badge-off" size="x-small" variant="flat">未启用</v-chip>
    <v-chip v-else-if="item.ova" class="badge-off" color="secondary" size="x-small" variant="flat">OVA</v-chip>

    <v-checkbox v-if="selectMode" :model-value="selected" class="pick" density="compact" hide-details
                @click.stop="emit('toggle', item)"/>

    <!-- 悬停浮出的操作条。触屏下靠 @media (hover:none) 常驻 -->
    <div class="acts" @click.stop>
      <v-btn v-if="prefs.showPlaylist" icon="mdi-play" size="small" title="视频列表" variant="flat"
             @click="emit('playlist', item)"/>
      <v-btn icon="mdi-pencil" size="small" title="编辑" variant="flat" @click="emit('edit', item)"/>
      <v-menu location="top end">
        <template #activator="{props: menu}">
          <v-btn v-bind="menu" icon="mdi-dots-horizontal" size="small" title="更多" variant="flat"/>
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
    </div>
  </div>
</template>

<style scoped>
.poster-card {
    position: relative;
    border-radius: var(--ani-radius, 14px);
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, .34);
    background: rgba(var(--v-theme-surface), var(--ani-surface-alpha, 1));
    cursor: pointer;
}

.art {
    display: block;
}

/* 未启用整张压暗，一眼能从墙里挑出来 */
.is-off .art {
    filter: grayscale(.7) brightness(.62);
}

.is-selected {
    border-color: rgb(var(--v-theme-primary));
    box-shadow: 0 0 0 2px rgb(var(--v-theme-primary));
}

/*
 * 文字压在渐变上。渐变要够高（45%）才能盖住浅色海报下半部分，
 * 只铺 20% 的话遇到白底番剧封面文字直接看不见。
 */
.veil {
    position: absolute;
    inset: auto 0 0 0;
    padding: 34% 10px 9px;
    background: linear-gradient(transparent, rgba(0, 0, 0, .55) 42%, rgba(0, 0, 0, .88));
    color: #fff;
    pointer-events: none;
}

.v-title {
    font-size: .84rem;
    font-weight: 600;
    line-height: 1.3;
    pointer-events: auto;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.v-meta {
    display: flex;
    gap: 4px;
    align-items: baseline;
    font-size: .7rem;
    opacity: .82;
    margin-top: 3px;
    min-width: 0;
}

.ep, .dot {
    flex: 0 0 auto;
}

/* 字幕组名可以很长，只有它该被截断 */
.grp {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* 角标离边 10px：贴到 6px 时会压在 14px 的圆角上，看着像溢出去了 */
.badge-score {
    position: absolute;
    top: 10px;
    right: 10px;
}

.badge-off {
    position: absolute;
    top: 10px;
    left: 10px;
}

.pick {
    position: absolute;
    top: 2px;
    left: 2px;
    background: rgba(0, 0, 0, .45);
    border-radius: 50%;
}

/* 多选时角标要给复选框让位，否则两个叠在左上角 */
.pick ~ .badge-off {
    display: none;
}

/*
 * 操作条：默认藏在卡外，悬停滑进来。
 * 位移用 translateY 而不是改 display —— display 切换没有过渡，会硬闪。
 */
.acts {
    position: absolute;
    right: 8px;
    bottom: 8px;
    display: flex;
    gap: 6px;
    opacity: 0;
    transform: translateY(8px);
    transition: opacity var(--m-dur) var(--m-ease), transform var(--m-dur) var(--m-ease);
}

@media (hover: hover) {
    .poster-card:hover .acts,
    .poster-card:focus-within .acts {
        opacity: 1;
        transform: none;
    }

    /* 按钮浮出来时把文字往上让，两者叠在一起谁都看不清 */
    .poster-card:hover .veil {
        padding-bottom: 44px;
    }
}

/* 触屏没有悬停：只留一颗「更多」常驻，其余动作进菜单 */
@media (hover: none) {
    .acts {
        opacity: 1;
        transform: none;
    }

    .acts .v-btn:not(:last-child) {
        display: none;
    }

    .veil {
        padding-right: 46px;
    }
}
</style>
