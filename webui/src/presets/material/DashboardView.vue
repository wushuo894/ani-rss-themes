<script setup lang="ts">
import {useRouter} from 'vue-router'
import {toApiFile} from '@shared/http'
import {formatEpisodes, formatPercent, fromNow} from '@shared/format'
import {useDashboard} from '@/composables/useDashboard'
import AniSkeleton from '@/components/ani/AniSkeleton.vue'

/**
 * M3 的总览：大标题 + 一组 tonal 指标卡 + 两块内容区。
 *
 * 指标卡用「数字先于标签」的排法（display 字号在上、label 在下），这是 M3 里
 * 统计卡的标准形态；点击有 state layer，不是靠位移做反馈 —— M3 的手势语言是
 * 颜色叠层，不是抬起，跟二次元那款正好相反。
 */
const d = useDashboard()
const router = useRouter()

const cover = (c?: string) => (c ? toApiFile(c) : '')
</script>

<template>
  <div class="pa-4 pa-md-6">
    <h1 class="headline mb-1">总览</h1>
    <p class="support mb-6">
      {{ d.todayLabel.value || '今天' }}有 {{ d.today.value.length }} 部要更新
    </p>

    <!-- ── 指标 ── -->
    <div class="stat-grid mb-8">
      <template v-if="d.firstLoad.value">
        <AniSkeleton :count="4" shape="stat"/>
      </template>
      <v-card v-for="(s, i) in (d.firstLoad.value ? [] : d.stats.value)" :key="s.key" :style="{'--i': i}"
              :to="s.to" class="stat ani-in" color="surface-variant" rounded="xl" variant="flat">
        <v-card-text class="pa-5">
          <v-icon :icon="s.icon" class="stat-icon" size="24"/>
          <div class="stat-num">{{ s.value }}</div>
          <div class="stat-label">{{ s.label }}</div>
        </v-card-text>
      </v-card>
    </div>

    <!-- ── 今天更新：M3 的横向卡片轨道 ── -->
    <div class="d-flex align-center mb-3">
      <h2 class="title-m">今天更新</h2>
      <v-spacer/>
      <v-btn :loading="d.ani.loading" size="small" variant="text" @click="d.ani.refreshAll()">刷新</v-btn>
    </div>

    <div class="track mb-8">
      <template v-if="d.firstLoad.value">
        <div v-for="i in 5" :key="i" class="track-item">
          <div class="sk" style="aspect-ratio: 1.3; width: 100%; border-radius: 16px"/>
        </div>
      </template>

      <template v-else-if="d.today.value.length">
        <v-card v-for="(a, i) in d.today.value" :key="a.id" :style="{'--i': i}"
                class="track-item ani-in" rounded="xl" variant="flat" @click="router.push('/subscriptions')">
          <v-img :src="cover(a.cover)" aspect-ratio="1.3" cover>
            <template #placeholder>
              <div class="fill-height d-flex align-center justify-center bg-surface-variant">
                <v-icon icon="mdi-image-outline"/>
              </div>
            </template>
          </v-img>
          <v-card-text class="pa-3">
            <div class="track-title">{{ a.title }}</div>
            <div class="track-sub">{{ formatEpisodes(a.currentEpisodeNumber, a.totalEpisodeNumber) }}</div>
          </v-card-text>
        </v-card>
      </template>

      <v-empty-state v-else class="w-100" icon="mdi-sleep" text="今天没有番要更新" title="今天休息"/>
    </div>

    <div class="two-col">
      <!--
        两块内容区都用普通 div 排，不用 v-list：
        v-list 自带一层背景，套进有颜色的卡里会出现「标题一个色、列表另一个色」的分层，
        bg-color="transparent" 也压不干净。容器已经是卡了，里面不需要第二个容器组件。
      -->
      <v-card color="surface-variant" rounded="xl" variant="flat">
        <h2 class="title-m pa-5 pb-3">下载中</h2>
        <div v-if="d.torrents.downloading.length" class="pb-4 px-5">
          <div v-for="(t, i) in d.torrents.downloading.slice(0, 6)" :key="t.hash" :style="{'--i': i}"
               class="line ani-in">
            <div class="ellipsis text-body-2">{{ t.name }}</div>
            <div class="d-flex align-center ga-3 mt-2">
              <v-progress-linear :model-value="(t.progress ?? 0) * 100" color="primary" height="6" rounded/>
              <span class="num-sm">{{ formatPercent(t.progress) }}</span>
            </div>
          </div>
        </div>
        <p v-else class="hint px-5 pb-5">{{ d.downloadsHint.value }}</p>
      </v-card>

      <!--
        有停更时用 M3 的 error container：这是唯一需要人动手的一类，视觉上就该比别的卡响。
        没有时退回普通表面色 —— tonal 叠在 surface-variant 上会把标题洗得几乎看不见。
      -->
      <v-card :color="d.stalled.value.length ? 'error' : 'surface-variant'" rounded="xl"
              :variant="d.stalled.value.length ? 'tonal' : 'flat'">
        <h2 class="title-m pa-5 pb-3 d-flex align-center">
          疑似停更
          <v-chip v-if="d.stalled.value.length" class="ml-2" size="x-small" variant="flat">
            {{ d.stalled.value.length }}
          </v-chip>
        </h2>
        <div v-if="d.stalled.value.length" class="pb-4 px-5">
          <div v-for="(a, i) in d.stalled.value.slice(0, 6)" :key="a.id" :style="{'--i': i}" class="line ani-in">
            <div class="ellipsis text-body-2">{{ a.title }}</div>
            <div class="num-sm mt-1">最后更新 {{ fromNow(a.lastDownloadTime) }}</div>
          </div>
        </div>
        <p v-else class="hint px-5 pb-5">字幕组都很勤快。</p>
      </v-card>
    </div>

  </div>
