<script setup lang="ts">
import {useRouter} from 'vue-router'
import {toApiFile} from '@shared/http'
import {formatEpisodes, formatPercent, fromNow} from '@shared/format'
import {useDashboard} from '@/composables/useDashboard'
import AniSkeleton from '@/components/ani/AniSkeleton.vue'

/**
 * MoviePilot 的仪表板。
 *
 * Materio 那套统计卡的排法：图标是一枚 tonal 的圆角方块摆在左上，标签在上、数字在下，
 * 卡片左边缘一条 2px 的主色竖线（原版 .app-card-colorful::before），整张卡不投影 ——
 * 层级靠那条竖线和一层极淡的斜向渐变，不靠阴影。
 *
 * 「今天更新」用横向轨道而不是网格：MP 的首页就是一条条横着滑的媒体行。
 */
const d = useDashboard()
const router = useRouter()

const cover = (c?: string) => (c ? toApiFile(c) : '')
</script>

<template>
  <div class="pa-4">
    <h1 class="title mb-1">仪表板</h1>
    <p class="sub mb-5">{{ d.todayLabel.value || '今天' }}有 {{ d.today.value.length }} 部要更新</p>

    <div class="stats mb-6">
      <template v-if="d.firstLoad.value">
        <AniSkeleton :count="4" shape="stat"/>
      </template>
      <v-card v-for="(s, i) in (d.firstLoad.value ? [] : d.stats.value)" :key="s.key" :style="{'--i': i}"
              :to="s.to" class="stat ani-in" rounded="lg">
        <v-card-text class="pa-4">
          <v-avatar class="mb-3" color="primary" rounded="lg" size="38" variant="tonal">
            <v-icon :icon="s.icon" size="20"/>
          </v-avatar>
          <div class="stat-label">{{ s.label }}</div>
          <div class="stat-num">{{ s.value }}</div>
        </v-card-text>
      </v-card>
    </div>

    <div class="d-flex align-center mb-3">
      <h2 class="head">今天更新</h2>
      <v-spacer/>
      <v-btn :loading="d.ani.loading" size="small" variant="text" @click="d.ani.refreshAll()">刷新</v-btn>
    </div>

    <div class="track mb-6">
      <template v-if="d.firstLoad.value">
        <div v-for="i in 6" :key="i" class="track-item">
          <div class="sk" style="aspect-ratio: .667; width: 100%; border-radius: 12px"/>
        </div>
      </template>

      <template v-else-if="d.today.value.length">
        <v-card v-for="(a, i) in d.today.value" :key="a.id" :style="{'--i': i}" class="track-item ani-in"
                rounded="lg" @click="router.push('/subscriptions')">
          <v-img :src="cover(a.cover)" aspect-ratio="0.667" cover>
            <template #placeholder>
              <div class="fill-height d-flex align-center justify-center bg-surface-variant">
                <v-icon icon="mdi-television-classic" size="32"/>
              </div>
            </template>
            <div class="cap">
              <div class="cap-name">{{ a.title }}</div>
              <div class="cap-ep">{{ formatEpisodes(a.currentEpisodeNumber, a.totalEpisodeNumber) }}</div>
            </div>
          </v-img>
        </v-card>
      </template>

      <v-empty-state v-else class="w-100" icon="mdi-sleep" text="今天没有番要更新" title="今天休息"/>
    </div>

    <div class="two-col">
      <v-card rounded="lg">
        <v-card-title class="head pa-4 pb-2">下载中</v-card-title>
        <v-card-text class="pt-2">
          <div v-if="d.torrents.downloading.length">
            <div v-for="(t, i) in d.torrents.downloading.slice(0, 6)" :key="t.hash" :style="{'--i': i}"
                 class="line ani-in">
              <div class="ellipsis text-body-2">{{ t.name }}</div>
              <div class="d-flex align-center ga-3 mt-2">
                <v-progress-linear :model-value="(t.progress ?? 0) * 100" color="primary" height="6" rounded/>
                <span class="num">{{ formatPercent(t.progress) }}</span>
              </div>
            </div>
          </div>
          <p v-else class="hint">{{ d.downloadsHint.value }}</p>
        </v-card-text>
      </v-card>

      <v-card rounded="lg">
        <v-card-title class="head pa-4 pb-2">
          疑似停更
          <v-chip v-if="d.stalled.value.length" class="ml-2" color="warning" size="x-small" variant="tonal">
            {{ d.stalled.value.length }}
          </v-chip>
        </v-card-title>
        <v-card-text class="pt-2">
          <div v-if="d.stalled.value.length">
            <div v-for="(a, i) in d.stalled.value.slice(0, 6)" :key="a.id" :style="{'--i': i}" class="line ani-in">
              <div class="ellipsis text-body-2">{{ a.title }}</div>
              <div class="num mt-1">最后更新 {{ fromNow(a.lastDownloadTime) }}</div>
            </div>
          </div>
          <p v-else class="hint">字幕组都很勤快。</p>
        </v-card-text>
      </v-card>
    </div>
  </div>
</template>

<style scoped>
.title {
    font-size: 1.5rem;
    font-weight: 500;
    line-height: 1.3;
}

.sub {
    font-size: .9rem;
    opacity: .7;
}

.head {
    font-size: 1.05rem;
    font-weight: 500;
}

.stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
}

@media (min-width: 720px) {
    .stats {
        grid-template-columns: repeat(4, minmax(0, 1fr));
    }
}

/*
 * Materio 的 .app-card-colorful：左边一条 2px 的主色竖线 + 一层极淡的斜向渐变。
 * 渐变到 76% 就化没了，所以卡片右半边仍然是干净的表面色。
 */
.stat {
    position: relative;
    overflow: hidden;
    background-image: linear-gradient(135deg,
    rgba(var(--v-theme-primary), .025),
    rgba(var(--v-theme-primary), .012) 46%,
    rgba(var(--v-theme-surface), 0) 76%);
}

.stat::before {
    content: '';
    position: absolute;
    inset-inline-start: 0;
    inset-block: 0;
    width: 2px;
    background: rgb(var(--v-theme-primary));
    opacity: .22;
}

.stat-label {
    font-size: .8rem;
    opacity: .7;
}

.stat-num {
    font-size: 1.6rem;
    font-weight: 500;
    line-height: 1.25;
    font-variant-numeric: tabular-nums;
}

.track {
    display: flex;
    gap: 16px;
    overflow-x: auto;
    padding-bottom: 8px;
    scroll-snap-type: x proximity;
    scrollbar-width: thin;
}

.track-item {
    flex: 0 0 clamp(132px, 34vw, 168px);
    scroll-snap-align: start;
    overflow: hidden;
}

/* 海报上压字，所以底下要一段渐变兜住 —— 白字直接压在浅色海报上是读不出来的 */
.cap {
    position: absolute;
    inset-inline: 0;
    bottom: 0;
    padding: 18px 8px 8px;
    color: #fff;
    background: linear-gradient(rgba(45, 55, 72, 0), rgba(45, 55, 72, .9));
}

.cap-name {
    font-size: .8rem;
    line-height: 1.25;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.cap-ep {
    font-size: .7rem;
    opacity: .85;
    font-variant-numeric: tabular-nums;
}

.two-col {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
}

@media (min-width: 960px) {
    .two-col {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    }
}

.line + .line {
    margin-top: 14px;
}

.hint {
    font-size: .88rem;
    opacity: .7;
}

.ellipsis {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.num {
    flex: 0 0 auto;
    font-size: .75rem;
    opacity: .7;
    font-variant-numeric: tabular-nums;
}
</style>
