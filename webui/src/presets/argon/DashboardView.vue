<script setup lang="ts">
import {useRouter} from 'vue-router'
import {toApiFile} from '@shared/http'
import {formatEpisodes, formatPercent, fromNow} from '@shared/format'
import {useDashboard} from '@/composables/useDashboard'
import AniSkeleton from '@/components/ani/AniSkeleton.vue'

/**
 * Argon 的总览就是博客首页：一张渐变横幅打招呼，下面一排数字，
 * 再下面是「今天更新」的文章流，右边一列小挂件。
 *
 * 和 M3 那款的区别不在配色 —— 那款是「指标卡 + 横向轨道」，信息平铺；
 * 这一款是「一条主线 + 边栏」，主线上的东西一件比一件靠后，边栏是附属信息。
 * 博客的排版逻辑是阅读顺序，不是仪表盘。
 */
const d = useDashboard()
const router = useRouter()

const cover = (c?: string) => (c ? toApiFile(c) : '')

/** 按当地时间给一句问候。博客首页的横幅上写的就是这种话 */
function greet(): string {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 11) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}
</script>

<template>
  <div class="ag-wrap py-6">
    <!-- ── 横幅 ── Argon 首页顶上那张带渐变的大圆角卡 -->
    <div class="banner mb-6">
      <div class="banner-text">
        <div class="banner-hi">{{ greet() }}</div>
        <div class="banner-sub">
          {{ d.todayLabel.value || '今天' }}有 <b>{{ d.today.value.length }}</b> 部要更新，
          共订阅 <b>{{ d.ani.total }}</b> 部
        </div>
      </div>
      <v-icon class="banner-mark" icon="mdi-rss" size="120"/>
    </div>

    <div class="ag-cols">
      <!-- ══ 主线 ══ -->
      <div class="min0">
        <!-- ── 数字：四颗药丸，不是四张卡 ── -->
        <div class="stats mb-6">
          <template v-if="d.firstLoad.value">
            <div v-for="i in 4" :key="i" class="sk stat-sk"/>
          </template>
          <router-link v-for="(st, i) in (d.firstLoad.value ? [] : d.stats.value)" :key="st.key"
                       :style="{'--i': i}" :to="st.to" class="stat ani-in ani-lift">
            <v-icon :icon="st.icon" size="20"/>
            <span class="stat-num">{{ st.value }}</span>
            <span class="stat-label">{{ st.label }}</span>
          </router-link>
        </div>

        <div class="sec-head">
          <h2 class="sec-title">今天更新</h2>
          <v-spacer/>
          <v-btn :loading="d.ani.loading" size="small" variant="text" @click="d.ani.refreshAll()">刷新</v-btn>
        </div>

        <div v-if="d.firstLoad.value" class="d-flex flex-column ga-4">
          <AniSkeleton :count="3" shape="wide"/>
        </div>

        <div v-else-if="d.today.value.length" class="d-flex flex-column ga-4">
          <v-card v-for="(a, i) in d.today.value" :key="a.id" :style="{'--i': i}"
                  class="post ani-in ani-lift" @click="router.push('/subscriptions')">
            <div class="post-thumb">
              <v-img :src="cover(a.cover)" aspect-ratio="0.7" cover>
                <template #placeholder>
                  <div class="fill-height d-flex align-center justify-center bg-surface-variant">
                    <v-icon icon="mdi-image-outline"/>
                  </div>
                </template>
              </v-img>
            </div>
            <div class="post-body min0">
              <div class="post-title">{{ a.title }}</div>
              <div class="post-meta">
                <span>{{ a.subgroup || '未知字幕组' }}</span>
                <span>{{ formatEpisodes(a.currentEpisodeNumber, a.totalEpisodeNumber) }}</span>
                <span v-if="a.score">评分 {{ a.score.toFixed(1) }}</span>
              </div>
              <div v-if="a.lastDownloadTime" class="post-time">最后下载 {{ fromNow(a.lastDownloadTime) }}</div>
            </div>
          </v-card>
        </div>

        <v-empty-state v-else icon="mdi-sleep" text="今天没有番要更新" title="今天休息"/>
      </div>

      <!-- ══ 边栏挂件 ══ 窄屏时它会掉到主线下面（网格并成一栏） -->
      <div class="d-flex flex-column ga-4">
        <v-card class="widget">
          <div class="widget-head">
            <v-icon icon="mdi-download-outline" size="18"/>
            下载中
          </div>
          <div v-if="d.torrents.downloading.length" class="widget-body">
            <div v-for="t in d.torrents.downloading.slice(0, 5)" :key="t.hash" class="wline">
              <div class="wline-name">{{ t.name }}</div>
              <div class="d-flex align-center ga-2 mt-2">
                <v-progress-linear :model-value="t.progress" color="primary" height="6" rounded/>
                <span class="wline-num">{{ formatPercent(t.progress) }}</span>
              </div>
            </div>
          </div>
          <p v-else class="widget-empty">{{ d.downloadsHint.value }}</p>
        </v-card>

        <v-card class="widget">
          <div class="widget-head">
            <v-icon icon="mdi-alert-circle-outline" size="18"/>
            疑似停更
            <v-chip v-if="d.stalled.value.length" class="ml-2" color="warning" size="x-small" variant="flat">
              {{ d.stalled.value.length }}
            </v-chip>
          </div>
          <div v-if="d.stalled.value.length" class="widget-body">
            <div v-for="a in d.stalled.value.slice(0, 5)" :key="a.id" class="wline">
              <div class="wline-name">{{ a.title }}</div>
              <div class="wline-num mt-1">最后更新 {{ fromNow(a.lastDownloadTime) }}</div>
            </div>
          </div>
          <p v-else class="widget-empty">字幕组都很勤快。</p>
        </v-card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.min0 {
    min-width: 0;
}