</template>

<style scoped>
.headline {
    font-size: clamp(1.75rem, 4vw, 2.25rem);
    font-weight: 400;
    line-height: 1.15;
}

.support {
    font-size: .95rem;
    opacity: .68;
}

.title-m {
    font-size: 1.05rem;
    font-weight: 500;
    line-height: 1.4;
}

.stat-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
}

@media (min-width: 720px) {
    .stat-grid {
        grid-template-columns: repeat(4, 1fr);
        gap: 16px;
    }
}

.stat-icon {
    opacity: .6;
}

.stat-num {
    font-size: 2.1rem;
    font-weight: 400;
    line-height: 1.1;
    margin-top: 10px;
    font-variant-numeric: tabular-nums;
}

.stat-label {
    font-size: .8rem;
    opacity: .7;
    margin-top: 2px;
}

/* M3 的横向卡片轨道 */
.track {
    display: flex;
    gap: 16px;
    overflow-x: auto;
    scroll-snap-type: x proximity;
    padding-bottom: 8px;
    scrollbar-width: thin;
}

.track-item {
    flex: 0 0 clamp(180px, 44vw, 240px);
    scroll-snap-align: start;
}

.track-title {
    font-size: .88rem;
    font-weight: 500;
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    min-height: 2.3em;
}

.track-sub {
    font-size: .75rem;
    opacity: .68;
    margin-top: 4px;
}

.two-col {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
}

@media (min-width: 960px) {
    .two-col {
        grid-template-columns: 1fr 1fr;
    }
}

.line + .line {
    margin-top: 14px;
}

.hint {
    font-size: .88rem;
    opacity: .7;
}

/* 任务名是整条发布标题，不截断会把进度条挤出卡片 */
.ellipsis {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.num-sm {
    flex: 0 0 auto;
    font-size: .75rem;
    opacity: .72;
    font-variant-numeric: tabular-nums;
}
</style>