/* ── 横幅 ── */
.banner {
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    min-height: 148px;
    padding: 26px 28px;
    border-radius: var(--ani-radius, 16px);
    color: #fff;
    background: linear-gradient(120deg,
    rgb(var(--v-theme-primary)),
    color-mix(in srgb, rgb(var(--v-theme-primary)) 55%, rgb(var(--v-theme-info))));
}

.banner-text {
    position: relative;
    z-index: 1;
    min-width: 0;
}

.banner-hi {
    font-size: clamp(1.5rem, 4.4vw, 2rem);
    font-weight: 700;
    line-height: 1.2;
}

.banner-sub {
    margin-top: 8px;
    font-size: .92rem;
    opacity: .92;
}

/* 右边那个大图标是装饰，不该挡住字，也不该在窄屏上抢走空间 */
.banner-mark {
    position: absolute;
    right: -18px;
    bottom: -28px;
    opacity: .16;
    pointer-events: none;
}

/* ── 数字 ── */
.stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
}

@media (min-width: 720px) {
    .stats {
        grid-template-columns: repeat(4, minmax(0, 1fr));
    }
}

.stat, .stat-sk {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 56px;
    padding: 0 16px;
    border-radius: 999px;
    background: rgba(var(--v-theme-surface), var(--ani-surface-alpha, 1));
    box-shadow: var(--ani-shadow, 0 2px 12px rgba(0, 0, 0, .06));
    color: inherit;
    text-decoration: none;
    min-width: 0;
}

.stat-num {
    font-size: 1.3rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
}

.stat-label {
    font-size: .78rem;
    opacity: .7;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* ── 区块标题 ── */
.sec-head {
    display: flex;
    align-items: center;
    margin-bottom: 14px;
}

.sec-title {
    font-size: 1.12rem;
    font-weight: 700;
    /* Argon 的小标题左边有一条主色竖杠 */
    padding-left: 12px;
    border-left: 4px solid rgb(var(--v-theme-primary));
    line-height: 1.3;
}

/* ── 文章卡 ── 左缩略图右正文 */
.post {
    display: flex;
    gap: 16px;
    padding: 14px;
    overflow: hidden;
}

.post-thumb {
    flex: 0 0 76px;
    border-radius: 12px;
    overflow: hidden;
}

.post-body {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 6px;
}

.post-title {
    font-size: 1rem;
    font-weight: 600;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.post-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    font-size: .8rem;
    opacity: .72;
    min-width: 0;
}

.post-meta > span {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.post-time {
    font-size: .74rem;
    opacity: .6;
}

/* ── 挂件 ── */
.widget {
    padding: 4px 0 8px;
}

.widget-head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 18px 10px;
    font-size: .95rem;
    font-weight: 700;
}

.widget-body {
    padding: 0 18px 6px;
}

.wline + .wline {
    margin-top: 14px;
}

.wline-name {
    font-size: .84rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.wline-num {
    flex: 0 0 auto;
    font-size: .73rem;
    opacity: .7;
    font-variant-numeric: tabular-nums;
}

.widget-empty {
    padding: 0 18px 12px;
    font-size: .84rem;
    opacity: .7;
}
</style>
